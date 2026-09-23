import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private readonly database: DataSource) {}

  async check() {
    try {
      await this.database.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      // Keep connection strings and driver error details out of public responses.
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
  }
}
