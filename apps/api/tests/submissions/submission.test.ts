import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { Plan, Review } from '../../src/simulation/engine/types';
import { SimulationService } from '../../src/simulation/simulation.service';
import { SubmissionEntity } from '../../src/submissions/submission.entity';
import { SubmissionsService } from '../../src/submissions/submissions.service';
import { SubmissionsController } from '../../src/submissions/submissions.controller';

const plan: Plan = [{ measureId: 'M12' }];
const date = new Date('2026-09-23T10:00:00.000Z');
function row(teamName = 'Команда', score = 56.54): SubmissionEntity {
  return Object.assign(new SubmissionEntity(), {
    id: 'test-id',
    teamName,
    plan,
    score,
    rank: 566,
    createdAt: date,
  });
}
function setup() {
  const repository = {
    create: vi.fn((value) => value),
    save: vi.fn().mockResolvedValue(row()),
    find: vi.fn().mockResolvedValue([]),
  };
  const simulation = {
    review: vi
      .fn()
      .mockReturnValue({ evaluation: { score: 56.544 }, rank: 566 } as Review),
  };
  const service = new SubmissionsService(
    repository as unknown as Repository<SubmissionEntity>,
    simulation as unknown as SimulationService,
  );
  return {
    repository,
    simulation,
    service,
    controller: new SubmissionsController(service),
  };
}

describe('submissions', () => {
  it('persists the engine score and trimmed name, ignoring client scores', async () => {
    const { controller, repository, simulation } = setup();
    await expect(
      controller.create({ teamName: '  Команда  ', plan, score: 100 }),
    ).resolves.toEqual({
      id: 'test-id',
      teamName: 'Команда',
      plan,
      score: 56.54,
      rank: 566,
      createdAt: date.toISOString(),
    });
    expect(simulation.review).toHaveBeenCalledWith(plan);
    expect(repository.create).toHaveBeenCalledWith({
      teamName: 'Команда',
      plan,
      score: 56.544,
      rank: 566,
    });
    expect(repository.save).toHaveBeenCalledOnce();
  });
  it.each([
    null,
    undefined,
    [],
    'team',
    {},
    { teamName: null },
    { teamName: ' ' },
    { teamName: 'x'.repeat(41) },
    { teamName: 'line\nbreak' },
    { teamName: 'bad\u0000name' },
    { teamName: 'bad\u007fname' },
  ])('rejects invalid team names or bodies: %j', async (body) => {
    const { controller, repository } = setup();
    await expect(controller.create(body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('rejects malformed plans before touching storage', async () => {
    const { controller, repository } = setup();
    await expect(
      controller.create({ teamName: 'Team', plan: 'bad' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('propagates invalid plans from the engine without saving', async () => {
    const { service, simulation, repository } = setup();
    simulation.review.mockImplementation(() => {
      throw new BadRequestException('invalid plan');
    });
    await expect(service.create('Team', plan)).rejects.toThrow('invalid plan');
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('returns a clear retryable error without leaking database details on save', async () => {
    const { service, repository } = setup();
    repository.save.mockRejectedValue(new Error('secret database password'));
    await expect(service.create('Team', plan)).rejects.toThrow(
      'Не удалось сохранить план. Попробуйте ещё раз.',
    );
  });
  it('lists only each team’s best result in descending score order', async () => {
    const { controller, repository } = setup();
    repository.find.mockResolvedValue([
      row('Team B', 57),
      row('Team A', 56),
      row('team a', 55),
    ]);
    const results = await controller.list();
    expect(results.map((item) => [item.teamName, item.score])).toEqual([
      ['Team B', 57],
      ['Team A', 56],
    ]);
    expect(repository.find).toHaveBeenCalledWith({
      order: { score: 'DESC', createdAt: 'ASC', id: 'ASC' },
    });
  });
  it('returns an empty leaderboard', async () => {
    await expect(setup().controller.list()).resolves.toEqual([]);
  });
  it('makes storage failure retryable without exposing details', async () => {
    const { service, repository } = setup();
    repository.find.mockRejectedValue(new Error('secret'));
    const failure = await service.list().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect((failure as Error).message).toBe(
      'Реестр временно недоступен. Попробуйте ещё раз.',
    );
  });
});
