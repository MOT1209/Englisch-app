# 🌐 LinguaVerse - Language Learning Platform

**LinguaVerse** is a comprehensive language learning application that combines traditional learning methods with modern AI-powered features. Practice languages, take lessons, complete exercises, and practice with AI tutors all in one app.

## 📱 Features

- **Multi-language Support**: Learn 13 languages including Spanish, English, French, German, Arabic, Turkish, Italian, Portuguese, Russian, Japanese, Korean, and Chinese
- **Structured Lessons**: Progressive lessons from A1 to B2 levels with vocabulary, grammar, and conversation practice
- **AI-Powered Tutor**: Practice conversations with AI teacher using Gemini API (server-side key management)
- **Writing Evaluation**: Submit writing assignments and get scored feedback with corrections and suggestions
- **Flashcards & Spaced Repetition**: Study with flashcards using interval-based repetition
- **Achievement System**: Unlock achievements and track your progress
- **Leaderboards**: Compare your progress with other learners
- **Offline Support**: Full offline functionality with Room database, sync when online
- **User Profiles**: Track XP, coins, streaks, and personal statistics
- **Admin Panel**: Manage content (for educators/ administrators)

## 🏗️ Architecture

```
LinguaVerse
├── 📱 Android App (Kotlin + Jetpack Compose)
│   ├── MVVM Architecture with ViewModels
│   ├── Room Database for offline storage
│   ├── Repository Pattern with backend API fallback
│   └── DI via manual container (AppContainer)
│
├── 🔗 Backend API (Node.js + Express + Prisma)
│   ├── REST API routes for all resources
│   ├── JWT authentication with refresh tokens
│   ├── Gemini AI proxy (hides API key from clients)
│   ├── Rate limiting per user/day
│   └── Prisma ORM with PostgreSQL
│
└── 🗄️ Database
    ├── PostgreSQL via Supabase (planned)
    └── Room SQLite (offline fallback)
```

## 🚀 Quick Start

### Prerequisites

- [Android Studio](https://developer.android.com/studio) (latest version)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/linguaverse.git
   cd linguaverse
   ```

2. **Android App Setup**
   ```bash
   cd app
   # Install dependencies
   ./gradlew assembleDebug
   # Or open in Android Studio and click "Run"
   ```

3. **Backend Setup**
   ```bash
   cd backend
   # Install npm dependencies
   npm install
   
   # Create .env file
   cp .env.example .env
   # Edit .env with your configuration:
   # - GEMINI_API_KEY: Your Gemini API key (server-side only)
   # - APP_TOKEN: Shared secret for app authentication
   # - DATABASE_URL: PostgreSQL connection string
   # - JWT_SECRET: Secret for JWT signing
   # - NODE_ENV: development|production|test
   
   # Run migrations and seed
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   
   # Start the server
   npm run dev
   ```

4. **Configure API Keys**
   - Add your Gemini API key to the `.env` file (backend only - never in the APK!)
   - The app uses a server proxy (`/api/ai/chat` and `/api/ai/write`) to hide the key

## 📦 Project Structure

```
linguaverse/
├── app/                          # Android App
│   ├── src/main/java/com/example/  # Kotlin source
│   ├── src/main/res/               # Resources
│   ├── build.gradle.kts             # Android dependencies
│   └── proguard-rules.pro           # Optimization rules
│
├── backend/                       # Node.js Backend
│   ├── src/                       # TypeScript source
│   ├── prisma/                    # Database schema & migrations
│   ├── package.json               # npm dependencies
│   └── .env.example               # Environment variables
│
├── plan.md                        # Development roadmap
├── README.md                      # This file
└── docs/                          # Documentation
    └── AUDIT.md                   # Audit report
```

## 🛠️ Tech Stack

### Frontend
- **Kotlin** with **Jetpack Compose** for UI
- **MVVM** architecture pattern
- **Coroutines** & Flow for async operations
- **Moshi** for JSON serialization
- **Room** for local database
- **Hilt/DI** (manual container)

### Backend
- **Node.js** with **Express**
- **Prisma ORM** for database access
- **PostgreSQL** (via Supabase/self-hosted)
- **Helmet** for security headers
- **CORS** configuration
- **Zod** for input validation
- **jsonwebtoken** for auth
- **Bcryptjs** for password hashing

### AI Integration
- **Gemini API** (Google Generative AI)
- Server-side key management (key never ships in APK)
- AI proxy routes: `/api/ai/chat` and `/api/ai/write`
- Daily request caps per user

## 📝 Environment Variables

### Backend (.env)
See `.env.example` in the backend directory for required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for signing JWT tokens
- `JWT_EXPIRES_IN`: Token expiration (default: 15m)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (default: 7d)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: development|production|test
- `CORS_ORIGIN`: Allowed CORS origin
- `GEMINI_API_KEY`: Your Gemini API key (NEVER in Android APK!)
- `GEMINI_MODEL`: Default model (default: gemini-2.5-flash)
- `APP_TOKEN`: Shared secret for app authentication
- `AI_DAILY_REQUEST_CAP`: Max AI requests per day (default: 300)

### Android (.env)
Create `app/.env` with:
- `API_BASE_URL`: Base URL for backend API (e.g., `http://10.0.2.2:3000` for emulator)

## 📱 Running the App

### Development

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Run the Android app**
   - Open in Android Studio
   - Click "Run" or `./gradlew installDebug`
   - The app will connect to the local backend at `http://10.0.2.2:3000`
   - (`10.0.2.2` is the special IP address that maps to `127.0.0.1` from an emulator)

### Production Build

```bash
# Android
cd app
./gradlew assembleRelease

# Backend
cd backend
npm run build
npm start
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Lead Android**: Kotlin & Jetpack Compose expertise
- **Lead Backend**: Node.js, Express, Prisma, AI integration
- **AI/ML**: Gemini API integration and prompt engineering

## 🙏 Acknowledgments

- Google Gemini API for AI tutor functionality
- Prisma ORM for database management
- Jetpack Compose for native UI development
- Open source community for various libraries and tools

---

**LinguaVerse** - Learn languages, connect with people, explore cultures. 🌍✨