---
description: Führt die drei Pre-Push-Agenten aus (Struktur → Doku → Security), committet deren Änderungen und gibt den Push frei
argument-hint: "[push]  – mit 'push' wird nach erfolgreichem Audit direkt gepusht"
---

Führe die Pre-Push-Pipeline für dieses Repository aus. Halte dich exakt an die Reihenfolge – jeder Schritt baut auf dem vorherigen auf.

## 0. Vorbedingungen
- `git status --porcelain` muss leer sein (ignorierte Dateien zählen nicht). Sind uncommittete Änderungen vorhanden: **abbrechen** und den Nutzer bitten, erst zu committen oder zu stashen – sonst würden fremde Änderungen im Pflege-Commit landen.
- `mkdir -p auswertung-intern` und alte Freigabe entfernen: `rm -f auswertung-intern/.pre-push-gate`.

## 1. Struktur
Starte den Subagenten `struktur-pflege`. Warte auf sein Ergebnis. Meldet er eine Verifikations-Regression, die er nicht zurückgedreht hat: abbrechen und berichten.

## 2. Dokumentation
Starte danach den Subagenten `doku-pflege` (er dokumentiert die ggf. neue Struktur).

## 3. Pflege-Commit
Wenn `git status --porcelain` jetzt Änderungen zeigt: Diff kurz prüfen (`git diff --stat`, `git status`), dann alles stagen und committen:
`chore: Pre-Push-Pflege (Struktur & Dokumentation)` – im Body die verschobenen Dateien und geänderten Docs stichpunktartig.
Prüfe vor dem Commit, dass nichts aus `auswertung-intern/` gestaged ist.

## 4. Security
Starte erst jetzt den Subagenten `security-audit` – er prüft den finalen Stand inklusive Pflege-Commit.

## 5. Freigabe
- Urteil **PASS** oder **WARN** und `Geprüfter HEAD` == `git rev-parse HEAD`: schreibe die Freigabe
  `git rev-parse HEAD > auswertung-intern/.pre-push-gate`
- Urteil **BLOCK**: keine Freigabe. Blocker auflisten, nichts pushen.

## 6. Abschluss
Kurze Zusammenfassung an den Nutzer: je Agent eine Zeile (Ergebnis + Pfad zum Bericht in `auswertung-intern/`), bei WARN die wichtigsten Warnungen.
Falls `$ARGUMENTS` „push“ enthält und die Freigabe geschrieben wurde: `git push` (beim ersten Push des Branches `git push -u origin <branch>`).
