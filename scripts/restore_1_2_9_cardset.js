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

// 1. Load cleaned 1.2.9 flashcards
const cleanedPath = path.join(__dirname, '..', 'data', 'generated', 'cleaned_1_2_9_flashcards.json');
const flashcards = JSON.parse(fs.readFileSync(cleanedPath, 'utf8'));

// 2. Load questions from 1.2.9 backup
const backupPath = path.join(__dirname, '..', 'data', 'generated', 'supabase_backup_before_sync_1793230156418.json');
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const questions = backup.quiz_questions || [];

console.log(`Ready to restore 1.2.9 dataset:`);
console.log(`- Flashcards: ${flashcards.length}`);
console.log(`- Quiz Questions: ${questions.length}`);

// Duplicate text-only IDs to delete from Supabase
const duplicateTextIds = [
  'f_sig_hp0',
  'f_sig_hp1',
  'f_sig_hp2',
  'f_sig_ks1',
  'f_sig_ks2',
  'f_sig_zs1',
  'f_sig_zs3',
  'f_sig_zs6',
  'f_sig_zs7',
  'f_sig_zs8',
  'f_sig_zs10',
  'f_sig_zs12',
  'f_sig_zs13',
  'f_sig_wn1',
  'f_sig_wn2',
  'f_sig_wn7',
  'f_sig_ne1',
  'f_sig_ne2',
  'f_sig_ne3',
  'f_sig_ne4',
  'f_sig_ne5',
  'f_sig_ne6'
];

async function run() {
  console.log('\n--- 1. Deleting duplicate photo-less cards from Supabase ---');
  for (const id of duplicateTextIds) {
    const { error } = await client.from('flashcards').delete().eq('id', id);
    if (error) {
      console.warn(`Could not delete ${id}:`, error.message);
    }
  }
  console.log(`Deleted ${duplicateTextIds.length} duplicate text IDs.`);

  console.log('\n--- 2. Upserting 1.2.9 Flashcards to Supabase ---');
  const BATCH_SIZE = 25;
  for (let i = 0; i < flashcards.length; i += BATCH_SIZE) {
    const batch = flashcards.slice(i, i + BATCH_SIZE).map(f => {
      const referenceWithMeta = packFactMetadata(f);
      return {
        id: f.id,
        category: f.category,
        title: f.title,
        content: f.content,
        reference: referenceWithMeta,
        image_url: f.image_url || null,
        is_verified: true
      };
    });

    const { error } = await client.from('flashcards').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error in flashcards batch ${i}-${i + batch.length}:`, error);
    } else {
      process.stdout.write(`Flashcards: ${Math.min(i + BATCH_SIZE, flashcards.length)} / ${flashcards.length}\r`);
    }
  }
  console.log(`\nFlashcards upsert complete!`);

  console.log('\n--- 3. Upserting 1.2.9 Quiz Questions to Supabase ---');
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE).map(q => {
      let cat = q.category || 'Allgemein';
      if (cat.toLowerCase().includes('wagenpr') || cat === 'wagenprÃ¼fung') {
        cat = 'Wagenprüfung';
      }
      return {
        id: q.id,
        category: cat,
        text: q.text,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        image_url: q.image_url || null,
        is_verified: true,
        danger_indices: q.danger_indices || []
      };
    });

    let { error } = await client.from('quiz_questions').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error in questions batch ${i}-${i + batch.length}:`, error);
    } else {
      process.stdout.write(`Questions: ${Math.min(i + BATCH_SIZE, questions.length)} / ${questions.length}\r`);
    }
  }
  console.log(`\nQuestions upsert complete!`);

  console.log('\n--- 4. Verification from Supabase ---');
  const { data: remoteCards, error: fcErr } = await client.from('flashcards').select('id, category, title, image_url');
  if (fcErr) throw fcErr;

  const { data: remoteQuestions, error: qErr } = await client.from('quiz_questions').select('id');
  if (qErr) throw qErr;

  const remoteSignals = remoteCards.filter(c => c.category === 'Signale');
  const remoteSignalsWithImg = remoteSignals.filter(c => !!c.image_url);
  const remoteSignalsWithPrefix = remoteSignals.filter(c => /^Signale?\s+/i.test(c.title));

  console.log(`Remote total flashcards: ${remoteCards.length}`);
  console.log(`Remote total questions: ${remoteQuestions.length}`);
  console.log(`Remote Signale cards: ${remoteSignals.length}`);
  console.log(`Remote Signale with photos: ${remoteSignalsWithImg.length}`);
  console.log(`Remote Signale starting with 'Signal': ${remoteSignalsWithPrefix.length}`);

  if (remoteSignalsWithPrefix.length > 0) {
    console.warn(`WARNING: Some cards still start with 'Signal':`);
    remoteSignalsWithPrefix.slice(0, 5).forEach(c => console.warn(` - ${c.title}`));
  } else {
    console.log(`SUCCESS: 0 cards start with 'Signal'! All signals are correctly named without prefix.`);
  }
}

run().catch(err => {
  console.error('Fatal error during restore:', err);
  process.exit(1);
});
