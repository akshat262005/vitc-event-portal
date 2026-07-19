# VIT Chennai Event Portal — Next.js (App Router)

## Quick start

1. Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_jwt_signing_secret
   ```

2. Run the application:
   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

4. To seed default data (Admin account + 144 Clubs and Chapters), navigate to:
   [http://localhost:3000/api/health](http://localhost:3000/api/health)

   Default admin credentials seeded:
   - **Username**: `admin`
   - **Password**: `admin123`

## Production (Vercel)

1. Set environment variables:
   - `MONGODB_URI` — **required** (e.g. MongoDB Atlas connection URI)
   - `JWT_SECRET` — strong secret
2. Deploy the repository root (the Next.js app).
3. Hit `/api/health` once to seed the admin account and clubs if the database is empty.

