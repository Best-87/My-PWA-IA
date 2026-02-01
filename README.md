<div align="center">
<img width="128" height="128" alt="App Icon" src="./public/pwa-192x192.png" />
<h1>My PWA IA</h1>
<p>An intelligent Progressive Web App for tracking and weighing records with AI assistance.</p>
</div>

## Features

- **AI-Powered Assistance**: Context-aware tips and guidance in the weighing form.
- **Offline Capable**: Full functionality without internet access, syncing when online.
- **PWA Ready**: Installable on mobile devices with a native-like experience.
- **History Tracking**: View and manage past weighing records.
- **Profile Management**: User profile personalization.
- **Dark Mode**: Support for light and dark themes.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `VITE_GEMINI_API_KEY` in `.env.local` to your Gemini API key.
3. Run the app:
   ```bash
   npm run dev
   ```

## Tech Stack

- React
- Vite
- Tailwind CSS
- Gemini API
- LocalStorage / IndexedDB (for offline data)
