import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View, type TextInputInstance, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ban, ChevronLeft, Clock, Flag, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react-native';
import {
  mockDb,
  type ChatMessage,
  type Category,
  type User as DbUser,
  type SupportMessage,
  type RoleDefinition,
  type ChatBanRecord,
} from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { uploadAndOptimizeImage } from '../utils/imageOptimizer';
import { truncate } from '../utils/chatFormat';
import {
  requestNotificationPermissions,
  sendChatNotification,
  sendSupportNotification,
  formatDisplayNameWithInitial,
} from '../services/notificationService';
import { ActionDialog, type DialogAction } from '../components/ui/ActionDialog';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { IconButton } from '../components/ui/IconButton';
import { RadioGroup } from '../components/ui/RadioGroup';
import { Heading } from '../components/ui/Section';
import { StatusMessage, type Status } from '../components/ui/StatusMessage';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { SCREEN_PADDING, WIDE_MAX_WIDTH } from '../components/ui/tokens';
import { LiveAnnouncer } from '../components/ui/VisuallyHidden';
import { moveFocusTo } from '../components/ui/a11y';
import { ChannelSidebar } from '../components/chat/ChannelSidebar';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatKeyboardPane } from '../components/chat/ChatKeyboardPane';
import { ChatNotice } from '../components/chat/ChatNotice';
import { ChatRestrictionNotice } from '../components/chat/ChatRestrictionNotice';
import { MessageList } from '../components/chat/MessageList';
import { ThreadList } from '../components/chat/ThreadList';
import { UserProfileDialog } from '../components/chat/UserProfileDialog';
import type { ChatListMessage, SenderInfo, SupportThread } from '../components/chat/types';

const DEFAULT_CHANNEL = 'Allgemein';
const POLL_INTERVAL_MS = 2000;
/** „Jetzt“ für Sperrfristen und Tageslabels wird höchstens so oft erneuert (vermeidet Re-Render je Abfrage). */
const NOW_REFRESH_MS = 30000;
const STATUS_VISIBLE_MS = 6000;
/** iOS präsentiert kein zweites Modal, solange das erste noch ausblendet; im Web erst Fokus-Rückgabe abwarten. */
const MODAL_SWITCH_DELAY_MS = Platform.OS === 'ios' ? 400 : 50;

const GROUP_READ_KEY = '@chat_channels_last_read';
const SUPPORT_READ_KEY = '@chat_support_last_read';
const threadReadKey = (userId: string) => `@chat_support_threads_read_${userId}`;

/** Gründe wie bisher – der gespeicherte Wortlaut (`reason`) bleibt unverändert. */
const REPORT_REASONS = [
  { value: 'abuse', label: 'Beleidigung oder unangemessener Inhalt', reason: 'Beleidigung / Unangemessener Inhalt' },
  { value: 'spam', label: 'Spam oder Falschinformation', reason: 'Spam / Falschinformation' },
];

type ChatTab = 'group' | 'support';

interface PendingMessage {
  localId: string;
  channel: string;
  text: string;
  timestamp: number;
  status: 'sending' | 'failed';
}

type ConfirmState =
  | { kind: 'deleteMessage'; messageId: string; senderName: string }
  | { kind: 'deleteSupportMessage'; messageId: string; senderName: string }
  | { kind: 'deleteThread'; studentId: string; studentName: string }
  | { kind: 'timeout'; userId: string; userName: string }
  | { kind: 'ban'; userId: string; userName: string }
  | { kind: 'unban'; userId: string; userName: string };

type ActionTarget = { source: 'group'; message: ChatMessage } | { source: 'support'; message: SupportMessage };

interface ViewingUser {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  title?: string;
}

const getRoleLabel = (role?: string, rolesList?: RoleDefinition[]) => {
  const found = rolesList?.find((r) => r.id === role);
  if (found) return found.name;
  switch (role) {
    case 'admin':
      return 'Ausbilder';
    case 'moderator':
      return 'Mod';
    default:
      return 'Schüler';
  }
};

function sameById<T extends { id: string }>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item, i) => item.id === b[i].id);
}

function sameJson<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toUsersMap(users: DbUser[]): Record<string, DbUser> {
  const map: Record<string, DbUser> = {};
  users.forEach((u) => {
    map[u.id] = u;
  });
  return map;
}

/** Aktive Sperre eines Nutzers zum Zeitpunkt `now` (abgelaufene Timeouts zählen nicht). */
function findRestriction(bans: ChatBanRecord[], userId: string | undefined, now: number) {
  if (!userId) return null;
  const ban = bans.find((b) => b.targetUserId === userId);
  if (!ban) return null;
  if (ban.type === 'timeout_1d') {
    return ban.timeoutUntil && now < ban.timeoutUntil ? { type: 'timeout' as const, until: ban.timeoutUntil } : null;
  }
  return { type: 'banned' as const };
}

function groupToList(m: ChatMessage): ChatListMessage {
  return { id: m.id, senderId: m.senderId, senderName: m.sender, senderRole: m.senderRole, text: m.text, timestamp: m.timestamp };
}

function supportToList(m: SupportMessage): ChatListMessage {
  return {
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName,
    senderRole: m.senderRole,
    text: m.text,
    imageUrl: m.imageUrl,
    timestamp: m.timestamp,
  };
}

export default function ChatScreen() {
  const { isDark, colors } = useAppTheme();
  const { isTablet, isSplitView } = useDeviceLayout();
  const reduceMotion = useReduceMotion();
  const screenBg = isDark ? colors.background : colors.cardBg;

  // --- Grundzustand ---
  const [activeTab, setActiveTab] = useState<ChatTab>('group');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(0);
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, DbUser>>({});
  const [chatBans, setChatBans] = useState<ChatBanRecord[]>([]);
  const [viewingUser, setViewingUser] = useState<ViewingUser | null>(null);

  // --- Fach-Chat (Kanäle) ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState(DEFAULT_CHANNEL);
  const [channelReadTimes, setChannelReadTimes] = useState<Record<string, number>>({});
  const [unreadMarker, setUnreadMarker] = useState<{ channel: string; since: number } | null>(null);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, string>>({});

  // --- Ausbilderchat ---
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
  const [supportDrafts, setSupportDrafts] = useState<Record<string, string>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [supportLastReadTime, setSupportLastReadTime] = useState(0);
  const [threadReadTimes, setThreadReadTimes] = useState<Record<string, number>>({});
  const [attaching, setAttaching] = useState(false);

  // --- Dialoge, Statuszeile, Ansagen ---
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [announcement, setAnnouncement] = useState<{ message: string; id: number } | null>(null);

  const composerRef = useRef<TextInputInstance>(null);
  const triggerRef = useRef<ViewInstance | null>(null);
  const backButtonRef = useRef<ViewInstance>(null);
  const threadRowRefs = useRef<Record<string, ViewInstance | null>>({});
  const pendingFocusRef = useRef<{ kind: 'back' } | { kind: 'row'; id: string } | null>(null);
  const prevLastMsgIdRef = useRef<string | null>(null);
  const prevLastSupportMsgIdRef = useRef<string | null>(null);
  const prevSupportThreadsTimestampRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const isModOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const isAdmin = currentUser?.role === 'admin';

  // --- Abgeleitete Werte ---
  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  // #Allgemein steht immer vorn; die übrigen Kanäle nach neuester Nachricht, dann alphabetisch.
  const sortedChannels = useMemo(() => {
    const otherChannelNames = categories
      .map((c) => c.name)
      .filter((name) => name && name !== DEFAULT_CHANNEL && !name.startsWith('__'));
    const latest: Record<string, number> = {};
    messages.forEach((m) => {
      const ch = m.category || DEFAULT_CHANNEL;
      latest[ch] = Math.max(latest[ch] || 0, m.timestamp);
    });
    otherChannelNames.sort((a, b) => {
      const diff = (latest[b] || 0) - (latest[a] || 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
    return [DEFAULT_CHANNEL, ...otherChannelNames];
  }, [categories, messages]);

  const channelUnreadCounts = useMemo(() => {
    const unread: Record<string, number> = {};
    sortedChannels.forEach((ch) => {
      if (ch === activeChannel && activeTab === 'group') {
        unread[ch] = 0;
        return;
      }
      const lastRead = channelReadTimes[ch] || 0;
      unread[ch] = messages.filter(
        (m) => (m.category || DEFAULT_CHANNEL) === ch && m.senderId !== currentUser?.id && m.timestamp > lastRead,
      ).length;
    });
    return unread;
  }, [sortedChannels, messages, channelReadTimes, activeChannel, activeTab, currentUser?.id]);

  const totalGroupUnread = useMemo(
    () => Object.values(channelUnreadCounts).reduce((sum, c) => sum + c, 0),
    [channelUnreadCounts],
  );

  const isThreadUnread = useCallback(
    (thread: SupportThread) => {
      const lastRead = threadReadTimes[thread.studentId] || 0;
      return thread.timestamp > lastRead && thread.lastSenderId !== currentUser?.id;
    },
    [threadReadTimes, currentUser?.id],
  );

  // Ungelesene Anfragen zuerst, danach nach neuester Nachricht
  const sortedSupportThreads = useMemo(
    () =>
      [...supportThreads].sort((a, b) => {
        const aUnread = isThreadUnread(a);
        const bUnread = isThreadUnread(b);
        if (aUnread !== bUnread) return aUnread ? -1 : 1;
        return b.timestamp - a.timestamp;
      }),
    [supportThreads, isThreadUnread],
  );

  const supportUnreadCount = useMemo(() => {
    if (!currentUser) return 0;
    if (currentUser.role === 'user') {
      if (activeTab === 'support') return 0;
      return supportMessages.filter((m) => m.senderId !== currentUser.id && m.timestamp > supportLastReadTime).length;
    }
    return supportThreads.filter((t) => isThreadUnread(t)).length;
  }, [activeTab, currentUser, supportMessages, supportThreads, supportLastReadTime, isThreadUnread]);

  // Split-View: ohne eigene Auswahl wird die oberste Anfrage gezeigt (beim nächsten Abgleich fest übernommen).
  const autoThread = isSplitView && isModOrAdmin && !selectedStudentId ? sortedSupportThreads[0] : undefined;
  const effectiveStudentId = selectedStudentId ?? autoThread?.studentId ?? null;
  const effectiveStudentName = selectedStudentId ? selectedStudentName : (autoThread?.studentName ?? '');

  // Admins und Moderatoren können nicht gesperrt werden
  const myRestriction = useMemo(() => {
    if (isModOrAdmin) return null;
    return findRestriction(chatBans, currentUser?.id, now);
  }, [isModOrAdmin, chatBans, currentUser?.id, now]);

  // Aktuelle Werte für den Hintergrund-Abgleich (Intervall), ohne ihn bei jeder Änderung neu zu starten
  const liveRef = useRef({
    activeTab,
    activeChannel,
    selectedStudentId,
    effectiveStudentId,
    effectiveStudentName,
    isSplitView,
  });
  useEffect(() => {
    liveRef.current = {
      activeTab,
      activeChannel,
      selectedStudentId,
      effectiveStudentId,
      effectiveStudentName,
      isSplitView,
    };
  });

  // --- Laden ---
  const loadData = useCallback(async (initial = false) => {
    try {
      const user = await mockDb.getCurrentUser();
      const allRoles = await mockDb.getRoles();
      const allMsgs = await mockDb.getChatMessages();
      const allCategories = await mockDb.getCategories();
      const allUsers = await mockDb.getUsers();
      const bans = await mockDb.getChatBans();

      setCurrentUser((prev) => (sameJson(prev, user) ? prev : user));
      setRoles((prev) => (sameJson(prev, allRoles) ? prev : allRoles));
      setMessages((prev) => (sameById(prev, allMsgs) ? prev : allMsgs));
      if (allMsgs.length > 0) prevLastMsgIdRef.current = allMsgs[allMsgs.length - 1].id;
      setCategories((prev) => (sameJson(prev, allCategories) ? prev : allCategories));
      const nextUsers = toUsersMap(allUsers);
      setUsersMap((prev) => (sameJson(prev, nextUsers) ? prev : nextUsers));
      setChatBans((prev) => (sameJson(prev, bans) ? prev : bans));

      if (initial) {
        // Gelesen-Stände laden; der Startkanal gilt ab jetzt als gelesen, der Trenner zeigt, was neu war.
        const groupRead = parseJson<Record<string, number>>(await AsyncStorage.getItem(GROUP_READ_KEY), {});
        setUnreadMarker({ channel: DEFAULT_CHANNEL, since: groupRead[DEFAULT_CHANNEL] || 0 });
        const nextGroupRead = { ...groupRead, [DEFAULT_CHANNEL]: Date.now() };
        setChannelReadTimes(nextGroupRead);
        AsyncStorage.setItem(GROUP_READ_KEY, JSON.stringify(nextGroupRead)).catch(() => {});
        setSupportLastReadTime(parseInt((await AsyncStorage.getItem(SUPPORT_READ_KEY)) || '0', 10) || 0);
        if (user?.id) {
          setThreadReadTimes(parseJson<Record<string, number>>(await AsyncStorage.getItem(threadReadKey(user.id)), {}));
        }
      }

      if (user) {
        if (user.role === 'user') {
          const supMsgs = await mockDb.getSupportMessages(user.id);
          setSupportMessages((prev) => (sameById(prev, supMsgs) ? prev : supMsgs));
          if (supMsgs.length > 0) prevLastSupportMsgIdRef.current = supMsgs[supMsgs.length - 1].id;
        } else {
          const threads = await mockDb.getSupportThreads();
          setSupportThreads((prev) => (sameJson(prev, threads) ? prev : threads));
          if (threads.length > 0) prevSupportThreadsTimestampRef.current = Math.max(...threads.map((t) => t.timestamp));
          const studentId = liveRef.current.effectiveStudentId;
          if (studentId) {
            const threadMsgs = await mockDb.getSupportMessages(studentId);
            setSupportMessages((prev) => (sameById(prev, threadMsgs) ? prev : threadMsgs));
          }
        }
      }
      setLoadError(false);
      isInitialLoadRef.current = false;
    } catch (e) {
      console.error(e);
      setLoadError(true);
    } finally {
      setNow(Date.now());
      setLoading(false);
    }
  }, []);

  // Erstes Laden außerhalb des Effekt-Durchlaufs starten (setState erst nach dem Laden, keine Render-Kaskade)
  useEffect(() => {
    const start = setTimeout(() => {
      loadData(true);
    }, 0);
    requestNotificationPermissions();
    return () => clearTimeout(start);
  }, [loadData]);

  // Nachrichten der gewählten Anfrage laden (Ausbilder/Mods), auch bei automatischer Auswahl im Split-View
  useEffect(() => {
    if (!effectiveStudentId || !isModOrAdmin) return;
    let active = true;
    mockDb.getSupportMessages(effectiveStudentId).then((msgs) => {
      if (active) setSupportMessages((prev) => (sameById(prev, msgs) ? prev : msgs));
    });
    return () => {
      active = false;
    };
  }, [effectiveStudentId, isModOrAdmin]);

  // Regelmäßiger Abgleich inkl. Push/In-App-Benachrichtigungen (Aufrufe und Bedingungen wie bisher)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const user = await mockDb.getCurrentUser();
        setCurrentUser((prev) => (sameJson(prev, user) ? prev : user));
        const allRoles = await mockDb.getRoles();
        setRoles((prev) => (sameJson(prev, allRoles) ? prev : allRoles));
        const allMsgs = await mockDb.getChatMessages();

        if (allMsgs.length > 0) {
          const lastMsg = allMsgs[allMsgs.length - 1];
          if (!isInitialLoadRef.current && prevLastMsgIdRef.current && prevLastMsgIdRef.current !== lastMsg.id) {
            if (user && lastMsg.senderId !== user.id) {
              sendChatNotification(lastMsg.sender, lastMsg.text, lastMsg.category, lastMsg.id);
            }
          }
          prevLastMsgIdRef.current = lastMsg.id;
        }
        setMessages((prev) => (sameById(prev, allMsgs) ? prev : allMsgs));

        const allCategories = await mockDb.getCategories();
        setCategories((prev) => (sameJson(prev, allCategories) ? prev : allCategories));
        const nextUsers = toUsersMap(await mockDb.getUsers());
        setUsersMap((prev) => (sameJson(prev, nextUsers) ? prev : nextUsers));
        const bans = await mockDb.getChatBans();
        setChatBans((prev) => (sameJson(prev, bans) ? prev : bans));
        setNow((prev) => (Date.now() - prev > NOW_REFRESH_MS ? Date.now() : prev));

        const live = liveRef.current;

        // Offenen Kanal als gelesen markieren, sobald dort Neues eingeht
        if (live.activeTab === 'group') {
          const latestInChannel = allMsgs
            .filter((m) => (m.category || DEFAULT_CHANNEL) === live.activeChannel)
            .reduce((max, m) => Math.max(max, m.timestamp), 0);
          setChannelReadTimes((prev) => {
            if (!latestInChannel || (prev[live.activeChannel] || 0) >= latestInChannel) return prev;
            const next = { ...prev, [live.activeChannel]: Date.now() };
            AsyncStorage.setItem(GROUP_READ_KEY, JSON.stringify(next)).catch(() => {});
            return next;
          });
        }

        if (user) {
          if (user.role === 'user') {
            const supMsgs = await mockDb.getSupportMessages(user.id);
            if (supMsgs.length > 0) {
              const lastSupMsg = supMsgs[supMsgs.length - 1];
              if (
                !isInitialLoadRef.current &&
                prevLastSupportMsgIdRef.current &&
                prevLastSupportMsgIdRef.current !== lastSupMsg.id
              ) {
                if (lastSupMsg.senderId !== user.id) {
                  // Neue Ausbilder-Antwort -> Benachrichtigung
                  sendSupportNotification(lastSupMsg.senderName, lastSupMsg.text, false, lastSupMsg.id);
                }
              }
              prevLastSupportMsgIdRef.current = lastSupMsg.id;
              if (live.activeTab === 'support') {
                setSupportLastReadTime((prev) => {
                  if (prev >= lastSupMsg.timestamp) return prev;
                  const nowTs = Date.now();
                  AsyncStorage.setItem(SUPPORT_READ_KEY, String(nowTs)).catch(() => {});
                  return nowTs;
                });
              }
            }
            setSupportMessages((prev) => (sameById(prev, supMsgs) ? prev : supMsgs));
          } else {
            const threads = await mockDb.getSupportThreads();
            if (threads.length > 0) {
              const maxTimestamp = Math.max(...threads.map((t) => t.timestamp));
              if (
                !isInitialLoadRef.current &&
                prevSupportThreadsTimestampRef.current &&
                maxTimestamp > prevSupportThreadsTimestampRef.current
              ) {
                const latestThread = threads[0];
                // Neue Schüler-Frage -> Benachrichtigung an Ausbilder/Mod
                sendSupportNotification(latestThread.studentName, latestThread.lastMessage, true);
              }
              prevSupportThreadsTimestampRef.current = maxTimestamp;
            }
            setSupportThreads((prev) => (sameJson(prev, threads) ? prev : threads));

            // Automatische Auswahl im Split-View festhalten, damit sie nicht zu neuen Anfragen springt
            if (live.isSplitView && !live.selectedStudentId && live.effectiveStudentId) {
              setSelectedStudentId(live.effectiveStudentId);
              setSelectedStudentName(live.effectiveStudentName);
            }
            if (live.effectiveStudentId) {
              const studentId = live.effectiveStudentId;
              const threadMsgs = await mockDb.getSupportMessages(studentId);
              setSupportMessages((prev) => (sameById(prev, threadMsgs) ? prev : threadMsgs));
              const latest = threadMsgs.reduce((max, m) => Math.max(max, m.timestamp), 0);
              setThreadReadTimes((prev) => {
                if (!latest || (prev[studentId] || 0) >= latest) return prev;
                const next = { ...prev, [studentId]: Date.now() };
                AsyncStorage.setItem(threadReadKey(user.id), JSON.stringify(next)).catch(() => {});
                return next;
              });
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Statuszeile nach kurzer Zeit ausblenden
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), STATUS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  // Fokus nach Ansichtswechsel (Thread öffnen/schließen) setzen, sobald das Ziel eingehängt ist
  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    const node = target.kind === 'back' ? backButtonRef.current : threadRowRefs.current[target.id];
    if (node) {
      pendingFocusRef.current = null;
      moveFocusTo(node, 100);
    }
  });

  /**
   * Fokus nach dem Schließen eines Dialogs zurück auf den Auslöser (z. B. ⋯-Button) setzen. Bei verketteten
   * Dialogen kennt das Web-Modal den Auslöser nicht mehr; ist er weg (Nachricht gelöscht), geht der Fokus ins Eingabefeld.
   */
  const restoreFocus = () => {
    const target = triggerRef.current;
    triggerRef.current = null;
    const attached =
      Platform.OS !== 'web' || Boolean(target && (target as unknown as { isConnected?: boolean }).isConnected);
    // Erst nach dem Ausblenden des Modals (Web: dessen Fokusfalle hält den Fokus bis dahin im Dialog)
    moveFocusTo(attached && target ? target : composerRef.current, Platform.OS === 'web' ? 400 : 500);
  };

  // --- Gelesen markieren ---
  const markChannelRead = (channel: string) => {
    setChannelReadTimes((prev) => {
      const next = { ...prev, [channel]: Date.now() };
      AsyncStorage.setItem(GROUP_READ_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const markSupportRead = () => {
    const nowTs = Date.now();
    setSupportLastReadTime(nowTs);
    AsyncStorage.setItem(SUPPORT_READ_KEY, String(nowTs)).catch(() => {});
  };

  const markThreadRead = (studentId: string) => {
    setThreadReadTimes((prev) => {
      const next = { ...prev, [studentId]: Date.now() };
      if (currentUser?.id) {
        AsyncStorage.setItem(threadReadKey(currentUser.id), JSON.stringify(next)).catch(() => {});
      }
      return next;
    });
  };

  // --- Navigation im Chat ---
  const handleSelectTab = (key: string) => {
    const tab = key as ChatTab;
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === 'group') {
      setUnreadMarker({ channel: activeChannel, since: channelReadTimes[activeChannel] || 0 });
      markChannelRead(activeChannel);
    } else {
      markChannelRead(activeChannel);
      if (currentUser?.role === 'user') markSupportRead();
      // Still im Hintergrund aktualisieren – kein Spinner, Fokus bleibt auf dem Tab
      loadData();
    }
  };

  const handleSelectChannel = (channel: string) => {
    if (channel === activeChannel) return;
    setUnreadMarker({ channel, since: channelReadTimes[channel] || 0 });
    markChannelRead(channel);
    setActiveChannel(channel);
  };

  const openThread = (thread: SupportThread) => {
    markThreadRead(thread.studentId);
    setSelectedStudentId(thread.studentId);
    setSelectedStudentName(thread.studentName);
    if (!isSplitView) pendingFocusRef.current = { kind: 'back' };
  };

  const closeThread = () => {
    if (selectedStudentId) pendingFocusRef.current = { kind: 'row', id: selectedStudentId };
    setSelectedStudentId(null);
    loadData();
  };

  // --- Senden (Fach-Chat) ---
  const sendGroupMessage = useCallback(
    async (localId: string, channel: string, text: string) => {
      if (!currentUser) return;
      setPending((prev) => [
        ...prev.filter((p) => p.localId !== localId),
        { localId, channel, text, timestamp: Date.now(), status: 'sending' },
      ]);
      try {
        const newMsg = await mockDb.addChatMessage(channel, currentUser.name, currentUser.id, currentUser.role, text);
        setPending((prev) => prev.filter((p) => p.localId !== localId));
        setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
      } catch {
        // Erwarteter Fall (z. B. offline): Die Blase zeigt „Nicht gesendet“ und „Erneut senden“.
        setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, status: 'failed' } : p)));
        setAnnouncement({ message: 'Die Nachricht wurde nicht gesendet. Du kannst sie erneut senden.', id: Date.now() });
      }
    },
    [currentUser],
  );

  const handleSendMessage = () => {
    const text = (groupDrafts[activeChannel] ?? '').trim();
    if (!text || !currentUser || myRestriction) return;
    setGroupDrafts((prev) => ({ ...prev, [activeChannel]: '' }));
    sendGroupMessage(`local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, activeChannel, text);
    if (Platform.OS === 'web') composerRef.current?.focus();
  };

  const handleRetry = useCallback(
    (message: ChatListMessage) => {
      const item = pending.find((p) => p.localId === message.id);
      if (item) sendGroupMessage(item.localId, item.channel, item.text);
    },
    [pending, sendGroupMessage],
  );

  const handleDiscard = useCallback((message: ChatListMessage) => {
    setPending((prev) => prev.filter((p) => p.localId !== message.id));
  }, []);

  // --- Senden (Ausbilderchat) ---
  const supportTargetId = currentUser?.role === 'user' ? currentUser.id : effectiveStudentId;
  const supportTargetName = currentUser?.role === 'user' ? currentUser.name : effectiveStudentName;

  const handleSendSupportMessage = async () => {
    if (!currentUser || !supportTargetId) return;
    const targetId = supportTargetId;
    const text = (supportDrafts[targetId] ?? '').trim();
    if (!text) return;
    setSupportDrafts((prev) => ({ ...prev, [targetId]: '' }));
    if (Platform.OS === 'web') composerRef.current?.focus();
    try {
      const newMsg = await mockDb.addSupportMessage(
        targetId,
        supportTargetName,
        currentUser.id,
        currentUser.name,
        currentUser.role,
        text,
      );
      setSupportMessages((prev) => [...prev, newMsg]);
    } catch (e) {
      console.error(e);
      setSupportDrafts((prev) => ({ ...prev, [targetId]: prev[targetId] || text }));
      setStatus({ tone: 'error', message: 'Die Nachricht konnte nicht gesendet werden. Versuch es noch einmal.' });
    }
  };

  const handlePickSupportImage = async () => {
    if (!currentUser || !supportTargetId) return;
    const targetId = supportTargetId;
    const targetName = supportTargetName;
    try {
      const { status: permission } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission !== 'granted') {
        setStatus({
          tone: 'error',
          message: 'Kein Zugriff auf deine Fotos. Erlaube den Zugriff in den Einstellungen, um ein Foto zu senden.',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.35,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttaching(true);
        const asset = result.assets[0];
        const raw = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'chat');
        const newMsg = await mockDb.addSupportMessage(
          targetId,
          targetName,
          currentUser.id,
          currentUser.name,
          currentUser.role,
          '[Foto gesendet]',
          optimizedUri,
        );
        setSupportMessages((prev) => [...prev, newMsg]);
      }
    } catch (e) {
      console.error(e);
      setStatus({ tone: 'error', message: 'Das Foto konnte nicht hochgeladen werden.' });
    } finally {
      setAttaching(false);
    }
  };

  // --- Absender, Aktionen, Profil ---
  const getSender = useCallback(
    (message: ChatListMessage): SenderInfo => {
      const user = usersMap[message.senderId];
      const role = user?.role || message.senderRole;
      const roleName = roleById.get(role ?? '')?.name ?? getRoleLabel(role, roles);
      return {
        displayName: formatDisplayNameWithInitial(user?.name || message.senderName),
        roleLabel: user?.title?.trim() || roleName,
        roleKind: role === 'admin' ? 'admin' : role === 'moderator' ? 'moderator' : null,
        avatarUrl: user?.avatarUrl,
      };
    },
    [usersMap, roleById, roles],
  );

  const handleOpenProfile = useCallback(
    (message: ChatListMessage) => {
      const found = usersMap[message.senderId];
      setViewingUser(
        found
          ? { id: message.senderId, name: found.name, avatarUrl: found.avatarUrl, role: found.role, title: found.title }
          : { id: message.senderId, name: message.senderName, role: message.senderRole },
      );
    },
    [usersMap],
  );

  const canOpenGroupActions = useCallback(
    (message: ChatListMessage) => message.senderId !== currentUser?.id || isModOrAdmin,
    [currentUser?.id, isModOrAdmin],
  );
  const canOpenSupportActions = useCallback(() => isAdmin, [isAdmin]);

  const handleOpenGroupActions = useCallback(
    (message: ChatListMessage, trigger: ViewInstance | null) => {
      const original = messages.find((m) => m.id === message.id);
      if (!original) return;
      triggerRef.current = trigger;
      setActionTarget({ source: 'group', message: original });
    },
    [messages],
  );

  const handleOpenSupportActions = useCallback(
    (message: ChatListMessage, trigger: ViewInstance | null) => {
      const original = supportMessages.find((m) => m.id === message.id);
      if (!original) return;
      triggerRef.current = trigger;
      setActionTarget({ source: 'support', message: original });
    },
    [supportMessages],
  );

  /** Schließt das aktuelle Modal und öffnet danach das nächste (iOS braucht dazwischen eine Pause). */
  const switchModal = (closeCurrent: () => void, openNext: () => void) => {
    closeCurrent();
    setTimeout(openNext, MODAL_SWITCH_DELAY_MS);
  };

  const openConfirm = (next: ConfirmState) => {
    setConfirmError(null);
    setConfirm(next);
  };

  const openReport = (message: ChatMessage) => {
    setReportReason(null);
    setReportError(null);
    setReportTarget(message);
  };

  const buildActions = (target: ActionTarget): DialogAction[] => {
    if (!currentUser) return [];
    const closeActions = () => setActionTarget(null);
    if (target.source === 'support') {
      const msg = target.message;
      const name = formatDisplayNameWithInitial(usersMap[msg.senderId]?.name || msg.senderName);
      return isAdmin
        ? [
            {
              key: 'delete',
              label: 'Nachricht löschen',
              icon: Trash2,
              danger: true,
              onPress: () =>
                switchModal(closeActions, () =>
                  openConfirm({ kind: 'deleteSupportMessage', messageId: msg.id, senderName: name }),
                ),
            },
          ]
        : [];
    }

    const msg = target.message;
    const isOwn = msg.senderId === currentUser.id;
    const name = formatDisplayNameWithInitial(usersMap[msg.senderId]?.name || msg.sender);
    const actions: DialogAction[] = [];
    if (!isOwn) {
      actions.push({
        key: 'report',
        label: 'Nachricht melden',
        icon: Flag,
        onPress: () => switchModal(closeActions, () => openReport(msg)),
      });
    }
    if (isModOrAdmin && !isOwn) {
      if (findRestriction(chatBans, msg.senderId, now)) {
        actions.push({
          key: 'unban',
          label: `Sperre für ${name} aufheben`,
          icon: ShieldCheck,
          onPress: () =>
            switchModal(closeActions, () => openConfirm({ kind: 'unban', userId: msg.senderId, userName: msg.sender })),
        });
      } else {
        actions.push({
          key: 'timeout',
          label: `${name} 24 Stunden stummschalten`,
          icon: Clock,
          onPress: () =>
            switchModal(closeActions, () => openConfirm({ kind: 'timeout', userId: msg.senderId, userName: msg.sender })),
        });
        actions.push({
          key: 'ban',
          label: `${name} dauerhaft sperren`,
          icon: Ban,
          danger: true,
          onPress: () =>
            switchModal(closeActions, () => openConfirm({ kind: 'ban', userId: msg.senderId, userName: msg.sender })),
        });
      }
    }
    if (isModOrAdmin) {
      actions.push({
        key: 'delete',
        label: 'Nachricht löschen',
        icon: Trash2,
        danger: true,
        onPress: () =>
          switchModal(closeActions, () => openConfirm({ kind: 'deleteMessage', messageId: msg.id, senderName: name })),
      });
    }
    return actions;
  };

  const requestDeleteThread = (studentId: string, studentName: string, trigger: ViewInstance | null) => {
    if (!isAdmin) return;
    triggerRef.current = trigger;
    openConfirm({ kind: 'deleteThread', studentId, studentName });
  };

  // --- Bestätigte Aktionen (mockDb-Aufrufe wie bisher) ---
  const runConfirm = async () => {
    if (!confirm || !currentUser) return;
    const action = confirm;
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      switch (action.kind) {
        case 'deleteMessage': {
          const success = await mockDb.deleteChatMessage(action.messageId);
          if (!success) throw new Error('deleteChatMessage fehlgeschlagen');
          setMessages((prev) => prev.filter((m) => m.id !== action.messageId));
          setStatus({ tone: 'success', message: 'Nachricht gelöscht.' });
          break;
        }
        case 'deleteSupportMessage': {
          if (!isAdmin) return;
          await mockDb.deleteSupportMessage(action.messageId);
          setSupportMessages((prev) => prev.filter((m) => m.id !== action.messageId));
          setStatus({ tone: 'success', message: 'Nachricht gelöscht.' });
          break;
        }
        case 'deleteThread': {
          if (!isAdmin) return;
          await mockDb.deleteSupportThread(action.studentId);
          setSupportThreads((prev) => prev.filter((t) => t.studentId !== action.studentId));
          setSupportMessages((prev) => prev.filter((m) => m.studentId !== action.studentId));
          if (effectiveStudentId === action.studentId) setSelectedStudentId(null);
          setStatus({
            tone: 'success',
            message: `Chatverlauf mit ${formatDisplayNameWithInitial(action.studentName)} gelöscht.`,
          });
          break;
        }
        case 'timeout':
        case 'ban': {
          if (!isModOrAdmin) return;
          await mockDb.setChatBan(action.userId, action.userName, action.kind === 'timeout' ? 'timeout_1d' : 'permanent', currentUser);
          setChatBans(await mockDb.getChatBans());
          const name = formatDisplayNameWithInitial(action.userName);
          setStatus({
            tone: 'success',
            message: action.kind === 'timeout' ? `${name} ist für 24 Stunden stummgeschaltet.` : `${name} ist im Chat gesperrt.`,
          });
          break;
        }
        case 'unban': {
          if (!isModOrAdmin) return;
          await mockDb.removeChatBan(action.userId);
          setChatBans(await mockDb.getChatBans());
          setStatus({ tone: 'success', message: `Sperre für ${formatDisplayNameWithInitial(action.userName)} aufgehoben.` });
          break;
        }
      }
      setConfirm(null);
      restoreFocus();
    } catch (e) {
      console.error(e);
      setConfirmError(
        action.kind === 'deleteThread'
          ? 'Der Chatverlauf konnte nicht gelöscht werden. Versuch es noch einmal.'
          : action.kind === 'deleteMessage' || action.kind === 'deleteSupportMessage'
            ? 'Die Nachricht konnte nicht gelöscht werden. Versuch es noch einmal.'
            : action.kind === 'unban'
              ? 'Die Sperre konnte nicht aufgehoben werden. Versuch es noch einmal.'
              : 'Die Sperre konnte nicht gesetzt werden. Versuch es noch einmal.',
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const cancelConfirm = () => {
    setConfirm(null);
    restoreFocus();
  };

  const submitReport = async () => {
    if (!reportTarget || !currentUser) return;
    const reason = REPORT_REASONS.find((r) => r.value === reportReason);
    if (!reason) {
      setReportError('Wähle einen Grund aus.');
      return;
    }
    setReportLoading(true);
    setReportError(null);
    try {
      await mockDb.reportChatMessage({
        messageId: reportTarget.id,
        messageText: reportTarget.text,
        messageSenderName: reportTarget.sender,
        messageSenderId: reportTarget.senderId,
        messageCategory: reportTarget.category,
        reporterId: currentUser.id,
        reporterName: currentUser.name,
        reason: reason.reason,
      });
      setReportTarget(null);
      // Kein Versprechen zur Prüfung: reportChatMessage speichert derzeit nur lokal (siehe Bericht).
      setStatus({ tone: 'success', message: 'Nachricht gemeldet.' });
      restoreFocus();
    } catch (e) {
      console.error(e);
      setReportError('Die Meldung konnte nicht gespeichert werden. Versuch es noch einmal.');
    } finally {
      setReportLoading(false);
    }
  };

  // --- Listen-Daten ---
  const channelMessages = useMemo(
    () => [
      ...messages
        .filter((m) => m.category === activeChannel && !m.id?.startsWith('battle_') && !m.category?.startsWith('__'))
        .map(groupToList),
      ...pending
        .filter((p) => p.channel === activeChannel)
        .map(
          (p): ChatListMessage => ({
            id: p.localId,
            senderId: currentUser?.id ?? '',
            senderName: currentUser?.name ?? '',
            senderRole: currentUser?.role,
            text: p.text,
            timestamp: p.timestamp,
            sendStatus: p.status,
          }),
        ),
    ],
    [messages, pending, activeChannel, currentUser?.id, currentUser?.name, currentUser?.role],
  );

  const supportListMessages = useMemo(
    () =>
      supportMessages
        .filter((m) => (currentUser?.role === 'user' ? true : m.studentId === effectiveStudentId))
        .map(supportToList),
    [supportMessages, currentUser?.role, effectiveStudentId],
  );

  const mainTabs: TabItem[] = [
    { key: 'group', label: 'Kanäle', count: activeTab === 'group' ? 0 : totalGroupUnread },
    {
      key: 'support',
      label: isModOrAdmin ? 'Anfragen' : 'Ausbilderchat',
      count: activeTab === 'support' ? 0 : supportUnreadCount,
    },
  ];

  const channelTabs: TabItem[] = sortedChannels.map((ch) => ({
    key: ch,
    label: ch,
    count: ch === activeChannel ? 0 : channelUnreadCounts[ch] || 0,
  }));

  const unreadSince =
    unreadMarker && unreadMarker.channel === activeChannel && unreadMarker.since > 0 ? unreadMarker.since : null;

  // --- Darstellung ---
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: screenBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text accessibilityLiveRegion="polite" style={[styles.loadingText, { color: colors.textMuted }]}>
          Chat wird geladen …
        </Text>
      </View>
    );
  }

  if (loadError && !currentUser) {
    return (
      <View style={[styles.center, styles.errorBox, { backgroundColor: screenBg }]}>
        <StatusMessage status={{ tone: 'error', message: 'Der Chat konnte nicht geladen werden. Prüfe deine Verbindung.' }} />
        <Button
          variant="secondary"
          icon={RefreshCw}
          title="Erneut versuchen"
          onPress={() => {
            setLoading(true);
            loadData(true);
          }}
          style={styles.retryButton}
        />
      </View>
    );
  }

  const statusLine = status ? (
    <View style={styles.statusLine}>
      <StatusMessage status={status} style={styles.statusMessage} />
    </View>
  ) : null;

  const paneHeader = (title: string, trailing?: ReactNode) => (
    <View style={[styles.paneHeader, { borderBottomColor: colors.border }]}>
      <Heading level={2} style={styles.paneTitle}>
        {title}
      </Heading>
      {trailing}
    </View>
  );

  const renderGroup = () => (
    <View style={[styles.flex, isSplitView && styles.row]}>
      {isSplitView ? (
        <ChannelSidebar title="Kanäle" items={channelTabs} selectedKey={activeChannel} onSelect={handleSelectChannel} />
      ) : (
        <Tabs
          scrollable
          items={channelTabs}
          selectedKey={activeChannel}
          onSelect={handleSelectChannel}
          accessibilityLabel="Kanäle"
        />
      )}
      <ChatKeyboardPane>
        {isSplitView ? paneHeader(activeChannel) : null}
        <MessageList
          key={`group-${activeChannel}`}
          messages={channelMessages}
          currentUserId={currentUser?.id}
          now={now}
          unreadSince={unreadSince}
          getSender={getSender}
          canOpenActions={canOpenGroupActions}
          onOpenActions={handleOpenGroupActions}
          onOpenProfile={handleOpenProfile}
          onRetry={handleRetry}
          onDiscard={handleDiscard}
          reduceMotion={reduceMotion}
          empty={<ChatNotice title="Noch keine Nachrichten" text={`Schreib die erste Nachricht in „${activeChannel}“.`} />}
        />
        {statusLine}
        {myRestriction ? (
          <ChatRestrictionNotice timeoutUntil={myRestriction.type === 'timeout' ? myRestriction.until : undefined} />
        ) : (
          <ChatComposer
            inputRef={composerRef}
            value={groupDrafts[activeChannel] ?? ''}
            onChangeText={(text) => setGroupDrafts((prev) => ({ ...prev, [activeChannel]: text }))}
            onSend={handleSendMessage}
            label={`Nachricht an ${activeChannel}`}
          />
        )}
      </ChatKeyboardPane>
    </View>
  );

  const renderSupportConversation = (options: { studentName?: string; header?: ReactNode; listHeader?: ReactElement }) => {
    const targetId = supportTargetId ?? '';
    return (
      <ChatKeyboardPane>
        {options.header}
        <MessageList
          key={`support-${targetId}`}
          messages={supportListMessages}
          currentUserId={currentUser?.id}
          now={now}
          getSender={getSender}
          canOpenActions={canOpenSupportActions}
          onOpenActions={handleOpenSupportActions}
          onOpenProfile={handleOpenProfile}
          reduceMotion={reduceMotion}
          header={options.listHeader ?? null}
          empty={options.listHeader ? null : <ChatNotice text="Noch keine Nachrichten in diesem Chat." />}
        />
        {statusLine}
        <ChatComposer
          inputRef={composerRef}
          value={supportDrafts[targetId] ?? ''}
          onChangeText={(text) => setSupportDrafts((prev) => ({ ...prev, [targetId]: text }))}
          onSend={handleSendSupportMessage}
          label={options.studentName ? `Antwort an ${options.studentName}` : 'Frage an deinen Ausbilder'}
          onAttach={isModOrAdmin ? handlePickSupportImage : undefined}
          attaching={attaching}
        />
      </ChatKeyboardPane>
    );
  };

  const deleteThreadButton = (studentId: string, studentName: string) =>
    isAdmin ? (
      <IconButton
        icon={Trash2}
        tone="danger"
        accessibilityLabel={`Chatverlauf mit ${formatDisplayNameWithInitial(studentName)} löschen`}
        onPress={() => requestDeleteThread(studentId, studentName, null)}
      />
    ) : null;

  const threadListHeader = (
    <Heading level={2} style={styles.listTitle}>
      {`Anfragen von Schülern (${supportThreads.length})`}
    </Heading>
  );
  const threadListEmpty = (
    <ChatNotice
      title="Keine offenen Anfragen"
      text="Neue Fragen von Schülern erscheinen hier."
      style={styles.noticePadding}
    />
  );

  const renderSupport = () => {
    if (!currentUser) return null;

    if (currentUser.role === 'user') {
      return renderSupportConversation({
        listHeader: <ChatNotice text="Hier kannst du deinem Ausbilder Fragen stellen." />,
      });
    }

    const threadList = (
      <ThreadList
        threads={sortedSupportThreads}
        selectedId={isSplitView ? effectiveStudentId : null}
        isUnread={isThreadUnread}
        now={now}
        canDelete={isAdmin}
        onOpen={openThread}
        onDelete={(thread, trigger) => requestDeleteThread(thread.studentId, thread.studentName, trigger)}
        registerRow={(id, row) => {
          threadRowRefs.current[id] = row;
        }}
        header={threadListHeader}
        empty={threadListEmpty}
      />
    );

    if (isSplitView) {
      const name = formatDisplayNameWithInitial(effectiveStudentName);
      return (
        <View style={[styles.flex, styles.row]}>
          <View style={[styles.threadSidebar, { borderRightColor: colors.border }]}>{threadList}</View>
          {effectiveStudentId ? (
            renderSupportConversation({
              studentName: name,
              header: paneHeader(name, deleteThreadButton(effectiveStudentId, effectiveStudentName)),
            })
          ) : (
            <View style={styles.flex}>
              <ChatNotice text="Wähle links eine Anfrage aus." style={styles.noticePadding} />
            </View>
          )}
        </View>
      );
    }

    if (!selectedStudentId) return threadList;

    const name = formatDisplayNameWithInitial(selectedStudentName);
    return renderSupportConversation({
      studentName: name,
      header: (
        <View style={[styles.paneHeader, styles.threadHeader, { borderBottomColor: colors.border }]}>
          <Button
            ref={backButtonRef}
            variant="text"
            icon={ChevronLeft}
            title="Anfragen"
            accessibilityLabel="Zurück zu den Anfragen"
            align="start"
            onPress={closeThread}
          />
          <Heading level={2} style={[styles.paneTitle, styles.threadTitle]}>
            {name}
          </Heading>
          {deleteThreadButton(selectedStudentId, selectedStudentName)}
        </View>
      ),
    });
  };

  // Dialog-Inhalte
  const actionDialogTitle = (() => {
    if (!actionTarget || !currentUser) return '';
    const msg = actionTarget.message;
    if (msg.senderId === currentUser.id) return 'Deine Nachricht';
    const raw = actionTarget.source === 'group' ? actionTarget.message.sender : actionTarget.message.senderName;
    return `Nachricht von ${formatDisplayNameWithInitial(usersMap[msg.senderId]?.name || raw)}`;
  })();

  const confirmContent = (() => {
    if (!confirm) return null;
    switch (confirm.kind) {
      case 'deleteMessage':
      case 'deleteSupportMessage':
        return {
          title: 'Nachricht löschen?',
          message: 'Die Nachricht wird für alle entfernt.',
          confirmTitle: 'Nachricht löschen',
          loadingTitle: 'Wird gelöscht …',
          icon: Trash2,
          destructive: true,
        };
      case 'deleteThread': {
        const name = formatDisplayNameWithInitial(confirm.studentName);
        return {
          title: 'Chatverlauf löschen?',
          message: `Alle Nachrichten mit ${name} werden gelöscht. Das lässt sich nicht rückgängig machen.`,
          confirmTitle: 'Chatverlauf löschen',
          loadingTitle: 'Wird gelöscht …',
          icon: Trash2,
          destructive: true,
        };
      }
      case 'timeout': {
        const name = formatDisplayNameWithInitial(confirm.userName);
        return {
          title: `${name} stummschalten?`,
          message: `${name} kann 24 Stunden lang keine Nachrichten im Chat senden.`,
          confirmTitle: '24 Stunden stummschalten',
          loadingTitle: 'Wird gespeichert …',
          icon: Clock,
          destructive: false,
        };
      }
      case 'ban': {
        const name = formatDisplayNameWithInitial(confirm.userName);
        return {
          title: `${name} dauerhaft sperren?`,
          message: `${name} kann keine Nachrichten mehr im Chat senden, bis die Sperre aufgehoben wird.`,
          confirmTitle: 'Dauerhaft sperren',
          loadingTitle: 'Wird gespeichert …',
          icon: Ban,
          destructive: true,
        };
      }
      case 'unban': {
        const name = formatDisplayNameWithInitial(confirm.userName);
        return {
          title: 'Sperre aufheben?',
          message: `${name} kann danach wieder Nachrichten im Chat senden.`,
          confirmTitle: 'Sperre aufheben',
          loadingTitle: 'Wird gespeichert …',
          icon: ShieldCheck,
          destructive: false,
        };
      }
    }
  })();

  const viewingRestriction = viewingUser ? findRestriction(chatBans, viewingUser.id, now) : null;
  const canModerateViewing = Boolean(
    viewingUser &&
      currentUser &&
      isModOrAdmin &&
      viewingUser.id !== currentUser.id &&
      (currentUser.role === 'admin' || usersMap[viewingUser.id]?.role === 'user'),
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.screen, { backgroundColor: screenBg }]}>
      <View style={[styles.column, isTablet && styles.columnWide]}>
        <Tabs items={mainTabs} selectedKey={activeTab} onSelect={handleSelectTab} accessibilityLabel="Chat-Bereiche" />
        <View style={styles.flex}>{activeTab === 'group' ? renderGroup() : renderSupport()}</View>
      </View>

      <ActionDialog
        visible={actionTarget !== null}
        title={actionDialogTitle}
        description={actionTarget ? `„${truncate(actionTarget.message.text, 80)}“` : undefined}
        actions={actionTarget ? buildActions(actionTarget) : []}
        onClose={() => {
          setActionTarget(null);
          restoreFocus();
        }}
      />

      <ConfirmDialog
        visible={confirm !== null && confirmContent !== null}
        title={confirmContent?.title ?? ''}
        message={confirmContent?.message ?? ''}
        confirmTitle={confirmContent?.confirmTitle ?? ''}
        confirmLoadingTitle={confirmContent?.loadingTitle}
        confirmIcon={confirmContent?.icon}
        destructive={confirmContent?.destructive}
        loading={confirmLoading}
        error={confirmError}
        onConfirm={runConfirm}
        onCancel={cancelConfirm}
      />

      <ConfirmDialog
        visible={reportTarget !== null}
        title="Nachricht melden?"
        message={`Warum meldest du die Nachricht von ${formatDisplayNameWithInitial(
          (reportTarget && (usersMap[reportTarget.senderId]?.name || reportTarget.sender)) || '',
        )}?`}
        confirmTitle="Melden"
        confirmLoadingTitle="Wird gemeldet …"
        confirmIcon={Flag}
        loading={reportLoading}
        error={reportError}
        onConfirm={submitReport}
        onCancel={() => {
          setReportTarget(null);
          restoreFocus();
        }}
      >
        <RadioGroup
          options={REPORT_REASONS}
          value={reportReason}
          onChange={(value) => {
            setReportReason(value);
            setReportError(null);
          }}
          accessibilityLabel="Grund der Meldung"
          style={styles.reportOptions}
        />
      </ConfirmDialog>

      <UserProfileDialog
        visible={viewingUser !== null}
        name={formatDisplayNameWithInitial(viewingUser?.name)}
        avatarUrl={viewingUser?.avatarUrl}
        roleLabel={viewingUser?.role ? viewingUser.title?.trim() || getRoleLabel(viewingUser.role, roles) : ''}
        roleKind={viewingUser?.role === 'admin' ? 'admin' : viewingUser?.role === 'moderator' ? 'moderator' : null}
        onClose={() => setViewingUser(null)}
        moderation={
          viewingUser && canModerateViewing
            ? {
                restriction: viewingRestriction,
                onTimeout: () =>
                  switchModal(
                    () => setViewingUser(null),
                    () => openConfirm({ kind: 'timeout', userId: viewingUser.id, userName: viewingUser.name }),
                  ),
                onBan: () =>
                  switchModal(
                    () => setViewingUser(null),
                    () => openConfirm({ kind: 'ban', userId: viewingUser.id, userName: viewingUser.name }),
                  ),
                onUnban: () =>
                  switchModal(
                    () => setViewingUser(null),
                    () => openConfirm({ kind: 'unban', userId: viewingUser.id, userName: viewingUser.name }),
                  ),
              }
            : null
        }
      />

      <LiveAnnouncer message={announcement?.message ?? null} id={announcement?.id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  column: {
    flex: 1,
    width: '100%',
  },
  columnWide: {
    maxWidth: WIDE_MAX_WIDTH,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    lineHeight: 22,
  },
  errorBox: {
    paddingHorizontal: SCREEN_PADDING,
    alignItems: 'stretch',
  },
  retryButton: {
    marginTop: 16,
  },
  statusLine: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 8,
  },
  statusMessage: {
    marginTop: 0,
  },
  paneHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SCREEN_PADDING,
    borderBottomWidth: 1,
  },
  paneTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  threadHeader: {
    paddingRight: SCREEN_PADDING - 12,
  },
  threadTitle: {
    textAlign: 'center',
  },
  threadSidebar: {
    width: 320,
    borderRightWidth: 1,
  },
  listTitle: {
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
    paddingBottom: 12,
  },
  noticePadding: {
    paddingHorizontal: SCREEN_PADDING,
  },
  reportOptions: {
    marginTop: 12,
  },
});
