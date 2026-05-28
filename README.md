<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Quota-Easy - AI Studio App

This is a React + Vite app with Firebase integration, deployed on GitHub Pages.

**View in AI Studio**: https://ai.studio/apps/ccda8a65-37ff-4a1c-b1a8-af6af54c1ada

---

## 🚀 Quick Start - Development

**Prerequisites**: Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Add your `GEMINI_API_KEY`

3. **Run locally:**
   ```bash
   npm run dev
   ```
   App runs at: `http://localhost:3000`

---

## 📦 Production Build & Deployment

### Clean Build & Deploy (Recommended)

Run the full clean deployment flow:

```bash
npm run clean    # Clean old builds
npm install      # Install dependencies
npm run build    # Build for production
npm run deploy   # Deploy to GitHub Pages
```

**Or use GitHub Actions** (automatic on push to `main`) - see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📖 Full Deployment Guide

See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for:
- ✅ What was fixed
- 🔧 Detailed deployment steps
- 🤖 GitHub Actions setup
- 🛠 Troubleshooting
- 📋 Project structure

---

## 🔧 Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Build for production (`dist/`) |
| `npm run deploy` | Deploy to GitHub Pages |
| `npm run preview` | Preview production build locally |
| `npm run clean` | Clean build artifacts |
| `npm run lint` | Type check with TypeScript |

---

## ⚙️ Tech Stack

- **Frontend**: React 19 + Vite 6
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Auth + Firestore)
- **Deployment**: GitHub Pages + GitHub Actions
- **AI**: Google Gemini API

---

## 📝 Notes

- Base path configured for GitHub Pages: `/Quota-easy/`
- Firestore cache optimized for slow connections
- Tailwind CSS processed via PostCSS (not Vite plugin)
- All assets properly hashed for cache busting

---

For more info, check individual files or the deployment guide.
