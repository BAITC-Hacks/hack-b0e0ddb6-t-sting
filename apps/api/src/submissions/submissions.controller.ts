import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
} from '@nestjs/common';
import { parsePlan } from '../simulation/plan-parser';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class SubmissionsController {
  constructor(
    @Inject(SubmissionsService)
    private readonly submissions: SubmissionsService,
  ) {}

  @Get()
  list() {
    return this.submissions.list();
  }

  @Post()
  async create(@Body() body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Укажите название команды и план.');
    }
    const { teamName } = body as Record<string, unknown>;
    if (
      typeof teamName !== 'string' ||
      !teamName.trim() ||
      teamName.trim().length > 40 ||
      [...teamName].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    ) {
      throw new BadRequestException(
        'Название команды: от 1 до 40 символов, без переносов строк.',
      );
    }
    return this.submissions.create(teamName.trim(), parsePlan(body));
  }
}
