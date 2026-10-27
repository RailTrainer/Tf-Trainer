import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import * as LucideIcons from 'lucide-react-native';

export interface CategoryIconProps {
  icon?: string;
  imageUrl?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

interface SvgIconProps {
  size: number;
  color: string;
  strokeWidth: number;
}

// ============================================================================
// 1. EISENBAHN-SYMBOLE (Vektor-Icons im 24x24 Raster, perfekt abgestimmt)
// ============================================================================

/** Lokomotive (Dampf-/Streckenlok mit Führerstand, Kessel, Schornstein, Puffer & Rädern) */
export function RailwayLocomotive({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Führerstand (Cab) */}
      <Path
        d="M3 6h6v11H3z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Führerstand Fenster */}
      <Path
        d="M5 8.5h3v3H5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Kesselkörper / Motorvorbau */}
      <Path
        d="M9 10h11v7H9z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Schornstein / Auspuff */}
      <Path
        d="M17 5v5M15.5 5h3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dampfdom / Vorbau-Kappe */}
      <Path
        d="M12 8c0-1.2 1-2 2-2s2 .8 2 2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Puffer & Kupplung vorn */}
      <Path
        d="M20 15h2.5M22.5 13.5v3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Scheinwerfer vorn */}
      <Circle cx={19.5} cy={12} r={1} fill={color} />
      {/* Räder */}
      <Circle cx={6} cy={19} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={19} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={18} cy={19} r={2} stroke={color} strokeWidth={strokeWidth} />
      {/* Treibstange */}
      <Line x1={6} y1={19} x2={18} y2={19} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Eisenbahnsignal (Hauptsignal / Lichtsignal mit Mast, Signalschirm & Signallichtern) */
export function RailwaySignal({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Signalschirm (Signal box / head) */}
      <Rect
        x={7}
        y={2}
        width={10}
        height={13}
        rx={3}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Signallampen (Hp0 / Hp1 / Hp2) */}
      <Circle cx={12} cy={5.5} r={1.5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={8.5} r={1.5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={11.5} r={1.5} stroke={color} strokeWidth={strokeWidth} />
      {/* Signalmast (Mast pole) */}
      <Line x1={12} y1={15} x2={12} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Mastschild */}
      <Rect
        x={10}
        y={16.5}
        width={4}
        height={3}
        stroke={color}
        strokeWidth={Math.max(1, strokeWidth - 0.5)}
      />
      {/* Mastfuß / Fundament */}
      <Line x1={8} y1={22} x2={16} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Dieselmotor (Motorblock für Dieselgrundkurs, Zylinderkopf, Einspritzung & Riemenscheibe) */
export function RailwayMotor({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Motorblock */}
      <Rect
        x={5}
        y={8}
        width={13}
        height={10}
        rx={1.5}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Zylinderkopf / Ventildeckel */}
      <Path
        d="M7 8V5h9v3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Einspritzdüsen / Glühkerzen */}
      <Line x1={9} y1={3} x2={9} y2={5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={11.5} y1={3} x2={11.5} y2={5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={14} y1={3} x2={14} y2={5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Turbolader / Abgaskrümmer links */}
      <Path
        d="M5 11H2V6h2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Riemenscheiben / Stirnräder */}
      <Circle cx={18} cy={13} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={11.5} cy={13} r={1.5} stroke={color} strokeWidth={strokeWidth} />
      {/* Ölwanne unten */}
      <Path
        d="M8 18v2h7v-2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Kurbelgehäuse Detail */}
      <Line x1={8} y1={11} x2={8} y2={15} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Schraubenschlüssel (Wagenprüfung, Instandhaltung & Werkstatt) */
export function RailwayWrench({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Eisenbahngleise (Schienen mit Schwellen) */
export function RailwayTrack({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Schienen */}
      <Line x1={7} y1={2} x2={5} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={17} y1={2} x2={19} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Schwellen */}
      <Line x1={5.5} y1={5} x2={18.5} y2={5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={5} y1={10} x2={19} y2={10} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={4.5} y1={15} x2={19.5} y2={15} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={4} y1={20} x2={20} y2={20} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Stromabnehmer / Pantograph (Elektrotraktion & Fahrleitung) */
export function RailwayPantograph({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Fahrdraht */}
      <Line x1={2} y1={3} x2={22} y2={3} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Schleifleiste mit Hörnern */}
      <Path
        d="M6 5.5l1.5-1.5h9l1.5 1.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Oberschere */}
      <Line x1={12} y1={4} x2={7} y2={11} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={12} y1={4} x2={17} y2={11} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Unterschere */}
      <Line x1={7} y1={11} x2={11} y2={18} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={17} y1={11} x2={13} y2={18} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Grundrahmen auf Isolatoren */}
      <Line x1={6} y1={19} x2={18} y2={19} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={8} y1={19} x2={8} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={16} y1={19} x2={16} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={4} y1={22} x2={20} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Eisenbahnweiche (Fahrwegverzweigung mit Zunge & Stellvorrichtung) */
export function RailwaySwitch({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Stammgleis gerade */}
      <Line x1={6} y1={2} x2={6} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={12} y1={2} x2={12} y2={22} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Abzweiggleis */}
      <Path
        d="M6 16c3-1 8-5 11-14"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M12 19c3-1 7-4 10-11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Schwellen */}
      <Line x1={4} y1={7} x2={14} y2={7} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={4} y1={13} x2={16} y2={13} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={4} y1={19} x2={14} y2={19} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Weichensignal / Stellbock */}
      <Circle cx={2} cy={16} r={1.5} fill={color} />
      <Line x1={2} y1={16} x2={6} y2={16} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Güterwagen (Gedeckter Güterwagen / Wagenmeister Stufe 3 & 4) */
export function RailwayWagon({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Wagenkasten */}
      <Rect
        x={3}
        y={6}
        width={18}
        height={10}
        rx={1.5}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Schiebetür / Rungen */}
      <Line x1={9} y1={6} x2={9} y2={16} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={15} y1={6} x2={15} y2={16} stroke={color} strokeWidth={strokeWidth} />
      {/* Verstrebungen */}
      <Line x1={4} y1={7} x2={8} y2={15} stroke={color} strokeWidth={Math.max(1, strokeWidth - 0.5)} />
      <Line x1={16} y1={15} x2={20} y2={7} stroke={color} strokeWidth={Math.max(1, strokeWidth - 0.5)} />
      {/* Untergestell & Puffer */}
      <Line x1={1} y1={16} x2={23} y2={16} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={1} y1={14.5} x2={1} y2={17.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={23} y1={14.5} x2={23} y2={17.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Radsätze */}
      <Circle cx={6.5} cy={19} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={17.5} cy={19} r={2} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Manometer (Bremsdruck / Hauptluftleitung 5 bar nach VDV 757) */
export function RailwayGauge({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Skala */}
      <Circle cx={12} cy={11} r={8.5} stroke={color} strokeWidth={strokeWidth} />
      {/* Zeiger */}
      <Line x1={12} y1={11} x2={15.5} y2={7.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={12} cy={11} r={1.5} fill={color} />
      {/* Skalenstriche */}
      <Line x1={6.5} y1={11} x2={8} y2={11} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={12} y1={5.5} x2={12} y2={7} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={17.5} y1={11} x2={16} y2={11} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Anschluss unten */}
      <Line x1={12} y1={19.5} x2={12} y2={23} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={10} y1={21} x2={14} y2={21} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Zugfunk / GSM-R Funkgerät */
export function RailwayRadio({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Gehäuse */}
      <Rect
        x={6}
        y={6}
        width={12}
        height={16}
        rx={2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Antenne */}
      <Line x1={9} y1={1} x2={9} y2={6} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Display */}
      <Rect
        x={8.5}
        y={8.5}
        width={7}
        height={4.5}
        rx={0.5}
        stroke={color}
        strokeWidth={Math.max(1, strokeWidth - 0.5)}
      />
      {/* Tasten / Lautsprecher */}
      <Line x1={9} y1={15.5} x2={15} y2={15.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={9} y1={18.5} x2={15} y2={18.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* Funkwellen */}
      <Path
        d="M14 2c1.5 1 2.5 2.5 2.5 4"
        stroke={color}
        strokeWidth={Math.max(1, strokeWidth - 0.5)}
        strokeLinecap="round"
      />
      <Path
        d="M17 1c2.5 1.5 4 4 4 6"
        stroke={color}
        strokeWidth={Math.max(1, strokeWidth - 0.5)}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Fahrdienstleiter / Kelle (Befehlsstab & Abfahrauftrag Zp 9) */
export function RailwayDispatcher({ size, color, strokeWidth }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Stab / Griff */}
      <Line x1={12} y1={14} x2={12} y2={23} stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
      {/* Scheibe */}
      <Circle cx={12} cy={8} r={6.5} stroke={color} strokeWidth={strokeWidth} />
      {/* Grüner Signalring */}
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={8} r={1} fill={color} />
    </Svg>
  );
}

// ============================================================================
// 2. REGISTRIERTE EISENBAHN-SYMBOLE & MAPPINGS
// ============================================================================

export const RAILWAY_ICONS_DEF = [
  { id: 'Lokomotive', label: 'Lokomotive', category: 'railway', component: RailwayLocomotive },
  { id: 'Eisenbahnsignal', label: 'Eisenbahnsignal', category: 'railway', component: RailwaySignal },
  { id: 'Dieselmotor', label: 'Dieselmotor', category: 'railway', component: RailwayMotor },
  { id: 'Schraubenschlüssel', label: 'Schraubenschlüssel', category: 'railway', component: RailwayWrench },
  { id: 'Gleise', label: 'Gleise / Schienen', category: 'railway', component: RailwayTrack },
  { id: 'Stromabnehmer', label: 'Stromabnehmer / E-Traktion', category: 'railway', component: RailwayPantograph },
  { id: 'Weiche', label: 'Weiche', category: 'railway', component: RailwaySwitch },
  { id: 'Güterwagen', label: 'Güterwagen', category: 'railway', component: RailwayWagon },
  { id: 'Manometer', label: 'Bremsprobe Manometer', category: 'railway', component: RailwayGauge },
  { id: 'Zugfunk', label: 'Zugfunk / GSM-R', category: 'railway', component: RailwayRadio },
  { id: 'Fahrdienstleiter', label: 'Fahrdienstleiter Kelle', category: 'railway', component: RailwayDispatcher },
] as const;

export const POPULAR_LUCIDE_ICONS_DEF = [
  { id: 'TrainFront', label: 'Zug (Front)' },
  { id: 'TrainTrack', label: 'Eisenbahngleis' },
  { id: 'Wrench', label: 'Werkzeug Wrench' },
  { id: 'Fuel', label: 'Kraftstoff / Diesel' },
  { id: 'Zap', label: 'Fahrstrom / Blitz' },
  { id: 'Cog', label: 'Zahnrad / Getriebe' },
  { id: 'Sliders', label: 'Regler / Steuerung' },
  { id: 'Compass', label: 'Kompass / Richtung' },
  { id: 'Eye', label: 'Auge / Signalbeobachtung' },
  { id: 'Truck', label: 'LKW / Güterverkehr' },
  { id: 'Shield', label: 'Schutz / Sicherheit' },
  { id: 'ShieldAlert', label: 'Sicherheitswarnung' },
  { id: 'GraduationCap', label: 'Ausbildung / Prüfung' },
  { id: 'BookOpen', label: 'Regelwerk / Buch' },
  { id: 'HelpCircle', label: 'Fragezeichen' },
  { id: 'Activity', label: 'Impuls / Aktivität' },
  { id: 'Flame', label: 'Flamme / Verbrennung' },
  { id: 'Radio', label: 'Funk / Signal' },
  { id: 'TrafficCone', label: 'Baustelle / Sperrung' },
  { id: 'Award', label: 'Auszeichnung / Zertifikat' },
  { id: 'Sparkles', label: 'Spezial / Stern' },
] as const;

const RAILWAY_COMPONENTS_MAP: Record<string, React.ComponentType<SvgIconProps>> = {
  // Primäre Bezeichner
  Lokomotive: RailwayLocomotive,
  RailwayLocomotive: RailwayLocomotive,
  Locomotive: RailwayLocomotive,
  Train: RailwayLocomotive,

  Eisenbahnsignal: RailwaySignal,
  RailwaySignal: RailwaySignal,
  Signal: RailwaySignal,
  Signals: RailwaySignal,

  Dieselmotor: RailwayMotor,
  RailwayMotor: RailwayMotor,
  Motor: RailwayMotor,
  Engine: RailwayMotor,

  Schraubenschlüssel: RailwayWrench,
  RailwayWrench: RailwayWrench,
  WrenchTool: RailwayWrench,

  Gleise: RailwayTrack,
  RailwayTrack: RailwayTrack,
  Schienen: RailwayTrack,

  Stromabnehmer: RailwayPantograph,
  RailwayPantograph: RailwayPantograph,
  Oberleitung: RailwayPantograph,
  Pantograph: RailwayPantograph,

  Weiche: RailwaySwitch,
  RailwaySwitch: RailwaySwitch,

  Güterwagen: RailwayWagon,
  RailwayWagon: RailwayWagon,
  Waggon: RailwayWagon,

  Manometer: RailwayGauge,
  RailwayGauge: RailwayGauge,
  Bremsdruck: RailwayGauge,

  Zugfunk: RailwayRadio,
  RailwayRadio: RailwayRadio,
  GSMR: RailwayRadio,

  Fahrdienstleiter: RailwayDispatcher,
  RailwayDispatcher: RailwayDispatcher,
  Kelle: RailwayDispatcher,
};

// ============================================================================
// 2.5 KATEGORIE-GRAFIKEN & SYMBOLE (Vom Benutzer hochgeladene Kategorie-Icons)
// ============================================================================

export const CATEGORY_IMAGE_ASSETS: Record<string, any> = {
  wagenpruefung: require('../../assets/images/categories/wagenpruefung.png'),
  anlage5: require('../../assets/images/categories/anlage5.png'),
  wagenmeister: require('../../assets/images/categories/wagenmeister.png'),
  signale: require('../../assets/images/categories/signale.png'),
  uvv: require('../../assets/images/categories/uvv.png'),
  bremsprobe: require('../../assets/images/categories/bremsprobe.png'),
  dieselgrundkurs: require('../../assets/images/categories/dieselgrundkurs.png'),
  rangieren: require('../../assets/images/categories/rangieren.png'),
  bahnbetrieb: require('../../assets/images/categories/bahnbetrieb.png'),
};

export const PRESET_CATEGORY_SYMBOLS = [
  { id: 'asset:wagenpruefung', name: 'Wagenprüfung', assetKey: 'wagenpruefung' },
  { id: 'asset:anlage5', name: 'Anlage 5', assetKey: 'anlage5' },
  { id: 'asset:wagenmeister', name: 'Wagenmeister', assetKey: 'wagenmeister' },
  { id: 'asset:signale', name: 'Signale', assetKey: 'signale' },
  { id: 'asset:uvv', name: 'UVV', assetKey: 'uvv' },
  { id: 'asset:bremsprobe', name: 'Bremsprobe', assetKey: 'bremsprobe' },
  { id: 'asset:dieselgrundkurs', name: 'Dieselgrundkurs', assetKey: 'dieselgrundkurs' },
  { id: 'asset:rangieren', name: 'Rangieren', assetKey: 'rangieren' },
  { id: 'asset:bahnbetrieb', name: 'Bahnbetrieb', assetKey: 'bahnbetrieb' },
];

export function resolveCategoryAsset(val?: string): any {
  if (!val) return null;
  const str = val.trim();
  if (str.startsWith('asset:')) {
    const key = str.replace('asset:', '').toLowerCase().trim();
    return CATEGORY_IMAGE_ASSETS[key] || null;
  }
  const clean = str.toLowerCase().replace(/[\s\-_äöü]+/g, (m) => {
    if (m === 'ä') return 'ae';
    if (m === 'ö') return 'oe';
    if (m === 'ü') return 'ue';
    return '';
  });
  if (CATEGORY_IMAGE_ASSETS[clean]) return CATEGORY_IMAGE_ASSETS[clean];
  if (clean.includes('wagenpruef') || clean.includes('wagenp')) return CATEGORY_IMAGE_ASSETS.wagenpruefung;
  if (clean.includes('anlage5') || clean.includes('anlage')) return CATEGORY_IMAGE_ASSETS.anlage5;
  if (clean.includes('wagenmeister')) return CATEGORY_IMAGE_ASSETS.wagenmeister;
  if (clean.includes('signal')) return CATEGORY_IMAGE_ASSETS.signale;
  if (clean === 'uvv') return CATEGORY_IMAGE_ASSETS.uvv;
  if (clean.includes('brems')) return CATEGORY_IMAGE_ASSETS.bremsprobe;
  if (clean.includes('diesel')) return CATEGORY_IMAGE_ASSETS.dieselgrundkurs;
  if (clean.includes('rangier')) return CATEGORY_IMAGE_ASSETS.rangieren;
  if (clean.includes('bahnbetrieb')) return CATEGORY_IMAGE_ASSETS.bahnbetrieb;
  return null;
}

// ============================================================================
// 3. HAUPTKOMPONENTE: CategoryIcon
// ============================================================================

export default function CategoryIcon({
  icon,
  imageUrl,
  size = 24,
  color = '#ffffff',
  strokeWidth = 2,
  style,
}: CategoryIconProps) {
  // 1. Wenn imageUrl übergeben wurde oder icon ein Bild-Pfad / Asset ist
  const targetImage = imageUrl || (icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('file:') || icon.startsWith('asset:') ? icon : undefined));

  if (targetImage) {
    if (targetImage.startsWith('http') || targetImage.startsWith('data:') || targetImage.startsWith('file:')) {
      return (
        <View style={[{ width: size, height: size, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, styles.container, style]}>
          <Image
            source={{ uri: targetImage }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      );
    }
    const asset = resolveCategoryAsset(targetImage);
    if (asset) {
      return (
        <View style={[{ width: size, height: size, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, styles.container, style]}>
          <Image
            source={asset}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      );
    }
  }

  if (!icon) {
    const FallbackIcon = LucideIcons.BookOpen;
    return <FallbackIcon size={size} color={color} strokeWidth={strokeWidth} style={style} />;
  }

  const trimmed = icon.trim();

  // Prüfen auf Category-Asset (z.B. wenn icon direkt als 'asset:...' oder Name übergeben wurde)
  const directAsset = resolveCategoryAsset(trimmed);
  if (directAsset) {
    return (
      <View style={[{ width: size, height: size, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, styles.container, style]}>
        <Image
          source={directAsset}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // 1. Prüfen auf benutzerdefiniertes Eisenbahn-Symbol
  const RailwayComp = RAILWAY_COMPONENTS_MAP[trimmed];
  if (RailwayComp) {
    return (
      <View style={[styles.container, style]}>
        <RailwayComp size={size} color={color} strokeWidth={strokeWidth} />
      </View>
    );
  }

  // 2. Prüfen auf Emoji (z.B. 🚂, 🚦, 🔧, ⚡, etc.)
  const isEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(trimmed);
  if (isEmoji) {
    return (
      <View style={[styles.container, style]}>
        <Text style={{ fontSize: Math.round(size * 0.85), textAlign: 'center' }}>
          {trimmed}
        </Text>
      </View>
    );
  }

  // 3. Prüfen auf Lucide-Icon
  const LucideComp = (LucideIcons as any)[trimmed];
  if (LucideComp) {
    const IconElement = LucideComp;
    return <IconElement size={size} color={color} strokeWidth={strokeWidth} style={style} />;
  }

  // 4. Fallback-Suche (z.B. kleingeschrieben)
  const normalizedKey = Object.keys(LucideIcons).find(
    k => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (normalizedKey) {
    const IconElement = (LucideIcons as any)[normalizedKey];
    return <IconElement size={size} color={color} strokeWidth={strokeWidth} style={style} />;
  }

  // 5. Letzter Fallback: BookOpen
  const DefaultIcon = LucideIcons.BookOpen;
  return <DefaultIcon size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
