import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { parsePlan } from './plan-parser';
import { roundPayload } from './round-payload';
import { SimulationService } from './simulation.service';

@Controller()
export class SimulationController {
  constructor(
    @Inject(SimulationService) private readonly simulation: SimulationService,
  ) {}

  @Get('scenario')
  scenario() {
    return roundPayload(this.simulation.scenario());
  }

  @Post('plans/validate')
  @HttpCode(200)
  validate(@Body() body: unknown) {
    return roundPayload(this.simulation.validate(parsePlan(body)));
  }

  @Post('plans/review')
  @HttpCode(200)
  review(@Body() body: unknown) {
    const review = this.simulation.review(parsePlan(body));
    return {
      ...roundPayload(review),
      percentile: Number(review.percentile.toFixed(1)),
    };
  }
}
