import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { GameParticipant } from './game-participant.entity';
import { Piece } from '../../piece/piece.entity';

@Entity('placed_pieces')
export class PlacedPiece {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => GameParticipant, (gp) => gp.placedPieces)
  @JoinColumn({ name: 'participant_id' })
  participant: GameParticipant;

  @ManyToOne(() => Piece, { eager: true })
  @JoinColumn({ name: 'piece_id' })
  piece: Piece;

  @Column()
  posX: number;

  @Column()
  posY: number;

  @Column({ type: 'json' })
  blocksUsed: number[][];

  @CreateDateColumn()
  placedAt: Date;
}
