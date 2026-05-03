import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class GameSocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;
    this.socket = io('http://localhost:3000/game', {
      auth: { token },
      transports: ['websocket'],
    });
    this.socket.on('connect', () => console.log('🔌 Socket connected'));
    this.socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on<T>(event: string): Observable<T> {
    return new Observable((observer) => {
      this.socket?.on(event, (data: T) => observer.next(data));
      return () => this.socket?.off(event);
    });
  }

  joinGame(gameId: number) { this.emit('joinGame', { gameId }); }
  startGame(gameId: number) { this.emit('startGame', { gameId }); }
  passTurn(gameId: number) { this.emit('passTurn', { gameId }); }
  placePiece(gameId: number, pieceId: number, x: number, y: number, blocks: number[][]) {
    this.emit('placePiece', { gameId, pieceId, x, y, blocks });
  }
}
