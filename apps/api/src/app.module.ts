import { Module } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { createDatabaseOptions } from './database/database-options';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { SimulationController } from './simulation/simulation.controller';
import { SimulationService } from './simulation/simulation.service';
import { AnalysisController } from './analysis/analysis.controller';
import {
  AnalysisService,
  createAnalysisService,
} from './analysis/analysis.service';
import { SubmissionEntity } from './submissions/submission.entity';
import { SubmissionsController } from './submissions/submissions.controller';
import { SubmissionsService } from './submissions/submissions.service';
import { CouncilSessionEntity } from './council/council-session.entity';
import { CouncilController } from './council/council.controller';
import { CouncilService } from './council/council.service';
import { createCouncilRunner } from './council/council-orchestrator';

@Module({
  imports: [
    TypeOrmModule.forRoot(createDatabaseOptions(process.env)),
    TypeOrmModule.forFeature([SubmissionEntity, CouncilSessionEntity]),
  ],
  controllers: [
    HealthController,
    SimulationController,
    AnalysisController,
    SubmissionsController,
    CouncilController,
  ],
  providers: [
    HealthService,
    SimulationService,
    SubmissionsService,
    {
      provide: CouncilService,
      useFactory: (
        repository: Repository<CouncilSessionEntity>,
        simulation: SimulationService,
      ) => new CouncilService(repository, simulation, createCouncilRunner()),
      inject: [getRepositoryToken(CouncilSessionEntity), SimulationService],
    },
    {
      provide: AnalysisService,
      useFactory: (simulation: SimulationService) =>
        createAnalysisService(simulation),
      inject: [SimulationService],
    },
  ],
})
export class AppModule {}
