import type {
  CriticalCell,
  DirectionId,
  Evaluation,
  Plan,
  PlanItem,
  RuleViolation,
} from '../simulation/engine/types';

export type CouncilRoleId = DirectionId | 'ombudsman' | 'finance';
export type Stance = 'for' | 'conditional' | 'against';
export type VoteChoice = 'for' | 'abstain' | 'against';

export interface CouncilMember {
  id: CouncilRoleId | 'chair';
  title: string;
  emoji: string;
  metric: string;
  character: string;
}

export type MetricValues = Record<CouncilRoleId, number>;

export interface MetricImpact {
  roleId: CouncilRoleId;
  before: number;
  after: number;
  delta: number;
}

export interface Amendment {
  id: string;
  replace: PlanItem;
  with: PlanItem;
  plan: Plan;
  scoreAfter: number;
  delta: number;
  cost: number;
  impacts: MetricImpact[];
}

export interface Brief {
  roleId: CouncilRoleId;
  member: CouncilMember;
  metricBefore: number;
  metricAfter: number;
  stance: Stance;
  criticalCells: CriticalCell[];
  borderlineCells: CriticalCell[];
  contributions: { item: PlanItem; delta: number }[];
  candidates: Amendment[];
  allowedNumbers: number[];
}

export interface CouncilContext {
  plan: Plan;
  evaluation: Evaluation;
  baseline: Evaluation;
  members: CouncilMember[];
  briefs: Brief[];
  amendments: Amendment[];
}

export interface PackageCheck {
  amendmentIds: string[];
  valid: boolean;
  plan?: Plan;
  evaluation?: Evaluation;
  score?: number;
  cost?: number;
  reason?: string;
  violations?: RuleViolation[];
}

export interface Vote {
  roleId: CouncilRoleId;
  vote: VoteChoice;
  delta: number;
}

export interface Protocol {
  source: 'llm' | 'offline';
  verified: boolean;
  decision: 'accept' | 'amend' | 'revise';
  recommendedAmendmentIds: string[];
  plan: Plan;
  score: number;
  cost: number;
  compromises: { amendmentId: string; scoreCost: number; text: string }[];
  dissent: { roleId: CouncilRoleId; text: string }[];
  summary: string;
}

export type CouncilEvent =
  | { type: 'opened'; plan: Plan; score: number; members: CouncilMember[] }
  | {
      type: 'speech';
      round: 1 | 2;
      roleId: CouncilRoleId;
      stance: Stance;
      text: string;
      amendmentId: string | null;
      source: 'llm' | 'offline';
      verified: boolean;
    }
  | { type: 'amendment'; amendment: Amendment }
  | {
      type: 'objection';
      roleId: CouncilRoleId;
      amendmentId: string;
      text: string;
    }
  | {
      type: 'package-check';
      amendmentIds: string[];
      valid: boolean;
      score?: number;
      cost?: number;
      reason?: string;
    }
  | { type: 'votes'; votes: Vote[] }
  | { type: 'protocol'; protocol: Protocol }
  | { type: 'closed' }
  | { type: 'failed'; message: string };

export interface CouncilSession {
  id: string;
  plan: Plan;
  events: CouncilEvent[];
  protocol: Protocol | null;
  status: 'running' | 'closed' | 'failed';
  createdAt: string;
}
