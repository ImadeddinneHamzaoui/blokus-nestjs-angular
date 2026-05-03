import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Game } from './game.entity';
import { PlacedPiece } from './placed-piece.entity';

export enum PlayerColor {
  BLUE   = 'BLUE',
  YELLOW = 'YELLOW',
  RED    = 'RED',
  GREEN  = 'GREEN',
}

@Entity('game_participants')
export class GameParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Game, (g) => g.participants)
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @ManyToOne(() => User, (u) => u.participations, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: PlayerColor })
  color: PlayerColor;

  @Column({ default: 0 })
  score: number;

  @Column({ nullable: true })
  classement: number;

  @OneToMany(() => PlacedPiece, (pp) => pp.participant, { cascade: true, eager: true })
  placedPieces: PlacedPiece[];

  get placedPiecesCount(): number {
    return this.placedPieces?.length || 0;
  }
}
