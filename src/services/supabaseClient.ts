import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const SUPABASE_URL = 'https://ahmcoyfmdrgpmclaxgfj.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';

export const isSupabaseConfigured = () => {
  return true;
};

const isClient = typeof window !== 'undefined' || Platform.OS !== 'web';

let clientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!isClient) return null;
  if (!clientInstance && isSupabaseConfigured()) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return clientInstance;
};

export const supabase = isClient && isSupabaseConfigured() ? getSupabase() : null;

