# VIT Chennai Event Portal — Next.js (App Router) on Vercel

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default admin (after first `/api/health` or login seed): `admin` / `admin123`

## Production (Vercel)

1. Set environment variables:
   - `MONGODB_URI` — **required** on Vercel (JSON file DB is not durable on serverless)
   - `JWT_SECRET` — strong secret
2. Deploy the repo root (this Next.js app).
3. Hit `/api/health` once to seed admin + clubs if the DB is empty.

## Legacy folders

`backend/` and `frontend/` are the previous Express + Vite apps, kept for reference. The deployable app lives at the repo root (`app/`, `lib/`, `components/`).
