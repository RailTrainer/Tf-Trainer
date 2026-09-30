const https = require('https');
const fs = require('fs');

const KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';

function packFactMetadata(f) {
  const meta = {
    cb: 'buffl_import',
    cbn: 'Buffl Community',
    cr: 'moderator'
  };
  const cleanRef = (f.reference || '').trim();
  return `${cleanRef} <!--RT_META:${JSON.stringify(meta)}-->`.trim();
}

const prepared = JSON.parse(fs.readFileSync(
  'C:\\Users\\schmi\\.gemini\\antigravity\\brain\\06f6b947-119d-48bd-9fa3-89b6ed234993\\scratch\\prepared_anlage5.json',
  'utf8'
));

const records = prepared.map(c => ({
  id: c.id,
  category: 'Anlage 5',
  title: c.title,
  content: c.content,
  reference: packFactMetadata(c),
  image_url: c.imageUrl,
  is_verified: false
}));

function postBatch(batch) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(batch);
    const req = https.request({
      hostname: 'ahmcoyfmdrgpmclaxgfj.supabase.co',
      path: '/rest/v1/flashcards',
      method: 'POST',
      headers: {
        'apikey': KEY,
        'Authorization': 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, count: batch.length });
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`Starting upload of ${records.length} cards for Anlage 5 in chunks...`);
  const chunkSize = 30;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const res = await postBatch(chunk);
    console.log(`Uploaded chunk ${Math.floor(i / chunkSize) + 1} (${chunk.length} cards): Status ${res.status}`);
  }

  console.log('All chunks uploaded! Verifying in Supabase...');

  https.get({
    hostname: 'ahmcoyfmdrgpmclaxgfj.supabase.co',
    path: '/rest/v1/flashcards?category=eq.Anlage%205&select=id,title,is_verified',
    headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
  }, res2 => {
    let d = '';
    res2.on('data', c => d += c);
    res2.on('end', () => {
      const rows = JSON.parse(d);
      console.log(`TOTAL 'Anlage 5' CARDS IN SUPABASE: ${rows.length}`);
      const unverified = rows.filter(r => !r.is_verified);
      const verified = rows.filter(r => r.is_verified);
      console.log(`- Geprüft: ${verified.length}`);
      console.log(`- Ungeprüft: ${unverified.length}`);
    });
  });
}

main().catch(console.error);
