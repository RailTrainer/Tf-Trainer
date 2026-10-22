import { useEffect } from 'react';
import { Platform, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { announce } from './a11y';

// Unsichtbar, aber für Screenreader vorhanden (Web: „visually hidden“-Muster). 'clip' fehlt im RN-Typ.
const hiddenStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  borderWidth: 0,
  ...(Platform.OS === 'web' ? { clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } : null),
} as unknown as ViewStyle & TextStyle;

/** Text nur für Screenreader im Web (z. B. Absender vor Folge-Nachrichten). Nativ: nichts – dort trägt das `accessibilityLabel`. */
export function VisuallyHiddenText({ children }: { children: string }) {
  if (Platform.OS !== 'web') return null;
  return <Text style={hiddenStyle}>{children}</Text>;
}

export interface LiveAnnouncerProps {
  /** Text der Ansage; `null` = still. Gleicher Text wird über `id` erneut angesagt. */
  message: string | null;
  /** Wechselt bei jeder neuen Ansage, auch wenn der Text gleich bleibt */
  id?: number;
}

/**
 * Höfliche Ansage für Screenreader, ohne sichtbaren Text.
 * Web: verborgener `aria-live="polite"`-Bereich. iOS/Android: `announceForAccessibility`.
 */
export function LiveAnnouncer({ message, id }: LiveAnnouncerProps) {
  useEffect(() => {
    if (message) announce(message);
  }, [message, id]);

  if (Platform.OS !== 'web') return null;
  return (
    <View aria-live="polite" style={hiddenStyle}>
      <Text key={id}>{message ?? ''}</Text>
    </View>
  );
}
