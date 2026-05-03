import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { GameParticipant } from '../game/entities/game-participant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: false })
  isRobot: boolean;

  @Column({ nullable: true })
  preferredColor: string;

  @Column({ default: 0 })
  totalGames: number;

  @Column({ default: 0 })
  totalWins: number;

  @Column({ default: 0 })
  totalScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GameParticipant, (gp) => gp.user)
  participations: GameParticipant[];

  get winRate(): number {
    if (this.totalGames === 0) return 0;
    return Math.round((this.totalWins / this.totalGames) * 100);
  }

  get avgScore(): number {
    if (this.totalGames === 0) return 0;
    return Math.round(this.totalScore / this.totalGames);
  }
}
