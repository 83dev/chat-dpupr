# Chat DPUPR Banten

<div align="center">

![Chat DPUPR](apps/desktop/resources/icon.png)

**Sistem Chat Internal untuk Dinas Pekerjaan Umum dan Penataan Ruang Provinsi Banten**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)

</div>

---

## 📋 Deskripsi

Chat DPUPR adalah aplikasi chat internal real-time yang dirancang khusus untuk kebutuhan komunikasi internal Dinas Pekerjaan Umum dan Penataan Ruang Provinsi Banten. Aplikasi ini mendukung:

- 💬 **Chat Real-time** - Komunikasi instant antar pegawai
- 👥 **Group Chat** - Diskusi per bidang/tim
- 📎 **File Sharing** - Kirim dokumen, gambar, dan file lainnya
- 🔔 **Notifikasi** - Pemberitahuan pesan baru
- 🔐 **SSO Integration** - Login menggunakan SSO DPUPR
- 🖥️ **Desktop App** - Aplikasi Windows dengan fitur background running
- 📱 **Responsive Web** - Akses dari berbagai perangkat

---

## 🏗️ Arsitektur

```
sistem-chat-internal-dpupr-banten/
├── apps/
│   ├── backend/          # Express.js + Socket.IO + Prisma
│   ├── web/              # Next.js 16 (React 19)
│   └── desktop/          # Electron Desktop App
├── docker-compose.yml    # Docker orchestration
└── .env.production       # Production environment variables
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TailwindCSS, Zustand |
| **Backend** | Express.js, Socket.IO, Prisma ORM |
| **Desktop** | Electron 28 |
| **Database** | PostgreSQL 15 |
| **Cache/PubSub** | Redis 7 |
| **Auth** | JWT, SSO DPUPR (OpenID Connect) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm / npm / yarn

### Development Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/your-org/sistem-chat-internal-dpupr-banten.git
   cd sistem-chat-internal-dpupr-banten
   ```

2. **Setup Backend**
   ```bash
   cd apps/backend
   npm install
   cp .env.example .env    # Configure environment variables
   npm run db:generate     # Generate Prisma client
   npm run db:push         # Push schema to database
   npm run db:seed         # Seed initial data
   npm run dev             # Start development server (port 3001)
   ```

3. **Setup Web Frontend**
   ```bash
   cd apps/web
   npm install
   npm run dev             # Start development server (port 3000)
   ```

4. **Setup Desktop App (Optional)**
   ```bash
   cd apps/desktop
   npm install
   npm start               # Start Electron app
   ```

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/dpupr_chat

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# SSO Configuration
SSO_ISSUER_URL=https://sso.dpupr.bantenprov.go.id
SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
SSO_REDIRECT_URI=http://localhost:3001/auth/callback
SSO_SCOPES=openid profile email
```

#### Web Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
```

---

## 🐳 Docker Deployment

### Using Docker Compose

1. **Configure environment**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your production values
   ```

2. **Build and run**
   ```bash
   docker-compose --env-file .env.production up -d --build
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   docker-compose exec backend npx prisma db seed
   ```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **web** | 3002 | Next.js Frontend |
| **backend** | 3001 | Express.js API + Socket.IO |
| **postgres** | 5432 | PostgreSQL Database |
| **redis** | 6379 | Redis Cache |

---

## 🖥️ Desktop App

Aplikasi desktop mendukung fitur-fitur seperti Chat Desktop:

### Fitur
- ✅ **System Tray** - Berjalan di background
- ✅ **Minimize to Tray** - Close = minimize (tidak quit)
- ✅ **Native Notifications** - Windows notifications
- ✅ **Auto-Launch** - Start saat Windows boot
- ✅ **Badge Count** - Jumlah unread di taskbar
- ✅ **Single Instance** - Hanya 1 instance berjalan

### Build Desktop App

```bash
cd apps/desktop
npm install
npm run build
```

Output: `apps/desktop/release/win-unpacked/Chat DPUPR.exe`

---

## 📁 Project Structure

### Backend (`apps/backend/`)
```
src/
├── config/           # Database & Redis configuration
├── middleware/       # Auth, error handling
├── routes/           # API routes
├── socket/           # Socket.IO handlers
├── types/            # TypeScript types
└── index.ts          # Entry point
```

### Web Frontend (`apps/web/`)
```
src/
├── app/              # Next.js App Router
│   ├── (dashboard)/  # Protected routes
│   └── auth/         # Authentication pages
├── components/       # React components
├── lib/              # Utilities, socket, API
└── stores/           # Zustand stores
```

### Desktop (`apps/desktop/`)
```
src/
├── main.ts           # Electron main process
└── preload.ts        # IPC bridge
resources/
└── icon.png          # App icon
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with credentials |
| GET | `/auth/sso/callback` | SSO callback |
| GET | `/auth/me` | Get current user |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/rooms` | List chat rooms |
| GET | `/api/chat/rooms/:id` | Get room details |
| GET | `/api/chat/rooms/:id/messages` | Get messages |
| POST | `/api/chat/upload` | Upload file |

### Socket.IO Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `message:new` | Server → Client | New message received |
| `message:send` | Client → Server | Send message |
| `message:delete` | Client → Server | Delete message |
| `user:typing` | Bidirectional | Typing indicator |
| `users:online` | Server → Client | Online users list |

---

## 🧪 Development

### Available Scripts

#### Backend
```bash
npm run dev           # Development with hot reload
npm run build         # Build for production
npm run start         # Start production server
npm run db:studio     # Open Prisma Studio
```

#### Web
```bash
npm run dev           # Development server
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
```

#### Desktop
```bash
npm start             # Development
npm run build         # Build executable
```

---

## 📄 License

This project is proprietary software for internal use by DPUPR Banten.

---

## 👥 Team

**IT DPUPR Banten**

Dinas Pekerjaan Umum dan Penataan Ruang  
Provinsi Banten

---

<div align="center">
  <sub>Built with ❤️ by IT DPUPR Banten</sub>
</div>
