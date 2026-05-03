import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pieces')
export class Piece {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('json')
  blocks: number[][];

  constructor(id?: number, name?: string, blocks?: number[][]) {
    if (id !== undefined) this.id = id;
    if (name !== undefined) this.name = name;
    if (blocks !== undefined) this.blocks = blocks;
  }

  // Rotation 90° vers la gauche
  tournerVersGauche(): void {
    this.blocks = this.blocks.map(([x, y]) => [y, -x]);
    this.normalizeBlocks();
  }

  // Rotation 90° vers la droite
  tournerVersDroite(): void {
    this.blocks = this.blocks.map(([x, y]) => [-y, x]);
    this.normalizeBlocks();
  }

  // Miroir horizontal
  flipPiecesHorizontally(): void {
    this.blocks = this.blocks.map(([x, y]) => [-x, y]);
    this.normalizeBlocks();
  }

  // Miroir vertical
  flipPiecesVertically(): void {
    this.blocks = this.blocks.map(([x, y]) => [x, -y]);
    this.normalizeBlocks();
  }

  private normalizeBlocks(): void {
    const minX = Math.min(...this.blocks.map(([x]) => x));
    const minY = Math.min(...this.blocks.map(([, y]) => y));
    this.blocks = this.blocks.map(([x, y]) => [x - minX, y - minY]);
  }

  clone(): Piece {
    return new Piece(this.id, this.name, this.blocks.map((b) => [...b]));
  }
}
