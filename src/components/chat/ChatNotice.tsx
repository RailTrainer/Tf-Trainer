import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { Heading } from '../ui/Section';

export interface ChatNoticeProps {
  /** Kurze Überschrift, z. B. „Noch keine Nachrichten“ – ohne Überschrift nur ein Hinweissatz */
  title?: string;
  text: string;
  style?: StyleProp<ViewStyle>;
}

/** Leerzustand bzw. Hinweis in der Liste: Überschrift und höchstens ein Satz, ohne Deko-Icon. */
export function ChatNotice({ title, text, style }: ChatNoticeProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.wrapper, style]}>
      {title ? (
        <Heading level={2} style={styles.title}>
          {title}
        </Heading>
      ) : null}
      <Text style={[styles.text, { color: colors.textMuted }, title ? styles.textAfterTitle : null]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 16,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textAfterTitle: {
    marginTop: 4,
  },
});
