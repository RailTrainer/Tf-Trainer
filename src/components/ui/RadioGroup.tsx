import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Name der Gruppe für Screenreader, z. B. „Grund der Meldung“ */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/** Senkrechte Auswahl mit Radio-Kreisen (Rolle „radiogroup“/„radio“), jede Zeile ≥ 48 px. */
export function RadioGroup({ options, value, onChange, accessibilityLabel, style }: RadioGroupProps) {
  const { colors } = useAppTheme();

  return (
    <View role="radiogroup" accessibilityLabel={accessibilityLabel} style={style}>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked }}
            aria-checked={checked}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.buttonSecondaryPressedBg }]}
          >
            <View
              aria-hidden
              style={[styles.circle, { borderColor: checked ? colors.primary : colors.fieldBorder }]}
            >
              {checked ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
            </View>
            <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});
