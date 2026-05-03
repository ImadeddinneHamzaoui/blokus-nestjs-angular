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
    <div class="auth-container glass">
      <div class="auth-logo">
        <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
          <rect x="4"  y="4"  width="16" height="16" rx="3" fill="#4285F4"/>
          <rect x="22" y="4"  width="16" height="16" rx="3" fill="#e6c800"/>
          <rect x="4"  y="22" width="16" height="16" rx="3" fill="#EA4335"/>
          <rect x="22" y="22" width="16" height="16" rx="3" fill="#2ecc71"/>
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

        <button type="submit" class="btn-primary" style="width:100%; justify-content:center; margin-top:0.5rem">
          {{ mode() === 'login' ? 'Se connecter' : 'Créer un compte' }}
        </button>
      </form>
    </div>
  </div>
  `,
  styles: [],
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
