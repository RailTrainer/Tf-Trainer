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
export function computeOptionsSimilarity(optionsA?: string[], optionsB?: string[]): number {
  const cleanA = (optionsA || []).map(o => normalizeText(o)).filter(o => o.length > 0);
  const cleanB = (optionsB || []).map(o => normalizeText(o)).filter(o => o.length > 0);

  if (cleanA.length === 0 || cleanB.length === 0) return 0.0;

  // Trivial-Check: Sind es nur Standard-Optionen wie "Ja" / "Nein" oder "Wahr" / "Falsch"?
  const isTrivial = (opts: string[]) => {
    return opts.length <= 2 && opts.every(o => ['ja', 'nein', 'wahr', 'falsch', 'richtig'].includes(o));
  };
  if (isTrivial(cleanA) && isTrivial(cleanB)) {
    return 0.1; // Nicht als Duplikatkriterium werten
  }

  // 1. Blitzschneller Exakt-Vergleich (Spart bis zu 16 Textvergleiche bei identischen Optionen)
  const setB = new Set(cleanB);
  let exactMatches = 0;
  for (const optA of cleanA) {
    if (setB.has(optA)) exactMatches++;
  }
  if (exactMatches === cleanA.length && cleanA.length === cleanB.length) {
    return 1.0;
  }

  // Finde für jede Option in A die ähnlichste Option in B
  let totalMatchScore = 0;
  let strongMatches = 0;

  for (const optA of cleanA) {
    if (setB.has(optA)) {
      totalMatchScore += 1.0;
      strongMatches++;
      continue;
    }
    let bestMatch = 0;
    for (const optB of cleanB) {
      const sim = computeTextSimilarity(optA, optB);
      if (sim > bestMatch) bestMatch = sim;
      if (bestMatch >= 0.95) break; // Frühzeitiger Abbruch bei Fast-Identität
    }
    totalMatchScore += bestMatch;
    if (bestMatch >= 0.8) strongMatches++;
  }

  const avgMatch = totalMatchScore / cleanA.length;
  const matchRatio = strongMatches / Math.max(cleanA.length, cleanB.length);

  return (avgMatch * 0.6) + (matchRatio * 0.4);
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
 * Prüft zwei Fragen im Detail auf Ähnlichkeit.
 */
export function checkQuestionSimilarity(
  q1: Partial<Question>,
  q2: Partial<Question>
): { isSimilar: boolean; score: number; reason: string; textScore: number; optionsScore: number } {
  const textScore = computeTextSimilarity(q1.text || '', q2.text || '');
  const optionsScore = computeOptionsSimilarity(q1.options, q2.options);
  const categoryMatch = Boolean(q1.category && q2.category && q1.category.toLowerCase() === q2.category.toLowerCase());

  let isSimilar = false;
  let reason = '';
  let finalScore = 0;

  // Fall 1: Exakter oder nahezu identischer Fragentext
  if (textScore >= 0.82) {
    isSimilar = true;
    finalScore = Math.round(textScore * 100);
    reason = `Fragentext zu ${finalScore}% übereinstimmend`;
  }
  // Fall 2: Hohe Text-Ähnlichkeit mit gleicher Kategorie
  else if (textScore >= 0.70 && categoryMatch) {
    isSimilar = true;
    finalScore = Math.round(textScore * 100);
    reason = `Fragentext zu ${finalScore}% ähnlich in gleicher Kategorie (${q1.category})`;
  }
  // Fall 3: Ähnliche Antworten kombiniert mit mäßiger bis hoher Text-Ähnlichkeit
  else if (optionsScore >= 0.85 && textScore >= 0.45) {
    isSimilar = true;
    finalScore = Math.round((optionsScore * 0.65 + textScore * 0.35) * 100);
    reason = `Antwortoptionen fast identisch (${Math.round(optionsScore * 100)}%) und ähnliche Fragestellung`;
  }
  // Fall 4: Sehr hohe Antwort-Übereinstimmung (z.B. gleiche Fachbegriffe/Auswahl)
  else if (optionsScore >= 0.95 && textScore >= 0.35) {
    isSimilar = true;
    finalScore = Math.round((optionsScore * 0.7 + textScore * 0.3) * 100);
    reason = `Antwortoptionen zu ${Math.round(optionsScore * 100)}% identisch`;
  }
  // Fall 5: Text-Ähnlichkeit ab 72% auch kategorieübergreifend
  else if (textScore >= 0.72) {
    isSimilar = true;
    finalScore = Math.round(textScore * 100);
    reason = `Fragentext zu ${finalScore}% ähnlich`;
  }

  return {
    isSimilar,
    score: finalScore,
    reason,
    textScore: Math.round(textScore * 100),
    optionsScore: Math.round(optionsScore * 100)
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
 * Gibt nach jedem Chunk die Kontrolle an den JS-Event-Loop ab.
 */
export async function findDuplicateQuestionsAsync(
  questions: Question[],
  reviewedKeys: Set<string> = new Set(),
  reviewedIds: Set<string> = new Set(),
  onProgress?: (current: number, total: number) => void
): Promise<DuplicateQuestionPair[]> {
  // 1. Relevante Fragen filtern & Token vorberechnen
  const activeItems: {
    original: Question;
    id: string;
    tokens: string[];
    tokenSet: Set<string>;
    optTokenSet: Set<string>;
    category: string;
  }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q?.id || !q?.text || reviewedIds.has(q.id)) continue;
    
    const tokens = extractTokens(q.text);
    const tokenSet = new Set(tokens);
    const optTokens = (q.options || []).flatMap(o => extractTokens(o));
    const optTokenSet = new Set(optTokens);

    activeItems.push({
      original: q,
      id: q.id,
      tokens,
      tokenSet,
      optTokenSet,
      category: (q.category || '').toLowerCase()
    });
  }

  const n = activeItems.length;
  if (n < 2) return [];

  // 2. Invertierten Token-Index aufbauen: Wort -> Fragen-Indizes
  const tokenToIndices = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    for (const t of activeItems[i].tokenSet) {
      let list = tokenToIndices.get(t);
      if (!list) {
        list = [];
        tokenToIndices.set(t, list);
      }
      list.push(i);
    }
  }

  // 3. Kandidatenpaare anhand gemeinsamer Token ermitteln
  const candidateMap = new Map<number, number>(); // Hash -> Anzahl gemeinsamer Tokens
  for (const [token, indices] of tokenToIndices.entries()) {
    if (indices.length < 2) continue;
    // Zu häufige Allerweltswörter (in >22% aller Fragen) ignorieren
    if (indices.length > n * 0.22) continue;

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];
      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const hash = idxA < idxB ? idxA * 1000000 + idxB : idxB * 1000000 + idxA;
        candidateMap.set(hash, (candidateMap.get(hash) || 0) + 1);
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

    const [hash, sharedCount] = entries[c];
    const idxA = Math.floor(hash / 1000000);
    const idxB = hash % 1000000;
    const itemA = activeItems[idxA];
    const itemB = activeItems[idxB];

    // Bei längeren Fragen müssen mindestens 2 signifikante Wörter übereinstimmen
    const minTokens = Math.min(itemA.tokens.length, itemB.tokens.length);
    if (minTokens >= 3 && sharedCount < 2) continue;

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
        categoryMatch: itemA.category === itemB.category
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
    tokens: string[];
    tokenSet: Set<string>;
    optTokenSet: Set<string>;
    category: string;
  }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q?.id || !q?.text || reviewedIds.has(q.id)) continue;
    
    const tokens = extractTokens(q.text);
    const tokenSet = new Set(tokens);
    const optTokens = (q.options || []).flatMap(o => extractTokens(o));
    const optTokenSet = new Set(optTokens);

    activeItems.push({
      original: q,
      id: q.id,
      tokens,
      tokenSet,
      optTokenSet,
      category: (q.category || '').toLowerCase()
    });
  }

  const n = activeItems.length;
  if (n < 2) return [];

  const tokenToIndices = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    for (const t of activeItems[i].tokenSet) {
      let list = tokenToIndices.get(t);
      if (!list) {
        list = [];
        tokenToIndices.set(t, list);
      }
      list.push(i);
    }
  }

  const candidateMap = new Map<number, number>();
  for (const [token, indices] of tokenToIndices.entries()) {
    if (indices.length < 2) continue;
    if (indices.length > n * 0.22) continue;

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];
      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const hash = idxA < idxB ? idxA * 1000000 + idxB : idxB * 1000000 + idxA;
        candidateMap.set(hash, (candidateMap.get(hash) || 0) + 1);
      }
    }
  }

  const pairs: DuplicateQuestionPair[] = [];
  for (const [hash, sharedCount] of candidateMap.entries()) {
    const idxA = Math.floor(hash / 1000000);
    const idxB = hash % 1000000;
    const itemA = activeItems[idxA];
    const itemB = activeItems[idxB];

    const minTokens = Math.min(itemA.tokens.length, itemB.tokens.length);
    if (minTokens >= 3 && sharedCount < 2) continue;

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
        categoryMatch: itemA.category === itemB.category
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
 * Überspringt irrelevante Fragen via Token-Matching blitzschnell.
 */
export function findSimilarQuestionForInput(
  text: string,
  options: string[],
  existingQuestions: Question[],
  excludeId?: string | null
): { question: Question; score: number; reason: string } | null {
  const cleanText = text.trim();
  if (cleanText.length < 5) return null;

  const inputTokens = extractTokens(cleanText);
  if (inputTokens.length === 0) return null;
  const inputTokenSet = new Set(inputTokens);

  let bestMatch: { question: Question; score: number; reason: string } | null = null;
  const draft: Partial<Question> = {
    text: cleanText,
    options: options.filter(o => o.trim().length > 0)
  };

  for (const existing of existingQuestions) {
    if (excludeId && existing.id === excludeId) continue;
    if (!existing?.text) continue;

    // Vorfilter: Hat die bestehende Frage überhaupt gemeinsame Wörter?
    const existTokens = extractTokens(existing.text);
    let hasSharedToken = false;
    for (const t of existTokens) {
      if (inputTokenSet.has(t)) {
        hasSharedToken = true;
        break;
      }
    }
    if (!hasSharedToken && cleanText.length > 15) continue;

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
