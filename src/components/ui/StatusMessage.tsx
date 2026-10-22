import { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';

export type StatusTone = 'success' | 'error' | 'info' | 'warning';

export interface Status {
  tone: StatusTone;
  message: string;
  /** Eigenes Icon statt des Standard-Icons der Tonart (z. B. Uhr bei einer Zeitsperre) */
  icon?: LucideIcon;
}

export interface StatusMessageProps {
  /** `null` blendet die Zeile aus; der Live-Bereich bleibt für Screenreader im Baum. */
  status: Status | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Status-, Erfolgs- oder Fehlerzeile im Screen (statt Alert-Popup).
 * Icon + Text, Farbe nie als einziges Merkmal. Web: aria-live, Android: Live-Region, iOS: Ansage.
 */
export function StatusMessage({ status, style }: StatusMessageProps) {
  const { colors } = useAppTheme();
  const message = status?.message ?? null;
  const isError = status?.tone === 'error';

  // iOS liest Live-Regionen nicht vor – dort explizit ansagen.
  useEffect(() => {
    if (message && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);

  const color =
    status?.tone === 'error'
      ? colors.errorText
      : status?.tone === 'success'
        ? colors.successText
        : status?.tone === 'warning'
          ? colors.warningText
          : colors.text;
  const Icon =
    status?.icon ??
    (status?.tone === 'error'
      ? AlertCircle
      : status?.tone === 'success'
        ? CheckCircle2
        : status?.tone === 'warning'
          ? AlertTriangle
          : Info);

  return (
    // Der Container bleibt immer gerendert, damit neue Meldungen als Änderung angesagt werden.
    <View aria-live={isError ? 'assertive' : 'polite'} style={status ? [styles.wrapper, style] : null}>
      {status ? (
        <View style={styles.row}>
          <View aria-hidden style={styles.icon}>
            <Icon size={20} color={color} strokeWidth={2.25} />
          </View>
          <Text style={[styles.text, { color }]}>{status.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  icon: {
    paddingTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
