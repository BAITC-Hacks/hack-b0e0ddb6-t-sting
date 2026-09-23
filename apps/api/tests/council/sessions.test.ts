import {
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { lastValueFrom, toArray } from 'rxjs';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { CouncilSessionEntity } from '../../src/council/council-session.entity';
import {
  CouncilService,
  type CouncilRunner,
} from '../../src/council/council.service';
import { CouncilController } from '../../src/council/council.controller';
import type { CouncilEvent } from '../../src/council/types';
import { SimulationService } from '../../src/simulation/simulation.service';
import { SCENARIO } from '../../src/simulation/engine/scenario';

const id = 'f92e4bbd-4ae7-4027-a857-348c03cb0a9c';
const plan = SCENARIO.examples.strong;
const opened: CouncilEvent = {
  type: 'opened',
  plan,
  score: 56.54,
  members: [],
};
function setup(
  runner: CouncilRunner = async (_, emit) => {
    await emit(opened);
    await emit({ type: 'closed' });
  },
) {
  const rows = new Map<string, CouncilSessionEntity>();
  const repository = {
    create: vi.fn((data) =>
      Object.assign(new CouncilSessionEntity(), data, {
        id,
        createdAt: new Date('2026-09-23T10:00:00Z'),
      }),
    ),
    save: vi.fn(async (row: CouncilSessionEntity) => {
      rows.set(row.id, structuredClone(row));
      return row;
    }),
    findOneBy: vi.fn(
      async ({ id: key }: { id: string }) => rows.get(key) ?? null,
    ),
  };
  const service = new CouncilService(
    repository as unknown as Repository<CouncilSessionEntity>,
    new SimulationService(),
    runner,
  );
  return {
    rows,
    repository,
    service,
    controller: new CouncilController(service),
  };
}

async function replay(service: CouncilService, after = 0) {
  return lastValueFrom((await service.events(id, after)).pipe(toArray()));
}

describe('council sessions', () => {
  it('persists ordered events and replays a complete session to late subscribers', async () => {
    const { controller, service, rows } = setup();
    expect(await controller.create({ plan })).toEqual({ sessionId: id });
    expect(await replay(service)).toEqual([
      { id: '1', data: opened },
      { id: '2', data: { type: 'closed' } },
    ]);
    expect((await controller.get(id)).status).toBe('closed');
    expect(rows.get(id)?.events).toEqual([opened, { type: 'closed' }]);
    expect(await replay(service, 1)).toEqual([
      { id: '2', data: { type: 'closed' } },
    ]);
  });
  it('rejects malformed and inadmissible plans with 422 before persistence', async () => {
    const { controller, repository } = setup();
    for (const body of [null, { plan: 'bad' }, { plan: [] }])
      await expect(controller.create(body)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('returns 404 for unknown and malformed session IDs', async () => {
    const { controller } = setup();
    await expect(controller.get(id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.events('not-a-uuid')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('makes create and read database failures retryable without leaking details', async () => {
    const { repository, controller } = setup();
    repository.save.mockRejectedValue(new Error('secret'));
    await expect(controller.create({ plan })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    repository.findOneBy.mockRejectedValue(new Error('secret'));
    await expect(controller.get(id)).rejects.toThrow(
      'Хранилище заседаний временно недоступно.',
    );
  });
  it('serializes concurrent emissions and seals the session on runner completion', async () => {
    const { service } = setup(async (_, emit) => {
      await Promise.all([
        emit(opened),
        emit({
          type: 'package-check',
          amendmentIds: [],
          valid: false,
          reason: 'budget',
        }),
      ]);
    });
    await service.create(plan);
    expect((await replay(service)).map((e) => e.data.type)).toEqual([
      'opened',
      'package-check',
      'closed',
    ]);
  });
  it('replays already emitted events before delivering live events', async () => {
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const { service } = setup(async (_, emit) => {
      await emit(opened);
      await gate;
      await emit({ type: 'closed' });
    });
    await service.create(plan);
    const result = replay(service);
    expect((await service.get(id)).status).toBe('running');
    resume();
    expect((await result).map((e) => e.id)).toEqual(['1', '2']);
  });
  it('persists a failure and closes the stream when a runner throws', async () => {
    const { service } = setup(async () => {
      throw new Error('private stack');
    });
    await service.create(plan);
    const events = await replay(service);
    expect(events).toEqual([
      {
        id: '1',
        data: {
          type: 'failed',
          message: 'Заседание прервано. Начните новое заседание.',
        },
      },
    ]);
    expect((await service.get(id)).status).toBe('failed');
  });
  it('recovers an unfinished persisted session after process restart', async () => {
    const { service, rows, repository } = setup();
    rows.set(
      id,
      repository.create({
        plan,
        events: [opened],
        protocol: null,
        status: 'running',
      }),
    );
    const session = await service.get(id);
    expect(session.status).toBe('failed');
    expect(session.events.at(-1)).toEqual({
      type: 'failed',
      message:
        'Сервер перезапущен. Начните новое заседание; предыдущие события сохранены.',
    });
    expect((await replay(service)).length).toBe(2);
  });
  it('persists the protocol independently and ignores emissions after closure', async () => {
    const protocol = {
      decision: 'accept',
      recommendedAmendmentIds: [],
      plan,
      score: 56.54,
      cost: 95,
      compromises: [],
      dissent: [],
      summary: 'План принят.',
      source: 'offline',
      verified: true,
    } as const;
    const { service, rows } = setup(async (_, emit) => {
      await emit({
        type: 'protocol',
        protocol: {
          ...protocol,
          recommendedAmendmentIds: [],
          compromises: [],
          dissent: [],
        },
      });
      await emit({ type: 'closed' });
      await emit(opened);
    });
    await service.create(plan);
    expect((await replay(service)).map((e) => e.data.type)).toEqual([
      'protocol',
      'closed',
    ]);
    expect(rows.get(id)?.protocol?.summary).toBe('План принят.');
  });
  it('reports a failed durable write and completes even if failure recording also fails', async () => {
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const { service, repository } = setup(async (_, emit) => {
      await gate;
      await emit(opened);
    });
    await service.create(plan);
    const result = replay(service);
    repository.save.mockRejectedValue(new Error('secret database credentials'));
    resume();
    expect(await result).toEqual([
      {
        id: '1',
        data: {
          type: 'failed',
          message:
            'Не удалось сохранить заседание. Хранилище временно недоступно.',
        },
      },
    ]);
  });
  it('resumes from the browser last-event header or initial query offset', async () => {
    const { controller, service } = setup();
    await service.create(plan);
    await replay(service);
    for (const [header, query, expected] of [
      ['1', '0', ['2']],
      [undefined, '1', ['2']],
      ['bad', undefined, ['1', '2']],
      ['99999999999999999999', undefined, ['1', '2']],
      ['2', undefined, []],
    ] as const) {
      const stream = await controller.events(id, header, query);
      expect(
        (await lastValueFrom(stream.pipe(toArray()))).map((e) => e.id),
      ).toEqual(expected);
    }
  });
});
