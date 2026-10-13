import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Keyboard,
  Dimensions,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockDb, ChatMessage, Category, User as DbUser, SupportMessage, RoleDefinition, ChatBanRecord } from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import * as ImagePicker from 'expo-image-picker';
import { optimizeImage, uploadAndOptimizeImage } from '../utils/imageOptimizer';
import { 
  Send, 
  MessageSquare, 
  Trash2, 
  Users, 
  UserCheck, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Camera,
  MessageCircle,
  HelpCircle,
  X,
  User as UserIcon,
  Bell,
  BellOff,
  Flag,
  Wifi,
  Clock,
  ShieldAlert,
  Ban,
  CheckCircle2
} from 'lucide-react-native';
import { 
  requestNotificationPermissions, 
  getIsChatMuted, 
  setIsChatMuted, 
  sendChatNotification,
  sendSupportNotification,
  formatDisplayNameWithInitial
} from '../services/notificationService';

const isImgUri = (uri?: string) => Boolean(uri && (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('data:')));

const getRoleLabel = (role?: string, rolesList?: RoleDefinition[]) => {
  if (rolesList) {
    const found = rolesList.find(r => r.id === role);
    if (found) return found.name;
  }
  switch (role) {
    case 'admin': return 'Ausbilder';
    case 'moderator': return 'Mod';
    default: return 'Schüler';
  }
};

const getRoleColor = (role?: string, rolesList?: RoleDefinition[], isDark: boolean = false) => {
  if (rolesList) {
    const found = rolesList.find(r => r.id === role);
    if (found) return { bg: found.color + (isDark ? '35' : '20'), text: isDark ? '#ffffff' : found.color };
  }
  switch (role) {
    case 'admin': return { bg: isDark ? '#7f1d1d' : '#fee2e2', text: isDark ? '#fca5a5' : '#b91c1c' };
    case 'moderator': return { bg: isDark ? '#7c2d12' : '#ffedd5', text: isDark ? '#fdba74' : '#c2410c' };
    default: return { bg: isDark ? '#312e81' : '#e0e7ff', text: isDark ? '#c7d2fe' : '#4338ca' };
  }
};

export default function ChatScreen() {
  const { isDark, colors: appColors } = useAppTheme();
  const { isTablet, isLandscape, isSplitView, contentMaxWidth } = useDeviceLayout();

  // --- HAUPT-TABS FÜR CHAT ---
  // 'group' (Fach-Chat) | 'support' (Ausbilder-Direktchat)
  const [activeTab, setActiveTab] = useState<'group' | 'support'>('group');

  // --- COMMON STATES ---
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [usersMap, setUsersMap] = useState<{ [id: string]: DbUser }>({});
  const [viewingUser, setViewingUser] = useState<{ id: string; name: string; avatarUrl?: string; role?: string; title?: string } | null>(null);
  const [chatBans, setChatBans] = useState<ChatBanRecord[]>([]);

  // --- FACH-CHAT (GROUP) STATES ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('Allgemein');
  const [inputText, setInputText] = useState('');
  const [channelReadTimes, setChannelReadTimes] = useState<{ [ch: string]: number }>({});

  // Gespeicherte Gelesen-Zeitstempel laden
  useEffect(() => {
    AsyncStorage.getItem('@chat_channels_last_read').then(val => {
      if (val) {
        try {
          setChannelReadTimes(JSON.parse(val));
        } catch {}
      }
    });
  }, []);

  // Aktiven Kanal als gelesen markieren
  useEffect(() => {
    if (activeChannel && activeTab === 'group') {
      const now = Date.now();
      setChannelReadTimes(prev => {
        const next = { ...prev, [activeChannel]: now };
        AsyncStorage.setItem('@chat_channels_last_read', JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, [activeChannel, activeTab, messages.length]);

  // Kanäle sortieren: #Allgemein ist IMMER an 1. Stelle (Index 0).
  // Alle anderen Kanäle sortieren dynamisch nach dem Zeitstempel der neuesten Nachricht (neueste vorne an 2. Stelle!).
  const sortedChannels = React.useMemo(() => {
    const otherChannelNames = categories
      .map(c => c.name)
      .filter(name => name && name !== 'Allgemein' && !name.startsWith('__'));

    const channelLatestTime: { [ch: string]: number } = {};
    otherChannelNames.forEach(ch => {
      const chMsgs = messages.filter(m => (m.category || 'Allgemein') === ch);
      channelLatestTime[ch] = chMsgs.length > 0 ? Math.max(...chMsgs.map(m => m.timestamp)) : 0;
    });

    otherChannelNames.sort((a, b) => {
      const timeA = channelLatestTime[a] || 0;
      const timeB = channelLatestTime[b] || 0;
      if (timeB !== timeA) return timeB - timeA;
      return a.localeCompare(b);
    });

    return ['Allgemein', ...otherChannelNames];
  }, [categories, messages]);

  // Ungelesene Nachrichten pro Kanal zählen
  const channelUnreadCounts = React.useMemo(() => {
    const unreadMap: { [ch: string]: number } = {};
    sortedChannels.forEach(ch => {
      if (ch === activeChannel && activeTab === 'group') {
        unreadMap[ch] = 0;
      } else {
        const lastRead = channelReadTimes[ch] || 0;
        const count = messages.filter(
          m => (m.category || 'Allgemein') === ch && m.senderId !== currentUser?.id && m.timestamp > lastRead
        ).length;
        unreadMap[ch] = count;
      }
    });
    return unreadMap;
  }, [sortedChannels, messages, channelReadTimes, activeChannel, activeTab, currentUser?.id]);

  // Gesamtanzahl ungelesener Gruppen-Nachrichten
  const totalGroupUnread = React.useMemo(() => {
    return Object.values(channelUnreadCounts).reduce((sum, c) => sum + c, 0);
  }, [channelUnreadCounts]);

  // --- AUSBILDER-CHAT (SUPPORT) STATES ---
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportThreads, setSupportThreads] = useState<{ studentId: string; studentName: string; lastMessage: string; timestamp: number; lastSenderId?: string; lastSenderRole?: string }[]>([]);
  const [supportInputText, setSupportInputText] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [supportLastReadTime, setSupportLastReadTime] = useState<number>(0);
  const [threadReadTimes, setThreadReadTimes] = useState<{ [studentId: string]: number }>({});

  // Gespeicherte Gelesen-Zeitstempel für Support-Chat (Schüler) laden
  useEffect(() => {
    AsyncStorage.getItem('@chat_support_last_read').then(val => {
      if (val) {
        try {
          setSupportLastReadTime(parseInt(val, 10) || 0);
        } catch {}
      }
    });
  }, []);

  // Gespeicherte Gelesen-Zeitstempel für Support-Threads (separat pro Admin/Mod-Account) laden
  useEffect(() => {
    if (currentUser?.id) {
      AsyncStorage.getItem(`@chat_support_threads_read_${currentUser.id}`).then(val => {
        if (val) {
          try {
            setThreadReadTimes(JSON.parse(val));
          } catch {}
        }
      });
    }
  }, [currentUser?.id]);

  // Aktiven Support-Tab als gelesen markieren (für Schüler)
  useEffect(() => {
    if (activeTab === 'support' && currentUser?.role === 'user') {
      const now = Date.now();
      setSupportLastReadTime(now);
      AsyncStorage.setItem('@chat_support_last_read', String(now)).catch(() => {});
    }
  }, [activeTab, currentUser?.role, supportMessages.length]);

  // Aktiven Schüler-Thread als gelesen markieren (für Admin/Mod)
  useEffect(() => {
    if (selectedStudentId && currentUser?.id && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
      const now = Date.now();
      setThreadReadTimes(prev => {
        const next = { ...prev, [selectedStudentId]: now };
        AsyncStorage.setItem(`@chat_support_threads_read_${currentUser.id}`, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, [selectedStudentId, currentUser?.id, currentUser?.role, supportMessages.length]);

  // Prüft, ob ein Thread für diesen Admin/Mod ungelesene Nachrichten hat
  const isThreadUnread = React.useCallback((thread: { studentId: string; timestamp: number; lastSenderId?: string }) => {
    const lastRead = threadReadTimes[thread.studentId] || 0;
    return thread.timestamp > lastRead && thread.lastSenderId !== currentUser?.id;
  }, [threadReadTimes, currentUser?.id]);

  // Threads sortieren: Ungelesene Chats IMMER ganz nach oben, danach chronologisch nach neuster Nachricht
  const sortedSupportThreads = React.useMemo(() => {
    return [...supportThreads].sort((a, b) => {
      const aUnread = isThreadUnread(a);
      const bUnread = isThreadUnread(b);

      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return b.timestamp - a.timestamp;
    });
  }, [supportThreads, isThreadUnread]);

  // Ungelesene Ausbilderchat-Nachrichten zählen
  const supportUnreadCount = React.useMemo(() => {
    if (!currentUser) return 0;
    if (currentUser.role === 'user') {
      if (activeTab === 'support') return 0;
      // Schüler: Nachrichten von Ausbildern prüfen
      return supportMessages.filter(
        m => m.senderId !== currentUser.id && m.timestamp > supportLastReadTime
      ).length;
    } else {
      // Ausbilder/Mod: Anfragen von Schülern prüfen, die für diesen Account ungelesen sind
      return supportThreads.filter(t => isThreadUnread(t)).length;
    }
  }, [activeTab, currentUser, supportMessages, supportThreads, supportLastReadTime, isThreadUnread]);

  const scrollViewRef = useRef<ScrollView>(null);
  const supportScrollViewRef = useRef<ScrollView>(null);
  const prevLastMsgIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const prevLastSupportMsgIdRef = useRef<string | null>(null);
  const prevSupportThreadsTimestampRef = useRef<number>(0);
  const shouldAutoScrollGroupRef = useRef(true);
  const shouldAutoScrollSupportRef = useRef(true);

  // Immer automatisch nach ganz unten scrollen, wenn der Chat geöffnet oder der Kanal gewechselt wird
  useEffect(() => {
    shouldAutoScrollGroupRef.current = true;
    shouldAutoScrollSupportRef.current = true;

    const t1 = setTimeout(() => {
      if (activeTab === 'group') {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      } else {
        supportScrollViewRef.current?.scrollToEnd({ animated: false });
      }
    }, 50);

    const t2 = setTimeout(() => {
      if (activeTab === 'group') {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      } else {
        supportScrollViewRef.current?.scrollToEnd({ animated: false });
      }
    }, 250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeChannel, activeTab, selectedStudentId, loading]);

  // Tablet Split-View: Automatisch den ersten Schüler-Thread auswählen, wenn noch keiner gewählt ist
  useEffect(() => {
    if (isSplitView && !selectedStudentId && sortedSupportThreads.length > 0 && (currentUser?.role === 'admin' || currentUser?.role === 'moderator')) {
      const first = sortedSupportThreads[0];
      setSelectedStudentId(first.studentId);
      setSelectedStudentName(first.studentName);
      mockDb.getSupportMessages(first.studentId).then(msgs => {
        setSupportMessages(msgs);
      });
    }
  }, [isSplitView, sortedSupportThreads.length, currentUser?.role, selectedStudentId]);

  // Themes Colors
  const colors = {
    ...appColors,
    chatBubbleUser: isDark ? '#2563eb' : '#dbeafe',
    chatTextUser: isDark ? '#ffffff' : '#1e3a8a',
    chatBubbleOther: isDark ? '#374151' : '#ffffff',
    chatTextOther: isDark ? '#ffffff' : '#0f172a',
  };

  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
    getIsChatMuted().then(setIsMuted);

    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
      setIsInputFocused(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        supportScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        supportScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    };

    const onHide = () => {
      setKeyboardHeight(0);
      setIsInputFocused(false);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );
    const showSubWill = Platform.OS === 'android' ? Keyboard.addListener('keyboardWillShow', onShow) : null;
    const hideSubWill = Platform.OS === 'android' ? Keyboard.addListener('keyboardWillHide', onHide) : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      if (showSubWill) showSubWill.remove();
      if (hideSubWill) hideSubWill.remove();
    };
  }, []);

  // Dynamische Verschiebung inkl. Puffer für die obere Tastatur-Toolbar (GIFs, Einstellungen, Zwischenablage etc.)
  const dynamicKeyboardPadding = keyboardHeight > 0 ? keyboardHeight + 48 : 0;

  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    await setIsChatMuted(next);
    Alert.alert(
      next ? '🔇 Chat stummgeschaltet' : '🔔 Benachrichtigungen aktiv',
      next 
        ? 'Du erhältst keine Benachrichtigungen mehr bei neuen Chat-Nachrichten.' 
        : 'Du wirst benachrichtigt, sobald neue Nachrichten im Chat eingehen.'
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await mockDb.getCurrentUser();
      setCurrentUser(user);
      const allRoles = await mockDb.getRoles();
      setRoles(allRoles);
      const allMsgs = await mockDb.getChatMessages();
      setMessages(allMsgs);
      if (allMsgs.length > 0) {
        prevLastMsgIdRef.current = allMsgs[allMsgs.length - 1].id;
      }
      const allCategories = await mockDb.getCategories();
      setCategories(allCategories);
      
      const allUsers = await mockDb.getUsers();
      const uMap: { [id: string]: DbUser } = {};
      allUsers.forEach(u => { uMap[u.id] = u; });
      setUsersMap(uMap);

      const bans = await mockDb.getChatBans();
      setChatBans(bans);

      if (user) {
        if (user.role === 'user') {
          const supMsgs = await mockDb.getSupportMessages(user.id);
          setSupportMessages(supMsgs);
          if (supMsgs.length > 0) {
            prevLastSupportMsgIdRef.current = supMsgs[supMsgs.length - 1].id;
          }
        } else {
          const threads = await mockDb.getSupportThreads();
          setSupportThreads(threads);
          if (threads.length > 0) {
            prevSupportThreadsTimestampRef.current = Math.max(...threads.map(t => t.timestamp));
          }
          if (selectedStudentId) {
            const threadMsgs = await mockDb.getSupportMessages(selectedStudentId);
            setSupportMessages(threadMsgs);
          }
        }
      }
      isInitialLoadRef.current = false;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Regelmäßiger Sync im Hintergrund inkl. Push/In-App Benachrichtigungen
  useEffect(() => {
    const interval = setInterval(async () => {
      const user = await mockDb.getCurrentUser();
      setCurrentUser(user);
      const allRoles = await mockDb.getRoles();
      setRoles(allRoles);
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
      
      setMessages(allMsgs);
      const allCategories = await mockDb.getCategories();
      setCategories(allCategories);
      
      const allUsers = await mockDb.getUsers();
      const uMap: { [id: string]: DbUser } = {};
      allUsers.forEach(u => { uMap[u.id] = u; });
      setUsersMap(uMap);

      const bans = await mockDb.getChatBans();
      setChatBans(bans);

      if (user) {
        if (user.role === 'user') {
          const supMsgs = await mockDb.getSupportMessages(user.id);
          if (supMsgs.length > 0) {
            const lastSupMsg = supMsgs[supMsgs.length - 1];
            if (!isInitialLoadRef.current && prevLastSupportMsgIdRef.current && prevLastSupportMsgIdRef.current !== lastSupMsg.id) {
              if (lastSupMsg.senderId !== user.id) {
                // Neuer Ausbilder-Antwort eingegangen -> Benachrichtigung
                sendSupportNotification(lastSupMsg.senderName, lastSupMsg.text, false, lastSupMsg.id);
              }
            }
            prevLastSupportMsgIdRef.current = lastSupMsg.id;
          }
          setSupportMessages(supMsgs);
        } else {
          const threads = await mockDb.getSupportThreads();
          if (threads.length > 0) {
            const maxTimestamp = Math.max(...threads.map(t => t.timestamp));
            if (!isInitialLoadRef.current && prevSupportThreadsTimestampRef.current && maxTimestamp > prevSupportThreadsTimestampRef.current) {
              const latestThread = threads[0];
              // Neue Schüler-Frage eingegangen -> Benachrichtigung an Ausbilder/Mod
              sendSupportNotification(latestThread.studentName, latestThread.lastMessage, true);
            }
            prevSupportThreadsTimestampRef.current = maxTimestamp;
          }
          setSupportThreads(threads);
          if (selectedStudentId) {
            const threadMsgs = await mockDb.getSupportMessages(selectedStudentId);
            setSupportMessages(threadMsgs);
          }
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedStudentId]);

  const handleOpenUserProfile = (userId: string, fallbackName: string, fallbackRole?: string) => {
    const found = usersMap[userId];
    if (found) {
      setViewingUser({
        id: userId,
        name: found.name,
        avatarUrl: found.avatarUrl,
        role: found.role,
        title: found.title,
      });
    } else {
      setViewingUser({
        id: userId,
        name: fallbackName,
        role: fallbackRole,
      });
    }
  };

  // Prüfen, ob der aktuell angemeldete Benutzer einen aktiven Timeout oder Bann hat
  const myBanStatus = React.useMemo(() => {
    if (!currentUser?.id) return { isRestricted: false, isPermanent: false, isTimeout: false, timeoutUntil: undefined, reason: '' };
    const ban = chatBans.find(b => b.targetUserId === currentUser.id);
    if (!ban) return { isRestricted: false, isPermanent: false, isTimeout: false, timeoutUntil: undefined, reason: '' };
    if (ban.type === 'timeout_1d') {
      if (ban.timeoutUntil && Date.now() < ban.timeoutUntil) {
        return { isRestricted: true, isPermanent: false, isTimeout: true, timeoutUntil: ban.timeoutUntil, reason: ban.reason };
      }
      return { isRestricted: false, isPermanent: false, isTimeout: false, timeoutUntil: undefined, reason: '' };
    }
    return { isRestricted: true, isPermanent: true, isTimeout: false, timeoutUntil: undefined, reason: ban.reason };
  }, [chatBans, currentUser?.id]);

  const isModOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // --- MODERATION ACTIONS (TIMEOUT & BAN FÜR MODS & AUSBILDER) ---
  const handleSetUserTimeout = (targetUserId: string, targetUserName: string) => {
    if (!currentUser || !isModOrAdmin) return;
    Alert.alert(
      '⏱️ 1 Tag Timeout verhängen',
      `Möchtest du ${formatDisplayNameWithInitial(targetUserName)} für 24 Stunden im Chat stummschalten?\n\nDer Nutzer kann für 1 Tag keine Chatnachrichten mehr senden.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: '1 Tag Timeout verhängen',
          style: 'destructive',
          onPress: async () => {
            try {
              await mockDb.setChatBan(targetUserId, targetUserName, 'timeout_1d', currentUser);
              const updatedBans = await mockDb.getChatBans();
              setChatBans(updatedBans);
              Alert.alert('Timeout aktiv ✅', `${formatDisplayNameWithInitial(targetUserName)} wurde für 24 Stunden stummgeschaltet.`);
            } catch (e) {
              Alert.alert('Fehler', 'Konnte Timeout nicht verhängen.');
            }
          }
        }
      ]
    );
  };

  const handleSetUserBan = (targetUserId: string, targetUserName: string) => {
    if (!currentUser || !isModOrAdmin) return;
    Alert.alert(
      '🚫 Im Chat bannen',
      `Möchtest du ${formatDisplayNameWithInitial(targetUserName)} dauerhaft aus dem Chat verbannen?\n\nDer Nutzer kann keine Chatnachrichten mehr senden.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Dauerhaft bannen',
          style: 'destructive',
          onPress: async () => {
            try {
              await mockDb.setChatBan(targetUserId, targetUserName, 'permanent', currentUser);
              const updatedBans = await mockDb.getChatBans();
              setChatBans(updatedBans);
              Alert.alert('Gebannt ✅', `${formatDisplayNameWithInitial(targetUserName)} wurde im Chat gesperrt.`);
            } catch (e) {
              Alert.alert('Fehler', 'Konnte Sperre nicht verhängen.');
            }
          }
        }
      ]
    );
  };

  const handleRemoveUserBan = (targetUserId: string, targetUserName: string) => {
    if (!currentUser || !isModOrAdmin) return;
    Alert.alert(
      'Sperre aufheben 🟢',
      `Möchtest du den Timeout / die Sperre für ${formatDisplayNameWithInitial(targetUserName)} aufheben?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Sperre aufheben',
          onPress: async () => {
            try {
              await mockDb.removeChatBan(targetUserId);
              const updatedBans = await mockDb.getChatBans();
              setChatBans(updatedBans);
              Alert.alert('Entsperrt ✅', `Die Sperre für ${formatDisplayNameWithInitial(targetUserName)} wurde aufgehoben.`);
            } catch (e) {
              Alert.alert('Fehler', 'Konnte Sperre nicht aufheben.');
            }
          }
        }
      ]
    );
  };

  const handleModerationMenu = (targetUserId: string, targetUserName: string) => {
    if (!currentUser || !isModOrAdmin || targetUserId === currentUser.id) return;
    const existingBan = chatBans.find(b => b.targetUserId === targetUserId);
    const isCurrentlyRestricted = existingBan && (existingBan.type === 'permanent' || (existingBan.type === 'timeout_1d' && (!existingBan.timeoutUntil || Date.now() < existingBan.timeoutUntil)));

    if (isCurrentlyRestricted) {
      Alert.alert(
        `Moderation: ${formatDisplayNameWithInitial(targetUserName)}`,
        existingBan?.type === 'timeout_1d'
          ? `Aktueller Status: ⏱️ 1-Tag Timeout aktiv (bis ${new Date(existingBan.timeoutUntil!).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})`
          : 'Aktueller Status: 🚫 Dauerhaft im Chat gebannt',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: '🟢 Sperre aufheben',
            onPress: () => handleRemoveUserBan(targetUserId, targetUserName),
          }
        ]
      );
    } else {
      Alert.alert(
        `Moderation: ${formatDisplayNameWithInitial(targetUserName)}`,
        'Wähle eine Moderationsmaßnahme für diesen Benutzer:',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: '⏱️ 1 Tag Timeout',
            style: 'destructive',
            onPress: () => handleSetUserTimeout(targetUserId, targetUserName),
          },
          {
            text: '🚫 Dauerhaft bannen',
            style: 'destructive',
            onPress: () => handleSetUserBan(targetUserId, targetUserName),
          }
        ]
      );
    }
  };

  // --- AUSBILDERCHAT LÖSCHEN (NUR ADMINS) ---
  const handleDeleteSupportThread = (studentId: string, studentName: string) => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Keine Berechtigung', 'Nur Administratoren / Ausbilder können Ausbilderchats löschen.');
      return;
    }
    Alert.alert(
      'Ausbilderchat löschen? 🗑️',
      `Möchtest du den gesamten Chatverlauf mit „${formatDisplayNameWithInitial(studentName)}“ wirklich unwiderruflich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Endgültig löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await mockDb.deleteSupportThread(studentId);
              setSupportThreads(prev => prev.filter(t => t.studentId !== studentId));
              if (selectedStudentId === studentId) {
                setSelectedStudentId(null);
                setSupportMessages([]);
              }
              Alert.alert('Gelöscht ✅', `Der Chatverlauf mit ${formatDisplayNameWithInitial(studentName)} wurde gelöscht.`);
            } catch (e) {
              Alert.alert('Fehler', 'Konnte Chatverlauf nicht löschen.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteSupportMessage = (messageId: string) => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Keine Berechtigung', 'Nur Administratoren können Nachrichten in Ausbilderchats löschen.');
      return;
    }
    Alert.alert(
      'Nachricht löschen?',
      'Möchtest du diese Nachricht aus dem Ausbilderchat löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await mockDb.deleteSupportMessage(messageId);
              setSupportMessages(prev => prev.filter(m => m.id !== messageId));
            } catch (e) {
              Alert.alert('Fehler', 'Konnte Nachricht nicht löschen.');
            }
          }
        }
      ]
    );
  };

  const scrollToBottom = () => {
    if (activeTab === 'group') {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } else {
      supportScrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  // --- FACH-CHAT ACTIONS ---
  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser) return;
    if (myBanStatus.isRestricted) {
      if (myBanStatus.isTimeout && myBanStatus.timeoutUntil) {
        const timeStr = new Date(myBanStatus.timeoutUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        Alert.alert('Chat-Timeout aktiv ⏱️', `Du bist noch bis ${timeStr} im Chat stummgeschaltet und kannst keine Nachrichten senden.`);
      } else {
        Alert.alert('Chat-Sperre 🚫', 'Dein Account wurde dauerhaft aus dem Chat verbannt.');
      }
      return;
    }
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const newMsg = await mockDb.addChatMessage(
        activeChannel,
        currentUser.name,
        currentUser.id,
        currentUser.role,
        textToSend
      );
      shouldAutoScrollGroupRef.current = true;
      setMessages(prev => [...prev, newMsg]);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Nachricht löschen?',
      'Möchtest du diese Nachricht wirklich für alle Benutzer löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            const success = await mockDb.deleteChatMessage(messageId);
            if (success) {
              setMessages(prev => prev.filter(m => m.id !== messageId));
            }
          }
        }
      ]
    );
  };

  const handleReportMessage = (msg: ChatMessage) => {
    const formattedSender = formatDisplayNameWithInitial(msg.sender);
    Alert.alert(
      'Nachricht melden 🚩',
      `Möchtest du die Nachricht von „${formattedSender}“ an die Ausbilder & Moderatoren melden?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Beleidigung / Unangemessen',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            await mockDb.reportChatMessage({
              messageId: msg.id,
              messageText: msg.text,
              messageSenderName: msg.sender,
              messageSenderId: msg.senderId,
              messageCategory: msg.category,
              reporterId: currentUser.id,
              reporterName: currentUser.name,
              reason: 'Beleidigung / Unangemessener Inhalt',
            });
            Alert.alert('Gemeldet ✅', 'Vielen Dank für deine Meldung. Die Ausbilder werden diesen Vorfall prüfen.');
          }
        },
        {
          text: 'Spam / Falschinformation',
          onPress: async () => {
            if (!currentUser) return;
            await mockDb.reportChatMessage({
              messageId: msg.id,
              messageText: msg.text,
              messageSenderName: msg.sender,
              messageSenderId: msg.senderId,
              messageCategory: msg.category,
              reporterId: currentUser.id,
              reporterName: currentUser.name,
              reason: 'Spam / Falschinformation',
            });
            Alert.alert('Gemeldet ✅', 'Vielen Dank für deine Meldung. Die Ausbilder werden diesen Vorfall prüfen.');
          }
        }
      ]
    );
  };

  // --- SUPPORT-CHAT (AUSBILDER) ACTIONS ---
  const handleSendSupportMessage = async () => {
    if (!supportInputText.trim() || !currentUser) return;
    const textToSend = supportInputText.trim();
    setSupportInputText('');

    const targetStudentId = currentUser.role === 'user' ? currentUser.id : selectedStudentId;
    const targetStudentName = currentUser.role === 'user' ? currentUser.name : selectedStudentName;

    if (!targetStudentId) return;

    try {
      const newMsg = await mockDb.addSupportMessage(
        targetStudentId,
        targetStudentName,
        currentUser.id,
        currentUser.name,
        currentUser.role,
        textToSend
      );
      shouldAutoScrollSupportRef.current = true;
      setSupportMessages(prev => [...prev, newMsg]);
      setTimeout(() => {
        supportScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePickSupportImage = async () => {
    if (!currentUser) return;
    const targetStudentId = currentUser.role === 'user' ? currentUser.id : selectedStudentId;
    const targetStudentName = currentUser.role === 'user' ? currentUser.name : selectedStudentName;

    if (!targetStudentId) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung erforderlich', 'Wir benötigen Zugriff auf deine Fotos, um ein Bild zu senden.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const raw = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'chat');

        const newMsg = await mockDb.addSupportMessage(
          targetStudentId,
          targetStudentName,
          currentUser.id,
          currentUser.name,
          currentUser.role,
          '[Foto gesendet]',
          optimizedUri
        );
        setSupportMessages(prev => [...prev, newMsg]);
      }
    } catch (e) {
      Alert.alert('Fehler', 'Konnte das Foto nicht hochladen.');
    }
  };

  const filteredGroupMessages = messages.filter(m => m.category === activeChannel && !m.id?.startsWith('battle_') && !m.category?.startsWith('__'));

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.background },
      isTablet && { maxWidth: 1200, width: '100%', alignSelf: 'center' }
    ]}>
      
      {/* OBERE TAB-NAVIGATION (Gruppen-Chat vs. Ausbilder-Chat & Stummschalten) */}
      <View style={[styles.mainTabsContainer, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'group' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('group')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Users size={16} color={activeTab === 'group' ? colors.primary : colors.textMuted} />
            <Text style={[styles.mainTabText, { color: activeTab === 'group' ? colors.text : colors.textMuted }]}>
              Fach-Gruppenchat
            </Text>
            {totalGroupUnread > 0 && activeTab !== 'group' && (
              <View style={styles.tabUnreadDot} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'support' && { borderBottomColor: colors.primary }]}
          onPress={() => {
            setActiveTab('support');
            loadData();
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <UserCheck size={16} color={activeTab === 'support' ? colors.primary : colors.textMuted} />
            <Text style={[styles.mainTabText, { color: activeTab === 'support' ? colors.text : colors.textMuted }]}>
              Ausbilderchat
            </Text>
            {supportUnreadCount > 0 && activeTab !== 'support' && (
              <View style={styles.tabUnreadDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* STUMMSCHALTEN TOGGLE */}
        <TouchableOpacity
          style={[
            styles.muteHeaderBtn,
            { backgroundColor: isMuted ? '#ef444420' : colors.background, borderColor: isMuted ? '#ef4444' : colors.border }
          ]}
          onPress={handleToggleMute}
          activeOpacity={0.7}
        >
          {isMuted ? <BellOff size={16} color="#ef4444" /> : <Bell size={16} color={colors.textMuted} />}
        </TouchableOpacity>
      </View>

      {/* ================= REITER 1: FACH-GRUPPENCHAT ================= */}
      {activeTab === 'group' && (
        <View style={{ flex: 1, flexDirection: isSplitView ? 'row' : 'column' }}>
          {isSplitView ? (
            /* Tablet Master Sidebar for channels */
            <View style={[styles.tabletSidebar, { backgroundColor: colors.cardBg, borderRightColor: colors.border, width: 260 }]}>
              <View style={[styles.tabletSidebarHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tabletSidebarTitle, { color: colors.textMuted }]}>Kanäle</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 8, gap: 4 }}>
                {sortedChannels.map(ch => {
                  const isSelected = activeChannel === ch;
                  const unreadCount = channelUnreadCounts[ch] || 0;
                  return (
                    <TouchableOpacity
                      key={ch}
                      style={[
                        styles.tabletChannelItem,
                        { 
                          backgroundColor: isSelected ? (isDark ? '#1e3a8a30' : '#eff6ff') : 'transparent',
                          borderLeftColor: isSelected ? colors.primary : 'transparent',
                          borderLeftWidth: 3,
                        }
                      ]}
                      onPress={() => {
                        shouldAutoScrollGroupRef.current = true;
                        setActiveChannel(ch);
                      }}
                    >
                      <Text style={[
                        styles.tabletChannelName, 
                        { 
                          color: isSelected ? colors.primary : colors.text,
                          fontWeight: (isSelected || unreadCount > 0) ? 'bold' : 'normal'
                        }
                      ]}>
                        #{ch}
                      </Text>
                      {unreadCount > 0 && (
                        <View style={styles.channelUnreadBadge}>
                          <Text style={styles.channelUnreadText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[styles.tabletSidebarFooter, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Wifi size={12} color={colors.primary} />
                <Text style={{ fontSize: 11, color: colors.textMuted, flexShrink: 1 }}>
                  Lernkarten & Quiz sind 100% offline nutzbar.
                </Text>
              </View>
            </View>
          ) : (
            /* Mobile Channel Horizontal Selector */
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.channelsContainer}
                >
                  {sortedChannels.map(ch => {
                    const isSelected = activeChannel === ch;
                    const unreadCount = channelUnreadCounts[ch] || 0;
                    return (
                      <TouchableOpacity
                        key={ch}
                        style={[
                          styles.channelTab,
                          { 
                            backgroundColor: isSelected ? colors.primary : colors.cardBg,
                            borderColor: (unreadCount > 0 && !isSelected) ? '#ef4444' : colors.border,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                          }
                        ]}
                        onPress={() => {
                          shouldAutoScrollGroupRef.current = true;
                          setActiveChannel(ch);
                        }}
                      >
                        <Text style={[
                          styles.channelTabText, 
                          { 
                            color: isSelected ? '#ffffff' : (unreadCount > 0 ? '#ef4444' : colors.text),
                            fontWeight: (isSelected || unreadCount > 0) ? 'bold' : 'normal'
                          }
                        ]}>
                          #{ch}
                        </Text>
                        {unreadCount > 0 && !isSelected && (
                          <View style={styles.channelUnreadBadge}>
                            <Text style={styles.channelUnreadText}>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* DEZENTER OFFLINE-HINWEIS */}
              <View style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                backgroundColor: isDark ? '#111827' : '#f8fafc',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}>
                <Wifi size={12} color={colors.primary} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Tipp: Lernkarten & Quiz sind 100% offline nutzbar. Für Live-Chat ist Netz nötig.
                </Text>
              </View>
            </>
          )}

          {/* MESSAGES & INPUT CONTAINER DOCKED TO KEYBOARD */}
          <View style={{ flex: 1, paddingBottom: dynamicKeyboardPadding }}>
            {isSplitView && (
              <View style={[styles.tabletChatHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
                <Text style={[styles.tabletChatHeaderTitle, { color: colors.text }]}>
                  #{activeChannel}
                </Text>
              </View>
            )}
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.messagesScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                if (shouldAutoScrollGroupRef.current) {
                  scrollViewRef.current?.scrollToEnd({ animated: false });
                }
              }}
              onScrollBeginDrag={() => {
                shouldAutoScrollGroupRef.current = false;
              }}
            >
              {filteredGroupMessages.length === 0 ? (
                <View style={styles.emptyChat}>
                  <MessageSquare size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyChatText, { color: colors.text }]}>
                    Willkommen im Raum #{activeChannel}!
                  </Text>
                  <Text style={[styles.emptyChatSubtext, { color: colors.textMuted }]}>
                    Schreibe die erste Nachricht, um eine Diskussion zu starten.
                  </Text>
                </View>
              ) : (
                filteredGroupMessages.map((msg) => {
                  const isMyMsg = msg.senderId === currentUser?.id;
                  const effectiveRole = usersMap[msg.senderId]?.role || msg.senderRole;
                  const roleObj = roles.find(r => r.id === effectiveRole);
                  const roleName = roleObj ? roleObj.name : getRoleLabel(effectiveRole, roles);
                  const badgeTag = usersMap[msg.senderId]?.title?.trim() || roleName;
                  const roleColor = roleObj ? roleObj.color : (getRoleColor(effectiveRole, roles).text);
                  const rawSenderDisplayName = usersMap[msg.senderId]?.name || msg.sender;
                  const senderDisplayName = formatDisplayNameWithInitial(rawSenderDisplayName);
                  const senderColor = isMyMsg ? colors.primary : (roleColor || colors.textMuted);

                  return (
                    <View 
                      key={msg.id} 
                      style={[
                        styles.messageRow, 
                        { justifyContent: isMyMsg ? 'flex-end' : 'flex-start' }
                      ]}
                    >
                      <View style={[
                        styles.chatBubble,
                        { 
                          backgroundColor: isMyMsg ? colors.chatBubbleUser : colors.chatBubbleOther,
                          borderColor: colors.border,
                          borderWidth: isMyMsg ? 0 : 1,
                          borderBottomRightRadius: isMyMsg ? 2 : 12,
                          borderBottomLeftRadius: isMyMsg ? 12 : 2,
                        }
                      ]}>
                        <View style={styles.senderHeader}>
                          <TouchableOpacity 
                            style={styles.senderClickable}
                            onPress={() => handleOpenUserProfile(msg.senderId, senderDisplayName, effectiveRole)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.miniAvatar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                              {usersMap[msg.senderId]?.avatarUrl && isImgUri(usersMap[msg.senderId]?.avatarUrl) ? (
                                <Image source={{ uri: usersMap[msg.senderId]?.avatarUrl }} style={styles.miniAvatarImg} />
                              ) : usersMap[msg.senderId]?.avatarUrl ? (
                                <Text style={{ fontSize: 11 }}>{usersMap[msg.senderId]?.avatarUrl}</Text>
                              ) : (
                                <UserIcon size={10} color={colors.textMuted} />
                              )}
                            </View>
                            <Text style={[
                              styles.senderName, 
                              { color: senderColor }
                            ]}>
                              {senderDisplayName} <Text style={[styles.adminBadge, { color: roleColor, fontWeight: 'bold' }]}>[{badgeTag}]</Text>
                            </Text>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.timeText, { color: colors.textMuted }]}>
                              {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            {!isMyMsg && (
                              <TouchableOpacity 
                                onPress={() => handleReportMessage(msg)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Nachricht melden"
                              >
                                <Flag size={11} color={colors.textMuted} />
                              </TouchableOpacity>
                            )}
                            {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && !isMyMsg && (
                              <TouchableOpacity 
                                onPress={() => handleModerationMenu(msg.senderId, msg.sender)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Nutzer moderieren (Timeout / Bann)"
                              >
                                <ShieldAlert size={12} color="#f59e0b" style={{ marginLeft: 2 }} />
                              </TouchableOpacity>
                            )}
                            {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && (
                              <TouchableOpacity 
                                onPress={() => handleDeleteMessage(msg.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Nachricht löschen"
                              >
                                <Trash2 size={12} color="#ef4444" style={{ marginLeft: 2 }} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        
                        <Text style={[
                          styles.messageText, 
                          { color: isMyMsg ? colors.chatTextUser : colors.chatTextOther }
                        ]}>
                          {msg.text}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* SCROLL TO BOTTOM BUTTON */}
            <TouchableOpacity 
              style={[styles.scrollToBottomBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              onPress={scrollToBottom}
              activeOpacity={0.8}
              accessibilityLabel="Nach unten scrollen"
            >
              <ChevronDown size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* BAN / TIMEOUT WARNING BANNER */}
            {myBanStatus.isRestricted && (
              <View style={[styles.banWarningBanner, { backgroundColor: myBanStatus.isTimeout ? (isDark ? '#78350f40' : '#fef3c7') : (isDark ? '#7f1d1d40' : '#fee2e2'), borderColor: myBanStatus.isTimeout ? '#f59e0b' : '#ef4444' }]}>
                {myBanStatus.isTimeout ? <Clock size={16} color="#d97706" /> : <Ban size={16} color="#b91c1c" />}
                <Text style={[styles.banWarningText, { color: myBanStatus.isTimeout ? (isDark ? '#fde68a' : '#92400e') : (isDark ? '#fca5a5' : '#991b1b') }]}>
                  {myBanStatus.isTimeout && myBanStatus.timeoutUntil
                    ? `Du hast einen 24h-Timeout bis ${new Date(myBanStatus.timeoutUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} (Chat stummgeschaltet).`
                    : 'Dein Account wurde dauerhaft aus dem Chat verbannt.'}
                </Text>
              </View>
            )}

            {/* INPUT BAR */}
            <View style={[styles.inputBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
              <TextInput
                style={[
                  styles.inputField, 
                  { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
                  myBanStatus.isRestricted && { opacity: 0.6 }
                ]}
                placeholder={
                  myBanStatus.isTimeout && myBanStatus.timeoutUntil
                    ? `⏱️ Timeout bis ${new Date(myBanStatus.timeoutUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
                    : myBanStatus.isPermanent
                    ? '🚫 Account im Chat gesperrt'
                    : 'Nachricht schreiben...'
                }
                placeholderTextColor={myBanStatus.isRestricted ? '#ef4444' : colors.textMuted}
                editable={!myBanStatus.isRestricted}
                value={myBanStatus.isRestricted ? '' : inputText}
                onChangeText={setInputText}
                onFocus={() => {
                  setIsInputFocused(true);
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                }}
                onBlur={() => setIsInputFocused(false)}
                multiline
                scrollEnabled={false}
                maxLength={500}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  { backgroundColor: (!myBanStatus.isRestricted && inputText.trim()) ? colors.primary : colors.border }
                ]}
                disabled={myBanStatus.isRestricted || !inputText.trim()}
                onPress={handleSendMessage}
              >
                <Send size={18} color={(!myBanStatus.isRestricted && inputText.trim()) ? '#ffffff' : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ================= REITER 2: AUSBILDER-DIREKTCHAT ================= */}
      {activeTab === 'support' && currentUser && (
        <View style={{ flex: 1 }}>
          
          {/* A. SCHÜLER ANSICHT (USER) - Direkter Chat mit Ausbilder */}
          {currentUser.role === 'user' && (
            <View style={[
              { flex: 1, paddingBottom: dynamicKeyboardPadding },
              isTablet && { maxWidth: 840, width: '100%', alignSelf: 'center' }
            ]}>
              <ScrollView
                ref={supportScrollViewRef}
                contentContainerStyle={styles.messagesScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (shouldAutoScrollSupportRef.current) {
                    supportScrollViewRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                onScrollBeginDrag={() => {
                  shouldAutoScrollSupportRef.current = false;
                }}
              >
                {/* Erste System-Begrüßung */}
                <View style={styles.messageRow}>
                  <View style={[styles.chatBubble, { backgroundColor: colors.chatBubbleOther, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 2 }]}>
                    <View style={styles.senderHeader}>
                      <Text style={[styles.senderName, { color: '#ef4444' }]}>
                        Thomas <Text style={[styles.adminBadge, { color: '#ef4444' }]}>[Ausbilder]</Text>
                      </Text>
                    </View>
                    <Text style={[styles.messageText, { color: colors.chatTextOther }]}>
                      Hallo {formatDisplayNameWithInitial(currentUser.name)}! Wenn du eine Frage zu einem bestimmten Themenbereich (z.B. Bremsprobe, Wagenprüfung oder Signale) hast, schreib sie einfach hier rein. Ein Ausbilder wird dir hier direkt antworten.
                    </Text>
                  </View>
                </View>

                {/* Echte Support-Nachrichten */}
                {supportMessages.map((msg) => {
                  const isMyMsg = msg.senderId === currentUser.id;
                  const effectiveRole = usersMap[msg.senderId]?.role || msg.senderRole;
                  const roleObj = roles.find(r => r.id === effectiveRole);
                  const roleName = roleObj ? roleObj.name : getRoleLabel(effectiveRole, roles);
                  const badgeTag = usersMap[msg.senderId]?.title?.trim() || roleName;
                  const roleColor = roleObj ? roleObj.color : (getRoleColor(effectiveRole, roles).text);
                  const rawSenderDisplayName = usersMap[msg.senderId]?.name || msg.senderName;
                  const senderDisplayName = formatDisplayNameWithInitial(rawSenderDisplayName);
                  const senderColor = isMyMsg ? colors.primary : (roleColor || '#ef4444');

                  return (
                    <View 
                      key={msg.id} 
                      style={[
                        styles.messageRow, 
                        { justifyContent: isMyMsg ? 'flex-end' : 'flex-start' }
                      ]}
                    >
                      <View style={[
                        styles.chatBubble,
                        { 
                          backgroundColor: isMyMsg ? colors.chatBubbleUser : colors.chatBubbleOther,
                          borderColor: colors.border,
                          borderWidth: isMyMsg ? 0 : 1,
                          borderBottomRightRadius: isMyMsg ? 2 : 12,
                          borderBottomLeftRadius: isMyMsg ? 12 : 2,
                        }
                      ]}>
                        <View style={styles.senderHeader}>
                          <TouchableOpacity 
                            style={styles.senderClickable}
                            onPress={() => handleOpenUserProfile(msg.senderId, senderDisplayName, effectiveRole)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.miniAvatar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                              {usersMap[msg.senderId]?.avatarUrl && isImgUri(usersMap[msg.senderId]?.avatarUrl) ? (
                                <Image source={{ uri: usersMap[msg.senderId]?.avatarUrl }} style={styles.miniAvatarImg} />
                              ) : usersMap[msg.senderId]?.avatarUrl ? (
                                <Text style={{ fontSize: 11 }}>{usersMap[msg.senderId]?.avatarUrl}</Text>
                              ) : (
                                <UserIcon size={10} color={colors.textMuted} />
                              )}
                            </View>
                            <Text style={[styles.senderName, { color: senderColor }]}>
                              {senderDisplayName} <Text style={[styles.adminBadge, { color: roleColor, fontWeight: 'bold' }]}>[{badgeTag}]</Text>
                            </Text>
                          </TouchableOpacity>
                          <Text style={[styles.timeText, { color: colors.textMuted }]}>
                            {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={[styles.messageText, { color: isMyMsg ? colors.chatTextUser : colors.chatTextOther }]}>
                          {msg.text}
                        </Text>
                        {msg.imageUrl && (
                          <Image source={{ uri: msg.imageUrl }} style={styles.chatMessageImage} resizeMode="contain" />
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* SCROLL TO BOTTOM BUTTON */}
              <TouchableOpacity 
                style={[styles.scrollToBottomBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={scrollToBottom}
                activeOpacity={0.8}
                accessibilityLabel="Nach unten scrollen"
              >
                <ChevronDown size={20} color={colors.primary} />
              </TouchableOpacity>

              {/* INPUT SUPPORT */}
              <View style={[styles.inputBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
                <TextInput
                  style={[styles.inputField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Frage an Ausbilder stellen..."
                  placeholderTextColor={colors.textMuted}
                  value={supportInputText}
                  onChangeText={setSupportInputText}
                  onFocus={() => {
                    setIsInputFocused(true);
                    setTimeout(() => supportScrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                  }}
                  onBlur={() => setIsInputFocused(false)}
                  multiline
                  scrollEnabled={false}
                  maxLength={500}
                />
                <TouchableOpacity 
                  style={[styles.sendButton, { backgroundColor: supportInputText.trim() ? colors.primary : colors.border }]}
                  disabled={!supportInputText.trim()}
                  onPress={handleSendSupportMessage}
                >
                  <Send size={18} color={supportInputText.trim() ? '#ffffff' : colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* B. AUSBILDER / MODERATOR ANSICHT - SplitView oder Mobile-Navigation */}
          {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
            <View style={{ flex: 1 }}>
              {isSplitView ? (
                /* MASTER-DETAIL SPLIT-VIEW FÜR TABLETS */
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  {/* Linke Leiste: Schüler-Anfragen */}
                  <View style={[styles.tabletSupportSidebar, { width: 330, backgroundColor: colors.cardBg, borderRightWidth: 1, borderRightColor: colors.border }]}>
                    <View style={[styles.tabletSidebarHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.tabletSidebarTitle, { color: colors.textMuted }]}>
                        Schüleranfragen ({supportThreads.length})
                      </Text>
                    </View>
                    <ScrollView contentContainerStyle={styles.threadsScroll} showsVerticalScrollIndicator={false}>
                      {sortedSupportThreads.length === 0 ? (
                        <View style={styles.emptySupportThreads}>
                          <MessageCircle size={40} color={colors.textMuted} />
                          <Text style={[styles.emptySupportText, { color: colors.text }]}>
                            Keine Schüleranfragen
                          </Text>
                          <Text style={[styles.emptySupportSubtext, { color: colors.textMuted }]}>
                            Sobald ein Schüler eine Frage stellt, erscheint der Chat hier.
                          </Text>
                        </View>
                      ) : (
                        sortedSupportThreads.map((thread) => {
                          const unread = isThreadUnread(thread);
                          const isSelected = thread.studentId === selectedStudentId;
                          return (
                            <TouchableOpacity
                              key={thread.studentId}
                              style={[
                                styles.tabletThreadItem,
                                {
                                  backgroundColor: isSelected 
                                    ? (isDark ? '#1e3a8a25' : '#eff6ff') 
                                    : (unread ? (isDark ? '#ef444415' : '#fef2f2') : 'transparent'),
                                  borderLeftColor: isSelected ? colors.primary : (unread ? '#ef4444' : 'transparent'),
                                  borderLeftWidth: 4,
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.border,
                                }
                              ]}
                              onPress={async () => {
                                const now = Date.now();
                                setThreadReadTimes(prev => {
                                  const next = { ...prev, [thread.studentId]: now };
                                  if (currentUser?.id) {
                                    AsyncStorage.setItem(`@chat_support_threads_read_${currentUser.id}`, JSON.stringify(next)).catch(() => {});
                                  }
                                  return next;
                                });
                                shouldAutoScrollSupportRef.current = true;
                                setSelectedStudentId(thread.studentId);
                                setSelectedStudentName(thread.studentName);
                                const msgs = await mockDb.getSupportMessages(thread.studentId);
                                setSupportMessages(msgs);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.threadCardHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                  {unread && <View style={styles.unreadThreadDot} />}
                                  <Text style={[styles.threadStudentName, { color: unread ? '#ef4444' : colors.text }]} numberOfLines={1}>
                                    {formatDisplayNameWithInitial(thread.studentName)}
                                  </Text>
                                  {unread && (
                                    <View style={styles.unreadThreadBadge}>
                                      <Text style={styles.unreadThreadBadgeText}>NEU</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={[styles.threadTime, { color: unread ? '#ef4444' : colors.textMuted }]}>
                                    {new Date(thread.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                  </Text>
                                  {currentUser?.role === 'admin' && (
                                    <TouchableOpacity
                                      onPress={(e) => {
                                        e.stopPropagation?.();
                                        handleDeleteSupportThread(thread.studentId, thread.studentName);
                                      }}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      accessibilityLabel="Ausbilderchat löschen"
                                    >
                                      <Trash2 size={13} color="#ef4444" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                              <Text style={[styles.threadLastMsg, { color: unread ? colors.text : colors.textMuted, marginBottom: 0 }]} numberOfLines={2}>
                                {thread.lastMessage}
                              </Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>

                  {/* Rechte Seite: Aktiver Chatverlauf oder Platzhalter */}
                  <View style={{ flex: 1, paddingBottom: dynamicKeyboardPadding }}>
                    {selectedStudentId ? (
                      <>
                        <View style={[styles.threadHeaderBanner, { backgroundColor: colors.cardBg, borderBottomColor: colors.border, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                          <Text style={[styles.threadHeaderTitle, { color: colors.text }]}>
                            Chat mit {formatDisplayNameWithInitial(selectedStudentName)}
                          </Text>
                          {currentUser?.role === 'admin' && (
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#ef444415', borderRadius: 6, borderWidth: 1, borderColor: '#ef444430' }}
                              onPress={() => handleDeleteSupportThread(selectedStudentId, selectedStudentName)}
                            >
                              <Trash2 size={14} color="#ef4444" />
                              <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 'bold' }}>Chat löschen</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <ScrollView
                          ref={supportScrollViewRef}
                          contentContainerStyle={styles.messagesScroll}
                          showsVerticalScrollIndicator={false}
                          keyboardShouldPersistTaps="handled"
                          onContentSizeChange={() => {
                            if (shouldAutoScrollSupportRef.current) {
                              supportScrollViewRef.current?.scrollToEnd({ animated: false });
                            }
                          }}
                          onScrollBeginDrag={() => {
                            shouldAutoScrollSupportRef.current = false;
                          }}
                        >
                          {supportMessages.map((msg) => {
                            const isMyMsg = msg.senderId === currentUser.id;
                            const effectiveRole = usersMap[msg.senderId]?.role || msg.senderRole;
                            const roleObj = roles.find(r => r.id === effectiveRole);
                            const roleName = roleObj ? roleObj.name : getRoleLabel(effectiveRole, roles);
                            const badgeTag = usersMap[msg.senderId]?.title?.trim() || roleName;
                            const roleColor = roleObj ? roleObj.color : (getRoleColor(effectiveRole, roles).text);
                            const rawSenderDisplayName = usersMap[msg.senderId]?.name || msg.senderName;
                            const senderDisplayName = formatDisplayNameWithInitial(rawSenderDisplayName);
                            const senderColor = isMyMsg ? colors.primary : (roleColor || '#2563eb');

                            return (
                              <View 
                                key={msg.id} 
                                style={[
                                  styles.messageRow, 
                                  { justifyContent: isMyMsg ? 'flex-end' : 'flex-start' }
                                ]}
                              >
                                <View style={[
                                  styles.chatBubble,
                                  { 
                                    backgroundColor: isMyMsg ? colors.chatBubbleUser : colors.chatBubbleOther,
                                    borderColor: colors.border,
                                    borderWidth: isMyMsg ? 0 : 1,
                                    borderBottomRightRadius: isMyMsg ? 2 : 12,
                                    borderBottomLeftRadius: isMyMsg ? 12 : 2,
                                  }
                                ]}>
                                  <View style={styles.senderHeader}>
                                    <TouchableOpacity 
                                      style={styles.senderClickable}
                                      onPress={() => handleOpenUserProfile(msg.senderId, senderDisplayName, effectiveRole)}
                                      activeOpacity={0.7}
                                    >
                                      <View style={[styles.miniAvatar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        {usersMap[msg.senderId]?.avatarUrl && isImgUri(usersMap[msg.senderId]?.avatarUrl) ? (
                                          <Image source={{ uri: usersMap[msg.senderId]?.avatarUrl }} style={styles.miniAvatarImg} />
                                        ) : usersMap[msg.senderId]?.avatarUrl ? (
                                          <Text style={{ fontSize: 11 }}>{usersMap[msg.senderId]?.avatarUrl}</Text>
                                        ) : (
                                          <UserIcon size={10} color={colors.textMuted} />
                                        )}
                                      </View>
                                      <Text style={[styles.senderName, { color: senderColor }]}>
                                        {senderDisplayName} <Text style={[styles.adminBadge, { color: roleColor, fontWeight: 'bold' }]}>[{badgeTag}]{isMyMsg && ' (Du)'}</Text>
                                      </Text>
                                    </TouchableOpacity>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Text style={[styles.timeText, { color: colors.textMuted }]}>
                                        {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                      </Text>
                                      {currentUser?.role === 'admin' && (
                                        <TouchableOpacity
                                          onPress={() => handleDeleteSupportMessage(msg.id)}
                                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                          accessibilityLabel="Nachricht löschen"
                                        >
                                          <Trash2 size={12} color="#ef4444" />
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  </View>
                                  <Text style={[styles.messageText, { color: isMyMsg ? colors.chatTextUser : colors.chatTextOther }]}>
                                    {msg.text}
                                  </Text>
                                  {msg.imageUrl && (
                                    <Image source={{ uri: msg.imageUrl }} style={styles.chatMessageImage} resizeMode="contain" />
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </ScrollView>

                        {/* SCROLL TO BOTTOM BUTTON */}
                        <TouchableOpacity 
                          style={[styles.scrollToBottomBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                          onPress={scrollToBottom}
                          activeOpacity={0.8}
                          accessibilityLabel="Nach unten scrollen"
                        >
                          <ChevronDown size={20} color={colors.primary} />
                        </TouchableOpacity>

                        {/* INPUT SUPPORT FÜR INSTRUCTORS */}
                        <View style={[styles.inputBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
                          <TouchableOpacity 
                            style={[styles.mediaButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={handlePickSupportImage}
                          >
                            <Camera size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.inputField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder={`Antwort an ${formatDisplayNameWithInitial(selectedStudentName)} schreiben...`}
                            placeholderTextColor={colors.textMuted}
                            value={supportInputText}
                            onChangeText={setSupportInputText}
                            onFocus={() => {
                              setIsInputFocused(true);
                              setTimeout(() => supportScrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                            }}
                            onBlur={() => setIsInputFocused(false)}
                            multiline
                            scrollEnabled={false}
                            maxLength={500}
                          />
                          <TouchableOpacity 
                            style={[styles.sendButton, { backgroundColor: supportInputText.trim() ? colors.primary : colors.border }]}
                            disabled={!supportInputText.trim()}
                            onPress={handleSendSupportMessage}
                          >
                            <Send size={18} color={supportInputText.trim() ? '#ffffff' : colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <View style={styles.emptyDetailContainer}>
                        <MessageCircle size={48} color={colors.textMuted} />
                        <Text style={[styles.emptySupportText, { color: colors.text }]}>
                          Kein Chat ausgewählt
                        </Text>
                        <Text style={[styles.emptySupportSubtext, { color: colors.textMuted }]}>
                          Wähle links eine Anfrage aus der Liste aus, um die Unterhaltung anzuzeigen und zu antworten.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                /* MOBILE ANSICHT: STACKED (Threads-Liste oder Einzelner Chat) */
                !selectedStudentId ? (
                  // Alle Schüler-Threads auflisten
                  <ScrollView 
                    contentContainerStyle={styles.threadsScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={[styles.secTitle, { color: colors.text, paddingHorizontal: 16, marginTop: 12 }]}>
                      Offene Anfragen von Schülern ({supportThreads.length})
                    </Text>
                    
                    {sortedSupportThreads.length === 0 ? (
                      <View style={styles.emptySupportThreads}>
                        <MessageCircle size={48} color={colors.textMuted} />
                        <Text style={[styles.emptySupportText, { color: colors.text }]}>
                          Keine Schüleranfragen vorhanden
                        </Text>
                        <Text style={[styles.emptySupportSubtext, { color: colors.textMuted }]}>
                          Sobald ein Schüler eine Frage stellt, erscheint der Chatverlauf hier.
                        </Text>
                      </View>
                    ) : (
                      sortedSupportThreads.map((thread) => {
                        const unread = isThreadUnread(thread);
                        return (
                          <TouchableOpacity
                            key={thread.studentId}
                            style={[
                              styles.threadCard,
                              { 
                                backgroundColor: colors.cardBg, 
                                borderColor: unread ? '#ef4444' : colors.border,
                                borderLeftWidth: unread ? 4 : 1,
                                borderLeftColor: unread ? '#ef4444' : colors.border,
                              },
                              unread && {
                                backgroundColor: isDark ? '#ef444415' : '#fef2f2',
                              }
                            ]}
                            onPress={async () => {
                              const now = Date.now();
                              setThreadReadTimes(prev => {
                                const next = { ...prev, [thread.studentId]: now };
                                if (currentUser?.id) {
                                  AsyncStorage.setItem(`@chat_support_threads_read_${currentUser.id}`, JSON.stringify(next)).catch(() => {});
                                }
                                return next;
                              });
                              shouldAutoScrollSupportRef.current = true;
                              setSelectedStudentId(thread.studentId);
                              setSelectedStudentName(thread.studentName);
                              const msgs = await mockDb.getSupportMessages(thread.studentId);
                              setSupportMessages(msgs);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.threadCardHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {unread && (
                                  <View style={styles.unreadThreadDot} />
                                )}
                                <Text style={[styles.threadStudentName, { color: unread ? '#ef4444' : colors.text }]}>
                                  {formatDisplayNameWithInitial(thread.studentName)}
                                </Text>
                                {unread && (
                                  <View style={styles.unreadThreadBadge}>
                                    <Text style={styles.unreadThreadBadgeText}>NEU</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.threadTime, { color: unread ? '#ef4444' : colors.textMuted, fontWeight: unread ? 'bold' : 'normal' }]}>
                                {new Date(thread.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                            <Text style={[styles.threadLastMsg, { color: unread ? colors.text : colors.textMuted, fontWeight: unread ? '600' : 'normal' }]} numberOfLines={2}>
                              {thread.lastMessage}
                            </Text>
                            <View style={styles.threadFooter}>
                              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>
                                Antworten schreiben
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {unread && (
                                  <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 'bold' }}>
                                    Ungelesen 🔴
                                  </Text>
                                )}
                                {currentUser?.role === 'admin' && (
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation?.();
                                      handleDeleteSupportThread(thread.studentId, thread.studentName);
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef444415', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                  >
                                    <Trash2 size={13} color="#ef4444" />
                                    <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 'bold' }}>Löschen</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                ) : (
                  // Einzelnen Thread geöffnet
                  <View style={{ flex: 1, paddingBottom: dynamicKeyboardPadding }}>
                    <View style={[styles.threadHeaderBanner, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
                      <TouchableOpacity 
                        style={styles.backBtn}
                        onPress={() => {
                          setSelectedStudentId(null);
                          loadData();
                        }}
                      >
                        <ChevronLeft size={20} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Zurück</Text>
                      </TouchableOpacity>
                      <Text style={[styles.threadHeaderTitle, { color: colors.text }]}>
                        Chat mit {formatDisplayNameWithInitial(selectedStudentName)}
                      </Text>
                      {currentUser?.role === 'admin' ? (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#ef444415', borderRadius: 6 }}
                          onPress={() => handleDeleteSupportThread(selectedStudentId!, selectedStudentName)}
                        >
                          <Trash2 size={15} color="#ef4444" />
                          <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 'bold' }}>Löschen</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ width: 60 }} />
                      )}
                    </View>

                    <ScrollView
                      ref={supportScrollViewRef}
                      contentContainerStyle={styles.messagesScroll}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      onContentSizeChange={() => {
                        if (shouldAutoScrollSupportRef.current) {
                          supportScrollViewRef.current?.scrollToEnd({ animated: false });
                        }
                      }}
                      onScrollBeginDrag={() => {
                        shouldAutoScrollSupportRef.current = false;
                      }}
                    >
                      {supportMessages.map((msg) => {
                        const isMyMsg = msg.senderId === currentUser.id;
                        const effectiveRole = usersMap[msg.senderId]?.role || msg.senderRole;
                        const roleObj = roles.find(r => r.id === effectiveRole);
                        const roleName = roleObj ? roleObj.name : getRoleLabel(effectiveRole, roles);
                        const badgeTag = usersMap[msg.senderId]?.title?.trim() || roleName;
                        const roleColor = roleObj ? roleObj.color : (getRoleColor(effectiveRole, roles).text);
                        const rawSenderDisplayName = usersMap[msg.senderId]?.name || msg.senderName;
                        const senderDisplayName = formatDisplayNameWithInitial(rawSenderDisplayName);
                        const senderColor = isMyMsg ? colors.primary : (roleColor || '#2563eb');

                        return (
                          <View 
                            key={msg.id} 
                            style={[
                              styles.messageRow, 
                              { justifyContent: isMyMsg ? 'flex-end' : 'flex-start' }
                            ]}
                          >
                            <View style={[
                              styles.chatBubble,
                              { 
                                backgroundColor: isMyMsg ? colors.chatBubbleUser : colors.chatBubbleOther,
                                borderColor: colors.border,
                                borderWidth: isMyMsg ? 0 : 1,
                                borderBottomRightRadius: isMyMsg ? 2 : 12,
                                borderBottomLeftRadius: isMyMsg ? 12 : 2,
                              }
                            ]}>
                              <View style={styles.senderHeader}>
                                <TouchableOpacity 
                                  style={styles.senderClickable}
                                  onPress={() => handleOpenUserProfile(msg.senderId, senderDisplayName, effectiveRole)}
                                  activeOpacity={0.7}
                                >
                                  <View style={[styles.miniAvatar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    {usersMap[msg.senderId]?.avatarUrl && isImgUri(usersMap[msg.senderId]?.avatarUrl) ? (
                                      <Image source={{ uri: usersMap[msg.senderId]?.avatarUrl }} style={styles.miniAvatarImg} />
                                    ) : usersMap[msg.senderId]?.avatarUrl ? (
                                      <Text style={{ fontSize: 11 }}>{usersMap[msg.senderId]?.avatarUrl}</Text>
                                    ) : (
                                      <UserIcon size={10} color={colors.textMuted} />
                                    )}
                                  </View>
                                  <Text style={[styles.senderName, { color: senderColor }]}>
                                    {senderDisplayName} <Text style={[styles.adminBadge, { color: roleColor, fontWeight: 'bold' }]}>[{badgeTag}]{isMyMsg && ' (Du)'}</Text>
                                  </Text>
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={[styles.timeText, { color: colors.textMuted }]}>
                                    {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                  </Text>
                                  {currentUser?.role === 'admin' && (
                                    <TouchableOpacity
                                      onPress={() => handleDeleteSupportMessage(msg.id)}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      accessibilityLabel="Nachricht löschen"
                                    >
                                      <Trash2 size={12} color="#ef4444" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                              <Text style={[styles.messageText, { color: isMyMsg ? colors.chatTextUser : colors.chatTextOther }]}>
                                {msg.text}
                              </Text>
                              {msg.imageUrl && (
                                <Image source={{ uri: msg.imageUrl }} style={styles.chatMessageImage} resizeMode="contain" />
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>

                    {/* SCROLL TO BOTTOM BUTTON */}
                    <TouchableOpacity 
                      style={[styles.scrollToBottomBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                      onPress={scrollToBottom}
                      activeOpacity={0.8}
                      accessibilityLabel="Nach unten scrollen"
                    >
                      <ChevronDown size={20} color={colors.primary} />
                    </TouchableOpacity>

                    {/* INPUT SUPPORT FÜR INSTRUCTORS */}
                    <View style={[styles.inputBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
                      <TouchableOpacity 
                        style={[styles.mediaButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={handlePickSupportImage}
                      >
                        <Camera size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder={`Antwort an ${formatDisplayNameWithInitial(selectedStudentName)} schreiben...`}
                        placeholderTextColor={colors.textMuted}
                        value={supportInputText}
                        onChangeText={setSupportInputText}
                        onFocus={() => {
                          setIsInputFocused(true);
                          setTimeout(() => supportScrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                        }}
                        onBlur={() => setIsInputFocused(false)}
                        multiline
                        scrollEnabled={false}
                        maxLength={500}
                      />
                      <TouchableOpacity 
                        style={[styles.sendButton, { backgroundColor: supportInputText.trim() ? colors.primary : colors.border }]}
                        disabled={!supportInputText.trim()}
                        onPress={handleSendSupportMessage}
                      >
                        <Send size={18} color={supportInputText.trim() ? '#ffffff' : colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              )}
            </View>
          )}
        </View>
      )}

      {/* USER PROFILE PREVIEW MODAL (NAME & BILD ONLY) */}
      <Modal
        visible={viewingUser !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingUser(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setViewingUser(null)}
        >
          <View 
            style={[styles.profileModalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity 
              style={[styles.closeModalBtn, { backgroundColor: colors.background }]} 
              onPress={() => setViewingUser(null)}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={[styles.modalAvatarContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {viewingUser?.avatarUrl && isImgUri(viewingUser.avatarUrl) ? (
                <Image source={{ uri: viewingUser.avatarUrl }} style={styles.modalAvatarImg} />
              ) : viewingUser?.avatarUrl ? (
                <Text style={styles.modalAvatarEmoji}>{viewingUser.avatarUrl}</Text>
              ) : (
                <UserIcon size={44} color={colors.textMuted} />
              )}
            </View>

            <Text style={[styles.modalUserName, { color: colors.text }]}>
              {formatDisplayNameWithInitial(viewingUser?.name)}
            </Text>
            
            {viewingUser?.role && (
              <View style={[styles.modalRoleBadge, { backgroundColor: getRoleColor(viewingUser.role, roles).bg }]}>
                <Text style={[styles.modalRoleText, { color: getRoleColor(viewingUser.role, roles).text }]}>
                  {viewingUser.title?.trim() || getRoleLabel(viewingUser.role, roles)}
                </Text>
              </View>
            )}

            {/* MODERATIONS-BEREICH FÜR MODS & AUSBILDER */}
            {isModOrAdmin && viewingUser && currentUser && viewingUser.id !== currentUser.id && (currentUser.role === 'admin' || usersMap[viewingUser.id]?.role === 'user') && (() => {
              const userBan = chatBans.find(b => b.targetUserId === viewingUser.id);
              const isCurrentlyRestricted = userBan && (userBan.type === 'permanent' || (userBan.type === 'timeout_1d' && (!userBan.timeoutUntil || Date.now() < userBan.timeoutUntil)));

              return (
                <View style={[styles.modalModSection, { borderTopColor: colors.border }]}>
                  <Text style={[styles.modalModHeader, { color: colors.textMuted }]}>
                    MODERATION
                  </Text>
                  {isCurrentlyRestricted ? (
                    <View style={styles.modalBanStatusBox}>
                      <View style={styles.modalBanStatusHeader}>
                        {userBan.type === 'timeout_1d' ? (
                          <Clock size={16} color="#f59e0b" />
                        ) : (
                          <Ban size={16} color="#ef4444" />
                        )}
                        <Text style={[styles.modalBanStatusTitle, { color: userBan.type === 'timeout_1d' ? '#f59e0b' : '#ef4444' }]}>
                          {userBan.type === 'timeout_1d' ? '⏱️ 1-Tag Timeout aktiv' : '🚫 Im Chat gebannt'}
                        </Text>
                      </View>
                      {userBan.timeoutUntil && userBan.type === 'timeout_1d' && (
                        <Text style={[styles.modalBanStatusSub, { color: colors.textMuted }]}>
                          Endet: {new Date(userBan.timeoutUntil).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[styles.modalModBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => {
                          handleRemoveUserBan(viewingUser.id, viewingUser.name);
                          setViewingUser(null);
                        }}
                      >
                        <CheckCircle2 size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.modalModBtnText}>Sperre aufheben</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 8, width: '100%', marginTop: 4 }}>
                      <TouchableOpacity
                        style={[styles.modalModBtn, { backgroundColor: '#f59e0b' }]}
                        onPress={() => {
                          handleSetUserTimeout(viewingUser.id, viewingUser.name);
                          setViewingUser(null);
                        }}
                      >
                        <Clock size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.modalModBtnText}>⏱️ 1 Tag Timeout</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalModBtn, { backgroundColor: '#ef4444' }]}
                        onPress={() => {
                          handleSetUserBan(viewingUser.id, viewingUser.name);
                          setViewingUser(null);
                        }}
                      >
                        <Ban size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.modalModBtnText}>🚫 Im Chat bannen</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  muteHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginLeft: 4,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  mainTabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  channelsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  channelTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  channelTabText: {
    fontSize: 12,
  },
  channelUnreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelUnreadText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  tabUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  messagesScroll: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptyChatSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  chatBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 12,
  },
  senderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  adminBadge: {
    fontSize: 9,
    fontWeight: '900',
  },
  timeText: {
    fontSize: 9,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  inputField: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 110,
    fontSize: 15,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMessageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  threadsScroll: {
    paddingBottom: 32,
  },
  secTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptySupportThreads: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptySupportText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySupportSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 40,
  },
  threadCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  threadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  threadStudentName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  unreadThreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  unreadThreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unreadThreadBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  threadTime: {
    fontSize: 11,
  },
  threadLastMsg: {
    fontSize: 13,
    marginBottom: 12,
  },
  threadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb30',
    paddingTop: 8,
  },
  threadHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  threadHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  senderClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  miniAvatarImg: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    position: 'relative',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalAvatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  modalAvatarImg: {
    width: '100%',
    height: '100%',
  },
  modalAvatarEmoji: {
    fontSize: 48,
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalRoleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalRoleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollToBottomBtn: {
    position: 'absolute',
    right: 14,
    bottom: 64,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    zIndex: 99,
  },
  tabletSidebar: {
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  tabletSidebarHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tabletSidebarTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tabletChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
    gap: 8,
  },
  tabletChannelName: {
    fontSize: 14,
    flex: 1,
  },
  tabletSidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginTop: 'auto',
  },
  tabletChatHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabletChatHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabletSupportSidebar: {
    borderRightWidth: 1,
  },
  tabletThreadItem: {
    padding: 14,
  },
  emptyDetailContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  banWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  banWarningText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  modalModSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  modalModHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  modalBanStatusBox: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    gap: 6,
  },
  modalBanStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalBanStatusTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalBanStatusSub: {
    fontSize: 11,
    marginBottom: 4,
  },
  modalModBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalModBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
