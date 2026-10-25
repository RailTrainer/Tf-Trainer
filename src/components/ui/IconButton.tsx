import type { Ref } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
  type ViewInstance,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { ICON_BUTTON_SIZE, RADIUS } from './tokens';

export interface IconButtonProps {
  icon: LucideIcon;
  /** Pflicht: nennt die Aktion mit Bezug, z. B. „Nachricht von Anna B. löschen“ */
  accessibilityLabel: string;
  onPress: (event: GestureResponderEvent) => void;
  /**
   * `neutral`: Icon in `textMuted` (Standard).
   * `primary`: Icon in `primary`; mit `filled` gefüllter blauer Haupt-Button (z. B. Senden).
   * `danger`: Icon in `errorText` – nur für destruktive Aktionen, kein farbiger Hintergrund.
   */
  tone?: 'neutral' | 'primary' | 'danger';
  /** Gefüllte Fläche in `buttonPrimaryBg` (nur mit `tone="primary"`) */
  filled?: boolean;
  disabled?: boolean;
  /** Ladezustand: gesperrt, Screenreader erhält „busy“ */
  loading?: boolean;
  accessibilityHint?: string;
  /** Öffnet ein Menü/einen Dialog (Web: aria-haspopup) */
  hasPopup?: boolean;
  /** Seitenlänge der Tippfläche, Standard 48 */
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  ref?: Ref<ViewInstance>;
}

/** Hover gibt es nur in React Native Web, daher nicht im nativen Typ. */
function isHovered(state: PressableStateCallbackType): boolean {
  return Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
}

/** Reiner Icon-Button: quadratische Tippfläche (≥ 48), Name über `accessibilityLabel`, kein Text. */
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  tone = 'neutral',
  filled = false,
  disabled = false,
  loading = false,
  accessibilityHint,
  hasPopup = false,
  size = ICON_BUTTON_SIZE,
  iconSize = 22,
  style,
  testID,
  ref,
}: IconButtonProps) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;
  const isFilled = filled && tone === 'primary';

  // aria-haspopup kennt nur React Native Web (nicht im RN-Typ)
  const webPopupProps =
    Platform.OS === 'web' && hasPopup ? ({ 'aria-haspopup': 'dialog' } as unknown as PressableProps) : null;

  const iconColor = isFilled
    ? colors.buttonPrimaryText
    : tone === 'danger'
      ? colors.errorText
      : tone === 'primary'
        ? colors.primary
        : colors.textMuted;

  return (
    <Pressable
      ref={ref}
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      // Nativ über accessibilityState, im Web über aria-* (RN Web kennt accessibilityState nicht)
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...webPopupProps}
      style={(state) => {
        const active = (state.pressed || isHovered(state)) && !isDisabled;
        return [
          styles.base,
          { width: size, height: size },
          isFilled
            ? { backgroundColor: active ? colors.buttonPrimaryPressedBg : colors.buttonPrimaryBg }
            : active
              ? { backgroundColor: colors.buttonSecondaryPressedBg }
              : null,
          disabled && styles.disabled,
          style,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View aria-hidden>
          <Icon size={iconSize} color={iconColor} strokeWidth={2.25} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
