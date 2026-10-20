@AGENTS.md

# Hinweise für KI-Agenten

## Architektur
- Expo SDK 57 / React Native, Expo Router (Dateirouting in `src/app/`), TypeScript.
- Backend: Supabase; Client in `src/services/supabaseClient.ts`. SQL-Schemata in `supabase/`.
- Web-Export (`output: static`, Basis-Pfad `/Tf-Trainer`) wird per `.github/workflows/deploy.yml` auf GitHub Pages veröffentlicht.
- Admin-Portal: statisch in `admin-portal/`, lokal via `npm run admin`.

## Wichtige Pfade
- `src/app/` Screens, `src/components/` UI (gemeinsame Bausteine und Design-Tokens in `src/components/ui/`; Farben über `ThemeContext`), `src/services/` Services, `src/utils/` Helfer, `src/database/` lokale Inhalte
- `scripts/` Node-Hilfsskripte (OTA, Admin-Server, Import/Generatoren)
- `data/import/` CSVs, `data/generated/` JSON-Dumps, `docs/store/` Store-Grafiken, `supabase/` SQL
- `auswertung-intern/` – intern, gitignored (Agentenberichte). Inhalte nie in versionierte Dateien übernehmen.

## Konventionen
- Sprache der Doku und UI-Texte: Deutsch.
- Keine Secrets, Keys oder Zugangsdaten committen; keine neuen Dateien im Repo-Root ablegen (Daten nach `data/`, SQL nach `supabase/`, Skripte nach `scripts/`, Grafiken nach `docs/store/`).
- Vor Expo-bezogenen Änderungen die versionierten Expo-Docs lesen (siehe AGENTS.md).

## Auth
- Passwort-Reset nur über Supabase-Auth-OTP (`src/database/mockDb.ts`); keine Master-Codes, Seed-Admins oder Test-Konten einführen. Zufallswerte über `generateRandomSecret` (`src/utils/crypto.ts`).

## Prüfen
```bash
npx tsc --noEmit
npx expo lint   # Konfiguration: eslint.config.js
```

## Pre-Push-Workflow
Drei Subagenten in `.claude/agents/`: `struktur-pflege` (Dateistruktur), `doku-pflege` (Dokumentation), `security-audit` (Sicherheitsprüfung). Zusätzlich `ui-ux-designer` (UI/UX-Analyse und Redesign, nicht Teil von `/pre-push`). `/pre-push` (`.claude/commands/pre-push.md`) führt sie nacheinander aus, committet die Pflegeänderungen und schreibt bei PASS/WARN die Freigabe `auswertung-intern/.pre-push-gate`.

- `.claude/hooks/pre-push-gate.sh` (PreToolUse-Hook) blockiert `git push` in Claude Code, solange keine Freigabe für den aktuellen HEAD vorliegt.
- `.githooks/pre-push` scannt die zu pushenden Commits mit Gitleaks (auch außerhalb von Claude Code). Aktivierung pro Clone: `git config core.hooksPath .githooks`; benötigt `brew install gitleaks`.
