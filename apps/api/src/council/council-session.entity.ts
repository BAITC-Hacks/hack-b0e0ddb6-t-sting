import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Plan } from '../simulation/engine/types';
import type { CouncilEvent, CouncilSession, Protocol } from './types';

type Timestamp = Date;

@Entity('council_sessions')
export class CouncilSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'jsonb' })
  plan!: Plan;

  @Column({ type: 'jsonb', default: [] })
  events!: CouncilEvent[];

  @Column({ type: 'jsonb', nullable: true })
  protocol!: Protocol | null;

  @Column({ type: 'varchar', length: 10 })
  status!: CouncilSession['status'];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Timestamp;
}
