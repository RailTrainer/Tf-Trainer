import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeColors {
  background: string;
  cardBg: string;
  text: string;
  textMuted: string;
  primary: string;
  border: string;
  accentBg: string;
  accentText: string;
  successBg: string;
  successText: string;
  errorBg: string;
  errorText: string;
  warningBg: string;
  warningText: string;
  inputBg: string;
  inputBorder: string;
  tabBarBg: string;
  tabBarBorder: string;
  /** Feldrahmen der UI-Bausteine (src/components/ui), Kontrast ≥ 3:1 zum Hintergrund */
  fieldBorder: string;
  /** Haupt-Button (CTA): Hintergrund, gedrückt und Schrift, Kontrast Schrift ≥ 4,5:1 */
  buttonPrimaryBg: string;
  buttonPrimaryPressedBg: string;
  buttonPrimaryText: string;
  /** Zweit-Button (Rahmen): Hintergrund beim Drücken/Hover, Schrift bleibt ≥ 4,5:1 */
  buttonSecondaryPressedBg: string;
  /** Destruktiver Button (z. B. Konto löschen): Hintergrund, gedrückt und Schrift, Kontrast Schrift ≥ 4,5:1 */
  buttonDestructiveBg: string;
  buttonDestructivePressedBg: string;
  buttonDestructiveText: string;
  /** Ruhige Fläche auf dem Screen-Hintergrund, z. B. Chat-Blasen anderer; Text darauf: `text` bzw. `textMuted` (≥ 4,5:1) */
  surfaceSubtle: string;
}

export const themePalette: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    background: '#f8fafc',
    cardBg: '#ffffff',
    text: '#0f172a',
    textMuted: '#475569',
    primary: '#2563eb',
    border: '#e2e8f0',
    accentBg: '#dbeafe',
    accentText: '#1e40af',
    successBg: '#dcfce7',
    successText: '#15803d',
    errorBg: '#fee2e2',
    errorText: '#b91c1c',
    warningBg: '#fef3c7',
    warningText: '#b45309',
    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',
    tabBarBg: '#ffffff',
    tabBarBorder: '#e2e8f0',
    fieldBorder: '#7c8799',
    buttonPrimaryBg: '#2563eb',
    buttonPrimaryPressedBg: '#1d4ed8',
    buttonPrimaryText: '#ffffff',
    buttonSecondaryPressedBg: '#f1f5f9',
    buttonDestructiveBg: '#b91c1c',
    buttonDestructivePressedBg: '#991b1b',
    buttonDestructiveText: '#ffffff',
    surfaceSubtle: '#f1f5f9',
  },
  dark: {
    background: '#111827',
    cardBg: '#1f2937',
    text: '#ffffff',
    textMuted: '#9ca3af',
    primary: '#60a5fa',
    border: '#374151',
    accentBg: '#1e3a8a',
    accentText: '#93c5fd',
    successBg: '#064e3b',
    successText: '#34d399',
    errorBg: '#7f1d1d',
    errorText: '#f87171',
    warningBg: '#78350f',
    warningText: '#fde68a',
    inputBg: '#111827',
    inputBorder: '#374151',
    tabBarBg: '#111827',
    tabBarBorder: '#1f2937',
    fieldBorder: '#6b7280',
    buttonPrimaryBg: '#2563eb',
    buttonPrimaryPressedBg: '#1d4ed8',
    buttonPrimaryText: '#ffffff',
    buttonSecondaryPressedBg: '#1f2937',
    buttonDestructiveBg: '#dc2626',
    buttonDestructivePressedBg: '#b91c1c',
    buttonDestructiveText: '#ffffff',
    surfaceSubtle: '#1f2937',
  },
};

interface ThemeContextType {
  themePreference: ThemePreference;
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@railtrainer_theme_preference';

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'light',
  colorScheme: 'light',
  isDark: false,
  colors: themePalette.light,
  setThemePreference: async () => {},
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('light');

  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemePreferenceState(stored);
        } else {
          // Standard beim ersten Start: Heller Modus
          setThemePreferenceState('light');
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    };
    loadStoredTheme();
  }, []);

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const resolvedScheme: 'light' | 'dark' =
    themePreference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;

  const isDark = resolvedScheme === 'dark';
  const colors = isDark ? themePalette.dark : themePalette.light;

  const toggleTheme = async () => {
    const nextTheme: ThemePreference = isDark ? 'light' : 'dark';
    await setThemePreference(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        colorScheme: resolvedScheme,
        isDark,
        colors,
        setThemePreference,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useContext(ThemeContext);
  return colorScheme;
}
