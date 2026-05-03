import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module';
import { UserModule } from './user/user.module';
import { PieceModule } from './piece/piece.module';
import { User } from './user/user.entity';
import { Game } from './game/entities/game.entity';
import { GameParticipant } from './game/entities/game-participant.entity';
import { Piece } from './piece/piece.entity';
import { PlacedPiece } from './game/entities/placed-piece.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'blokus',
      password: process.env.DB_PASSWORD || 'blokus',
      database: process.env.DB_DATABASE || 'blokus',
      entities: [User, Game, GameParticipant, Piece, PlacedPiece],
      synchronize: true, // Désactiver en production
    }),
    AuthModule,
    GameModule,
    UserModule,
    PieceModule,
  ],
})
export class AppModule {}
