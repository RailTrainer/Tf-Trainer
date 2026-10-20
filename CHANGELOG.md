# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## [Unreleased]

### Hinzugefügt
- Pre-Push-Tooling: Agenten `struktur-pflege`, `doku-pflege`, `security-audit`, Befehl `/pre-push`, Claude-Code-Hook und Gitleaks-Git-Hook (`.githooks/pre-push`).
- Gemeinsame UI-Komponenten in `src/components/ui/` (Button, TextField, ListRow, Section, StatusMessage, ConfirmDialog, Design-Tokens).
- Neue Theme-Farbwerte (`fieldBorder`, `buttonPrimary*`, `buttonSecondaryPressedBg`, `buttonDestructive*`) in `ThemeContext`.
- `eslint.config.js` (Expo Flat Config); `npx expo lint` ist lauffähig.
- Agent `ui-ux-designer` (`.claude/agents/`).
- Projektspezifische Dokumentation (README, CLAUDE.md, SECURITY.md, CHANGELOG.md).

### Geändert
- App-Redesign: `profile.tsx` und `AuthScreen.tsx` nutzen die gemeinsamen UI-Komponenten.
- Passwort-Reset nur noch über Supabase-Auth-OTP; ohne Supabase-Verbindung ist kein Reset möglich.
- Auth-Sync beim Reset nutzt ein zufälliges Wegwerf-Passwort (`generateRandomSecret` in `src/utils/crypto.ts`).
- Der erste Admin wird über die normale Registrierung angelegt und per SQL (`UPDATE public.users SET role = 'admin' ...`) hochgestuft.
- Repo-Struktur aufgeräumt: CSVs nach `data/import/`, JSON-Dumps nach `data/generated/`, SQL nach `supabase/`, Store-Grafiken nach `docs/store/`, Hilfsskripte nach `scripts/`.

### Sicherheit
- Lokaler OTP-Fallback und fester Master-Code für den Passwort-Reset entfernt.
- Seed-Admins aus dem Client entfernt (kein automatisches Nachseeden); Seed-Admin und Test-Schüler aus `supabase/supabase_schema.sql` entfernt.

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
