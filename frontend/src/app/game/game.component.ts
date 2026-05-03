import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameSocketService } from '../core/game-socket.service';
import { AuthService } from '../core/auth.service';

export interface GameState {
  gameId: number;
  status: string;
  board: number[][];
  moveNumber: number;
  currentPlayerIndex: number;
  turnStartTime: number;
  participants: Participant[];
}

export interface Participant {
  id: number;
  userId: number;
  username: string;
  color: string;
  score: number;
  classement: number;
  isRobot: boolean;
  piecesLeft: number;
  pieces: PieceInfo[];
}

export interface PieceInfo {
  id: number;
  name: string;
  blocks: number[][];
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="game-page">
    <!-- Header -->
    <header class="game-header glass">
      <!-- Timer + titre -->
      <div style="display:flex; align-items:center; gap:12px">
        <button class="btn-ghost" (click)="router.navigate(['/lobby'])">← Lobby</button>
        <div class="game-title">Partie #{{ gameId }}</div>
        @if (gameState()) {
          <span class="move-count">Coup {{ gameState()!.moveNumber }}</span>
        }
      </div>

      <!-- Cartes joueurs centrées -->
      <div class="player-cards">
        @if (gameState()) {
          @for (p of gameState()!.participants; track p.id; let i = $index) {
            <div class="player-card glass" [class.active]="gameState()!.currentPlayerIndex === i">
              @if (gameState()!.currentPlayerIndex === i) {
                <span class="current-turn">▶ Tour</span>
              }
              <div class="avatar" [class]="'avatar-' + p.color.toLowerCase()">
                {{ p.isRobot ? '🤖' : p.username[0].toUpperCase() }}
              </div>
              <span class="player-name">{{ p.username }}</span>
              <small style="font-size:0.7rem; color:#7f8c8d; font-weight:600">{{ p.score }} pts</small>
            </div>
          }
        }
      </div>

      <!-- Timer -->
      <div class="header-timer">
        @if (timeLeft() > 0) {
          <div class="timer" [class.warning]="timeLeft() < 60" [class.danger]="timeLeft() < 30">
            ⏱ {{ formatTime(timeLeft()) }}
          </div>
        }
      </div>
    </header>

    <!-- Layout principal -->
    <div class="game-layout">

      <!-- Sidebar gauche : joueurs -->
      <aside class="players-sidebar glass">
        <h3>Joueurs</h3>
        @if (gameState()) {
          @for (p of gameState()!.participants; track p.id; let i = $index) {
            <div class="player-item" [class.active]="gameState()!.currentPlayerIndex === i">
              <div class="player-color-dot" [class]="'dot-' + p.color.toLowerCase()"></div>
              <div class="player-info" style="flex:1; min-width:0">
                <span class="player-name-sm">{{ p.username }}{{ p.isRobot ? ' 🤖' : '' }}</span>
                <span class="player-pieces-sm">{{ p.piecesLeft }} pièces</span>
              </div>
              <div class="player-score-val">{{ p.score }}</div>
            </div>
          }
        }

        @if (gameState()?.status === 'WAITING') {
          <button class="btn-primary" style="width:100%; margin-top:1rem; justify-content:center" (click)="startGame()">▶ Démarrer</button>
        }
        @if (canPlay()) {
          <button class="btn-ghost" style="width:100%; margin-top:0.5rem; justify-content:center" (click)="passTurn()">Passer le tour</button>
        }
      </aside>

      <!-- Plateau de jeu -->
      <main class="board-area">
        @if (!gameState() || gameState()!.status === 'WAITING') {
          <div class="waiting-screen glass">
            <div style="font-size:3rem">⏳</div>
            <h2>En attente des joueurs...</h2>
            <p>{{ gameState()?.participants?.length || 0 }}/4 joueurs connectés</p>
          </div>
        } @else {
          <div class="board-wrapper">
            <div class="board">
              @for (row of boardRows(); track $index; let ri = $index) {
                @for (cell of row; track $index; let ci = $index) {
                  <div
                    class="cell"
                    [class]="getCellClass(cell, ri, ci)"
                    (click)="onCellClick(ri, ci)"
                    (mouseenter)="hoverCell = [ri, ci]"
                    (mouseleave)="hoverCell = null"
                  ></div>
                }
              }
            </div>
          </div>
        }
      </main>

      <!-- Sidebar droite : pièces -->
      <aside class="pieces-sidebar glass">
        <h3>Mes pièces</h3>
        @if (myParticipant()) {
          <div class="pieces-grid">
            @for (piece of myParticipant()!.pieces; track piece.id) {
              <div
                class="piece-card"
                [class.selected]="selectedPiece()?.id === piece.id"
                (click)="selectPiece(piece)"
              >
                <div class="piece-preview">
                  <div class="piece-mini-board" [style.grid-template-columns]="getMiniGridCols(piece)">
                    @for (row of getPiecePreviewRows(piece); track $index) {
                      @for (filled of row; track $index) {
                        <div class="mini-cell" [class]="filled ? myParticipant()!.color.toLowerCase() : ''"></div>
                      }
                    }
                  </div>
                </div>
                <span class="piece-name">{{ piece.name }}</span>
              </div>
            }
          </div>

          @if (selectedPiece()) {
            <div class="piece-controls">
              <p style="font-size:0.8rem; color:#7f8c8d; font-weight:600">
                ✅ <strong>{{ selectedPiece()!.name }}</strong>
              </p>
              <div class="control-btns">
                <button class="btn-ghost" (click)="rotatePiece()">↻ Rotation</button>
                <button class="btn-ghost" (click)="flipPiece()">↔ Miroir</button>
              </div>
              <p style="font-size:0.72rem; color:#95a5a6; margin-top:0.5rem">Cliquez sur le plateau pour placer</p>
            </div>
          }
        }

        @if (gameState()?.status === 'FINISHED') {
          <div class="results glass">
            <h3>🏆 Résultats</h3>
            @for (p of sortedParticipants(); track p.id) {
              <div class="result-row">
                <span class="rank">#{{ p.classement }}</span>
                <span class="result-name">{{ p.username }}</span>
                <span class="result-score">{{ p.score }} pts</span>
              </div>
            }
          </div>
        }
      </aside>
    </div>
  </div>
  `,
  styles: [],
})
export class GameComponent implements OnInit, OnDestroy {
  gameId!: number;
  gameState = signal<GameState | null>(null);
  selectedPiece = signal<PieceInfo | null>(null);
  hoverCell: [number, number] | null = null;
  timeLeft = signal(120);
  private subs: Subscription[] = [];
  private timerInterval: any;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private socket: GameSocketService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.gameId = +this.route.snapshot.params['id'];
    const token = localStorage.getItem('blokus_token') || '';
    this.socket.connect(token);
    this.socket.joinGame(this.gameId);

    this.subs.push(
      this.socket.on<GameState>('gameState').subscribe((state) => {
        this.gameState.set(state);
        this.startTimer(state.turnStartTime);
      }),
    );
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    clearInterval(this.timerInterval);
    this.socket.disconnect();
  }

  // ─── Computed ──────────────────────────────────────────────────

  myParticipant = computed(() => {
    const state = this.gameState();
    const me = this.auth.currentUser;
    if (!state || !me) return null;
    return state.participants.find((p) => p.userId === me.id) || null;
  });

  canPlay = computed(() => {
    const state = this.gameState();
    const me = this.auth.currentUser;
    if (!state || !me) return false;
    const curr = state.participants[state.currentPlayerIndex];
    return curr?.userId === me.id && state.status === 'IN_PROGRESS';
  });

  boardRows = computed(() => this.gameState()?.board || []);

  sortedParticipants = computed(() =>
    [...(this.gameState()?.participants || [])].sort((a, b) => a.classement - b.classement),
  );

  // ─── Actions ───────────────────────────────────────────────────

  startGame() { this.socket.startGame(this.gameId); }
  passTurn()  { this.socket.passTurn(this.gameId); }

  selectPiece(piece: PieceInfo) {
    if (!this.canPlay()) return;
    if (this.selectedPiece()?.id === piece.id) { this.selectedPiece.set(null); return; }
    this.selectedPiece.set({ ...piece, blocks: piece.blocks.map((b) => [...b]) });
  }

  rotatePiece() {
    const p = this.selectedPiece();
    if (!p) return;
    const rotated = p.blocks.map(([x, y]) => [y, -x]);
    const minX = Math.min(...rotated.map(([x]) => x));
    const minY = Math.min(...rotated.map(([, y]) => y));
    this.selectedPiece.set({ ...p, blocks: rotated.map(([x, y]) => [x - minX, y - minY]) });
  }

  flipPiece() {
    const p = this.selectedPiece();
    if (!p) return;
    const flipped = p.blocks.map(([x, y]) => [-x, y]);
    const minX = Math.min(...flipped.map(([x]) => x));
    this.selectedPiece.set({ ...p, blocks: flipped.map(([x, y]) => [x - minX, y]) });
  }

  onCellClick(row: number, col: number) {
    if (!this.canPlay() || !this.selectedPiece()) return;
    const p = this.selectedPiece()!;
    this.socket.placePiece(this.gameId, p.id, row, col, p.blocks);
    this.selectedPiece.set(null);
  }

  // ─── UI helpers ─────────────────────────────────────────────────

  getCellClass(value: number, row: number, col: number): string {
    const colors = ['', 'c-blue', 'c-yellow', 'c-red', 'c-green'];
    if (value > 0) return colors[value] || '';

    const p = this.selectedPiece();
    const hover = this.hoverCell;
    if (p && hover) {
      const [hr, hc] = hover;
      for (const [bx, by] of p.blocks) {
        if (hr + bx === row && hc + by === col) return 'preview';
      }
    }
    return '';
  }

  getPiecePreviewRows(piece: PieceInfo): boolean[][] {
    if (!piece.blocks.length) return [];
    const maxX = Math.max(...piece.blocks.map(([x]) => x));
    const maxY = Math.max(...piece.blocks.map(([, y]) => y));
    const grid = Array.from({ length: maxX + 1 }, () => Array(maxY + 1).fill(false));
    piece.blocks.forEach(([x, y]) => { if (grid[x]) grid[x][y] = true; });
    return grid;
  }

  getMiniGridCols(piece: PieceInfo): string {
    if (!piece.blocks.length) return 'repeat(1, 9px)';
    const maxY = Math.max(...piece.blocks.map(([, y]) => y));
    return `repeat(${maxY + 1}, 9px)`;
  }

  formatTime(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  private startTimer(turnStartTime: number) {
    clearInterval(this.timerInterval);
    if (!turnStartTime) return;
    const update = () => {
      const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
      this.timeLeft.set(Math.max(0, 120 - elapsed));
    };
    update();
    this.timerInterval = setInterval(update, 1000);
  }
}
