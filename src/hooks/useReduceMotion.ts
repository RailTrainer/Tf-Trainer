import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Systemeinstellung „Bewegung reduzieren“ (iOS, Android, Web über prefers-reduced-motion).
 * Reagiert auf Änderungen zur Laufzeit. Bis zur ersten Antwort wird `false` angenommen.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}
