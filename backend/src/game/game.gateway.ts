import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameService } from './game.service';

interface AuthSocket extends Socket {
  userId?: number;
  username?: string;
  gameId?: number;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // Map userId → timeout de remplacement par bot
  private disconnectTimers = new Map<number, NodeJS.Timeout>();
  // Map userId → gameId (pour reconnexion)
  private playerGameMap = new Map<number, number>();

  // Délai de grâce avant remplacement par bot (ms)
  private readonly GRACE_PERIOD_MS = 15_000;

  constructor(
    private gameService: GameService,
    private jwtService: JwtService,
  ) {}

  // ─── Connexion ───────────────────────────────────────────────────

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.username = payload.username;

      // ── Reconnexion : annuler le timer de remplacement par bot ──
      if (this.disconnectTimers.has(client.userId)) {
        clearTimeout(this.disconnectTimers.get(client.userId));
        this.disconnectTimers.delete(client.userId);
        console.log(`🔄 Reconnected before grace period: ${client.username}`);

        // Restaurer le gameId et rejoindre la salle automatiquement
        const gameId = this.playerGameMap.get(client.userId);
        if (gameId) {
          client.gameId = gameId;
          client.join(`game_${gameId}`);
          await this.emitGameState(gameId);
        }
      }

      console.log(`✅ Connected: ${client.username} (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    console.log(`⚡ Disconnected: ${client.username} (${client.id}) — grace period started`);

    if (!client.gameId || !client.userId) return;

    const { userId, gameId } = client;

    // Mémoriser le gameId pour la reconnexion
    this.playerGameMap.set(userId, gameId);

    // ── Démarrer le timer de grâce ──
    const timer = setTimeout(async () => {
      this.disconnectTimers.delete(userId);
      this.playerGameMap.delete(userId);
      console.log(`🤖 Grace period expired for userId=${userId} → replacing with bot`);
      await this.gameService.handleDisconnect(gameId, userId);
      this.emitGameState(gameId);
    }, this.GRACE_PERIOD_MS);

    this.disconnectTimers.set(userId, timer);
  }

  // ─── Rejoindre la salle ──────────────────────────────────────────

  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: number },
  ) {
    client.gameId = data.gameId;
    client.join(`game_${data.gameId}`);

    // Annuler le timer de grâce si le joueur rejoint manuellement
    if (client.userId && this.disconnectTimers.has(client.userId)) {
      clearTimeout(this.disconnectTimers.get(client.userId));
      this.disconnectTimers.delete(client.userId);
      this.playerGameMap.delete(client.userId);
    }

    await this.emitGameState(data.gameId);
  }

  // ─── Démarrer la partie ──────────────────────────────────────────

  @SubscribeMessage('startGame')
  async handleStartGame(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: number },
  ) {
    try {
      const session = await this.gameService.startGame(data.gameId);

      session.onTurnEnd = (gid) => this.emitGameState(gid);
      session.onGameOver = async (gid) => {
        await this.gameService.endGame(gid);
        this.emitGameState(gid);
      };
      session.onBotPlayed = (gid) => this.emitGameState(gid);

      session.startTurnTimer();
      await this.emitGameState(data.gameId);
    } catch (err) {
      client.emit('error', { message: err.message });
    }
  }

  // ─── Placer une pièce ────────────────────────────────────────────

  @SubscribeMessage('placePiece')
  async handlePlacePiece(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: number; pieceId: number; x: number; y: number; blocks: number[][] },
  ) {
    try {
      const { session } = await this.gameService.placePiece(
        data.gameId, client.userId, data.pieceId, data.x, data.y, data.blocks,
      );
      session.passTurn();
      await this.emitGameState(data.gameId);
    } catch (err) {
      client.emit('invalidMove', { message: err.message });
    }
  }

  // ─── Passer son tour ─────────────────────────────────────────────

  @SubscribeMessage('passTurn')
  async handlePassTurn(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: number },
  ) {
    try {
      await this.gameService.passTurn(data.gameId, client.userId);
      await this.emitGameState(data.gameId);
    } catch (err) {
      client.emit('error', { message: err.message });
    }
  }

  // ─── Émettre l'état du jeu ───────────────────────────────────────

  async emitGameState(gameId: number) {
    const session = this.gameService.getSession(gameId);
    const game = session?.game || await this.gameService.getGameWithDetails(gameId);
    if (!game) return;

    const state = {
      gameId,
      status: game.status,
      board: game.board,
      moveNumber: game.moveNumber,
      currentPlayerIndex: session?.getCurrentPlayerIndex() ?? 0,
      turnStartTime: session?.getTurnStartTime() ?? 0,
      participants: game.participants.map((p, i) => ({
        id: p.id,
        userId: p.user.id,
        username: p.user.username,
        color: p.color,
        score: p.score,
        classement: p.classement,
        isRobot: p.user.isRobot,
        isDisconnected: this.disconnectTimers.has(p.user.id), // ← indique grâce active
        piecesLeft: session?.getPiecesOf(i)?.length ?? 21,
        pieces: session?.getPiecesOf(i)?.map((pc) => ({
          id: pc.id, name: pc.name, blocks: pc.blocks,
        })) ?? [],
      })),
    };

    this.server.to(`game_${gameId}`).emit('gameState', state);
  }
}
