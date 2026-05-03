import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

const API = 'http://localhost:3000/api';

interface GameLobby {
  id: number;
  status: string;
  maxPlayers: number;
  playersCount: number;
  players: { username: string; color: string }[];
  createdAt: string;
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="lobby-page">
    <header class="lobby-header">
      <div class="header-brand">
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#4488ff"/>
          <rect x="22" y="4" width="16" height="16" rx="3" fill="#ffd166"/>
          <rect x="4" y="22" width="16" height="16" rx="3" fill="#ef4444"/>
          <rect x="22" y="22" width="16" height="16" rx="3" fill="#22c55e"/>
        </svg>
        <span class="brand-name">Blokus</span>
      </div>
      <div class="header-user">
        <span class="user-name">👤 {{ user?.username }}</span>
        <button class="btn btn-ghost" (click)="auth.logout()">Déconnexion</button>
      </div>
    </header>

    <main class="lobby-main">
      <div class="lobby-actions">
        <h2>Parties disponibles</h2>
        <button class="btn btn-primary" (click)="createGame()">
          <span>+</span> Nouvelle partie
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des parties...</p>
        </div>
      } @else if (games().length === 0) {
        <div class="empty-state">
          <div style="font-size:3rem">🎮</div>
          <h3>Aucune partie en attente</h3>
          <p>Crée une nouvelle partie pour inviter des amis !</p>
          <button class="btn btn-primary" (click)="createGame()">Créer une partie</button>
        </div>
      } @else {
        <div class="games-grid">
          @for (game of games(); track game.id) {
            <div class="game-card">
              <div class="game-card-header">
                <span class="game-id">#{{ game.id }}</span>
                <span class="badge badge-green">En attente</span>
              </div>
              <div class="players-list">
                @for (p of game.players; track p.username) {
                  <span class="player-chip" [class]="'color-' + p.color.toLowerCase()">
                    {{ p.username }}
                  </span>
                }
                @for (empty of getEmptySlots(game); track empty) {
                  <span class="player-chip empty">Libre...</span>
                }
              </div>
              <div class="game-card-footer">
                <span class="players-count">{{ game.playersCount }}/{{ game.maxPlayers }} joueurs</span>
                <button class="btn btn-primary" (click)="joinGame(game.id)">Rejoindre</button>
              </div>
            </div>
          }
        </div>
      }
    </main>
  </div>
  `,
  styles: [`
    .lobby-page { min-height: 100vh; display: flex; flex-direction: column; }
    .lobby-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 2rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }
    .header-brand { display: flex; align-items: center; gap: 10px; }
    .brand-name { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; }
    .header-user { display: flex; align-items: center; gap: 12px; }
    .user-name { font-size: 0.875rem; color: var(--color-text-muted); }
    .lobby-main { flex: 1; padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; }
    .lobby-actions {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem;
    }
    .lobby-actions h2 { font-family: var(--font-display); font-size: 1.4rem; }
    .games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .game-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex; flex-direction: column; gap: 1rem;
      transition: border-color 0.18s;
    }
    .game-card:hover { border-color: var(--color-primary); }
    .game-card-header { display: flex; justify-content: space-between; align-items: center; }
    .game-id { font-weight: 700; color: var(--color-text-muted); font-size: 0.875rem; }
    .players-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .player-chip {
      padding: 4px 10px; border-radius: 999px;
      font-size: 0.8rem; font-weight: 600;
    }
    .color-blue   { background: rgba(68,136,255,0.15); color: var(--color-blue); }
    .color-yellow { background: rgba(255,209,102,0.15); color: var(--color-yellow); }
    .color-red    { background: rgba(239,68,68,0.15); color: var(--color-red); }
    .color-green  { background: rgba(34,197,94,0.15); color: var(--color-green); }
    .player-chip.empty { background: var(--color-surface-2); color: var(--color-text-muted); }
    .game-card-footer { display: flex; justify-content: space-between; align-items: center; }
    .players-count { font-size: 0.8rem; color: var(--color-text-muted); }
    .empty-state {
      text-align: center; padding: 4rem 2rem;
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
    }
    .empty-state h3 { font-size: 1.2rem; }
    .empty-state p { color: var(--color-text-muted); }
    .loading-state { text-align: center; padding: 4rem; color: var(--color-text-muted); }
    .spinner {
      width: 40px; height: 40px; border-radius: 50%;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class LobbyComponent implements OnInit {
  games = signal<GameLobby[]>([]);
  loading = signal(true);
  user = this.auth.currentUser;

  constructor(
    private http: HttpClient,
    private router: Router,
    public auth: AuthService,
  ) {}

  ngOnInit() { this.loadGames(); }

  loadGames() {
    this.loading.set(true);
    this.http.get<GameLobby[]>(`${API}/games/waiting`).subscribe({
      next: (g) => { this.games.set(g); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createGame() {
    this.http.post<any>(`${API}/games/create`, {}).subscribe({
      next: (g) => this.router.navigate(['/game', g.id]),
      error: (e) => alert(e.error?.message || 'Erreur'),
    });
  }

  joinGame(id: number) {
    this.http.post<any>(`${API}/games/${id}/join`, {}).subscribe({
      next: () => this.router.navigate(['/game', id]),
      error: (e) => this.router.navigate(['/game', id]),
    });
  }

  getEmptySlots(game: GameLobby): number[] {
    return Array(game.maxPlayers - game.playersCount).fill(0);
  }
}
