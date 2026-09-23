import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { filter, from, ReplaySubject, type Observable } from 'rxjs';
import type { Repository } from 'typeorm';
import type { Plan } from '../simulation/engine/types';
import type { SimulationService } from '../simulation/simulation.service';
import { CouncilSessionEntity } from './council-session.entity';
import type { CouncilEvent, CouncilSession } from './types';

export type CouncilRunner = (
  plan: Plan,
  emit: (event: CouncilEvent) => Promise<void>,
) => Promise<void>;
interface EventFrame {
  id: string;
  data: CouncilEvent;
}
interface ActiveSession {
  row: CouncilSessionEntity;
  stream: ReplaySubject<EventFrame>;
  pending: Promise<void>;
}

function present(row: CouncilSessionEntity): CouncilSession {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

/** Persist before publishing; serialize emissions even when deputies finish together. */
export class CouncilService {
  private readonly active = new Map<string, ActiveSession>();

  constructor(
    private readonly repository: Repository<CouncilSessionEntity>,
    private readonly simulation: Pick<SimulationService, 'evaluate'>,
    private readonly runner: CouncilRunner,
  ) {}

  async create(plan: Plan): Promise<{ sessionId: string }> {
    this.simulation.evaluate(plan);
    const row = await this.save(
      this.repository.create({
        plan,
        events: [],
        protocol: null,
        status: 'running',
      }),
    );
    const session: ActiveSession = {
      row,
      stream: new ReplaySubject<EventFrame>(),
      pending: Promise.resolve(),
    };
    this.active.set(row.id, session);
    void this.execute(session);
    return { sessionId: row.id };
  }

  async get(id: string): Promise<CouncilSession> {
    const active = this.active.get(id);
    if (active) return present(active.row);
    const row = await this.read(id);
    // A single API process owns live sessions. Stored running rows after a restart
    // must not leave a replay subscriber waiting for a worker that no longer exists.
    if (row.status === 'running') {
      const event: CouncilEvent = {
        type: 'failed',
        message:
          'Сервер перезапущен. Начните новое заседание; предыдущие события сохранены.',
      };
      return present(
        await this.save({
          ...row,
          status: 'failed',
          events: [...row.events, event],
        }),
      );
    }
    return present(row);
  }

  async events(id: string, after = 0): Promise<Observable<EventFrame>> {
    const active = this.active.get(id);
    if (active)
      return active.stream.pipe(filter((event) => Number(event.id) > after));
    const row = await this.get(id);
    return from(
      row.events
        .map((data, index) => ({ id: String(index + 1), data }))
        .filter((event) => Number(event.id) > after),
    );
  }

  private async read(id: string): Promise<CouncilSessionEntity> {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
      throw new NotFoundException('Заседание не найдено.');
    let row: CouncilSessionEntity | null;
    try {
      row = await this.repository.findOneBy({ id });
    } catch {
      throw new ServiceUnavailableException(
        'Хранилище заседаний временно недоступно.',
      );
    }
    if (!row) throw new NotFoundException('Заседание не найдено.');
    return row;
  }

  private async save(row: CouncilSessionEntity): Promise<CouncilSessionEntity> {
    try {
      return await this.repository.save(row);
    } catch {
      throw new ServiceUnavailableException(
        'Хранилище заседаний временно недоступно.',
      );
    }
  }

  private async append(
    session: ActiveSession,
    event: CouncilEvent,
  ): Promise<void> {
    if (session.row.status !== 'running') return;
    const row = { ...session.row, events: [...session.row.events, event] };
    if (event.type === 'protocol') row.protocol = event.protocol;
    if (event.type === 'closed' || event.type === 'failed')
      row.status = event.type;
    session.row = await this.save(row);
    session.stream.next({ id: String(row.events.length), data: event });
  }

  private async execute(session: ActiveSession): Promise<void> {
    const emit = (event: CouncilEvent) => {
      session.pending = session.pending.then(() => this.append(session, event));
      return session.pending;
    };
    try {
      await this.runner(session.row.plan, emit);
      await emit({ type: 'closed' });
    } catch {
      await session.pending.catch(() => undefined);
      const event: CouncilEvent = {
        type: 'failed',
        message: 'Заседание прервано. Начните новое заседание.',
      };
      try {
        await this.append(session, event);
      } catch {
        // Report loss of durable storage explicitly; never claim this event was saved.
        session.stream.next({
          id: String(session.row.events.length + 1),
          data: {
            type: 'failed',
            message:
              'Не удалось сохранить заседание. Хранилище временно недоступно.',
          },
        });
      }
    } finally {
      session.stream.complete();
      this.active.delete(session.row.id);
    }
  }
}
