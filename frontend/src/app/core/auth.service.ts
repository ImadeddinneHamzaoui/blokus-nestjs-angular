import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

const API = 'http://localhost:3000/api';

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  totalGames: number;
  totalWins: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<CurrentUser | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('blokus_user');
    if (stored) this.userSubject.next(JSON.parse(stored));
  }

  register(username: string, email: string, password: string) {
    return this.http.post<any>(`${API}/auth/register`, { username, email, password }).pipe(
      tap((res) => this.storeSession(res)),
    );
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${API}/auth/login`, { username, password }).pipe(
      tap((res) => this.storeSession(res)),
    );
  }

  logout() {
    localStorage.removeItem('blokus_token');
    localStorage.removeItem('blokus_user');
    this.userSubject.next(null);
    this.router.navigate(['/auth']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('blokus_token');
  }

  get currentUser(): CurrentUser | null {
    return this.userSubject.value;
  }

  private storeSession(res: any) {
    localStorage.setItem('blokus_token', res.access_token);
    localStorage.setItem('blokus_user', JSON.stringify(res.user));
    this.userSubject.next(res.user);
  }
}
