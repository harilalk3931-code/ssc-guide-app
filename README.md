# SSC CGL Guide - Complete Preparation App

A comprehensive Progressive Web App (PWA) for SSC CGL Tier-I exam preparation featuring question bank, test creator, syllabus tracker, day counter, checklist, and study notes. Works offline on both desktop and Android mobile.

## ✨ Features

### 📚 Question Bank
- **Notopedia Integration**: Fetches questions from [Notopedia SSC CGL](https://www.notopedia.com/sarkari-job-exams/SSC-CGL-%3E/Tier-I/5/32/200302/35/142/Tier-I)
- **AI Generation**: Generate unlimited questions using NVIDIA Nemotron-3-Ultra API
- **Topic-wise Filtering**: General Awareness, Reasoning, Quant, English
- **Difficulty Levels**: Easy, Medium, Hard
- **Bookmarking**: Save questions for later review
- **Search & Filter**: Find questions instantly

### 📝 Test Creator
- **Pre-built Configs**: Full Mock (100Q/60min), Sectional (25Q/15min), Quick (10Q/6min)
- **Custom Tests**: Choose topic, question count (5-100), time limit
- **Real-time Timer**: Countdown with warning colors
- **Question Palette**: Navigate between questions
- **Instant Results**: Score, percentage, detailed review
- **PDF Export**: Download results for offline analysis
- **Retry & History**: Retake tests, track progress

### 📋 Syllabus Tracker
- **Complete SSC CGL Syllabus**: All 4 sections with weighted topics
- **Progress Tracking**: Mark topics complete, set progress %
- **Priority Suggestions**: AI-driven study priority based on weight × progress gap
- **Visual Progress**: Per-section and overall completion

### ✅ Checklist & Progress
- **Default Tasks**: 10 essential preparation tasks
- **Custom Tasks**: Add your own with categories & targets
- **Target-based**: Track quantitative goals (e.g., "500 questions", "10 mocks")
- **Category Filters**: Syllabus, Practice, Revision, Performance
- **Quick Actions**: Complete all practice/syllabus with one click

### 📅 Day Counter
- **Live Countdown**: Days, hours, minutes, seconds until exam
- **Milestones**: Key phases (Final Revision, Mock Tests, Syllabus Completion)
- **Study Plan**: Phase-based daily/weekly recommendations
- **Progress Bar**: Visual preparation timeline
- **Quick Stats**: Weeks left, weekends, study hours, possible mocks

### 📖 Guide Notes
- **Quick Revision**: Condensed notes for all subjects
- **Formulas & Tricks**: Percentage, Profit/Loss, Time-Speed-Distance, Geometry
- **Grammar Rules**: Error spotting, tenses, voice, narration
- **Vocabulary**: High-frequency synonyms/antonyms, idioms, one-word substitutions
- **Current Affairs**: 2024-25 key events, awards, important days
- **Searchable**: Filter notes instantly

### 🌐 PWA Features
- **Offline Support**: Service worker caches questions, notes, assets
- **Installable**: Add to home screen on Android/iOS/Desktop
- **Auto-update**: Background updates when online
- **Responsive**: Works on mobile, tablet, desktop

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- (Optional) NVIDIA Nemotron API key for AI question generation

### Installation

```bash
# Navigate to project
cd C:\Users\Admin\Desktop\hari\TEST\Project\SSC\ssc-guide-app

# Install dependencies
npm install

# Copy environment template
copy .env.example .env

# Edit .env and add your API keys (optional)
notepad .env

# Start development server (runs both client & server)
npm run dev
```

### Environment Variables (.env)

```env
# Nemotron API Key (for AI question generation)
# Get from: https://build.nvidia.com/explore/discover
NEMOTRON_API_KEY=your_nemotron_api_key_here

# Notopedia Source URL (pre-configured for SSC CGL Tier-I)
NOTOPEDIA_URL=https://www.notopedia.com/sarkari-job-exams/SSC-CGL-%3E/Tier-I/5/32/200302/35/142/Tier-I

# Exam Date (default: 2025-12-31)
VITE_EXAM_DATE=2025-12-31
```

### Accessing the App

#### Development
- **Local**: http://localhost:5173
- **Network**: http://YOUR_IP:5173 (access from mobile on same WiFi)

#### Production Build
```bash
# Build for production
npm run build:prod

# Start production server
npm start
```
- **Production**: http://localhost:3001

#### Mobile Access
1. Ensure phone and PC are on same WiFi
2. Find PC IP: `ipconfig` (Windows) → IPv4 Address
3. Open `http://PC_IP:5173` on mobile browser
4. Tap "Add to Home Screen" for app-like experience

## 📱 Android Installation

### As PWA (Recommended)
1. Open Chrome on Android
2. Navigate to the app URL
3. Tap menu (⋮) → "Add to Home Screen" / "Install App"
4. App installs like native app, works offline

### As APK (Advanced)
```bash
# Using PWA Builder (https://www.pwabuilder.com/)
# Enter your deployed URL
# Generate signed APK for Play Store
```

## 🏗️ Project Structure

```
ssc-guide-app/
├── public/
│   ├── manifest.webmanifest    # PWA manifest
│   ├── sw.js                   # Service worker
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Navigation with dark mode
│   │   ├── Home.jsx            # Dashboard with stats
│   │   ├── QuestionBank.jsx    # Questions with filters
│   │   ├── TestCreator.jsx     # Test creation & taking
│   │   ├── SyllabusTracker.jsx # Topic progress tracking
│   │   ├── Checklist.jsx       # Task management
│   │   ├── DayCounter.jsx      # Exam countdown
│   │   └── GuideNotes.jsx      # Study notes
│   ├── services/
│   │   └── api.js              # Notopedia & Nemotron APIs
│   ├── store.js                # Zustand state management
│   ├── App.jsx                 # Main app with routing
│   ├── main.jsx                # Entry point
│   └── index.css               # Tailwind + custom styles
├── server.js                   # Express backend
├── package.json
├── vite.config.js              # Vite + PWA config
├── tailwind.config.js
└── .env.example
```

## 🔧 Available Scripts

```bash
npm run dev          # Start dev server (client + server)
npm run client       # Start Vite client only
npm run server       # Start Express server only
npm run build        # Build for production
npm run build:prod   # Production build with NODE_ENV=production
npm run start        # Start production server
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint-fix     # Auto-fix linting issues
npm run test         # Run Vitest tests
```

## 🎯 Usage Guide

### 1. Load Questions
- Go to **Question Bank**
- Click "🔄 Refresh from Notopedia" to load SSC CGL questions
- Or use "🤖 Generate" with Nemotron API for custom topics

### 2. Create a Test
- Go to **Test Creator**
- Select "Sectional Test (25 Q, 15 min)" for topic-wise practice
- Choose topic (e.g., "General Awareness")
- Click "Start Test"

### 3. Track Syllabus
- Go to **Syllabus Tracker**
- Expand sections, use slider for progress %
- Check "Priority List" for what to study next

### 4. Daily Checklist
- Go to **Checklist**
- Complete default tasks or add your own
- Use "Quick Actions" for bulk updates

### 5. Monitor Countdown
- Go to **Day Counter**
- Set your exam date if different
- Follow phase-based study plan

### 6. Quick Revision
- Go to **Guide Notes**
- Select subject, expand sections
- Use search to find specific topics

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/notopedia/questions` | GET | Fetch questions from Notopedia |
| `/api/nemotron/generate` | POST | Generate questions with AI |
| `/api/syllabus` | GET | Get SSC CGL syllabus structure |

## 🛠️ Tech Stack

- **Frontend**: React 19, React Router 7, Zustand
- **Build**: Vite 7, Tailwind CSS 3, PostCSS
- **PWA**: Vite PWA Plugin, Workbox
- **Backend**: Express 5, Node.js
- **APIs**: Notopedia (scraping), NVIDIA Nemotron-3-Ultra
- **PDF**: jsPDF
- **Icons**: Emoji + SVG

## 📦 Deployment

> ⚠️ **IMPORTANT**: `.env` is listed in `.gitignore` and will **NOT** be uploaded to GitHub. Your `NEMOTRON_API_KEY` stays private. Configure it as a **server environment variable** on your hosting platform instead.

### Option 1: Render (Recommended - Free, Full Stack)

1. Create a free account at [render.com](https://render.com)
2. Upload this project to GitHub:
   ```bash
   # Create a repo on github.com, then:
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/ssc-guide-app.git
   git push -u origin main
   ```
3. On Render: **New → Web Service** → connect your GitHub repo
4. Render auto-detects `render.yaml`. Or configure manually:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
   - **Environment** → Add env var `NEMOTRON_API_KEY` (your NVIDIA key)
5. Deploy → get your live URL like `https://ssc-guide-app.onrender.com`
6. Open the URL on your Android phone → **Add to Home Screen**

### Option 2: Vercel (Serverless)

1. Push to GitHub (same as above)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import repo
3. Framework preset: **Vite** (Vercel will use the included `vercel.json` + `api/index.js`)
4. Add env var `NEMOTRON_API_KEY`
5. Deploy → share the URL with your phone

### Option 3: GitHub Pages (Static Only, No AI Features)

- Build with `npm run build:prod`
- Deploy the `dist/` folder
- AI generation / Notopedia refresh won't work (needs server)

### VPS/Docker (Full Stack)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build:prod
EXPOSE 3001
CMD ["npm", "start"]
```

### GitHub Pages (Static Only)
- Use `vite-plugin-pwa` with `generateSW`
- Disable server API features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run `npm run lint-fix`
5. Submit PR

## 👨‍💻 Created By

**Harilal K** — [harilalk.931@gmail.com](mailto:harilalk.931@gmail.com)

Built with ❤️ for SSC CGL aspirants.

## 📄 License

MIT License - Feel free to use for personal exam preparation.

## 🙏 Acknowledgments

- **Notopedia** for free SSC CGL question papers
- **NVIDIA** for Nemotron-3-Ultra API
- **SSC** for exam pattern transparency
- **Open Source Community** for React, Vite, Tailwind, Zustand

## 📞 Support

For issues or questions:
- Check existing GitHub issues
- Create new issue with details
- Include browser/device info
- Email: [harilalk.931@gmail.com](mailto:harilalk.931@gmail.com)

---

**Happy Studying! 🎯 Crack SSC CGL with confidence!**
