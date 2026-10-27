import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Hook für Tastatur-Status (isKeyboardVisible, keyboardHeight).
 * Hinweis: Für die visuelle Tastatur-Vermeidung von Ansichten wird empfohlen,
 * stattdessen die AppKeyboardPane-Komponente zu verwenden (nach dem Vorbild des Chats).
 */
export function useDynamicKeyboard(extraPadding: number = 0) {
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

  // dynamicKeyboardPadding wird auf 0 belassen, da AppKeyboardPane die Verschiebung passgenau per KeyboardAvoidingView steuert
  const dynamicKeyboardPadding = 0;

  return { keyboardHeight, isKeyboardVisible, dynamicKeyboardPadding };
}
