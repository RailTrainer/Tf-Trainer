import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronDown, ChevronRight, ChevronUp, type LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';

export interface ListRowProps {
  /** Sichtbarer Titel, zugleich Name für Screenreader */
  title: string;
  /** Kurzer Zusatz unter dem Titel (gedämpft) */
  description?: string | null;
  /** Icon links (rein dekorativ) */
  icon?: LucideIcon;
  /** Ohne `onPress` ist die Zeile eine reine Anzeige */
  onPress?: () => void;
  /** Wert rechts, z. B. Anzahl */
  value?: string;
  /** Pfeil rechts: Zeile öffnet eine andere Ansicht */
  showChevron?: boolean;
  /** Schalter-Zeile: aktueller Zustand. Die ganze Zeile schaltet um (Rolle „switch“). */
  switchValue?: boolean;
  /** Aufklapp-Zeile: aktueller Zustand (Rolle „button“ mit aria-expanded) */
  expanded?: boolean;
  /** Standard „button“; „link“ für Zeilen, die eine Webseite/E-Mail öffnen */
  role?: 'button' | 'link';
  /** Ladezustand: Zeile gesperrt, Spinner rechts, Screenreader erhält „busy“ */
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Trennlinie oben (Standard: an) */
  divider?: boolean;
  /** Trennlinie unten – für die letzte Zeile einer Gruppe */
  dividerBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Hover gibt es nur in React Native Web, daher nicht im nativen Typ. */
function isHovered(state: PressableStateCallbackType): boolean {
  return Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
}

/** Listen-/Einstellungszeile: Icon, Titel, Beschreibung und rechts Pfeil, Wert, Schalter oder Aufklapp-Pfeil. */
export function ListRow({
  title,
  description,
  icon: Icon,
  onPress,
  value,
  showChevron = false,
  switchValue,
  expanded,
  role = 'button',
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  divider = true,
  dividerBottom = false,
  style,
}: ListRowProps) {
  const { colors } = useAppTheme();
  const isSwitch = switchValue !== undefined;
  const isDisclosure = expanded !== undefined;
  const isDisabled = disabled || loading;

  const content = (
    <>
      {Icon ? (
        <View aria-hidden style={description ? styles.iconTop : undefined}>
          <Icon size={22} color={colors.textMuted} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {description ? (
          <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
        ) : null}
      </View>
      {value ? <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text> : null}
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      {isSwitch ? (
        <View
          aria-hidden
          style={[
            styles.switchTrack,
            { backgroundColor: switchValue ? colors.buttonPrimaryBg : colors.fieldBorder },
            switchValue ? styles.switchTrackOn : null,
          ]}
        >
          <View style={styles.switchThumb} />
        </View>
      ) : null}
      {isDisclosure ? (
        <View aria-hidden>
          {expanded ? (
            <ChevronUp size={22} color={colors.textMuted} />
          ) : (
            <ChevronDown size={22} color={colors.textMuted} />
          )}
        </View>
      ) : null}
      {showChevron && !isDisclosure ? (
        <View aria-hidden>
          <ChevronRight size={22} color={colors.textMuted} />
        </View>
      ) : null}
    </>
  );

  const frameStyle = [
    styles.row,
    divider ? { borderTopWidth: 1, borderTopColor: colors.border } : null,
    dividerBottom ? { borderBottomWidth: 1, borderBottomColor: colors.border } : null,
  ];

  if (!onPress) {
    return <View style={[frameStyle, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole={isSwitch ? 'switch' : role}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      // Nativ über accessibilityState, im Web über aria-* (RN Web kennt accessibilityState nicht)
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
        checked: isSwitch ? switchValue : undefined,
        expanded: isDisclosure ? expanded : undefined,
      }}
      aria-busy={loading}
      aria-disabled={isDisabled}
      aria-checked={isSwitch ? switchValue : undefined}
      aria-expanded={isDisclosure ? expanded : undefined}
      style={(state) => [
        frameStyle,
        (state.pressed || isHovered(state)) && !isDisabled
          ? { backgroundColor: colors.buttonSecondaryPressedBg }
          : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    // Druckfläche etwas breiter als der Text, damit die Hervorhebung nicht am Text klebt
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  iconTop: {
    alignSelf: 'flex-start',
    paddingTop: 1,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  switchTrack: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  switchTrackOn: {
    alignItems: 'flex-end',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
  },
  disabled: {
    opacity: 0.5,
  },
});
