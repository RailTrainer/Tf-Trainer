import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { CountBadge } from './CountBadge';
import { SCREEN_PADDING } from './tokens';

export interface TabItem {
  key: string;
  /** Sichtbarer Text */
  label: string;
  /** Zähler rechts neben dem Text (z. B. ungelesen); 0/undefined = keiner */
  count?: number;
  /** Bedeutung des Zählers für Screenreader, Standard „ungelesen“ */
  countLabel?: string;
}

export interface TabsProps {
  items: TabItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  /** Name der Tab-Leiste für Screenreader, z. B. „Kanäle“ */
  accessibilityLabel: string;
  /** Waagerecht scrollbar (viele Einträge); sonst teilen sich die Tabs die Breite */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Hover gibt es nur in React Native Web, daher nicht im nativen Typ. */
function isHovered(state: PressableStateCallbackType): boolean {
  return Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
}

/** Spricht Text und Zähler zusammen: „Signale, 3 ungelesen“. */
export function tabAccessibilityLabel(item: TabItem): string {
  return item.count ? `${item.label}, ${item.count} ${item.countLabel ?? 'ungelesen'}` : item.label;
}

/**
 * Tab-Leiste mit Unterstrich (Rolle „tablist“/„tab“, Auswahl über `selected`).
 * Zähler in Blau, Ungelesen nie nur über Farbe.
 */
export function Tabs({ items, selectedKey, onSelect, accessibilityLabel, scrollable: scrollableProp = false, style }: TabsProps) {
  const { colors } = useAppTheme();
  // Große Systemschrift: lange Einzelwörter („Ausbilderchat“) passen nicht in halbe Breite – dann scrollen statt abschneiden.
  const { fontScale } = useWindowDimensions();
  const scrollable = scrollableProp || fontScale > 1.3;
  // aria-orientation kennt nur React Native Web
  const webListProps = Platform.OS === 'web' ? ({ 'aria-orientation': 'horizontal' } as unknown as ViewProps) : null;

  const tabs = items.map((item) => {
    const selected = item.key === selectedKey;
    return (
      <Pressable
        key={item.key}
        onPress={() => onSelect(item.key)}
        accessibilityRole="tab"
        accessibilityLabel={tabAccessibilityLabel(item)}
        accessibilityState={{ selected }}
        aria-selected={selected}
        style={(state) => [
          styles.tab,
          !scrollable && styles.tabFill,
          (state.pressed || isHovered(state)) && !selected ? { backgroundColor: colors.buttonSecondaryPressedBg } : null,
        ]}
      >
        <Text
          style={[
            styles.label,
            { color: selected ? colors.text : colors.textMuted, fontWeight: selected ? '600' : '500' },
          ]}
        >
          {item.label}
        </Text>
        {item.count ? <CountBadge value={item.count} /> : null}
        {selected ? <View aria-hidden style={[styles.indicator, { backgroundColor: colors.buttonPrimaryBg }]} /> : null}
      </Pressable>
    );
  });

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      {...webListProps}
      style={[styles.bar, { borderBottomColor: colors.border }, style]}
    >
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {tabs}
        </ScrollView>
      ) : (
        <View style={styles.row}>{tabs}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING - 12,
    gap: 4,
  },
  tab: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabFill: {
    flex: 1,
  },
  label: {
    // Bei großer Systemschrift umbrechen statt abschneiden
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
});
