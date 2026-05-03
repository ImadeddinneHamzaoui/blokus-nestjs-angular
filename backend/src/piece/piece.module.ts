import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PieceService } from './piece.service';
import { Piece } from './piece.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Piece])],
  providers: [PieceService],
  exports: [PieceService],
})
export class PieceModule {}
