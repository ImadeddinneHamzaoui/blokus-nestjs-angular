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
    <header class="game-header">
      <button class="btn btn-ghost" (click)="router.navigate(['/lobby'])">← Lobby</button>
      <div class="game-title">
        <span>Partie #{{ gameId }}</span>
        @if (gameState()) {
          <span class="move-count">Coup {{ gameState()!.moveNumber }}</span>
        }
      </div>
      <div class="header-timer">
        @if (timeLeft() > 0) {
          <span [class.urgent]="timeLeft() < 30">⏱ {{ formatTime(timeLeft()) }}</span>
        }
      </div>
    </header>

    <div class="game-layout">
      <!-- Sidebar gauche : joueurs -->
      <aside class="players-sidebar">
        <h3>Joueurs</h3>
        @if (gameState()) {
          @for (p of gameState()!.participants; track p.id; let i = $index) {
            <div class="player-item" [class.active]="gameState()!.currentPlayerIndex === i" [class.finished]="gameState()!.status === 'FINISHED'">
              <div class="player-color-dot" [class]="'dot-' + p.color.toLowerCase()"></div>
              <div class="player-info">
                <span class="player-name">{{ p.username }}{{ p.isRobot ? ' 🤖' : '' }}</span>
                <span class="player-pieces">{{ p.piecesLeft }} pièces restantes</span>
              </div>
              <div class="player-score">{{ p.score }} pts</div>
            </div>
          }
        }

        @if (gameState()?.status === 'WAITING') {
          <button class="btn btn-primary" style="width:100%; margin-top:1rem" (click)="startGame()">▶ Démarrer</button>
        }
        @if (canPlay()) {
          <button class="btn btn-ghost" style="width:100%; margin-top:0.5rem" (click)="passTurn()">Passer mon tour</button>
        }
      </aside>

      <!-- Plateau de jeu -->
      <main class="board-area">
        @if (!gameState() || gameState()!.status === 'WAITING') {
          <div class="waiting-screen">
            <div style="font-size:3rem">⏳</div>
            <h2>En attente des joueurs...</h2>
            <p>{{ gameState()?.participants?.length || 0 }}/4 joueurs connectés</p>
          </div>
        } @else {
          <div class="board-wrapper">
            <div class="board" [style.grid-template-columns]="'repeat(20, 1fr)'">
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
      <aside class="pieces-sidebar">
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
                  <div class="piece-mini-board">
                    @for (row of getPiecePreviewRows(piece); track $index; let ri = $index) {
                      @for (filled of row; track $index) {
                        <div class="mini-cell" [class.filled]="filled" [class]="filled ? 'filled ' + myParticipant()!.color.toLowerCase() : ''"></div>
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
              <p style="font-size:0.8rem; color:var(--color-text-muted)">Pièce : <strong>{{ selectedPiece()!.name }}</strong></p>
              <div class="control-btns">
                <button class="btn btn-ghost" (click)="rotatePiece()">↻ Rotation</button>
                <button class="btn btn-ghost" (click)="flipPiece()">↔ Miroir</button>
              </div>
              <p style="font-size:0.75rem; color:var(--color-text-muted); margin-top:0.5rem">Cliquez sur le plateau pour placer</p>
            </div>
          }
        }

        @if (gameState()?.status === 'FINISHED') {
          <div class="results">
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
  styles: [`
    .game-page { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    .game-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1.5rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      z-index: 10;
    }
    .game-title { font-family: var(--font-display); font-weight: 700; }
    .move-count { margin-left: 1rem; font-size: 0.8rem; color: var(--color-text-muted); font-family: var(--font-body); font-weight: 400; }
    .header-timer { font-size: 0.9rem; font-weight: 600; }
    .header-timer .urgent { color: var(--color-red); animation: pulse 1s ease infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

    .game-layout { flex: 1; display: grid; grid-template-columns: 220px 1fr 260px; overflow: hidden; }

    .players-sidebar, .pieces-sidebar {
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      padding: 1rem;
      overflow-y: auto;
    }
    .pieces-sidebar { border-right: none; border-left: 1px solid var(--color-border); }
    .players-sidebar h3, .pieces-sidebar h3 {
      font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--color-text-muted); margin-bottom: 0.75rem;
    }

    .player-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px; border-radius: var(--radius-md);
      margin-bottom: 4px; transition: background 0.18s;
    }
    .player-item.active { background: var(--color-surface-2); }
    .player-color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dot-blue   { background: var(--color-blue); }
    .dot-yellow { background: var(--color-yellow); }
    .dot-red    { background: var(--color-red); }
    .dot-green  { background: var(--color-green); }
    .player-info { flex: 1; }
    .player-name { display: block; font-size: 0.875rem; font-weight: 600; }
    .player-pieces { font-size: 0.75rem; color: var(--color-text-muted); }
    .player-score { font-size: 0.875rem; font-weight: 700; color: var(--color-text-muted); }

    .board-area {
      display: flex; align-items: center; justify-content: center;
      background: var(--color-bg); padding: 1rem; overflow: hidden;
    }
    .board-wrapper { width: 100%; max-width: min(70vh, 100%); aspect-ratio: 1; }
    .board {
      display: grid;
      width: 100%; height: 100%;
      gap: 1px; background: var(--color-border);
      border: 1px solid var(--color-border);
      border-radius: 4px; overflow: hidden;
    }
    .cell {
      background: #1a1a26;
      cursor: pointer;
      transition: filter 0.1s;
    }
    .cell:hover { filter: brightness(1.4); }
    .cell.c-blue   { background: var(--color-blue); }
    .cell.c-yellow { background: var(--color-yellow); }
    .cell.c-red    { background: var(--color-red); }
    .cell.c-green  { background: var(--color-green); }
    .cell.preview  { opacity: 0.5; }
    .cell.valid-move { background: #2a2a40; }

    .pieces-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .piece-card {
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 8px; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      transition: all 0.18s;
    }
    .piece-card:hover, .piece-card.selected {
      border-color: var(--color-primary);
      background: rgba(108,99,255,0.1);
    }
    .piece-mini-board {
      display: grid;
      gap: 1px;
    }
    .mini-cell { width: 8px; height: 8px; background: var(--color-border); border-radius: 1px; }
    .mini-cell.blue   { background: var(--color-blue); }
    .mini-cell.yellow { background: var(--color-yellow); }
    .mini-cell.red    { background: var(--color-red); }
    .mini-cell.green  { background: var(--color-green); }
    .piece-name { font-size: 0.65rem; color: var(--color-text-muted); font-weight: 600; }

    .piece-controls {
      margin-top: 0.75rem; padding: 0.75rem;
      background: var(--color-surface-2);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-primary);
    }
    .control-btns { display: flex; gap: 6px; margin-top: 0.5rem; }
    .control-btns .btn { flex: 1; justify-content: center; font-size: 0.75rem; padding: 6px 8px; }

    .waiting-screen {
      text-align: center; color: var(--color-text-muted);
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
    }
    .waiting-screen h2 { color: var(--color-text); font-family: var(--font-display); }

    .results {
      margin-top: 1rem; padding: 1rem;
      background: var(--color-surface-2);
      border-radius: var(--radius-md);
    }
    .result-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid var(--color-border);
    }
    .rank { font-weight: 700; width: 24px; color: var(--color-yellow); }
    .result-name { flex: 1; font-size: 0.875rem; }
    .result-score { font-weight: 700; color: var(--color-primary); }
  `],
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
  passTurn() { this.socket.passTurn(this.gameId); }

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
    if (value > 0) return colors[value];

    // Prévisualisation de la pièce sélectionnée
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
    const maxX = Math.max(...piece.blocks.map(([x]) => x));
    const maxY = Math.max(...piece.blocks.map(([, y]) => y));
    const grid = Array.from({ length: maxX + 1 }, () => Array(maxY + 1).fill(false));
    piece.blocks.forEach(([x, y]) => { if (grid[x]) grid[x][y] = true; });
    return grid;
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
