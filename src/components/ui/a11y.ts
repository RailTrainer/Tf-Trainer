import { AccessibilityInfo, Platform, type HostInstance } from 'react-native';

/** Element, das Fokus aufnehmen kann: im Web das DOM-Element, nativ die Host-Komponente. */
type FocusTarget = HostInstance | { focus?: () => void } | null | undefined;

/**
 * Setzt Tastatur- (Web) bzw. Screenreader-Fokus (nativ) auf ein Element, z. B. nach dem Schließen
 * eines Dialogs oder beim Öffnen einer Ansicht. Kurze Verzögerung, damit Modals/Layout fertig sind.
 */
export function moveFocusTo(target: FocusTarget, delayMs = 0) {
  if (!target) return;
  setTimeout(() => {
    if (Platform.OS === 'web') {
      (target as { focus?: () => void }).focus?.();
      return;
    }
    try {
      AccessibilityInfo.sendAccessibilityEvent(target as HostInstance, 'focus');
    } catch {
      // Element ist nicht mehr eingehängt – Fokus bleibt, wo er ist.
    }
  }, delayMs);
}

/** Kurze Ansage für Screenreader auf iOS und Android (Web: siehe `LiveAnnouncer`). */
export function announce(message: string) {
  if (Platform.OS !== 'web' && message) {
    AccessibilityInfo.announceForAccessibility(message);
  }
}
