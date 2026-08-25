# 🍰 Cake Party App

A fun, collaborative PWA for your cake decorating party! 🎉

## Features
- Fun pre-party questionnaire (straw holes, hotdogs, cake style, etc.)
- Take photos of your cake in progress
- Photo gallery to see everyone's creations
- Real-time syncing with Supabase
- Works on all phones - no App Store needed!

## Quick Start

### 1. Set up Supabase Database

- Go to your Supabase dashboard
- Go to **SQL Editor**
- Click **+ New Query**
- Copy/paste the contents of `supabase-setup.sql`
- Click **Run**

### 2. Install & Run Locally

```bash
npm install
npm run dev
```

Opens at http://localhost:3000

### 3. Deploy to Vercel

1. Push to GitHub
2. Go to vercel.com
3. Import your GitHub repo
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy!

### 4. Share with Friends

Send them the Vercel URL. They can tap "Add to Home Screen" and it works like an app!

## Technologies

- React 18
- Vite
- Supabase (database + storage)
- Zustand (state management)
- PWA (works offline, installable)

## Have fun! 🍰✨
