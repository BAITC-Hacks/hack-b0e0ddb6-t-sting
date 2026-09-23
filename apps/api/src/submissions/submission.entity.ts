import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Plan } from '../simulation/engine/types';

type Timestamp = Date;

@Entity('submissions')
@Index('IDX_submissions_score', ['score'])
export class SubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40 })
  teamName!: string;

  @Column({ type: 'jsonb' })
  plan!: Plan;

  @Column({ type: 'double precision' })
  score!: number;

  @Column({ type: 'integer' })
  rank!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Timestamp;
}
