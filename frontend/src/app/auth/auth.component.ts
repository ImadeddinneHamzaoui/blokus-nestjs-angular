import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page-center">
    <div class="auth-container">
      <div class="auth-logo">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#4488ff"/>
          <rect x="22" y="4" width="16" height="16" rx="3" fill="#ffd166"/>
          <rect x="4" y="22" width="16" height="16" rx="3" fill="#ef4444"/>
          <rect x="22" y="22" width="16" height="16" rx="3" fill="#22c55e"/>
        </svg>
        <h1>Blokus</h1>
        <p>Le jeu de stratégie en ligne</p>
      </div>

      <div class="tabs">
        <button [class.active]="mode() === 'login'" (click)="mode.set('login')">Connexion</button>
        <button [class.active]="mode() === 'register'" (click)="mode.set('register')">Inscription</button>
      </div>

      <form (ngSubmit)="submit()">
        @if (mode() === 'register') {
          <div class="form-field">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" placeholder="vous@exemple.com" required />
          </div>
        }
        <div class="form-field">
          <label>Nom d'utilisateur</label>
          <input type="text" [(ngModel)]="username" name="username" placeholder="monpseudo" required />
        </div>
        <div class="form-field">
          <label>Mot de passe</label>
          <input type="password" [(ngModel)]="password" name="password" placeholder="••••••" required />
        </div>

        @if (error()) {
          <div class="error-msg">{{ error() }}</div>
        }

        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center">
          {{ mode() === 'login' ? 'Se connecter' : 'Créer un compte' }}
        </button>
      </form>
    </div>
  </div>
  `,
  styles: [`
    .auth-container {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2.5rem;
      width: 100%; max-width: 420px;
    }
    .auth-logo { text-align: center; margin-bottom: 2rem; }
    .auth-logo svg { margin: 0 auto 12px; display: block; }
    .auth-logo h1 { font-family: var(--font-display); font-size: 2rem; margin-bottom: 4px; }
    .auth-logo p { color: var(--color-text-muted); font-size: 0.875rem; }
    .tabs {
      display: flex; background: var(--color-surface-2);
      border-radius: var(--radius-md); padding: 4px;
      margin-bottom: 1.5rem;
    }
    .tabs button {
      flex: 1; padding: 8px; border: none; background: transparent;
      color: var(--color-text-muted); border-radius: 8px;
      cursor: pointer; font-size: 0.875rem; font-weight: 500;
      transition: all 0.18s;
    }
    .tabs button.active { background: var(--color-primary); color: white; }
    .error-msg {
      background: rgba(239,68,68,0.1); color: var(--color-red);
      border-radius: var(--radius-sm); padding: 10px 14px;
      font-size: 0.875rem; margin-bottom: 1rem;
    }
  `],
})
export class AuthComponent {
  mode = signal<'login' | 'register'>('login');
  username = ''; email = ''; password = '';
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.error.set('');
    const obs = this.mode() === 'login'
      ? this.auth.login(this.username, this.password)
      : this.auth.register(this.username, this.email, this.password);

    obs.subscribe({
      next: () => this.router.navigate(['/lobby']),
      error: (e) => this.error.set(e.error?.message || 'Une erreur est survenue'),
    });
  }
}
