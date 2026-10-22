import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  type ViewProps,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { CountBadge } from '../ui/CountBadge';
import { Heading } from '../ui/Section';
import { tabAccessibilityLabel, type TabItem } from '../ui/Tabs';

export interface ChannelSidebarProps {
  title: string;
  items: TabItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

/** Hover gibt es nur in React Native Web, daher nicht im nativen Typ. */
function isHovered(state: PressableStateCallbackType): boolean {
  return Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
}

/** Senkrechte Kanalliste für Tablet/Desktop – gleiche Semantik wie die Tab-Leiste am Handy. */
export function ChannelSidebar({ title, items, selectedKey, onSelect }: ChannelSidebarProps) {
  const { colors } = useAppTheme();
  const webListProps = Platform.OS === 'web' ? ({ 'aria-orientation': 'vertical' } as unknown as ViewProps) : null;

  return (
    <View style={[styles.sidebar, { borderRightColor: colors.border }]}>
      <Heading level={2} style={styles.title}>
        {title}
      </Heading>
      <ScrollView>
        <View accessibilityRole="tablist" accessibilityLabel={title} {...webListProps}>
          {items.map((item) => {
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
                  styles.item,
                  selected
                    ? { backgroundColor: colors.accentBg }
                    : state.pressed || isHovered(state)
                      ? { backgroundColor: colors.buttonSecondaryPressedBg }
                      : null,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    { color: selected ? colors.accentText : colors.text, fontWeight: selected || item.count ? '600' : '400' },
                  ]}
                >
                  {item.label}
                </Text>
                {item.count ? <CountBadge value={item.count} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    borderRightWidth: 1,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  item: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});
