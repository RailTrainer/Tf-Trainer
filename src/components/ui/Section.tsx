import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

type HeadingLevel = 1 | 2 | 3;

export interface HeadingProps {
  children: ReactNode;
  /**
   * Gliederungsebene. Der Navigations-Header ist im Web bereits h1,
   * Sektionen im Screen sind daher Ebene 2, Unterpunkte Ebene 3.
   */
  level?: HeadingLevel;
  style?: StyleProp<TextStyle>;
}

/** Überschrift mit Rolle „header“ (nativ) bzw. h2/h3 (Web). */
export function Heading({ children, level = 2, style }: HeadingProps) {
  const { colors } = useAppTheme();
  // aria-level kennt nur React Native Web; nativ reicht die Rolle „header“.
  const webLevel = Platform.OS === 'web' ? ({ 'aria-level': level } as unknown as TextProps) : null;

  return (
    <Text
      accessibilityRole="header"
      {...webLevel}
      style={[level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3, { color: colors.text }, style]}
    >
      {children}
    </Text>
  );
}

export interface SectionProps {
  /** Sichtbare Sektionsüberschrift (Ebene 2) */
  title: string;
  /** Höchstens ein Satz Einleitung */
  description?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Benannte Sektion eines Screens: Überschrift, optional ein Satz, dann Inhalt. Keine Karte, kein eigener Hintergrund. */
export function Section({ title, description, children, style }: SectionProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.section, style]}>
      <Heading level={2}>{title}</Heading>
      {description ? <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  h3: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  section: {
    marginTop: 32,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  content: {
    marginTop: 12,
  },
});
