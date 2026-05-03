import { Game, GameStatus } from './entities/game.entity';
import { GameParticipant } from './entities/game-participant.entity';
import { Piece } from '../piece/piece.entity';

export interface Move {
  piece: Piece;
  x: number;
  y: number;
}

/**
 * BlokusGame — logique pure du jeu
 * Migration fidèle de la classe Java BlokusGame.java
 */
export class BlokusGame {
  private readonly SIZE = 20;
  private readonly CORNERS = [[0, 0], [19, 0], [0, 19], [19, 19]];
  private currentPlayerIndex = 0;
  private pieces: Piece[][] = [[], [], [], []];
  private turnStartTime: number = 0;
  private turnTimer: NodeJS.Timeout | null = null;
  private readonly TURN_TIMEOUT_MS = 120_000; // 2 minutes

  // Callback injectés par le Gateway
  onTurnEnd: ((gameId: number) => void) | null = null;
  onGameOver: ((gameId: number) => void) | null = null;
  onBotPlayed: ((gameId: number) => void) | null = null;

  constructor(public game: Game) {}

  // ─── Initialisation ──────────────────────────────────────────────

  initializePieces(allPieces: Piece[]): void {
    for (let i = 0; i < 4; i++) {
      this.pieces[i] = allPieces.map((p) => p.clone());
      const participant = this.getParticipant(i);
      if (participant?.placedPieces?.length) {
        const placedIds = new Set(participant.placedPieces.map((pp) => pp.piece.id));
        this.pieces[i] = this.pieces[i].filter((p) => !placedIds.has(p.id));
      }
    }
  }

  // ─── Accesseurs ──────────────────────────────────────────────────

  getBoard(): number[][] { return this.game.board; }
  getCurrentPlayerIndex(): number { return this.currentPlayerIndex; }
  getParticipant(index: number): GameParticipant { return this.game.participants[index]; }
  getCurrentPlayer(): GameParticipant { return this.getParticipant(this.currentPlayerIndex); }
  getPiecesOf(index: number): Piece[] { return this.pieces[index]; }
  getStatus(): GameStatus { return this.game.status; }
  getTurnStartTime(): number { return this.turnStartTime; }

  isCurrentUser(username: string): boolean {
    return this.getCurrentPlayer()?.user?.username === username;
  }

  getPieceOfCurrentUser(pieceId: number): Piece | null {
    return this.pieces[this.currentPlayerIndex].find((p) => p.id === pieceId) || null;
  }

  // ─── Validation des coups ────────────────────────────────────────

  isValidPlacement(piece: Piece, x: number, y: number, playerIndex: number): boolean {
    const isFirst = this.pieces[playerIndex].length === 21;

    if (isFirst) {
      // Première pièce : doit toucher le coin assigné au joueur
      const [cx, cy] = this.CORNERS[playerIndex];
      let touchesCorner = false;
      for (const [bx, by] of piece.blocks) {
        const nx = x + bx, ny = y + by;
        if (nx < 0 || nx >= this.SIZE || ny < 0 || ny >= this.SIZE) return false;
        if (nx === cx && ny === cy) touchesCorner = true;
      }
      return touchesCorner;
    }

    // Vérifier contact diagonal avec propres pièces
    let touchesDiagonally = false;
    for (const [bx, by] of piece.blocks) {
      const nx = x + bx, ny = y + by;
      if (nx < 0 || nx >= this.SIZE || ny < 0 || ny >= this.SIZE) return false;
      if (!this.game.isBoardCellEmpty(nx, ny)) return false;

      for (const [dx, dy] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const cx = nx + dx, cy = ny + dy;
        if (cx >= 0 && cx < this.SIZE && cy >= 0 && cy < this.SIZE &&
            this.game.getBoardCell(cx, cy) === playerIndex + 1) {
          touchesDiagonally = true;
          break;
        }
      }
    }

    if (!touchesDiagonally) return false;

    // Pas de contact latéral avec ses propres pièces
    for (const [bx, by] of piece.blocks) {
      const nx = x + bx, ny = y + by;
      for (const [dx, dy] of [[0,0],[0,1],[1,0],[-1,0],[0,-1]]) {
        const cx = nx + dx, cy = ny + dy;
        if (cx >= 0 && cx < this.SIZE && cy >= 0 && cy < this.SIZE &&
            this.game.getBoardCell(cx, cy) === playerIndex + 1) {
          return false;
        }
      }
    }

    return true;
  }

  // ─── Placement ───────────────────────────────────────────────────

  placePiece(piece: Piece, x: number, y: number): boolean {
    const idx = this.currentPlayerIndex;
    if (!this.isValidPlacement(piece, x, y, idx)) return false;

    for (const [bx, by] of piece.blocks) {
      this.game.setBoardCell(x + bx, y + by, idx + 1);
    }

    this.pieces[idx] = this.pieces[idx].filter((p) => p.id !== piece.id);
    this.game.incrementMoveNumber();
    return true;
  }

  // ─── IA ──────────────────────────────────────────────────────────

  playRandomMove(): Move | null {
    const shuffled = [...this.pieces[this.currentPlayerIndex]]
      .sort(() => Math.random() - 0.5);

    for (const piece of shuffled) {
      for (let rotation = 0; rotation < 4; rotation++) {
        piece.tournerVersGauche();
        const transforms = [
          () => {},
          () => piece.flipPiecesHorizontally(),
          () => piece.flipPiecesVertically(),
          () => piece.flipPiecesHorizontally(),
        ];
        for (const transform of transforms) {
          transform();
          for (let x = 0; x < this.SIZE; x++) {
            for (let y = 0; y < this.SIZE; y++) {
              if (this.isValidPlacement(piece, x, y, this.currentPlayerIndex)) {
                return { piece, x, y };
              }
            }
          }
        }
      }
    }
    return null;
  }

  canUserPlay(userIndex: number): boolean {
    if (this.pieces[userIndex].length === 0) return false;
    for (const piece of this.pieces[userIndex]) {
      for (let rotation = 0; rotation < 4; rotation++) {
        for (let mirror = 0; mirror < 2; mirror++) {
          const test = piece.clone();
          for (let r = 0; r < rotation; r++) test.tournerVersDroite();
          if (mirror === 1) test.flipPiecesHorizontally();
          for (let x = 0; x < this.SIZE; x++) {
            for (let y = 0; y < this.SIZE; y++) {
              if (this.isValidPlacement(test, x, y, userIndex)) return true;
            }
          }
        }
      }
    }
    return false;
  }

  isGameOver(): boolean {
    for (let i = 0; i < 4; i++) {
      if (this.pieces[i].length === 0) return true;
      if (this.canUserPlay(i)) return false;
    }
    return true;
  }

  // ─── Gestion des tours ───────────────────────────────────────────

  startTurnTimer(): void {
    this.cancelTurnTimer();
    if (this.getCurrentPlayer()?.user?.isRobot) return;
    this.turnStartTime = Date.now();
    this.turnTimer = setTimeout(() => {
      this.passTurn();
      this.onTurnEnd?.(this.game.id);
    }, this.TURN_TIMEOUT_MS);
  }

  cancelTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  passTurn(): void {
    this.cancelTurnTimer();
    if (this.isGameOver()) {
      this.onGameOver?.(this.game.id);
      return;
    }
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
    const user = this.getCurrentPlayer()?.user;
    if (user?.isRobot) {
      if (this.canUserPlay(this.currentPlayerIndex)) {
        setTimeout(() => {
          const move = this.playRandomMove();
          if (move) {
            this.placePiece(move.piece, move.x, move.y);
            this.onBotPlayed?.(this.game.id);
          }
          this.passTurn();
        }, 2000);
      } else {
        this.passTurn();
      }
    } else {
      this.startTurnTimer();
    }
  }

  replacePlayerByBot(userId: number): void {
    for (const participant of this.game.participants) {
      if (!participant.user.isRobot && participant.user.id === userId) {
        participant.user.isRobot = true;
        participant.user.username = `Robot_${participant.user.username}`;
        if (participant.user.id === this.getCurrentPlayer()?.user?.id) {
          this.passTurn();
        }
        break;
      }
    }
  }

  calculateScores(): void {
    const participants = this.game.participants;
    for (let i = 0; i < participants.length; i++) {
      let score = 89;
      if (this.pieces[i].length === 0) {
        score += 15;
      } else {
        for (const piece of this.pieces[i]) score -= piece.blocks.length;
      }
      const placed = participants[i].placedPieces;
      if (placed?.length > 0 && placed[placed.length - 1].piece.blocks.length === 1) {
        score += 5;
      }
      participants[i].score = score;
    }
    participants.sort((a, b) => b.score - a.score);
    participants.forEach((p, i) => (p.classement = i + 1));
  }

  stop(): void {
    this.cancelTurnTimer();
  }

  getValidMoves(): number[][] {
    const mono = new Piece(1, 'I1', [[0, 0]]);
    const result: number[][] = Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(0));
    for (let x = 0; x < this.SIZE; x++) {
      for (let y = 0; y < this.SIZE; y++) {
        if (this.isValidPlacement(mono, x, y, this.currentPlayerIndex)) result[x][y] = 1;
      }
    }
    return result;
  }
}
