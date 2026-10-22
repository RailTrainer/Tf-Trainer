import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export interface ChatKeyboardPaneProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Hält Verlauf und Eingabeleiste über der Tastatur.
 * iOS: eingebautes `KeyboardAvoidingView` mit `padding` (Expo-Doku „Keyboard handling“). Der Versatz ist die
 * tatsächliche Fensterposition des Bereichs (Header usw.), gemessen statt geschätzt.
 * Android: kein zusätzliches Verschieben – `softwareKeyboardLayoutMode: "resize"` (app.json) verkleinert das
 * Fenster bereits; doppeltes Verschieben würde eine Lücke über der Tastatur erzeugen.
 * Web: normales View.
 */
export function ChatKeyboardPane({ children, style }: ChatKeyboardPaneProps) {
  const wrapperRef = useRef<View>(null);
  const [offset, setOffset] = useState(0);

  return (
    <View
      ref={wrapperRef}
      style={[styles.flex, style]}
      onLayout={() => {
        if (Platform.OS !== 'ios') return;
        wrapperRef.current?.measureInWindow((_x, y) => {
          setOffset((prev) => (prev === y ? prev : y));
        });
      }}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
