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
        <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
          <rect x="4"  y="4"  width="16" height="16" rx="3" fill="#4285F4"/>
          <rect x="22" y="4"  width="16" height="16" rx="3" fill="#e6c800"/>
          <rect x="4"  y="22" width="16" height="16" rx="3" fill="#EA4335"/>
          <rect x="22" y="22" width="16" height="16" rx="3" fill="#2ecc71"/>
        </svg>
        <span class="brand-name">BLOKUS</span>
      </div>
      <div class="header-user">
        <span class="user-name">👤 {{ user?.username }}</span>
        <button class="btn-ghost" (click)="auth.logout()">Déconnexion</button>
      </div>
    </header>

    <main class="lobby-main">
      <div class="lobby-actions">
        <h2>Parties disponibles</h2>
        <button class="btn-primary" (click)="createGame()">
          ＋ Nouvelle partie
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des parties...</p>
        </div>
      } @else if (games().length === 0) {
        <div class="empty-state glass">
          <div style="font-size:3rem">🎮</div>
          <h3>Aucune partie en attente</h3>
          <p>Crée une nouvelle partie pour inviter des amis !</p>
          <button class="btn-primary" (click)="createGame()">Créer une partie</button>
        </div>
      } @else {
        <div class="games-grid">
          @for (game of games(); track game.id) {
            <div class="game-card">
              <div class="game-card-header">
                <span class="game-id">Partie #{{ game.id }}</span>
                <span class="badge-green">En attente</span>
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
                <button class="btn-primary" (click)="joinGame(game.id)">Rejoindre</button>
              </div>
            </div>
          }
        </div>
      }
    </main>
  </div>
  `,
  styles: [],
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
      error: () => this.router.navigate(['/game', id]),
    });
  }

  getEmptySlots(game: GameLobby): number[] {
    return Array(game.maxPlayers - game.playersCount).fill(0);
  }
}
