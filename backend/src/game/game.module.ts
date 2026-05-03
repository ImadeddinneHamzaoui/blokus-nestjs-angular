import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { Game } from './entities/game.entity';
import { GameParticipant } from './entities/game-participant.entity';
import { PlacedPiece } from './entities/placed-piece.entity';
import { UserModule } from '../user/user.module';
import { PieceModule } from '../piece/piece.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, GameParticipant, PlacedPiece]),
    UserModule,
    PieceModule,
    AuthModule,
  ],
  providers: [GameService, GameGateway],
  controllers: [GameController],
})
export class GameModule {}
