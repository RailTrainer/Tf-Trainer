import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type StyleProp, type ViewStyle, type ViewInstance } from 'react-native';

export interface ChatKeyboardPaneProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Hält Verlauf und Eingabeleiste über der Tastatur.
 * iOS und Android: eingebautes `KeyboardAvoidingView` mit `padding`. Der Versatz ist die tatsächliche
 * Fensterposition des Bereichs (Header usw.), gemessen statt geschätzt.
 * Android läuft edge-to-edge (`edgeToEdgeEnabled`); dabei verkleinert `adjustResize` das Fenster nicht mehr,
 * die Tastatur liegt also über dem Inhalt. Das `KeyboardAvoidingView` rechnet nur die tatsächliche Überdeckung
 * ein – falls ein Gerät das Fenster doch verkleinert, ist sie 0 und es entsteht keine Lücke.
 * Android misst mit `measure` (pageY) statt `measureInWindow`: Die Tastaturposition kommt in
 * Bildschirmkoordinaten, `measureInWindow` zieht aber je nach Android-Version die Statusleiste ab –
 * die Eingabeleiste läge dann um deren Höhe zu tief.
 * Web: normales View.
 */
export function ChatKeyboardPane({ children, style }: ChatKeyboardPaneProps) {
  const wrapperRef = useRef<ViewInstance>(null);
  const [offset, setOffset] = useState(0);
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  return (
    <View
      ref={wrapperRef}
      style={[styles.flex, style]}
      onLayout={() => {
        const node = wrapperRef.current;
        if (!node) return;
        const apply = (y: number) => setOffset((prev) => (prev === y ? prev : y));
        if (Platform.OS === 'ios') {
          node.measureInWindow((_x, y) => apply(y));
        } else if (Platform.OS === 'android') {
          node.measure((_x, _y, _width, _height, _pageX, pageY) => apply(pageY));
        }
      }}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={isNative ? 'padding' : undefined}
        keyboardVerticalOffset={offset}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
