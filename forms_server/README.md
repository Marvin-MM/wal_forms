# WalrusForms Backend Server

> Walrus-native, on-chain form and feedback platform — backend API server

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Interface Layer                       │
│  Elysia Routes │ WebSocket │ Inngest Handler │ Middleware│
├─────────────────────────────────────────────────────────┤
│                  Application Layer                       │
│        Use Cases (Auth, Forms, Submissions, AI)          │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                     │
│  PostgreSQL │ Walrus │ Sui │ Seal │ Anthropic │ Inngest  │
├─────────────────────────────────────────────────────────┤
│                    Domain Layer                          │
│         Entities │ Zod Schemas │ Value Objects           │
└─────────────────────────────────────────────────────────┘
```

**Lean Hexagonal Architecture** — strict layer boundaries, no cross-layer imports. Domain remains pure TypeScript with zero dependencies.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Bun |
| Framework | Elysia |
| Database | PostgreSQL 16 + Drizzle ORM |
| Blockchain | Sui (via `@mysten/sui`) |
| Storage | Walrus decentralized storage |
| Encryption | Seal threshold encryption |
| AI | Anthropic Claude |
| Background Jobs | Inngest |
| Auth | Sign in with Sui (SiWS) + JWT |
| Abuse Prevention | Cloudflare Turnstile + Rate Limiting |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0
- Docker & Docker Compose
- Sui wallet with WAL + SUI tokens (for on-chain operations)

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your actual values

# 3. Start PostgreSQL
docker compose up -d

# 4. Push database schema
bun db:push

# 5. Start development server
bun dev
```

The server starts at `http://localhost:3000`.

### Verify

```bash
curl http://localhost:3000/health
```

## API Reference

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/nonce` | No | Request authentication nonce |
| POST | `/auth/verify` | No | Verify SiWS signature, get JWT |
| POST | `/auth/refresh` | Cookie | Refresh access token |
| POST | `/auth/logout` | Cookie | Clear refresh token |

### Forms

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/forms` | JWT | Create a new form |
| GET | `/forms/:formId` | No | Get form by ID |
| GET | `/forms` | JWT | List owned forms |
| PUT | `/forms/:formId` | JWT | Update form schema |
| DELETE | `/forms/:formId` | JWT | Soft-delete form |

### Submissions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/forms/:formId/submissions` | Turnstile | Submit form data |
| GET | `/forms/:formId/submissions` | JWT | List submissions (admin) |
| GET | `/forms/:formId/submissions/:id` | JWT | Get submission metadata |
| PATCH | `/forms/:formId/submissions/:id` | JWT | Update notes/priority/reviewed |

### Admins

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/forms/:formId/admins` | JWT | Add admin wallet |
| DELETE | `/forms/:formId/admins/:wallet` | JWT | Remove admin |
| GET | `/forms/:formId/admins` | JWT | List admins |

### AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/generate-schema` | JWT | AI form generation |
| POST | `/forms/:formId/analysis` | JWT | Trigger feedback analysis |
| GET | `/forms/:formId/analysis` | JWT | Get analysis results |

### Exports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/forms/:formId/export` | JWT | Trigger CSV export |
| GET | `/forms/:formId/export` | JWT | Get export status |

### Uploads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/uploads/session` | JWT | Create upload session |
| POST | `/uploads/confirm` | JWT | Confirm upload |

### WebSocket

```
ws://localhost:3000/ws/dashboard/:formId
```

Send JWT token as first message: `{"token": "your-jwt-token"}`

Events: `new_submission`, `submission_updated`, `analysis_complete`, `export_complete`

## Scripts

```bash
bun dev          # Start with hot reload
bun start        # Production start
bun build        # Build for production
bun typecheck    # TypeScript type check
bun test         # Run all tests
bun test:unit    # Run unit tests only
bun db:generate  # Generate migration files
bun db:migrate   # Run migrations
bun db:push      # Push schema directly
bun db:studio    # Open Drizzle Studio
```

## Environment Variables

See [`.env.example`](.env.example) for the full list with descriptions.

## Deployment

### Docker

```bash
docker build -t walrus-forms-server .
docker run -p 3000:3000 --env-file .env walrus-forms-server
```

### Railway / Fly.io

1. Push to GitHub
2. Connect repository to Railway/Fly.io
3. Set environment variables
4. Deploy — the Dockerfile handles the build

## License

MIT
