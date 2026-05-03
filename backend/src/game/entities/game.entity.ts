import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { GameParticipant } from './game-participant.entity';

export enum GameStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: GameStatus, default: GameStatus.WAITING })
  status: GameStatus;

  @Column({ default: 0 })
  moveNumber: number;

  @Column({ nullable: true })
  maxPlayers: number;

  // Plateau 20x20 sérialisé en JSON
  @Column({ type: 'json', nullable: true })
  board: number[][];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GameParticipant, (gp) => gp.game, { cascade: true, eager: true })
  participants: GameParticipant[];

  // Initialiser un plateau vide 20x20
  initBoard(): void {
    this.board = Array.from({ length: 20 }, () => Array(20).fill(0));
  }

  getBoardCell(x: number, y: number): number {
    return this.board[x]?.[y] ?? 0;
  }

  setBoardCell(x: number, y: number, value: number): void {
    if (this.board[x]) this.board[x][y] = value;
  }

  isBoardCellEmpty(x: number, y: number): boolean {
    return this.getBoardCell(x, y) === 0;
  }

  getIndex(username: string): number {
    return this.participants.findIndex((p) => p.user.username === username);
  }

  incrementMoveNumber(): void {
    this.moveNumber++;
  }
}
