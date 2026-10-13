<#
.SYNOPSIS
    Antigravity Auto-Approve Daemon
    Drückt automatisch auf Bestätigungs-Buttons ("OK", "Proceed", "Allow", "Run", etc.),
    wenn Antigravity eine Aufforderung anzeigt.

.DESCRIPTION
    Dieses Skript nutzt Windows UI Automation, um im Hintergrund nach Dialogen und Aufforderungen
    von Antigravity zu suchen und diese automatisch zu bestätigen.
    Es funktioniert nativ auf Windows ohne zusätzliche Software.

.USAGE
    powershell -ExecutionPolicy Bypass -File .\auto_approve_antigravity.ps1
#>

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

# Liste von Button-Texten, die automatisch bestätigt werden sollen
$targetButtonTexts = @(
    "OK",
    "Proceed",
    "Allow",
    "Always Allow",
    "Run",
    "Run Command",
    "Ausführen",
    "Erlauben",
    "Immer erlauben",
    "Yes",
    "Ja",
    "Approve",
    "Genehmigen",
    "Fortfahren",
    "Accept",
    "Akzeptieren",
    "Confirm",
    "Bestätigen"
)

# Suchbegriffe für Prozesse und Fenster
$targetPatterns = @("*antigravity*", "*code*", "*electron*")

Clear-Host
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "     Antigravity Auto-Approve Daemon (Automatische Bestätigung) " -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Status: Aktiv - Überwacht Antigravity auf Dialoge & Aufforderungen" -ForegroundColor White
Write-Host "Gefilterte Buttons: $($targetButtonTexts -join ', ')" -ForegroundColor Gray
Write-Host "Beenden: Drücken Sie [Strg] + [C] im Terminal" -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------" -ForegroundColor DarkGray

$buttonCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button
)

$lastClickTime = [DateTime]::MinValue
$clickCooldownSeconds = 1.0

while ($true) {
    try {
        # 1. Relevante Prozesse finden
        $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object {
            $name = $_.ProcessName.ToLower()
            $title = $_.MainWindowTitle.ToLower()
            
            ($name -like "*antigravity*" -or $title -like "*antigravity*") -and $_.MainWindowHandle -ne 0
        }

        # Falls kein expliziter "Antigravity"-Prozess gefunden wird (z.B. wenn es als VS Code / Code läuft)
        if (-not $procs) {
            $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object {
                $title = $_.MainWindowTitle.ToLower()
                ($title -like "*antigravity*" -or $title -like "*gemini*") -and $_.MainWindowHandle -ne 0
            }
        }

        # Falls Antigravity gerade offen ist:
        foreach ($proc in $procs) {
            $handle = $proc.MainWindowHandle
            if ($handle -eq 0) { continue }

            $windowElement = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
            if ($null -eq $windowElement) { continue }

            # Nach allen Buttons im Fenster suchen
            $buttons = $windowElement.FindAll(
                [System.Windows.Automation.TreeScope]::Descendants,
                $buttonCondition
            )

            foreach ($btn in $buttons) {
                try {
                    $btnName = $btn.Current.Name
                    if ([string]::IsNullOrWhiteSpace($btnName)) { continue }

                    # Prüfen, ob der Button aktiviert ist
                    if (-not $btn.Current.IsEnabled) { continue }

                    # Prüfen, ob der Name mit einem der Ziel-Texte übereinstimmt
                    $matched = $false
                    foreach ($text in $targetButtonTexts) {
                        if ($btnName.Trim() -eq $text -or $btnName.Trim() -like "$text*") {
                            $matched = $true
                            break
                        }
                    }

                    if ($matched) {
                        $now = [DateTime]::Now
                        if (($now - $lastClickTime).TotalSeconds -ge $clickCooldownSeconds) {
                            $pattern = $null
                            if ($btn.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
                                $pattern.Invoke()
                                $lastClickTime = $now
                                $timeStr = $now.ToString("HH:mm:ss")
                                Write-Host "[$timeStr] [BESTÄTIGT] '$btnName' erfolgreich geklickt (Prozess: $($proc.ProcessName))" -ForegroundColor Green
                            }
                        }
                    }
                } catch {
                    # Fehler bei dynamisch verschwindenden Elementen abfangen
                }
            }
        }

        # 2. Prüfen auf eigenständige modale Windows-Dialogfenster (#32770 / MessageBox)
        $root = [System.Windows.Automation.AutomationElement]::RootElement
        $dialogCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Window
        )
        $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $dialogCondition)

        foreach ($win in $windows) {
            try {
                $winTitle = $win.Current.Name
                # Dialoge, die zu Antigravity gehören oder Bestätigungsdialoge sind
                if ($winTitle -like "*Antigravity*" -or $winTitle -like "*Aufforderung*" -or $winTitle -like "*Confirmation*" -or $winTitle -like "*Permission*") {
                    $dialogButtons = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition)
                    foreach ($dBtn in $dialogButtons) {
                        $dBtnName = $dBtn.Current.Name
                        foreach ($text in $targetButtonTexts) {
                            if ($dBtnName.Trim() -eq $text -and $dBtn.Current.IsEnabled) {
                                $pattern = $null
                                if ($dBtn.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
                                    $pattern.Invoke()
                                    $now = [DateTime]::Now
                                    $timeStr = $now.ToString("HH:mm:ss")
                                    Write-Host "[$timeStr] [DIALOG BESTÄTIGT] '$dBtnName' in Dialog '$winTitle' geklickt" -ForegroundColor Green
                                }
                            }
                        }
                    }
                }
            } catch {
                # Fenster hat sich evtl. bereits geschlossen
            }
        }

    } catch {
        # Unerwartete Fehler abfangen und Loop fortsetzen
    }

    Start-Sleep -Milliseconds 800
}
