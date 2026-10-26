import { Question, Fact } from '../database/mockDb';

// Deutsche Stoppwörter für semantischen Token-Vergleich
const GERMAN_STOP_WORDS = new Set([
  'der', 'die', 'das', 'dem', 'den', 'des', 'ein', 'eine', 'einer', 'einem', 'einen', 'eines',
  'in', 'im', 'an', 'am', 'auf', 'aus', 'bei', 'mit', 'nach', 'von', 'vom', 'zu', 'zum', 'zur',
  'ueber', 'unter', 'vor', 'zwischen', 'fuer', 'durch', 'gegen', 'ohne', 'um',
  'ist', 'sind', 'war', 'waren', 'wird', 'werden', 'wurde', 'wurden', 'hat', 'haben', 'hatte', 'hatten',
  'und', 'oder', 'aber', 'denn', 'doch', 'als', 'wie',
  'was', 'wer', 'wo', 'wann', 'warum', 'welche', 'welcher', 'welches', 'welchen', 'welchem',
  'gilt', 'gelten', 'darf', 'duerfen', 'muss', 'muessen', 'kann', 'koennen', 'soll', 'sollte'
]);

/**
 * Normalisiert einen Text für den Ähnlichkeitsvergleich:
 * - Kleinschreibung
 * - Umlaute ersetzen (ä->ae, ö->oe, ü->ue, ß->ss)
 * - Sonderzeichen und Satzzeichen entfernen
 * - Mehrfache Leerzeichen zusammenfassen
 */
export function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Zerlegt Text in relevante Wort-Token unter Ausschluss von Stoppwörtern.
 */
export function extractTokens(text: string, removeStopWords: boolean = true): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  const words = norm.split(' ').filter(w => w.length > 1);
  if (!removeStopWords || words.length <= 2) {
    return words;
  }
  const filtered = words.filter(w => !GERMAN_STOP_WORDS.has(w));
  return filtered.length > 0 ? filtered : words;
}

/**
 * Erzeugt Bi-Gramme für Sørensen-Dice-Koeffizienten.
 */
function getBigrams(str: string): string[] {
  const s = normalizeText(str).replace(/\s+/g, '');
  const bigrams: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Sørensen-Dice-Koeffizient auf Basis von Bi-Grammen (0.0 bis 1.0)
 */
export function diceSimilarity(a: string, b: string): number {
  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (!s1 && !s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  if (bg1.length === 0 || bg2.length === 0) return 0.0;

  const counts = new Map<string, number>();
  for (const bg of bg1) {
    counts.set(bg, (counts.get(bg) || 0) + 1);
  }

  let matches = 0;
  for (const bg of bg2) {
    const c = counts.get(bg);
    if (c && c > 0) {
      matches++;
      counts.set(bg, c - 1);
    }
  }

  return (2.0 * matches) / (bg1.length + bg2.length);
}

/**
 * Token-basierter Dice-Koeffizient (Wortüberschneidung).
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = extractTokens(a);
  const tokensB = extractTokens(b);
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of tokensA) {
    if (setB.has(t)) intersection++;
  }

  return (2.0 * intersection) / (tokensA.length + tokensB.length);
}

/**
 * Levenshtein-Distanz (optimiert mit Array-Puffern)
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;
  if (s1.length > 250 || s2.length > 250) {
    // Bei zu langen Texten Bi-Gramm-Fallback zur CPU-Schonung
    return Math.round((1 - diceSimilarity(s1, s2)) * Math.max(s1.length, s2.length));
  }

  let prevRow = new Int32Array(s2.length + 1);
  let currRow = new Int32Array(s2.length + 1);

  for (let j = 0; j <= s2.length; j++) {
    prevRow[j] = j;
  }

  for (let i = 0; i < s1.length; i++) {
    currRow[0] = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      currRow[j + 1] = Math.min(
        currRow[j] + 1,        // Insertion
        prevRow[j + 1] + 1,    // Deletion
        prevRow[j] + cost      // Substitution
      );
    }
    prevRow.set(currRow);
  }

  return currRow[s2.length];
}

/**
 * Normalisierte Levenshtein-Ähnlichkeit (0.0 bis 1.0)
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1.0 - dist / maxLen);
}

/**
 * Kombinierte Ähnlichkeitsberechnung für zwei Textpassagen
 */
export function computeTextSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const minLen = Math.min(normA.length, normB.length);
  const maxLen = Math.max(normA.length, normB.length);

  // Substring-Check (eine Frage enthält die andere fast komplett)
  if (minLen > 12 && (normA.includes(normB) || normB.includes(normA))) {
    const ratio = minLen / maxLen;
    if (ratio > 0.75) return Math.max(0.85, ratio);
  }

  // Stark abweichende Längen können kein Duplikat sein (früher Abbruch spart CPU)
  if (minLen / maxLen < 0.45) {
    return 0.15;
  }

  const tokenScore = tokenSimilarity(normA, normB);
  if (tokenScore === 0 && minLen > 25) {
    return 0.1;
  }

  const diceScore = diceSimilarity(normA, normB);
  const levScore = (normA.length < 160 && normB.length < 160 && (minLen / maxLen > 0.65)) 
    ? levenshteinSimilarity(normA, normB) 
    : diceScore;

  // Gewichtung: Token-Übereinstimmung ist bei Fragen besonders aussagekräftig
  return Math.max(
    tokenScore * 0.5 + diceScore * 0.3 + levScore * 0.2,
    tokenScore,
    diceScore * 0.9
  );
}

/**
 * Prüft zwei Mengen von Antwortoptionen auf Ähnlichkeit.
 * Berücksichtigt permutierte Reihenfolgen und leicht abweichende Formulierungen.
 */
/**
 * Extrahiert den bereinigten Text aller als richtig markierten Antworten einer Frage.
 */
export function getCorrectAnswerTexts(q: Partial<Question>): string[] {
  const options = q.options || [];
  if (options.length === 0) return [];

  const rawIndices: number[] = [];
  if (Array.isArray(q.correctIndices) && q.correctIndices.length > 0) {
    rawIndices.push(...q.correctIndices);
  } else if (Array.isArray(q.correct_indices) && q.correct_indices.length > 0) {
    rawIndices.push(...q.correct_indices);
  } else if (typeof q.correctIndex === 'number' && q.correctIndex >= 0) {
    rawIndices.push(q.correctIndex);
  }

  const validIndices = Array.from(new Set(rawIndices)).filter(i => i >= 0 && i < options.length);
  return validIndices.map(i => (options[i] || '').trim()).filter(t => t.length > 0);
}

/**
 * Vergleicht die korrekten Antworten zweier Fragen (Reihenfolge-unabhängig).
 * Gibt 1.0 bei identischer Lösung, ~0.8 bei fast identischer Formulierung
 * und 0.0 bis 0.3 bei grundverschiedenen Lösungen zurück.
 * Gibt null zurück, wenn mindestens eine Frage noch keine festgelegte Lösung hat.
 */
export function computeCorrectAnswersSimilarity(q1: Partial<Question>, q2: Partial<Question>): number | null {
  const correct1 = getCorrectAnswerTexts(q1);
  const correct2 = getCorrectAnswerTexts(q2);

  if (correct1.length === 0 || correct2.length === 0) {
    return null;
  }

  const norm1 = correct1.map(c => normalizeText(c)).filter(Boolean);
  const norm2 = correct2.map(c => normalizeText(c)).filter(Boolean);
  if (norm1.length === 0 || norm2.length === 0) return null;

  // 1. Exakt-Mengenvergleich
  const set2 = new Set(norm2);
  let exactCount = 0;
  for (const c of norm1) {
    if (set2.has(c)) exactCount++;
  }
  if (exactCount === norm1.length && norm1.length === norm2.length) {
    return 1.0;
  }

  // 2. Beidseitiger Ähnlichkeitsvergleich (Bidirektional)
  let sum1to2 = 0;
  for (const c1 of norm1) {
    let best = 0;
    for (const c2 of norm2) {
      const s = computeTextSimilarity(c1, c2);
      if (s > best) best = s;
      if (best >= 0.95) break;
    }
    sum1to2 += best;
  }

  let sum2to1 = 0;
  for (const c2 of norm2) {
    let best = 0;
    for (const c1 of norm1) {
      const s = computeTextSimilarity(c2, c1);
      if (s > best) best = s;
      if (best >= 0.95) break;
    }
    sum2to1 += best;
  }

  const score1 = sum1to2 / norm1.length;
  const score2 = sum2to1 / norm2.length;
  return (score1 + score2) / 2;
}

export interface OptionsComparisonDetail {
  score: number;
  exactMatchesCount: number;
  strongMatchesCount: number;
  isTrivial: boolean;
}

/**
 * Detaillierter Vergleich zweier Mengen von Antwortoptionen.
 */
export function compareOptionsDetail(optionsA?: string[], optionsB?: string[]): OptionsComparisonDetail {
  const cleanA = (optionsA || []).map(o => normalizeText(o)).filter(o => o.length > 0);
  const cleanB = (optionsB || []).map(o => normalizeText(o)).filter(o => o.length > 0);

  if (cleanA.length === 0 || cleanB.length === 0) {
    return { score: 0, exactMatchesCount: 0, strongMatchesCount: 0, isTrivial: false };
  }

  // Trivial-Check: Sind es nur Standard-Optionen wie "Ja" / "Nein" oder "Wahr" / "Falsch"?
  const checkTrivial = (opts: string[]) => {
    return opts.length <= 2 && opts.every(o => ['ja', 'nein', 'wahr', 'falsch', 'richtig'].includes(o));
  };
  const isTrivial = checkTrivial(cleanA) && checkTrivial(cleanB);
  if (isTrivial) {
    return { score: 0.1, exactMatchesCount: 0, strongMatchesCount: 0, isTrivial: true };
  }

  // 1. Blitzschneller Exakt-Vergleich (Reihenfolge-unabhängig)
  const setB = new Set(cleanB);
  let exactMatches = 0;
  for (const optA of cleanA) {
    if (setB.has(optA)) exactMatches++;
  }
  if (exactMatches === cleanA.length && cleanA.length === cleanB.length) {
    return { score: 1.0, exactMatchesCount: exactMatches, strongMatchesCount: exactMatches, isTrivial: false };
  }

  // 2. Beidseitiger Ähnlichkeitsvergleich (Bidirektional: A -> B und B -> A)
  let sumA = 0;
  let strongA = 0;
  for (const optA of cleanA) {
    if (setB.has(optA)) {
      sumA += 1.0;
      strongA++;
      continue;
    }
    let best = 0;
    for (const optB of cleanB) {
      const sim = computeTextSimilarity(optA, optB);
      if (sim > best) best = sim;
      if (best >= 0.95) break;
    }
    sumA += best;
    if (best >= 0.8) strongA++;
  }

  const setA = new Set(cleanA);
  let sumB = 0;
  let strongB = 0;
  for (const optB of cleanB) {
    if (setA.has(optB)) {
      sumB += 1.0;
      strongB++;
      continue;
    }
    let best = 0;
    for (const optA of cleanA) {
      const sim = computeTextSimilarity(optB, optA);
      if (sim > best) best = sim;
      if (best >= 0.95) break;
    }
    sumB += best;
    if (best >= 0.8) strongB++;
  }

  const avgMatchA = sumA / cleanA.length;
  const avgMatchB = sumB / cleanB.length;
  const matchRatio = Math.min(strongA, strongB) / Math.max(cleanA.length, cleanB.length);
  const rawScore = ((avgMatchA + avgMatchB) / 2) * 0.65 + (matchRatio * 0.35);

  return {
    score: Math.min(1.0, Math.max(0, rawScore)),
    exactMatchesCount: exactMatches,
    strongMatchesCount: Math.min(strongA, strongB),
    isTrivial: false
  };
}

/**
 * Prüft zwei Mengen von Antwortoptionen auf Ähnlichkeit (0.0 bis 1.0).
 * Berücksichtigt permutierte Reihenfolgen und leicht abweichende Formulierungen.
 */
export function computeOptionsSimilarity(optionsA?: string[], optionsB?: string[]): number {
  return compareOptionsDetail(optionsA, optionsB).score;
}

export interface DuplicateQuestionPair {
  id: string;
  pairKey: string;
  question1: Question;
  question2: Question;
  score: number; // 0 bis 100
  reason: string;
  textScore: number;
  optionsScore: number;
  correctAnswerScore?: number;
  sameCorrectAnswer?: boolean;
  categoryMatch: boolean;
}

export interface DuplicateFactPair {
  id: string;
  pairKey: string;
  fact1: Fact;
  fact2: Fact;
  score: number; // 0 bis 100
  reason: string;
  titleScore: number;
  contentScore: number;
  categoryMatch: boolean;
}

/**
 * Erzeugt einen kanonischen Schlüssel für ein Paar von IDs (unabhängig von der Reihenfolge)
 */
export function getPairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join('___');
}

/**
 * Prüft zwei Fragen im Detail auf Ähnlichkeit unter genauer Berücksichtigung von
 * Fragentext, Antwortoptionen und Lösungsübereinstimmung.
 */
export function checkQuestionSimilarity(
  q1: Partial<Question>,
  q2: Partial<Question>
): { 
  isSimilar: boolean; 
  score: number; 
  reason: string; 
  textScore: number; 
  optionsScore: number;
  correctAnswerScore?: number;
  sameCorrectAnswer?: boolean;
} {
  const textScoreNum = computeTextSimilarity(q1.text || '', q2.text || '');
  const optDetail = compareOptionsDetail(q1.options, q2.options);
  const optionsScoreNum = optDetail.score;
  const correctSim = computeCorrectAnswersSimilarity(q1, q2);
  const categoryMatch = Boolean(q1.category && q2.category && q1.category.toLowerCase() === q2.category.toLowerCase());

  const textScore = Math.round(textScoreNum * 100);
  const optionsScore = Math.round(optionsScoreNum * 100);
  const correctAnswerScore = correctSim !== null ? Math.round(correctSim * 100) : undefined;
  const sameCorrectAnswer = correctSim !== null ? (correctSim >= 0.85) : undefined;

  let isSimilar = false;
  let reason = '';
  let finalScore = 0;

  // Schutz vor Falsch-Positiven (z.B. Zs 1 vs Zs 2):
  // Wenn Fragentext zwar ähnlich klingt, aber die Antwortoptionen und Lösungen komplett verschieden sind (< 20%)
  const hasSubstantialOptions = (q1.options || []).length >= 2 && (q2.options || []).length >= 2 && !optDetail.isTrivial;
  const conflictingAnswers = hasSubstantialOptions && optionsScoreNum < 0.20 && (correctSim === null || correctSim < 0.25);

  // Fall 1: Perfektes oder fast perfektes Duplikat (Fragentext & Antworten stimmen stark überein)
  if (textScoreNum >= 0.85 && optionsScoreNum >= 0.80) {
    isSimilar = true;
    finalScore = Math.round((textScoreNum * 0.45 + optionsScoreNum * 0.45 + (correctSim ?? 1.0) * 0.10) * 100);
    reason = `Frage (${textScore}%) & Antworten (${optionsScore}%) nahezu identisch${sameCorrectAnswer ? ' (gleiche Lösung)' : ''}`;
  }
  // Fall 2: Sehr hoher Fragentext (ab 82%) bei passenden oder neutralen Antworten
  else if (textScoreNum >= 0.82 && !conflictingAnswers) {
    isSimilar = true;
    if (optionsScoreNum >= 0.55) {
      finalScore = Math.round((textScoreNum * 0.60 + optionsScoreNum * 0.40) * 100);
      reason = `Fragentext zu ${textScore}% und Antworten zu ${optionsScore}% übereinstimmend`;
    } else {
      finalScore = textScore;
      reason = `Fragentext zu ${textScore}% übereinstimmend`;
    }
  }
  // Fall 3: Paraphrasierte Frage (Unterschiedliche Fragestellung, aber identische / sehr ähnliche Antworten & Lösung!)
  else if (optionsScoreNum >= 0.85 && (sameCorrectAnswer || correctSim === null) && textScoreNum >= 0.35) {
    isSimilar = true;
    finalScore = Math.round((optionsScoreNum * 0.60 + textScoreNum * 0.25 + (correctSim ?? 0.85) * 0.15) * 100);
    reason = `Antwortoptionen (${optionsScore}%) identisch${sameCorrectAnswer ? ' (gleiche Lösung)' : ''} bei ähnlicher Fragestellung (${textScore}%)`;
  }
  // Fall 4: Sehr hohe Antwort-Übereinstimmung (ab 92%) auch bei kürzeren Fragen
  else if (optionsScoreNum >= 0.92 && textScoreNum >= 0.25 && !optDetail.isTrivial) {
    isSimilar = true;
    finalScore = Math.round((optionsScoreNum * 0.70 + textScoreNum * 0.30) * 100);
    reason = `Antwortoptionen zu ${optionsScore}% identisch (Frage: ${textScore}%)`;
  }
  // Fall 5: Hohe Text-Ähnlichkeit in gleicher Kategorie mit nicht-widersprüchlichen Antworten
  else if (textScoreNum >= 0.70 && categoryMatch && !conflictingAnswers) {
    isSimilar = true;
    const optWeight = hasSubstantialOptions ? (optionsScoreNum >= 0.40 ? 0.30 : 0.10) : 0;
    finalScore = Math.round((textScoreNum * (1 - optWeight) + optionsScoreNum * optWeight) * 100);
    reason = `Fragentext zu ${textScore}% ähnlich in gleicher Kategorie (${q1.category})${optionsScore >= 45 ? ` (Antworten: ${optionsScore}%)` : ''}`;
  }
  // Fall 6: Allgemeine Text-Ähnlichkeit ab 75% (ohne widersprüchliche Antworten)
  else if (textScoreNum >= 0.75 && !conflictingAnswers) {
    isSimilar = true;
    finalScore = textScore;
    reason = `Fragentext zu ${textScore}% ähnlich${optionsScore >= 40 ? ` (Antworten: ${optionsScore}%)` : ''}`;
  }

  // Bonus basierend auf gleicher Lösung
  if (isSimilar && sameCorrectAnswer && finalScore < 95) {
    finalScore = Math.min(100, finalScore + 3);
  }

  return {
    isSimilar,
    score: Math.min(100, Math.max(0, finalScore)),
    reason,
    textScore,
    optionsScore,
    correctAnswerScore,
    sameCorrectAnswer
  };
}

/**
 * Prüft zwei Lernkarten im Detail auf Ähnlichkeit.
 */
export function checkFactSimilarity(
  f1: Partial<Fact>,
  f2: Partial<Fact>
): { isSimilar: boolean; score: number; reason: string; titleScore: number; contentScore: number } {
  const titleScore = computeTextSimilarity(f1.title || '', f2.title || '');
  const contentScore = computeTextSimilarity(f1.content || '', f2.content || '');
  const categoryMatch = Boolean(f1.category && f2.category && f1.category.toLowerCase() === f2.category.toLowerCase());

  let isSimilar = false;
  let reason = '';
  let finalScore = 0;

  // Fall 1: Nahezu identischer Titel
  if (titleScore >= 0.80) {
    isSimilar = true;
    finalScore = Math.round(titleScore * 100);
    reason = `Titel zu ${finalScore}% übereinstimmend`;
  }
  // Fall 2: Inhalt fast identisch
  else if (contentScore >= 0.80) {
    isSimilar = true;
    finalScore = Math.round(contentScore * 100);
    reason = `Lernkarten-Inhalt zu ${finalScore}% übereinstimmend`;
  }
  // Fall 3: Kombination aus ähnlichem Titel und ähnlichem Inhalt
  else if (titleScore >= 0.60 && contentScore >= 0.60) {
    isSimilar = true;
    finalScore = Math.round((titleScore * 0.5 + contentScore * 0.5) * 100);
    reason = `Titel (${Math.round(titleScore * 100)}%) und Inhalt (${Math.round(contentScore * 100)}%) ähnlich`;
  }
  // Fall 4: Gleiche Kategorie mit deutlicher Titel-Ähnlichkeit
  else if (categoryMatch && titleScore >= 0.68) {
    isSimilar = true;
    finalScore = Math.round(titleScore * 100);
    reason = `Titel zu ${finalScore}% ähnlich in gleicher Kategorie (${f1.category})`;
  }

  return {
    isSimilar,
    score: finalScore,
    reason,
    titleScore: Math.round(titleScore * 100),
    contentScore: Math.round(contentScore * 100)
  };
}

/**
 * Durchsucht alle Fragen nach Duplikaten asynchron in Chunks (verhindert UI-Freezes).
 * Vergleicht sowohl Fragentext als auch Antwortoptionen und Lösungsübereinstimmung.
 * Gibt nach jedem Chunk die Kontrolle an den JS-Event-Loop ab.
 */
export async function findDuplicateQuestionsAsync(
  questions: Question[],
  reviewedKeys: Set<string> = new Set(),
  reviewedIds: Set<string> = new Set(),
  onProgress?: (current: number, total: number) => void
): Promise<DuplicateQuestionPair[]> {
  // 1. Relevante Fragen filtern & Token für Text und Optionen vorberechnen
  const activeItems: {
    original: Question;
    id: string;
    textTokens: string[];
    textTokenSet: Set<string>;
    optTokens: string[];
    optTokenSet: Set<string>;
    category: string;
  }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q?.id || !q?.text || reviewedIds.has(q.id)) continue;
    
    const textTokens = extractTokens(q.text);
    const textTokenSet = new Set(textTokens);
    
    // Signifikante Wörter aus den Antwortoptionen (mind. 4 Zeichen)
    const rawOptTokens = (q.options || []).flatMap(o => extractTokens(o));
    const optTokens = rawOptTokens.filter(w => w.length >= 4);
    const optTokenSet = new Set(optTokens);

    activeItems.push({
      original: q,
      id: q.id,
      textTokens,
      textTokenSet,
      optTokens,
      optTokenSet,
      category: (q.category || '').toLowerCase()
    });
  }

  const n = activeItems.length;
  if (n < 2) return [];

  // 2. Invertierten Token-Index für Text und Antwortoptionen aufbauen
  const textTokenToIndices = new Map<string, number[]>();
  const optTokenToIndices = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    for (const t of activeItems[i].textTokenSet) {
      let list = textTokenToIndices.get(t);
      if (!list) {
        list = [];
        textTokenToIndices.set(t, list);
      }
      list.push(i);
    }
    for (const t of activeItems[i].optTokenSet) {
      let list = optTokenToIndices.get(t);
      if (!list) {
        list = [];
        optTokenToIndices.set(t, list);
      }
      list.push(i);
    }
  }

  // 3. Kandidatenpaare anhand gemeinsamer Text- oder Antwort-Token ermitteln
  const candidateMap = new Map<number, { sharedText: number; sharedOpt: number }>();

  for (const [token, indices] of textTokenToIndices.entries()) {
    if (indices.length < 2) continue;
    if (indices.length > n * 0.25) continue; // Allerweltswörter überspringen

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];
      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const hash = idxA < idxB ? idxA * 1000000 + idxB : idxB * 1000000 + idxA;
        let entry = candidateMap.get(hash);
        if (!entry) {
          entry = { sharedText: 0, sharedOpt: 0 };
          candidateMap.set(hash, entry);
        }
        entry.sharedText++;
      }
    }
  }

  for (const [token, indices] of optTokenToIndices.entries()) {
    if (indices.length < 2) continue;
    if (indices.length > n * 0.25) continue;

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];
      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const hash = idxA < idxB ? idxA * 1000000 + idxB : idxB * 1000000 + idxA;
        let entry = candidateMap.get(hash);
        if (!entry) {
          entry = { sharedText: 0, sharedOpt: 0 };
          candidateMap.set(hash, entry);
        }
        entry.sharedOpt++;
      }
    }
  }

  const pairs: DuplicateQuestionPair[] = [];
  const entries = Array.from(candidateMap.entries());
  const total = entries.length;

  for (let c = 0; c < total; c++) {
    if (c % 25 === 0) {
      if (onProgress) onProgress(c, total);
      await new Promise(r => setTimeout(r, 6));
    }

    const [hash, entry] = entries[c];
    const idxA = Math.floor(hash / 1000000);
    const idxB = hash % 1000000;
    const itemA = activeItems[idxA];
    const itemB = activeItems[idxB];

    // Kandidaten-Kriterium:
    // Mind. 2 geteilte Textwörter ODER mind. 2 geteilte Antwortwörter ODER (1 Text + 1 Antwort)
    // ODER gleiche Kategorie + mind. 1 signifikantes Text- oder Antwortwort
    const categoryMatch = itemA.category === itemB.category;
    const isCandidate = 
      (entry.sharedText >= 2) ||
      (entry.sharedOpt >= 2) ||
      (entry.sharedText >= 1 && entry.sharedOpt >= 1) ||
      (categoryMatch && (entry.sharedText >= 1 || entry.sharedOpt >= 1));

    if (!isCandidate) continue;

    const pKey = getPairKey(itemA.id, itemB.id);
    if (reviewedKeys.has(pKey) || reviewedKeys.has(`${itemA.id}___${itemB.id}`) || reviewedKeys.has(`${itemB.id}___${itemA.id}`)) continue;

    const res = checkQuestionSimilarity(itemA.original, itemB.original);
    if (res.isSimilar) {
      pairs.push({
        id: `${itemA.id}_${itemB.id}`,
        pairKey: pKey,
        question1: itemA.original,
        question2: itemB.original,
        score: res.score,
        reason: res.reason,
        textScore: res.textScore,
        optionsScore: res.optionsScore,
        correctAnswerScore: res.correctAnswerScore,
        sameCorrectAnswer: res.sameCorrectAnswer,
        categoryMatch
      });
    }
  }

  if (onProgress) onProgress(total, total);
  return pairs.sort((a, b) => b.score - a.score);
}

/**
 * Synchroner Fallback für Fragen
 */
export function findDuplicateQuestions(
  questions: Question[],
  reviewedKeys: Set<string> = new Set(),
  reviewedIds: Set<string> = new Set()
): DuplicateQuestionPair[] {
  const activeItems: {
    original: Question;
    id: string;
    textTokens: string[];
    textTokenSet: Set<string>;
    optTokens: string[];
    optTokenSet: Set<string>;
    category: string;
  }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q?.id || !q?.text || reviewedIds.has(q.id)) continue;
    
    const textTokens = extractTokens(q.text);
    const textTokenSet = new Set(textTokens);
    const rawOptTokens = (q.options || []).flatMap(o => extractTokens(o));
    const optTokens = rawOptTokens.filter(w => w.length >= 4);
    const optTokenSet = new Set(optTokens);

    activeItems.push({
      original: q,
      id: q.id,
      textTokens,
      textTokenSet,
      optTokens,
      optTokenSet,
      category: (q.category || '').toLowerCase()
    });
  }

  const n = activeItems.length;
  if (n < 2) return [];

  const textTokenToIndices = new Map<string, number[]>();
  const optTokenToIndices = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    for (const t of activeItems[i].textTokenSet) {
      let list = textTokenToIndices.get(t);
      if (!list) {
        list = [];
        textTokenToIndices.set(t, list);
      }
      list.push(i);
    }
    for (const t of activeItems[i].optTokenSet) {
      let list = optTokenToIndices.get(t);
      if (!list) {
        list = [];
        optTokenToIndices.set(t, list);
      }
      list.push(i);
    }
  }

  const candidateMap = new Map<number, { sharedText: number; sharedOpt: number }>();

  for (const [token, indices] of textTokenToIndices.entries()) {
    if (indices.length < 2) continue;
    if (indices.length > n * 0.25) continue;

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];
      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const hash = idxA < idxB ? idxA * 1000000 + idxB : idxB * 1000000 + idxA;
        let entry = candidateMap.get(hash);
        if (!entry) {
          entry = { sharedText: 0, sharedOpt: 0 };
          candidateMap.set(hash, entry);
        }
        entry.sharedText++;
      }
    }
  }

  for (const [token, indices] of optTokenToIndices.entries()) {
    if (indices.length < 2) continue;
    if (indices.length > n * 0.25) continue;

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];
      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const hash = idxA < idxB ? idxA * 1000000 + idxB : idxB * 1000000 + idxA;
        let entry = candidateMap.get(hash);
        if (!entry) {
          entry = { sharedText: 0, sharedOpt: 0 };
          candidateMap.set(hash, entry);
        }
        entry.sharedOpt++;
      }
    }
  }

  const pairs: DuplicateQuestionPair[] = [];
  for (const [hash, entry] of candidateMap.entries()) {
    const idxA = Math.floor(hash / 1000000);
    const idxB = hash % 1000000;
    const itemA = activeItems[idxA];
    const itemB = activeItems[idxB];

    const categoryMatch = itemA.category === itemB.category;
    const isCandidate = 
      (entry.sharedText >= 2) ||
      (entry.sharedOpt >= 2) ||
      (entry.sharedText >= 1 && entry.sharedOpt >= 1) ||
      (categoryMatch && (entry.sharedText >= 1 || entry.sharedOpt >= 1));

    if (!isCandidate) continue;

    const pKey = getPairKey(itemA.id, itemB.id);
    if (reviewedKeys.has(pKey) || reviewedKeys.has(`${itemA.id}___${itemB.id}`) || reviewedKeys.has(`${itemB.id}___${itemA.id}`)) continue;

    const res = checkQuestionSimilarity(itemA.original, itemB.original);
    if (res.isSimilar) {
      pairs.push({
        id: `${itemA.id}_${itemB.id}`,
        pairKey: pKey,
        question1: itemA.original,
        question2: itemB.original,
        score: res.score,
        reason: res.reason,
        textScore: res.textScore,
        optionsScore: res.optionsScore,
        correctAnswerScore: res.correctAnswerScore,
        sameCorrectAnswer: res.sameCorrectAnswer,
        categoryMatch
      });
    }
  }

  return pairs.sort((a, b) => b.score - a.score);
}

/**
 * Durchsucht alle Lernkarten nach Duplikaten asynchron in Chunks (verhindert UI-Freezes).
 * Verwendet invertierten Token-Index und Event-Loop-Yielding.
 */
export async function findDuplicateFactsAsync(
  facts: Fact[],
  reviewedKeys: Set<string> = new Set(),
  reviewedIds: Set<string> = new Set(),
  onProgress?: (current: number, total: number) => void
): Promise<DuplicateFactPair[]> {
  const activeItems: {
    original: Fact;
    id: string;
    titleTokens: string[];
    titleSet: Set<string>;
    contentTokens: string[];
    contentSet: Set<string>;
    category: string;
  }[] = [];

  for (let i = 0; i < facts.length; i++) {
    const f = facts[i];
    if (!f?.id || (!f?.title && !f?.content) || reviewedIds.has(f.id)) continue;

    const titleTokens = extractTokens(f.title || '');
    const titleSet = new Set(titleTokens);
    const contentTokens = extractTokens(f.content || '');
    const contentSet = new Set(contentTokens);

    activeItems.push({
      original: f,
      id: f.id,
      titleTokens,
      titleSet,
      contentTokens,
      contentSet,
      category: (f.category || '').toLowerCase()
    });
  }

  const n = activeItems.length;
  if (n < 2) return [];

  // Invertierter Index auf Titel-Token (hohe Relevanz)
  const titleTokenToIndices = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    for (const t of activeItems[i].titleSet) {
      let list = titleTokenToIndices.get(t);
      if (!list) {
        list = [];
        titleTokenToIndices.set(t, list);
      }
      list.push(i);
    }
  }

  const candidateMap = new Map<number, number>();
  for (const [token, indices] of titleTokenToIndices.entries()) {
    if (indices.length < 2) continue;
    // Häufige Wörter in >18% der Karten überspringen (verhindert zehntausende irrelevante Paare)
    if (indices.length > n * 0.18) continue;

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];
      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const hash = idxA < idxB ? idxA * 1000000 + idxB : idxB * 1000000 + idxA;
        candidateMap.set(hash, (candidateMap.get(hash) || 0) + 1);
      }
    }
  }

  const pairs: DuplicateFactPair[] = [];
  const entries = Array.from(candidateMap.entries());
  const total = entries.length;

  for (let c = 0; c < total; c++) {
    if (c % 25 === 0) {
      if (onProgress) onProgress(c, total);
      await new Promise(r => setTimeout(r, 6));
    }

    const [hash, sharedCount] = entries[c];
    const idxA = Math.floor(hash / 1000000);
    const idxB = hash % 1000000;
    const itemA = activeItems[idxA];
    const itemB = activeItems[idxB];

    // Längenverhältnis prüfen (früher Abbruch)
    const lenA = (itemA.original.title || '').length;
    const lenB = (itemB.original.title || '').length;
    if (lenA > 0 && lenB > 0) {
      const minL = Math.min(lenA, lenB);
      const maxL = Math.max(lenA, lenB);
      if (minL / maxL < 0.40) continue;
    }

    // Bei mehrteiligen Titeln müssen mind. 2 Tokens übereinstimmen
    const minTokens = Math.min(itemA.titleTokens.length, itemB.titleTokens.length);
    if (minTokens >= 2 && sharedCount < 2) continue;

    const pKey = getPairKey(itemA.id, itemB.id);
    if (reviewedKeys.has(pKey) || reviewedKeys.has(`${itemA.id}___${itemB.id}`) || reviewedKeys.has(`${itemB.id}___${itemA.id}`)) continue;

    const res = checkFactSimilarity(itemA.original, itemB.original);
    if (res.isSimilar) {
      pairs.push({
        id: `${itemA.id}_${itemB.id}`,
        pairKey: pKey,
        fact1: itemA.original,
        fact2: itemB.original,
        score: res.score,
        reason: res.reason,
        titleScore: res.titleScore,
        contentScore: res.contentScore,
        categoryMatch: itemA.category === itemB.category
      });
    }
  }

  if (onProgress) onProgress(total, total);
  return pairs.sort((a, b) => b.score - a.score);
}

/**
 * Synchroner Fallback für Lernkarten
 */
export function findDuplicateFacts(
  facts: Fact[],
  reviewedKeys: Set<string> = new Set(),
  reviewedIds: Set<string> = new Set()
): DuplicateFactPair[] {
  const activeItems: {
    original: Fact;
    id: string;
    titleTokens: string[];
    titleSet: Set<string>;
    contentTokens: string[];
    contentSet: Set<string>;
    category: string;
  }[] = [];

  for (let i = 0; i < facts.length; i++) {
    const f = facts[i];
    if (!f?.id || (!f?.title && !f?.content) || reviewedIds.has(f.id)) continue;

    const titleTokens = extractTokens(f.title || '');
    const titleSet = new Set(titleTokens);
    const contentTokens = extractTokens(f.content || '');
    const contentSet = new Set(contentTokens);

    activeItems.push({
      original: f,
      id: f.id,
      titleTokens,
      titleSet,
      contentTokens,
      contentSet,
      category: (f.category || '').toLowerCase()
    });
  }

  const n = activeItems.length;
  if (n < 2) return [];

  const titleTokenToIndices = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    for (const t of activeItems[i].titleSet) {
      let list = titleTokenToIndices.get(t);
      if (!list) {
        list = [];
        titleTokenToIndices.set(t, list);
      }
      list.push(i);
    }
  }

  const candidateMap = new Map<number, number>();
  for (const [token, indices] of titleTokenToIndices.entries()) {
    if (indices.length < 2) continue;
    if (indices.length > n * 0.18) continue;

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];
      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const hash = idxA < idxB ? idxA * 1000000 + idxB : idxB * 1000000 + idxA;
        candidateMap.set(hash, (candidateMap.get(hash) || 0) + 1);
      }
    }
  }

  const pairs: DuplicateFactPair[] = [];
  for (const [hash] of candidateMap.entries()) {
    const idxA = Math.floor(hash / 1000000);
    const idxB = hash % 1000000;
    const itemA = activeItems[idxA];
    const itemB = activeItems[idxB];

    const lenA = (itemA.original.title || '').length;
    const lenB = (itemB.original.title || '').length;
    if (lenA > 0 && lenB > 0) {
      const minL = Math.min(lenA, lenB);
      const maxL = Math.max(lenA, lenB);
      if (minL / maxL < 0.40) continue;
    }

    const minTokens = Math.min(itemA.titleTokens.length, itemB.titleTokens.length);
    if (minTokens >= 2 && (!candidateMap.get(hash) || candidateMap.get(hash)! < 2)) continue;

    const pKey = getPairKey(itemA.id, itemB.id);
    if (reviewedKeys.has(pKey) || reviewedKeys.has(`${itemA.id}___${itemB.id}`) || reviewedKeys.has(`${itemB.id}___${itemA.id}`)) continue;

    const res = checkFactSimilarity(itemA.original, itemB.original);
    if (res.isSimilar) {
      pairs.push({
        id: `${itemA.id}_${itemB.id}`,
        pairKey: pKey,
        fact1: itemA.original,
        fact2: itemB.original,
        score: res.score,
        reason: res.reason,
        titleScore: res.titleScore,
        contentScore: res.contentScore,
        categoryMatch: itemA.category === itemB.category
      });
    }
  }

  return pairs.sort((a, b) => b.score - a.score);
}

/**
 * Für Live-Prüfung im Fragen-Formular:
 * Sucht die ähnlichste bestehende Frage zur aktuellen Benutzereingabe.
 * Vergleicht sowohl Fragentext als auch Antwortoptionen blitzschnell.
 */
export function findSimilarQuestionForInput(
  text: string,
  options: string[],
  existingQuestions: Question[],
  excludeId?: string | null
): { question: Question; score: number; reason: string } | null {
  const cleanText = text.trim();
  const validOptions = (options || []).filter(o => o.trim().length > 0);
  if (cleanText.length < 5 && validOptions.length === 0) return null;

  const inputTokens = extractTokens(cleanText);
  const inputTokenSet = new Set(inputTokens);
  const optTokens = validOptions.flatMap(o => extractTokens(o)).filter(t => t.length >= 4);
  const optTokenSet = new Set(optTokens);

  let bestMatch: { question: Question; score: number; reason: string } | null = null;
  const draft: Partial<Question> = {
    text: cleanText,
    options: validOptions
  };

  for (const existing of existingQuestions) {
    if (excludeId && existing.id === excludeId) continue;
    if (!existing?.text) continue;

    // Vorfilter: Gemeinsame Wörter im Fragentext ODER in den Antwortoptionen?
    let hasShared = false;
    if (inputTokenSet.size > 0) {
      const existTextTokens = extractTokens(existing.text);
      for (const t of existTextTokens) {
        if (inputTokenSet.has(t)) {
          hasShared = true;
          break;
        }
      }
    }

    if (!hasShared && optTokenSet.size > 0) {
      const existOptTokens = (existing.options || []).flatMap(o => extractTokens(o));
      for (const t of existOptTokens) {
        if (optTokenSet.has(t)) {
          hasShared = true;
          break;
        }
      }
    }

    if (!hasShared && (cleanText.length > 15 || validOptions.length >= 2)) continue;

    const res = checkQuestionSimilarity(draft, existing);
    if (res.isSimilar && (!bestMatch || res.score > bestMatch.score)) {
      bestMatch = {
        question: existing,
        score: res.score,
        reason: res.reason
      };
    }
  }

  return bestMatch;
}

/**
 * Für Live-Prüfung im Lernkarten-Formular:
 * Sucht die ähnlichste bestehende Lernkarte zur aktuellen Benutzereingabe.
 */
export function findSimilarFactForInput(
  title: string,
  content: string,
  existingFacts: Fact[],
  excludeId?: string | null
): { fact: Fact; score: number; reason: string } | null {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();
  if (cleanTitle.length < 4 && cleanContent.length < 8) return null;

  const titleTokens = extractTokens(cleanTitle);
  const titleSet = new Set(titleTokens);

  let bestMatch: { fact: Fact; score: number; reason: string } | null = null;
  const draft: Partial<Fact> = {
    title: cleanTitle,
    content: cleanContent
  };

  for (const existing of existingFacts) {
    if (excludeId && existing.id === excludeId) continue;
    if (!existing?.title) continue;

    // Vorfilter: Hat der Titel gemeinsame Wörter?
    const existTokens = extractTokens(existing.title);
    let hasShared = false;
    for (const t of existTokens) {
      if (titleSet.has(t)) {
        hasShared = true;
        break;
      }
    }
    if (!hasShared && cleanTitle.length > 8) continue;

    const res = checkFactSimilarity(draft, existing);
    if (res.isSimilar && (!bestMatch || res.score > bestMatch.score)) {
      bestMatch = {
        fact: existing,
        score: res.score,
        reason: res.reason
      };
    }
  }

  return bestMatch;
}
