import { StyleSheet, View } from 'react-native';
import { Ban, Clock } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { StatusMessage } from '../ui/StatusMessage';
import { SCREEN_PADDING } from '../ui/tokens';
import { formatDateTime } from '../../utils/chatFormat';

export interface ChatRestrictionNoticeProps {
  /** Zeitsperre bis (ms) – ohne Wert: dauerhafte Sperre */
  timeoutUntil?: number;
}

/** Ersetzt die Eingabeleiste bei Timeout oder Sperre: Icon und Text statt Platzhalter im gesperrten Feld. */
export function ChatRestrictionNotice({ timeoutUntil }: ChatRestrictionNoticeProps) {
  const { colors, isDark } = useAppTheme();
  const status = timeoutUntil
    ? {
        tone: 'warning' as const,
        icon: Clock,
        message: `Du kannst bis ${formatDateTime(timeoutUntil)} keine Nachrichten senden.`,
      }
    : { tone: 'error' as const, icon: Ban, message: 'Du kannst in diesem Chat keine Nachrichten mehr senden.' };

  return (
    <View
      style={[
        styles.bar,
        { borderTopColor: colors.border, backgroundColor: isDark ? colors.background : colors.cardBg },
      ]}
    >
      <StatusMessage status={status} style={styles.message} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 16,
  },
  message: {
    marginTop: 0,
  },
});
