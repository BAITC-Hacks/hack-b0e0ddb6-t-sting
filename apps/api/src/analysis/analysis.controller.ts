import { Body, Controller, Header, Inject, Post } from '@nestjs/common';
import { parsePlan } from '../simulation/plan-parser';
import { roundPayload } from '../simulation/round-payload';
import { AnalysisService } from './analysis.service';

@Controller('plans')
export class AnalysisController {
  constructor(
    @Inject(AnalysisService) private readonly analysis: AnalysisService,
  ) {}

  @Post('analysis')
  @Header('Cache-Control', 'no-store')
  async analyze(@Body() body: unknown) {
    return roundPayload(await this.analysis.analyze(parsePlan(body)));
  }
}
