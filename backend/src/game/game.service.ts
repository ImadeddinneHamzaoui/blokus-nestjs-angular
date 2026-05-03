import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, GameStatus } from './entities/game.entity';
import { GameParticipant, PlayerColor } from './entities/game-participant.entity';
import { PlacedPiece } from './entities/placed-piece.entity';
import { UserService } from '../user/user.service';
import { PieceService } from '../piece/piece.service';
import { BlokusGame } from './blokus-game';
import { Piece } from '../piece/piece.entity';

const COLORS = [PlayerColor.BLUE, PlayerColor.YELLOW, PlayerColor.RED, PlayerColor.GREEN];

@Injectable()
export class GameService {
  // Sessions actives en mémoire (gameId → BlokusGame)
  private activeSessions = new Map<number, BlokusGame>();

  constructor(
    @InjectRepository(Game)     private gameRepo: Repository<Game>,
    @InjectRepository(GameParticipant) private participantRepo: Repository<GameParticipant>,
    @InjectRepository(PlacedPiece)     private placedPieceRepo: Repository<PlacedPiece>,
    private userService: UserService,
    private pieceService: PieceService,
  ) {}

  // ─── Créer une partie ────────────────────────────────────────────

  async createGame(creatorId: number, maxPlayers = 4): Promise<Game> {
    const creator = await this.userService.findById(creatorId);
    if (!creator) throw new NotFoundException('User not found');

    const game = this.gameRepo.create({ maxPlayers, status: GameStatus.WAITING });
    game.initBoard();
    await this.gameRepo.save(game);

    const participant = this.participantRepo.create({
      game, user: creator, color: COLORS[0],
    });
    await this.participantRepo.save(participant);

    return this.getGameWithDetails(game.id);
  }

  // ─── Rejoindre une partie ────────────────────────────────────────

  async joinGame(gameId: number, userId: number): Promise<Game> {
    const game = await this.getGameWithDetails(gameId);
    if (!game) throw new NotFoundException('Game not found');
    if (game.status !== GameStatus.WAITING) throw new BadRequestException('Game already started');
    if (game.participants.length >= game.maxPlayers) throw new BadRequestException('Game is full');
    if (game.participants.find((p) => p.user.id === userId))
      throw new BadRequestException('Already in this game');

    const user = await this.userService.findById(userId);
    const color = COLORS[game.participants.length];
    const participant = this.participantRepo.create({ game, user, color });
    await this.participantRepo.save(participant);

    return this.getGameWithDetails(gameId);
  }

  // ─── Démarrer une partie ─────────────────────────────────────────

  async startGame(gameId: number): Promise<BlokusGame> {
    const game = await this.getGameWithDetails(gameId);
    if (!game) throw new NotFoundException('Game not found');

    // Remplir avec des bots si moins de 4 joueurs
    while (game.participants.length < 4) {
      const botName = `Bot_${game.participants.length + 1}`;
      const bot = await this.userService.createRobot(botName);
      const color = COLORS[game.participants.length];
      const p = this.participantRepo.create({ game, user: bot, color });
      await this.participantRepo.save(p);
      game.participants.push(p);
    }

    game.status = GameStatus.IN_PROGRESS;
    await this.gameRepo.save(game);

    const allPieces = await this.pieceService.findAll();
    const session = new BlokusGame(game);
    session.initializePieces(allPieces);
    this.activeSessions.set(gameId, session);

    return session;
  }

  // ─── Placer une pièce ────────────────────────────────────────────

  async placePiece(
    gameId: number, userId: number, pieceId: number, x: number, y: number, blocks: number[][],
  ): Promise<{ success: boolean; session: BlokusGame }> {
    const session = this.activeSessions.get(gameId);
    if (!session) throw new NotFoundException('Game session not found');

    const player = session.getCurrentPlayer();
    if (player.user.id !== userId) throw new BadRequestException('Not your turn');

    const piece = session.getPieceOfCurrentUser(pieceId);
    if (!piece) throw new BadRequestException('Piece not found or already used');

    // Appliquer les blocs tels qu'envoyés par le client (après rotation/flip)
    if (blocks?.length) piece.blocks = blocks;

    const success = session.placePiece(piece, x, y);
    if (!success) throw new BadRequestException('Invalid placement');

    // Persister le coup en base
    await this.saveMove(session, player, piece, x, y, blocks || piece.blocks);
    await this.gameRepo.save(session.game);

    return { success: true, session };
  }

  // ─── Passer le tour ──────────────────────────────────────────────

  async passTurn(gameId: number, userId: number): Promise<BlokusGame> {
    const session = this.activeSessions.get(gameId);
    if (!session) throw new NotFoundException('Game session not found');
    if (session.getCurrentPlayer().user.id !== userId)
      throw new BadRequestException('Not your turn');
    session.passTurn();
    return session;
  }

  // ─── Terminer une partie ─────────────────────────────────────────

  async endGame(gameId: number): Promise<BlokusGame> {
    const session = this.activeSessions.get(gameId);
    if (!session) throw new NotFoundException('Game session not found');

    session.calculateScores();
    session.game.status = GameStatus.FINISHED;
    await this.gameRepo.save(session.game);
    await this.participantRepo.save(session.game.participants);

    // Mettre à jour les stats des joueurs humains
    const winner = session.game.participants.find((p) => p.classement === 1);
    for (const p of session.game.participants) {
      if (!p.user.isRobot) {
        await this.userService.updateStats(p.user.id, p.user.id === winner?.user?.id, p.score);
      }
    }

    session.stop();
    return session;
  }

  // ─── Déconnexion d'un joueur ─────────────────────────────────────

  async handleDisconnect(gameId: number, userId: number): Promise<void> {
    const session = this.activeSessions.get(gameId);
    if (session) session.replacePlayerByBot(userId);
  }

  // ─── Utilitaires ─────────────────────────────────────────────────

  getSession(gameId: number): BlokusGame | undefined {
    return this.activeSessions.get(gameId);
  }

  async getWaitingGames(): Promise<Game[]> {
    return this.gameRepo.find({
      where: { status: GameStatus.WAITING },
      order: { createdAt: 'DESC' },
    });
  }

  async getGameWithDetails(gameId: number): Promise<Game | null> {
    return this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['participants', 'participants.user', 'participants.placedPieces', 'participants.placedPieces.piece'],
    });
  }

  private async saveMove(
    session: BlokusGame,
    participant: GameParticipant,
    piece: Piece,
    x: number, y: number,
    blocks: number[][],
  ): Promise<void> {
    const dbParticipant = await this.participantRepo.findOne({
      where: { id: participant.id },
    });
    if (!dbParticipant) return;
    const placed = this.placedPieceRepo.create({
      participant: dbParticipant,
      piece,
      posX: x,
      posY: y,
      blocksUsed: blocks,
    });
    await this.placedPieceRepo.save(placed);
  }
}
