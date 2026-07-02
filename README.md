# SudharsanGPT

A ChatGPT-style AI chat app, powered by Google's free Gemini API, ready to deploy on Vercel.

Features: streaming responses, markdown + code block rendering, multiple conversations saved in your browser, new/delete chat, mobile-friendly layout, dark theme.

## 1. Get a free Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account and click **Create API key** (no credit card needed).
3. Copy the key — it starts with `AIza...`.

## 2. Run it locally (optional but recommended)

```bash
npm install
cp .env.example .env.local
# paste your key into .env.local as GEMINI_API_KEY=...
npm run dev
```

Open http://localhost:3000 — you should see SudharsanGPT running.

## 3. Deploy to Vercel

**Option A — via GitHub (recommended)**

1. Create a new GitHub repo and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "SudharsanGPT"
   git branch -M main
   git remote add origin https://github.com/<your-username>/sudharsangpt.git
   git push -u origin main
   ```
2. Go to https://vercel.com/new and import that repo.
3. Before deploying, open **Environment Variables** and add:
   - `GEMINI_API_KEY` = your key from step 1
4. Click **Deploy**. Done — you'll get a live `.vercel.app` URL.

**Option B — via Vercel CLI**

```bash
npm i -g vercel
vercel
vercel env add GEMINI_API_KEY
vercel --prod
```

## Notes

- The free Gemini tier is generous but rate-limited (roughly 10–15 requests/minute). If you see errors under heavy use, wait a minute or upgrade to a paid Gemini tier.
- Chat history is stored only in the visitor's browser (localStorage) — there's no shared database, so conversations don't sync across devices.
- To swap the model, set `GEMINI_MODEL` in your environment variables (e.g. `gemini-2.5-flash`, `gemini-2.5-pro`).
- Rename the app anywhere by changing "SudharsanGPT" in `app/layout.tsx` and `app/page.tsx`.
