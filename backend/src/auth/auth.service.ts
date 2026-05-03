import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userService.findByUsername(username);
    if (!user) return null;
    const valid = await this.userService.validatePassword(password, user.password);
    return valid ? user : null;
  }

  async login(user: User) {
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        totalGames: user.totalGames,
        totalWins: user.totalWins,
      },
    };
  }

  async register(username: string, email: string, password: string) {
    const user = await this.userService.create(username, email, password);
    return this.login(user);
  }
}
