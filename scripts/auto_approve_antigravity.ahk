; ==============================================================================
; Antigravity Auto-Approve (AutoHotkey v2)
; Klickt automatisch auf OK, Proceed, Allow, etc., wenn Antigravity danach fragt.
; ==============================================================================
#Requires AutoHotkey v2.0
#SingleInstance Force

TrayTip("Antigravity Auto-Approve", "Skript laeuft im Hintergrund. Beenden im Tray-Menue.")

SetTimer(CheckAndApprove, 500)

CheckAndApprove() {
    ; Pruefe auf Standard-Windows-Dialoge oder Antigravity-Fenster
    if WinExist("ahk_exe Antigravity.exe") or WinExist("ahk_exe Code.exe") or WinExist("Antigravity") {
        ; Buttons, die automatisch betaetigt werden sollen
        buttons := ["OK", "Proceed", "Allow", "Always Allow", "Run", "Erlauben", "Ausfuehren", "Yes", "Ja"]
        
        for index, btnText in buttons {
            try {
                if ControlGetVisible(btnText) and ControlGetEnabled(btnText) {
                    ControlClick(btnText)
                    SoundBeep(750, 100) ; Kurzer Signalton bei Bestaetigung
                    break
                }
            }
        }
    }
}
