import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { User as UserIcon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';

/** `avatarUrl` enthält entweder eine Bild-URL/URI oder ein Symbol-Zeichen (Nutzerdaten). */
export function isImageUri(uri?: string | null): boolean {
  return Boolean(
    uri &&
      (uri.startsWith('http://') ||
        uri.startsWith('https://') ||
        uri.startsWith('file://') ||
        uri.startsWith('ph://') ||
        uri.startsWith('data:')),
  );
}

export interface AvatarProps {
  /** Bild-URL oder Symbol (aus `User.avatarUrl`) */
  uri?: string | null;
  size?: 32 | 40 | 64;
  /**
   * Name für Screenreader („Profilbild von Anna B.“). Ohne Namen ist der Avatar dekorativ –
   * richtig, wenn der Name direkt daneben steht.
   */
  name?: string;
  style?: StyleProp<ViewStyle>;
}

/** Rundes Profilbild: Foto, Symbol oder Platzhalter-Icon. Ohne Rahmen, Fläche `surfaceSubtle`. */
export function Avatar({ uri, size = 32, name, style }: AvatarProps) {
  const { colors } = useAppTheme();
  const frame = { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceSubtle };
  const a11y = name
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: `Profilbild von ${name}` }
    : { 'aria-hidden': true as const, importantForAccessibility: 'no-hide-descendants' as const };

  return (
    <View {...a11y} style={[styles.frame, frame, style]}>
      {isImageUri(uri) ? (
        <Image source={{ uri: uri as string }} style={styles.image} />
      ) : uri ? (
        // Symbol skaliert nur leicht mit, damit es im Kreis bleibt; der Name daneben skaliert normal.
        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.66) }}>
          {uri}
        </Text>
      ) : (
        <UserIcon size={Math.round(size * 0.55)} color={colors.textMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
