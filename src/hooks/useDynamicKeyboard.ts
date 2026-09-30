import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Hook für dynamische Tastatur-Verschiebung wie im Chat.
 * Reagiert auf Tastatur-Events (iOS & Android) und berechnet den exakten
 * unteren Innenabstand (Padding), sodass Eingabefelder immer sichtbar bleiben.
 * 
 * @param extraPadding Zusätzlicher Puffer für Tastatur-Toolbars (Standard: 80)
 */
export function useDynamicKeyboard(extraPadding: number = 100) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height;
      const finalH = (typeof h === 'number' && h > 0) ? h : 280;
      setKeyboardHeight(finalH);
      setIsKeyboardVisible(true);
    };

    const onHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );
    const showSubWill = Platform.OS === 'android' ? Keyboard.addListener('keyboardWillShow', onShow) : null;
    const hideSubWill = Platform.OS === 'android' ? Keyboard.addListener('keyboardWillHide', onHide) : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      showSubWill?.remove();
      hideSubWill?.remove();
    };
  }, []);

  // Auf Android mit softwareKeyboardLayoutMode: "resize" verkleinert das System das Fenster bereits automatisch.
  // Daher darf auf Android nicht nochmals keyboardHeight als Padding addiert werden, da sonst ein riesiger grauer Leerraum entsteht.
  // Auf iOS verkleinert das System das Fenster nicht, dort wird keyboardHeight benötigt.
  const dynamicKeyboardPadding = keyboardHeight > 0 
    ? (Platform.OS === 'ios' ? keyboardHeight + extraPadding : extraPadding)
    : 0;

  return { keyboardHeight, isKeyboardVisible, dynamicKeyboardPadding };
}
