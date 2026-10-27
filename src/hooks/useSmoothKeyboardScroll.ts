import { useRef, useEffect, useCallback } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  type NativeSyntheticEvent,
  type TargetedEvent,
} from 'react-native';

/**
 * Hook für ruckelfreies, präzises Hochwandern von Eingabefeldern über die Tastatur.
 *
 * Verhindert das Hin- und Herspringen durch:
 * 1. Beseitigung von Mehrfach-Timeouts und kaskadierenden scrollTo-Aufrufen.
 * 2. Direkte Vermessung des fokussierten Feldes im Fenster (measureInWindow).
 * 3. Garantiert, dass die letzte Zeile eines Eingabefeldes mit 36px Puffer oberhalb
 *    der Tastaturoberkante liegt.
 */
export function useSmoothKeyboardScroll() {
  const currentScrollY = useRef(0);
  const keyboardHeightRef = useRef(0);
  const isKeyboardVisibleRef = useRef(false);
  const activeTargetRef = useRef<{ target: any; scrollRef: any } | null>(null);

  const checkAndScroll = useCallback((target: any, scrollRef: any) => {
    if (!target || !scrollRef?.current) return;
    if (typeof target.measureInWindow !== 'function') return;

    target.measureInWindow((_x: number, y: number, _w: number, height: number) => {
      if (typeof y !== 'number' || typeof height !== 'number' || height <= 0) return;
      const screenH = Dimensions.get('window').height;
      const kbH = keyboardHeightRef.current > 0
        ? keyboardHeightRef.current
        : (isKeyboardVisibleRef.current ? 320 : 0);
      if (kbH <= 0) return;

      const keyboardTop = screenH - kbH;
      // 36px Puffer unter der letzten Zeile des Feldes
      const targetBottom = y + height + 36;

      if (targetBottom > keyboardTop) {
        const diff = targetBottom - keyboardTop;
        const newY = currentScrollY.current + diff;
        scrollRef.current?.scrollTo({ y: Math.max(0, newY), animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height || 300;
      keyboardHeightRef.current = h;
      isKeyboardVisibleRef.current = true;
      if (activeTargetRef.current) {
        checkAndScroll(activeTargetRef.current.target, activeTargetRef.current.scrollRef);
        // Nach kurzem Intervall nochmals prüfen, falls Tastaturanimation andauert
        setTimeout(() => {
          if (activeTargetRef.current) {
            checkAndScroll(activeTargetRef.current.target, activeTargetRef.current.scrollRef);
          }
        }, 100);
      }
    };

    const onHide = () => {
      keyboardHeightRef.current = 0;
      isKeyboardVisibleRef.current = false;
      activeTargetRef.current = null;
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [checkAndScroll]);

  const onScroll = useCallback((e: any) => {
    const y = e?.nativeEvent?.contentOffset?.y;
    if (typeof y === 'number') {
      currentScrollY.current = y;
    }
  }, []);

  const handleInputFocus = useCallback((event: any, scrollRef: any) => {
    const target = event?.target;
    if (target) {
      activeTargetRef.current = { target, scrollRef };
      checkAndScroll(target, scrollRef);
    }
  }, [checkAndScroll]);

  return {
    onScroll,
    handleInputFocus,
    keyboardHeightRef,
    isKeyboardVisibleRef,
  };
}
