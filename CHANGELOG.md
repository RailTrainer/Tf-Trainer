# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## [Unreleased]

### Geändert
- Upgrade auf Expo SDK 58 (React Native 0.88, React 19.3); `runtimeVersion` 1.0.12 – erfordert neue Store-Builds.
- Ref-Typen auf die öffentlichen Instanztypen der React-Native-Strict-API umgestellt (`ViewInstance`, `TextInputInstance`, `ScrollViewInstance`, `HostInstance`).
- Eigene Tab-Leiste (`_layout.tsx`) nutzt die neue expo-router-API (`emitter`, `navigateToTab`).
- CI-Workflow nutzt Node.js 24.
- `react-native-svg` als direkte Abhängigkeit (natives Peer-Paket von `lucide-react-native`, von `expo-doctor` gefordert).

### Behoben
- Android-Release-Build: `assets/images/icon.png` war ein JPEG mit PNG-Endung und brach `mergeReleaseResources` (AAPT2) ab; jetzt echtes PNG.

### Entfernt
- Veraltetes Top-Level-Feld `notification` in `app.json` (Icon/Farbe kommen aus dem `expo-notifications`-Plugin).
- Profil-Screen: Die eigene E-Mail-Adresse lässt sich nicht mehr ändern; `updateUserProfile` (`mockDb`) schreibt keine E-Mail mehr.

## [2.1.0] – 2026-10-22

### Hinzugefügt
- Pre-Push-Tooling: Agenten `struktur-pflege`, `doku-pflege`, `security-audit`, Befehl `/pre-push`, Claude-Code-Hook und Gitleaks-Git-Hook (`.githooks/pre-push`).
- Gemeinsame UI-Komponenten in `src/components/ui/` (Button, TextField, ListRow, Section, StatusMessage, ConfirmDialog, Design-Tokens).
- Neue Theme-Farbwerte (`fieldBorder`, `buttonPrimary*`, `buttonSecondaryPressedBg`, `buttonDestructive*`) in `ThemeContext`.
- `eslint.config.js` (Expo Flat Config); `npx expo lint` ist lauffähig.
- Chat-Komponenten in `src/components/chat/` (ChannelSidebar, ThreadList, MessageList, MessageBubble, ChatComposer, ChatKeyboardPane, ChatNotice, ChatRestrictionNotice, RoleLabel, UserProfileDialog).
- Neue UI-Bausteine: Dialog, ActionDialog, IconButton, Avatar, CountBadge, RadioGroup, Tabs, VisuallyHidden, `a11y.ts` (Fokus-Helfer); Tokens `ICON_BUTTON_SIZE`, `WIDE_MAX_WIDTH`; Theme-Farbe `surfaceSubtle`.
- Hook `useReduceMotion`, Helfer `src/utils/chatFormat.ts`.
- Agent `ui-ux-designer` (`.claude/agents/`).
- Projektspezifische Dokumentation (README, CLAUDE.md, SECURITY.md, CHANGELOG.md).
- Profil-Screen: neue Comic-Avatare, Support-Adresse `support@tf-trainer.de`, Weiterleitung zum Start nach Abmelden/Kontolöschung.

### Geändert
- Anmelde- und Profil-Screen zeigen auch in der nativen App den Namen „Tf-Trainer“.
- Chat-Redesign: `src/app/chat.tsx` in Komponenten unter `src/components/chat/` aufgeteilt; `ConfirmDialog` nutzt `Dialog`; `Button` unterstützt `ref`; `ListRow` mit `danger`-Variante.
- `addChatMessage` (`mockDb`) wirft bei Supabase-Fehler; der Chat zeigt „Nicht gesendet“ mit „Erneut senden“.
- App-Redesign: `profile.tsx` und `AuthScreen.tsx` nutzen die gemeinsamen UI-Komponenten.
- Passwort-Reset nur noch über Supabase-Auth-OTP; ohne Supabase-Verbindung ist kein Reset möglich.
- Auth-Sync beim Reset nutzt ein zufälliges Wegwerf-Passwort (`generateRandomSecret` in `src/utils/crypto.ts`).
- Der erste Admin wird über die normale Registrierung angelegt und per SQL (`UPDATE public.users SET role = 'admin' ...`) hochgestuft.
- Repo-Struktur aufgeräumt: CSVs nach `data/import/`, JSON-Dumps nach `data/generated/`, SQL nach `supabase/`, Store-Grafiken nach `docs/store/`, Hilfsskripte nach `scripts/`.

### Sicherheit
- Lokaler OTP-Fallback und fester Master-Code für den Passwort-Reset entfernt.
- Seed-Admins aus dem Client entfernt (kein automatisches Nachseeden); Seed-Admin und Test-Schüler aus `supabase/supabase_schema.sql` entfernt.

## [2.0.0]

Stand laut `package.json`/`app.json`; abgeleitet aus der Commit-Historie.

### Hinzugefügt
- Admin-Push bei Web-Freischaltungsanfragen (`sendAdminWebUnlockRequestNotification` in `src/services/notificationService.ts`).
- Web-Paywall: Freischaltstatus wird beim Öffnen des Screens sofort und über `validateWebAccessAuthoritative` geprüft.

### Geändert
- Webportal: Quizbattle- und Hangman-Korrekturen, Web-Paywall-Redirect, iOS-Zoom-Guard (laut Release-Commit).
- Web-Export ohne `experiments.baseUrl`; Deploy-Workflow schreibt `dist/CNAME`.
- Deploy-Workflow kopiert `admin-portal/` nach `dist/admin-portal/` und `admin-portal/play.html` nach `dist/play.html`.
- App-Name in `app.json`: Tf-Trainer.

### Behoben
- Login-Sperre: robustere Prüfung des Nutzerobjekts in `src/app/_layout.tsx` und `src/database/mockDb.ts`.

## [1.1.5]

Stand laut `package.json`/`app.json`; abgeleitet aus der Commit-Historie.

### Hinzugefügt
- Tf-Trainer-Web-Version mit Paywall, Lizenzierung und GitHub-Pages-Workflow.
- Web-Registrierung mit Paywall-Gate und Key-Prüfung (4,99 EUR, PayPal-Checkout).
- Registrierung ohne Key mit WebPaywall-Gate und Live-Prüfung der Freischaltung.
- Hinweis zur E-Mail-Zuordnung im WebPaywallScreen.

### Geändert
- WebPaywallScreen vereinfacht, direkter PayPal-Checkout.

### Sicherheit
- Test-Masterkeys aus `verifyWebKey` entfernt.
