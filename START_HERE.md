# Cake Party — v2

Three things were broken. All three are fixed here.

---

## 1. Run the database script (2 min) — DO THIS FIRST

Your answers were never coming back because the old build invented a brand new
guest ID on every page load. That's fixed, but the tables need to match.

1. Supabase → **SQL Editor** → **New query**
2. Paste all of `supabase-setup.sql`
3. **Run**

This drops the old tables and rebuilds them, plus the photo bucket and the
permissions that let writes actually land.

---

## 2. Get an Anthropic API key (for ideas + roasts)

1. Go to **console.anthropic.com** → sign up
2. **API Keys** → **Create key** → copy it
3. Add a little credit (a party's worth of use is cents)

Skip this and everything else still works — the two AI buttons just error.

---

## 3. Push and deploy

```
git add .
git commit -m "v2"
git push
```

In Vercel → your project → **Settings** → **Environment Variables**, make sure
all three exist:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `ANTHROPIC_API_KEY` | the key from step 2 |

Then **Deployments** → **Redeploy**. Environment variables only apply to builds
that run after you add them, so the redeploy is not optional.

---

## 4. Getting it onto a home screen

There is no install button on a computer for this. It is a phone thing.

**iPhone — must be Safari.** Chrome on iOS cannot do this.
Open the link in Safari → tap **Share** (the box with the arrow, at the bottom)
→ scroll → **Add to Home Screen** → **Add**.

**Android — Chrome.** Open the link → **⋮** menu → **Install app** or
**Add to Home screen**.

It now opens fullscreen with no browser bar, because `index.html` finally has
the Apple meta tags and `manifest.json` points at real PNG icons. The old build
used SVG icons, which neither iOS nor Chrome accepts — that is the whole reason
nothing ever appeared.

Tell your friends to use **Safari**, not Chrome, on iPhone. It is the one step
people get wrong.

---

## What changed

- **Stable guest ID** in localStorage, so answers and cakes come back to you
- **Real PNG icons** + Apple meta tags, so it installs and opens fullscreen
- **Row-level security policies** — writes were silently blocked before
- **Photos compressed** to ~1400px before upload, so party wifi survives
- **AI actually built**: `api/analyze.js` calls Claude server-side, so your key
  never ships to anyone's phone
- **Redesign**: Fraunces display, Courier Prime labels, maroon/blush/cocoa on
  warm paper, bottom tab bar so it reads as an app not a webpage
