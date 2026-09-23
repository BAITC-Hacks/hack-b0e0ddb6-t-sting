import 'reflect-metadata';
import './config/load-env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getPort } from './config/environment';
import { mountGameRuntime } from './game/runtime-host';

async function bootstrap() {
  const port = getPort(process.env, 'API_PORT', 3000);
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  await mountGameRuntime(app, process.env);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');
}

void bootstrap().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.message : 'Could not start API');
  process.exitCode = 1;
});
