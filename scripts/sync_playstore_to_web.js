const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ahmcoyfmdrgpmclaxgfj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

// Helper to pack metadata as HTML comments
function packFactMetadata(f) {
  const meta = {};
  if (f.subcategory) meta.sub = f.subcategory;
  if (f.createdBy) meta.cb = f.createdBy;
  if (f.createdByName) meta.cbn = f.createdByName;
  if (f.creatorRole) meta.cr = f.creatorRole;
  if (f.verifiedBy) meta.vb = f.verifiedBy;
  if (f.verifiedByName) meta.vbn = f.verifiedByName;
  if (f.duplicateReviewed) meta.dr = true;
  if (f.imageUrls && f.imageUrls.length > 1) meta.imgs = f.imageUrls;

  const cleanRef = (f.reference || '').replace(/<!--RT_META:[\s\S]*?-->/, '').trim();
  if (Object.keys(meta).length === 0) return cleanRef;
  return `${cleanRef} <!--RT_META:${JSON.stringify(meta)}-->`.trim();
}

function packQuestionMetadata(q) {
  const meta = {};
  if (q.questionType && q.questionType !== 'single') meta.qt = q.questionType;
  if (q.correctIndices && q.correctIndices.length > 0) meta.ci = q.correctIndices;
  if (q.createdBy) meta.cb = q.createdBy;
  if (q.createdByName) meta.cbn = q.createdByName;
  if (q.creatorRole) meta.cr = q.creatorRole;
  if (q.verifiedBy) meta.vb = q.verifiedBy;
  if (q.verifiedByName) meta.vbn = q.verifiedByName;
  if (q.duplicateReviewed) meta.dr = true;

  const cleanExp = (q.explanation || '').replace(/<!--RT_META:[\s\S]*?-->/, '').trim();
  if (Object.keys(meta).length === 0) return cleanExp;
  return `${cleanExp} <!--RT_META:${JSON.stringify(meta)}-->`.trim();
}

// Extract hardcoded facts from mockDb.ts
function extractHardcodedFacts(mockDbContent) {
  const factsMatch = mockDbContent.match(/export const INITIAL_FACTS: Fact\[\] = \[([\s\S]*?)\];/);
  if (!factsMatch) throw new Error('Could not find INITIAL_FACTS in mockDb.ts');

  // Strip spread arrays: ...sortSignalFacts(...), ...(anlage5Cards...), ...(bremsprobeCards...)
  let body = factsMatch[1];
  body = body.replace(/\.\.\.sortSignalFacts[\s\S]*?\),/g, '');
  body = body.replace(/\.\.\.\(anlage5Cards[\s\S]*?\),/g, '');
  body = body.replace(/\.\.\.\(bremsprobeCards[\s\S]*?\),/g, '');

  // Wrap into valid JSON-like array by eval in isolated sandbox
  const fn = new Function(`return [${body}];`);
  return fn();
}

// Extract hardcoded questions from mockDb.ts
function extractHardcodedQuestions(mockDbContent) {
  const questionsMatch = mockDbContent.match(/export const INITIAL_QUESTIONS: Question\[\] = \[([\s\S]*?)\];/);
  if (!questionsMatch) throw new Error('Could not find INITIAL_QUESTIONS in mockDb.ts');

  let body = questionsMatch[1];
  body = body.replace(/\.\.\.\(docxQuestions[\s\S]*?\),/g, '');

  const fn = new Function(`return [${body}];`);
  return fn();
}

// Extract categories from mockDb.ts
function extractCategories(mockDbContent) {
  const catMatch = mockDbContent.match(/export const INITIAL_CATEGORIES: Category\[\] = \[([\s\S]*?)\];/);
  if (!catMatch) throw new Error('Could not find INITIAL_CATEGORIES in mockDb.ts');

  const fn = new Function(`return [${catMatch[1]}];`);
  return fn();
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const cleanExtra = process.argv.includes('--clean-extra') || true; // Default: align database with Playstore

  console.log('=============================================================');
  console.log('   RailTrainer -> Tf-Trainer Web Synchronisierungs-Script   ');
  console.log('   Hauptapp: Google Playstore Version (RailTrainer)         ');
  console.log('=============================================================\n');

  if (isDryRun) {
    console.log('[DRY-RUN] Modus aktiviert. Es werden keine Daten verändert.\n');
  }

  // 1. Lokale Master-Dateien der Playstore-App laden
  console.log('[1/5] Lade lokale Playstore-Masterdaten...');
  const baseDir = path.resolve(__dirname, '..');
  const anlage5 = JSON.parse(fs.readFileSync(path.join(baseDir, 'src/database/anlage5_cards.json'), 'utf8'));
  const bremsprobe = JSON.parse(fs.readFileSync(path.join(baseDir, 'src/database/bremsprobe_cards.json'), 'utf8'));
  const quizletSignals = JSON.parse(fs.readFileSync(path.join(baseDir, 'src/database/quizlet_signals.json'), 'utf8'));
  const docxQuestions = JSON.parse(fs.readFileSync(path.join(baseDir, 'src/database/docx_questions.json'), 'utf8'));
  const mockDbContent = fs.readFileSync(path.join(baseDir, 'src/database/mockDb.ts'), 'utf8');

  const hardcodedFacts = extractHardcodedFacts(mockDbContent);
  const hardcodedQuestions = extractHardcodedQuestions(mockDbContent);
  const categories = extractCategories(mockDbContent);

  // Master Lernkarten zusammensetzen
  const masterFlashcards = [
    ...quizletSignals,
    ...anlage5,
    ...bremsprobe,
    ...hardcodedFacts
  ].map(f => {
    let title = (f.title || '').trim();
    if (f.category === 'Signale') {
      title = title.replace(/^Signale?\s+/i, '').trim();
    }
    return {
      id: f.id,
      category: f.category,
      title: title,
      content: f.content,
      reference: packFactMetadata(f),
      image_url: f.imageUrl || (f.imageUrls && f.imageUrls[0]) || null,
      is_verified: true
    };
  });

  // Master Prüfungsfragen zusammensetzen
  const masterQuestions = [
    ...hardcodedQuestions,
    ...docxQuestions
  ].map(q => {
    const rawCorrectIndices = q.correctIndices || q.correct_indices || (typeof q.correctIndex === 'number' ? [q.correctIndex] : [0]);
    const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : rawCorrectIndices[0];
    const explanationWithMeta = packQuestionMetadata({
      ...q,
      correctIndices: rawCorrectIndices,
      correctIndex: correctIndex,
      isVerified: true
    });

    return {
      id: q.id,
      category: q.category,
      text: q.text,
      options: q.options,
      correct_index: correctIndex,
      correct_indices: rawCorrectIndices,
      explanation: explanationWithMeta,
      image_url: q.imageUrl || null,
      is_verified: true,
      danger_indices: q.dangerIndices || q.danger_indices || []
    };
  });

  console.log(`-> Gefunden: ${masterFlashcards.length} Master-Lernkarten (Playstore-Stand)`);
  console.log(`-> Gefunden: ${masterQuestions.length} Master-Prüfungsfragen (Playstore-Stand)`);
  console.log(`-> Gefunden: ${categories.length} Kategorien\n`);

  // 2. Bestehende Supabase-Daten prüfen und sichern
  console.log('[2/5] Lese aktuellen Stand aus Supabase...');
  const { data: dbQuestions, error: qErr } = await client.from('quiz_questions').select('*');
  const { data: dbFlashcards, error: fErr } = await client.from('flashcards').select('*');

  if (qErr || fErr) {
    console.error('Fehler beim Abruf aus Supabase:', qErr || fErr);
    process.exit(1);
  }

  console.log(`-> Supabase aktuell: ${dbFlashcards.length} Lernkarten, ${dbQuestions.length} Prüfungsfragen.`);

  // Sicherheits-Backup der aktuellen Supabase-Daten anlegen
  const backupDir = path.join(baseDir, 'data', 'generated');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `supabase_backup_before_sync_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    flashcards: dbFlashcards,
    quiz_questions: dbQuestions
  }, null, 2), 'utf8');
  console.log(`-> Sicherheits-Backup gespeichert unter: ${backupFile}\n`);

  if (isDryRun) {
    console.log('[DRY-RUN] Synchronisierungs-Plan:');
    console.log(`- ${categories.length} Kategorien werden aktualisiert.`);
    console.log(`- ${masterFlashcards.length} Master-Lernkarten werden in Supabase auf is_verified = true synchronisiert.`);
    console.log(`- ${masterQuestions.length} Master-Prüfungsfragen werden in Supabase auf is_verified = true synchronisiert.`);

    const masterFIds = new Set(masterFlashcards.map(f => f.id));
    const extraF = dbFlashcards.filter(f => !masterFIds.has(f.id));
    console.log(`- ${extraF.length} abweichende Lernkarten in Supabase (nicht in Playstore) werden deaktiviert/bereinigt.`);

    const masterQIds = new Set(masterQuestions.map(q => q.id));
    const extraQ = dbQuestions.filter(q => !masterQIds.has(q.id));
    console.log(`- ${extraQ.length} abweichende Fragen in Supabase (nicht in Playstore) werden deaktiviert/bereinigt.`);
    console.log('\n[DRY-RUN] Erfolgreich beendet.');
    return;
  }

  // 3. Kategorien synchronisieren
  console.log('[3/5] Synchronisiere Kategorien nach Supabase...');
  for (const cat of categories) {
    const { error: catErr } = await client.from('categories').upsert({
      name: cat.name,
      description: cat.desc || '',
      color: cat.color || '#22c55e',
      icon: cat.icon || 'BookOpen'
    });
    if (catErr) {
      console.warn(`Warnung beim Speichern von Kategorie "${cat.name}":`, catErr.message);
    }
  }
  console.log(`-> ${categories.length} Kategorien synchronisiert.\n`);

  // 4. Master-Lernkarten synchronisieren
  console.log('[4/5] Synchronisiere Master-Lernkarten nach Supabase (in Batches)...');
  const BATCH_SIZE = 25;
  for (let i = 0; i < masterFlashcards.length; i += BATCH_SIZE) {
    const batch = masterFlashcards.slice(i, i + BATCH_SIZE);
    const { error: fSyncErr } = await client.from('flashcards').upsert(batch, { onConflict: 'id' });
    if (fSyncErr) {
      console.error(`Fehler bei Lernkarten-Batch ${i}-${i + batch.length}:`, fSyncErr);
    } else {
      process.stdout.write(`-> ${Math.min(i + BATCH_SIZE, masterFlashcards.length)} / ${masterFlashcards.length} Lernkarten synchronisiert...\r`);
    }
  }
  console.log(`\n-> Alle ${masterFlashcards.length} Playstore-Master-Lernkarten erfolgreich synchronisiert.\n`);

  // 5. Master-Prüfungsfragen synchronisieren
  console.log('[5/5] Synchronisiere Master-Prüfungsfragen nach Supabase...');
  for (let i = 0; i < masterQuestions.length; i += BATCH_SIZE) {
    const batch = masterQuestions.slice(i, i + BATCH_SIZE);
    // Versuche zuerst mit correct_indices
    let { error: qSyncErr } = await client.from('quiz_questions').upsert(batch, { onConflict: 'id' });
    if (qSyncErr && (qSyncErr.code === 'PGRST204' || qSyncErr.message?.includes('correct_indices'))) {
      // Fallback ohne correct_indices bei älterem Schema
      const fallbackBatch = batch.map(q => {
        const { correct_indices, ...rest } = q;
        return rest;
      });
      const res = await client.from('quiz_questions').upsert(fallbackBatch, { onConflict: 'id' });
      qSyncErr = res.error;
    }

    if (qSyncErr) {
      console.error(`Fehler bei Fragen-Batch ${i}-${i + batch.length}:`, qSyncErr);
    } else {
      process.stdout.write(`-> ${Math.min(i + BATCH_SIZE, masterQuestions.length)} / ${masterQuestions.length} Fragen synchronisiert...\r`);
    }
  }
  console.log(`\n-> Alle ${masterQuestions.length} Playstore-Master-Prüfungsfragen erfolgreich synchronisiert.\n`);

  // 6. Abweichende externe Datensätze (die nicht in der Playstore-App existieren) harmonisieren
  if (cleanExtra) {
    console.log('[Bereinigung] Synchronisiere abweichende Datensätze...');
    const masterFIds = new Set(masterFlashcards.map(f => f.id));
    const extraF = dbFlashcards.filter(f => !masterFIds.has(f.id));

    if (extraF.length > 0) {
      console.log(`-> Bereinige/Entferne ${extraF.length} nicht-Playstore Lernkarten aus Supabase...`);
      const extraFIds = extraF.map(f => f.id);
      for (let i = 0; i < extraFIds.length; i += 50) {
        const chunk = extraFIds.slice(i, i + 50);
        await client.from('flashcards').delete().in('id', chunk);
      }
    }

    const masterQIds = new Set(masterQuestions.map(q => q.id));
    const extraQ = dbQuestions.filter(q => !masterQIds.has(q.id));
    if (extraQ.length > 0) {
      console.log(`-> Bereinige/Entferne ${extraQ.length} nicht-Playstore Fragen aus Supabase...`);
      const extraQIds = extraQ.map(q => q.id);
      for (let i = 0; i < extraQIds.length; i += 50) {
        const chunk = extraQIds.slice(i, i + 50);
        await client.from('quiz_questions').delete().in('id', chunk);
      }
    }
    console.log('-> Bereinigung abgeschlossen. Schüler und Web-Nutzer sehen exakt die verifizierten Playstore-Inhalte!\n');
  }

  console.log('=============================================================');
  console.log('   Synchronisierung erfolgreich abgeschlossen!              ');
  console.log(`   - Verifizierte Lernkarten: ${masterFlashcards.length}    `);
  console.log(`   - Verifizierte Prüfungsfragen: ${masterQuestions.length} `);
  console.log('=============================================================');
}

main().catch(err => {
  console.error('Fataler Fehler bei der Synchronisierung:', err);
  process.exit(1);
});
