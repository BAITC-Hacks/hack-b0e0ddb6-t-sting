import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    TypeOrmModule.forRoot(createDatabaseOptions(process.env)),
    TypeOrmModule.forFeature([SubmissionEntity]),
  ],
  controllers: [
    HealthController,
    SimulationController,
    AnalysisController,
    SubmissionsController,
  ],
  providers: [
    HealthService,
    SimulationService,
    SubmissionsService,
    {
      provide: AnalysisService,
      useFactory: (simulation: SimulationService) =>
        createAnalysisService(simulation),
      inject: [SimulationService],
    },
  ],
})
export class AppModule {}
