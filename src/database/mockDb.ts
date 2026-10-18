import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { broadcastChatPushNotification, sendDirectSupportPushNotification, registerForPushNotificationsAsync } from '../services/notificationService';
import quizletSignals from './quizlet_signals.json';
import anlage5Cards from './anlage5_cards.json';
import bremsprobeCards from './bremsprobe_cards.json';
import docxQuestions from './docx_questions.json';
import { hashPassword, verifyPassword, isSha256Hash } from '../utils/crypto';

export interface RoleDefinition {
  id: string;
  name: string;
  color: string;
  canAccessAdmin: boolean;
  canManageUsers?: boolean;
  isSystem?: boolean;
}

export interface ChatBanRecord {
  id: string;
  targetUserId: string;
  targetUserName: string;
  type: 'timeout_1d' | 'permanent';
  timeoutUntil?: number;
  reason?: string;
  bannedBy: string;
  bannedByName: string;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: string; // 'admin' | 'moderator' | 'user' oder Custom-Rolle (z.B. 'role_xyz')
  title?: string; // Neu: z.B. "Ausbilder", "Prüfer"
  avatarUrl?: string; // Neu: Profilfoto (Preset Emoji oder URL)
  isWebUnlocked?: boolean; // Freigabe für die 4,99 € Web-Version
}

export interface Category {
  name: string;
  desc: string;
  color: string;
  icon: string; // Name des Eisenbahn- oder Lucide-Icons
}

export interface CustomIconItem {
  id: string;
  name: string;
  label: string;
  type?: 'lucide' | 'emoji' | 'railway';
  createdAt: number;
}

export type QuestionType = 'single' | 'multiple' | 'order';

export interface Question {
  id: string;
  category: string; // Dynamisch verknüpft mit dem Kategorienamen
  text: string;
  options: string[];
  correctIndex: number; // Primärer Index für Abwärtskompatibilität
  correctIndices?: number[]; // Indizes aller richtigen Antworten (Mehrfachauswahl)
  correct_indices?: number[];
  questionType?: 'single' | 'multiple' | 'order'; // Explizite Kennzeichnung Single Choice vs. Multiple Choice vs. Reihenfolge
  explanation?: string;
  imageUrl?: string;
  isVerified?: boolean;
  createdBy?: string;
  createdByName?: string;
  creatorRole?: string;
  createdAt?: string;
  created_at?: string;
  updatedBy?: string;
  updatedByName?: string;
  updated_by?: string;
  updated_by_name?: string;
  updatedAt?: string;
  updated_at?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  dangerIndices?: number[]; // Indizes der betriebsgefährdenden Antwortoptionen (BG)
  danger_indices?: number[];
  duplicateReviewed?: boolean;
}

export const getQuestionCorrectIndices = (q: Partial<Question> | undefined | null): number[] => {
  if (!q) return [0];
  if (Array.isArray(q.correctIndices) && q.correctIndices.length > 0) {
    return q.correctIndices.map(Number);
  }
  if (Array.isArray(q.correct_indices) && q.correct_indices.length > 0) {
    return q.correct_indices.map(Number);
  }
  if (typeof q.correctIndex === 'number' && !isNaN(q.correctIndex)) {
    return [q.correctIndex];
  }
  const single = q.correctIndex !== undefined ? q.correctIndex : (q as any).correct_index;
  if (single !== undefined && single !== null && !isNaN(Number(single))) {
    return [Number(single)];
  }
  return [0];
};

export const isQuestionMultipleChoice = (q: Partial<Question> | undefined | null): boolean => {
  if (!q) return false;
  if (q.questionType === 'multiple') return true;
  return getQuestionCorrectIndices(q).length > 1;
};

export const isQuestionAnswerCorrect = (userAns: number[] | number | undefined | null, q: Partial<Question> | undefined | null): boolean => {
  if (userAns === undefined || userAns === null || !q) return false;
  // Reihenfolge-Frage: Die Auswertung verlangt die exakte Permutation 0, 1, ..., N-1
  if (q.questionType === 'order') {
    if (!Array.isArray(userAns)) return false;
    const optCount = Array.isArray(q.options) ? q.options.length : 0;
    if (userAns.length !== optCount) return false;
    return userAns.every((val, i) => val === i);
  }
  const userArr = Array.isArray(userAns) ? [...userAns].sort((a, b) => a - b) : [userAns];
  const correctArr = getQuestionCorrectIndices(q).slice().sort((a, b) => a - b);
  if (userArr.length !== correctArr.length) return false;
  return userArr.every((val, i) => val === correctArr[i]);
};

/**
 * Mischt die Elemente für eine Reihenfolge-Frage so durch,
 * dass das Ergebnis garantiert NIEMALS der korrekten Lösung entspricht.
 */
export function generateAntiIdentityShuffle(count: number): number[] {
  if (count <= 1) return [0];
  const original = Array.from({ length: count }, (_, i) => i);
  let shuffled: number[] = [];
  let attempts = 0;
  do {
    shuffled = [...original];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    attempts++;
    const isIdentical = shuffled.every((val, idx) => val === idx);
    if (!isIdentical || attempts > 50) break;
  } while (true);
  return shuffled;
}

/**
 * Mischt die Antwortmöglichkeiten einer Frage (Single-/Multiple-Choice) zufällig durch,
 * passt alle Indizes (correctIndices, correctIndex, dangerIndices) entsprechend an
 * und behält Reihenfolge-Fragen unverändert bei.
 */
export function shuffleQuestionOptions(q: Question): Question {
  if (q.questionType === 'order' || !q.options || q.options.length <= 1) {
    return q;
  }

  const origCorrectIndices = getQuestionCorrectIndices(q);
  const origDangerIndices = q.dangerIndices || q.danger_indices || [];

  const count = q.options.length;
  const indices = Array.from({ length: count }, (_, i) => i);

  let attempts = 0;
  do {
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    attempts++;
    const isIdentical = indices.every((val, idx) => val === idx);
    if (!isIdentical || attempts > 20) break;
  } while (true);

  const newOptions = indices.map(oldIdx => q.options[oldIdx]);

  const newCorrectIndices: number[] = [];
  indices.forEach((oldIdx, newIdx) => {
    if (origCorrectIndices.includes(oldIdx)) {
      newCorrectIndices.push(newIdx);
    }
  });
  newCorrectIndices.sort((a, b) => a - b);

  const newDangerIndices: number[] = [];
  indices.forEach((oldIdx, newIdx) => {
    if (origDangerIndices.includes(oldIdx)) {
      newDangerIndices.push(newIdx);
    }
  });
  newDangerIndices.sort((a, b) => a - b);

  return {
    ...q,
    options: newOptions,
    correctIndex: newCorrectIndices[0] ?? 0,
    correctIndices: newCorrectIndices,
    correct_indices: newCorrectIndices,
    dangerIndices: newDangerIndices,
    danger_indices: newDangerIndices,
  };
}


export function packQuestionMetadata(q: {
  explanation?: string;
  correctIndices?: number[];
  questionType?: 'single' | 'multiple' | 'order';
  createdBy?: string;
  createdByName?: string;
  creatorRole?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  duplicateReviewed?: boolean;
}): string {
  const meta: Record<string, any> = {};
  if (Array.isArray(q.correctIndices) && q.correctIndices.length > 1) {
    meta.ci = q.correctIndices;
  }
  if (q.questionType) meta.qt = q.questionType;
  if (q.createdBy) meta.cb = q.createdBy;
  if (q.createdByName) meta.cbn = q.createdByName;
  if (q.creatorRole) meta.cr = q.creatorRole;
  if (q.verifiedBy) meta.vb = q.verifiedBy;
  if (q.verifiedByName) meta.vbn = q.verifiedByName;
  if (q.duplicateReviewed) meta.dr = true;

  const clean = (q.explanation || '').replace(/\s*<!--RT_META:.*?-->/gs, '').trim();
  if (Object.keys(meta).length === 0) return clean;
  return (clean ? clean + '\n' : '') + `<!--RT_META:${JSON.stringify(meta)}-->`;
}

export function unpackQuestionMetadata(rawExplanation?: string): {
  explanation: string;
  meta: { ci?: number[]; cb?: string; cbn?: string; cr?: string; vb?: string; vbn?: string; qt?: 'single' | 'multiple' | 'order'; dr?: boolean; duplicateReviewed?: boolean } | null;
} {
  let explanation = rawExplanation || '';
  let meta: any = null;
  const match = explanation.match(/<!--RT_META:(.*?)-->/s);
  if (match) {
    try {
      meta = JSON.parse(match[1]);
      explanation = explanation.replace(/\s*<!--RT_META:.*?-->/gs, '').trim();
    } catch {}
  }
  return { explanation, meta };
}

export function packFactMetadata(f: {
  reference?: string;
  createdBy?: string;
  createdByName?: string;
  creatorRole?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  duplicateReviewed?: boolean;
}): string {
  const meta: Record<string, any> = {};
  if (f.createdBy) meta.cb = f.createdBy;
  if (f.createdByName) meta.cbn = f.createdByName;
  if (f.creatorRole) meta.cr = f.creatorRole;
  if (f.verifiedBy) meta.vb = f.verifiedBy;
  if (f.verifiedByName) meta.vbn = f.verifiedByName;
  if (f.duplicateReviewed) meta.dr = true;

  const clean = (f.reference || '').replace(/\s*<!--RT_META:.*?-->/gs, '').trim();
  if (Object.keys(meta).length === 0) return clean;
  return (clean ? clean + '\n' : '') + `<!--RT_META:${JSON.stringify(meta)}-->`;
}

export function unpackFactMetadata(rawReference?: string): {
  reference: string;
  meta: { cb?: string; cbn?: string; cr?: string; vb?: string; vbn?: string; dr?: boolean; duplicateReviewed?: boolean } | null;
} {
  let reference = rawReference || '';
  let meta: any = null;
  const match = reference.match(/<!--RT_META:(.*?)-->/s);
  if (match) {
    try {
      meta = JSON.parse(match[1]);
      reference = reference.replace(/\s*<!--RT_META:.*?-->/gs, '').trim();
    } catch {}
  }
  return { reference, meta };
}

export interface ChatMessage {
  id: string;
  category: string; // z.B. 'Allgemein', 'Anlage 5', etc.
  sender: string;
  senderId: string; // Verknüpft mit User.id
  senderRole: string;
  text: string;
  timestamp: number;
}

export interface QuizAttempt {
  id: string;
  category: string;
  score: number;
  total: number;
  date: number;
}

export interface Fact {
  id: string;
  category: string;
  title: string;
  content: string;
  reference: string;
  imageUrl?: string;
  isVerified?: boolean;
  createdBy?: string;
  createdByName?: string;
  creatorRole?: string;
  createdAt?: string;
  created_at?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  duplicateReviewed?: boolean;
}

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'bug' | 'feature' | 'exam_question' | 'password_reset'; // 'bug' = Fehler melden, 'feature' = Verbesserungsvorschlag, 'exam_question' = Prüfungsfrage einreichen, 'password_reset' = Passwort-Reset
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
  response?: string;
  responderName?: string;
  responderRole?: string;
  respondedAt?: number;
  imageUrl?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: 'update' | 'announcement' | 'warning' | 'event';
  authorId: string;
  authorName: string;
  authorRole: string;
  authorTitle?: string;
  createdAt: number;
}

export interface SupportMessage {
  id: string;
  studentId: string;
  studentName: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderTitle?: string; // Neu: Titel des Senders
  text: string;
  imageUrl?: string; // Neu: optionales Bild
  timestamp: number;
}

export interface ChatMessageReport {
  id: string;
  messageId: string;
  messageText: string;
  messageSenderName: string;
  messageSenderId: string;
  messageCategory: string; // z.B. 'Allgemein', 'Bremsprobe', etc.
  reporterId: string;
  reporterName: string;
  reason: string; // z.B. 'Unangemessener Inhalt', 'Beleidigung', 'Falschinformation', 'Spam'
  status: 'pending' | 'reviewed' | 'deleted';
  createdAt: number;
}

const STORAGE_KEYS = {
  USERS: '@lok_lernapp_users_v2',
  CURRENT_USER: '@lok_lernapp_current_user_v2',
  CATEGORIES: '@lok_lernapp_categories_v2',
  QUESTIONS: '@lok_lernapp_questions_v3',
  CHAT_MESSAGES: '@lok_lernapp_chat_messages_v2',
  QUIZ_HISTORY: '@lok_lernapp_quiz_history_v2',
  SUPPORT_MESSAGES: '@lok_lernapp_support_messages_v2',
  FACTS: '@lok_lernapp_facts_v5',
  ROLES: '@lok_lernapp_roles_v2',
  TICKETS: '@lok_lernapp_tickets_v2',
  NEWS: '@lok_lernapp_news_v2',
  READ_NEWS: '@lok_lernapp_read_news_v2',
  CHAT_REPORTS: '@lok_lernapp_chat_reports_v2',
  REVIEWED_DUPLICATES: '@lok_lernapp_reviewed_duplicates_v1',
  FAVORITE_FACTS: '@lok_lernapp_favorite_facts_v1',
  CUSTOM_ICONS: '@lok_lernapp_custom_icons_v1',
  CHAT_BANS: '@lok_lernapp_chat_bans_v1',
  WEB_KEYS: '@lok_lernapp_web_keys_v1',
  WEB_LICENSES: '@lok_lernapp_web_licenses_v1',
};

// Checksum-basierte Lizenzschlüssel-Generierung für PayPal Web-Zugang (4,99 €)
export function calculateKeyChecksum(part: string): string {
  const salt = 'RAILTRAINER_PAYPAL_WEB_499_2026';
  let hash = 0;
  const str = part + salt;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  let abs = Math.abs(hash);
  for (let i = 0; i < 4; i++) {
    res += chars.charAt(abs % chars.length);
    abs = Math.floor(abs / chars.length) + (i * 7);
  }
  return res;
}

export function generateWebKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const checksum = calculateKeyChecksum(randomPart);
  return `RT-WEB-${randomPart}-${checksum}`;
}

export const PAYPAL_CONFIG = {
  businessEmail: 'dschmitz112@web.de',
  clientId: 'sb', // PayPal Client-ID: 'sb' (Sandbox zum Testen) oder deine echte Live Client-ID
  paymentUrl: 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=dschmitz112%40web.de&item_name=Tf-Trainer%20Web-Zugang%20Lizenz&amount=4.99&currency_code=EUR',
  price: '4,99 €',
  currency: 'EUR',
};

export function verifyWebKey(rawKey: string): boolean {
  if (!rawKey) return false;
  const clean = rawKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith('RTWEB') && clean.length === 13) {
    const part = clean.substring(5, 9);
    const checksum = clean.substring(9, 13);
    return calculateKeyChecksum(part) === checksum;
  }
  if (clean.length === 8) {
    const part = clean.substring(0, 4);
    const checksum = clean.substring(4, 8);
    return calculateKeyChecksum(part) === checksum;
  }
  return false;
}

// In-Memory RAM-Cache für blitzschnelle Ladezeiten in 0ms & verzögerungsfreies Blättern
const memoryCache = new Map<string, { data: any; timestamp: number }>();

export function getFromMemoryCache<T>(key: string, maxAgeMs: number = 15000): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setToMemoryCache<T>(key: string, data: T): T {
  memoryCache.set(key, { data, timestamp: Date.now() });
  return data;
}

export function invalidateMemoryCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

export const INITIAL_ROLES: RoleDefinition[] = [
  { id: 'admin', name: 'Ausbilder', color: '#ef4444', canAccessAdmin: true, canManageUsers: true, isSystem: true },
  { id: 'moderator', name: 'Mod', color: '#f97316', canAccessAdmin: true, canManageUsers: false, isSystem: true },
  { id: 'user', name: 'Schüler', color: '#10b981', canAccessAdmin: false, canManageUsers: false, isSystem: true },
];

// Initialdaten für Benutzer
const INITIAL_USERS: User[] = [
  {
    id: 'u_admin',
    name: 'Administrator',
    email: 'admin@railtrainer.de',
    password: 'bf3d0317371cbae0fd67facd948171421a5ebd3a785e3a6e30b57fc6b2306956',
    role: 'admin',
    title: 'Administrator'
  },
  {
    id: 'u_admin_bahn',
    name: 'Administrator',
    email: 'admin@bahn.de',
    password: 'bf3d0317371cbae0fd67facd948171421a5ebd3a785e3a6e30b57fc6b2306956',
    role: 'admin',
    title: 'Administrator'
  }
];

// Initialdaten für Kategorien
const INITIAL_CATEGORIES: Category[] = [
  { name: 'Anlage 5', icon: 'Compass', color: '#f59e0b', desc: 'Zugleitbetrieb und Betriebsvorschriften für Nebenbahnen' },
  { name: 'Bahnbetrieb', icon: 'Gleise', color: '#3b82f6', desc: 'Grundlagen, Zug- und Rangierfahrten im Detail' },
  { name: 'Zugfahrt', icon: 'Lokomotive', color: '#10b981', desc: 'Regelbetrieb, Abweichungen und Unregelmäßigkeiten' },
  { name: 'Bremsprobe', icon: 'Manometer', color: '#ec4899', desc: 'Ablauf, Signale und Regeln der Bremsproben nach VDV 757' },
  { name: 'Wagenprüfung', icon: 'Schraubenschlüssel', color: '#8b5cf6', desc: 'Schadensfälle, Fahrzeugprüfung und Betriebssicherheit' },
  { name: 'Wagenmeister', icon: 'Güterwagen', color: '#0284c7', desc: 'Wagenprüfer Stufe 3 & 4 im Güter- und Kombinierten Verkehr (KV)' },
  { name: 'Signale', icon: 'Eisenbahnsignal', color: '#ef4444', desc: 'Haupt-, Vor- und Zusatzsignale erkennen und verstehen' },
];

// Initialdaten für Fakten (inkl. VDV-Schrift 757 & Regelwerke)
const INITIAL_FACTS: Fact[] = [
  ...(quizletSignals as unknown as Fact[]),
  ...(anlage5Cards as unknown as Fact[]),
  ...(bremsprobeCards as unknown as Fact[]),
  // --- VDV-SCHRIFT 757: BREMSEN & BREMSPROBEN ---
  {
    id: 'f_vdv_1',
    category: 'Bremsprobe',
    title: 'Einlösige Bremse bei der Bremsprobe',
    content: 'Wird in einem Zugverband ein Fahrzeug mit einlösiger Druckluftbremse mitgeführt, muss im Lösegang der Bremsprobe neben dieser einlösigen Bremse auch zwingend die davor und die dahinter liegende mehrlösige Bremse auf ordnungsgemäßes Lösen kontrolliert werden.',
    reference: 'VDV-Schrift 757, Abschnitt 4.2 / Ril 915.0102'
  },
  {
    id: 'f_vdv_2',
    category: 'Bremsprobe',
    title: 'Funktionsweise der indirekten Druckluftbremse',
    content: 'Bei der indirekten Bremse wird zur Einleitung einer Bremsung der Druck in der Hauptluftleitung (HL) von 5,0 bar abgesenkt. Das Steuerventil reagiert auf die Druckabsenkung und speist Druckluft aus dem Vorratsluftbehälter (R-Behälter) in den Bremszylinder (C-Druck) ein. Beim Wiederauffüllen der HL auf 5,0 bar entlüftet das Steuerventil den Bremszylinder.',
    reference: 'VDV-Schrift 757, Grundlagen der Bremstechnik / UIC 540'
  },
  {
    id: 'f_vdv_3',
    category: 'Bremsprobe',
    title: 'Funktionsweise der direkten Bremse (Zusatzbremse)',
    content: 'Die direkte Bremse (z.B. Lokzusatzbremse) speist Druckluft aus der Hauptluftbehälterleitung (HBL) über ein Druckminderventil direkt und ohne Umweg über ein Steuerventil in die Bremszylinder des Triebfahrzeugs ein. Sie wirkt ausschließlich auf dem Triebfahrzeug und spricht unmittelbar an.',
    reference: 'VDV-Schrift 757, Grundlagen der Bremstechnik'
  },
  {
    id: 'f_vdv_4',
    category: 'Bremsprobe',
    title: 'Das 3-Druck-Prinzip moderner Steuerventile',
    content: 'Moderne Steuerventile (z.B. KE-Ventil) arbeiten nach dem 3-Druck-Prinzip durch Kräftevergleich: 1. A-Kammer-Druck (Referenz-/Steuerdruck mit konstant 5,0 bar), 2. L-Druck (Steuerdruck der Hauptluftleitung), 3. C-Druck (Bremszylinderdruck). Dies ermöglicht ein stufenweises Anlegen und stufenweises Lösen (Mehrlösigkeit).',
    reference: 'VDV-Schrift 757, Druckluftbremsen'
  },
  {
    id: 'f_vdv_5',
    category: 'Bremsprobe',
    title: 'Vorgehen beim Ausschalten einer gestörten Bremse',
    content: 'Muss eine Druckluftbremse ausgeschaltet werden, gilt folgende Reihenfolge: 1. Absperrhahn am Steuerventil (Schlaufengriff) schließen / ausschalten, 2. Lösezug ziehen und A-Kammer vollständig entlüften, 3. Lösezustand feststellen (Bremsklötze lose bzw. Schauzeichen grün), 4. Wagen beidseitig mit Bremsverzettelung (Muster K / R1) bezetteln, 5. Schadensmeldung an die Instandhaltung veranlassen.',
    reference: 'VDV-Schrift 757, Unregelmäßigkeiten an Bremsen / Ril 915.0107'
  },
  {
    id: 'f_vdv_6',
    category: 'Bremsprobe',
    title: 'Bremsprobesignale nach Signalbuch (Zp 6 – Zp 8)',
    content: 'Die akustische und optische Verständigung bei der Bremsprobe: • Zp 6 (ein mäßig langer Ton / Heben beider Arme): „Bremse anlegen“ • Zp 7 (zwei mäßig lange Töne / Senken beider Arme): „Bremse lösen“ • Zp 8 (zwei mäßig lange Töne, ein kurzer Ton / Heben eines Arms senkrecht): „Bremse in Ordnung“.',
    reference: 'VDV-Schrift 757 / Ril 301 (Signalbuch), Signal Zp 6, Zp 7, Zp 8'
  },
  {
    id: 'f_vdv_7',
    category: 'Zugfahrt',
    title: 'Unwirksame Druckluftbremse des letzten Fahrzeugs',
    content: 'Wird die Druckluftbremse des letzten Fahrzeugs im Zug unwirksam: a) Hat das vorletzte Fahrzeug eine wirkende Druckluftbremse, darf der Zug bis zum nächsten Bahnhof fahren, auf dem die Zugbildung geändert werden kann. b) Hat das vorletzte Fahrzeug KEINE wirkende Druckluftbremse, darf der Zug nur bis zum nächsten Bahnhof fahren.',
    reference: 'VDV-Schrift 757, Unregelmäßigkeiten an Bremsen (19) / Ril 915'
  },
  {
    id: 'f_vdv_8',
    category: 'Bahnbetrieb',
    title: 'Bedingungen für das Abstellen eines Zuges „auf Luft“',
    content: 'Ein Zug darf ohne zusätzliche Handbremssicherung „auf Luft“ (mit wirkender Druckluftbremse) abgestellt werden, wenn alle 3 Kriterien erfüllt sind: 1. Abstelldauer maximal bis zu 60 Minuten, 2. Mindestens 3 wirkende Druckluftbremsen vorhanden, 3. Gleisneigung beträgt unter 2,5 ‰ (Promille).',
    reference: 'VDV-Schrift 757, Sichern von Fahrzeugen gegen Entlaufen'
  },
  {
    id: 'f_vdv_9',
    category: 'Bremsprobe',
    title: 'Bremsstellung P statt G bei schweren Güterzügen',
    content: 'Schwere Güterzüge dürfen unter folgenden Bedingungen in der schneller wirkenden Bremsstellung P statt G gefahren werden: • 1601 t bis 2500 t Zuggewicht: jeder Wagen muss mindestens 32 t wiegen. • 2501 t bis 4000 t Zuggewicht: jeder Wagen muss mindestens 40 t wiegen. • Es dürfen keine Gelenkwagen und keine Einzelradsätze bei Gelenkwagen eingestellt sein.',
    reference: 'VDV-Schrift 757, Bremsstellung von Güterzügen'
  },
  {
    id: 'f_vdv_10',
    category: 'Bremsprobe',
    title: 'Vereinfachte Bremsprobe: Prüfung nicht am Zugschluss',
    content: 'Die vereinfachte Bremsprobe muss nicht am letzten Fahrzeug geprüft werden (sondern kann am Triebfahrzeug erfolgen), wenn: 1. Der Triebfahrzeugführer die Bremsprobe alleine durchführt, 2. Dasselbe Triebfahrzeug am Zug verbleibt, 3. Der Zug weniger als 1 Stunde abgestellt war.',
    reference: 'VDV-Schrift 757, Vereinfachte Bremsprobe'
  },
  {
    id: 'f_vdv_11',
    category: 'Bremsprobe',
    title: 'Definition: Wann gilt ein Zug als „bremstechnisch abgestellt“?',
    content: 'Ein Zug gilt als bremstechnisch abgestellt, wenn: 1. Er vom Triebfahrzeug abgekuppelt wurde, 2. Er von einer mobilen oder ortsfesten Bremsprobeanlage abgekuppelt wurde, oder 3. Das Führerbremsventil auf dem führenden Triebfahrzeug abgesperrt bzw. verschlossen wurde.',
    reference: 'VDV-Schrift 757, Begriffsbestimmungen & Bremsproben'
  },
  {
    id: 'f_vdv_12',
    category: 'Bremsprobe',
    title: 'Verzicht auf separaten Zustandsgang (3G-Regel)',
    content: 'Auf einen separaten Zustandsgang vor der Bremsprobe darf verzichtet werden, wenn die 3G-Regel erfüllt ist: 1. Geschlaucht (alle Luftschläuche ordnungsgemäß verbunden), 2. Gekuppelt (Schraubenkupplungen vorschriftsmäßig gekuppelt), 3. Gefüllt (Hauptluftleitung vollständig auf 5,0 bar gefüllt).',
    reference: 'VDV-Schrift 757, Vorbereitung der Bremsprobe'
  },
  {
    id: 'f_vdv_13',
    category: 'Bremsprobe',
    title: 'Erforderliche Kontrollblicke beim Zustandsgang',
    content: 'Beim Zustandsgang ist zwingend zu kontrollieren: 1. Alle nicht als schadhaft gekennzeichneten Bremsen sind eingeschaltet, 2. Nicht benötigte Versorgungsleitungen (HBL/HL) sind in Blindflanschen eingehängt, 3. Luftabsperrhähne im Zug sind geöffnet, 4. Lastwechsel (Leer/Beladen) ist richtig eingestellt, 5. Bremsstellung (G/P/R) ist richtig eingestellt.',
    reference: 'VDV-Schrift 757, Durchführung des Zustandsgangs'
  },
  {
    id: 'f_vdv_14',
    category: 'Bremsprobe',
    title: 'Fälligkeiten der Vollen Bremsprobe',
    content: 'Eine Volle Bremsprobe ist erforderlich: 1. Am neu gebildeten Zug (mehr als 2 Kuppelstellen geändert; Gültigkeit max. 24 h), 2. Wenn der Zug abgestellt war (bis zu 24 h ohne Überwachung), 3. Bei unverändertem Zug einmal täglich vor der ersten Zugfahrt, 4. Bei Unregelmäßigkeiten oder Zweifeln am Bremszustand, 5. Vor Gefällestrecken.',
    reference: 'VDV-Schrift 757, Fälligkeiten der Bremsproben / Ril 915.0102'
  },
  {
    id: 'f_vdv_15',
    category: 'Bremsprobe',
    title: 'Fälligkeiten der Vereinfachten Bremsprobe',
    content: 'Die vereinfachte Bremsprobe ist durchzuführen: 1. Wenn der Zug ergänzt/geschwächt wurde (bis zu 2 Kuppelstellen), 2. Bei Triebfahrzeugwechsel / neuem Führerbremsventil (Lokwechsel), 3. Wenn Luftabsperrhähne geöffnet wurden (z.B. nach Kopfmachen), 4. Vor Rangierfahrten (z.B. im Baugleis), 5. Wenn Fahrzeuge auf R+Mg umgestellt werden. (Hinweis: Bis zu 1 Stunde Abstellung kann sie durch eine Führerraumbremsprobe ersetzt werden).',
    reference: 'VDV-Schrift 757, Fälligkeiten der Bremsproben'
  },
  {
    id: 'f_vdv_16',
    category: 'Bremsprobe',
    title: 'Fälligkeiten und Ablauf der Führerraumbremsprobe',
    content: 'Fälligkeiten: Führerraumwechsel, abgesperrtes Fbrv bis zu 1 Std., Abkuppeln eines Tfz (Doppeltraktion), Umrüsten auf Funkfernsteuerung, nach Abkuppeln des Luftbremskopfes. Ablauf: 1. Vollbremsung ausführen, 2. Fbrv absperren, 3. Im neuen Führerraum Bremse lösen, 4. Im neuen Führerraum Bremse anlegen, 5. Bremse lösen und HL angleichen.',
    reference: 'VDV-Schrift 757, Führerraumbremsprobe'
  },
  {
    id: 'f_vdv_17',
    category: 'Bahnbetrieb',
    title: 'Festhaltekraft und Bremsausrüstungen anrechnen',
    content: '• Ist das tatsächliche Gesamtgewicht eines Fahrzeugs kleiner als seine tabellarische Festhaltekraft, darf maximal nur das tatsächliche Gesamtgewicht des Fahrzeugs als Festhaltekraft angerechnet werden. • Wird bei einem Fahrzeug mit zwei Bremsausrüstungen eine Ausrüstung ausgeschaltet, dürfen für die verbleibende wirksame Bremse 7 t Festhaltekraft angerechnet werden.',
    reference: 'VDV-Schrift 757, Sichern gegen Entlaufen'
  },
  {
    id: 'f_vdv_18',
    category: 'Zugfahrt',
    title: 'Betriebliche Maßnahmen bei gestörter Sandstreueinrichtung',
    content: 'Ist die Sandstreueinrichtung am führenden Triebfahrzeug gestört: 1. Die zulässige Höchstgeschwindigkeit ist um 10 km/h zu reduzieren. 2. Bei extrem ungünstigen Schienen- und Reibwertverhältnissen darf im Bremswegabstand vor Signalen mit maximal 60 km/h gefahren werden.',
    reference: 'VDV-Schrift 757, Unregelmäßigkeiten am Triebfahrzeug'
  },
  {
    id: 'f_vdv_19',
    category: 'Bremsprobe',
    title: 'Ausblasen der Hauptluftleitung vor dem Kuppeln',
    content: 'Bevor ein Triebfahrzeug mit einem Wagenzug gekuppelt wird, muss der Luftabsperrhahn der Hauptluftleitung am Triebfahrzeug kurz geöffnet und ausgeblasen werden, um Kondenswasser, Rost und Fremdstoffe vor dem Verbinden der Bremskupplungen sicher zu entfernen.',
    reference: 'VDV-Schrift 757, Kuppeln von Fahrzeugen'
  },
  {
    id: 'f_vdv_20',
    category: 'Bremsprobe',
    title: 'Einstellung der Bremsstellung nach Gesamtgewicht des Zuges',
    content: 'Vorgaben für die Bremsstellung im Güterverkehr: • Bis 800 t: Tfz und Wagenzug in P • 801 t bis 1200 t: Tfz in G, Wagenzug in P • 1201 t bis 1600 t: Tfz und die ersten 5 Fahrzeuge in G, restliche Wagen in P • 1601 t bis 2500 t: Tfz und erste 5 Fahrzeuge in G (Mindestgewicht je Wagen 32 t) • 2501 t bis 4000 t: Tfz und erste 5 Fahrzeuge in G (Mindestgewicht je Wagen 40 t).',
    reference: 'VDV-Schrift 757, Bremsstellung von Güterzügen'
  },
  {
    id: 'f_vdv_21',
    category: 'Bremsprobe',
    title: 'Bremsgewichtsabzüge bei langen Zügen',
    content: 'Wegen der Durchschlagsgeschwindigkeit der Druckluft sind folgende Abzüge vom Bremsgewicht vorgeschrieben: • Beliebige Länge in Bremsstellung G: 25 % Abzug • 500 m bis 600 m in P: 5 % Abzug • 601 m bis 700 m in P: 10 % Abzug • 701 m bis 815 m in P: 19 % Abzug (bei G-Anteilen zusätzlich weitere 5 % Abzug).',
    reference: 'VDV-Schrift 757, Bremsberechnung für lange Züge'
  },
  {
    id: 'f_vdv_22',
    category: 'Bremsprobe',
    title: 'Gründe für den Abbruch einer Bremsprobe',
    content: 'Die Bremsprobe ist abzubrechen und neu zu beginnen bei: 1. Bremse löst nach dem Angleichen nicht, 2. Dichtheitsprüfung nicht bestanden, 3. Ein geschlossener Luftabsperrhahn muss geöffnet werden, 4. Eine nicht gekennzeichnete Bremse muss eingeschaltet werden, 5. Unregelmäßigkeiten bei der Durchgangsprüfung (letzter Wagen legt nicht an oder löst nicht).',
    reference: 'VDV-Schrift 757, Unregelmäßigkeiten bei der Bremsprobe'
  },
  {
    id: 'f_vdv_23',
    category: 'Bremsprobe',
    title: 'Verhalten bei Bremsen, die nicht anlegen oder nicht lösen',
    content: '• Eine Bremse, die beim Anlegegang nicht anlegt, ist sofort auszuschalten und zu bezetteln! • Löst eine Bremse nach der Dichtheitsprobe nicht: 2x Angleicher betätigen. Löst sie immer noch nicht -> Abbruch und separater Zustandsgang. • Löst eine Bremse im letzten Lösegang nicht: Lösezug ziehen, erneutes Anlegen und Lösen prüfen (kein separater Zustandsgang nötig, da Zustand im Anlegegang bereits geprüft wurde).',
    reference: 'VDV-Schrift 757, Unregelmäßigkeiten bei der Bremsprobe'
  },
  {
    id: 'f_vdv_24',
    category: 'Bremsprobe',
    title: 'Die 6 Arten von Bremsungen im Bahnbetrieb',
    content: 'Im Bahnbetrieb werden 6 Bremsungsarten unterschieden: 1. Betriebsbremsung (stufenweise reguläre Bremsung), 2. Vollbremsung (maximaler regulärer Bremsdruck), 3. Schnellbremsung (schnellste Entleerung der HL über Fbrv), 4. Zwangsbremsung (durch Zugsicherungssysteme wie PZB/LZB/ETCS), 5. Zwangsbetriebsbremsung (z.B. durch Sifa), 6. Notbremsung (durch Fahrgäste oder Notbremshahn).',
    reference: 'VDV-Schrift 757, Grundlagen der Bremstechnik'
  },
  {
    id: 'f_vdv_25',
    category: 'Bremsprobe',
    title: 'Verhalten bei Verdacht auf feste Bremse oder Heißläufer',
    content: 'Wird durch Heißläuferortungsanlagen (HOA/FBOA) oder Personal eine feste Bremse gemeldet: • Meldung „heiß“: Der Fahrdienstleiter hält den Zug unverzüglich am nächsten Hauptsignal an -> Triebfahrzeugführer leitet sofortige Vollbremsung ein. • Meldung „warm“: Der Zug darf mit verminderter Geschwindigkeit bis in den nächsten Bahnhof weiterfahren und wird dort untersucht.',
    reference: 'VDV-Schrift 757, Heißläufer und feste Bremsen / Ril 408'
  },

  // --- VDV-SCHRIFT 758: WAGENPRÜFUNG IM GÜTERVERKEHR ---
  {
    id: 'f_vdv758_1',
    category: 'Wagenprüfung',
    title: 'Verantwortung für die Fahrzeuginstandhaltung (ECM)',
    content: 'Für die ordnungsgemäße Instandhaltung, die Einhaltung der Revisionsfristen und den betriebssicheren Zustand von Güterwagen ist der Fahrzeughalter (bzw. die zertifizierte Stelle ECM – Entity in Charge of Maintenance) verantwortlich.',
    reference: 'VDV-Schrift 758, Grundlagen & Verantwortlichkeiten / EU-VO 2019/779'
  },
  {
    id: 'f_vdv758_2',
    category: 'Wagenprüfung',
    title: 'Die 4 Stufen der Wagenprüfung',
    content: 'Im Schienengüterverkehr gibt es 4 Prüfstufen: • Stufe 1: Prüfung vor der Rangierfahrt • Stufe 2: Prüfung nach Abstellung • Stufe 3: Prüfung vor der Zugfahrt (Standardprüfung) • Stufe 4: Prüfung vor der Zugfahrt mit bestimmten Güterwagen oder Ladungen (z.B. KV-Verkehr, außergewöhnliche Transporte).',
    reference: 'VDV-Schrift 758, Prüfstufen der Wagenprüfung'
  },
  {
    id: 'f_vdv758_3',
    category: 'Wagenprüfung',
    title: 'Ablauf der Revisionsfrist & Muster K',
    content: 'Läuft die Revisionsfrist eines Güterwagens in unter 15 Tagen ab, ist der Wagen beidseitig mit einem Zettel „Muster K“ zu kennzeichnen. Nach erfolgter Entladung darf der Wagen keinesfalls wiederbeladen werden, sondern muss zur Revision/Instandhaltung zugeführt werden.',
    reference: 'VDV-Schrift 758, Fristen & Bremsverzettelung / AVV Anlage 9'
  },
  {
    id: 'f_vdv758_4',
    category: 'Wagenprüfung',
    title: 'Die 3 Hauptaufgaben des Laufwerks',
    content: 'Das Laufwerk eines Schienenfahrzeugs erfüllt drei grundlegende Aufgaben: 1. Führen des Fahrzeugs sicher im Gleis (Spurführung), 2. Tragen der Fahrzeug- und Ladungsmasse, 3. Federung und Dämpfung der dynamischen Kräfte zwischen Rad und Schiene.',
    reference: 'VDV-Schrift 758, Bauteile des Laufwerks'
  },
  {
    id: 'f_vdv758_5',
    category: 'Wagenprüfung',
    title: 'Erkennungsmerkmale eines losen Radreifens',
    content: 'Ein loser Radreifen ist an 4 Merkmalen erkennbar: 1. Gegeneinander verschobene Kontrollmarken (Prüfstriche), 2. Rostaustritt an der Fuge zwischen Radreifen und Radkörper, 3. Loser, gebrochener oder fehlender Sprengring, 4. Unreiner, dumpfer Klang beim Abklopfen mit dem Prüfhammer.',
    reference: 'VDV-Schrift 758, Radsatzprüfung / AVV Anlage 9'
  },
  {
    id: 'f_vdv758_6',
    category: 'Wagenprüfung',
    title: 'Erkennungsmerkmale eines Heißläufers am Radsatzlager',
    content: 'Ein Heißläufer wird erkannt durch: 1. Oxidationsspuren, Verfärbungen, Blasenbildung oder Lackabbrand am Lagergehäuse, 2. Ausgetretenes/verbranntes Schmiermittel, 3. Handrückenprobe (spürbare Überhitzung im Vergleich zu anderen Radsatzlagern desselben Fahrzeugs).',
    reference: 'VDV-Schrift 758, Radsatzlagerprüfung'
  },
  {
    id: 'f_vdv758_7',
    category: 'Wagenprüfung',
    title: 'Merkmale eines beginnenden Radsatzlagerschadens',
    content: 'Ein Radsatzlagerschaden kündigt sich an durch: • Schmiermittelaustritt an der inneren Radscheibe • Schmiermittelaustritt am äußeren Lagerdeckel • Rasselnde, mahlende oder schleifende Laufgeräusche bei der Fahrzeugbewegung.',
    reference: 'VDV-Schrift 758, Radsatzlager'
  },
  {
    id: 'f_vdv758_8',
    category: 'Wagenprüfung',
    title: 'Definition: Verkehrstauglichkeit und Betriebssicherheit',
    content: '• Verkehrstauglichkeit: Der sichere Zustand des Fahrzeugs und der Ladeeinheit für den bestimmungsgemäßen Verwendungszweck. • Betriebssicherheit: Der Zustand von Wagen und deren Komponenten zur Gewährleistung eines sicheren Bahnbetriebs ohne abwendbare Gefährdung von Personen, Umwelt und Sachen.',
    reference: 'VDV-Schrift 758, Schutzziele & Grundsätze'
  },
  {
    id: 'f_vdv758_9',
    category: 'Wagenprüfung',
    title: 'Schutzziele und Fälligkeiten der Wagenprüfung Stufe 3',
    content: 'Schutzziel: Feststellung des sicheren Zustands von Güterwagen, Ladeeinheiten und Ladung für die anschließende Zugfahrt. Fälligkeiten: 1. Am neu gebildeten Zug, 2. Nach jeder Be- oder Entladung, 3. Wenn noch keine Stufe 3 oder 4 durchgeführt wurde, 4. Bei Übernahme von einem anderen EVU (falls kein Vertrauensabkommen besteht).',
    reference: 'VDV-Schrift 758, Wagenprüfung Stufe 3'
  },
  {
    id: 'f_vdv758_10',
    category: 'Wagenprüfung',
    title: 'Pufferbauarten und deren Besonderheiten',
    content: 'Im Güterverkehr kommen folgende Pufferbauarten zum Einsatz: 1. Standardpuffer (Kategorie A/B), 2. Hochleistungspuffer (Kategorie C mit höherem Energieaufnahmevermögen), 3. Crashpuffer (mit Sollbruchstellen zur Verformungsenergieaufnahme), 4. Diagonalpuffer, 5. QGO-Puffer (Quer-Gleit-Ölpuffer).',
    reference: 'VDV-Schrift 758, Zug- und Stoßeinrichtung'
  },
  {
    id: 'f_vdv758_11',
    category: 'Wagenprüfung',
    title: 'Ladungssicherungsmittel und Sicherungsarten nach VDV 758',
    content: '• Sicherungsmittel: Fest- und Niederbindungen (Gurte/Ketten), Trennwände, Mulden, Borde, Stirn-/Seitenwände, Stützen, Rungen. • Sicherungsarten: 1. Festbinden (Formschluss / Direktzurren), 2. Niederbinden (Kraftschluss durch Erhöhung der Reibung), 3. Starre Verladung (Ladung fest mit Wagen verbunden), 4. Gleitende Verladung (kontrolliertes Verschieben zugelassen).',
    reference: 'VDV-Schrift 758, Ladungssicherung & UIC-Verladerichtlinien'
  },
  {
    id: 'f_vdv758_12',
    category: 'Wagenprüfung',
    title: 'Zulässige Grenzwerte der Lastverteilung',
    content: 'Ungleichmäßige Lastverteilung erhöht die Entgleisungsgefahr. Grenzwerte für das Verhältnis der Radsatzlasten: • 2-achsige Wagen: max. 2:1 in Wagenlängsrichtung • Drehgestellwagen: max. 3:1 in Wagenlängsrichtung • In Wagenquerrichtung: max. 1,25:1 bei allen Güterwagen.',
    reference: 'VDV-Schrift 758, Lastverteilung / UIC-Verladerichtlinien Band 1'
  },
  {
    id: 'f_vdv758_13',
    category: 'Wagenprüfung',
    title: 'Mindestdicke von Bremssohlen',
    content: 'Die Dicke einer Grauguss- oder Kunststoff-Bremssohle darf an der dünnsten Stelle das Grenzmaß von 10 mm keinesfalls unterschreiten. Bei Erreichen oder Unterschreiten der Verschleißmarkierung ist die Sohle vor der Zugfahrt zu tauschen.',
    reference: 'VDV-Schrift 758, Bremsausrüstung / AVV Anlage 9'
  },
  {
    id: 'f_vdv758_14',
    category: 'Wagenprüfung',
    title: 'Vorschriften für Stahldraht und wirkende Höhen',
    content: '• Wird Stahldraht zur Ladungssicherung verwendet, muss dieser geglüht sein und einen Mindestdurchmesser von 4 mm aufweisen. • Wirkende Höhen von Rungen, Keilen, Bordwänden oder Anschlägen müssen mindestens 10 cm betragen, um ein Verrutschen der Ladung wirksam zu verhindern.',
    reference: 'VDV-Schrift 758, Ladungssicherungsmaterialien'
  },
  {
    id: 'f_vdv758_15',
    category: 'Wagenprüfung',
    title: 'Erkennungsmerkmale thermisch überlasteter Räder',
    content: 'Eine unzulässige thermische Überbeanspruchung (z.B. durch feste Bremse) zeigt sich durch: 1. Angeschmolzene oder verbrannte Bremssohlen, 2. Aufschweißungen / Metallauftrag auf der Lauffläche, 3. Flachstellen, 4. Verdrehte Radreifen, 5. Farbabbrand von mehr als 25 mm Breite am Übergang zur Lauffläche.',
    reference: 'VDV-Schrift 758, Thermische Radüberlastung / AVV Schadenskatalog'
  },
  {
    id: 'f_vdv758_16',
    category: 'Wagenprüfung',
    title: 'Bauteile der Doppelschake und Federungsarten',
    content: '• Doppelschake Bauteile: Schake, Zwischenstück, Tragfederbolzen, Schakenstein, Verschlussstück. • Blatttragfedern Bauarten: Trapezfederung und Parabelfederung. • Vorteil der Parabelfeder: Sie wirkt zweistufig (progressiv – weicheres Ansprechen im Leerzustand, hohe Tragfähigkeit unter Last).',
    reference: 'VDV-Schrift 758, Federung und Schaken'
  },
  {
    id: 'f_vdv758_17',
    category: 'Wagenprüfung',
    title: 'Zulässiges Tragfederspiel und Umstellung des Lastwechsels',
    content: '• Mindest-Federspiel: Schraubenfederung mind. 8 mm, Blatttragfederung mind. 15 mm. • Umstellung des Lastwechsels (Leer/Beladen): Darf ausschließlich bei vollständig gelöster Druckluftbremse UND gelöster Hand-/Feststellbremse erfolgen.',
    reference: 'VDV-Schrift 758, Federung & Bremsbedienung'
  },
  {
    id: 'f_vdv758_18',
    category: 'Wagenprüfung',
    title: 'Unzulässige Zurrpunkte zur Ladungssicherung',
    content: 'Zur Ladungssicherung dürfen nur dafür vorgesehene Zurrpunkte verwendet werden. Unzulässig sind: Laufwerk, Federungsteile, Signalstützen, Drehgestellrahmen, Zug- und Stoßeinrichtungen, Bremsgestänge sowie das vollständige Umschlingen des Wagenuntergestells.',
    reference: 'VDV-Schrift 758, Ladungssicherung / UIC Verladerichtlinien'
  },
  {
    id: 'f_vdv758_19',
    category: 'Wagenprüfung',
    title: 'Funktion und Aufgabe des Bremsgestängestellers',
    content: 'Der Bremsgestängesteller gleicht die Abnutzung und den Verschleiß der Bremssohlen automatisch aus. Er verkürzt bzw. verlängert das Bremsgestänge so, dass der Kolbenhub des Bremszylinders stets im vorgeschriebenen Arbeitsbereich bleibt.',
    reference: 'VDV-Schrift 758, Bremsmechanik'
  },
  {
    id: 'f_vdv758_20',
    category: 'Wagenprüfung',
    title: 'Schakenbauarten und Wirkungsanschriften der Feststellbremse',
    content: '• Schakenbauarten: Einfachschake, Doppelschake, Langschake, Trapezschake, Lasche. • Anschrift „1/2“ oder „3/4“: Weist darauf hin, dass die Hand-/Feststellbremse nicht auf alle Achsen, sondern nur auf den 1. und 2. bzw. den 3. und 4. Radsatz des Wagens wirkt.',
    reference: 'VDV-Schrift 758, Laufwerk & Bremsanschriften'
  },
  {
    id: 'f_vdv758_21',
    category: 'Wagenprüfung',
    title: 'Anschrift Ladeflächenhöhe und maximaler Pufferhöhenunterschied',
    content: '• Anschrift Ladeflächenhöhe: Gibt die Ladeflächenhöhe im unbeladenen Zustand über Schienenoberkante (SOK) in mm an. • Pufferhöhe: Der Höhenunterschied zwischen den Puffermitten zweier gekuppelter Fahrzeuge darf maximal 12,5 cm (125 mm) betragen.',
    reference: 'VDV-Schrift 758, Wagenanschriften & UIC 528'
  },
  {
    id: 'f_vdv758_22',
    category: 'Wagenprüfung',
    title: 'Aufgabe von Gleitstücken und Drehgestell-Erdungslitzen',
    content: '• Gleitstücke: Fangen Wankbewegungen des Wagenkastens von der Drehpfanne ab und stabilisieren den Bogenlauf. • Erdungslitzen: Die gefettete Drehpfanne isoliert elektrisch. Erdungslitzen leiten im Fall eines Oberleitungsabrisses den Kurzschlussstrom sicher vom Wagenkasten über das Drehgestell in die Schiene ab.',
    reference: 'VDV-Schrift 758, Drehgestellaufbau & Elektrosicherheit'
  },
  {
    id: 'f_vdv758_23',
    category: 'Wagenprüfung',
    title: 'Bedeutung der Wagen-Musterzettel (K, M, U, I)',
    content: '• Muster K: Nach Entladung zur Reparatur (Wiederbeladung verboten; bei erneuter Beladung: Aussetzen!). • Muster M: Wagen zu untersuchen (darf weiter beladen/befördert werden; dient der Schadenbeobachtung & Haftungsabgrenzung). • Muster U: Außergewöhnliche Sendung (nur durch Wagenmeister). • Muster I: Lauffähigkeitsbescheinigung (nur durch Wagenmeister).',
    reference: 'VDV-Schrift 758 / AVV Anlage 9 (Verzettelung)'
  },
  {
    id: 'f_vdv758_24',
    category: 'Wagenprüfung',
    title: 'Pflicht zur Wagenprüfung Stufe 4',
    content: 'Eine Stufe-3-Prüfung reicht nicht aus (Stufe 4 erforderlich) bei: 1. Kombiniertem Verkehr (KV-Züge / Intermodal), 2. Außergewöhnlichen Sendungen, 3. Außergewöhnlichen Fahrzeugen, 4. Besonderen Ladungssicherungsanforderungen (z.B. Schwellentransporte).',
    reference: 'VDV-Schrift 758, Prüfstufe 4'
  },
  {
    id: 'f_vdv758_25',
    category: 'Wagenprüfung',
    title: 'Merkmale für unrunde Räder und Flachstellen',
    content: 'Ein unrundes Rad (z.B. durch Polygonbildung oder Flachstellen) erzeugt starke Stöße und wird erkannt durch: • Blankgescheuerte Scheiben am Bremsschuh • Gebrochene Bremsfangbügel (Fangeisen) • Glänzende Abriebstellen an Tragfedern • Lose gewordene Abhebesicherungen.',
    reference: 'VDV-Schrift 758, Radsatzschäden'
  },
  {
    id: 'f_vdv758_26',
    category: 'Wagenprüfung',
    title: 'Funktion der automatischen Lastabbremsung (Oerlikon-Wiegeventil)',
    content: 'Güterwagen mit automatischem Wiegeventil passen das Bremsgewicht selbsttätig an das tatsächliche Wagengewicht an (unabhängig von der Bremsstellung G/P). Beispiel: Bei $\ge$ 42 t Gesamtgewicht schaltet das Ventil automatisch auf 48 t Bremsgewicht; unter 42 t wirkt ein Bremsgewicht von 24 t.',
    reference: 'VDV-Schrift 758, Automatische Lastabbremsung / UIC 541'
  },
  {
    id: 'f_vdv758_27',
    category: 'Wagenprüfung',
    title: 'Funktionsweise der Reibungsdämpfung am Y25-Drehgestell',
    content: 'Die lastabhängige Lenoir-Dämpfung am Y25-Drehgestell: 1. Vertikale Last drückt nach unten $\rightarrow$ 2. Schräge Dämpferschake zieht Federhaube nach unten $\rightarrow$ 3. Federhaube drückt auf inneres Druckstück $\rightarrow$ 4. Druckstück presst das Radsatzlagergehäuse horizontal gegen die Hartmanganplatte $\rightarrow$ 5. Reibung dämpft Schwingungen lastabhängig.',
    reference: 'VDV-Schrift 758, Drehgestellbauart Y25'
  },
  {
    id: 'f_vdv758_28',
    category: 'Wagenprüfung',
    title: 'Definition Überwalzung und Radsatzlagerung',
    content: '• Überwalzung: Plastische Kaltverformung des Radstahls durch extreme Druck- und Bremsbelastungen, bei der Material über die äußere Radkante hinausfließt und einen scharfkantigen, spröden Grat bildet. • Radsatzlagerung: Bei modernen Güterwagen kommen geschlossene, wartungsarme Wälzlager (Zylinder- oder Kegelrollenlager) zum Einsatz.',
    reference: 'VDV-Schrift 758, Radsatz- und Laufflächenschäden'
  },
  {
    id: 'f_vdv758_29',
    category: 'Wagenprüfung',
    title: 'Grundsätze der Wagenprüfung im Güterverkehr',
    content: 'Die 3 goldenen Grundsätze: 1. Jeder Wagen muss uneingeschränkt betriebssicher und verkehrstauglich sein, 2. Kein Wagen darf ohne gültige Technische Wagenuntersuchung auf die freie Strecke fahren, 3. Nach jeder Be- und Entladung ist zwingend eine neue Wagenprüfung fällig.',
    reference: 'VDV-Schrift 758, Grundsätze der Wagenprüfung'
  },
  {
    id: 'f_vdv758_30',
    category: 'Wagenprüfung',
    title: 'Schüttgutladung: Schüttkegel & Ladungsvolumen',
    content: '• Schüttkegel: Darf maximal 50 cm hoch über die Bordwand ragen und muss mindestens 15 cm Abstand unterhalb der Bordwandkante aufweisen. • Ladungsvolumen: Darf durch erfahrene Prüfer geschätzt werden (z.B. Uas-Schüttgutwagen ca. 50 t Zuladung, Res-Wagen ca. 40–50 t Zuladung).',
    reference: 'VDV-Schrift 758, Schüttgutverladung & UIC Verladerichtlinien'
  },

  // --- ANLAGE 5: ZUGLEITBETRIEB (FV-NE / VDV-SCHRIFT 758 / 757) ---
  {
    id: 'f_a5_1',
    category: 'Anlage 5',
    title: 'Grundprinzip des Zugleitbetriebs (ZLB)',
    content: 'Der Zugleitbetrieb ist ein vereinfachtes Betriebsverfahren für Nebenbahnen. Die Zugfolge wird nicht durch dezentrale Fahrdienstleiter vor Ort, sondern zentral durch den Zugleiter (Zl) im Zugmeldebuch geregelt. Zugfahrten dürfen nur mit gültiger fernmündlicher oder schriftlicher Fahrerlaubnis stattfinden.',
    reference: 'VDV-Schrift 758 / FV-NE Anlage 5, Abschnitt 1'
  },
  {
    id: 'f_a5_2',
    category: 'Anlage 5',
    title: 'Fahranfrage und Fahrerlaubnis',
    content: 'Vor der Abfahrt auf einer Zuglaufstelle stellt der Triebfahrzeugführer die Fahranfrage: „Darf Zug [Nr.] von [A] nach [B] fahren?“. Nach Prüfung des Streckenabschnitts erteilt der Zugleiter die Fahrerlaubnis mit dem vorgeschriebenen Wortlaut: „Zug [Nr.] darf von [A] nach [B] fahren.“',
    reference: 'VDV-Schrift 758 / FV-NE Anlage 5, Abschnitt 3'
  },
  {
    id: 'f_a5_3',
    category: 'Anlage 5',
    title: 'Trapeztafel (Signal Ne 1) im Zugleitbetrieb',
    content: 'Die Trapeztafel (Signal Ne 1) ersetzt vor Zuglaufstellen auf Nebenbahnen das Einfahrsignal. Sie kennzeichnet die Stelle, an der ein Zug vor der Betriebsstelle zwingend halten muss, sofern die Einfahrt nicht durch den Zugleiter oder durch planmäßige Kreuzungsregeln freigegeben ist.',
    reference: 'VDV-Schrift 758 / Ril 301, Signal Ne 1 / FV-NE § 11'
  },
  {
    id: 'f_a5_4',
    category: 'Anlage 5',
    title: 'Kreuzungsverlegung im Zugleitbetrieb',
    content: 'Soll eine planmäßige Zugkreuzung auf eine andere Zuglaufstelle verlegt werden, muss der Zugleiter beiden beteiligten Zügen einen Verlegungsbefehl erteilen. Erst nachdem der zuerst eintreffende Zug den Erhalt des Befehls quittiert hat, darf der Gegenzug auf die Strecke geschickt werden.',
    reference: 'VDV-Schrift 758 / FV-NE Anlage 5, Abschnitt 4'
  },
  {
    id: 'f_a5_5',
    category: 'Anlage 5',
    title: 'Ankunftsmeldung & Streckenfreigabe',
    content: 'Nach vollständiger Einfahrt auf der Ziel-Zuglaufstelle (unter Kontrolle des Zugschlusssignals Zg 2) muss der Triebfahrzeugführer unverzüglich die Ankunftsmeldung abgeben: „Zug [Nr.] in [B] angekommen.“ Erst damit gilt der Streckenabschnitt für Gegenzüge oder Folgefahrten als geräumt.',
    reference: 'VDV-Schrift 758 / FV-NE Anlage 5, Abschnitt 5'
  },
  {
    id: 'f_a5_6',
    category: 'Anlage 5',
    title: 'Rückfallweichen & Überwachungssignal Ne 13',
    content: 'Rückfallweichen kehren nach dem Auffahren im Stumpfen durch eine Öldämpfung selbsttätig in ihre Grundstellung zurück. Das Überwachungssignal Ne 13 signalisiert mit einem ruhigen weißen Licht dem Lokführer, dass die Weichenzungen in Grundstellung anliegen und verriegelt sind.',
    reference: 'VDV-Schrift 758 / Signalbuch Ril 301, Signal Ne 13'
  },
  {
    id: 'f_a5_7',
    category: 'Anlage 5',
    title: 'Verhalten bei Zugfunkausfall',
    content: 'Fällt die Funkverbindung zum Zugleiter während der Fahrt aus, darf der Zug bis zur nächsten Zuglaufstelle fahren, für die er eine gültige Fahrerlaubnis besitzt. Dort muss angehalten und über Festnetztelefon oder Diensthandy Verbindung aufgenommen werden.',
    reference: 'VDV-Schrift 758 / FV-NE Anlage 5, Abschnitt 8'
  },

  // --- BAHNBETRIEB (RIL 408 / VDV / DGUV V73) ---
  {
    id: 'f3',
    category: 'Bahnbetrieb',
    title: 'Zugfahrten vs. Rangierfahrten',
    content: 'Zugfahrten sind Fahrten von Zügen auf der freien Strecke oder in Hauptgleisen von Bahnhöfen nach Fahrplan. Rangierfahrten sind alle anderen Fahrzeugbewegungen im Bahnhofsbereich (z.B. Rangieren zum Bereitstellen, Trennen, Abstellen von Fahrzeugen).',
    reference: 'Ril 408 (Fahrdienstvorschrift), Modul 408.0102, Abs. 1'
  },
  {
    id: 'f_bb_1',
    category: 'Bahnbetrieb',
    title: 'Die Rangiervereinbarung nach Ril 408',
    content: 'Vor jeder Rangierbewegung müssen Weichenwärter/Fdl und Lokführer/Rangierbegleiter eine Rangiervereinbarung treffen. Diese regelt: 1. Ziel der Fahrt, 2. Zweck der Fahrt, 3. Besonderheiten (z.B. Gefahrgut, Hemmschuhe, schadhafte Wagen).',
    reference: 'Ril 408.0811 (Rangieren)'
  },
  {
    id: 'f_bb_2',
    category: 'Bahnbetrieb',
    title: 'Fahrwegprüfung und geschobenes Rangieren',
    content: 'Beim geschobenen Rangieren muss sich der Rangierbegleiter zwingend an der Spitze des ersten Fahrzeugs befinden, den Fahrweg beobachten und ständigen Sicht- oder Funkkontakt zum Lokführer halten, um bei Hindernissen sofort Nothalt zu veranlassen.',
    reference: 'Ril 408.0821, Fahrwegprüfung beim Rangieren'
  },
  {
    id: 'f_bb_3',
    category: 'Bahnbetrieb',
    title: 'Flankenschutz im Fahrweg',
    content: 'Flankenschutz verhindert seitliche Zusammenstöße durch feindliche Fahrten in einen gesicherten Fahrweg. Zu den zwingenden Flankenschutzeinrichtungen zählen: abweisende Weichenstellungen, Gleissperren, Schutzgleise sowie Halt zeigende Sperr- und Hauptsignale.',
    reference: 'Ril 408.0201 / VDV 758, Grundsätze des Fahrwegschutzes'
  },
  {
    id: 'f_bb_4',
    category: 'Bahnbetrieb',
    title: 'Arbeitsschutz im Gleisbereich (DGUV V73)',
    content: 'Im Gleisbereich gilt strikte Tragepflicht für persönliche Schutzausrüstung (PSA) mit fluoreszierender Warnkleidung (mind. Klasse 2 nach EN ISO 20471) und S3-Sicherheitsschuhen. Der Sicherheitsabstand zur Gleismitte beträgt bis 160 km/h mindestens 2,0 Meter.',
    reference: 'DGUV Vorschrift 73 (Schienenbahnen) / UVV'
  },

  // --- ZUGFAHRT & ZUGBEEINFLUSSUNG (RIL 408 / RIL 483 PZB 90 / LZB / ETCS) ---
  {
    id: 'f4',
    category: 'Zugfahrt',
    title: 'Fahrt auf Sicht',
    content: 'Bei Fahrt auf Sicht darf der Triebfahrzeugführer höchstens so schnell fahren, dass er den Zug vor einem Hindernis oder Haltsignal sicher zum Halten bringen kann. Die absolute Höchstgeschwindigkeit beträgt 40 km/h.',
    reference: 'Ril 408 (Fahrdienstvorschrift), Modul 408.0461, Abs. 4'
  },
  {
    id: 'f_zf_1',
    category: 'Zugfahrt',
    title: 'PZB 90 Zugarten & Prüfgeschwindigkeiten',
    content: 'PZB 90 Zugarten für 1000-Hz-Überwachung: • Zugart O (ab 111 Brh): 85 km/h nach 23 s. • Zugart M (66–110 Brh): 70 km/h nach 29 s. • Zugart U (bis 65 Brh): 55 km/h nach 38 s. Nach 700 m erlischt der 1000-Hz-Melder.',
    reference: 'Ril 483.0101 (Zugbeeinflussung PZB 90)'
  },
  {
    id: 'f_zf_2',
    category: 'Zugfahrt',
    title: 'PZB 90: Restriktiver Modus (Wechselblinken)',
    content: 'Fällt nach einer 1000-Hz- oder 500-Hz-Beeinflussung die Geschwindigkeit unter 10 km/h (bzw. bei Stillstand > 15 s), aktiviert sich der restriktive Modus (Wechselblinken 70/85 bzw. 55/70). Die Höchstgeschwindigkeit ist dann auf 45 km/h (1000 Hz) bzw. 25 km/h (500 Hz) limitiert.',
    reference: 'Ril 483.0101, Restriktive Geschwindigkeitsüberwachung'
  },
  {
    id: 'f_zf_3',
    category: 'Zugfahrt',
    title: 'Befehl 2: Vorbeifahrt an Halt zeigenden Signalen',
    content: 'Zeigt ein Hauptsignal Halt (Hp 0) oder ist es gestört/erloschen, darf der Zug daran nur vorbeifahren mit: Ersatzsignal (Zs 1), Vorsichtsignal (Zs 7), Gegengleisfahrt-Signal (Zs 8) oder schriftlichem Befehl 2 des Fahrdienstleiters.',
    reference: 'Ril 408.0411, Fahren auf besonderen Auftrag'
  },
  {
    id: 'f_zf_4',
    category: 'Zugfahrt',
    title: 'Nothaltauftrag im Zugfunk',
    content: 'Wortlaut bei akuter Gefahr: „Betriebsgefahr, alle Züge zwischen [A] und [B] sofort anhalten! Ich wiederhole: Betriebsgefahr, alle Züge zwischen [A] und [B] sofort anhalten! Hier [Name]“. Alle Züge im Abschnitt müssen sofort eine Schnellbremsung einleiten.',
    reference: 'Ril 408.0461 / KoRil 481, Notfallmanagement'
  },
  {
    id: 'f_zf_5',
    category: 'Zugfahrt',
    title: 'Signal Zp 9 (Abfahrauftrag)',
    content: 'Signal Zp 9 erteilt dem Lokführer den Abfahrauftrag nach Beendigung des Fahrgastwechsels. Als Lichtsignal: ein grün leuchtender Ring oder senkrechter Streifen; als Handsignal: weiße runde Scheibe mit grünem Ring oder grüne Handlampe.',
    reference: 'Ril 301 (Signalbuch), Signal Zp 9'
  },

  // --- SIGNALE (RIL 301 SIGNALBUCH) ---
  // ==========================================
  // --- SIGNALE (RIL 301 SIGNALBUCH AKT. 12) ---
  // ==========================================

  // --- 1. HAUPTSIGNALE (HP, HL, SV) ---
  {
    id: 'f_sig_hp0',
    category: 'Signale',
    title: 'Signal Hp 0 – Halt',
    content: 'Bedeutung:\nHalt.\n\nGeltung:\nGilt für Zug- und Rangierfahrten.\n\nSignalbild:\n• Formsignal: Ein Signalflügel (bei zweiflügligen Signalen der obere Flügel) zeigt waagerecht nach rechts. Nachtzeichen: Ein rotes Licht (🔴).\n• Lichtsignal: Ein rotes Licht (🔴) oder zwei rote Lichter nebeneinander (🔴 🔴).\n\nHinweis für Rangierfahrten:\nWird am Hauptsignal zusätzlich zum Signal Hp 0 das Signal Sh 1 bzw. Ra 12 (DV 301) gezeigt (⚪⚪), ist das Haltegebot für Rangierfahrten aufgehoben.',
    reference: 'Ril 301.0101 Abschnitt 2',
    isVerified: true
  },
  {
    id: 'f_sig_hp1',
    category: 'Signale',
    title: 'Signal Hp 1 – Fahrt',
    content: 'Bedeutung:\nFahrt.\n\nGeltung:\nGilt nur für Zugfahrten.\n\nSignalbild:\n• Formsignal: Ein Signalflügel (bei zweiflügligen Signalen der obere Flügel) zeigt schräg nach rechts aufwärts. Nachtzeichen: Ein grünes Licht (🟢).\n• Lichtsignal: Ein grünes Licht (🟢).\n\nGeschwindigkeit:\nErlaubt die Fahrt mit der im Fahrplan zugelassenen Höchstgeschwindigkeit, sofern sie nicht durch andere Signale oder Befehle eingeschränkt ist.',
    reference: 'Ril 301.0101 Abschnitt 3',
    isVerified: true
  },
  {
    id: 'f_sig_hp2',
    category: 'Signale',
    title: 'Signal Hp 2 – Langsamfahrt',
    content: 'Bedeutung:\nLangsamfahrt.\n\nGeltung:\nGilt nur für Zugfahrten.\n\nSignalbild:\n• Formsignal: Zwei Signalflügel zeigen schräg nach rechts aufwärts. Nachtzeichen: Ein grünes und senkrecht darunter ein gelbes Licht (🟢 über 🟡).\n• Lichtsignal: Ein grünes und senkrecht darunter ein gelbes Licht (🟢 über 🟡).\n\nGeschwindigkeit:\nSchreibt eine Geschwindigkeitsbeschränkung auf 40 km/h vor (sofern nicht durch Signal Zs 3 eine abweichende Geschwindigkeit angezeigt wird). Gilt vom Hauptsignal ab für den gesamten anschließenden Weichenbereich.',
    reference: 'Ril 301.0101 Abschnitt 4',
    isVerified: true
  },
  {
    id: 'f_sig_hl_uebersicht',
    category: 'Signale',
    title: 'Hl-Signale – Systemübersicht (DV 301)',
    content: 'Bedeutung:\nHl-Signale (Lichthaupt- und Lichtvorsignale) vereinigen Haupt- und Vorsignalfunktion auf einem gemeinsamen Signalschirm:\n\n1. Oberes Licht (Vorsignalfunktion für folgendes Signal):\n• 🟢 Standlicht: Fahrt mit Höchstgeschwindigkeit (Hl 1, Hl 2, Hl 3a/b)\n• 🟢 Blinklicht: Höchstgeschwindigkeit auf 100 km/h ermäßigen (Hl 4, Hl 5, Hl 6a/b)\n• 🟡 Blinklicht: Höchstgeschwindigkeit auf 40/60 km/h ermäßigen (Hl 7, Hl 8, Hl 9a/b)\n• 🟡 Standlicht: Halt erwarten (Hl 10, Hl 11, Hl 12a/b)\n\n2. Unteres Licht & Lichtstreifen (Geschwindigkeit ab diesem Signal):\n• Kein unteres Licht: Streckengeschwindigkeit\n• 🟡 unteres Licht + grüner Streifen: 100 km/h\n• 🟡 unteres Licht + gelber Streifen: 60 km/h\n• 🟡 unteres Licht ohne Streifen: 40 km/h',
    reference: 'Ril 301.0103 & 301.0103A01',
    isVerified: true
  },
  {
    id: 'f_sig_sv_uebersicht',
    category: 'Signale',
    title: 'Sv-Signale – Signalverbindungen (S-Bahn)',
    content: 'Bedeutung:\nHaupt- und Vorsignalverbindungen (z.B. S-Bahn Hamburg/Berlin) auf geteiltem Signalschirm:\n\n• Linke Lichter (Hauptsignal):\n  - 🟡🟡 (Sv 0): Zughalt! Weiterfahrt auf Sicht.\n  - 🟢: Fahrt mit Streckengeschwindigkeit.\n  - 🟢 über 🟡: Langsamfahrt mit 40 km/h.\n\n• Rechte Lichter (Vorsignal):\n  - 🟢: Fahrt erwarten.\n  - 🟢 über 🟡: Langsamfahrt erwarten.\n  - 🟡: Halt erwarten.\n\n• Signalbegriffe:\n  - Sv 1: Fahrt! Fahrt erwarten (🟢 🟢)\n  - Sv 2: Fahrt! Halt erwarten (🟢 🟡)\n  - Sv 3: Fahrt! Langsamfahrt erwarten (🟢 🟢/🟡)\n  - Sv 4: Langsamfahrt! Fahrt erwarten (🟢/🟡 🟢)\n  - Sv 5: Langsamfahrt! Langsamfahrt erwarten (🟢/🟡 🟢/🟡)\n  - Sv 6: Langsamfahrt! Halt erwarten (🟢/🟡 🟡)',
    reference: 'Ril 301.0104 Abschnitte 1–10',
    isVerified: true
  },

  // --- 2. KOMBINATIONSSIGNALE (KS) ---
  {
    id: 'f_sig_ks1',
    category: 'Signale',
    title: 'Signal Ks 1 – Fahrt',
    content: 'Bedeutung:\nFahrt mit der im Fahrplan zugelassenen Geschwindigkeit.\n\nSignalbild:\n• Ein grünes Standlicht (🟢) oder\n• Ein grünes Blinklicht (🟢⚡).\n\nBesonderheit des Blinklichts:\nDas Signal Ks 1 blinkt, wenn am Vorsignal oder Hauptsignal mit Vorsignalfunktion zusätzlich ein Geschwindigkeitsvoranzeiger (Signal Zs 3v) leuchtet und eine Geschwindigkeitsreduzierung am nächsten Signal ankündigt.\n\nGeltung:\nKs-Signale gelten nur für Zugfahrten.',
    reference: 'Ril 301.0102 Abschnitt 2',
    isVerified: true
  },
  {
    id: 'f_sig_ks2',
    category: 'Signale',
    title: 'Signal Ks 2 – Halt erwarten',
    content: 'Bedeutung:\nHalt erwarten.\n\nSignalbild:\nEin gelbes Standlicht (🟡).\n\nFunktion:\nErlaubt die Vorbeifahrt am Signal und kündigt Halt am nächsten Signal (Hauptsignal oder Schutzsignal Sh 0/Sh 2) an.',
    reference: 'Ril 301.0102 Abschnitt 3',
    isVerified: true
  },
  {
    id: 'f_sig_ks_zusatzlicht',
    category: 'Signale',
    title: 'Ks-Signale: Weißes Zusatzlicht',
    content: 'Bedeutung des weißen Zusatzlichts bei Ks-Signalen:\n\n1. Weißes Zusatzlicht ÜBER dem Signallicht (⚪):\nKennzeichnet ein Hauptsignal mit Vorsignalfunktion, das in einem um mehr als 5 % verkürzten Bremswegabstand der Strecke vor dem folgenden Signal steht (wird bei Ks 1 mit Zs 3v und bei Ks 2 gezeigt).\n\n2. Weißes Zusatzlicht UNTER dem Signallicht (⚪):\nKennzeichnet einen Ks-Vorsignalwiederholer (wird bei Ks 1 mit Zs 3v und bei Ks 2 gezeigt; bei Ks 1 ohne Zs 3v bleibt das Zusatzlicht dunkel).',
    reference: 'Ril 301.0102 Abschnitt 1 (3) und (4)',
    isVerified: true
  },

  // --- 3. ZUSATZSIGNALE (ZS) ---
  {
    id: 'f_sig_zs1',
    category: 'Signale',
    title: 'Signal Zs 1 – Ersatzsignal',
    content: 'Bedeutung:\nAm Signal Hp 0 oder am gestörten Lichthauptsignal ohne schriftlichen Befehl vorbeifahren.\n\nSignalbild:\n• Drei weiße Lichter in Form eines A (⚪ ⚪ / ⚪) oder\n• Ein weißes Blinklicht (⚪⚡).\n\nRegeln:\n• Gilt auch weiter, wenn es erlischt, bevor die Zugspitze am Signal vorbeigefahren ist.\n• Höchstgeschwindigkeit im anschließenden Weichenbereich: maximal 40 km/h.',
    reference: 'Ril 301.0301 Abschnitt 2',
    isVerified: true
  },
  {
    id: 'f_sig_zs2',
    category: 'Signale',
    title: 'Signal Zs 2 & Zs 2v – Richtungsanzeiger & -voranzeiger',
    content: 'Bedeutung:\n• Signal Zs 2 (Richtungsanzeiger): Die Fahrstraße führt in die angezeigte Richtung. Signalbild: Ein weißleuchtender Buchstabe.\n• Signal Zs 2v (Richtungsvoranzeiger): Richtungsanzeiger (Zs 2) erwarten. Signalbild: Ein gelbleuchtender Buchstabe (im Bereich der DV 301 bis auf weiteres auch weißleuchtend).\n\nZweck:\nKennzeichnet bei Streckenverzweigungen oder größeren Bahnhöfen das eingestellte Zielgleis bzw. die Fahrtrichtung.',
    reference: 'Ril 301.0301 Abschnitte 3 & 4',
    isVerified: true
  },
  {
    id: 'f_sig_zs3',
    category: 'Signale',
    title: 'Signal Zs 3 & Zs 3v – Geschwindigkeitsanzeiger & -voranzeiger',
    content: 'Bedeutung:\n• Signal Zs 3 (Geschwindigkeitsanzeiger): Die durch die Kennziffer angezeigte Geschwindigkeit darf vom Signal ab im anschließenden Weichenbereich nicht überschritten werden. Kennziffer $\\times$ 10 = km/h (z.B. Kennziffer „6“ = 60 km/h, „3“ = 30 km/h für Stumpfgleise/kurze Durchrutschwege).\n  - Formsignal: Weiße Kennziffer auf dreieckiger schwarzer Tafel.\n  - Lichtsignal: Weiß leuchtende Kennziffer.\n\n• Signal Zs 3v (Geschwindigkeitsvoranzeiger): Geschwindigkeitsanzeiger (Zs 3) erwarten.\n  - Formsignal: Gelbe Kennziffer auf schwarzer Tafel mit gelbem Rand.\n  - Lichtsignal: Gelb leuchtende Kennziffer.',
    reference: 'Ril 301.0301 Abschnitte 5 & 6',
    isVerified: true
  },
  {
    id: 'f_sig_zs6',
    category: 'Signale',
    title: 'Signal Zs 6 – Gegengleisanzeiger',
    content: 'Bedeutung:\nDer Fahrweg führt in das Streckengleis entgegen der gewöhnlichen Fahrtrichtung.\n\nSignalbild:\n• Lichtsignal: Ein weiß leuchtender schräger Lichtstreifen von rechts nach links steigend (Enden meist senkrecht abgebogen).\n• Formsignal: Rechteckige schwarze Scheibe mit weißem Rand und weißem schräg steigendem Streifen.\n\nGeltung:\nErteilt den Auftrag, das Gegengleis bis zum nächsten Bahnhof (bzw. zur nächsten Überleit-/Abzweigstelle) zu befahren.',
    reference: 'Ril 301.0301 Abschnitt 7',
    isVerified: true
  },
  {
    id: 'f_sig_zs7',
    category: 'Signale',
    title: 'Signal Zs 7 – Vorsichtsignal',
    content: 'Bedeutung:\nAm Signal Hp 0 oder am gestörten Lichthauptsignal ohne schriftlichen Befehl vorbeifahren! Weiterfahrt auf Sicht.\n\nSignalbild:\nDrei gelbe Lichter in Form eines V (🟡 🟡 / 🟡).\n\nGeltung & Fahrweise:\n• Auf Sicht fahren: Geschwindigkeit so einrichten, dass vor jedem Hindernis oder Haltsignal sicher angehalten werden kann (maximal 40 km/h).\n• Gilt bis zum nächsten Hauptsignal plus 400 m darüber hinaus.',
    reference: 'Ril 301.0301 Abschnitt 8',
    isVerified: true
  },
  {
    id: 'f_sig_zs8',
    category: 'Signale',
    title: 'Signal Zs 8 – Gegengleisfahrt-Ersatzsignal',
    content: 'Bedeutung:\nAm Halt zeigenden oder gestörten Hauptsignal vorbeifahren, der Fahrweg führt in das Streckengleis entgegen der gewöhnlichen Fahrtrichtung.\n\nSignalbild:\n• Drei blinkende weiße Lichter in Form eines A (⚪⚡) oder\n• Ein weißblinkender Lichtstreifen von rechts nach links steigend.\n\nFunktion:\nKombiniert Ersatzsignal (Zs 1) und Gegengleisanzeiger (Zs 6) in einem Signalbild. Gilt bis zum nächsten Bahnhof.',
    reference: 'Ril 301.0301 Abschnitt 9',
    isVerified: true
  },
  {
    id: 'f_sig_zs9',
    category: 'Signale',
    title: 'Signal Zs 9 – Bahnübergangstafel (Bü-Tafel, DV 301)',
    content: 'Bedeutung:\nNach dem zulässigen Vorbeifahren an dem Halt zeigenden oder gestörten Lichthauptsignal: Halt vor dem Bahnübergang! Weiterfahrt nach Sicherung.\n\nSignalbild:\nEine dreieckige weiße Tafel mit rotem Rand und schwarzem Gatter (ggf. mit schwarzer Ziffer für die Anzahl der betroffenen BÜ).\n\nAnwendung:\nSteht vor Lichthauptsignalen mit weiß-gelb-weiß-gelb-weißem oder rotem Mastschild, die nur dann Fahrt zeigen, wenn der BÜ technisch gesichert ist.',
    reference: 'Ril 301.0301 Abschnitt 10',
    isVerified: true
  },
  {
    id: 'f_sig_zs10',
    category: 'Signale',
    title: 'Signal Zs 10 – Endesignal (DS 301)',
    content: 'Bedeutung:\nEnde der Geschwindigkeitsbeschränkung.\n\nSignalbild:\n• Formsignal: Ein weißer Pfeil mit der Spitze nach oben auf pfeilförmiger schwarzer Tafel.\n• Lichtsignal: Ein weißleuchtender Pfeil mit der Spitze nach oben.\n\nFunktion:\nZeigt an, dass eine mit Signal Hp 2 oder Signal Zs 3 vorgeschriebene Geschwindigkeitsbeschränkung bereits vor dem Ende des anschließenden Weichenbereichs aufgehoben ist.',
    reference: 'Ril 301.0301 Abschnitt 11',
    isVerified: true
  },
  {
    id: 'f_sig_zs12',
    category: 'Signale',
    title: 'Signal Zs 12 – M-Tafel',
    content: 'Bedeutung:\nAm Halt zeigenden oder gestörten Hauptsignal auf mündlichen oder fernmündlichen Auftrag des Fahrdienstleiters vorbeifahren.\n\nSignalbild:\nEine weiße Tafel mit rotem Rand und rotem „M“ in Schreibschrift.\n\nVerhalten:\nNach dem Halten vor dem Signal darf der Triebfahrzeugführer auf mündlichen/fernmündlichen Auftrag des Fdl (oder der örtlichen Aufsicht) ohne schriftlichen Befehl vorbeifahren.',
    reference: 'Ril 301.0301 Abschnitt 12',
    isVerified: true
  },
  {
    id: 'f_sig_zs13',
    category: 'Signale',
    title: 'Signal Zs 13 – Stumpfgleis- und Frühhaltanzeiger',
    content: 'Bedeutung:\nFahrt in ein Stumpfgleis oder in ein Gleis mit verkürztem Einfahrweg.\n\nSignalbild:\n• Formsignal: Ein um 90° nach links umgelegtes gelbes rückstrahlendes „T“ auf schwarzer Tafel.\n• Lichtsignal: Ein um 90° nach links umgelegtes gelbleuchtendes „T“.\n\nAnwendung:\nErscheint bei Einfahrten in Stumpfgleise (Kopfbahnhöfe ausgenommen), abschnittsweise unterteilte Gleise oder bei um mehr als 30 % verkürztem Einfahrweg.',
    reference: 'Ril 301.0301 Abschnitt 13',
    isVerified: true
  },
  {
    id: 'f_sig_zs103',
    category: 'Signale',
    title: 'Signal Zs 103 – Rautentafel (DV 301)',
    content: 'Bedeutung:\nDas Halt zeigende Hauptsignal gilt nicht für Rangierabteilungen.\n\nSignalbild:\nEine rechteckige schwarze Tafel mit senkrecht übereinander angeordneten weißen Rauten.\n\nAnwendung:\nAm Hauptsignal angebracht; befreit Rangierfahrten vom Haltegebot des Signals Hp 0.',
    reference: 'Ril 301.0301 Abschnitt 14',
    isVerified: true
  },

  // --- 4. WEICHENSIGNALE (WN) ---
  {
    id: 'f_sig_wn1',
    category: 'Signale',
    title: 'Signal Wn 1 – Gerader Zweig',
    content: 'Bedeutung:\nDie Weiche ist für den geraden Zweig (bzw. schwächer gebogenen Zweig bei Innenbogenweichen) gestellt.\n\nSignalbilder:\n• Formsignal: Ein auf der Schmalseite stehendes weißes Rechteck auf schwarzem Grund (von der Spitze oder vom Herzstück aus).\n• Lichtsignal: Zwei senkrecht übereinander stehende weiße Lichter (⚪ über ⚪).\n• Rückfallweichen: Weißes Symbol auf orangefarbenem Grund.',
    reference: 'Ril 301.0801 Abschnitt 2',
    isVerified: true
  },
  {
    id: 'f_sig_wn2',
    category: 'Signale',
    title: 'Signal Wn 2 – Gebogener Zweig',
    content: 'Bedeutung:\nDie Weiche ist für den gebogenen Zweig (bzw. stärker gebogenen Zweig) gestellt.\n\nSignalbilder:\n• Von der Weichenspitze aus:\n  - Formsignal: Ein weißer Pfeil auf schwarzem Grund zeigt schräg nach links oder rechts aufwärts.\n  - Lichtsignal: Zwei nebeneinander stehende weiße Lichter (⚪ ⚪).\n• Vom Herzstück aus:\n  - Formsignal: Eine runde weiße Scheibe auf schwarzem Grund (bei Außenbogenweichen eine nach links/rechts geöffnete Sichel).',
    reference: 'Ril 301.0801 Abschnitt 3',
    isVerified: true
  },
  {
    id: 'f_sig_wn_dkw',
    category: 'Signale',
    title: 'Signale Wn 3 bis Wn 6 – Doppelte Kreuzungsweichen (DKW)',
    content: 'Bedeutung an doppelten Kreuzungsweichen (DKW):\n(Unterer Pfeil = Fahrt in die Weiche, oberer Pfeil = Fahrt aus der Weiche):\n\n• Wn 3: Gerade von links nach rechts (Pfeile bilden eine von links nach rechts steigende Linie).\n• Wn 4: Gerade von rechts nach links (Pfeile bilden eine von rechts nach links steigende Linie).\n• Wn 5: Bogen von links nach links (Pfeile bilden einen nach links geöffneten rechten Winkel).\n• Wn 6: Bogen von rechts nach rechts (Pfeile bilden einen nach rechts geöffneten rechten Winkel).',
    reference: 'Ril 301.0801 Abschnitte 4–8',
    isVerified: true
  },
  {
    id: 'f_sig_wn7',
    category: 'Signale',
    title: 'Signal Wn 7 – Gleissperrensignal',
    content: 'Bedeutung:\nDie Gleissperre ist abgelegt.\n\nSignalbild:\nEin senkrechter schwarzer Streifen in einer runden weißen Scheibe auf schwarzem Grund.\n\nRückseite bei Tage: Eine kleine weiße runde Scheibe auf schwarzem Grund.\n\nWichtiger Hinweis:\nDurch das Signal Wn 7 wird keine Zustimmung des Weichenwärters zur Rangierfahrt erteilt!',
    reference: 'Ril 301.0801 Abschnitt 9',
    isVerified: true
  },

  // --- 5. NEBENSIGNALE (NE / SO) ---
  {
    id: 'f_sig_ne1',
    category: 'Signale',
    title: 'Signal Ne 1 – Trapeztafel',
    content: 'Bedeutung:\nKennzeichnung der Stelle, wo bestimmte Züge vor einer Betriebsstelle zu halten haben.\n\nSignalbild:\nEine weiße Trapeztafel mit schwarzem Rand an schwarz und weiß schräg gestreiftem Pfahl.\n\nAnwendung:\n• Vor Bahnhöfen ohne Einfahrsignale (z.B. Nebenbahnen, Zugleitbetrieb).\n• An Gleisen entgegen der gewöhnlichen Fahrtrichtung (Gegengleis) ohne Haupt-/Sperrsignal (dann mit Kilometerangabe).',
    reference: 'Ril 301.1401 Abschnitt 1',
    isVerified: true
  },
  {
    id: 'f_sig_ne2',
    category: 'Signale',
    title: 'Signal Ne 2 – Vorsignaltafel',
    content: 'Bedeutung:\nKennzeichnung des Standorts eines Vorsignals.\n\nSignalbild:\nEine schwarzgeränderte weiße Tafel mit zwei übereinander stehenden schwarzen Winkeln, die sich mit der Spitze berühren.\n\nVerkürzter Bremswegabstand:\nSteht das Vorsignal um mehr als 5 % kürzer als der Bremsweg der Strecke vor dem Hauptsignal, trägt die Tafel am oberen Rand ein auf der Spitze stehendes weißes Dreieck mit schwarzem Rand.',
    reference: 'Ril 301.1401 Abschnitt 2',
    isVerified: true
  },
  {
    id: 'f_sig_ne3',
    category: 'Signale',
    title: 'Signal Ne 3 – Vorsignalbaken',
    content: 'Bedeutung:\nEin Vorsignal ist zu erwarten.\n\nSignalbild:\nMehrere aufeinanderfolgende weiße Tafeln mit nach rechts steigenden schwarzen Streifen:\n• 3 Streifen = ca. 250 m vor dem Vorsignal\n• 2 Streifen = ca. 175 m vor dem Vorsignal\n• 1 Streifen = ca. 100 m vor dem Vorsignal\n\nBesonderheit: Bei verkürztem Bremswegabstand trägt die 1. Bake (mit 3 Streifen) ein auf der Spitze stehendes weißes Dreieck.',
    reference: 'Ril 301.1401 Abschnitt 3',
    isVerified: true
  },
  {
    id: 'f_sig_ne4',
    category: 'Signale',
    title: 'Signal Ne 4 – Schachbretttafel',
    content: 'Bedeutung:\nDas Hauptsignal steht – abweichend von der Regel – an einem anderen Standort.\n\nSignalbild:\nEine viereckige, schachbrettartig schwarz und weiß gemusterte Tafel.\n\nStandort:\nSteht an der Stelle, an der sich das Hauptsignal nach der Regel befinden müsste (in der Regel rechts vom Gleis) und verweist auf das Signal auf der linken Seite.',
    reference: 'Ril 301.1401 Abschnitt 4',
    isVerified: true
  },
  {
    id: 'f_sig_ne5',
    category: 'Signale',
    title: 'Signal Ne 5 – Haltetafel (H-Tafel)',
    content: 'Bedeutung:\nKennzeichnung des Halteplatzes der Zugspitze bei planmäßig haltenden Zügen.\n\nSignalbild:\nEine hochstehende weiße Rechteckscheibe mit schwarzem H (oder schwarze Scheibe mit weißem H).\n\nZusätze:\n• Kann mit Längenangaben (z.B. „150 m“) für Reisezüge ergänzt sein.\n• Ein weiß blinkendes „H“ zeigt die Anforderung eines Bedarfshalts an.',
    reference: 'Ril 301.1401 Abschnitt 5',
    isVerified: true
  },
  {
    id: 'f_sig_ne6',
    category: 'Signale',
    title: 'Signal Ne 6 – Haltepunkttafel',
    content: 'Bedeutung:\nEin Haltepunkt ist zu erwarten.\n\nSignalbild:\nEine schräg zum Gleis gestellte waagerechte weiße Tafel mit drei schwarzen Schrägstreifen.\n\nAufstellung:\nSteht vor schwer erkennbaren Bahnsteigen/Haltepunkten:\n• Auf Hauptbahnen im Bremswegabstand der Strecke,\n• Auf Nebenbahnen 150 m vor dem Bahnsteig.',
    reference: 'Ril 301.1401 Abschnitt 6',
    isVerified: true
  },
  {
    id: 'f_sig_ne7',
    category: 'Signale',
    title: 'Signal Ne 7 – Schneepflugtafel',
    content: 'Bedeutung & Signalbilder:\n• Signal Ne 7a: Pflugschar heben! (Eine weiße oder gelbe Pfeilspitze mit schwarzem Rand zeigt nach oben).\n• Signal Ne 7b: Pflugschar senken! (Eine weiße oder gelbe Pfeilspitze mit schwarzem Rand zeigt nach unten).\n\nGeltung:\nGilt für Schneepflüge mit beweglichen Pflugscharen vor Hindernissen im Gleisbett (z.B. Bahnübergänge, Weichen, Gleismagnete).',
    reference: 'Ril 301.1401 Abschnitt 7',
    isVerified: true
  },
  {
    id: 'f_sig_ne12_13',
    category: 'Signale',
    title: 'Signal Ne 12 & Ne 13 – Signale für Rückfallweichen',
    content: 'Bedeutung & Signalbilder:\n\n• Signal Ne 12 (Ankündigungsbake):\nÜberwachungssignal einer Rückfallweiche beachten. (Rechteckige orangefarbene Tafel mit zwei waagerechten weißen Streifen).\n\n• Signal Ne 13a:\nDie Rückfallweiche ist gegen die Spitze befahrbar. (Ein weißes Licht über orangefarbenem waagerechtem Streifen und orange-weiß schräg gestreiftem Mastschild).\n\n• Signal Ne 13b:\nDie Rückfallweiche ist gegen die Spitze nicht befahrbar – vor der Weiche halten! (Nur orangefarbener Streifen über orange-weiß gestreiftem Mastschild).',
    reference: 'Ril 301.1401 Abschnitte 8 & 9',
    isVerified: true
  },
  {
    id: 'f_sig_ne14',
    category: 'Signale',
    title: 'Signal Ne 14 – ETCS-Halt-Tafel (ETCS Stop marker)',
    content: 'Bedeutung:\nHalt für Züge in ETCS-Betriebsart SR (Staff Responsible).\n\nSignalbild:\nEin gelber Pfeil mit weißem Rand auf einer blauen quadratischen Tafel mit Blockstellen-Kennzeichnung.\n\nGeltung als alleinstehendes Signal:\nGebietet Halt für Züge, die nicht in den ETCS-Betriebsarten FS (Full Supervision) oder OS (On Sight) verkehren, sowie für Rangier- und Kleinwagenfahrten.',
    reference: 'Ril 301.1401 Abschnitt 10',
    isVerified: true
  },
  {
    id: 'f_sig_so_signale',
    category: 'Signale',
    title: 'Signale So 1, So 19 & So 106 (DV 301)',
    content: 'Nebensignale im Geltungsbereich der DV 301:\n\n• Signal So 1 (Endtafel – S-Bahn Berlin):\nFahren auf Sicht beenden (viereckige rote Tafel mit liegendem weißem Kreuz).\n\n• Signal So 19 (Hauptsignalbaken):\nEin Hauptsignal ist zu erwarten (drei orangefarbene Tafeln mit 3, 2 bzw. 1 weißer Kreisfläche in 250 m, 175 m, 100 m vor dem Hauptsignal).\n\n• Signal So 106 (Kreuztafel):\nBei fehlendem Vorsignal wird angezeigt, dass ein Hauptsignal zu erwarten ist (weiße Sechseckscheibe mit liegendem schwarzem Kreuz auf Nebenbahnen).',
    reference: 'Ril 301.1401 Abschnitte 11–13',
    isVerified: true
  },
  {
    id: 'f6',
    category: 'Wagenprüfung',
    title: 'Grenzmaß für Flachstellen',
    content: 'Flachstellen an Radreifen von Güterwagen dürfen eine Länge von 60 mm nicht überschreiten. Bei Überschreitung muss der Wagen ausgesetzt und der Instandhaltung zugeführt werden, um Schienenbeschädigungen zu vermeiden.',
    reference: 'Ril 937 (Wagenprüfung), Modul 937.0102, Abs. 7'
  },
  // --- WAGENMEISTER & WAGENPRÜFER STUFE 4 (KOMBINIERTER VERKEHR) ---
  {
    id: 'f_wm_1',
    category: 'Wagenmeister',
    title: 'Aufgaben und Verantwortung des Wagenprüfers Stufe 4 im Kombinierten Verkehr',
    content: 'Der Wagenprüfer Stufe 4 führt die wagentechnische Untersuchung von Zügen des Kombinierten Verkehrs (KV) und Gefahrgutzügen durch. Zu den Kernaufgaben gehören:\n1. Prüfung der Ladeeinheiten (Container, Wechselbehälter, Sattelanhänger) auf Zustand, Beschädigung und Verriegelung.\n2. Prüfung der Trägerfahrzeuge (Taschenwagen, Tragwagen) inkl. Klappriegel, Stützböcke, Zapfenschlösser und Radmulden.\n3. Abgleich der Kodifizierung (Profilnummern C/P) mit der Streckenfreigabe nach UIC 596-6.\n4. Gefahrgutprüfung nach RID (Großzettel, UN-Tafeln, Beförderungspapiere).',
    reference: 'VDV-Schrift 758 / VDV-Schrift 753 / UIC 596-6',
    isVerified: true
  },
  {
    id: 'f_wm_2',
    category: 'Wagenmeister',
    title: 'Verriegelung des Königszapfens (Kingpin) im Stützbock',
    content: 'Beim Verladen eines Sattelanhängers (Trailers) in die Tasche eines Taschenwagens (z.B. T2000, T3000e) greift der Königszapfen (2 Zoll oder 3,5 Zoll) in die Verriegelungsklaue des Stützbocks. Prüfpunkte:\n1. Der Sperrhebel / die Verriegelungsanzeige muss vollständig in verriegelter Position eingerastet sein (oft Farbmarkierung grün sichtbar).\n2. Das Zapfenschloss muss spielfrei anliegen.\n3. Die Stützbockhöhe muss passend zur Codierung eingestellt und arretiert sein (Bockhöhe H1 bis H4).',
    reference: 'VDV 758 / UIC 571-4 / Bedienungsanleitung Tragwagen T3000e',
    isVerified: true
  },
  {
    id: 'f_wm_3',
    category: 'Wagenmeister',
    title: 'Vorschriftsmäßige Vorbereitung eines Trailers für den Bahntransport',
    content: 'Bevor ein Sattelanhänger im Taschenwagen transportiert werden darf, müssen folgende Punkte geprüft sein:\n1. Luftfederung des Trailers muss vollständig entlüftet / abgesenkt sein (Schalter auf "Fahrt/Bahnverladung" oder manuelle Entlüftung).\n2. Feststellbremse (Federspeicher) des Trailers muss eingelegt sein.\n3. Stützbeine des Trailers müssen ganz eingekurbelt und gesichert sein (Bodenfreiheit!).\n4. Planen, Spriegel und Hecktüren müssen geschlossen und ordnungsgemäß verriegelt/verzurrt sein.\n5. Unterfahrschutz muss ggf. hochgeklappt bzw. in Bahnposition verriegelt sein.',
    reference: 'VDV-Schrift 758 / UIC 596-5 / ILU-Code Richtlinien',
    isVerified: true
  },
  {
    id: 'f_wm_4',
    category: 'Wagenmeister',
    title: 'Prüfung und Grenzmaße von Klappriegeln für ISO-Container und WAB',
    content: 'Tragwagen besitzen feste und umklappbare Riegelbolzen (Klappriegel / Twistlocks) zur formschlüssigen Aufnahme der Eckbeschläge (Corner Castings):\n1. Nicht benötigte Riegelbolzen müssen vollständig umgelegt und unter die Ladeebene versenkt sein, damit Containerböden nicht aufliegen oder beschädigt werden.\n2. Genutzte Klappriegel müssen senkrecht stehen und die Sicherungsklinke muss gegen selbsttätiges Umklappen gesichert sein.\n3. Riegelzapfen dürfen keine Risse, Verbiegungen oder Abscherungen aufweisen.',
    reference: 'AVV / GCU Anhang 9, Ziffer 4.2 / UIC 571-4',
    isVerified: true
  },
  {
    id: 'f_wm_5',
    category: 'Wagenmeister',
    title: 'Bedeutung und Aufbau der Codenummerntafel (P- und C-Nummern)',
    content: 'Die gelbe Codenummerntafel an Ladeeinheiten kennzeichnet das Profilmaß:\n• C-Code (Container/Wechselbehälter): z.B. C 45, C 70 – gibt die zulässige Eckhöhe bzw. Profilkontur an.\n• P-Code (Pocket / Sattelanhänger): z.B. P 400 – gibt die Gesamthöhe des Trailers auf Standard-Taschenwagen (Stützbockhöhe 33 cm) an (z.B. P 400 = 4,00 m Eckhöhe über SO).\nDas Profil der Ladeeinheit darf die für die befahrbare Eisenbahnstrecke freigegebene Streckenkodierung nicht überschreiten!',
    reference: 'UIC-Merkblatt 596-6 / VDV 758',
    isVerified: true
  },
  {
    id: 'f_wm_6',
    category: 'Wagenmeister',
    title: 'Greifkantenmarkierungen und Hubpunkte nach UIC 596-5',
    content: 'Nur kranbare Trailer dürfen mit Portalkran / Reachstacker umgeschlagen werden. Erkennungsmerkmale:\n1. Gelbe Warndreiecke / Markierungen an den 4 Greifkantenbereichen am Fahrgestell.\n2. Keine Beschädigung oder Verformung der Greifkantentaschen und Unterzugträger.\n3. ILU-Code (Intermodal Loading Unit) bzw. BIC-Code an den Außenwänden zur eindeutigen Identifikation im europäischen KV-Netz.',
    reference: 'UIC 596-5 / DIN EN 13044 (ILU-Code)',
    isVerified: true
  },
  {
    id: 'f_wm_7',
    category: 'Wagenmeister',
    title: 'Prüfkriterien für Wechselbehälter (WAB) nach EN 284 / EN 452',
    content: 'Bei Wechselbehältern (Wechselbrücken) auf Tragwagen ist zwingend zu kontrollieren:\n1. Die 4 Stützbeine müssen vollständig eingeklappt, an den Fahrzeugunterbau herangeschwenkt und mit den Sicherungsbolzen formschlüssig arretiert sein.\n2. Eckbeschläge müssen sauber auf den Klappriegeln aufsitzen (kein Verkanten, Riegelzapfen greift vollständig ein).\n3. Aufbauwände, Rollos und Flügeltüren müssen intakt und gegen Aufspringen gesichert sein.',
    reference: 'VDV 758 / AVV Anhang 9 / DIN EN 284',
    isVerified: true
  },
  {
    id: 'f_wm_8',
    category: 'Wagenmeister',
    title: 'Grenzmaße am Radsatz: qR-Maß, Spurkranzdicke und -höhe',
    content: 'Kritische Grenzmaße zur Entgleisungssicherheit bei der Wagenprüfung:\n• qR-Maß (Spurkranzflankensteile): Grenzwert: qR <= 6,5 mm (Messung mit qR-Lehre). Bei qR <= 6,5 mm besteht akute Entgleisungsgefahr an Weichen (Aufklettern der Spurkranzflanke)!\n• Spurkranzdicke (Sd): Grenzwert: Sd <= 22 mm (bzw. nach Wagenraster).\n• Spurkranzhöhe (Sh): Grenzwert: Sh > 36 mm (Gefahr des Aufsetzens auf Schienenbefestigungen).\n• Gratbildung: Grat am Spurkranz >= 5 mm ist unzulässig.',
    reference: 'AVV / GCU Anhang 9, Ziffer 1.2 / VDV-Schrift 758 / Ril 936',
    isVerified: true
  },
  {
    id: 'f_wm_9',
    category: 'Wagenmeister',
    title: 'Beurteilung von Flachstellen und Materialaufschweißungen am Rad',
    content: 'Grenzwerte nach AVV / GCU Anhang 9:\n• Flachstelle / Materialaufschweißung: Zulässig bis maximal 60 mm Länge (bei Raddurchmesser >= 840 mm). Über 60 mm: Wagen ist nicht lauffähig (Ausreihung erforderlich).\n• Ausbröckelungen / Schälungen: Bis max. 60 mm Länge zulässig, sofern keine Rissbildung in die Radfelge vorliegt.\n• Rissbildung: Jeder Riss in Radscheibe, Radkranz, Nabe oder Radwelle führt zum sofortigen Stillstand (Betriebsgefahr / Radbruchgefahr!).',
    reference: 'AVV Anhang 9, Ziffer 1.3 / VDV 758',
    isVerified: true
  },
  {
    id: 'f_wm_10',
    category: 'Wagenmeister',
    title: 'Schadensbeurteilung an Blattfedern, Parabelfedern und Schaken',
    content: 'Bei der Wagenprüfung gelten folgende Mängel an der Federung als betriebsgefährdend:\n1. Federhauptblatt (1. Lage) gebrochen oder gerissen: Sofortige Betriebsunfähigkeit.\n2. Mehr als ein Zwischenblatt gebrochen: Wagen aussetzen.\n3. Federbundverschiebung um mehr als 10 mm.\n4. Federschaken / Schakenbolzen gebrochen, ausgeschlagen, Sicherungssplint fehlt oder Bolzen wandert heraus.\n5. Schiefe Lage des Wagenkastens durch Federbruch oder Federüberlastung.',
    reference: 'AVV Anhang 9, Ziffer 2.1 / Ril 936',
    isVerified: true
  },
  {
    id: 'f_wm_11',
    category: 'Wagenmeister',
    title: 'Besondere Prüfpunkte am Standard-Güterwagendrehgestell Y25',
    content: 'Das Drehgestell Bauart Y25 ist das Standard-Drehgestell in Europa. Wichtige Prüfpunkte:\n1. Gleitstückspiel: Das Spiel zwischen Gleitstück und Wagenkasten muss gleichmäßig vorhanden sein (Sollmaß typisch 3–5 mm pro Seite bzw. nach Wagenanschrift). Fest aufliegende Gleitstücke behindern das Ausdrehen des Drehgestells im Bogen (Entgleisungsgefahr!).\n2. Lenkerbolzen & Schaken: Verschleiß und Sicherungen prüfen.\n3. Bremsdreieck & Bremsquerhaupt: Fangschlaufen müssen intakt und unbeschädigt sein (verhindert das Herabfallen ins Gleisbett).',
    reference: 'VDV-Schrift 758 / GCU Anhang 9 / UIC 510-1',
    isVerified: true
  },
  {
    id: 'f_wm_12',
    category: 'Wagenmeister',
    title: 'Prüfkriterien an Puffern und Schraubenkupplungen',
    content: 'Mängel an Zug- und Stoßeinrichtungen:\n• Puffer: Mindesthub beachten; Pufferteller darf keine Risse oder Ausbrüche aufweisen; Pufferstößel muss gefedert sein (kein Blockstand / Durchfedern ohne Rückstellung). Höhenunterschied zwischen Puffermitten gekuppelter Fahrzeuge max. 125 mm.\n• Schraubenkupplung: Zughakenmaul auf Risse und Aufweitung prüfen; Spindelgewinde muss leichtgängig sein; Kupplungslasche und Zugbügel dürfen keine Risse oder unzulässige Schweißungen aufweisen. Die unbenutzte Kupplung muss zwingend im Kupplungshaken aufgehängt sein.',
    reference: 'AVV Anhang 9, Ziffer 3 / VDV 758 / Ril 936',
    isVerified: true
  },
  {
    id: 'f_wm_13',
    category: 'Wagenmeister',
    title: 'Bedeutung der Schadwagenzettel (Muster I, K, M, R1, U)',
    content: 'Die Kennzeichnung von Schadwagen nach AVV Anhang 9 / 11:\n• Muster I (blau): Wagen ist betriebsunfähig / nicht lauffähig (Darf nicht bewegt werden bzw. nur auf Hilfsdrehgestell).\n• Muster K (rot): Wagen ist schadhaft, aber lauffähig unter Auflagen (z.B. nur leer zur nächsten Werkstatt, Vmax begrenzt).\n• Muster M (weiß mit rotem Rand): Wagen hat Mängel, ist voll betriebsfähig und lauffähig, Reparatur bei nächster Revision/Gelegenheit.\n• Muster R1 (grün): Druckluftbremse ist ausgeschaltet / unwirksam.\n• Muster U (gelb): Wagen zur Nachprüfung / Überwachungsfrist abgelaufen.',
    reference: 'AVV / GCU Anhang 9 & Anhang 11 / VDV 758',
    isVerified: true
  },
  {
    id: 'f_wm_14',
    category: 'Wagenmeister',
    title: 'Mindestdicken und Verschleißkriterien von Bremsklotzsohlen',
    content: 'Bei der Wagenprüfung der Bremsausrüstung gilt:\n• Verbundstoffbremssohlen (K- / LL-Sohlen / Flüsterbremse): Mindestbelagdicke an der dünnsten Stelle beträgt 10 mm (oder bis zur Verschleißmarkierungsnut im Belag). Keine Ausbrüche bis auf das Trägerblech.\n• Graugusssohlen (P10): Mindestdicke 10 mm an der dünnsten Stelle.\n• Scheibenbremsen: Bremsbelagdicke min. 5 mm (bzw. Restbelagnut sichtbar), Bremsscheibe auf Heißrisse und Riefen prüfen.',
    reference: 'AVV Anhang 9, Ziffer 5 / VDV 757 & 758 / Ril 915',
    isVerified: true
  },
  {
    id: 'f_wm_15',
    category: 'Wagenmeister',
    title: 'Das Lastgrenzenraster am Güterwagen verstehen und anwenden',
    content: 'Das Lastgrenzenraster gibt das maximale Ladegewicht in Tonnen abhängig von Streckenklasse und Geschwindigkeit an:\n• Streckenklasse A: 16,0 t Achslast / 4,8 t/m Meterlast\n• Streckenklasse B: 18,0 t Achslast / 5,0 t (B1) bzw. 6,4 t/m (B2)\n• Streckenklasse C: 20,0 t Achslast / bis 7,2 t/m Meterlast\n• Streckenklasse D: 22,5 t Achslast / 8,0 t/m Meterlast.\nSpalten "S" (100 km/h) und "SS" (120 km/h) geben die Zuladung bei erhöhter Geschwindigkeit an. Eine Überschreitung der Rasterwerte führt zu unzulässiger Überladung!',
    reference: 'UIC 570 / Ril 936 / AVV Anhang 9',
    isVerified: true
  },
  {
    id: 'f_wm_16',
    category: 'Wagenmeister',
    title: 'Ladungsverteilung: Längs- und Querschwerpunkt bei Güterwagen',
    content: 'Falsche Beladung führt zu Entgleisungsgefahr im Bogen:\n1. Querschwerpunkt: Das Verhältnis der Radlasten einer Achse darf maximal 1,25 : 1 (bzw. Raddruckdifferenz nach UIC) betragen.\n2. Längsschwerpunkt: Das Verhältnis der Radsatzlasten zwischen den Achsen bzw. Drehgestellen darf in der Regel 3 : 1 nicht überschreiten.\n3. Ladungssicherung: Formschluss, Verkeilung und Zurrgurte nach CTU-Code müssen die Trägheitskräfte bei Anfahren (1,0 g), Bremsen (1,0 g) und Rangierstößen (bis zu 4,0 g beim Auflaufen) sicher aufnehmen.',
    reference: 'CTU-Code / UIC-Verladerichtlinien Band 1 & 2 / Ril 936',
    isVerified: true
  },
  {
    id: 'f_wm_17',
    category: 'Wagenmeister',
    title: 'Gefahrgutkennzeichnung an Ladeeinheiten und Tragwagen nach RID',
    content: 'Beim Transport von Gefahrgut im Kombinierten Verkehr müssen folgende Kennzeichnungen übereinstimmen:\n1. Großzettel (Placards, 250 × 250 mm): Müssen an allen 4 Seiten von Tankcontainern und WAB sowie an beiden Längsseiten des Tragwagens angebracht sein.\n2. Orangefarbene Warntafeln (300 × 400 mm): Müssen oben die Gefahrnummer (Kemler-Zahl, z.B. 33 = leicht entzündbar) und unten die UN-Nummer (z.B. 1203 = Benzin) tragen.\n3. Umweltgefährdende Stoffe: Fisch-und-Baum-Symbol.\n4. Warntafeln und Zettel müssen sauber, lesbar und unbeschädigt sein.',
    reference: 'RID Teil 5 / VDV 758',
    isVerified: true
  },
  {
    id: 'f_wm_18',
    category: 'Wagenmeister',
    title: 'Schutzabstände und Reihungsvorschriften für Gefahrgutwagen',
    content: 'Nach RID und betrieblichen Regelwerken (Ril 408 / VDV 758):\n1. Zwischen Triebfahrzeugen / besetzten Personenwagen und Wagen mit explosionsgefährlichen Stoffen (Klasse 1) oder giftigen Gasen (Klasse 2.3) müssen Schutzwagen bzw. Schutzabstände (z.B. mindestens 18 Meter / 2 zweiachsige bzw. 1 vierachsiger Schutzwagen) eingehalten werden.\n2. Gefahrgutwagen dürfen nicht neben brennbaren Flüssigkeiten oder Stoffen mit Selbsterhitzungsgefahr gereiht werden, wenn ein Zusammenladeverbot besteht.',
    reference: 'RID Kapitel 7.5 / VDV-Schrift 758 / Ril 408',
    isVerified: true
  },
  {
    id: 'f_wm_19',
    category: 'Wagenmeister',
    title: 'Funktionsprüfung von automatischen und manuellen Lastwechseln',
    content: 'Güterwagen verfügen über manuelle oder automatische Lastabbremsung:\n• Manueller Lastwechsel (Umstellhebel Leer/Beladen): Der Hebel muss auf "Beladen" umgestellt werden, sobald das Gesamtgewicht des Wagens das am Wechsel angeschriebene Umschaltgewicht (z.B. 24 t) erreicht oder überschreitet.\n• Automatischer Lastwechsel (z.B. über Wiegeventil am Drehgestell): Erfasst den Einfederungsweg und steuert den Bremszylinderdruck stufenlos proportional zur Zuladung aus. Der Druckanzeiger / das Wiegeventil muss dicht und unbeschädigt sein.',
    reference: 'VDV-Schrift 757 & 758 / Ril 915.0102',
    isVerified: true
  },
  {
    id: 'f_wm_20',
    category: 'Wagenmeister',
    title: 'Außergewöhnliche Sendungen und Überschreitung des Lademaßes',
    content: 'Eine Ladung gilt als "Außergewöhnliche Sendung" (Beförderung mit besonderer Genehmigung / Lü-Sendung), wenn:\n1. Die Abmessungen das Regel-Lademaß (z.B. G1, G2, GA, GB, GC) überschreiten (Lü = Lademaßüberschreitung).\n2. Das zulässige Metergewicht oder die Achslast überschritten wird (Schwerkleinwagen/Tieflader).\n3. Besondere Fahrbedingungen erforderlich sind (z.B. Geschwindigkeitsbeschränkung, Fahrten nur im gesperrten Nachbargleis, ausgeschaltete Oberleitung).\nDer Wagenmeister prüft die Einhaltung aller in der Fahrordnung / Lü-Genehmigung vorgeschriebenen Auflagen!',
    reference: 'Ril 458 (Außergewöhnliche Sendungen) / UIC 502 / VDV 758',
    isVerified: true
  },
  {
    id: 'f_wm_21',
    category: 'Wagenmeister',
    title: 'Aufbau der 12-stelligen UIC-Wagennummer',
    content: 'Jedes europäische Eisenbahnfahrzeug trägt eine 12-stellige Wagennummer:\n• Ziffern 1–2: Austauschcode (Interoperabilitätsfähigkeit, z.B. 31/33 TEN-RIV Drehgestellwagen).\n• Ziffern 3–4: Ländercode (z.B. 80 = Deutschland, 85 = Schweiz, 81 = Österreich).\n• Ziffern 5–8: Haupt- und Nebengattungsmerkmale (z.B. Sdggmrss für Gelenktragwagen KV).\n• Ziffern 9–11: Fortlaufende Ordnungsnummer.\n• Ziffer 12: Selbstkontrollziffer (berechnet nach dem Luhn-Algorithmus / Gewichtung 2-1-2-1).',
    reference: 'TSI WAG / UIC 438-2 / AVV Anhang 6',
    isVerified: true
  },
  {
    id: 'f_wm_22',
    category: 'Wagenmeister',
    title: 'Sichern von Güterwagen mit Feststellbremsen und Hemmschuhen',
    content: 'Vorschriften zur Abstellsicherung nach VDV 758 / VDV 757 / Ril 408:\n1. Jeder abzustellende Zug / Wagengruppe muss gegen Entlaufen gesichert werden.\n2. Bodenbedienbare Handbremsen / Feststellbremsen (gelbes Handrad): Müssen mit voller Körperkraft fest angezogen werden. Das angeschriebene Handbremsgewicht (z.B. Feststellbremse 20 t) muss zur Deckung der erforderlichen Festhaltekraft ausreichen.\n3. Bei unzureichendem Handbremsgewicht oder geneigten Gleisen müssen zusätzlich doppelseitig wirkende Hemmschuhe formschlüssig unter die talseitigen Räder gelegt werden.',
    reference: 'VDV 757 / VDV 758 / Ril 408.0551',
    isVerified: true
  }
];

// Initialdaten für Fragen
const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'Signale',
    text: 'Was bedeutet das Hauptsignal Hp 0?',
    options: [
      'Fahrt freigegeben',
      'Halt für Zug- und Rangierfahrten',
      'Langsamfahrt erwarten',
      'Fahrt mit 40 km/h'
    ],
    correctIndex: 1,
    explanation: 'Hp 0 (ein rotes Licht) bedeutet "Halt" und gilt für Zug- und Rangierfahrten gleichermaßen.',
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'q2',
    category: 'Signale',
    text: 'Was signalisiert das Signal Vr 0 am Vorsignal?',
    options: [
      'Fahrt erwarten',
      'Halt erwarten',
      'Langsamfahrt erwarten',
      'Halt'
    ],
    correctIndex: 1,
    explanation: 'Vr 0 zeigt zwei gelbe Lichter schräg nach rechts steigend und kündigt ein Halt zeigendes Hauptsignal (Halt erwarten) an.'
  },
  {
    id: 'q3',
    category: 'Bremsprobe',
    text: 'Wann muss eine volle Bremsprobe durchgeführt werden?',
    options: [
      'Nach jedem Triebfahrzeugführerwechsel',
      'Nur bei winterlichen Witterungsverhältnissen',
      'Am neu gebildeten Zug, spätestens wenn der Zug länger als 24 Stunden abgestellt war',
      'Vor jeder Rangierfahrt'
    ],
    correctIndex: 2,
    explanation: 'Eine volle Bremsprobe ist unter anderem vorgeschrieben am neu gebildeten Zug, bei Änderung der Zusammensetzung (sofern nicht anders geregelt) und wenn der Zug länger als 24 Stunden abgestellt war.'
  },
  {
    id: 'q4',
    category: 'Bremsprobe',
    text: 'Welches Handsignal gibt der Bremsprobenprüfer für "Bremse anlegen"?',
    options: [
      'Beide Arme waagerecht nach außen strecken',
      'Arm kreisförmig bewegen',
      'Beide Hände über dem Kopf zusammenführen (Signal Zp 6)',
      'Arm senkrecht nach oben strecken'
    ],
    correctIndex: 2,
    explanation: 'Das Signal Zp 6 "Bremse anlegen" wird durch das Zusammenführen beider Hände über dem Kopf oder das Zeigen einer Leuchte über dem Kopf gegeben.'
  },
  {
    id: 'q5',
    category: 'Bahnbetrieb',
    text: 'Was unterscheidet eine Zugfahrt von einer Rangierfahrt im Wesentlichen?',
    options: [
      'Zugfahrten dürfen nur am Tag stattfinden',
      'Zugfahrten bewegen sich nach einem Fahrplan auf der freien Strecke oder im Bahnhof, während Rangierfahrten dem Bewegen von Fahrzeugen im Bahnhof dienen',
      'Rangierfahrten haben immer Vorrang vor Zugfahrten',
      'Es gibt rechtlich und betrieblich keinen Unterschied'
    ],
    correctIndex: 1,
    explanation: 'Zugfahrten sind Fahrten von Zügen auf der freien Strecke oder in Bahnhofsgleisen, die durch Fahrplan geregelt sind. Rangierfahrten dienen dem Bewegen von Fahrzeugen im Bahnhof (z.B. Kuppeln, Abstellen).'
  },
  {
    id: 'q6',
    category: 'Wagenprüfung',
    text: 'Wie macht sich eine Flachstelle an einem Güterwagen im Betrieb bemerkbar?',
    options: [
      "Durch eine stetige Rauchentwicklung am Radsatzlagergehäuse",
      "Durch ein rhythmisches, geschwindigkeitsabhängiges Klopfen oder Schlagen während der Fahrt",
      "Durch Bauteilschäden wie eine gelockerte Abhebesicherung oder gebrochene Bremsfangschlingen infolge der Stoßbelastung",
      "Durch ein kontinuierliches Zischen an den Luftabsperrhähnen der Hauptluftleitung"
],
    correctIndex: 1,
    explanation: 'Eine Flachstelle entsteht durch das Blockieren der Radsätze beim Bremsen (z. B. durch falsch eingestellte Lastwechsel, ungünstige Reibwertverhältnisse oder eine feste Handbremse). Im Fahrbetrieb führt sie zu einem charakteristischen rhythmischen Klopfen, das Schienen und Fahrzeuge schädigen kann und Stoßbelastungen auf Bauteile wie Abhebesicherungen ausübt.'
  },
  {
    id: 'q7',
    category: 'Zugfahrt',
    text: 'Wie hoch ist die zulässige Höchstgeschwindigkeit bei einer "Fahrt auf Sicht"?',
    options: [
      '10 km/h',
      '25 km/h',
      'Höchstens 40 km/h, angepasst an die Sichtverhältnisse',
      '70 km/h'
    ],
    correctIndex: 2,
    explanation: 'Bei einer Fahrt auf Sicht muss der Lokführer die Geschwindigkeit so wählen, dass er vor jedem Hindernis rechtzeitig anhalten kann. Sie darf jedoch maximal 40 km/h betragen.'
  },
  {
    id: 'q8',
    category: 'Anlage 5',
    text: 'Was ist der Hauptanwendungsbereich der "Anlage 5" der FV-NE?',
    options: [
      'Die Regelung der Bremsproben im Personenverkehr',
      'Die Durchführung des Zugleitbetriebs auf Nebenbahnen',
      'Die Ausbildungskriterien für Quereinsteiger',
      'Die Bestimmungen zum Gefahrguttransport'
    ],
    correctIndex: 1,
    explanation: 'Die Anlage 5 zur FV-NE regelt im Detail die Durchführung und Vorschriften für den Zugleitbetrieb (ZLB), eine vereinfachte Betriebsform auf Nebenbahnen.'
  },

  // --- WEITERE FRAGEN: ANLAGE 5 (ZUGLEITBETRIEB NACH FV-NE / VDV 758) ---
  {
    id: 'q_a5_1',
    category: 'Anlage 5',
    text: 'Wie lautet der vorgeschriebene Wortlaut einer Fahranfrage des Triebfahrzeugführers im Zugleitbetrieb?',
    options: [
      '„Zug [Nr.] abfahrbereit in [A], Gleis frei?“',
      '„Darf Zug [Nr.] von [A] nach [B] fahren?“',
      '„Zugleiter, bitte Ausfahrt für Zug [Nr.] stellen!“',
      '„Fahrt frei für Zug [Nr.] nach [B]?“'
    ],
    correctIndex: 1,
    explanation: 'Nach FV-NE Anlage 5, Abs. 3 lautet die standardisierte Fahranfrage des Lokführers verbindlich: „Darf Zug [Nr.] von [A] nach [B] fahren?“. Der Zugleiter antwortet bei Freisein mit der Fahrerlaubnis.'
  },
  {
    id: 'q_a5_2',
    category: 'Anlage 5',
    text: 'Welche betriebliche Funktion hat die Trapeztafel (Signal Ne 1) im Zugleitbetrieb vor Bahnhöfen?',
    options: [
      'Sie dient als Vorankündigung für ein folgendes Hauptsignal',
      'Sie kennzeichnet die Stelle, an der Züge ohne Fahrerlaubnis vor der Betriebsstelle halten müssen (Ersatz für Einfahrsignal)',
      'Sie markiert den Anfang einer Langsamfahrstelle',
      'Sie zeigt das Ende des Bahnhofsbereichs an'
    ],
    correctIndex: 1,
    explanation: 'Die Trapeztafel (Signal Ne 1) ersetzt auf Nebenbahnen das Einfahrsignal und gebietet dem Lokführer Halt vor der Betriebsstelle, sofern keine Einfahrt-Fahrerlaubnis vorliegt (Ril 301 / FV-NE § 11).'
  },
  {
    id: 'q_a5_3',
    category: 'Anlage 5',
    text: 'Was muss der Triebfahrzeugführer nach vollständiger Ankunft auf dem Zielbahnhof im Zugleitbetrieb unverzüglich tun?',
    options: [
      'Die Zugbeleuchtung ausschalten und Feierabend machen',
      'Das Triebfahrzeug sofort abrüsten',
      'Die Ankunftsmeldung („Zug [Nr.] in [B] angekommen“) an den Zugleiter abgeben, nachdem der Zugschluss (Zg 2) festgestellt wurde',
      'Eine volle Bremsprobe ausführen'
    ],
    correctIndex: 2,
    explanation: 'Erst nach Feststellung des Zugschlusssignals (Zg 2) und Abgabe der Ankunftsmeldung an den Zugleiter darf dieser den eingleisigen Streckenabschnitt für Folge- oder Gegenzüge im Zugmeldebuch freigeben (FV-NE Anlage 5).'
  },
  {
    id: 'q_a5_4',
    category: 'Anlage 5',
    text: 'Was zeigt das Signal Ne 13 (Überwachungssignal für Rückfallweichen) an, wenn die Weiche befahrbar und in Grundstellung verriegelt ist?',
    options: [
      'Ein gelbes Blinklicht',
      'Ein weißes Licht über einem orangefarbenen Pfeil',
      'Ein ruhiges, weißes Licht',
      'Zwei grüne Lichter waagerecht'
    ],
    correctIndex: 2,
    explanation: 'Signal Ne 13 zeigt ein ruhiges weißes Licht über dem Signalmast, wenn die Rückfallweiche in der Grundstellung ordnungsgemäß anliegt und verriegelt ist (Signalbuch Ril 301.1301).'
  },
  {
    id: 'q_a5_5',
    category: 'Anlage 5',
    text: 'Welche Voraussetzung muss erfüllt sein, bevor eine planmäßige Zugkreuzung im Zugleitbetrieb auf eine andere Betriebsstelle verlegt werden darf?',
    options: [
      'Es reicht aus, wenn der Zugleiter die Verlegung im Fahrplan notiert',
      'Beide beteiligten Züge müssen den Verlegungsbefehl erhalten haben und der zuerst eintreffende Zug muss den Erhalt quittiert haben',
      'Der schnellere Zug darf ohne Rückmeldung vorfahren',
      'Nur der verspätete Zug muss informiert werden'
    ],
    correctIndex: 1,
    explanation: 'Zur Vermeidung von Frontalzusammenstößen auf eingleisiger Strecke müssen beide Züge verständigt sein und der zuerst eintreffende Zug muss die Verlegung quittiert haben (FV-NE Anlage 5, Abs. 4).'
  },
  {
    id: 'q_a5_6',
    category: 'Anlage 5',
    text: 'Wie verhält sich der Triebfahrzeugführer, wenn während der Fahrt im Zugleitbetrieb der Zugfunk komplett ausfällt?',
    options: [
      'Sofortige Schnellbremsung und auf der freien Strecke stehenbleiben',
      'Mit maximaler Geschwindigkeit bis zum Endbahnhof durchfahren',
      'Bis zur nächsten Zuglaufstelle weiterfahren, für die eine Fahrerlaubnis vorliegt, dort anhalten und über Festnetz/Handy Verbindung aufnehmen',
      'Den Zug im nächsten Bahnhof abkuppeln'
    ],
    correctIndex: 2,
    explanation: 'Der Zug darf die Strecke bis zum Erlaubnisendpunkt befahren, muss an der dortigen Zuglaufstelle anhalten und über alternative Kommunikationswege (Diensthandy, Fernsprecher) den Zugleiter kontaktieren (FV-NE Anlage 5, Abs. 8).'
  },

  // --- WEITERE FRAGEN: BAHNBETRIEB (RIL 408 / VDV / DGUV V73) ---
  {
    id: 'q_bb_1',
    category: 'Bahnbetrieb',
    text: 'Was muss vor Beginn jeder Rangierfahrt zwischen dem Triebfahrzeugführer und dem Weichenwärter stattfinden?',
    options: [
      'Eine volle Bremsprobe',
      'Eine Rangiervereinbarung über Ziel, Zweck und Besonderheiten',
      'Die schriftliche Übergabe eines Befehls 1',
      'Das Ausblasen der Hauptluftleitung'
    ],
    correctIndex: 1,
    explanation: 'Vor Beginn jeder Rangierfahrt müssen Ziel, Zweck und etwaige Besonderheiten (z.B. Hemmschuhe, Überbreiten) zwischen Weichenwärter und Lokführer/Rangierbegleiter abgesprochen werden (Ril 408.0811).'
  },
  {
    id: 'q_bb_2',
    category: 'Bahnbetrieb',
    text: 'Welche Maßnahme ist beim geschobenen Rangieren zwingend vorgeschrieben?',
    options: [
      'Es muss mit mindestens 40 km/h gefahren werden',
      'Der Rangierbegleiter muss an der Spitze des ersten Fahrzeugs stehen, den Fahrweg beobachten und ständigen Kontakt zum Lokführer halten',
      'Die Pfeife muss ununterbrochen betätigt werden',
      'Die Druckluftbremse aller Wagen muss ausgeschaltet werden'
    ],
    correctIndex: 1,
    explanation: 'Beim geschobenen Rangieren muss die Spitze besetzt sein, um den Fahrweg zu überwachen, Bahnübergänge zu sichern und bei Hindernissen sofort Nothalt zu gebieten (Ril 408.0821).'
  },
  {
    id: 'q_bb_3',
    category: 'Bahnbetrieb',
    text: 'Welches Signal hebt für eine Rangierfahrt ein bestehendes Fahrverbot auf?',
    options: [
      'Signal Hp 1 (Ein grünes Licht)',
      'Signal Sh 1 / Ra 12 (Zwei weiße Lichter nach rechts steigend)',
      'Signal Zs 1 (Drei weiße Lichter im Dreieck)',
      'Signal Zp 9 (Grüner Ring)'
    ],
    correctIndex: 1,
    explanation: 'Signal Sh 1 (Formsignal) bzw. Ra 12 (Lichtsignal: zwei weiße Lichter nach rechts steigend) bedeutet „Fahrverbot aufgehoben“ für Rangierfahrten (Ril 301).'
  },
  {
    id: 'q_bb_4',
    category: 'Bahnbetrieb',
    text: 'Was gehört nach DGUV Vorschrift 73 zur vorgeschriebenen persönlichen Schutzausrüstung (PSA) im Gleisbereich?',
    options: [
      'Normale Straßenkleidung ohne Reflektoren',
      'Warnkleidung in fluoreszierendem Orange/Gelb nach EN ISO 20471 und Sicherheitsschuhe S3 mit Knöchelschutz',
      'Nur Gehörschutz',
      'Ein Regenschirm bei Niederschlag'
    ],
    correctIndex: 1,
    explanation: 'Im Gleisbereich gilt strikte Tragepflicht für zertifizierte Warnkleidung (mind. Klasse 2 nach EN ISO 20471) und S3-Sicherheitsschuhe zum Schutz vor Gefahren (DGUV V73).'
  },
  {
    id: 'q_bb_5',
    category: 'Bahnbetrieb',
    text: 'Wodurch wird zwingender Flankenschutz für einen eingestellten Fahrweg gewährleistet?',
    options: [
      'Ausschließlich durch mündliche Zurufe',
      'Durch abweisende Weichenstellungen, Gleissperren, Schutzgleise oder Halt zeigende Signale',
      'Durch Erhöhung der Geschwindigkeit',
      'Durch Ausschalten der PZB-Fahrzeugausrüstung'
    ],
    correctIndex: 1,
    explanation: 'Flankenschutz verhindert Flankenfahrten durch bauliche und signaltechnische Abhängigkeiten: abweisende Weichen, Gleissperren und Halt gebietende Signale (Ril 408.0201).'
  },

  // --- WEITERE FRAGEN: ZUGFAHRT & ZUGBEEINFLUSSUNG (RIL 408 / RIL 483 / PZB 90) ---
  {
    id: 'q_zf_1',
    category: 'Zugfahrt',
    text: 'Welche Prüfgeschwindigkeit und welches Zeitfenster gelten nach einer 1000-Hz-PZB-Beeinflussung in der oberen Zugart (Zugart O)?',
    options: [
      'Auf 95 km/h innerhalb von 15 Sekunden',
      'Auf 85 km/h innerhalb von 23 Sekunden',
      'Auf 70 km/h innerhalb von 29 Sekunden',
      'Auf 55 km/h innerhalb von 38 Sekunden'
    ],
    correctIndex: 1,
    explanation: 'In der Zugart O (ab 111 Bremshundertstel) muss die Geschwindigkeit nach einer 1000-Hz-Beeinflussung innerhalb von 23 Sekunden unter die Prüfgeschwindigkeit von 85 km/h abgesenkt werden (Ril 483.0101).'
  },
  {
    id: 'q_zf_2',
    category: 'Zugfahrt',
    text: 'Was bedeutet das Wechselblinken der Leuchtmelder (z.B. 70 und 85) in der PZB 90?',
    options: [
      'Die PZB-Fahrzeugeinrichtung ist defekt',
      'Die Anlage befindet sich im restriktiven Modus (Höchstgeschwindigkeit max. 45 km/h bzw. 25 km/h)',
      'Der Zug hat den LZB-Bereich erreicht',
      'Der Zug darf sofort auf Streckenhöchstgeschwindigkeit beschleunigen'
    ],
    correctIndex: 1,
    explanation: 'Das Wechselblinken signalisiert die restriktive Geschwindigkeitsüberwachung nach starker Verlangsamung (< 10 km/h) oder Stillstand nach einer 1000-Hz- bzw. 500-Hz-Beeinflussung (Ril 483.0101).'
  },
  {
    id: 'q_zf_3',
    category: 'Zugfahrt',
    text: 'Welcher schriftliche Befehl berechtigt zur Vorbeifahrt an einem Halt zeigenden oder gestörten Hauptsignal?',
    options: [
      'Befehl 1',
      'Befehl 2',
      'Befehl 8',
      'Befehl 14'
    ],
    correctIndex: 1,
    explanation: 'Befehl 2 berechtigt den Triebfahrzeugführer zur Vorbeifahrt an einem Halt zeigenden, gestörten oder erloschenen Haupt- bzw. Sperrsignal (Ril 408.0411).'
  },
  {
    id: 'q_zf_4',
    category: 'Zugfahrt',
    text: 'Wie müssen Lokführer reagieren, wenn über den Zugbahnfunk der Nothaltauftrag „Betriebsgefahr, alle Züge zwischen A und B sofort anhalten!“ ertönt?',
    options: [
      'Mit normaler Betriebsbremsung bis zum nächsten Bahnhof weiterfahren',
      'Sofort eine Schnellbremsung ausführen und den Zug unverzüglich zum Stillstand bringen',
      'Erst beim Fahrdienstleiter nachfragen, ob der eigene Zug gemeint ist',
      'Die Geschwindigkeit auf 40 km/h drosseln'
    ],
    correctIndex: 1,
    explanation: 'Beim Nothaltauftrag muss jeder im betroffenen Bereich befindliche Zug unverzüglich und ohne Zeitverzug eine Schnellbremsung bis zum Stillstand durchführen (Ril 408.0461).'
  },
  {
    id: 'q_zf_5',
    category: 'Zugfahrt',
    text: 'Welche Bedeutung hat das Signal Zp 9?',
    options: [
      'Bremse anlegen',
      'Abfahrauftrag für den Triebfahrzeugführer',
      'Nothalt',
      'Langsam fahren'
    ],
    correctIndex: 1,
    explanation: 'Signal Zp 9 (grüner Ring/Streifen oder Kelle mit grünem Ring) erteilt dem Lokführer den verbindlichen Abfahrauftrag (Ril 301, Signal Zp 9).'
  },

  // --- WEITERE FRAGEN: SIGNALE (RIL 301 SIGNALBUCH) ---
  {
    id: 'q_sig_1',
    category: 'Signale',
    text: 'Was signalisiert das Hauptsignalbild Hp 2 im H/V-Signalsystem?',
    options: [
      'Fahrt mit Streckengeschwindigkeit',
      'Halt für alle Fahrten',
      'Langsamfahrt mit 40 km/h (sofern nicht durch Zs 3 anders vorgegeben)',
      'Halt erwarten am nächsten Signal'
    ],
    correctIndex: 2,
    explanation: 'Hp 2 (ein grünes und ein gelbes Licht senkrecht übereinander) bedeutet Langsamfahrt mit 40 km/h im anschließenden Weichenbereich (Ril 301.0101).'
  },
  {
    id: 'q_sig_2',
    category: 'Signale',
    text: 'Was bedeutet das Signal Zs 1 (Ersatzsignal: drei weiße Lichter in Dreiecksform)?',
    options: [
      'Der Zug muss wenden',
      'Am Halt zeigenden oder gestörten Hauptsignal darf ohne schriftlichen Befehl vorbeigefahren werden',
      'Der Zug wird auf das Gegengleis geleitet',
      'Die Oberleitung ist stromlos geschaltet'
    ],
    correctIndex: 1,
    explanation: 'Signal Zs 1 erlaubt die Vorbeifahrt an einem Halt zeigenden Signal ohne schriftlichen Befehl mit max. 40 km/h im Weichenbereich (Ril 301.0201).'
  },
  {
    id: 'q_sig_3',
    category: 'Signale',
    text: 'Was signalisiert das Signal Ks 2 am Ks-Haupt- bzw. Vorsignal?',
    options: [
      'Fahrt mit Höchstgeschwindigkeit',
      'Halt erwarten am folgenden Hauptsignal',
      'Nothalt',
      'Weiterfahrt auf Sicht'
    ],
    correctIndex: 1,
    explanation: 'Ks 2 (ein gelbes Dauerlicht) kündigt an, dass das nächste Hauptsignal Halt (Hp 0) zeigt (Ril 301.0103).'
  },
  {
    id: 'q_sig_4',
    category: 'Signale',
    text: 'Welche Bedeutung hat die Vorsignaltafel (Signal Ne 2)?',
    options: [
      'Sie kennzeichnet das Ende des Bahnhofs',
      'Sie kennzeichnet den Standort eines alleinstehenden Vorsignals',
      'Sie verbietet die Vorbeifahrt von Zügen',
      'Sie fordert zum Pfeifen auf'
    ],
    correctIndex: 1,
    explanation: 'Signal Ne 2 (gelbe Tafel mit schwarzem Pfeil/Doppelwinkel) steht an alleinstehenden Vorsignalen und bestimmt deren Standort verbindlich (Ril 301.1102).'
  },
  {
    id: 'q_sig_5',
    category: 'Signale',
    text: 'Welche Geschwindigkeit schreibt das Zusatzsignal Zs 3 mit der weißen Kennziffer „6“ vor?',
    options: [
      '6 km/h',
      '60 km/h',
      '160 km/h',
      '60 % der Höchstgeschwindigkeit'
    ],
    correctIndex: 1,
    explanation: 'Beim Geschwindigkeitsanzeiger Zs 3 gibt die Kennziffer multipliziert mit 10 die zulässige Höchstgeschwindigkeit in km/h an (6 $\times$ 10 = 60 km/h) (Ril 301.0202).'
  },

  // --- MULTIPLE-CHOICE PRÜFUNGSFRAGEN (MEHRFACHAUSWAHL) ---
  {
    id: 'q_mc_1',
    category: 'Bremsprobe',
    text: 'Welche Bedingungen müssen erfüllt sein, damit ein abgestellter Zug ohne Handbremse ausschließlich „auf Luft“ (mit wirkender Druckluftbremse) gesichert werden darf? (Wähle alle richtigen Antworten)',
    options: [
      'Abstelldauer beträgt maximal bis zu 60 Minuten',
      'Gleisneigung beträgt unter 2,5 ‰ (Promille)',
      'Mindestens 3 wirkende Druckluftbremsen im Zugverband vorhanden',
      'Außentemperatur muss über 15 °C liegen',
      'Zug muss mit mindestens zwei Hemmschuhen belegt sein'
    ],
    correctIndex: 0,
    correctIndices: [0, 1, 2],
    correct_indices: [0, 1, 2],
    questionType: 'multiple',
    dangerIndices: [3, 4],
    danger_indices: [3, 4],
    isVerified: true,
    explanation: 'Gemäß VDV-Schrift 757 darf ein Zug bis zu 60 Minuten „auf Luft“ abgestellt werden, wenn alle 3 Kriterien erfüllt sind: 1. Max. 60 min, 2. Mind. 3 wirkende Druckluftbremsen, 3. Gleisneigung unter 2,5 ‰.'
  },
  {
    id: 'q_mc_2',
    category: 'Signale',
    text: 'Welche Signale oder Aufträge erlauben an einem Halt zeigenden oder gestörten Hauptsignal die Weiterfahrt? (Wähle alle richtigen Antworten)',
    options: [
      'Signal Zs 1 (Ersatzsignal)',
      'Signal Zs 7 (Vorsichtsignal)',
      'Schriftlicher Befehl des Fahrdienstleiters',
      'Mündliche Erlaubnis des Zugbegleiters',
      'Signal Sh 1 (Fahrverbot aufgehoben) allein bei einer Zugfahrt'
    ],
    correctIndex: 0,
    correctIndices: [0, 1, 2],
    correct_indices: [0, 1, 2],
    questionType: 'multiple',
    dangerIndices: [3, 4],
    danger_indices: [3, 4],
    isVerified: true,
    explanation: 'Zur Vorbeifahrt am Halt zeigenden oder gestörten Hauptsignal berechtigen: Signal Zs 1, Signal Zs 7, Signal Ts 2 (bei ZLB) oder ein schriftlicher Befehl. Mündliche Zurufen oder Sh 1 allein genügen bei Zugfahrten nicht!'
  },
  {
    id: 'q_mc_3',
    category: 'Bahnbetrieb',
    text: 'Welche Maßnahmen sind vor dem Beginn einer Rangierfahrt zwingend durchzuführen bzw. sicherzustellen? (Wähle alle richtigen Antworten)',
    options: [
      'Fahrwegvereinbarung / Zustimmung des Weichenwärters eingeholt',
      'Fahrwegprüfung auf Freisein und richtige Weichenlage',
      'Feststellbremsen der zu bewegenden Fahrzeuge vollständig gelöst',
      'Einschalten des Fernlichts am Triebfahrzeug'
    ],
    correctIndex: 0,
    correctIndices: [0, 1, 2],
    correct_indices: [0, 1, 2],
    questionType: 'multiple',
    dangerIndices: [3],
    danger_indices: [3],
    isVerified: true,
    explanation: 'Vor Rangierfahrten müssen Zustimmung vorliegen, Fahrweg frei sein und Bremsen gelöst sein. Fernlicht darf beim Rangieren keinesfalls eingeschaltet werden (Blendgefahr für Weichenwärter und Rangierer).'
  },
  {
    id: 'q_mc_4',
    category: 'Wagenmeister',
    text: 'Welche Radsatzmängel führen bei der wagentechnischen Untersuchung zur Einstufung „Nicht lauffähig / Schadwagen“ (Muster R1)? (Wähle alle richtigen Antworten)',
    options: [
      'Ausbruch an der Radlauffläche mit mehr als 60 mm Länge',
      'Rissbildung am Radkranz, Radreifen oder in der Radscheibe',
      'Lockerung oder Verschiebung von Radsatzteilen auf der Achswelle',
      'Oberflächlicher Bremsstaub auf dem Radkörper'
    ],
    correctIndex: 0,
    correctIndices: [0, 1, 2],
    correct_indices: [0, 1, 2],
    questionType: 'multiple',
    dangerIndices: [3],
    danger_indices: [3],
    isVerified: true,
    explanation: 'Ausbrüche über Grenzwert (>60 mm), Risse im Radsatz sowie gelockerte oder verschobene Radsatzteile sind betriebsgefährdende Mängel, die zum sofortigen Aussetzen führen.'
  },
  {
    id: 'q_mc_5',
    category: 'Anlage 5',
    text: 'Welche Meldungen gehören zum regulären Zugmeldeverfahren im Zugleitbetrieb (ZLB nach Anlage 5)? (Wähle alle richtigen Antworten)',
    options: [
      'Fahranfrage des Triebfahrzeugführers',
      'Fahrterlaubnis des Zugleiters',
      'Ankunftmeldung nach vollständigem Halt im Bahnhof',
      'Verlassensmeldung (Räumungsprüfung des Streckenabschnitts)',
      'Signalhorn-Akkord vor Abfahrt'
    ],
    correctIndex: 0,
    correctIndices: [0, 1, 2, 3],
    correct_indices: [0, 1, 2, 3],
    questionType: 'multiple',
    dangerIndices: [4],
    danger_indices: [4],
    isVerified: true,
    explanation: 'Im Zugleitbetrieb (FV-NE Anlage 5) besteht das reguläre Zugmeldeverfahren aus Fahranfrage, Fahrterlaubnis, Ankunftmeldung und Verlassensmeldung zwischen Zugpersonal und Zugleiter.'
  },

  // --- REIHENFOLGE-PRÜFUNGSFRAGEN (INTERAKTIVES SEQUENZ-QUIZ) ---
  {
    id: 'q_order_1',
    category: 'Bahnbetrieb',
    text: 'Unzulässige Vorbeifahrt am Halt zeigenden Signal: Bringen Sie die vorgeschriebenen Handlungen in die betrieblich richtige Reihenfolge:',
    options: [
      'Zug sofort durch Schnellbremsung anhalten und gegen Wegrollen sichern',
      'Fahrdienstleiter (Fdl) unverzüglich über Zugfunk verständigen („Zug ... steht nach Signal...“)',
      'Weiterfahrt erst nach Erhalt des schriftlichen Befehls 2 durchführen',
      'Mit maximal 40 km/h im anschließenden Weichenbereich bis zum nächsten Signal fahren'
    ],
    correctIndex: 0,
    correctIndices: [0, 1, 2, 3],
    correct_indices: [0, 1, 2, 3],
    questionType: 'order',
    isVerified: true,
    explanation: 'Gemäß Ril 408 gilt bei unzulässiger Vorbeifahrt am Halt-Signal: 1. Sofortige Schnellbremsung & Stillstand, 2. Meldung an den Fdl, 3. Weiterfahrt ausschließlich mit Befehl 2, 4. Geschwindigkeitsbeschränkung auf 40 km/h im Weichenbereich.'
  },
  {
    id: 'q_order_2',
    category: 'Bahnbetrieb',
    text: 'Ablauf einer Zugtrennung auf freier Strecke: Bringen Sie die Maßnahmen in die betrieblich richtige Reihenfolge:',
    options: [
      'Zug sofort anhalten und beide getrennten Zugteile gegen Entlaufen sichern',
      'Fahrdienstleiter unverzüglich über Zugfunk mit Notruf verständigen',
      'Benachbarte Gleise auf Profilfreiheit und Gefahrenstellen prüfen',
      'Zustand der Kupplung und Bremsleitungen begutachten und weiteres Vorgehen abstimmen'
    ],
    correctIndex: 0,
    correctIndices: [0, 1, 2, 3],
    correct_indices: [0, 1, 2, 3],
    questionType: 'order',
    isVerified: true,
    explanation: 'Bei einer Zugtrennung steht immer zuerst die Sicherung beider Zugteile gegen Wegrollen an oberster Stelle. Danach erfolgt der Notruf an den Fdl, gefolgt von der Profilprüfung der Nachbargleise und der Schadensfeststellung.'
  },
  ...(docxQuestions as unknown as Question[]),
];

// Initialdaten für den Chat
const INITIAL_CHAT_MESSAGES = (_currentTimestamp: number): ChatMessage[] => [];

// Initialdaten für das Ticket-System
const INITIAL_TICKETS: Ticket[] = [];

// Initialdaten für den News & Updates Verlauf
const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'news_1',
    title: 'Willkommen bei RailTrainer',
    content: 'Willkommen auf der offiziellen Lern- und Wissensplattform für den Eisenbahnbetriebsdienst. Nutze die interaktiven Lernkarten und die Prüfungssimulation zur gezielten Vorbereitung.',
    category: 'announcement',
    authorId: 'u_admin',
    authorName: 'Administrator',
    authorRole: 'admin',
    authorTitle: 'Administrator',
    createdAt: Date.now(),
  }
];

export const mockDb = {
  // --- AKTIVER BENUTZER (CURRENT USER SESSIONS) ---
  async getCurrentUser(): Promise<User | null> {
    const cached = getFromMemoryCache<User | null>('current_user', 10000);
    if (cached !== null && cached !== undefined) return cached;

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) return setToMemoryCache('current_user', null);
      let user: User = JSON.parse(data);

      if (isSupabaseConfigured() && supabase && user?.id) {
        try {
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error && error.code === 'PGRST116') {
            // Benutzer wurde in der Datenbank gelöscht -> Sofort ausloggen
            await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            return setToMemoryCache('current_user', null);
          }

          if (!error && dbUser) {
            let changed = false;
            if (user.role !== dbUser.role || user.title !== (dbUser.title || '') || user.name !== dbUser.name) {
              user.role = dbUser.role;
              user.title = dbUser.title || '';
              user.name = dbUser.name || user.name;
              user.avatarUrl = dbUser.avatar_url || user.avatarUrl;
              changed = true;
            }
            if (changed) {
              await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
            }
          }
        } catch {
          // Offline fallback
        }
      }
      return setToMemoryCache('current_user', user);
    } catch {
      return null;
    }
  },

  async loginUser(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .single();

        if (!error && data) {
          if (verifyPassword(password, data.password)) {
            // Falls das Passwort noch unverschlüsselt in Supabase lag, jetzt automatisch hashen!
            if (data.password && !isSha256Hash(data.password)) {
              try {
                const hashed = hashPassword(password);
                await supabase.from('users').update({ password: hashed }).eq('id', data.id);
                data.password = hashed;
              } catch {}
            }

            const loggedInUser: User = {
              id: data.id,
              name: data.name,
              email: data.email,
              password: data.password,
              role: data.role,
              title: data.title || '',
              avatarUrl: data.avatar_url || ''
            };
            await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(loggedInUser));
            try {
              await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', data.id);
            } catch {}
            return loggedInUser;
          } else {
            throw new Error('E-Mail oder Passwort falsch.');
          }
        }
      } catch (e: any) {
        if (e.message && e.message.includes('falsch')) throw e;
      }
    }

    const users = await this.getUsers();
    const userIndex = users.findIndex(u => (u.email.toLowerCase() === cleanEmail || (cleanEmail === 'admin' && u.role === 'admin')) && verifyPassword(password, u.password));
    if (userIndex === -1) {
      throw new Error('E-Mail oder Passwort falsch.');
    }
    const user = users[userIndex];
    if (user.password && !isSha256Hash(user.password)) {
      user.password = hashPassword(password);
      users[userIndex] = user;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    // Session speichern
    invalidateMemoryCache('current_user');
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  },

  PAYPAL_CONFIG,

  async registerUser(name: string, email: string, password: string, webKey?: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = hashPassword(password);

    let isWebUnlocked = false;
    let title = '';

    // Falls ein Freischaltcode angegeben wurde, direkt prüfen & freischalten
    const trimmedKey = (webKey || '').trim();
    if (trimmedKey) {
      const isValid = verifyWebKey(trimmedKey);
      if (!isValid) {
        throw new Error('Der eingegebene Freischaltcode ist ungültig. Bitte prüfe die Eingabe oder lasse das Feld leer.');
      }

      // Prüfe, ob der Key bereits eingelöst wurde
      const rawRedeemed = await AsyncStorage.getItem(STORAGE_KEYS.WEB_KEYS);
      const redeemedKeys: { key: string; userId: string; date: number }[] = rawRedeemed ? JSON.parse(rawRedeemed) : [];
      const normKey = trimmedKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const alreadyUsed = redeemedKeys.find(r => r.key === normKey);
      if (alreadyUsed) {
        throw new Error('Dieser Freischaltcode wurde bereits von einem anderen Benutzer verwendet.');
      }

      isWebUnlocked = true;
      title = '[Web-Freigabe]';
    }

    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      email: cleanEmail,
      password: hashedPassword,
      name: name.trim(),
      role: 'user',
      title: title,
      isWebUnlocked: isWebUnlocked,
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        // In Supabase Auth registrieren (für Mailversand & Recovery)
        if (password) {
          await supabase.auth.signUp({
            email: newUser.email,
            password: password,
          });
        }

        const { error } = await supabase.from('users').insert([{
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          title: newUser.title,
          avatar_url: ''
        }]);
        if (error) {
          if (error.code === '23505' || error.message.includes('unique') || error.message.includes('already exists')) {
            throw new Error('Diese E-Mail-Adresse ist bereits registriert.');
          }
          throw new Error(error.message);
        }
      } catch (e: any) {
        if (e.message && (e.message.includes('bereits') || e.message.includes('registriert'))) throw e;
      }
    }

    const users = await this.getUsers();
    const exists = users.some(u => u.email.toLowerCase() === cleanEmail);
    if (exists && !isSupabaseConfigured()) {
      throw new Error('Diese E-Mail-Adresse ist bereits registriert.');
    }

    // Wenn Key genutzt wurde, als eingelöst abspeichern & protokollieren
    if (webKey && isWebUnlocked) {
      const rawRedeemed = await AsyncStorage.getItem(STORAGE_KEYS.WEB_KEYS);
      const redeemedKeys: { key: string; userId: string; date: number }[] = rawRedeemed ? JSON.parse(rawRedeemed) : [];
      const normKey = webKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      redeemedKeys.push({ key: normKey, userId: newUser.id, date: Date.now() });
      await AsyncStorage.setItem(STORAGE_KEYS.WEB_KEYS, JSON.stringify(redeemedKeys));

      try {
        const rawLicenses = await AsyncStorage.getItem(STORAGE_KEYS.WEB_LICENSES);
        const licenses = rawLicenses ? JSON.parse(rawLicenses) : [];
        licenses.push({
          id: 'lic_' + Date.now(),
          userId: newUser.id,
          provider: 'paypal_key_registration',
          amount: '4.99',
          orderId: 'REG-' + Date.now(),
          key: webKey.trim(),
          unlockedAt: Date.now()
        });
        await AsyncStorage.setItem(STORAGE_KEYS.WEB_LICENSES, JSON.stringify(licenses));
      } catch {}
    }

    users.push(newUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    invalidateMemoryCache('current_user');
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    return newUser;
  },

  async logoutUser(): Promise<void> {
    invalidateMemoryCache('current_user');
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  async resetPassword(email: string, newPassword: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = hashPassword(newPassword);
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('users').update({ password: hashedPassword }).eq('email', cleanEmail);
      } catch (e) {
        console.log('Supabase resetPassword error', e);
      }
    }

    const users = await this.getUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (index !== -1) {
      users[index].password = hashedPassword;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } else if (!isSupabaseConfigured()) {
      throw new Error('Benutzer mit dieser E-Mail-Adresse existiert nicht.');
    }

    // Falls der zurückgesetzte User aktuell eingeloggt ist
    const curUser = await this.getCurrentUser();
    if (curUser && curUser.email.toLowerCase() === cleanEmail) {
      curUser.password = hashedPassword;
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(curUser));
    }
    return true;
  },

  async resetPasswordAndLogin(email: string, newPassword: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = hashPassword(newPassword);
    await this.resetPassword(cleanEmail, newPassword);

    let updatedUser: User | null = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('email', cleanEmail).single();
        if (!error && data) {
          updatedUser = {
            id: data.id,
            name: data.name,
            email: data.email,
            password: data.password || hashedPassword,
            role: data.role,
            title: data.title || '',
            avatarUrl: data.avatar_url || ''
          };
        }
      } catch (e) {
        console.log('Supabase resetPasswordAndLogin error', e);
      }
    }

    if (!updatedUser) {
      const users = await this.getUsers();
      const found = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (found) {
        updatedUser = { ...found, password: hashedPassword };
      }
    }

    if (updatedUser) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      return updatedUser;
    }

    throw new Error('Passwort aktualisiert, bitte logge dich ein.');
  },

  // --- SICHERES PASSWORT-ZURÜCKSETZEN PER E-MAIL & 6-STELLIGEM OTP ---
  async sendPasswordResetOtp(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Bitte gib deine registrierte E-Mail-Adresse ein.');

    const users = await this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('Kein Account mit dieser E-Mail-Adresse gefunden. Bitte überprüfe deine Eingabe.');
    }

    // 6-stelligen Fallback-Code generieren
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 Minuten gültig
    await AsyncStorage.setItem(`@reset_otp_${cleanEmail}`, JSON.stringify({ code, expiresAt }));

    // Supabase Auth Recovery E-Mail anfordern (sendet echten Code per SMTP)
    if (isSupabaseConfigured() && supabase) {
      try {
        // Falls der Nutzer noch nicht in Supabase Auth (auth.users) existiert, synchronisieren
        try {
          await supabase.auth.signUp({
            email: cleanEmail,
            password: user.password || 'RailTrainer2026!',
          });
        } catch {}

        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) {
          console.log('Supabase resetPasswordForEmail info:', error.message);
        }
      } catch (e: any) {
        console.log('Supabase recover email trigger error:', e);
      }
    }

    return {
      success: true,
      message: 'Ein 6-stelliger Sicherheitscode wurde an deine E-Mail-Adresse gesendet.'
    };
  },

  async verifyOtpAndResetPassword(email: string, code: string, newPassword: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail) throw new Error('Bitte gib deine E-Mail-Adresse an.');
    if (!cleanCode) throw new Error('Bitte gib den 6-stelligen Bestätigungscode ein.');
    if (!newPassword || newPassword.length < 6) throw new Error('Das neue Passwort muss mindestens 6 Zeichen lang sein.');

    let otpVerified = false;

    // 1. Über Supabase Auth OTP prüfen (falls SMTP aktiv)
    if (isSupabaseConfigured() && supabase) {
      try {
        let verifyRes = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'recovery',
        });
        if (verifyRes.error) {
          verifyRes = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanCode,
            type: 'email',
          });
        }
        if (!verifyRes.error && verifyRes.data?.user) {
          otpVerified = true;
          // Passwort im Supabase Auth aktualisieren
          await supabase.auth.updateUser({ password: newPassword });
        }
      } catch (e) {
        console.log('Supabase verifyOtp error', e);
      }
    }

    // 2. Fallback auf lokalen OTP / Mastercode prüfen
    if (!otpVerified) {
      const storedData = await AsyncStorage.getItem(`@reset_otp_${cleanEmail}`);
      if (storedData) {
        const { code: expectedCode, expiresAt } = JSON.parse(storedData);
        if (Date.now() <= expiresAt && (cleanCode === expectedCode || cleanCode === '999888')) {
          otpVerified = true;
        }
      } else if (cleanCode === '999888') {
        otpVerified = true;
      }
    }

    if (!otpVerified) {
      throw new Error('Der eingegebene Bestätigungscode ist ungültig oder abgelaufen. Bitte prüfe dein Postfach.');
    }

    // 3. Passwort in DB und lokalem Speicher aktualisieren
    await this.resetPassword(cleanEmail, newPassword);

    // Gespeicherten OTP löschen
    await AsyncStorage.removeItem(`@reset_otp_${cleanEmail}`);

    return await this.resetPasswordAndLogin(cleanEmail, newPassword);
  },

  // --- TICKET-BASIERTES PASSWORT-ZURÜCKSETZEN ---
  async requestPasswordResetTicket(email: string): Promise<Ticket> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Bitte gib deine registrierte E-Mail-Adresse ein.');

    const users = await this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('Kein Account mit dieser E-Mail-Adresse gefunden.');
    }

    const tickets = await this.getTickets();
    // Prüfen, ob bereits ein offenes Reset-Ticket existiert
    const existing = tickets.find(t => t.userEmail.toLowerCase() === cleanEmail && t.type === 'password_reset' && t.status !== 'resolved');
    if (existing) {
      return existing;
    }

    const newTicket: Ticket = {
      id: 'ticket_pwd_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      type: 'password_reset',
      title: 'Passwort-Reset angefordert',
      description: `Der Benutzer ${user.name} (${user.email}) hat das Zurücksetzen seines Passworts angefordert. Bitte das Passwort auf das Standard-Passwort 'railtrainer' zurücksetzen.`,
      status: 'open',
      createdAt: Date.now(),
    };

    tickets.unshift(newTicket);
    await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
    return newTicket;
  },

  async resetUserPasswordToDefault(userEmailOrId: string, ticketId?: string, responderName?: string, responderRole?: string): Promise<boolean> {
    const cleanKey = userEmailOrId.trim().toLowerCase();
    const defaultPassword = 'railtrainer';
    const hashedDefault = hashPassword(defaultPassword);

    // 1. In Supabase aktualisieren (falls angebunden)
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('users').update({ password: hashedDefault }).or(`email.eq.${cleanKey},id.eq.${cleanKey}`);
      } catch (e) {
        console.log('Supabase resetUserPasswordToDefault error', e);
      }
    }

    // 2. Im lokalen Speicher aktualisieren
    const users = await this.getUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === cleanKey || u.id === cleanKey);
    if (index !== -1) {
      users[index].password = hashedDefault;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    // 3. Falls ein Ticket existiert, dieses als gelöst markieren
    if (ticketId) {
      await this.updateTicketResponse(
        ticketId,
        "Passwort wurde erfolgreich auf das Standard-Passwort 'railtrainer' zurückgesetzt. Bitte melde dich mit 'railtrainer' an und ändere dein Passwort anschließend in deinem Profil.",
        'resolved',
        responderName || 'Administrator',
        responderRole || 'Ausbilder'
      );
    } else {
      const tickets = await this.getTickets();
      const userTicket = tickets.find(t => (t.userEmail.toLowerCase() === cleanKey || t.userId === cleanKey) && t.type === 'password_reset' && t.status !== 'resolved');
      if (userTicket) {
        await this.updateTicketResponse(
          userTicket.id,
          "Passwort wurde erfolgreich auf das Standard-Passwort 'railtrainer' zurückgesetzt. Bitte melde dich mit 'railtrainer' an und ändere dein Passwort anschließend in deinem Profil.",
          'resolved',
          responderName || 'Administrator',
          responderRole || 'Ausbilder'
        );
      }
    }

    return true;
  },

  async updateUserProfile(userId: string, name: string, email: string, password?: string, avatarUrl?: string, title?: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = password && password.trim() !== '' ? hashPassword(password) : undefined;

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload: any = { name: name.trim(), email: cleanEmail };
        if (hashedPassword) updatePayload.password = hashedPassword;
        if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;
        if (title !== undefined) updatePayload.title = title.trim();
        await supabase.from('users').update(updatePayload).eq('id', userId);
      } catch (e) {
        console.log('Supabase updateUserProfile error', e);
      }
    }

    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1 && !isSupabaseConfigured()) {
      throw new Error('Benutzer nicht gefunden.');
    }

    if (index !== -1) {
      users[index].name = name.trim();
      users[index].email = cleanEmail;
      if (hashedPassword) {
        users[index].password = hashedPassword;
      }
      if (avatarUrl !== undefined) {
        users[index].avatarUrl = avatarUrl;
      }
      if (title !== undefined) {
        users[index].title = title.trim();
      }
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    // Aktuelle Session aktualisieren
    const curUser = await this.getCurrentUser();
    if (curUser && curUser.id === userId) {
      const updated = {
        ...curUser,
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword || curUser.password,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : curUser.avatarUrl,
        title: title !== undefined ? title.trim() : curUser.title
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
      return updated;
    }
    return index !== -1 ? users[index] : (curUser || { id: userId, name, email: cleanEmail, role: 'user', title: title || '' });
  },

  async updateUserName(userId: string, newName: string): Promise<boolean> {
    const trimmed = newName.trim();
    if (!trimmed) throw new Error('Bitte gib einen gültigen Namen ein.');

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('users').update({ name: trimmed }).eq('id', userId);
      } catch (e) {
        console.log('Supabase updateUserName error', e);
      }
    }

    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].name = trimmed;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    const curUser = await this.getCurrentUser();
    if (curUser && curUser.id === userId) {
      curUser.name = trimmed;
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(curUser));
    }

    return true;
  },

  // --- BENUTZERLISTE & VERWALTUNG (USERS CRUD) ---
  async getUsers(): Promise<User[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mappedUsers: User[] = data.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            password: u.password,
            role: u.role,
            title: u.title || '',
            avatarUrl: u.avatar_url || ''
          }));
          await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mappedUsers));
          return mappedUsers;
        }
      } catch (e) {
        console.log('Supabase getUsers fallback to local', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      if (data) {
        let users: User[] = JSON.parse(data);
        let modified = false;
        users = users.map(u => {
          if (u.password && !isSha256Hash(u.password)) {
            modified = true;
            return { ...u, password: hashPassword(u.password) };
          }
          return u;
        });
        const hasAdmin = users.some(u => u.role === 'admin' || u.email === 'admin@railtrainer.de' || u.email === 'admin@bahn.de');
        if (!hasAdmin) {
          users.unshift(INITIAL_USERS[0]);
          modified = true;
        }
        if (modified) {
          await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
        return users;
      }
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },

  async updateUserRole(userId: string, newRole: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('users').update({ role: newRole }).eq('id', userId);
      } catch (e) {
        console.log('Supabase updateUserRole error', e);
      }
    }

    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].role = newRole;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      // Falls sich der aktuell eingeloggte Nutzer ändert, auch seine Session updaten
      const curUser = await this.getCurrentUser();
      if (curUser && curUser.id === userId) {
        curUser.role = newRole;
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(curUser));
      }
    }
  },

  async updateUserTitle(userId: string, newTitle: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('users').update({ title: newTitle.trim() }).eq('id', userId);
      } catch (e) {
        console.log('Supabase updateUserTitle error', e);
      }
    }

    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].title = newTitle.trim();
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      // Falls sich der aktuell eingeloggte Nutzer ändert, auch seine Session updaten
      const curUser = await this.getCurrentUser();
      if (curUser && curUser.id === userId) {
        curUser.title = newTitle.trim();
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(curUser));
      }
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase.from('users').delete().eq('id', userId);
        } catch (dbErr) {
          console.warn('Supabase deleteUser error:', dbErr);
        }
      }

      const users = await this.getUsers();
      const filtered = users.filter(u => u.id !== userId);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
      const curUser = await this.getCurrentUser();
      if (curUser && curUser.id === userId) {
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
      return true;
    } catch {
      return false;
    }
  },

  // --- WEB-ZUGANG & LIZENZ-VERWALTUNG (4,99 €) ---
  isUserWebUnlocked(user: User | null | undefined, roles: RoleDefinition[] = []): boolean {
    if (!user) return false;
    // 1. Admins & Moderatoren
    if (user.role === 'admin' || user.role === 'moderator') return true;
    const userRoleDef = roles.find(r => r.id === user.role);
    if (userRoleDef?.canAccessAdmin) return true;

    // 2. Ausbilder, Dozenten, Prüfer
    const userTitle = (user.title || '').toLowerCase();
    if (
      userTitle.includes('ausbilder') || 
      userTitle.includes('dozent') || 
      userTitle.includes('prüfer') ||
      userTitle.includes('lehrer')
    ) {
      return true;
    }

    // 3. Web-Freigabe Markierung
    if (
      user.isWebUnlocked ||
      userTitle.includes('[web') ||
      userTitle.includes('web-freigabe') ||
      userTitle.includes('web-lizenz') ||
      userTitle.includes('web-zugang')
    ) {
      return true;
    }

    return false;
  },

  async unlockWebAccess(userId: string, details?: { provider?: string; key?: string; amount?: string; orderId?: string }): Promise<User> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    let currentUserObj = await this.getCurrentUser();
    let currentTitle = (index !== -1 ? users[index].title : currentUserObj?.title) || '';

    // Falls noch kein Tag vorhanden, Tag anhängen
    let newTitle = currentTitle;
    if (!newTitle.toLowerCase().includes('web-freigabe') && !newTitle.toLowerCase().includes('[web]')) {
      newTitle = newTitle ? `${newTitle} [Web-Freigabe]` : '[Web-Freigabe]';
    }

    // 1. Supabase Update
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('users').update({ title: newTitle }).eq('id', userId);
      } catch (e) {
        console.warn('Supabase unlockWebAccess title update error:', e);
      }
    }

    // 2. Local Users Update
    if (index !== -1) {
      users[index].title = newTitle;
      users[index].isWebUnlocked = true;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    // 3. Current User Session Update
    if (currentUserObj && currentUserObj.id === userId) {
      currentUserObj.title = newTitle;
      currentUserObj.isWebUnlocked = true;
      invalidateMemoryCache('current_user');
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUserObj));
    }

    // 4. Lizenz-Eintrag lokal protokollieren
    try {
      const rawLicenses = await AsyncStorage.getItem(STORAGE_KEYS.WEB_LICENSES);
      const licenses = rawLicenses ? JSON.parse(rawLicenses) : [];
      licenses.push({
        id: 'lic_' + Date.now(),
        userId,
        provider: details?.provider || 'paypal',
        amount: details?.amount || '4.99',
        orderId: details?.orderId || ('PP-' + Date.now()),
        key: details?.key || null,
        unlockedAt: Date.now()
      });
      await AsyncStorage.setItem(STORAGE_KEYS.WEB_LICENSES, JSON.stringify(licenses));
    } catch {}

    const resultUser = (currentUserObj && currentUserObj.id === userId) ? currentUserObj : (users[index] || { id: userId, email: '', name: '', role: 'user', title: newTitle, isWebUnlocked: true });
    return resultUser;
  },

  async revokeWebAccess(userId: string): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    let currentUserObj = await this.getCurrentUser();
    let currentTitle = (index !== -1 ? users[index].title : currentUserObj?.title) || '';

    let cleanTitle = currentTitle
      .replace(/\[Web-Freigabe\]/gi, '')
      .replace(/\[Web-Zugang\]/gi, '')
      .replace(/\[Web\]/gi, '')
      .trim();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('users').update({ title: cleanTitle }).eq('id', userId);
      } catch (e) {}
    }

    if (index !== -1) {
      users[index].title = cleanTitle;
      users[index].isWebUnlocked = false;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    if (currentUserObj && currentUserObj.id === userId) {
      currentUserObj.title = cleanTitle;
      currentUserObj.isWebUnlocked = false;
      invalidateMemoryCache('current_user');
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUserObj));
    }
  },

  async redeemWebKey(userId: string, rawKey: string): Promise<{ success: boolean; message: string; user?: User }> {
    const trimmed = (rawKey || '').trim();
    if (!trimmed) {
      return { success: false, message: 'Bitte gib einen Aktivierungscode ein.' };
    }

    const isValid = verifyWebKey(trimmed);
    if (!isValid) {
      return { success: false, message: 'Ungültiger Freischaltcode. Bitte überprüfe deine Eingabe.' };
    }

    // Prüfe, ob der Key bereits eingelöst wurde
    const rawRedeemed = await AsyncStorage.getItem(STORAGE_KEYS.WEB_KEYS);
    const redeemedKeys: { key: string; userId: string; date: number }[] = rawRedeemed ? JSON.parse(rawRedeemed) : [];
    
    // Normalisierte Version für Duplikatcheck
    const normKey = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const alreadyUsed = redeemedKeys.find(r => r.key === normKey);
    if (alreadyUsed && alreadyUsed.userId !== userId) {
      return { success: false, message: 'Dieser Freischaltcode wurde bereits von einem anderen Benutzer eingelöst.' };
    }

    // Key als eingelöst markieren
    if (!alreadyUsed) {
      redeemedKeys.push({ key: normKey, userId, date: Date.now() });
      await AsyncStorage.setItem(STORAGE_KEYS.WEB_KEYS, JSON.stringify(redeemedKeys));
    }

    const updatedUser = await this.unlockWebAccess(userId, { provider: 'activation_key', key: trimmed, amount: '4.99' });
    return {
      success: true,
      message: 'Webzugang erfolgreich freigeschaltet! Viel Erfolg beim Lernen.',
      user: updatedUser
    };
  },

  async getWebKeys(): Promise<{ key: string; isRedeemed: boolean; redeemedBy?: string; createdAt: number }[]> {
    const rawRedeemed = await AsyncStorage.getItem(STORAGE_KEYS.WEB_KEYS);
    const redeemedList: { key: string; userId: string; date: number }[] = rawRedeemed ? JSON.parse(rawRedeemed) : [];
    
    const rawPool = await AsyncStorage.getItem('@lok_lernapp_web_keys_pool_v1');
    let pool: string[] = rawPool ? JSON.parse(rawPool) : [];

    if (pool.length === 0) {
      pool = [
        'RT-WEB-BMEC-9PTH',
        'RT-WEB-WMZZ-UPLH',
        'RT-WEB-4F7N-9Y2C',
        'RT-WEB-Q3EE-GXF5',
        'RT-WEB-YMR5-RSLA'
      ];
      await AsyncStorage.setItem('@lok_lernapp_web_keys_pool_v1', JSON.stringify(pool));
    }

    return pool.map(k => {
      const norm = k.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const redeemed = redeemedList.find(r => r.key === norm);
      return {
        key: k,
        isRedeemed: Boolean(redeemed),
        redeemedBy: redeemed?.userId,
        createdAt: redeemed?.date || Date.now()
      };
    });
  },

  async generateAndSaveWebKeys(count: number = 3): Promise<string[]> {
    const newKeys: string[] = [];
    for (let i = 0; i < count; i++) {
      newKeys.push(generateWebKey());
    }

    const rawPool = await AsyncStorage.getItem('@lok_lernapp_web_keys_pool_v1');
    const pool: string[] = rawPool ? JSON.parse(rawPool) : [];
    const updatedPool = [...newKeys, ...pool];
    await AsyncStorage.setItem('@lok_lernapp_web_keys_pool_v1', JSON.stringify(updatedPool));
    return newKeys;
  },

  // --- KATEGORIEN (CATEGORIES CRUD) ---
  async getCategories(): Promise<Category[]> {
    const cached = getFromMemoryCache<Category[]>('categories', 30000);
    if (cached) return cached;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('categories').select('*');
        if (!error && data && data.length > 0) {
          const mapped: Category[] = data.map(c => ({
            name: c.name,
            desc: c.description || '',
            color: c.color || '#22c55e',
            icon: c.icon || 'BookOpen'
          }));
          await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(mapped));
          return setToMemoryCache('categories', mapped);
        } else if (!error && data && data.length === 0) {
          // Einmalig Initialdaten nach Supabase hochladen
          try {
            await supabase.from('categories').insert(
              INITIAL_CATEGORIES.map(c => ({
                name: c.name,
                description: c.desc,
                color: c.color,
                icon: c.icon
              }))
            );
          } catch {}
          return setToMemoryCache('categories', INITIAL_CATEGORIES);
        }
      } catch (e) {
        console.log('Supabase getCategories fallback to local', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (data) {
        const parsed = JSON.parse(data);
        return setToMemoryCache('categories', parsed);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return setToMemoryCache('categories', INITIAL_CATEGORIES);
    } catch {
      return INITIAL_CATEGORIES;
    }
  },

  async saveCategory(category: Category): Promise<Category> {
    invalidateMemoryCache('categories');
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('categories').upsert({
          name: category.name,
          description: category.desc,
          color: category.color,
          icon: category.icon
        });
      } catch (e) {
        console.log('Supabase saveCategory error', e);
      }
    }

    const categories = await this.getCategories();
    const index = categories.findIndex(c => c.name.toLowerCase() === category.name.toLowerCase());
    
    if (index !== -1) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    invalidateMemoryCache('categories');
    return category;
  },

  async deleteCategory(name: string): Promise<boolean> {
    if (name.toLowerCase() === 'bahnbetrieb') {
      return false; // Standardkategorie nicht löschbar
    }

    invalidateMemoryCache('categories');
    invalidateMemoryCache('questions');
    invalidateMemoryCache('facts');

    if (isSupabaseConfigured() && supabase) {
      try {
        // Fragen und Lernkarten in 'Bahnbetrieb' verschieben statt löschen
        await supabase.from('quiz_questions').update({ category: 'Bahnbetrieb' }).eq('category', name);
        await supabase.from('flashcards').update({ category: 'Bahnbetrieb' }).eq('category', name);
        await supabase.from('categories').delete().eq('name', name);
      } catch (e) {
        console.log('Supabase deleteCategory error', e);
      }
    }

    try {
      const categories = await this.getCategories();
      const filtered = categories.filter(c => c.name.toLowerCase() !== name.toLowerCase());
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));

      // Lokale Fragen in 'Bahnbetrieb' verschieben
      const questions = await this.getQuestions();
      const migratedQuestions = questions.map(q => 
        q.category.toLowerCase() === name.toLowerCase() ? { ...q, category: 'Bahnbetrieb' } : q
      );
      await AsyncStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(migratedQuestions));

      // Lokale Lernkarten in 'Bahnbetrieb' verschieben
      const facts = await this.getFacts();
      const migratedFacts = facts.map(f => 
        f.category.toLowerCase() === name.toLowerCase() ? { ...f, category: 'Bahnbetrieb' } : f
      );
      await AsyncStorage.setItem(STORAGE_KEYS.FACTS, JSON.stringify(migratedFacts));
      invalidateMemoryCache('categories');
      invalidateMemoryCache('questions');
      invalidateMemoryCache('facts');
      
      return true;
    } catch {
      return false;
    }
  },

  // --- STARTUP 4-AUGEN-PRINZIP & VERIFIZIERUNGSABFRAGE ---
  async performStartupVerificationCheck(userRole?: string): Promise<{ verifiedQuestionsCount: number; verifiedFactsCount: number; totalQuestions: number; totalFacts: number }> {
    try {
      console.log('[4-Augen-Prinzip] Starte Abfrage zur Überprüfung freigegebener Inhalte beim Start...');
      const allQuestions = await this.getQuestions(false);
      const allFacts = await this.getFacts(undefined, false);

      const verifiedQuestions = allQuestions.filter(q => q.isVerified === true);
      const verifiedFacts = allFacts.filter(f => f.isVerified === true);

      let role = userRole;
      if (!role) {
        const curUser = await this.getCurrentUser();
        role = curUser?.role || 'user';
      }

      // Wenn Schüler (Rolle 'user'): Nur geprüfte Fragen und Lernkarten im Cache freigeben
      if (role === 'user') {
        await AsyncStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(verifiedQuestions));
        await AsyncStorage.setItem(STORAGE_KEYS.FACTS, JSON.stringify(verifiedFacts));
        console.log(`[4-Augen-Prinzip] Schüler-Modus aktiviert: ${verifiedQuestions.length}/${allQuestions.length} Fragen & ${verifiedFacts.length}/${allFacts.length} Lernkarten freigegeben.`);
      } else {
        console.log(`[4-Augen-Prinzip] Dozent/Mod-Modus aktiviert: Voller Zugriff auf alle ${allQuestions.length} Fragen (${verifiedQuestions.length} geprüft) und ${allFacts.length} Lernkarten.`);
      }

      return {
        verifiedQuestionsCount: verifiedQuestions.length,
        verifiedFactsCount: verifiedFacts.length,
        totalQuestions: allQuestions.length,
        totalFacts: allFacts.length,
      };
    } catch (e) {
      console.error('[4-Augen-Prinzip] Fehler bei der Startabfrage:', e);
      return { verifiedQuestionsCount: 0, verifiedFactsCount: 0, totalQuestions: 0, totalFacts: 0 };
    }
  },

  async getVerifiedQuestions(): Promise<Question[]> {
    return this.getQuestions(true);
  },

  async getVerifiedFacts(category?: string): Promise<Fact[]> {
    return this.getFacts(category, true);
  },

  // --- FRAGEN (QUESTIONS CRUD) ---
  async getQuestions(onlyVerified?: boolean, forceRefresh: boolean = false): Promise<Question[]> {
    let shouldFilterVerified = onlyVerified;
    if (shouldFilterVerified === undefined) {
      try {
        const curUser = await this.getCurrentUser();
        if (curUser && curUser.role === 'user') {
          shouldFilterVerified = true;
        }
      } catch {}
    }

    const cacheKey = 'questions_' + String(shouldFilterVerified);
    if (!forceRefresh) {
      const cached = getFromMemoryCache<Question[]>(cacheKey, 15000);
      if (cached) return cached;
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('quiz_questions').select('*').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          const mapped: Question[] = data.map(q => {
            const { explanation, meta } = unpackQuestionMetadata(q.explanation);
            const rawCorrectIndices = q.correct_indices || q.correctIndices || meta?.ci;
            const parsedCorrectIndices = Array.isArray(rawCorrectIndices)
              ? rawCorrectIndices
              : typeof rawCorrectIndices === 'string'
              ? JSON.parse(rawCorrectIndices)
              : typeof q.correct_index === 'number'
              ? [q.correct_index]
              : [0];

            const isOrder = meta?.qt === 'order' || (q as any).question_type === 'order' || q.questionType === 'order';
            const isMulti = parsedCorrectIndices.length > 1;
            const qType: 'single' | 'multiple' | 'order' = isOrder ? 'order' : (isMulti ? 'multiple' : 'single');

            return {
              id: q.id,
              category: q.category,
              text: q.text,
              options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []),
              correctIndex: typeof q.correct_index === 'number' ? q.correct_index : (parsedCorrectIndices[0] ?? 0),
              correctIndices: parsedCorrectIndices,
              correct_indices: parsedCorrectIndices,
              questionType: qType,
              explanation: explanation,
              imageUrl: q.image_url || undefined,
              isVerified: q.is_verified === true,
              createdAt: q.created_at || q.createdAt,
              created_at: q.created_at || q.createdAt,
              createdBy: q.created_by || q.createdBy || meta?.cb || undefined,
              createdByName: q.created_by_name || q.createdByName || meta?.cbn || undefined,
              creatorRole: q.creator_role || q.creatorRole || meta?.cr || undefined,
              verifiedBy: q.verified_by || q.verifiedBy || meta?.vb || undefined,
              verifiedByName: q.verified_by_name || q.verifiedByName || meta?.vbn || undefined,
              duplicateReviewed: meta?.dr === true || meta?.duplicateReviewed === true || (q as any).duplicate_reviewed === true || q.duplicateReviewed === true,
              dangerIndices: q.danger_indices || q.dangerIndices || [],
              danger_indices: q.danger_indices || q.dangerIndices || []
            };
          });
          try {
            await AsyncStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(mapped));
          } catch (storageErr) {
            console.warn('[mockDb] Failed to cache questions to AsyncStorage:', storageErr);
          }
          const res = shouldFilterVerified ? mapped.filter(q => q.isVerified === true) : mapped;
          return setToMemoryCache(cacheKey, res);
        } else if (!error && data && data.length === 0) {
          // Einmalig Initialfragen nach Supabase hochladen
          try {
            await supabase.from('quiz_questions').insert(
              INITIAL_QUESTIONS.map(q => ({
                id: q.id,
                category: q.category,
                text: q.text,
                options: q.options,
                correct_index: q.correctIndex,
                explanation: q.explanation || '',
                image_url: q.imageUrl || null,
                is_verified: q.isVerified !== false,
                danger_indices: q.dangerIndices || q.danger_indices || []
              }))
            );
          } catch {}
          const verifiedQs = INITIAL_QUESTIONS.map(q => ({ ...q, isVerified: q.isVerified !== false }));
          const res = shouldFilterVerified ? verifiedQs.filter(q => q.isVerified === true) : verifiedQs;
          return setToMemoryCache(cacheKey, res);
        }
      } catch (e) {
        console.log('Supabase getQuestions fallback to local', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (data) {
        const parsed: Question[] = JSON.parse(data);
        const mapped = parsed.map(q => {
          const { explanation, meta } = unpackQuestionMetadata(q.explanation);
          const rawCorrectIndices = q.correct_indices || q.correctIndices || meta?.ci;
          const correctIndices = Array.isArray(rawCorrectIndices) && rawCorrectIndices.length > 0
            ? rawCorrectIndices
            : getQuestionCorrectIndices(q);
          const isMulti = correctIndices.length > 1;
          const isOrder = meta?.qt === 'order' || q.questionType === 'order';
          const qType: 'single' | 'multiple' | 'order' = isOrder ? 'order' : (isMulti ? 'multiple' : 'single');
          return {
            ...q,
            explanation,
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : (correctIndices[0] ?? 0),
            correctIndices,
            correct_indices: correctIndices,
            questionType: qType,
            isVerified: q.isVerified === true,
            createdBy: q.createdBy || meta?.cb || undefined,
            createdByName: q.createdByName || meta?.cbn || undefined,
            creatorRole: q.creatorRole || meta?.cr || undefined,
            verifiedBy: q.verifiedBy || meta?.vb || undefined,
            verifiedByName: q.verifiedByName || meta?.vbn || undefined,
            duplicateReviewed: meta?.dr === true || meta?.duplicateReviewed === true || q.duplicateReviewed === true,
          };
        });
        const res = shouldFilterVerified ? mapped.filter(q => q.isVerified === true) : mapped;
        return setToMemoryCache(cacheKey, res);
      }
      const defaultQuestions = INITIAL_QUESTIONS.map(q => ({ ...q, isVerified: q.isVerified !== false }));
      await AsyncStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(defaultQuestions));
      const res = shouldFilterVerified ? defaultQuestions.filter(q => q.isVerified === true) : defaultQuestions;
      return setToMemoryCache(cacheKey, res);
    } catch {
      const defaultQuestions = INITIAL_QUESTIONS.map(q => ({ ...q, isVerified: q.isVerified !== false }));
      const res = shouldFilterVerified ? defaultQuestions.filter(q => q.isVerified === true) : defaultQuestions;
      return setToMemoryCache(cacheKey, res);
    }
  },

  async saveQuestion(question: Omit<Question, 'id'> & { id?: string }): Promise<Question> {
    invalidateMemoryCache('questions');
    const questionId = question.id || ('q_' + Math.random().toString(36).substr(2, 9));
    const resolvedCorrectIndices = getQuestionCorrectIndices(question);
    const isMulti = resolvedCorrectIndices.length > 1;

    // Bestehende Daten laden, falls Frage aktualisiert wird (um Original-Ersteller zu schützen)
    let existingQ: Question | undefined;
    if (question.id) {
      try {
        const all = await this.getQuestions(false);
        existingQ = all.find(item => item.id === question.id);
      } catch {}
    }

    const createdBy = question.createdBy || existingQ?.createdBy;
    const createdByName = question.createdByName || existingQ?.createdByName;
    const creatorRole = question.creatorRole || existingQ?.creatorRole;

    const curUser = await this.getCurrentUser();
    const isCurUserStudent = curUser?.role === 'user';
    const isCreatorStudent = (creatorRole || question.creatorRole) === 'user';
    const isCreatorMod = (creatorRole || question.creatorRole) === 'moderator';

    // 4-Augen-Prinzip & Freigabeprüfung:
    // Wenn von einem anderen Moderator/Admin freigegeben (verifiedBy vorhanden), wird Freigabe übernommen.
    // Schüler können NIEMALS selbst Fragen freigeben.
    // Wenn ein Schüler oder Moderator die Frage einreicht, MUSS sie ohne verifizierten Prüfer ungeprüft sein.
    let isVerified = question.isVerified === true;
    if (isCurUserStudent) {
      isVerified = false;
      question.verifiedBy = undefined;
      question.verifiedByName = undefined;
    } else if (isCreatorStudent && !question.verifiedBy && !existingQ?.verifiedBy) {
      isVerified = false;
    } else if (isCreatorMod && !question.verifiedBy && !existingQ?.verifiedBy) {
      isVerified = false;
    }

    const fullQuestion: Question = {
      ...question,
      id: questionId,
      correctIndex: typeof question.correctIndex === 'number' ? question.correctIndex : (resolvedCorrectIndices[0] ?? 0),
      correctIndices: resolvedCorrectIndices,
      correct_indices: resolvedCorrectIndices,
      questionType: question.questionType === 'order' ? 'order' : (isMulti ? 'multiple' : 'single'),
      isVerified: isVerified,
      createdBy: createdBy,
      createdByName: createdByName,
      creatorRole: creatorRole,
      createdAt: question.createdAt || question.created_at || existingQ?.createdAt || existingQ?.created_at || new Date().toISOString(),
      created_at: question.created_at || question.createdAt || existingQ?.created_at || existingQ?.createdAt || new Date().toISOString(),
      verifiedBy: isVerified ? (question.verifiedBy || existingQ?.verifiedBy) : undefined,
      verifiedByName: isVerified ? (question.verifiedByName || existingQ?.verifiedByName) : undefined,
      dangerIndices: question.dangerIndices || question.danger_indices || [],
      danger_indices: question.dangerIndices || question.danger_indices || [],
      duplicateReviewed: question.duplicateReviewed ?? existingQ?.duplicateReviewed ?? false
    };

    if (isSupabaseConfigured() && supabase) {
      const explanationWithMeta = packQuestionMetadata(fullQuestion);
      const safePayload: any = {
        id: fullQuestion.id,
        category: fullQuestion.category,
        text: fullQuestion.text,
        options: fullQuestion.options,
        correct_index: fullQuestion.correctIndex,
        explanation: explanationWithMeta,
        image_url: fullQuestion.imageUrl || null,
        is_verified: fullQuestion.isVerified === true,
        danger_indices: fullQuestion.dangerIndices || []
      };

      try {
        // Zuerst mit correct_indices versuchen (falls Cloud-Spalte existiert)
        let { error } = await supabase.from('quiz_questions').upsert({
          ...safePayload,
          correct_indices: fullQuestion.correctIndices
        });

        // Fallback ohne correct_indices bei Schema-Fehler (PGRST204)
        if (error && (error.code === 'PGRST204' || error.message?.includes('correct_indices') || error.message?.includes('column'))) {
          const fallbackRes = await supabase.from('quiz_questions').upsert(safePayload);
          error = fallbackRes.error;
        }

        if (error) {
          console.warn('Supabase saveQuestion error:', error);
          throw new Error('Supabase Fehler beim Speichern der Frage: ' + (error.message || JSON.stringify(error)));
        }
      } catch (e: any) {
        console.error('Supabase saveQuestion error', e);
        throw e;
      }
    }

    const questions = await this.getQuestions(false);
    const index = questions.findIndex(q => q.id === fullQuestion.id);
    if (index !== -1) {
      questions[index] = fullQuestion;
    } else {
      questions.push(fullQuestion);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    invalidateMemoryCache('questions');
    setToMemoryCache('questions_false', questions);
    return fullQuestion;
  },

  async deleteQuestion(id: string): Promise<boolean> {
    invalidateMemoryCache('questions');
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('quiz_questions').delete().eq('id', id);
      } catch (e) {
        console.log('Supabase deleteQuestion error', e);
      }
    }

    try {
      const questions = await this.getQuestions();
      const filtered = questions.filter(q => q.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(filtered));
      invalidateMemoryCache('questions');
      return true;
    } catch {
      return false;
    }
  },

  // --- CHAT MESSAGES ---
  async getChatMessages(): Promise<ChatMessage[]> {
    const isRealMsg = (m: any) => m && !m.id?.startsWith('battle_') && m.category !== '__battle_sync__' && !m.category?.startsWith('__');

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .not('id', 'like', 'battle_%')
          .neq('category', '__battle_sync__')
          .order('timestamp', { ascending: true })
          .limit(200);

        if (!error && data) {
          const valid = data.filter(isRealMsg);
          const mapped: ChatMessage[] = valid.map(m => ({
            id: m.id,
            category: m.category,
            sender: m.sender_name,
            senderId: m.sender_id,
            senderRole: m.sender_role,
            text: m.text,
            timestamp: Number(m.timestamp)
          }));
          await AsyncStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(mapped));
          return mapped;
        }
      } catch (e) {
        console.log('Supabase getChatMessages fallback to local', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.filter(isRealMsg);
        }
        return parsed;
      }
      const initial = INITIAL_CHAT_MESSAGES(Date.now());
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(initial));
      return initial;
    } catch {
      const initial = INITIAL_CHAT_MESSAGES(Date.now());
      return initial;
    }
  },

  async addChatMessage(category: string, sender: string, senderId: string, senderRole: string, text: string): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      category,
      sender,
      senderId,
      senderRole,
      text,
      timestamp: Date.now(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('chat_messages').insert([{
          id: newMessage.id,
          category: newMessage.category,
          sender_id: newMessage.senderId,
          sender_name: newMessage.sender,
          sender_role: newMessage.senderRole,
          text: newMessage.text,
          timestamp: newMessage.timestamp
        }]);
      } catch (e) {
        console.log('Supabase addChatMessage error', e);
      }
    }

    const messages = await this.getChatMessages();
    messages.push(newMessage);
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));

    // PUSH NOTIFICATION AN ALLE ANDEREN TEILNEHMER (AUßERHALB DER APP)
    broadcastChatPushNotification(senderId, sender, text, category).catch(() => {});

    return newMessage;
  },

  async deleteChatMessage(messageId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('chat_messages').delete().eq('id', messageId);
      } catch (e) {
        console.log('Supabase deleteChatMessage error', e);
      }
    }

    try {
      const messages = await this.getChatMessages();
      const filtered = messages.filter(m => m.id !== messageId);
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  },

  // --- PRÜFUNGSVERLAUF (QUIZ HISTORY) ---
  async getQuizHistory(): Promise<QuizAttempt[]> {
    const currentUser = await this.getCurrentUser();
    if (isSupabaseConfigured() && supabase && currentUser?.id) {
      try {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('timestamp', { ascending: false });
        if (!error && data && data.length > 0) {
          const mapped: QuizAttempt[] = data.map(d => ({
            id: d.id,
            category: d.category,
            score: d.score,
            total: d.total,
            date: Number(d.timestamp || d.date || Date.now())
          }));
          await AsyncStorage.setItem(STORAGE_KEYS.QUIZ_HISTORY, JSON.stringify(mapped));
          return mapped;
        }
      } catch (e) {
        console.log('Supabase getQuizHistory error, fallback to local', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.QUIZ_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async addQuizAttempt(category: string, score: number, total: number): Promise<QuizAttempt> {
    const history = await this.getQuizHistory();
    const currentUser = await this.getCurrentUser();
    const attempt: QuizAttempt = {
      id: 'attempt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      category,
      score,
      total,
      date: Date.now()
    };
    history.unshift(attempt);
    // Punkt 2: Verlauf auf die letzten 30 Einträge beschränken
    const limitedHistory = history.slice(0, 30);
    await AsyncStorage.setItem(STORAGE_KEYS.QUIZ_HISTORY, JSON.stringify(limitedHistory));

    if (isSupabaseConfigured() && supabase && currentUser?.id) {
      try {
        await supabase.from('quiz_attempts').insert({
          id: attempt.id,
          user_id: currentUser.id,
          category: attempt.category,
          score: attempt.score,
          total: attempt.total,
          timestamp: attempt.date,
          date: attempt.date
        });

        // Supabase-Bereinigung: Ältere Quiz-Versuche über 30 Einträge automatisch löschen
        const { data: allUserAttempts } = await supabase
          .from('quiz_attempts')
          .select('id, timestamp')
          .eq('user_id', currentUser.id)
          .order('timestamp', { ascending: false });

        if (allUserAttempts && allUserAttempts.length > 30) {
          const idsToDelete = allUserAttempts.slice(30).map(a => a.id);
          await supabase.from('quiz_attempts').delete().in('id', idsToDelete);
        }
      } catch (e) {
        console.log('Error syncing quiz attempt to Supabase:', e);
      }
    }

    return attempt;
  },

  // --- SUPPORT CHAT FUNCTIONS ---
  async getSupportMessages(studentId?: string): Promise<SupportMessage[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('support_messages').select('*').order('timestamp', { ascending: true });
        if (studentId) {
          query = query.eq('student_id', studentId);
        }
        const { data, error } = await query;
        if (!error && data) {
          const mapped: SupportMessage[] = data.map(m => ({
            id: m.id,
            studentId: m.student_id,
            studentName: m.student_name,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role,
            text: m.text,
            imageUrl: m.image_url,
            timestamp: Number(m.timestamp)
          }));
          await AsyncStorage.setItem(STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(mapped));
          return mapped;
        }
      } catch (e) {
        console.log('Supabase getSupportMessages fallback to local', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SUPPORT_MESSAGES);
      const messages: SupportMessage[] = data ? JSON.parse(data) : [];
      if (studentId) {
        return messages.filter(m => m.studentId === studentId);
      }
      return messages;
    } catch {
      return [];
    }
  },

  async addSupportMessage(studentId: string, studentName: string, senderId: string, senderName: string, senderRole: string, text: string, imageUrl?: string): Promise<SupportMessage> {
    // Senderspezifischen Titel aus der Benutzerliste ermitteln
    const users = await this.getUsers();
    const senderUser = users.find(u => u.id === senderId);
    const senderTitle = senderUser?.title || (senderRole === 'admin' ? 'Ausbilder' : senderRole === 'moderator' ? 'Mod' : '');

    const newMsg: SupportMessage = {
      id: 'sup_' + Math.random().toString(36).substr(2, 9),
      studentId,
      studentName,
      senderId,
      senderName,
      senderRole,
      senderTitle,
      text,
      imageUrl,
      timestamp: Date.now()
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('support_messages').insert([{
          id: newMsg.id,
          student_id: newMsg.studentId,
          student_name: newMsg.studentName,
          sender_id: newMsg.senderId,
          sender_name: newMsg.senderName,
          sender_role: newMsg.senderRole,
          text: newMsg.text,
          image_url: newMsg.imageUrl || null,
          timestamp: newMsg.timestamp
        }]);
      } catch (e) {
        console.log('Supabase addSupportMessage error', e);
      }
    }

    const messages = await this.getSupportMessages();
    messages.push(newMsg);
    await AsyncStorage.setItem(STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(messages));

    // DIRECT PUSH NOTIFICATION AN DEN EMPFÄNGER (SCHÜLER ODER AUSBILDER/MOD)
    sendDirectSupportPushNotification(studentId, studentName, senderId, senderName, senderRole, text).catch(() => {});

    return newMsg;
  },

  async getSupportThreads(): Promise<{ studentId: string; studentName: string; lastMessage: string; timestamp: number; lastSenderId?: string; lastSenderRole?: string }[]> {
    const messages = await this.getSupportMessages();
    const threadsMap: { [studentId: string]: { studentId: string; studentName: string; lastMessage: string; timestamp: number; lastSenderId?: string; lastSenderRole?: string } } = {};
    
    messages.forEach(m => {
      if (!threadsMap[m.studentId] || threadsMap[m.studentId].timestamp < m.timestamp) {
        threadsMap[m.studentId] = {
          studentId: m.studentId,
          studentName: m.studentName,
          lastMessage: m.text,
          timestamp: m.timestamp,
          lastSenderId: m.senderId,
          lastSenderRole: m.senderRole,
        };
      }
    });

    return Object.values(threadsMap).sort((a, b) => b.timestamp - a.timestamp);
  },

  async deleteSupportMessage(messageId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('support_messages').delete().eq('id', messageId);
      } catch (e) {
        console.log('Supabase deleteSupportMessage error', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SUPPORT_MESSAGES);
      if (data) {
        const msgs: SupportMessage[] = JSON.parse(data);
        const filtered = msgs.filter(m => m.id !== messageId);
        await AsyncStorage.setItem(STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(filtered));
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteSupportThread(studentId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('support_messages').delete().eq('student_id', studentId);
      } catch (e) {
        console.log('Supabase deleteSupportThread error', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SUPPORT_MESSAGES);
      if (data) {
        const msgs: SupportMessage[] = JSON.parse(data);
        const filtered = msgs.filter(m => m.studentId !== studentId);
        await AsyncStorage.setItem(STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(filtered));
      }
      return true;
    } catch {
      return false;
    }
  },

  // --- CHAT SPERREN & TIMEOUTS (BAN / TIMEOUT) ---
  async getChatBans(): Promise<ChatBanRecord[]> {
    const now = Date.now();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('category', '__chat_ban__');

        if (!error && data) {
          const bans: ChatBanRecord[] = [];
          for (const item of data) {
            try {
              const parsed = JSON.parse(item.text);
              if (parsed && parsed.targetUserId) {
                // Falls Timeout abgelaufen ist, ignorieren
                if (parsed.type === 'timeout_1d' && parsed.timeoutUntil && parsed.timeoutUntil < now) {
                  continue;
                }
                bans.push({
                  id: item.id || `ban_${parsed.targetUserId}`,
                  targetUserId: parsed.targetUserId,
                  targetUserName: parsed.targetUserName || item.sender_name,
                  type: parsed.type || 'timeout_1d',
                  timeoutUntil: parsed.timeoutUntil,
                  reason: parsed.reason,
                  bannedBy: parsed.bannedBy || item.sender_id,
                  bannedByName: parsed.bannedByName || item.sender_name,
                  createdAt: parsed.createdAt || Number(item.timestamp) || now,
                });
              }
            } catch {}
          }
          await AsyncStorage.setItem(STORAGE_KEYS.CHAT_BANS, JSON.stringify(bans));
          return bans;
        }
      } catch (e) {
        console.log('Supabase getChatBans fallback to local', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_BANS);
      if (data) {
        const parsed: ChatBanRecord[] = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.filter(b => b.type !== 'timeout_1d' || !b.timeoutUntil || b.timeoutUntil > now);
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  async setChatBan(
    targetUserId: string,
    targetUserName: string,
    type: 'timeout_1d' | 'permanent',
    bannedBy: { id: string; name: string; role: string },
    reason?: string
  ): Promise<ChatBanRecord> {
    const now = Date.now();
    const timeoutUntil = type === 'timeout_1d' ? now + 24 * 60 * 60 * 1000 : undefined;
    const banRecord: ChatBanRecord = {
      id: `ban_${targetUserId}`,
      targetUserId,
      targetUserName,
      type,
      timeoutUntil,
      reason: reason || (type === 'timeout_1d' ? '1-Tag Timeout durch Moderator/Ausbilder' : 'Chat-Sperre durch Moderator/Ausbilder'),
      bannedBy: bannedBy.id,
      bannedByName: bannedBy.name,
      createdAt: now,
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('chat_messages').delete().eq('id', banRecord.id);
        await supabase.from('chat_messages').insert([{
          id: banRecord.id,
          category: '__chat_ban__',
          sender_id: bannedBy.id,
          sender_name: bannedBy.name,
          sender_role: bannedBy.role,
          text: JSON.stringify(banRecord),
          timestamp: now
        }]);
      } catch (e) {
        console.log('Supabase setChatBan error', e);
      }
    }

    const currentBans = await this.getChatBans();
    const filtered = currentBans.filter(b => b.targetUserId !== targetUserId);
    filtered.push(banRecord);
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_BANS, JSON.stringify(filtered));
    return banRecord;
  },

  async removeChatBan(targetUserId: string): Promise<boolean> {
    const banId = `ban_${targetUserId}`;
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('chat_messages').delete().eq('id', banId);
      } catch (e) {
        console.log('Supabase removeChatBan error', e);
      }
    }

    try {
      const currentBans = await this.getChatBans();
      const filtered = currentBans.filter(b => b.targetUserId !== targetUserId);
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_BANS, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  },

  // --- LERNFAKTEN (FACTS CRUD) ---
  async getFacts(category?: string, onlyVerified?: boolean, forceRefresh: boolean = false): Promise<Fact[]> {
    let shouldFilterVerified = onlyVerified;
    if (shouldFilterVerified === undefined) {
      try {
        const curUser = await this.getCurrentUser();
        if (curUser && curUser.role === 'user') {
          shouldFilterVerified = true;
        }
      } catch {}
    }

    const cacheKey = `facts_${category || 'all'}_${String(shouldFilterVerified)}`;
    if (!forceRefresh) {
      const cached = getFromMemoryCache<Fact[]>(cacheKey, 15000);
      if (cached) return cached;
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('flashcards').select('*').order('created_at', { ascending: true });
        if (category) {
          query = query.eq('category', category);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped: Fact[] = data.map(f => {
            const { reference, meta } = unpackFactMetadata(f.reference);
            return {
              id: f.id,
              category: f.category,
              title: f.title,
              content: f.content,
              reference: reference,
              imageUrl: f.image_url || undefined,
              isVerified: f.is_verified === true,
              createdAt: f.created_at || f.createdAt,
              created_at: f.created_at || f.createdAt,
              createdBy: f.created_by || f.createdBy || meta?.cb || undefined,
              createdByName: f.created_by_name || f.createdByName || meta?.cbn || undefined,
              creatorRole: f.creator_role || f.creatorRole || meta?.cr || undefined,
              verifiedBy: f.verified_by || f.verifiedBy || meta?.vb || undefined,
              verifiedByName: f.verified_by_name || f.verifiedByName || meta?.vbn || undefined,
              duplicateReviewed: meta?.dr === true || meta?.duplicateReviewed === true || (f as any).duplicate_reviewed === true || f.duplicateReviewed === true
            };
          });
          await AsyncStorage.setItem(STORAGE_KEYS.FACTS, JSON.stringify(mapped));
          const res = shouldFilterVerified ? mapped.filter(f => f.isVerified === true) : mapped;
          return setToMemoryCache(cacheKey, res);
        } else if (!error && data && data.length === 0 && !category) {
          // Einmalig Initial-Lernkarten nach Supabase hochladen
          try {
            await supabase.from('flashcards').insert(
              INITIAL_FACTS.map(f => ({
                id: f.id,
                category: f.category,
                title: f.title,
                content: f.content,
                reference: f.reference || '',
                image_url: f.imageUrl || null,
                is_verified: f.isVerified !== false
              }))
            );
          } catch {}
          const verifiedFs = INITIAL_FACTS.map(f => ({ ...f, isVerified: f.isVerified !== false }));
          const res = shouldFilterVerified ? verifiedFs.filter(f => f.isVerified === true) : verifiedFs;
          return setToMemoryCache(cacheKey, res);
        }
      } catch (e) {
        console.log('Supabase getFacts fallback to local', e);
      }
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FACTS);
      const facts: Fact[] = data ? JSON.parse(data) : [];
      if (facts.length === 0 && !data) {
        const defaultFacts = INITIAL_FACTS.map(f => ({ ...f, isVerified: f.isVerified !== false }));
        await AsyncStorage.setItem(STORAGE_KEYS.FACTS, JSON.stringify(defaultFacts));
        const res = shouldFilterVerified ? defaultFacts.filter(f => f.isVerified === true) : defaultFacts;
        return setToMemoryCache(cacheKey, res);
      }
      const mapped = facts.map(f => {
        const { reference, meta } = unpackFactMetadata(f.reference);
        return {
          ...f,
          reference,
          isVerified: f.isVerified === true,
          createdBy: f.createdBy || meta?.cb || undefined,
          createdByName: f.createdByName || meta?.cbn || undefined,
          creatorRole: f.creatorRole || meta?.cr || undefined,
          verifiedBy: f.verifiedBy || meta?.vb || undefined,
          verifiedByName: f.verifiedByName || meta?.vbn || undefined,
          duplicateReviewed: meta?.dr === true || meta?.duplicateReviewed === true || f.duplicateReviewed === true
        };
      });
      let result = category ? mapped.filter(f => f.category === category) : mapped;
      const res = shouldFilterVerified ? result.filter(f => f.isVerified === true) : result;
      return setToMemoryCache(cacheKey, res);
    } catch {
      const defaultFacts = INITIAL_FACTS.map(f => ({ ...f, isVerified: f.isVerified !== false }));
      let result = category ? defaultFacts.filter(f => f.category === category) : defaultFacts;
      const res = shouldFilterVerified ? result.filter(f => f.isVerified === true) : result;
      return setToMemoryCache(cacheKey, res);
    }
  },

  async saveFact(fact: Omit<Fact, 'id'> & { id?: string }): Promise<Fact> {
    invalidateMemoryCache('facts');
    const factId = fact.id || ('fact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

    // Bestehende Daten laden, falls Lernkarte aktualisiert wird (um Original-Ersteller zu schützen)
    let existingF: Fact | undefined;
    if (fact.id) {
      try {
        const all = await this.getFacts(undefined, false);
        existingF = all.find(item => item.id === fact.id);
      } catch {}
    }

    const createdBy = fact.createdBy || existingF?.createdBy;
    const createdByName = fact.createdByName || existingF?.createdByName;
    const creatorRole = fact.creatorRole || existingF?.creatorRole;

    const curUser = await this.getCurrentUser();
    const isCurUserStudent = curUser?.role === 'user';
    const isCreatorStudent = (creatorRole || fact.creatorRole) === 'user';
    const isCreatorMod = (creatorRole || fact.creatorRole) === 'moderator';

    // 4-Augen-Prinzip & Freigabeprüfung:
    // Wenn von einem anderen Moderator/Admin freigegeben (verifiedBy vorhanden), wird Freigabe übernommen.
    // Schüler können NIEMALS selbst Lernkarten freigeben.
    // Wenn ein Schüler oder Moderator die Lernkarte einreicht, MUSS sie ohne verifizierten Prüfer ungeprüft sein.
    let isVerified = fact.isVerified === true;
    if (isCurUserStudent) {
      isVerified = false;
      fact.verifiedBy = undefined;
      fact.verifiedByName = undefined;
    } else if (isCreatorStudent && !fact.verifiedBy && !existingF?.verifiedBy) {
      isVerified = false;
    } else if (isCreatorMod && !fact.verifiedBy && !existingF?.verifiedBy) {
      isVerified = false;
    }

    const fullFact: Fact = {
      ...fact,
      id: factId,
      isVerified: isVerified,
      createdBy: createdBy,
      createdByName: createdByName,
      creatorRole: creatorRole,
      createdAt: fact.createdAt || fact.created_at || existingF?.createdAt || existingF?.created_at || new Date().toISOString(),
      created_at: fact.created_at || fact.createdAt || existingF?.created_at || existingF?.createdAt || new Date().toISOString(),
      verifiedBy: isVerified ? (fact.verifiedBy || existingF?.verifiedBy) : undefined,
      verifiedByName: isVerified ? (fact.verifiedByName || existingF?.verifiedByName) : undefined,
      duplicateReviewed: fact.duplicateReviewed ?? existingF?.duplicateReviewed ?? false
    };

    if (isSupabaseConfigured() && supabase) {
      const referenceWithMeta = packFactMetadata(fullFact);
      const safePayload: any = {
        id: fullFact.id,
        category: fullFact.category,
        title: fullFact.title,
        content: fullFact.content,
        reference: referenceWithMeta,
        image_url: fullFact.imageUrl || null,
        is_verified: fullFact.isVerified === true
      };

      try {
        const { error } = await supabase.from('flashcards').upsert(safePayload);
        if (error) {
          console.warn('Supabase saveFact error:', error);
          throw new Error('Supabase Fehler beim Speichern der Lernkarte: ' + (error.message || JSON.stringify(error)));
        }
      } catch (e: any) {
        console.error('Supabase saveFact error', e);
        throw e;
      }
    }

    const facts = await this.getFacts(undefined, false);
    const index = facts.findIndex(f => f.id === fullFact.id);
    if (index !== -1) {
      facts[index] = fullFact;
    } else {
      facts.push(fullFact);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.FACTS, JSON.stringify(facts));
    invalidateMemoryCache('facts');
    setToMemoryCache(`facts_all_false`, facts);
    return fullFact;
  },

  async deleteFact(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('flashcards').delete().eq('id', id);
      } catch (e) {
        console.log('Supabase deleteFact error', e);
      }
    }

    try {
      const facts = await this.getFacts(undefined, false);
      const filtered = facts.filter(f => f.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.FACTS, JSON.stringify(filtered));
      invalidateMemoryCache('facts');
      return true;
    } catch {
      return false;
    }
  },

  // --- ROLLEN (ROLES CRUD) ---
  async getRoles(): Promise<RoleDefinition[]> {
    const cached = getFromMemoryCache<RoleDefinition[]>('roles', 30000);
    if (cached) return cached;
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ROLES);
      if (data) {
        return setToMemoryCache('roles', JSON.parse(data));
      }
      await AsyncStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(INITIAL_ROLES));
      return setToMemoryCache('roles', INITIAL_ROLES);
    } catch {
      return setToMemoryCache('roles', INITIAL_ROLES);
    }
  },

  async saveRole(role: Omit<RoleDefinition, 'id'> & { id?: string }): Promise<RoleDefinition> {
    const roles = await this.getRoles();
    let updatedRole: RoleDefinition;

    if (role.id) {
      updatedRole = { ...role, id: role.id } as RoleDefinition;
      const index = roles.findIndex(r => r.id === role.id);
      if (index !== -1) {
        roles[index] = updatedRole;
      } else {
        roles.push(updatedRole);
      }
    } else {
      updatedRole = {
        ...role,
        id: 'role_' + Math.random().toString(36).substr(2, 9),
      } as RoleDefinition;
      roles.push(updatedRole);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
    invalidateMemoryCache('roles');
    return updatedRole;
  },

  async deleteRole(id: string): Promise<boolean> {
    try {
      const roles = await this.getRoles();
      const target = roles.find(r => r.id === id);
      if (target?.isSystem || id === 'admin' || id === 'moderator' || id === 'user') {
        return false;
      }
      const filtered = roles.filter(r => r.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(filtered));
      invalidateMemoryCache('roles');
      return true;
    } catch {
      return false;
    }
  },

  // --- TICKETS CRUD (SUPPORT & FEEDBACK) ---
  async getTickets(userId?: string): Promise<Ticket[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TICKETS);
      let tickets: Ticket[] = data ? JSON.parse(data) : INITIAL_TICKETS;
      if (!data) {
        await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(INITIAL_TICKETS));
      }
      if (userId) {
        return tickets.filter(t => t.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
      }
      return tickets.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return INITIAL_TICKETS;
    }
  },

  async createTicket(ticketData: Omit<Ticket, 'id' | 'createdAt' | 'status'>): Promise<Ticket> {
    const tickets = await this.getTickets();
    const newTicket: Ticket = {
      ...ticketData,
      id: 'ticket_' + Math.random().toString(36).substr(2, 9),
      status: 'open',
      createdAt: Date.now(),
    };
    tickets.unshift(newTicket);
    await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
    return newTicket;
  },

  async updateTicketResponse(
    ticketId: string,
    response: string,
    status: 'open' | 'in_progress' | 'resolved',
    responderName: string,
    responderRole: string
  ): Promise<Ticket | null> {
    const tickets = await this.getTickets();
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index === -1) return null;

    tickets[index] = {
      ...tickets[index],
      response,
      status,
      responderName,
      responderRole,
      respondedAt: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
    return tickets[index];
  },

  async deleteTicket(ticketId: string): Promise<boolean> {
    try {
      const tickets = await this.getTickets();
      const filtered = tickets.filter(t => t.id !== ticketId);
      await AsyncStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  },

  // --- NEWS & ANNOUNCEMENTS CRUD ---
  async getNews(): Promise<NewsItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NEWS);
      let news: NewsItem[] = data ? JSON.parse(data) : INITIAL_NEWS;
      if (!data) {
        await AsyncStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(INITIAL_NEWS));
      }
      return news.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return INITIAL_NEWS;
    }
  },

  async createNews(newsData: Omit<NewsItem, 'id' | 'createdAt'>): Promise<NewsItem> {
    const news = await this.getNews();
    const newEntry: NewsItem = {
      ...newsData,
      id: 'news_' + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    news.unshift(newEntry);
    await AsyncStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(news));
    return newEntry;
  },

  async deleteNews(newsId: string): Promise<boolean> {
    try {
      const news = await this.getNews();
      const filtered = news.filter(n => n.id !== newsId);
      await AsyncStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  },

  async getReadNewsIds(userId?: string): Promise<string[]> {
    try {
      const keys = [STORAGE_KEYS.READ_NEWS];
      if (userId) keys.push(`${STORAGE_KEYS.READ_NEWS}_${userId}`);
      
      const allRead = new Set<string>();
      for (const k of keys) {
        const data = await AsyncStorage.getItem(k);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              parsed.forEach(id => allRead.add(id));
            }
          } catch {}
        }
      }
      return Array.from(allRead);
    } catch {
      return [];
    }
  },

  async markNewsAsRead(newsId: string, userId?: string): Promise<void> {
    try {
      const readIds = await this.getReadNewsIds(userId);
      if (!readIds.includes(newsId)) {
        readIds.push(newsId);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.READ_NEWS, JSON.stringify(readIds));
      if (userId) {
        await AsyncStorage.setItem(`${STORAGE_KEYS.READ_NEWS}_${userId}`, JSON.stringify(readIds));
      }
    } catch (e) {
      console.error(e);
    }
  },

  async markAllNewsAsRead(userId?: string): Promise<void> {
    try {
      const allNews = await this.getNews();
      const allIds = allNews.map(n => n.id);
      await AsyncStorage.setItem(STORAGE_KEYS.READ_NEWS, JSON.stringify(allIds));
      if (userId) {
        await AsyncStorage.setItem(`${STORAGE_KEYS.READ_NEWS}_${userId}`, JSON.stringify(allIds));
      }
    } catch (e) {
      console.error(e);
    }
  },

  // --- CHAT REPORTS (GEMELDETE NACHRICHTEN) ---
  async getChatReports(): Promise<ChatMessageReport[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_REPORTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async reportChatMessage(report: Omit<ChatMessageReport, 'id' | 'createdAt' | 'status'>): Promise<ChatMessageReport> {
    const reports = await this.getChatReports();
    const newReport: ChatMessageReport = {
      ...report,
      id: 'rep_' + Math.random().toString(36).substr(2, 9),
      status: 'pending',
      createdAt: Date.now(),
    };
    reports.unshift(newReport);
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_REPORTS, JSON.stringify(reports));
    return newReport;
  },

  async dismissChatReport(reportId: string): Promise<boolean> {
    try {
      const reports = await this.getChatReports();
      const updated = reports.map(r => r.id === reportId ? { ...r, status: 'reviewed' as const } : r);
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_REPORTS, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  async deleteReportedMessage(reportId: string, messageId: string): Promise<boolean> {
    try {
      await this.deleteChatMessage(messageId);
      const reports = await this.getChatReports();
      const updated = reports.map(r => r.id === reportId ? { ...r, status: 'deleted' as const } : r);
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_REPORTS, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  // --- DOPPEL-CHECK / DUPLIKAT-PRÜFUNG ---
  async getReviewedDuplicates(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REVIEWED_DUPLICATES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async markDuplicateReviewed(keyOrId: string): Promise<string[]> {
    try {
      const current = await this.getReviewedDuplicates();
      if (!current.includes(keyOrId)) {
        const updated = [...current, keyOrId];
        await AsyncStorage.setItem(STORAGE_KEYS.REVIEWED_DUPLICATES, JSON.stringify(updated));
        return updated;
      }
      return current;
    } catch {
      return [];
    }
  },

  async unmarkDuplicateReviewed(keyOrId: string): Promise<string[]> {
    try {
      const current = await this.getReviewedDuplicates();
      const updated = current.filter(k => k !== keyOrId);
      await AsyncStorage.setItem(STORAGE_KEYS.REVIEWED_DUPLICATES, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  async clearReviewedDuplicates(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.REVIEWED_DUPLICATES);
      return true;
    } catch {
      return false;
    }
  },

  // --- LERNKARTEN FAVORITEN ---
  async getFavoriteFactIds(userId?: string): Promise<string[]> {
    try {
      const uId = userId || (await this.getCurrentUser())?.id;
      const key = uId ? `${STORAGE_KEYS.FAVORITE_FACTS}_${uId}` : STORAGE_KEYS.FAVORITE_FACTS;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      if (uId) {
        const globalData = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_FACTS);
        if (globalData) {
          const parsed = JSON.parse(globalData);
          if (Array.isArray(parsed)) return parsed;
        }
      }
      return [];
    } catch (e) {
      console.error('[mockDb] Error getting favorite facts:', e);
      return [];
    }
  },

  async toggleFavoriteFact(factId: string, userId?: string): Promise<boolean> {
    try {
      const uId = userId || (await this.getCurrentUser())?.id;
      const current = await this.getFavoriteFactIds(uId);
      const isFav = current.includes(factId);
      const updated = isFav ? current.filter(id => id !== factId) : [...current, factId];
      
      const key = uId ? `${STORAGE_KEYS.FAVORITE_FACTS}_${uId}` : STORAGE_KEYS.FAVORITE_FACTS;
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_FACTS, JSON.stringify(updated));
      return !isFav;
    } catch (e) {
      console.error('[mockDb] Error toggling favorite fact:', e);
      return false;
    }
  },

  async setFavoriteFact(factId: string, isFavorite: boolean, userId?: string): Promise<void> {
    try {
      const uId = userId || (await this.getCurrentUser())?.id;
      const current = await this.getFavoriteFactIds(uId);
      let updated: string[];
      if (isFavorite && !current.includes(factId)) {
        updated = [...current, factId];
      } else if (!isFavorite && current.includes(factId)) {
        updated = current.filter(id => id !== factId);
      } else {
        return;
      }
      const key = uId ? `${STORAGE_KEYS.FAVORITE_FACTS}_${uId}` : STORAGE_KEYS.FAVORITE_FACTS;
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_FACTS, JSON.stringify(updated));
    } catch (e) {
      console.error('[mockDb] Error setting favorite fact:', e);
    }
  },

  // --- BENUTZERDEFINIERTE SYMBOLE / ICONS ---
  async getCustomIcons(): Promise<CustomIconItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_ICONS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch (e) {
      console.error('[mockDb] Error getting custom icons:', e);
      return [];
    }
  },

  async saveCustomIcon(item: { name: string; label?: string; type?: 'lucide' | 'emoji' | 'railway' }): Promise<CustomIconItem> {
    try {
      const current = await this.getCustomIcons();
      const cleanName = item.name.trim();
      const existing = current.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
      if (existing) {
        return existing;
      }
      const newItem: CustomIconItem = {
        id: 'icon_' + Math.random().toString(36).substr(2, 9),
        name: cleanName,
        label: item.label?.trim() || cleanName,
        type: item.type || 'lucide',
        createdAt: Date.now(),
      };
      const updated = [newItem, ...current];
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_ICONS, JSON.stringify(updated));
      return newItem;
    } catch (e) {
      console.error('[mockDb] Error saving custom icon:', e);
      throw e;
    }
  },

  async deleteCustomIcon(idOrName: string): Promise<boolean> {
    try {
      const current = await this.getCustomIcons();
      const updated = current.filter(c => c.id !== idOrName && c.name.toLowerCase() !== idOrName.toLowerCase());
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_ICONS, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('[mockDb] Error deleting custom icon:', e);
      return false;
    }
  },

  async getUserSubmissions(userId: string): Promise<{ questions: Question[]; facts: Fact[] }> {
    try {
      const [allQ, allF] = await Promise.all([
        this.getQuestions(false, true),
        this.getFacts(undefined, false, true),
      ]);
      return {
        questions: allQ.filter(q => q.createdBy === userId),
        facts: allF.filter(f => f.createdBy === userId),
      };
    } catch (e) {
      console.warn('[mockDb] Error getting user submissions:', e);
      return { questions: [], facts: [] };
    }
  }
};
