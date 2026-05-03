import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Piece } from './piece.entity';

// Les 21 pièces standard du Blokus
const BLOKUS_PIECES = [
  { id: 1,  name: 'I1', blocks: [[0,0]] },
  { id: 2,  name: 'I2', blocks: [[0,0],[1,0]] },
  { id: 3,  name: 'I3', blocks: [[0,0],[1,0],[2,0]] },
  { id: 4,  name: 'L3', blocks: [[0,0],[1,0],[1,1]] },
  { id: 5,  name: 'I4', blocks: [[0,0],[1,0],[2,0],[3,0]] },
  { id: 6,  name: 'L4', blocks: [[0,0],[1,0],[2,0],[2,1]] },
  { id: 7,  name: 'T4', blocks: [[0,0],[1,0],[2,0],[1,1]] },
  { id: 8,  name: 'O4', blocks: [[0,0],[1,0],[0,1],[1,1]] },
  { id: 9,  name: 'S4', blocks: [[0,0],[1,0],[1,1],[2,1]] },
  { id: 10, name: 'I5', blocks: [[0,0],[1,0],[2,0],[3,0],[4,0]] },
  { id: 11, name: 'L5', blocks: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
  { id: 12, name: 'Y5', blocks: [[0,0],[1,0],[2,0],[3,0],[1,1]] },
  { id: 13, name: 'N5', blocks: [[0,0],[1,0],[1,1],[2,1],[3,1]] },
  { id: 14, name: 'P5', blocks: [[0,0],[1,0],[0,1],[1,1],[2,0]] },
  { id: 15, name: 'T5', blocks: [[0,0],[1,0],[2,0],[1,1],[1,2]] },
  { id: 16, name: 'U5', blocks: [[0,0],[2,0],[0,1],[1,1],[2,1]] },
  { id: 17, name: 'V5', blocks: [[0,0],[1,0],[2,0],[2,1],[2,2]] },
  { id: 18, name: 'W5', blocks: [[0,0],[1,0],[1,1],[2,1],[2,2]] },
  { id: 19, name: 'X5', blocks: [[1,0],[0,1],[1,1],[2,1],[1,2]] },
  { id: 20, name: 'Z5', blocks: [[0,0],[1,0],[1,1],[1,2],[2,2]] },
  { id: 21, name: 'F5', blocks: [[1,0],[2,0],[0,1],[1,1],[1,2]] },
];

@Injectable()
export class PieceService implements OnModuleInit {
  constructor(
    @InjectRepository(Piece)
    private pieceRepo: Repository<Piece>,
  ) {}

  async onModuleInit() {
    const count = await this.pieceRepo.count();
    if (count === 0) {
      console.log('🎲 Seeding Blokus pieces...');
      await this.pieceRepo.save(BLOKUS_PIECES.map(p => this.pieceRepo.create(p)));
      console.log(`✅ ${BLOKUS_PIECES.length} pieces seeded.`);
    }
  }

  async findAll(): Promise<Piece[]> {
    return this.pieceRepo.find({ order: { id: 'ASC' } });
  }

  async findById(id: number): Promise<Piece | null> {
    return this.pieceRepo.findOne({ where: { id } });
  }
}
