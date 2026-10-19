# Sicherheitsrichtlinie

## Sicherheitslücken melden

Bitte melde Sicherheitslücken nicht öffentlich über Issues. Kontakt: `<SECURITY-KONTAKT – vom Maintainer festzulegen>`.

## Unterstützte Versionen

Unterstützt wird jeweils die aktuelle Version (derzeit 1.1.x, siehe `package.json`) auf dem Branch `main`.

## Umgang mit Secrets

- Keine Secrets, Tokens, Passwörter oder Service-Keys im Repository.
- Lokale Konfiguration gehört in `.env*.local` (gitignored); Build-Secrets in EAS Secrets.
- Signier- und Zugangsdateien (`*.jks`, `*.keystore`, `*.p8`, `*.p12`, `*.key`, `*.pem`, `credentials.json`, `firebase-service-account.json`) sind in `.gitignore` ausgeschlossen.
- Der Supabase-Service-Role-Key darf nie in Client-Code oder Repo gelangen. Im Client ist ausschließlich der öffentliche (publishable/anon) Key vorgesehen.
- Wurde ein Secret versehentlich committet: Secret rotieren, nicht nur entfernen.

## Supabase

Der Zugriff auf Daten muss serverseitig über Row Level Security (RLS) abgesichert sein, da der Client-Key öffentlich ist. Die Policies stehen in `supabase/` (`supabase_schema.sql`, `supabase_web_schema.sql`, `supabase_security_fix.sql`).

## Pre-Push-Gate

- Gitleaks-Scan der zu pushenden Commits über `.githooks/pre-push` (Aktivierung: `git config core.hooksPath .githooks`, benötigt `gitleaks`).
- In Claude Code blockiert ein Hook `git push` ohne vorherigen `/pre-push`-Lauf (inkl. `security-audit`-Agent) für den aktuellen HEAD.
