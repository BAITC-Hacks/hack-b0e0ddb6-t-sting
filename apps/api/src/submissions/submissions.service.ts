import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SimulationService } from '../simulation/simulation.service';
import type { Plan, Submission } from '../simulation/engine/types';
import { SubmissionEntity } from './submission.entity';

function present(row: SubmissionEntity): Submission {
  return {
    ...row,
    score: Number(row.score.toFixed(2)),
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly repository: Repository<SubmissionEntity>,
    @Inject(SimulationService) private readonly simulation: SimulationService,
  ) {}

  /** Never trust scores or ranks supplied by a browser. */
  async create(teamName: string, plan: Plan): Promise<Submission> {
    const review = this.simulation.review(plan);
    const entity = this.repository.create({
      teamName,
      plan,
      score: review.evaluation.score,
      rank: review.rank,
    });
    try {
      return present(await this.repository.save(entity));
    } catch {
      throw new ServiceUnavailableException(
        'Не удалось сохранить план. Попробуйте ещё раз.',
      );
    }
  }

  async list(): Promise<Submission[]> {
    try {
      const rows = await this.repository.find({
        order: { score: 'DESC', createdAt: 'ASC', id: 'ASC' },
      });
      const teams = new Set<string>();
      return rows
        .filter((row) => {
          const key = row.teamName.toLocaleLowerCase('ru');
          if (teams.has(key)) return false;
          teams.add(key);
          return true;
        })
        .map(present);
    } catch {
      throw new ServiceUnavailableException(
        'Реестр временно недоступен. Попробуйте ещё раз.',
      );
    }
  }
}
