import { useId, useState, type Ref } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { RADIUS } from './tokens';

export interface TextFieldProps
  extends Omit<TextInputProps, 'style' | 'secureTextEntry' | 'placeholderTextColor' | 'accessibilityLabel'> {
  /** Sichtbares Label über dem Feld, zugleich Name für Screenreader */
  label: string;
  /** Icon links im Feld (rein dekorativ) */
  icon?: LucideIcon;
  /** Fehlertext unter dem Feld; färbt Rahmen und Icon rot */
  error?: string | null;
  /** Dauerhafter Hinweis unter dem Feld, z. B. „Mindestens 6 Zeichen“ */
  hint?: string;
  /** Passwortfeld mit Auge-Button zum Ein-/Ausblenden */
  password?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
}

// Browser-Fokusrahmen am <input> unterdrücken – der Feldrahmen zeigt den Fokus (2 px).
// 'none' fehlt im RN-Typ für outlineStyle, daher der Cast; nativ ohne Wirkung.
const webInputReset = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export function TextField({
  label,
  icon: Icon,
  error,
  hint,
  password = false,
  containerStyle,
  ref,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const messageId = `${useId()}-message`;

  const message = error || hint;
  const hasError = Boolean(error);
  // Mehrzeilige Felder (z. B. Beschreibung): Icon und Text oben ausrichten, mehr Höhe
  const isMultiline = Boolean(inputProps.multiline);
  const accentColor = hasError ? colors.errorText : focused ? colors.primary : colors.fieldBorder;
  const iconColor = hasError ? colors.errorText : focused ? colors.primary : colors.textMuted;

  // Im Web Fehler/Hinweis per aria-describedby verknüpfen; nativ übernimmt das accessibilityHint.
  const webA11yProps =
    Platform.OS === 'web'
      ? { 'aria-describedby': message ? messageId : undefined, 'aria-invalid': hasError }
      : null;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Das Label steckt zusätzlich im accessibilityLabel des Feldes, daher hier verborgen, um Doppelansagen zu vermeiden. */}
      <Text aria-hidden style={[styles.label, { color: colors.text }]}>
        {label}
      </Text>
      <View
        style={[
          styles.box,
          isMultiline && styles.boxMultiline,
          {
            borderColor: accentColor,
            backgroundColor: colors.inputBg,
            // Fokus = 2 px Rahmen (Farbe zeigt den Zustand); Innenabstand gleicht aus, damit nichts springt.
            borderWidth: focused ? 2 : 1,
            paddingHorizontal: focused ? 13 : 14,
          },
        ]}
      >
        {Icon ? (
          <View aria-hidden style={isMultiline ? styles.iconMultiline : undefined}>
            <Icon size={20} color={iconColor} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          {...inputProps}
          {...webA11yProps}
          secureTextEntry={password && !revealed}
          accessibilityLabel={label}
          accessibilityHint={message || undefined}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, isMultiline && styles.inputMultiline, { color: colors.text }, webInputReset]}
        />
        {password ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Passwort verbergen' : 'Passwort anzeigen'}
            style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}
          >
            {revealed ? <EyeOff size={22} color={colors.textMuted} /> : <Eye size={22} color={colors.textMuted} />}
          </Pressable>
        ) : null}
      </View>
      {message ? (
        <Text
          nativeID={messageId}
          accessibilityLiveRegion={hasError ? 'polite' : 'none'}
          style={[styles.message, { color: hasError ? colors.errorText : colors.textMuted }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  box: {
    minHeight: 52,
    borderRadius: RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boxMultiline: {
    alignItems: 'flex-start',
  },
  iconMultiline: {
    paddingTop: 15,
  },
  input: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    fontSize: 17,
    paddingVertical: 12,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  eyeButton: {
    width: 44,
    height: 44,
    marginRight: -8,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeButtonPressed: {
    opacity: 0.6,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 6,
  },
});
