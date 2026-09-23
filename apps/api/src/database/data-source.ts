import 'reflect-metadata';
import '../config/load-env';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database-options';

export default new DataSource(createDatabaseOptions(process.env));
