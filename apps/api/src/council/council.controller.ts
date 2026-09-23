import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Sse,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parsePlan } from '../simulation/plan-parser';
import { CouncilService } from './council.service';

@Controller('council/sessions')
export class CouncilController {
  constructor(
    @Inject(CouncilService) private readonly council: CouncilService,
  ) {}

  @Post()
  async create(@Body() body: unknown) {
    let plan;
    try {
      plan = parsePlan(body);
    } catch {
      throw new UnprocessableEntityException(
        'План не прошёл проверку. Вернитесь в конструктор.',
      );
    }
    return this.council.create(plan);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('id') id: string) {
    return this.council.get(id);
  }

  @Sse(':id/events')
  @Header('X-Accel-Buffering', 'no')
  events(
    @Param('id') id: string,
    @Headers('last-event-id') lastId?: string,
    @Query('after') after?: string,
  ) {
    const value = lastId ?? after ?? '0';
    const offset =
      /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
        ? Number(value)
        : 0;
    return this.council.events(id, offset);
  }
}
