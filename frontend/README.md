# 🎨 Vibe Chat Frontend

Welcome to the shiny frontend for your AI Engineer Challenge! This app is built with **Next.js**, so you can run it locally and deploy it straight to Vercel.

## Getting Started

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```
2. **Configure environment (optional)**
   - Copy `.env.local.example` to `.env.local` if you need to change `NEXT_PUBLIC_BACKEND_URL`.
   - The app now lets users provide their own OpenAI API key directly in the interface, so you don't need to store it in this file.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to chat with your backend. Make sure the FastAPI server in `/api` is running (`python api/app.py`).

## Deployment

This directory works with the provided `vercel.json` file. Once everything looks good locally, deploy with:

```bash
vercel --prod
```

Happy vibe‑coding! 🎉

