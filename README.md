# RailTrainer (Tf-Trainer)

Interaktive Bahn-Lern- und Wissensplattform (App- und Produktname: **Tf-Trainer**, Repository: RailTrainer). Expo/React-Native-App (Expo Router) mit Supabase-Backend, Web-Export auf GitHub Pages und einem separaten Admin-Portal.

## Features

Die Screens liegen in `src/app/` und sind als Tabs in `src/app/_layout.tsx` eingebunden:

- **Lernen** (`index.tsx`) – Lernkarten
- **Prüfung** (`quiz.tsx`) – Quizfragen
- **Diskussion** (`chat.tsx`) – Chat
- **Admin** (`admin.tsx`) – Verwaltung für Ausbilder/Moderatoren (Nachrichten, Inhalte)
- **Profil** (`profile.tsx`)
- Anmeldung/Registrierung (`AuthScreen`), Web-Paywall mit Freischaltprüfung (`WebPaywallScreen`), Push-Benachrichtigungen (`src/services/notificationService.ts`), Hell/Dunkel-Theme (`src/context/ThemeContext.tsx`)

## Tech-Stack

- Expo SDK 57, React Native 0.86, React 19, Expo Router (typed routes, React Compiler)
- Supabase (`@supabase/supabase-js`), AsyncStorage
- EAS Build und EAS Update (OTA), `expo-updates`
- TypeScript, react-native-web für den Web-Export
- Admin-Portal: statisches HTML/JS in `admin-portal/`

## Voraussetzungen

- Node.js 20 (wie im CI-Workflow)
- npm
- Für Builds/OTA: Expo-/EAS-Account (`npx eas-cli`)
- Optional für den Push-Schutz: [gitleaks](https://github.com/gitleaks/gitleaks) (`brew install gitleaks`)

## Setup

```bash
npm install
npm start
```

Umgebungsvariablen werden vom Code derzeit nicht benötigt (Supabase-Konfiguration steht in `src/services/supabaseClient.ts`). Lokale Env-Dateien (`.env*.local`) sind gitignored.

### Ersten Admin anlegen

Das Schema (`supabase/supabase_schema.sql`) legt keinen Admin- oder Test-Account an, und der Client seedet keine Admins. Den ersten Admin registrierst du über die normale App-Registrierung und stufst ihn danach im Supabase-SQL-Editor hoch:

```sql
UPDATE public.users SET role = 'admin' WHERE email = '<admin-email>';
```

### Passwort zurücksetzen

Der Reset läuft ausschließlich über Supabase-Auth-OTP (`sendPasswordResetOtp` / `verifyOtpAndResetPassword` in `src/database/mockDb.ts`). Ohne Supabase-Verbindung ist kein Reset möglich.

## npm-Scripts

| Script | Zweck |
| --- | --- |
| `npm start` | Expo-Dev-Server (`expo start`) |
| `npm run android` / `ios` / `web` | Dev-Server mit Zielplattform |
| `npm run lint` | `expo lint` |
| `npm run admin` | Lokaler Server für das Admin-Portal (`scripts/adminServer.js`, Port `PORT` oder 3000) |
| `npm run ota` | EAS-OTA-Update auf Branch `production` (`scripts/publish-ota.js`) |
| `npm run ota:preview` | OTA-Update auf Branch `preview` |
| `npm run reset-project` | Expo-Template-Reset (`scripts/reset-project.js`) |

Typprüfung: `npx tsc --noEmit`. Lint-Konfiguration: `eslint.config.js` (Expo Flat Config).

## Projektstruktur

```
src/
  app/          Expo-Router-Screens (index, quiz, chat, admin, profile, _layout)
  components/   UI-Komponenten (AuthScreen, WebPaywallScreen, Modals, ...)
  components/ui/  Gemeinsame UI-Bausteine (Button, IconButton, TextField, ListRow, Section, StatusMessage, Dialog, ActionDialog, ConfirmDialog, Avatar, CountBadge, RadioGroup, Tabs, VisuallyHidden, a11y.ts, tokens.ts)
  components/chat/  Chat-Bausteine (ChannelSidebar, ThreadList, MessageList, MessageBubble, ChatComposer, ...)
  context/      ThemeContext
  database/     Lokale Inhalte (JSON) und mockDb.ts
  hooks/        Layout-/Theme-/Keyboard-/Reduce-Motion-Hooks
  services/     supabaseClient, notificationService
  utils/        crypto (SHA-256), imageOptimizer, similarity
admin-portal/   Statisches Admin-Portal (index.html, play.html, app.js, audio/, logo.png)
assets/         App-Icons, Bilder
scripts/        Node-Hilfsskripte (OTA, Admin-Server, Import-/Generator-Skripte, .bat/.ps1/.ahk-Helfer)
supabase/       SQL: supabase_schema.sql, supabase_web_schema.sql, supabase_security_fix.sql
data/import/    CSV-Importdateien und Vorlagen
data/generated/ Generierte JSON-Dumps
docs/store/     Store-Grafiken und Screenshots
.github/workflows/deploy.yml   Web-Deploy nach GitHub Pages
.claude/, .githooks/           Pre-Push-Tooling (siehe unten)
```

## Build und Deploy

- **Native Builds:** EAS-Profile in `eas.json` (`development`, `preview` als APK, `production` als App Bundle). Android-Paket `com.railtrainer`.
- **OTA-Updates:** `npm run ota` bzw. `npm run ota:preview` (Kanäle `production`/`preview`; `runtimeVersion` steht in `app.json`).
- **Web:** `.github/workflows/deploy.yml` baut bei Push auf `main` (oder manuell) mit `npx expo export --platform web` und veröffentlicht `dist/` auf GitHub Pages. Der Workflow schreibt `dist/CNAME` (Custom Domain), kopiert `admin-portal/` nach `dist/admin-portal/` und `admin-portal/play.html` nach `dist/play.html`. `app.json` setzt kein `experiments.baseUrl`; `vercel.json` enthält eine SPA-Rewrite-Regel.

## Pre-Push-Prüfung

- `/pre-push` in Claude Code führt die Agenten `struktur-pflege`, `doku-pflege` und `security-audit` aus und gibt den Push frei.
- Optional pro Clone: `git config core.hooksPath .githooks` aktiviert einen Gitleaks-Scan beim `git push`.

## Sicherheit und Lizenz

- Sicherheitslücken melden: siehe [SECURITY.md](SECURITY.md)
- Lizenz: [LICENSE](LICENSE)
- Änderungen: [CHANGELOG.md](CHANGELOG.md)
