import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseOptions } from './database/database-options';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';

@Module({
  imports: [TypeOrmModule.forRoot(createDatabaseOptions(process.env))],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
