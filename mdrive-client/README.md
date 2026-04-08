# m-drive

A lightweight cloud file manager for teams. Upload, download, and manage files across PCs with role-based access control.

## Architecture

```
mdrive-client/     → Tauri 2 desktop app (React + Rust)
mdrive-api/        → Fastify backend (Node.js + TypeScript)
packages/shared/   → Shared TypeScript types
```

**Storage:** Cloudflare R2 (file blobs) + MongoDB Atlas (metadata)

## Prerequisites

- Node.js 18+
- Rust + Cargo (with MSVC build tools on Windows)
- Cloudflare R2 bucket + API keys
- MongoDB Atlas cluster (free tier works)

## Setup

### 1. Backend (`mdrive-api`)

```bash
cd mdrive-api
npm install
cp .env.example .env   # Fill in your credentials
npm run dev             # Starts on http://localhost:3001
```

**Required `.env` variables:**
| Variable | Description |
|---|---|
| `JWT_SECRET` | Random 64-char string for signing tokens |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret key |
| `R2_BUCKET_NAME` | R2 bucket name (e.g., `mdrive`) |

### 2. Desktop Client (`mdrive-client`)

```bash
cd mdrive-client
npm install
npm run tauri dev       # Starts dev mode with hot reload
```

### 3. First Run

1. Start the backend (`npm run dev` in `mdrive-api`)
2. Start the client (`npm run tauri dev` in `mdrive-client`)
3. Click "Set up admin account" on the login page
4. Enter your API URL (default: `http://localhost:3001`)
5. Create your admin account — the first registered user automatically becomes admin

## User Roles

| Role | Can Do |
|---|---|
| **Admin** | Everything: create users, folders, manage permissions, upload/download |
| **Editor** | Upload, download, delete files in assigned folders |
| **Viewer** | Download files from assigned folders |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Admin* | Create user (*first user is open) |
| POST | `/auth/login` | — | Login |
| POST | `/auth/refresh` | — | Refresh tokens |
| GET | `/auth/me` | ✓ | Current user info |
| GET | `/auth/users` | Admin | List all users |
| DELETE | `/auth/users/:id` | Admin | Delete user |
| POST | `/folders` | Editor+ | Create folder |
| GET | `/folders` | ✓ | List accessible folders |
| GET | `/folders/:id` | ✓ | Get folder |
| PUT | `/folders/:id` | Editor+ | Update folder |
| PUT | `/folders/:id/permissions` | Admin | Set folder permissions |
| DELETE | `/folders/:id` | Admin | Delete folder |
| POST | `/files/upload-url` | Editor+ | Get presigned upload URL |
| POST | `/files/confirm-upload` | Editor+ | Confirm upload completed |
| POST | `/files/download-url` | ✓ | Get presigned download URL |
| GET | `/files/folder/:folderId` | ✓ | List files in folder |
| DELETE | `/files/:id` | Editor+ | Delete file |
| GET | `/activity/:folderId` | ✓ | Folder activity log |
| GET | `/activity` | ✓ | All activity (admin sees all) |
| GET | `/health` | — | Health check |

## Deploying the Backend to Vercel

```bash
cd mdrive-api
npx vercel              # Follow prompts
```

Set environment variables in the Vercel dashboard. The `vercel.json` is already configured.

## Tech Stack

- **Client:** Tauri 2, React 19, TypeScript, Tailwind CSS v4, Rust
- **Backend:** Fastify 5, MongoDB (native driver), AWS SDK v3 (R2)
- **Storage:** Cloudflare R2 (S3-compatible)
- **Auth:** JWT (access + refresh tokens), bcrypt

## Future Roadmap

- [ ] Automatic file watching and sync
- [ ] Bidirectional sync across PCs
- [ ] Conflict resolution
- [ ] File version history UI
- [ ] Drag-and-drop upload
- [ ] System tray integration
