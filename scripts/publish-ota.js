/**
 * EAS OTA Update Publisher with Real-Time Percentage Progress
 * Usage: node scripts/publish-ota.js --branch production --message "Update Nachricht"
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
let branch = 'production';
let message = 'OTA Update';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--branch' && args[i + 1]) {
    branch = args[i + 1];
    i++;
  } else if (args[i] === '--message' && args[i + 1]) {
    message = args[i + 1];
    i++;
  }
}

console.log(`\n========================================`);
console.log(`🚀 Starte OTA-Update für Branch: [${branch}]`);
console.log(`📝 Nachricht: "${message}"`);
console.log(`========================================\n`);
console.log(`[0%] Initialisiere EAS Build-Umgebung...`);

const env = {
  ...process.env,
  EAS_NO_VCS: '1',
  EAS_SKIP_AUTO_FINGERPRINT: '1',
  CI: '1',
};

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(
  cmd,
  [
    'eas-cli',
    'update',
    '--branch',
    branch,
    '--environment',
    branch,
    '--message',
    `"${message.replace(/"/g, '')}"`,
    '--non-interactive',
  ],
  {
    cwd: path.resolve(__dirname, '..'),
    env,
    shell: true,
  }
);

let currentPercent = 0;

function reportProgress(pct, msg) {
  if (pct > currentPercent) {
    currentPercent = pct;
    console.log(`[${currentPercent}%] ${msg}`);
  }
}

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);

  if (text.includes('Exporting') || text.includes('Starting Metro Bundler')) {
    reportProgress(15, 'Metro Bundler gestartet, erstelle App-Module...');
  } else if (text.includes('iOS Bundled')) {
    reportProgress(40, 'iOS Bundle erfolgreich erstellt.');
  } else if (text.includes('Android Bundled')) {
    reportProgress(65, 'Android Bundle erfolgreich erstellt.');
  } else if (text.includes('Static rendering') || text.includes('Web Bundled') || text.includes('Exported bundle')) {
    reportProgress(78, 'Statische Routen und Web-Bundle exportiert.');
  } else if (text.includes('Uploading')) {
    reportProgress(88, 'Lade App-Bundles und Assets hoch zu EAS...');
  } else if (text.includes('Publishing')) {
    reportProgress(95, 'Veröffentliche Update auf den Expo CDN Servern...');
  } else if (text.includes('Published!')) {
    reportProgress(100, 'Update erfolgreich veröffentlicht und live!');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  if (code === 0) {
    reportProgress(100, `Fertig! OTA Update für [${branch}] zu 100% abgeschlossen.`);
    console.log(`\n✅ Erfolgreich: Das Update ist nun für alle Geräte auf [${branch}] verfügbar.\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ Fehler: EAS Update beendet mit Exit-Code ${code}`);
    process.exit(code || 1);
  }
});
