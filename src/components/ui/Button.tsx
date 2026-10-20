import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { RADIUS } from './tokens';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'text';

export interface ButtonProps {
  /** Sichtbarer Text, nennt die Aktion („Anmelden“, „Code senden“) */
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  /**
   * `primary`: gefüllter Haupt-Button (CTA).
   * `secondary`: Rahmen-Button für Nebenaktionen („Abbrechen“, „Abmelden“).
   * `destructive`: gefüllter roter Button, nur für die endgültige Bestätigung (z. B. „Konto endgültig löschen“).
   * `text`: ruhige Textschaltfläche.
   */
  variant?: ButtonVariant;
  /** Nur `secondary`: rote Schrift und roter Rahmen für den Einstieg in eine destruktive Aktion */
  danger?: boolean;
  /** Nur `text`: gedämpfter Text vor dem Titel, z. B. „Noch kein Konto?“ */
  leadingText?: string;
  /** Icon vor dem Text (rein dekorativ) */
  icon?: LucideIcon;
  /** Ladezustand: Button gesperrt, Screenreader erhält „busy“ */
  loading?: boolean;
  /** Text während des Ladens, z. B. „Wird angemeldet …“ (sichtbar und vorgelesen) */
  loadingTitle?: string;
  disabled?: boolean;
  /** Ausrichtung der Textschaltfläche in der Spalte */
  align?: 'start' | 'center' | 'end';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Hover gibt es nur in React Native Web, daher nicht im nativen Typ. */
function isHovered(state: PressableStateCallbackType): boolean {
  return Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  danger = false,
  leadingText,
  icon: Icon,
  loading = false,
  loadingTitle,
  disabled = false,
  align = 'center',
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;
  const visibleTitle = loading && loadingTitle ? loadingTitle : title;
  const spokenLabel =
    loading && loadingTitle
      ? loadingTitle
      : accessibilityLabel ?? (leadingText ? `${leadingText} ${title}` : title);

  const a11yProps = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: spokenLabel,
    accessibilityHint,
    // Nativ über accessibilityState, im Web über aria-busy/aria-disabled (RN Web kennt accessibilityState nicht)
    accessibilityState: { disabled: isDisabled, busy: loading },
    'aria-busy': loading,
    'aria-disabled': isDisabled,
  };

  if (variant === 'text') {
    return (
      <Pressable
        {...a11yProps}
        testID={testID}
        onPress={onPress}
        disabled={isDisabled}
        style={(state) => [
          styles.textButton,
          align === 'start' && styles.alignStart,
          align === 'center' && styles.alignCenter,
          align === 'end' && styles.alignEnd,
          (state.pressed || isHovered(state)) && styles.textButtonActive,
          disabled && styles.disabled,
          style,
        ]}
      >
        {Icon ? (
          <View aria-hidden>
            <Icon size={20} color={colors.primary} strokeWidth={2.25} />
          </View>
        ) : null}
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        <Text style={[styles.textButtonLabel, { color: colors.textMuted }]}>
          {leadingText ? `${leadingText} ` : ''}
          <Text style={[styles.textButtonTitle, { color: colors.primary }]}>{visibleTitle}</Text>
        </Text>
      </Pressable>
    );
  }

  // Farben je Variante: Hintergrund (normal/gedrückt), Schrift und Rahmen
  const palette =
    variant === 'primary'
      ? {
          bg: colors.buttonPrimaryBg,
          activeBg: colors.buttonPrimaryPressedBg,
          fg: colors.buttonPrimaryText,
          border: undefined,
        }
      : variant === 'destructive'
        ? {
            bg: colors.buttonDestructiveBg,
            activeBg: colors.buttonDestructivePressedBg,
            fg: colors.buttonDestructiveText,
            border: undefined,
          }
        : {
            bg: 'transparent',
            activeBg: colors.buttonSecondaryPressedBg,
            fg: danger ? colors.errorText : colors.text,
            border: danger ? colors.errorText : colors.fieldBorder,
          };

  return (
    <Pressable
      {...a11yProps}
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={(state) => [
        styles.solid,
        Icon || loading ? styles.solidWithIcon : null,
        {
          backgroundColor: state.pressed || isHovered(state) ? palette.activeBg : palette.bg,
        },
        palette.border ? { borderWidth: 1, borderColor: palette.border } : null,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : Icon ? (
        <View aria-hidden>
          <Icon size={20} color={palette.fg} strokeWidth={2.25} />
        </View>
      ) : null}
      <Text style={[styles.solidLabel, { color: palette.fg }]}>{visibleTitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  solid: {
    minHeight: 52,
    borderRadius: RADIUS,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  solidWithIcon: {
    paddingHorizontal: 16,
    gap: 8,
  },
  solidLabel: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  textButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  alignStart: {
    alignSelf: 'flex-start',
    marginLeft: -4,
  },
  alignCenter: {
    alignSelf: 'center',
  },
  alignEnd: {
    alignSelf: 'flex-end',
    marginRight: -4,
  },
  textButtonActive: {
    opacity: 0.7,
  },
  textButtonLabel: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  textButtonTitle: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
