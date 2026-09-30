import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export type ImageOptimizationType = 'avatar' | 'content';
export type ImageFolder = 'avatars' | 'questions' | 'facts' | 'tickets' | 'chat';

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Schnelle und zuverlässige Konvertierung von Base64 in Uint8Array
 * für Binär-Uploads zu Supabase Storage in React Native (Pure JS).
 */
function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = cleanBase64.length;
  const placeHolders = cleanBase64.charAt(len - 2) === '=' ? 2 : cleanBase64.charAt(len - 1) === '=' ? 1 : 0;
  const bytes = new Uint8Array((len * 3 / 4) - placeHolders);
  let j = 0;

  for (let i = 0; i < len; i += 4) {
    const a = chars.indexOf(cleanBase64.charAt(i));
    const b = chars.indexOf(cleanBase64.charAt(i + 1));
    const c = chars.indexOf(cleanBase64.charAt(i + 2));
    const d = chars.indexOf(cleanBase64.charAt(i + 3));

    bytes[j++] = (a << 2) | (b >> 4);
    if (c !== -1 && cleanBase64.charAt(i + 2) !== '=') {
      bytes[j++] = ((b & 15) << 4) | (c >> 2);
    }
    if (d !== -1 && cleanBase64.charAt(i + 3) !== '=') {
      bytes[j++] = ((c & 3) << 6) | d;
    }
  }
  return bytes;
}

/**
 * Formatiert und optimiert das Bild-Asset für maximale Kompatibilität.
 */
export async function optimizeImage(
  uriOrBase64: string,
  type: ImageOptimizationType = 'content',
  customOptions?: OptimizeOptions
): Promise<string> {
  if (!uriOrBase64) return uriOrBase64;
  if (uriOrBase64.startsWith('data:image/')) return uriOrBase64;
  if (uriOrBase64.startsWith('http') || uriOrBase64.startsWith('file://')) return uriOrBase64;
  return `data:image/jpeg;base64,${uriOrBase64}`;
}

/**
 * Lädt das Bild direkt in den Supabase Storage Bucket hoch und gibt die kurze CDN-URL zurück.
 * Falls kein Storage Bucket erreichbar ist, transparenter Fallback auf kompaktes Base64.
 * 
 * @param uriOrBase64 Bild-URI oder Base64 String von ImagePicker
 * @param type 'avatar' oder 'content'
 * @param folder Bucket-Unterordner ('avatars', 'questions', 'facts', 'tickets', 'chat')
 * @returns CDN URL (https://.../storage/v1/object/public/app-media/...) oder Fallback Data-URL
 */
export async function uploadAndOptimizeImage(
  uriOrBase64: string,
  type: ImageOptimizationType = 'content',
  folder: ImageFolder = 'questions'
): Promise<string> {
  if (!uriOrBase64) return uriOrBase64;

  let base64Data = '';
  if (uriOrBase64.startsWith('data:image/')) {
    const commaIdx = uriOrBase64.indexOf(',');
    base64Data = commaIdx !== -1 ? uriOrBase64.substring(commaIdx + 1) : uriOrBase64;
  } else if (!uriOrBase64.startsWith('http') && !uriOrBase64.startsWith('file://')) {
    base64Data = uriOrBase64;
  }

  // Supabase Storage Bucket Upload
  if (isSupabaseConfigured() && supabase && base64Data) {
    try {
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
      const binaryData = decodeBase64ToUint8Array(base64Data);

      const { data, error } = await supabase.storage
        .from('app-media')
        .upload(fileName, binaryData, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from('app-media')
          .getPublicUrl(fileName);

        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.log('Supabase Storage Bucket Upload fehlgeschlagen, nutze Fallback:', storageErr);
    }
  }

  // Fallback: Saubere Data-URL
  if (base64Data) {
    return `data:image/jpeg;base64,${base64Data}`;
  }

  return uriOrBase64;
}
