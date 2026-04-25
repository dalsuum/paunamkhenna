# Paunam Khenna — Zolai Language Learning App

A structured, content-managed language learning web app for the Zolai (Zo) language, built on vanilla JS and Firebase.

**Live:** https://zopau-paunam-khenna.web.app  
**Admin:** https://zopau-paunam-khenna.web.app/admin.html

---

## Features

### Student App
- **Level selector** — Beginner, Elementary, Intermediate, Advanced
- **Lessons with tabs** — vocab lists, syllable grids, practice sentences, flashcards
- **Quiz Mode** — randomised questions drawn from the lesson bank, XP scoring
- **Leaderboard** — cross-device score board backed by Firebase RTDB
- **Grammar Reference** — admin-editable reference tables and notes
- **Resources / Appendix** — file and link library managed in the admin panel
- **Vocabulary browser** — per-level word lists
- **XP & progress tracking** — per-session, stored in localStorage
- **Mobile-first** — bottom nav, collapsible lesson picker, responsive sidebar

### Admin Panel (`/admin.html`)
- Google Sign-In (allow-list by email)
- Full CRUD for lesson content, vocab, quiz banks, grammar reference, and resources
- Feature flags — enable/disable sections, rename nav labels
- Level and lesson structure editor (add, rename, reorder, delete)
- File uploads to Firebase Storage
- Analytics dashboard — realtime cross-device session and lesson-visit counts
- Leaderboard management
- JSON export / import for full data backup
- Google Analytics 4 integration (optional, configurable in-app)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES2020), no build tooling |
| Hosting | Firebase Hosting |
| Database | Firebase Realtime Database (Asia Southeast 1) |
| Auth | Firebase Auth — Google Sign-In |
| Storage | Firebase Storage (file uploads) |
| Analytics | Firebase RTDB (custom) + optional GA4 |
| Fonts | Google Fonts — Playfair Display, DM Sans, DM Mono |

---

## Project Structure

```
/
├── index.html          # Student app shell
├── app.js              # All student-app logic (~3200 lines)
├── style.css           # Student app styles
├── admin.html          # Admin panel shell
├── admin.js            # All admin logic (~2100 lines)
├── admin.css           # Admin styles
├── brand.js            # Brand config + shared localStorage KEYS
├── firebase.json       # Hosting config, rewrites, cache headers
└── LICENSE
```

### Key conventions

- **`brand.js`** is loaded first on both pages. It exports `BRAND` (app name, language, text strings) and `KEYS` (namespaced localStorage keys). Change this file to rebrand.
- **`SECTIONS`** registry in `app.js` is the single source of truth for all navigable sections. Adding a new top-level section only requires an entry here.
- Admin content is stored in Firebase RTDB under `adminData` and synced to all clients via a real-time listener on page load.
- Feature flags live under `features` in RTDB and control section visibility and nav labels.

---

## Firebase Setup

### 1. Create a project
Firebase Console → Add project → Enable Google Analytics (optional).

### 2. Enable services
- **Authentication** → Sign-in method → Google
- **Realtime Database** → Create database → Asia Southeast (or your region)
- **Storage** → Get started
- **Hosting** → Get started

### 3. Set RTDB security rules

In Firebase Console → Realtime Database → Rules, publish:

```json
{
  "rules": {
    "adminData": {
      ".read": true,
      ".write": "auth != null && auth.token.email === 'YOUR_ADMIN_EMAIL'"
    },
    "structure": {
      ".read": true,
      ".write": "auth != null && auth.token.email === 'YOUR_ADMIN_EMAIL'"
    },
    "features": {
      ".read": true,
      ".write": "auth != null && auth.token.email === 'YOUR_ADMIN_EMAIL'"
    },
    "settings": {
      ".read": true,
      ".write": "auth != null && auth.token.email === 'YOUR_ADMIN_EMAIL'"
    },
    "scores": {
      ".read": true,
      ".write": true
    },
    "analytics": {
      ".read": "auth != null && auth.token.email === 'YOUR_ADMIN_EMAIL'",
      ".write": true
    }
  }
}
```

### 4. Update Firebase config

In `admin.js` update `FIREBASE_CONFIG` and in `app.js` update `_APP_FB_CONFIG` with your project's values (found in Firebase Console → Project Settings → Your apps).

Update the `ALLOWED_EMAIL` constant in `admin.js` to your admin Google account.

---

## Local Development

No build step required. Serve the root directory with any static server:

```bash
npx serve .
# or
python -m http.server 8080
```

Firebase emulators (optional, for offline RTDB testing):

```bash
npm install -g firebase-tools
firebase emulators:start --only hosting,database
```

---

## Deployment

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

Cache-Control is set to `max-age=300, must-revalidate` (5 minutes) for JS/CSS so clients pick up updates promptly.

---

## Branding / Customisation

Edit `brand.js` to change the app name, language name, hero text, and storage key prefix. All text strings used across both pages reference `BRAND.*`, so a single file change rebrands the entire app.

To add a new top-level nav section:

1. Add an entry to the `SECTIONS` object in `app.js`
2. Add the nav button in `index.html`
3. Implement a `render*()` function
4. Optionally add a feature-flag entry in `admin.js` → `globalDefs`

---

## Analytics

The admin Analytics panel reads realtime data from Firebase RTDB:

- **Sessions** — logged each time a user opens the app (`/analytics/sessions`)
- **Lesson visits** — logged each time a lesson is opened (`/analytics/visits`)

For demographic data (country, device, age/gender), configure a Google Analytics 4 Measurement ID in the admin Analytics panel. The app automatically sends `lesson_view` events to GA4.

---

## License

See [LICENSE](LICENSE).
