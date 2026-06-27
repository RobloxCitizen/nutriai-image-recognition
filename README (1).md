# 🥗 NutriAI — AI Meal Analyzer

A free, open-source alternative to Cal AI. Upload a photo of your meal and instantly get calories, macros, and a health score — powered by Gemini AI.

**[→ Live Demo](https://robloxcitizen.github.io/nutriai-image-recognition/)**

---

## Features

- **📷 Photo analysis** — snap or upload a photo of any dish; AI identifies the food and estimates the portion size
- **✏️ Text mode** — describe your meal in plain language if you prefer
- **📊 Full macro breakdown** — calories, protein, carbs, fat, and fiber with daily value percentages
- **🏆 Health score** — 1–10 rating with color-coded ring indicator
- **💡 Personalized tips** — AI suggests how to improve the nutritional value of your meal
- **📱 Mobile-first** — tap "Take photo with camera" to use your phone camera directly
- **⚡ Zero backend cost** — runs on Cloudflare Workers free tier + Gemini API free tier

---

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 (via CDN, no build step) |
| Hosting   | GitHub Pages |
| Backend   | Cloudflare Workers |
| AI Model  | Google Gemini 2.5 Flash (multimodal) |

---

## How It Works

1. User uploads a photo or types a meal description
2. The frontend compresses the image to ≤900px and converts it to Base64
3. A POST request is sent to the Cloudflare Worker
4. The Worker forwards the image to Gemini via `inlineData` in the request payload
5. Gemini returns a structured JSON with all nutritional data
6. The frontend renders the results with animated macro bars and a score ring

---

## Project Structure

```
nutriai-image-recognition/
├── index.html       # Entry point — loads React + Babel from CDN
├── NutriAI.jsx      # All UI logic: photo upload, compression, results view
└── Worker.js        # Cloudflare Worker — routes to Gemini image or text API
```

---

## Deploy Your Own

### 1. Fork & enable GitHub Pages
Fork this repo → Settings → Pages → Source: `main` branch → Save.

### 2. Deploy the Cloudflare Worker
- Create a new Worker at [dash.cloudflare.com](https://dash.cloudflare.com)
- Paste the contents of `Worker.js`
- Add a secret variable named `GEMINI_API_KEY` with your key from [Google AI Studio](https://aistudio.google.com/app/apikey) (free)
- Deploy

### 3. Update the Worker URL
In `NutriAI.jsx`, replace the `WORKER_URL` constant with your Worker's URL:
```js
const WORKER_URL = "https://your-worker-name.your-subdomain.workers.dev/";
```

That's it — no npm, no build tools, no server costs.

---

## Previous Version

Text-only version of this project: [nutriai](https://github.com/robloxcitizen/nutriai)

---

*Built as a portfolio project. Not a substitute for professional dietary advice.*
