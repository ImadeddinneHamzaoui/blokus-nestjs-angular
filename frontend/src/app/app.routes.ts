import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'lobby', pathMatch: 'full' },
  {
    path: 'auth',
    loadComponent: () => import('./auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'lobby',
    canActivate: [authGuard],
    loadComponent: () => import('./lobby/lobby.component').then((m) => m.LobbyComponent),
  },
  {
    path: 'game/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./game/game.component').then((m) => m.GameComponent),
  },
  { path: '**', redirectTo: 'lobby' },
];
