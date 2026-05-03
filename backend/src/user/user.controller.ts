import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.userService.findById(req.user.id);
    const { password, ...result } = user as any;
    return { ...result, winRate: user.winRate, avgScore: user.avgScore };
  }

  @Get('leaderboard')
  async getLeaderboard() {
    const users = await this.userService.findAll();
    return users
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10)
      .map((u) => ({
        id: u.id,
        username: u.username,
        totalGames: u.totalGames,
        totalWins: u.totalWins,
        totalScore: u.totalScore,
        winRate: u.winRate,
        avgScore: u.avgScore,
      }));
  }
}
