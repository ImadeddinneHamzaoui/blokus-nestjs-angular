import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(username: string, email: string, password: string): Promise<User> {
    const existing = await this.userRepo.findOne({ where: [{ username }, { email }] });
    if (existing) throw new ConflictException('Username or email already exists');

    const hashed = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ username, email, password: hashed });
    return this.userRepo.save(user);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ select: ['id', 'username', 'email', 'totalGames', 'totalWins', 'totalScore', 'createdAt'] });
  }

  async updateStats(userId: number, won: boolean, score: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;
    user.totalGames += 1;
    if (won) user.totalWins += 1;
    user.totalScore += score;
    await this.userRepo.save(user);
  }

  async createRobot(name: string): Promise<User> {
    const robot = this.userRepo.create({
      username: name,
      email: `${name.toLowerCase().replace(' ', '_')}@bot.blokus`,
      password: 'robot',
      isRobot: true,
    });
    return this.userRepo.save(robot);
  }

  async validatePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
