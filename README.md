# 🎮 Blokus — NestJS + Angular

Migration complète du jeu **Blokus** (Spring Boot + Thymeleaf) vers une architecture moderne **NestJS + Angular**.

![NestJS](https://img.shields.io/badge/NestJS-10.x-red) ![Angular](https://img.shields.io/badge/Angular-17.x-red) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![MySQL](https://img.shields.io/badge/MySQL-8.0-blue) ![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black)

---

## 📁 Structure du projet

```
blokus-nestjs-angular/
├── backend/          ← NestJS API (port 3000)
└── frontend/         ← Angular App (port 4200)
```

---

## 🚀 Démarrage rapide

### Avec Docker Compose

```bash
docker-compose up -d
```

Ouvre ton navigateur : http://localhost:4200

### Sans Docker

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (autre terminal)
cd frontend
npm install
npm start
```

---

## 🛠️ Technologies

### Backend (NestJS)
- **NestJS 10** — Framework principal
- **Socket.io** — WebSockets temps réel (remplace Spring WebSocket + STOMP)
- **Passport.js + JWT** — Authentification (remplace Spring Security)
- **TypeORM + MySQL** — Persistance (remplace Spring Data JPA)
- **class-validator** — Validation des DTOs

### Frontend (Angular)
- **Angular 17** — Framework SPA
- **Socket.io-client** — Communication temps réel
- **Angular Material** — Composants UI
- **RxJS** — Gestion réactive des événements

---

## 🎮 Fonctionnalités

- ✅ Multijoueur en temps réel (2–4 joueurs)
- ✅ Intelligence artificielle (remplace les bots Java)
- ✅ Minuteur par tour (2 minutes)
- ✅ Reconnexion → remplacement par bot
- ✅ Calcul de score automatique
- ✅ Statistiques utilisateur
- ✅ Authentification JWT

---

## 📊 Correspondance Spring Boot → NestJS

| Spring Boot | NestJS |
|---|---|
| `@RestController` | `@Controller` + `@Get/@Post` |
| `@Service` | `@Injectable()` |
| `@Repository` (JPA) | `@InjectRepository()` (TypeORM) |
| `@MessageMapping` | `@SubscribeMessage()` (Gateway) |
| Spring Security | PassportJS + JwtAuthGuard |
| Thymeleaf | Composants Angular |
| `SimpMessagingTemplate` | `server.to(room).emit()` |

---

## 🔌 API WebSocket Events

| Événement (client → serveur) | Description |
|---|---|
| `joinGame` | Rejoindre une salle de jeu |
| `placePiece` | Placer une pièce sur le plateau |
| `passTurn` | Passer son tour |
| `leaveGame` | Quitter la partie |

| Événement (serveur → client) | Description |
|---|---|
| `gameState` | État complet du jeu |
| `boardUpdated` | Mise à jour du plateau |
| `turnChanged` | Changement de joueur |
| `gameOver` | Fin de partie + scores |
| `timerUpdate` | Mise à jour du minuteur |
