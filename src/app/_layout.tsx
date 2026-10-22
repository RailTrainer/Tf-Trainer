import React, { useState, useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { 
  useColorScheme, 
  LogBox, 
  View, 
  ActivityIndicator, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  TextInput, 
  Alert,
  Keyboard,
  Platform
} from 'react-native';
import { 
  BookOpen, 
  Award, 
  MessageSquare, 
  ShieldAlert, 
  User as UserIcon, 
  ChevronLeft,
  Bell,
  X,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Megaphone,
  AlertTriangle,
  Calendar,
  Info,
  Check,
  CheckCheck,
  Inbox,
  Archive,
  GraduationCap
} from 'lucide-react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockDb, User, RoleDefinition, NewsItem } from '../database/mockDb';
import AuthScreen from '../components/AuthScreen';
import WebPaywallScreen from '../components/WebPaywallScreen';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';
import { useDynamicKeyboard } from '../hooks/useDynamicKeyboard';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { requestNotificationPermissions, registerForPushNotificationsAsync, sendChatNotification } from '../services/notificationService';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

function cleanText(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1');
}

LogBox.ignoreAllLogs(true);

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  currentUser: User | null;
  roles: RoleDefinition[];
  activeColor: string;
  inactiveColor: string;
  backgroundColor: string;
  borderColor: string;
  insets: any;
}

function CustomTabBar({
  state,
  descriptors,
  navigation,
  currentUser,
  roles,
  activeColor,
  inactiveColor,
  backgroundColor,
  borderColor,
  insets,
}: CustomTabBarProps) {
  const { isTablet, isLandscape, isLandscapeTablet } = useDeviceLayout();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const userRole = currentUser?.role;
  const userRoleDef = roles.find(r => r.id === userRole);
  const canAccessAdmin = userRole === 'admin' || userRole === 'moderator' || Boolean(userRoleDef?.canAccessAdmin);

  const [adminNotificationCount, setAdminNotificationCount] = useState(0);

  useEffect(() => {
    if (!canAccessAdmin) return;
    const checkNotifications = async () => {
      try {
        const [tickets, reports] = await Promise.all([
          mockDb.getTickets(),
          mockDb.getChatReports(),
        ]);
        const openTickets = tickets.filter(t => t.status === 'open').length;
        const pendingReports = reports.filter(r => r.status === 'pending').length;
        setAdminNotificationCount(openTickets + pendingReports);
      } catch {
        // ignore
      }
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [canAccessAdmin]);

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View style={{
      backgroundColor: backgroundColor,
      borderTopColor: borderColor,
      borderTopWidth: 1,
      width: '100%',
      alignItems: 'center',
    }}>
      <View style={{
        width: '100%',
        paddingHorizontal: isTablet ? 16 : 0,
        height: (isLandscapeTablet ? 52 : (isTablet ? 66 : 60)) + (insets.bottom > 0 ? insets.bottom - 10 : 0),
        paddingBottom: insets.bottom > 0 ? insets.bottom : (isLandscapeTablet ? 4 : (isTablet ? 6 : 8)),
        paddingTop: isLandscapeTablet ? 4 : (isTablet ? 6 : 8),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
      }}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          // Skip hidden routes: explore, profile, or admin for users without admin rights
          if (
            options.href === null ||
            route.name === 'explore' ||
            route.name === 'profile' ||
            (route.name === 'admin' && !canAccessAdmin)
          ) {
            return null;
          }

          const isFocused = state.index === index;
          const showAdminBadge = route.name === 'admin' && canAccessAdmin && adminNotificationCount > 0;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const Icon = options.tabBarIcon;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={{ 
                flex: 1,
                flexDirection: isLandscapeTablet ? 'row' : 'column',
                gap: isLandscapeTablet ? 8 : 0,
                alignItems: 'center', 
                justifyContent: 'center',
                opacity: isFocused ? 1 : 0.6,
                paddingVertical: 2,
              }}
            >
              <View style={{ position: 'relative' }}>
                {Icon && Icon({ 
                  color: isFocused ? activeColor : inactiveColor, 
                  size: isLandscapeTablet ? 20 : (isTablet ? 22 : 20),
                  focused: isFocused 
                })}
                {showAdminBadge && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -10,
                    backgroundColor: '#ef4444',
                    borderRadius: 10,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 3,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: backgroundColor,
                  }}>
                    <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>
                      {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ 
                color: isFocused ? activeColor : inactiveColor, 
                fontSize: isTablet ? 12 : 11,
                fontWeight: isFocused ? '700' : '600',
                marginTop: isLandscapeTablet ? 0 : (isTablet ? 3 : 4)
              }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Modal für News & Updates Verlauf + Admin Posting Form
function NewsUpdatesModal({
  visible,
  onClose,
  currentUser,
  roles,
  newsList,
  readNewsIds,
  onNewsUpdated,
  onMarkAsRead,
  onMarkAllAsRead,
  colors,
  isDark
}: {
  visible: boolean;
  onClose: () => void;
  currentUser: User | null;
  roles: RoleDefinition[];
  newsList: NewsItem[];
  readNewsIds: string[];
  onNewsUpdated: () => void;
  onMarkAsRead: (newsId: string) => void;
  onMarkAllAsRead: () => void;
  colors: any;
  isDark: boolean;
}) {
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [newsTab, setNewsTab] = useState<'unread' | 'read'>('unread');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsCategory, setNewsCategory] = useState<'update' | 'announcement' | 'warning' | 'event'>('update');
  const [saving, setSaving] = useState(false);
  const { keyboardHeight, dynamicKeyboardPadding } = useDynamicKeyboard(48);
  const { isTablet } = useDeviceLayout();

  const unreadNews = newsList.filter(n => !readNewsIds.includes(n.id));
  const readNews = newsList.filter(n => readNewsIds.includes(n.id));

  const isAdmin = currentUser && (
    currentUser.role === 'admin' || 
    currentUser.role === 'moderator' || 
    Boolean(roles.find(r => r.id === currentUser.role)?.canAccessAdmin)
  );

  const handlePublishNews = async () => {
    if (!newsTitle.trim() || !newsContent.trim()) {
      Alert.alert('Fehler', 'Bitte gib sowohl einen Titel als auch den Text für die News ein.');
      return;
    }
    if (!currentUser) return;

    try {
      setSaving(true);
      await mockDb.createNews({
        title: newsTitle.trim(),
        content: newsContent.trim(),
        category: newsCategory,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        authorTitle: currentUser.title || (currentUser.role === 'admin' ? 'Ausbilder' : 'Mod'),
      });
      setNewsTitle('');
      setNewsContent('');
      setShowAdminForm(false);
      onNewsUpdated();
      Alert.alert('Erfolg', 'Das News-Update wurde erfolgreich veröffentlicht!');
    } catch {
      Alert.alert('Fehler', 'Konnte das Update nicht veröffentlichen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNews = (newsId: string, title: string) => {
    Alert.alert(
      'News löschen?',
      `Möchtest du die Nachricht "${title}" wirklich entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await mockDb.deleteNews(newsId);
            onNewsUpdated();
            Alert.alert('Erfolg', 'Nachricht gelöscht.');
          }
        }
      ]
    );
  };

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'update':
        return { 
          label: '🚀 App-Update', 
          bg: isDark ? '#1e3a8a' : '#dbeafe', 
          color: isDark ? '#93c5fd' : '#1d4ed8', 
          border: isDark ? '#3b82f6' : '#bfdbfe' 
        };
      case 'announcement':
        return { 
          label: '📢 Ankündigung', 
          bg: isDark ? '#312e81' : '#e0e7ff', 
          color: isDark ? '#c7d2fe' : '#4338ca', 
          border: isDark ? '#6366f1' : '#c7d2fe' 
        };
      case 'warning':
        return { 
          label: '⚠️ Wichtiger Hinweis', 
          bg: isDark ? '#78350f' : '#fef3c7', 
          color: isDark ? '#fde68a' : '#b45309', 
          border: isDark ? '#f59e0b' : '#fde68a' 
        };
      case 'event':
        return { 
          label: '📅 Termin & Event', 
          bg: isDark ? '#064e3b' : '#d1fae5', 
          color: isDark ? '#6ee7b7' : '#047857', 
          border: isDark ? '#10b981' : '#a7f3d0' 
        };
      default:
        return { 
          label: 'ℹ️ Information', 
          bg: isDark ? '#374151' : '#f3f4f6', 
          color: isDark ? '#e5e7eb' : '#374151', 
          border: isDark ? '#4b5563' : '#e5e7eb' 
        };
    }
  };

  return (
    <Modal visible={visible} animationType={isTablet ? "fade" : "slide"} transparent onRequestClose={onClose}>
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.65)', 
        justifyContent: isTablet ? 'center' : 'flex-end',
        alignItems: isTablet ? 'center' : 'stretch',
        padding: isTablet ? 24 : 0
      }}>
        <View style={{
          backgroundColor: colors.background,
          borderRadius: isTablet ? 20 : 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: isTablet ? '85%' : '90%',
          minHeight: isTablet ? 500 : '65%',
          width: '100%',
          maxWidth: isTablet ? 680 : undefined,
          paddingBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isTablet ? 0.35 : 0,
          shadowRadius: 24,
          elevation: isTablet ? 16 : 0,
          overflow: 'hidden',
        }}>
          {/* MODAL HEADER */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.cardBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border
              }}>
                <Info size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                  News & Updates
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  Offizielle Mitteilungen der Ausbilder
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.cardBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* TABS: UNGELESEN VS GELESEN */}
          <View style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.cardBg,
          }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: newsTab === 'unread' ? colors.primary : 'transparent',
                flexDirection: 'row',
                gap: 6,
              }}
              onPress={() => setNewsTab('unread')}
            >
              <Inbox size={15} color={newsTab === 'unread' ? colors.primary : colors.textMuted} />
              <Text style={{
                color: newsTab === 'unread' ? colors.primary : colors.textMuted,
                fontWeight: 'bold',
                fontSize: 13,
              }}>
                Ungelesen ({unreadNews.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: newsTab === 'read' ? colors.primary : 'transparent',
                flexDirection: 'row',
                gap: 6,
              }}
              onPress={() => setNewsTab('read')}
            >
              <Archive size={15} color={newsTab === 'read' ? colors.primary : colors.textMuted} />
              <Text style={{
                color: newsTab === 'read' ? colors.primary : colors.textMuted,
                fontWeight: 'bold',
                fontSize: 13,
              }}>
                Gelesen ({readNews.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={{ padding: 18, paddingBottom: dynamicKeyboardPadding ? dynamicKeyboardPadding + 32 : 30 }} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ADMIN BUTTON: NEUES UPDATE VERFASSEN */}
            {isAdmin && (
              <View style={{ marginBottom: 18 }}>
                {!showAdminForm ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.primary,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      gap: 8,
                      elevation: 2,
                    }}
                    onPress={() => setShowAdminForm(true)}
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                      + Neues News-Update veröffentlichen
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }}>
                        ✍️ Neues Update verfassen
                      </Text>
                      <TouchableOpacity onPress={() => setShowAdminForm(false)}>
                        <X size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* KATEGORIE WAHL */}
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textMuted, marginBottom: 6 }}>
                      Kategorie / Thema:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {[
                        { id: 'update', label: '🚀 Update' },
                        { id: 'announcement', label: '📢 Ankündigung' },
                        { id: 'warning', label: '⚠️ Wichtig' },
                        { id: 'event', label: '📅 Termin' },
                      ].map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: newsCategory === cat.id ? colors.primary : colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                          onPress={() => setNewsCategory(cat.id as any)}
                        >
                          <Text style={{
                            color: newsCategory === cat.id ? '#ffffff' : colors.text,
                            fontSize: 11,
                            fontWeight: '600',
                          }}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* TITEL */}
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textMuted, marginBottom: 6 }}>
                      Titel / Überschrift *
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 14,
                        marginBottom: 12,
                      }}
                      placeholder="z.B. Zwischenprüfung am 15. September"
                      placeholderTextColor={colors.textMuted}
                      value={newsTitle}
                      onChangeText={setNewsTitle}
                    />

                    {/* INHALT */}
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textMuted, marginBottom: 6 }}>
                      Text / Inhalt *
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13,
                        minHeight: 80,
                        textAlignVertical: 'top',
                        marginBottom: 14,
                      }}
                      placeholder="Schreibe die Details für alle Schüler..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      scrollEnabled={false}
                      value={newsContent}
                      onChangeText={setNewsContent}
                    />

                    {/* BUTTONS */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.border,
                          alignItems: 'center',
                        }}
                        onPress={() => setShowAdminForm(false)}
                      >
                        <Text style={{ color: colors.text }}>Abbrechen</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1.5,
                          backgroundColor: colors.primary,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                        onPress={handlePublishNews}
                        disabled={saving}
                      >
                        <Send size={14} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>
                          {saving ? 'Veröffentliche...' : 'Veröffentlichen'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* TAB: UNGELESENE NEWS */}
            {newsTab === 'unread' && (
              <View>
                {unreadNews.length > 1 && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
                      borderWidth: 1,
                      borderColor: '#10b981',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      marginBottom: 14,
                      gap: 6,
                    }}
                    onPress={onMarkAllAsRead}
                  >
                    <CheckCheck size={16} color="#10b981" />
                    <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                      Alle {unreadNews.length} als gelesen markieren
                    </Text>
                  </TouchableOpacity>
                )}

                {unreadNews.length === 0 ? (
                  <View style={{
                    padding: 30,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.cardBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <Sparkles size={36} color="#10b981" />
                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 15, marginTop: 10 }}>
                      Alles gelesen! 🎉
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }}>
                      Du hast keine verpassten Mitteilungen. Frühere Mitteilungen findest du im Reiter „Gelesen“.
                    </Text>
                  </View>
                ) : (
                  unreadNews.map(news => {
                    const cat = getCategoryDetails(news.category);
                    return (
                      <View
                        key={news.id}
                        style={{
                          backgroundColor: colors.cardBg,
                          borderRadius: 12,
                          padding: 14,
                          borderWidth: 1.5,
                          borderColor: colors.primary,
                          marginBottom: 12,
                        }}
                      >
                        {/* CARD HEADER */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <View style={{
                            backgroundColor: cat.bg,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: cat.border,
                          }}>
                            <Text style={{ color: cat.color, fontSize: 11, fontWeight: 'bold' }}>
                              {cat.label}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>
                              {new Date(news.createdAt).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>

                            {isAdmin && (
                              <TouchableOpacity
                                onPress={() => handleDeleteNews(news.id, news.title)}
                                style={{
                                  padding: 4,
                                  backgroundColor: '#fee2e2',
                                  borderRadius: 4,
                                }}
                              >
                                <Trash2 size={13} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* TITEL & INHALT */}
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                          {news.title}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 12 }}>
                          {cleanText(news.content)}
                        </Text>

                        {/* AUTOR FOOTER + ALS GELESEN MARKIEREN BUTTON */}
                        <View style={{
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          paddingTop: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1 }}>
                            Von: <Text style={{ fontWeight: 'bold', color: colors.text }}>{news.authorName}</Text>
                          </Text>

                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: colors.primary,
                              paddingVertical: 6,
                              paddingHorizontal: 12,
                              borderRadius: 6,
                              gap: 4,
                            }}
                            onPress={() => onMarkAsRead(news.id)}
                          >
                            <Check size={13} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                              Verstanden ✅
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB: GELESENE NEWS (ARCHIV) */}
            {newsTab === 'read' && (
              <View>
                {readNews.length === 0 ? (
                  <View style={{
                    padding: 30,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.cardBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <Archive size={32} color={colors.textMuted} />
                    <Text style={{ color: colors.text, fontWeight: 'bold', marginTop: 8 }}>
                      Noch keine gelesenen News im Archiv
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                      Sobald du Mitteilungen als gelesen markierst, werden sie hier archiviert.
                    </Text>
                  </View>
                ) : (
                  readNews.map(news => {
                    const cat = getCategoryDetails(news.category);
                    return (
                      <View
                        key={news.id}
                        style={{
                          backgroundColor: colors.cardBg,
                          borderRadius: 12,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: colors.border,
                          marginBottom: 12,
                          opacity: 0.85,
                        }}
                      >
                        {/* CARD HEADER */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <View style={{
                            backgroundColor: cat.bg,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: cat.border,
                          }}>
                            <Text style={{ color: cat.color, fontSize: 11, fontWeight: 'bold' }}>
                              {cat.label}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>
                              {new Date(news.createdAt).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>

                            {isAdmin && (
                              <TouchableOpacity
                                onPress={() => handleDeleteNews(news.id, news.title)}
                                style={{
                                  padding: 4,
                                  backgroundColor: '#fee2e2',
                                  borderRadius: 4,
                                }}
                              >
                                <Trash2 size={13} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* TITEL & INHALT */}
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                          {news.title}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 10 }}>
                          {cleanText(news.content)}
                        </Text>

                        {/* AUTOR FOOTER */}
                        <View style={{
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          paddingTop: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            Verfasser: <Text style={{ fontWeight: 'bold', color: colors.text }}>{news.authorName}</Text> [{news.authorTitle || (news.authorRole === 'admin' ? 'Ausbilder' : 'Mod')}]
                          </Text>
                          <Text style={{ fontSize: 10, color: '#10b981', fontWeight: 'bold' }}>
                            ✓ Gelesen
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function HeaderRightActions({ 
  currentUser, 
  colors,
  unreadCount,
  onOpenNews,
  isDark
}: { 
  currentUser: User | null; 
  colors: any;
  unreadCount: number;
  onOpenNews: () => void;
  isDark: boolean;
}) {
  if (!currentUser) return null;

  const isImgUri = (uri: string) => {
    return uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://') || uri.startsWith('data:') || uri.includes('/') || uri.includes('\\');
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 10 }}>
      {/* NEWS & UPDATES BUTTON (INFO-SYMBOL 'I') NEBEN DEM PROFIL */}
      <TouchableOpacity
        onPress={onOpenNews}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: isDark ? '#374151' : '#e5e7eb',
          position: 'relative',
        }}
        activeOpacity={0.7}
        accessibilityLabel="News & Updates"
      >
        <Info size={19} color={isDark ? '#ffffff' : '#111827'} />
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: '#ef4444',
            borderRadius: 9,
            minWidth: 18,
            height: 18,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            borderWidth: 2,
            borderColor: isDark ? '#111827' : '#ffffff',
          }}>
            <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>
              {unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* PROFIL BUTTON */}
      <TouchableOpacity 
        onPress={() => router.push('/profile')}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: isDark ? '#4b5563' : '#d1d5db',
          overflow: 'hidden',
        }}
        activeOpacity={0.7}
        accessibilityLabel="Mein Benutzerprofil"
      >
        {currentUser.avatarUrl && isImgUri(currentUser.avatarUrl) ? (
          <Image source={{ uri: currentUser.avatarUrl }} style={{ width: '100%', height: '100%' }} />
        ) : currentUser.avatarUrl ? (
          <Text style={{ fontSize: 18 }}>{currentUser.avatarUrl}</Text>
        ) : (
          <UserIcon size={18} color={isDark ? '#ffffff' : '#374151'} />
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <MainAppLayout />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function MainAppLayout() {
  const { isDark, colors: themeColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape } = useDeviceLayout();

  // Orientierung runtime-weit freischalten (falls natives Modul im Build vorhanden)
  useEffect(() => {
    try {
      const { requireOptionalNativeModule } = require('expo-modules-core');
      if (requireOptionalNativeModule('ExpoScreenOrientation')) {
        const ScreenOrientation = require('expo-screen-orientation');
        ScreenOrientation.unlockAsync().catch(() => {});
      }
    } catch (e) {
      // Sicher ignorieren falls im bestehenden Native-Build noch nicht vorhanden
    }
  }, []);

  // Web-Titel für Browser-Reiter
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Tf-Trainer';
    }
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [readNewsIds, setReadNewsIds] = useState<string[]>([]);
  const [newsModalVisible, setNewsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Farben konfigurieren
  const activeColor = themeColors.primary;
  const inactiveColor = themeColors.textMuted;
  const backgroundColor = themeColors.background;
  const cardBackgroundColor = themeColors.cardBg;
  const borderColor = themeColors.border;
  const textColor = themeColors.text;

  const fetchNews = async () => {
    try {
      const items = await mockDb.getNews();
      setNewsList(prev => (prev.length === items.length && prev[0]?.id === items[0]?.id ? prev : items));
      const user = await mockDb.getCurrentUser();
      const readIds = await mockDb.getReadNewsIds(user?.id);
      setReadNewsIds(prev => (prev.length === readIds.length && prev[0] === readIds[0] ? prev : readIds));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsRead = async (newsId: string) => {
    const user = currentUser || (await mockDb.getCurrentUser());
    await mockDb.markNewsAsRead(newsId, user?.id);
    const updated = await mockDb.getReadNewsIds(user?.id);
    setReadNewsIds(updated);
  };

  const handleMarkAllAsRead = async () => {
    const user = currentUser || (await mockDb.getCurrentUser());
    await mockDb.markAllNewsAsRead(user?.id);
    const updated = await mockDb.getReadNewsIds(user?.id);
    setReadNewsIds(updated);
  };

  const unreadCount = newsList.filter(n => !readNewsIds.includes(n.id)).length;

  // iOS Safari Zoom-Verhinderung im Web (Meta-Tag, Gesten & 16px Inputs)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'viewport');
          document.head.appendChild(meta);
        }
        meta.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover'
        );

        const preventGesture = (e: Event) => {
          e.preventDefault();
        };
        document.addEventListener('gesturestart', preventGesture, { passive: false });
        document.addEventListener('gesturechange', preventGesture, { passive: false });
        document.addEventListener('gestureend', preventGesture, { passive: false });

        let lastTouchEnd = 0;
        const preventDoubleTap = (e: TouchEvent) => {
          const now = Date.now();
          if (now - lastTouchEnd <= 300) {
            e.preventDefault();
          }
          lastTouchEnd = now;
        };
        document.addEventListener('touchend', preventDoubleTap, { passive: false });

        const styleId = 'tf-trainer-ios-zoom-guard';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
            input, textarea, select {
              font-size: 16px !important;
            }
            html, body {
              touch-action: pan-x pan-y;
              -webkit-text-size-adjust: 100%;
              text-size-adjust: 100%;
              overscroll-behavior-y: none;
            }
          `;
          document.head.appendChild(style);
        }

        return () => {
          document.removeEventListener('gesturestart', preventGesture);
          document.removeEventListener('gesturechange', preventGesture);
          document.removeEventListener('gestureend', preventGesture);
          document.removeEventListener('touchend', preventDoubleTap);
        };
      } catch (e) {
        console.warn('Error applying web zoom guard:', e);
      }
    }
  }, []);

  // Auth-Status & Rollen & News regelmäßig checken + Lautloser Instant-OTA-Check
  useEffect(() => {
    let hasCheckedStartup = false;
    let registeredPushUserId: string | null = null;

    const checkData = async () => {
      let user = await mockDb.getCurrentUser();
      if (user && typeof user === 'object' && Platform.OS === 'web') {
        // Authoritative Server-Validierung gegen Supabase (Backend Paywall & Rolle abgleichen)
        const validated = await mockDb.validateWebAccessAuthoritative(user);
        if (validated && typeof validated === 'object') {
          user = validated;
        }
      }
      if (user && typeof user === 'object') {
        setCurrentUser(prev => (prev?.id === user?.id && prev?.role === user?.role && prev?.title === user?.title && prev?.isWebUnlocked === user?.isWebUnlocked ? prev : user));
      } else {
        setCurrentUser(null);
      }
      if (user?.id && registeredPushUserId !== user.id) {
        registeredPushUserId = user.id;
        registerForPushNotificationsAsync(user.id).catch(() => {});
      }
      const allRoles = await mockDb.getRoles();
      setRoles(prev => (prev.length === allRoles.length && prev[0]?.id === allRoles[0]?.id ? prev : allRoles));
      await fetchNews();
      // 4-Augen-Prinzip: Startabfrage zur Prüfung und Freigabe verifizierter Fragen & Lernkarten (nur 1x beim Start)
      if (!hasCheckedStartup && user) {
        hasCheckedStartup = true;
        await mockDb.performStartupVerificationCheck(user?.role);
      }
      setLoading(false);
    };

    // Lautloses, blitzschnelles Laden von Updates im Hintergrund ohne Ladebalken
    async function checkOtaUpdate() {
      try {
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        }
      } catch (e) {
        console.log('OTA Check error:', e);
      }
    }

    requestNotificationPermissions();
    checkData();
    checkOtaUpdate();
    const interval = setInterval(checkData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: backgroundColor }}>
        <ActivityIndicator size="large" color={activeColor} />
      </View>
    );
  }

  // Falls nicht eingeloggt, Login/Registrierung vorschalten
  if (!currentUser) {
    return (
      <AuthScreen 
        onLoginSuccess={async (loggedInUser) => {
          if (loggedInUser && typeof loggedInUser === 'object') {
            if (Platform.OS === 'web') {
              const validated = await mockDb.validateWebAccessAuthoritative(loggedInUser);
              setCurrentUser(validated || loggedInUser);
            } else {
              setCurrentUser(loggedInUser);
            }
          }
        }} 
      />
    );
  }

  // WEB-GATE: Prüfung der Web-Freischaltung (4,99 € PayPal / Key oder Dozenten)
  if (Platform.OS === 'web') {
    const isUnlocked = mockDb.isUserWebUnlocked(currentUser, roles);

    if (!isUnlocked) {
      return (
        <WebPaywallScreen
          currentUser={currentUser}
          onUnlocked={(updatedUser) => {
            setCurrentUser({ ...updatedUser, isWebUnlocked: true });
          }}
          onLogout={async () => {
            await mockDb.logoutUser();
            setCurrentUser(null);
          }}
        />
      );
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: backgroundColor }}>
      <View style={{ 
        flex: 1, 
        width: '100%', 
        alignSelf: 'center', 
      }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NewsUpdatesModal
          visible={newsModalVisible}
          onClose={() => setNewsModalVisible(false)}
          currentUser={currentUser}
          roles={roles}
          newsList={newsList}
          readNewsIds={readNewsIds}
          onNewsUpdated={fetchNews}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          colors={{
            background: backgroundColor,
            cardBg: cardBackgroundColor,
            border: borderColor,
            text: textColor,
            textMuted: inactiveColor,
            primary: activeColor,
          }}
          isDark={isDark}
        />



      <Tabs
        tabBar={(props) => (
          <CustomTabBar 
            {...props} 
            currentUser={currentUser}
            roles={roles}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            backgroundColor={backgroundColor}
            borderColor={borderColor}
            insets={insets}
          />
        )}
        screenOptions={{
          headerRight: () => (
            <HeaderRightActions 
              currentUser={currentUser} 
              unreadCount={unreadCount}
              onOpenNews={() => setNewsModalVisible(true)}
              colors={{ 
                background: backgroundColor, 
                border: borderColor, 
                text: textColor,
                textMuted: inactiveColor 
              }} 
              isDark={isDark}
            />
          ),
          headerStyle: {
            backgroundColor: backgroundColor,
            borderBottomColor: borderColor,
            borderBottomWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: isDark ? '#ffffff' : '#111827',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Lernen',
            headerTitle: 'Tf-Trainer - Lernen',
            tabBarLabel: 'Lernen',
            tabBarIcon: ({ color, size }) => (
              <BookOpen color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="quiz"
          options={{
            title: 'Prüfung',
            headerTitle: 'Prüfungssimulation',
            tabBarLabel: 'Prüfung',
            tabBarIcon: ({ color, size }) => (
              <Award color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Diskussion',
            headerTitle: 'Fach-Chat',
            tabBarLabel: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <MessageSquare color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            headerTitle: 'Verwaltung',
            tabBarLabel: 'Admin',
            // Für Moderatoren und Admins sichtbar, ansonsten ausgeblendet
            href: (currentUser.role === 'admin' || currentUser.role === 'moderator') ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <ShieldAlert color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            headerTitle: 'Benutzerkonto',
            tabBarLabel: 'Profil',
            href: null, // Versteckt den Profilreiter aus der unteren Leiste
            headerRight: () => null, // Deaktiviert das eigene Profil-Icon im Profil-Header
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
              >
                <ChevronLeft size={24} color={activeColor} />
              </TouchableOpacity>
            ),
            tabBarIcon: ({ color, size }) => (
              <UserIcon color={color} size={size} />
            ),
          }}
        />
      </Tabs>
      </View>
    </View>
  );
}
