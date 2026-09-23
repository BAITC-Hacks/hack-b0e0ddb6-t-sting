export type DistrictId = 'yesil' | 'almaty' | 'saryarka' | 'baikonur' | 'nura';
export type IndicatorId =
  'T1' | 'T2' | 'E1' | 'E2' | 'S1' | 'S2' | 'B1' | 'B2' | 'C1' | 'C2';
export type DirectionId =
  'transport' | 'ecology' | 'social' | 'safety' | 'services';
export type MeasureId =
  `M${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14}`;
export type Indicators = Record<IndicatorId, number>;
export interface PlanItem {
  measureId: MeasureId;
  districtId?: DistrictId;
}
export type Plan = PlanItem[];
export type RuleCode =
  | 'UNKNOWN_MEASURE'
  | 'UNKNOWN_DISTRICT'
  | 'WRONG_COUNT'
  | 'DUPLICATE'
  | 'DISTRICT_REQUIRED'
  | 'DISTRICT_NOT_ALLOWED'
  | 'BUDGET_EXCEEDED'
  | 'DIRECTION_LIMIT'
  | 'INCOMPATIBLE';
export interface RuleViolation {
  code: RuleCode;
  message: string;
  measureIds: MeasureId[];
}
export interface Validation {
  cost: number;
  remaining: number;
  directionsUsed: number;
  directionCounts: Record<DirectionId, number>;
  violations: RuleViolation[];
}
export interface CriticalCell {
  districtId: DistrictId;
  indicatorId: IndicatorId;
  value: number;
}
export interface DistrictResult {
  districtId: DistrictId;
  before: Indicators;
  after: Indicators;
  scoreBefore: number;
  scoreAfter: number;
}
export interface Evaluation {
  score: number;
  cityAverage: number;
  weakestScore: number;
  cost: number;
  criticalCells: CriticalCell[];
  districts: DistrictResult[];
  synergies: { measureIds: [MeasureId, MeasureId]; districtId: DistrictId }[];
}
export type MoveGrade =
  'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
export interface Swap {
  replace: PlanItem;
  with: PlanItem;
  scoreAfter: number;
  gain: number;
}
export interface MoveReview {
  item: PlanItem;
  contribution: number;
  grade: MoveGrade;
  bestSwap?: Swap;
}
export interface Review {
  evaluation: Evaluation;
  baselineScore: number;
  scoreDelta: number;
  optimumGap: number;
  rank: number;
  totalPlans: number;
  percentile: number;
  efficiency: number;
  optimum: { score: number; plan: Plan };
  moves: MoveReview[];
  topSwaps: Swap[];
  histogram: { from: number; to: number; count: number }[];
}
export interface Analysis {
  source: 'llm' | 'offline';
  summary: string;
  strengths: string[];
  risks: string[];
  consequences: string[];
  recommendations: string[];
  trace: { tool: string; input: unknown; output?: unknown }[];
}
export interface Measure {
  id: MeasureId;
  name: string;
  direction: DirectionId;
  scope: 'district' | 'city';
  cost: number;
  lag: number;
  effects: Partial<Indicators>;
}
export interface District {
  id: DistrictId;
  name: string;
  population: number;
  indicators: Indicators;
  profile: string;
}
export interface Indicator {
  id: IndicatorId;
  name: string;
  direction: DirectionId;
  weight: number;
}
export interface Synergy {
  measureIds: [MeasureId, MeasureId];
  effects: Partial<Indicators>;
}
export interface Incompatibility {
  measureIds: [MeasureId, MeasureId];
  sameDistrictOnly: boolean;
  reason: string;
}
export interface ScenarioData {
  version: string;
  budget: number;
  horizon: number;
  districts: District[];
  indicators: Indicator[];
  measures: Measure[];
  synergies: Synergy[];
  incompatibilities: Incompatibility[];
  rules: string[];
  examples: { strong: Plan; trap: Plan };
}
export interface Scenario extends ScenarioData {
  baseline: Evaluation;
}
export interface Submission {
  id: string;
  teamName: string;
  plan: Plan;
  score: number;
  rank: number;
  createdAt: string;
}
