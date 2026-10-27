import { useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  type ViewInstance,
} from 'react-native';

export interface AppKeyboardPaneProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraOffset?: number;
  enabled?: boolean;
}

/**
 * Universelle Tastaturfixierung (nach dem bewährten Vorbild aus dem Chatbereich).
 * Hält ScrollViews, Formulare und Eingabeleisten bündig und zuverlässig über der Tastatur.
 *
 * iOS und Android: Integriertes KeyboardAvoidingView mit behavior="padding".
 * Der Versatz (keyboardVerticalOffset) wird dynamisch über die tatsächliche
 * Fensterposition des Bereichs (onLayout / measure) ermittelt statt geschätzt.
 * extraOffset ist standardmäßig 0, sodass keine störende Lücke (grauer Balken)
 * zwischen Eingabeleiste und Tastatur entsteht.
 */
export function AppKeyboardPane({
  children,
  style,
  contentContainerStyle,
  extraOffset = 0,
  enabled = true,
}: AppKeyboardPaneProps) {
  const wrapperRef = useRef<ViewInstance>(null);
  const [offset, setOffset] = useState(0);
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  const updateOffset = () => {
    const node = wrapperRef.current;
    if (!node) return;
    const apply = (y: number) => {
      const finalY = Math.max(0, (y || 0) + extraOffset);
      setOffset((prev) => (Math.abs(prev - finalY) > 2 ? finalY : prev));
    };
    if (Platform.OS === 'ios') {
      node.measureInWindow((_x, y) => apply(y));
    } else if (Platform.OS === 'android') {
      node.measure((_x, _y, _width, _height, _pageX, pageY) => apply(pageY));
    }
  };

  if (!enabled || !isNative) {
    return <View style={[styles.flex, style]}>{children}</View>;
  }

  return (
    <View
      ref={wrapperRef}
      style={[styles.flex, style]}
      onLayout={updateOffset}
    >
      <KeyboardAvoidingView
        style={[styles.flex, contentContainerStyle]}
        behavior="padding"
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
