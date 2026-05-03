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
      console.log(`✅ Connected: ${client.username} (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    console.log(`❌ Disconnected: ${client.username} (${client.id})`);
    if (client.gameId && client.userId) {
      await this.gameService.handleDisconnect(client.gameId, client.userId);
      this.emitGameState(client.gameId);
    }
  }

  // ─── Rejoindre la salle ──────────────────────────────────────────

  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: number },
  ) {
    client.gameId = data.gameId;
    client.join(`game_${data.gameId}`);
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

      // Injecter les callbacks du gateway dans la session
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

  // ─── Émettre l'état du jeu à toute la salle ──────────────────────

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
        piecesLeft: session?.getPiecesOf(i)?.length ?? 21,
        pieces: session?.getPiecesOf(i)?.map((pc) => ({
          id: pc.id, name: pc.name, blocks: pc.blocks,
        })) ?? [],
      })),
    };

    this.server.to(`game_${gameId}`).emit('gameState', state);
  }
}
