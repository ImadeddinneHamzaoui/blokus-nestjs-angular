import {
  Controller, Post, Get, Body, Param, UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { GameService } from './game.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('waiting')
  async getWaitingGames() {
    const games = await this.gameService.getWaitingGames();
    return games.map((g) => ({
      id: g.id,
      status: g.status,
      maxPlayers: g.maxPlayers,
      playersCount: g.participants.length,
      players: g.participants.map((p) => ({
        username: p.user.username,
        color: p.color,
      })),
      createdAt: g.createdAt,
    }));
  }

  @Post('create')
  async createGame(@Request() req, @Body() body: { maxPlayers?: number }) {
    const game = await this.gameService.createGame(req.user.id, body.maxPlayers || 4);
    return { id: game.id, status: game.status };
  }

  @Post(':id/join')
  async joinGame(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const game = await this.gameService.joinGame(id, req.user.id);
    return { id: game.id, status: game.status, playersCount: game.participants.length };
  }

  @Get(':id')
  async getGame(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.getGameWithDetails(id);
  }
}
