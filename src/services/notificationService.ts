import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const CHAT_MUTED_KEY = '@lok_chat_notifications_muted';
const PUSH_TOKEN_KEY = '@lok_device_push_token';

let Notifications: any = null;

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false, // In der geöffneten App keinen doppelten Banner aufpoppen
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    Notifications = null;
  }
}

export async function setupAndroidNotificationChannel() {
  if (Platform.OS === 'android' && Notifications) {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Standard Benachrichtigungen',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22c55e',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'RailTrainer Chat & Ausbilder',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22c55e',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    } catch (e) {
      console.warn('Error setting up notification channel:', e);
    }
  }
}

// 1. PUSH-TOKEN REGISTRIEREN (FÜR LOCKSCREEN & HINTERGRUND-BENACHRICHTIGUNGEN)
export async function registerForPushNotificationsAsync(userId?: string): Promise<{ token: string | null; error?: string }> {
  if (Platform.OS === 'web' || !Notifications) return { token: null, error: 'Plattform nicht unterstützt' };

  try {
    await setupAndroidNotificationChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { token: null, error: 'Android Berechtigung verweigert (' + finalStatus + ')' };
    }

    let token: string | null = null;
    let errorDetail = '';

    // Versuch 1: Expo Push Token mit expliziter Project ID
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: 'a2b87163-fd25-4e06-a94b-0b3e9ac0f803',
      });
      if (tokenResponse?.data) {
        token = tokenResponse.data;
      }
    } catch (e1: any) {
      errorDetail += 'EAS: ' + (e1?.message || e1) + ' | ';
    }

    // Versuch 2: Expo Push Token ohne Argument
    if (!token) {
      try {
        const tokenResponse2 = await Notifications.getExpoPushTokenAsync();
        if (tokenResponse2?.data) {
          token = tokenResponse2.data;
        }
      } catch (e2: any) {
        errorDetail += 'Expo: ' + (e2?.message || e2) + ' | ';
      }
    }

    // Versuch 3: Native Device Token (FCM)
    if (!token) {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        if (deviceToken?.data) {
          token = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);
        }
      } catch (e3: any) {
        errorDetail += 'Native: ' + (e3?.message || e3);
      }
    }

    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // In Supabase beim User hinterlegen
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        try {
          const uStr = await AsyncStorage.getItem('@lok_lernapp_current_user_v2');
          if (uStr) {
            const uObj = JSON.parse(uStr);
            effectiveUserId = uObj?.id;
          }
        } catch {}
      }

      if (effectiveUserId && isSupabaseConfigured() && supabase) {
        try {
          // Zuerst sicherstellen, dass dieses Gerät nicht mehrfach bei alten Accounts hinterlegt ist
          await supabase
            .from('users')
            .update({ push_token: null })
            .eq('push_token', token)
            .neq('id', effectiveUserId);

          await supabase
            .from('users')
            .update({ push_token: token })
            .eq('id', effectiveUserId);
          console.log('Push token saved to supabase for user:', effectiveUserId, token);
        } catch (dbErr) {
          console.warn('Supabase push_token update error:', dbErr);
        }
      }
      return { token, error: undefined };
    }

    return { token: null, error: errorDetail || 'Kein Token von Android erhalten' };
  } catch (error: any) {
    console.log('Push token registration error:', error);
    return { token: null, error: error?.message || String(error) };
  }
}

// 1b. Test-Benachrichtigung für Sperrbildschirm (5s Verzögerung zum Testen bei geschlossener App)
export async function scheduleTestLockscreenNotification(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false;
  try {
    await setupAndroidNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚂 RailTrainer Test-Nachricht',
        body: 'Dies ist eine Test-Benachrichtigung für deinen Sperrbildschirm.',
        data: { type: 'test' },
        channelId: 'chat-messages',
        priority: 'high',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });
    return true;
  } catch (err) {
    console.warn('Schedule test notification failed:', err);
    return false;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const token = await registerForPushNotificationsAsync();
  return Boolean(token);
}

export async function getIsChatMuted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(CHAT_MUTED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setIsChatMuted(muted: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAT_MUTED_KEY, muted ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving chat muted state:', e);
  }
}

// Hilfsfunktion: Nachname nur als Initial anzeigen (z.B. "Dennis Köster" -> "Dennis K.")
export function formatDisplayNameWithInitial(fullName?: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed;
  const firstName = parts.slice(0, parts.length - 1).join(' ');
  const lastName = parts[parts.length - 1];
  const lastInitial = lastName.charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

// 2. EXPO PUSH NOTIFICATION AN ANDERE SMARTPHONES SENDEN (AUßERHALB DER APP)
async function sendExpoPushNotificationPayload(messages: any[]) {
  if (!messages || messages.length === 0) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.warn('Error sending expo push notification:', err);
  }
}

// 3. PUSH AN ALLE GRUPPENCHAT-TEILNEHMER SENDEN
export async function broadcastChatPushNotification(
  senderId: string,
  senderName: string,
  messageText: string,
  channelName: string
) {
  try {
    if (!isSupabaseConfigured() || !supabase) return;

    // Alle Push-Tokens der anderen Nutzer abfragen
    const { data: users } = await supabase
      .from('users')
      .select('id, push_token')
      .neq('id', senderId)
      .not('push_token', 'is', null);

    if (!users || users.length === 0) return;

    // Deduplizieren nach Token, damit jedes physische Gerät exakt 1 Benachrichtigung erhält!
    const uniqueTokens = new Set<string>();
    users.forEach((u: any) => {
      if (u.push_token && u.push_token.startsWith('ExponentPushToken')) {
        uniqueTokens.add(u.push_token);
      }
    });

    const formattedSender = formatDisplayNameWithInitial(senderName);
    const pushMessages = Array.from(uniqueTokens).map((token: string) => ({
      to: token,
      sound: 'default',
      title: `💬 ${formattedSender} in #${channelName}`,
      body: messageText.length > 90 ? messageText.substring(0, 87) + '...' : messageText,
      data: { channel: channelName, type: 'chat' },
      channelId: 'chat-messages',
      priority: 'high',
    }));

    if (pushMessages.length > 0) {
      await sendExpoPushNotificationPayload(pushMessages);
    }
  } catch (e) {
    console.warn('Broadcast chat push error:', e);
  }
}

// 4. PUSH FÜR DEN AUSBILDERCHAT (FÜR SCHÜLER & AUSBILDER/MOD)
export async function sendDirectSupportPushNotification(
  studentId: string,
  studentName: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  messageText: string
) {
  try {
    if (!isSupabaseConfigured() || !supabase) return;

    const formattedSender = formatDisplayNameWithInitial(senderName);
    const isFromStudent = senderRole === 'user' || senderId === studentId;

    if (isFromStudent) {
      // Nachricht kommt vom Schüler -> Alle Ausbilder & Moderatoren benachrichtigen
      const { data: instructors } = await supabase
        .from('users')
        .select('id, push_token, role')
        .in('role', ['admin', 'moderator'])
        .neq('id', senderId)
        .not('push_token', 'is', null);

      if (instructors && instructors.length > 0) {
        const uniqueTokens = new Set<string>();
        instructors.forEach((u: any) => {
          if (u.push_token && u.push_token.startsWith('ExponentPushToken')) {
            uniqueTokens.add(u.push_token);
          }
        });

        const pushMessages = Array.from(uniqueTokens).map((token: string) => ({
          to: token,
          sound: 'default',
          title: `👨‍🏫 Ausbilderchat: Frage von ${formattedSender}`,
          body: messageText.length > 90 ? messageText.substring(0, 87) + '...' : messageText,
          data: { type: 'support', studentId, studentName },
          channelId: 'chat-messages',
          priority: 'high',
        }));

        if (pushMessages.length > 0) {
          await sendExpoPushNotificationPayload(pushMessages);
        }
      }
    } else {
      // Nachricht kommt vom Ausbilder/Mod -> Gezielt den betroffenen Schüler benachrichtigen
      const { data: targetStudent } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', studentId)
        .single();

      if (targetStudent?.push_token && targetStudent.push_token.startsWith('ExponentPushToken')) {
        await sendExpoPushNotificationPayload([
          {
            to: targetStudent.push_token,
            sound: 'default',
            title: `👨‍🏫 Ausbilder ${formattedSender} hat geantwortet`,
            body: messageText.length > 90 ? messageText.substring(0, 87) + '...' : messageText,
            data: { type: 'support', studentId },
            channelId: 'chat-messages',
            priority: 'high',
          },
        ]);
      }
    }
  } catch (e) {
    console.warn('Support push error:', e);
  }
}

// Lokale In-App Benachrichtigung (Fallback für Gruppenchat)
const notifiedIds = new Set<string>();
export async function sendChatNotification(
  senderName: string, 
  messageText: string, 
  channelName: string,
  messageId?: string
) {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    if (messageId) {
      if (notifiedIds.has(messageId)) return;
      notifiedIds.add(messageId);
      if (notifiedIds.size > 200) {
        const first = Array.from(notifiedIds)[0];
        notifiedIds.delete(first);
      }
    }

    const isMuted = await getIsChatMuted();
    if (isMuted) return;

    await setupAndroidNotificationChannel();

    const formattedSender = formatDisplayNameWithInitial(senderName);
    await Notifications.scheduleNotificationAsync({
      identifier: messageId || undefined,
      content: {
        title: `💬 ${formattedSender} in #${channelName}`,
        body: messageText.length > 90 ? messageText.substring(0, 87) + '...' : messageText,
        sound: 'default',
        color: '#22c55e',
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
        data: { channel: channelName, messageId, type: 'chat' },
        channelId: 'chat-messages',
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Could not schedule notification:', e);
  }
}

// Lokale In-App Benachrichtigung für Ausbilderchat
const notifiedSupportIds = new Set<string>();
export async function sendSupportNotification(
  senderName: string,
  messageText: string,
  isFromStudent: boolean,
  messageId?: string
) {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    if (messageId) {
      if (notifiedSupportIds.has(messageId)) return;
      notifiedSupportIds.add(messageId);
      if (notifiedSupportIds.size > 200) {
        const first = Array.from(notifiedSupportIds)[0];
        notifiedSupportIds.delete(first);
      }
    }

    const isMuted = await getIsChatMuted();
    if (isMuted) return;

    await setupAndroidNotificationChannel();

    const formattedSender = formatDisplayNameWithInitial(senderName);
    const title = isFromStudent 
      ? `👨‍🏫 Ausbilderchat: Neue Frage von ${formattedSender}`
      : `👨‍🏫 Ausbilder ${formattedSender} hat geantwortet`;

    await Notifications.scheduleNotificationAsync({
      identifier: messageId || undefined,
      content: {
        title,
        body: messageText.length > 90 ? messageText.substring(0, 87) + '...' : messageText,
        sound: 'default',
        color: '#22c55e',
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
        data: { type: 'support', messageId },
        channelId: 'chat-messages',
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Could not schedule support notification:', e);
  }
}

