/**
 * EAS OTA Update Publisher with Automatic Version Increment (+1) & Real-Time Progress
 * Usage: node scripts/publish-ota.js [--branch production] [--message "Update Nachricht"] [--no-bump]
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
let branch = 'production';
let customMessage = null;
let autoBump = true;
let specifiedVersion = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--branch' && args[i + 1]) {
    branch = args[i + 1];
    i++;
  } else if (args[i] === '--channel' && args[i + 1]) {
    branch = args[i + 1];
    i++;
  } else if (args[i] === '--message' && args[i + 1]) {
    customMessage = args[i + 1];
    i++;
  } else if (args[i] === '--version' && args[i + 1]) {
    specifiedVersion = args[i + 1];
    autoBump = false;
    i++;
  } else if (args[i] === '--no-bump') {
    autoBump = false;
  }
}

// 1. Automatische Versionserhöhung (+1 Patch)
const appJsonPath = path.resolve(__dirname, '../app.json');
const packageJsonPath = path.resolve(__dirname, '../package.json');

let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

let currentVersion = appJson.expo?.version || packageJson.version || '1.0.0';
let newVersion = specifiedVersion || currentVersion;

if (autoBump) {
  const parts = currentVersion.split('.');
  const lastIndex = parts.length - 1;
  parts[lastIndex] = String((parseInt(parts[lastIndex], 10) || 0) + 1);
  newVersion = parts.join('.');
}

if (newVersion !== currentVersion) {
  console.log(`\n📦 Versionsnummer: ${currentVersion} ➔ ${newVersion}`);

  if (appJson.expo) {
    appJson.expo.version = newVersion;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
  }

  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

  // Git Commit & Push für saubere Versionshistorie
  try {
    const gitStatus = execSync('git status --porcelain app.json package.json', { encoding: 'utf8' });
    if (gitStatus.trim().length > 0) {
      console.log(`🔄 Erstelle Git-Commit für Version ${newVersion}...`);
      execSync('git add app.json package.json', { stdio: 'ignore' });
      execSync(`git commit -m "chore(ota): bump version to ${newVersion}"`, { stdio: 'ignore' });
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      execSync(`git push origin ${currentBranch}`, { stdio: 'ignore' });
      console.log(`✅ Version ${newVersion} nach origin/${currentBranch} gepusht.`);
    }
  } catch (gitErr) {
    console.log(`ℹ️ Git Auto-Commit Hinweis: ${gitErr.message || 'übersprungen'}`);
  }
}

const message = customMessage
  ? `v${newVersion}: ${customMessage}`
  : `v${newVersion}: OTA Update`;

console.log(`\n========================================`);
console.log(`🚀 Starte OTA-Update für Channel/Branch: [${branch}]`);
console.log(`📱 App-Version: v${newVersion}`);
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
    '--channel',
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
    console.log(`\n✅ Erfolgreich: Das Update v${newVersion} ist nun für alle Geräte auf [${branch}] verfügbar.\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ Fehler: EAS Update beendet mit Exit-Code ${code}`);
    process.exit(code || 1);
  }
});
