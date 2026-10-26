import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';

export interface AppStoreUpdateInfo {
  isAvailable: boolean;
  currentVersion: string;
  storeVersion: string;
  storeName: string;
  storeUrl: string;
}

/**
 * Vergleicht zwei semantische Versionsnummern (z. B. '1.2.3' vs. '1.2.0').
 * Gibt true zurück, wenn remoteVersion strikt neuer ist als currentVersion.
 */
export function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
  if (!remoteVersion || !currentVersion) return false;

  const parseParts = (v: string): number[] =>
    v
      .replace(/^v/i, '')
      .split(/[-+]/)[0]
      .split('.')
      .map(part => parseInt(part, 10) || 0);

  const remote = parseParts(remoteVersion);
  const current = parseParts(currentVersion);

  const len = Math.max(remote.length, current.length);
  for (let i = 0; i < len; i++) {
    const r = remote[i] || 0;
    const c = current[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

/**
 * Parst die aktuelle Versionsnummer aus der Google Play Store HTML-Seite.
 */
function extractPlayStoreVersion(html: string): string | null {
  // Strategie 1: [[[ "X.Y.Z" ]]] im AF_initDataCallback (Google Play Store Standard)
  const m1 = html.match(/\[\[\[\"(\d+\.\d+(?:\.\d+)?)\"\]\]/);
  if (m1) return m1[1];

  // Strategie 2: itemprop="softwareVersion"
  const m2 = html.match(/itemprop=[\"']softwareVersion[\"'][^>]*>([^<]+)</i);
  if (m2) return m2[1].trim();

  // Strategie 3: "softwareVersion":"X.Y.Z"
  const m3 = html.match(/\"softwareVersion\"\s*:\s*\"([^\"]+)\"/i);
  if (m3) return m3[1].trim();

  // Strategie 4: 'Aktuelle Version' Textsuche
  const m4 = html.match(/(?:Aktuelle Version|Current Version)[^<]*<[^>]*>([^<]+)</i);
  if (m4) return m4[1].trim();

  return null;
}

/**
 * Prüft automatisch im Google Play Store (Android) oder Apple App Store (iOS),
 * ob eine neuere Version der App als die aktuell installierte verfügbar ist.
 */
export async function checkAppStoreUpdate(): Promise<AppStoreUpdateInfo | null> {
  // Web hat keinen Store-Update-Mechanismus (wird direkt per CI/CD aktualisiert)
  if (Platform.OS === 'web') {
    return null;
  }

  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  console.log('[appStoreUpdateService] Starte Prüfung. OS:', Platform.OS, 'currentVersion:', currentVersion);

  try {
    if (Platform.OS === 'android') {
      const packageName = Constants.expoConfig?.android?.package || 'com.railtrainer';
      const playStoreWebUrl = `https://play.google.com/store/apps/details?id=${packageName}&hl=de`;
      const playStoreMarketUrl = `market://details?id=${packageName}`;
      console.log('[appStoreUpdateService] Rufe Play Store ab:', playStoreWebUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(playStoreWebUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'de-DE,de;q=0.9',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log('[appStoreUpdateService] Play Store HTTP Status:', response.status);
      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const storeVersion = extractPlayStoreVersion(html);
      const isNewer = storeVersion ? isNewerVersion(storeVersion, currentVersion) : false;
      console.log('[appStoreUpdateService] Gefundene Store-Version:', storeVersion, 'isNewer:', isNewer);

      if (storeVersion && isNewer) {
        return {
          isAvailable: true,
          currentVersion,
          storeVersion,
          storeName: 'Google Play Store',
          storeUrl: playStoreMarketUrl,
        };
      }

      return {
        isAvailable: false,
        currentVersion,
        storeVersion: storeVersion || currentVersion,
        storeName: 'Google Play Store',
        storeUrl: playStoreMarketUrl,
      };
    }

    if (Platform.OS === 'ios') {
      const bundleId = Constants.expoConfig?.ios?.bundleIdentifier || 'com.railtrainer';
      const itunesUrl = `https://itunes.apple.com/lookup?bundleId=${bundleId}&country=de`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(itunesUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data && data.resultCount > 0 && data.results?.[0]) {
        const item = data.results[0];
        const storeVersion = item.version;
        const storeUrl = item.trackViewUrl || `https://apps.apple.com/app/id${item.trackId}`;
        const isNewer = storeVersion ? isNewerVersion(storeVersion, currentVersion) : false;

        if (storeVersion && isNewer) {
          return {
            isAvailable: true,
            currentVersion,
            storeVersion,
            storeName: 'Apple App Store',
            storeUrl,
          };
        }

        return {
          isAvailable: false,
          currentVersion,
          storeVersion: storeVersion || currentVersion,
          storeName: 'Apple App Store',
          storeUrl,
        };
      }

      return null;
    }
  } catch (err) {
    // Fehler bei der Update-Prüfung (z. B. offline) lautlos abfangen
    console.log('[appStoreUpdateService] Update-Prüfung beendet (offline oder Fehler):', err);
  }

  return null;
}

/**
 * Öffnet den jeweiligen Store (Play Store oder App Store).
 */
export async function openAppStore(storeUrl: string): Promise<void> {
  if (!storeUrl) return;

  try {
    const canOpen = await Linking.canOpenURL(storeUrl);
    if (canOpen) {
      await Linking.openURL(storeUrl);
      return;
    }
  } catch {
    // Fallback wird versucht
  }

  // Fallback: Wenn z. B. market:// auf Android fehlschlägt, https:// im Browser öffnen
  if (storeUrl.startsWith('market://details?id=')) {
    const webFallback = storeUrl.replace('market://details?id=', 'https://play.google.com/store/apps/details?id=');
    try {
      await Linking.openURL(webFallback);
    } catch (e) {
      console.warn('[appStoreUpdateService] Konnte Store-URL auch per Fallback nicht öffnen:', e);
    }
  }
}
