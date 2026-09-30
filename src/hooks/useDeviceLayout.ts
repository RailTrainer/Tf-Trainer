import { useMemo } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import * as Device from 'expo-device';

export interface DeviceLayout {
  /** Gibt an, ob das Gerät ein Tablet ist (Hardware oder Bildschirmdiagonale >= 580dp) */
  isTablet: boolean;
  /** Querformat aktiv */
  isLandscape: boolean;
  /** Hochformat aktiv */
  isPortrait: boolean;
  /** Tablet im Querformat (Landscape) */
  isLandscapeTablet: boolean;
  /** Tablet im Hochformat (Portrait) */
  isPortraitTablet: boolean;
  /** Aktuelle Bildschirmbreite in dp */
  width: number;
  /** Aktuelle Bildschirmhöhe in dp */
  height: number;
  /** Kleinere Kante des Bildschirms */
  minDimension: number;
  /** Größere Kante des Bildschirms */
  maxDimension: number;
  /** Empfohlene Spaltenanzahl für Listen und Grids (1 auf Phone, 2 im Tablet-Portrait, 3-4 im Tablet-Landscape) */
  columns: number;
  /** Maximale Inhaltsbreite für zentrierte Container zur Vermeidung von unnatürlicher Streckung */
  contentMaxWidth: number;
  /** Ob genügend Platz für Master-Detail Split-Views vorhanden ist (z. B. im Chat oder Prüfung) */
  isSplitView: boolean;
  /** Berechnet die optimale Kachelbreite für ein Grid mit gegebener Spaltenzahl und Abstand */
  getGridItemWidth: (cols?: number, gap?: number, containerPadding?: number) => number;
}

/**
 * Hook zur automatischen Erkennung von Tablet vs. Smartphone
 * sowie reaktiven Ausrichtungsänderungen (Portrait/Landscape).
 */
export function useDeviceLayout(): DeviceLayout {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;
    const isPortrait = !isLandscape;
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);

    // 1. Hardware-Erkennung via expo-device
    const isTabletHardware = Device.deviceType === Device.DeviceType.TABLET;

    // 2. Display-basierte Erkennung:
    // - Web: ab 768px
    // - Native: minDimension >= 580dp ODER im Querformat height >= 520dp & width >= 800dp
    // (Smartphones haben im Querformat eine Höhe von maximal ~430dp)
    const isTabletDimensions = Platform.OS === 'web' 
      ? width >= 768 
      : (minDimension >= 580 || (isLandscape && height >= 520 && width >= 800));

    const isTablet = isTabletHardware || isTabletDimensions;
    const isLandscapeTablet = isTablet && isLandscape;
    const isPortraitTablet = isTablet && isPortrait;

    // Spaltenberechnung für Grids
    let columns = 1;
    if (isTablet) {
      if (isLandscape) {
        columns = width >= 1200 ? 4 : (width >= 900 ? 3 : 2);
      } else {
        columns = 2;
      }
    }

    // Split-View Eignung: Auf Tablets im Querformat immer aktiv, im Portrait ab 768dp Breite
    const isSplitView = isTablet && (isLandscape || width >= 768);

    // Maximale zentrierte Lesebreite für große Bildschirme
    const contentMaxWidth = isTablet ? (isLandscape ? 1280 : 860) : width;

    const getGridItemWidth = (
      cols = columns, 
      gap = 14, 
      containerPadding = isTablet ? 24 : 16
    ) => {
      const activeWidth = Math.min(width, contentMaxWidth);
      const availableWidth = activeWidth - (containerPadding * 2) - (gap * (cols - 1));
      return Math.max(120, Math.floor(availableWidth / cols));
    };

    return {
      isTablet,
      isLandscape,
      isPortrait,
      isLandscapeTablet,
      isPortraitTablet,
      width,
      height,
      minDimension,
      maxDimension,
      columns,
      contentMaxWidth,
      isSplitView,
      getGridItemWidth,
    };
  }, [width, height]);
}
