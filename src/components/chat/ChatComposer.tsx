import { useState, type Ref } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputKeyPressEvent,
  type TextStyle,
  type TextInputInstance,
} from 'react-native';
import { Camera, Send } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { IconButton } from '../ui/IconButton';
import { RADIUS, SCREEN_PADDING } from '../ui/tokens';

/** Ab dieser Länge wird der Zeichenzähler angezeigt. */
const COUNTER_FROM = 400;

// Browser-Fokusrahmen am Feld unterdrücken – der Feldrahmen zeigt den Fokus (2 px), wie in TextField.
const webInputReset = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Name des Feldes, zugleich Platzhalter, z. B. „Nachricht an Allgemein“ */
  label: string;
  maxLength?: number;
  /** Zeigt den Foto-Button (nur Ausbilderchat für Ausbilder/Mods) */
  onAttach?: () => void;
  attaching?: boolean;
  inputRef?: Ref<TextInputInstance>;
}

/**
 * Eingabeleiste: mehrzeiliges Feld (scrollbar ab ca. 5 Zeilen), Senden als blauer Icon-Button.
 * Web: Enter sendet, Umschalt+Enter fügt eine Zeile ein.
 */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  label,
  maxLength = 500,
  onAttach,
  attaching = false,
  inputRef,
}: ChatComposerProps) {
  const { colors, isDark } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const canSend = value.trim().length > 0;
  const showCounter = value.length >= COUNTER_FROM;
  const counterText = `${value.length} von ${maxLength} Zeichen`;

  const handleKeyPress = (event: TextInputKeyPressEvent) => {
    if (Platform.OS !== 'web') return;
    // RN Web liefert das DOM-Ereignis mit shiftKey, isComposing und preventDefault
    const e = event as unknown as {
      key?: string;
      shiftKey?: boolean;
      nativeEvent: { key: string; isComposing?: boolean };
      preventDefault: () => void;
    };
    if ((e.key ?? e.nativeEvent.key) === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <View
      style={[
        styles.bar,
        { borderTopColor: colors.border, backgroundColor: isDark ? colors.background : colors.cardBg },
      ]}
    >
      <View style={styles.row}>
        {onAttach ? (
          <IconButton icon={Camera} accessibilityLabel="Foto senden" onPress={onAttach} loading={attaching} />
        ) : null}
        <View
          style={[
            styles.field,
            {
              backgroundColor: colors.inputBg,
              borderColor: focused ? colors.primary : colors.fieldBorder,
              // Fokus = 2 px Rahmen; Innenabstand gleicht aus, damit nichts springt
              borderWidth: focused ? 2 : 1,
              paddingHorizontal: focused ? 11 : 12,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={label}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={label}
            accessibilityHint={showCounter ? counterText : undefined}
            multiline
            scrollEnabled
            maxLength={maxLength}
            onKeyPress={handleKeyPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.input, { color: colors.text }, webInputReset]}
          />
        </View>
        <IconButton
          icon={Send}
          tone="primary"
          filled
          accessibilityLabel="Nachricht senden"
          onPress={onSend}
          disabled={!canSend}
        />
      </View>
      {showCounter ? (
        <Text style={[styles.counter, { color: colors.textMuted }]}>{counterText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  field: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: RADIUS,
    justifyContent: 'center',
  },
  input: {
    fontSize: 17,
    lineHeight: 22,
    minHeight: 46,
    maxHeight: 136,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'right',
  },
});
