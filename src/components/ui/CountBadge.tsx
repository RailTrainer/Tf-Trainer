import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { RADIUS } from './tokens';

export interface CountBadgeProps {
  /** Anzahl (ab 100 als „99+“) oder kurzer Text wie „Neu“ */
  value: number | string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Zähler/Markierung in Blau (Kontrast 5,17:1). Rein visuell: Die Anzahl gehört ins
 * `accessibilityLabel` des umgebenden Elements, z. B. „Signale, 3 ungelesen“.
 */
export function CountBadge({ value, style }: CountBadgeProps) {
  const { colors } = useAppTheme();
  const label = typeof value === 'number' ? (value > 99 ? '99+' : String(value)) : value;

  return (
    <View aria-hidden style={[styles.badge, { backgroundColor: colors.buttonPrimaryBg }, style]}>
      <Text maxFontSizeMultiplier={1.6} style={[styles.text, { color: colors.buttonPrimaryText }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    minHeight: 20,
    paddingHorizontal: 6,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
});
