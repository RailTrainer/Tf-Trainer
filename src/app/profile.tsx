import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  TextInput,
  Alert,
  Image,
  Modal,
  Switch,
  ActivityIndicator,
  Keyboard,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockDb, User, QuizAttempt, Ticket } from '../database/mockDb';
import * as ImagePicker from 'expo-image-picker';
import * as Updates from 'expo-updates';
import { useLocalSearchParams } from 'expo-router';
import { optimizeImage, uploadAndOptimizeImage } from '../utils/imageOptimizer';
import { useDynamicKeyboard } from '../hooks/useDynamicKeyboard';
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Mail, 
  Lock, 
  Award, 
  Activity, 
  Camera, 
  Check,
  X,
  LifeBuoy,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2, 
  Send, 
  Sparkles,
  RefreshCw,
  DownloadCloud,
  CheckCircle,
  Bug,
  Lightbulb,
  MessageSquare,
  Bell,
  BellOff,
  FileText,
  ShieldCheck,
  Sun,
  Moon,
  GraduationCap,
  Image as ImageIcon,
  Smartphone,
  KeyRound
} from 'lucide-react-native';
import { getIsChatMuted, setIsChatMuted, scheduleTestLockscreenNotification, registerForPushNotificationsAsync } from '../services/notificationService';
import { useAppTheme } from '../context/ThemeContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';

const AVATAR_PRESETS = ['🚂', '👮', '🛡️', '🔧', '🚄', '⭐', '🚇', '🎒'];

export default function ProfileScreen() {
  const { isDark, colors, setThemePreference } = useAppTheme();
  const { isTablet } = useDeviceLayout();
  const params = useLocalSearchParams<{ openTicket?: string }>();

  // States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Edit States
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Ticket System States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketType, setTicketType] = useState<'bug' | 'feature' | 'exam_question'>('exam_question');
  const [ticketDropdownOpen, setTicketDropdownOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketImageUrl, setTicketImageUrl] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Automatisch Ticket-Modal öffnen, falls per Banner (/profile?openTicket=true) aufgerufen
  useEffect(() => {
    if (params?.openTicket === 'true') {
      setTicketModalVisible(true);
      setShowTicketForm(true);
    }
  }, [params?.openTicket]);

  // Dynamische Tastatur-Verschiebung für ruckelfreies Hochwandern aller Eingabemasken
  const { keyboardHeight, dynamicKeyboardPadding } = useDynamicKeyboard(48);

  // Benachrichtigungen States
  const [isChatMutedState, setIsChatMutedState] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckOtaUpdate = async () => {
    try {
      setCheckingUpdate(true);
      if (__DEV__) {
        Alert.alert('Entwicklungsmodus', 'In Expo Go / Dev-Mode wird der Code direkt über den PC synchronisiert.');
        return;
      }
      if (!Updates.isEnabled) {
        Alert.alert('Hinweis', 'Live-Updates werden aktiv, sobald Build 9 aus dem Play Store installiert ist.');
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        Alert.alert('Alles aktuell! ✅', 'Du nutzt bereits die neueste Version (Version 1.1.3).');
      }
    } catch (e: any) {
      Alert.alert('Update-Status', e.message || 'App ist auf dem neuesten Stand.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const isEditingRef = useRef(isEditing);
  const hasInitializedUserRef = useRef(false);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 25000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const user = await mockDb.getCurrentUser();
      setCurrentUser(prev => (prev?.id === user?.id && prev?.name === user?.name && prev?.avatarUrl === user?.avatarUrl && prev?.title === user?.title ? prev : user));
      if (user && !hasInitializedUserRef.current) {
        hasInitializedUserRef.current = true;
        setEditName(user.name);
        setEditEmail(user.email);
        setEditAvatarUrl(user.avatarUrl || '');
        setEditTitle(user.title || '');
      }
      const history = await mockDb.getQuizHistory();
      setQuizHistory(prev => (prev.length === history.length && prev[0]?.id === history[0]?.id ? prev : history));
      if (user) {
        const userTickets = await mockDb.getTickets(user.id);
        setTickets(prev => (prev.length === userTickets.length && prev[0]?.id === userTickets[0]?.id ? prev : userTickets));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartEditing = () => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditEmail(currentUser.email);
      setEditAvatarUrl(currentUser.avatarUrl || '');
      setEditTitle(currentUser.title || '');
    }
    setEditPassword('');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditEmail(currentUser.email);
      setEditAvatarUrl(currentUser.avatarUrl || '');
      setEditTitle(currentUser.title || '');
    }
    setEditPassword('');
    setIsEditing(false);
  };

  const handleSaveTitle = async (customTitle?: string) => {
    if (!currentUser) return;
    const titleToSave = (customTitle !== undefined ? customTitle : editTitle).trim();
    try {
      await mockDb.updateUserTitle(currentUser.id, titleToSave);
      const updated = { ...currentUser, title: titleToSave };
      setCurrentUser(updated);
      setEditTitle(titleToSave);
      Alert.alert('Titel bestätigt! ✅', `Dein Titel wurde erfolgreich auf "${titleToSave || 'Kein Titel'}" gesetzt.`);
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte den Titel nicht speichern: ' + (e?.message || e));
    }
  };

  const handleLogout = async () => {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { 
        text: 'Abmelden', 
        style: 'destructive',
        onPress: async () => {
          await mockDb.logoutUser();
        } 
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Konto & alle Daten löschen?',
      'Möchtest du dein Benutzerkonto und alle deine persönlichen Daten (Lernfortschritte, Quiz-Ergebnisse, Chat-Beiträge) wirklich unwiderruflich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, Konto löschen',
          style: 'destructive',
          onPress: async () => {
            if (currentUser) {
              await mockDb.deleteUser(currentUser.id);
            }
            await mockDb.logoutUser();
            Alert.alert('Konto gelöscht', 'Dein Konto und alle zugehörigen Daten wurden erfolgreich gelöscht.');
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!editName.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen an.');
      return;
    }
    if (!editEmail.trim()) {
      Alert.alert('Fehler', 'Bitte gib eine E-Mail-Adresse an.');
      return;
    }

    try {
      const updated = await mockDb.updateUserProfile(
        currentUser.id,
        editName.trim(),
        editEmail.trim(),
        editPassword.trim() || undefined,
        editAvatarUrl,
        editTitle.trim()
      );
      setCurrentUser(updated);
      setEditName(updated.name);
      setEditEmail(updated.email);
      setEditAvatarUrl(updated.avatarUrl || '');
      setEditTitle(updated.title || '');
      setIsEditing(false);
      setEditPassword('');
      Alert.alert('Erfolg', 'Dein Profil wurde aktualisiert.');
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Konnte das Profil nicht aktualisieren.');
    }
  };

  const handlePickTicketImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung erforderlich', 'Wir benötigen Zugriff auf deine Fotos, um ein Bild an das Ticket anzuhängen.');
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
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'tickets');
        setTicketImageUrl(optimizedUri);
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte Foto nicht laden: ' + (e?.message || e));
    }
  };

  const handlePickTicketCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung erforderlich', 'Wir benötigen Zugriff auf deine Kamera, um ein Prüfungsfragen-Foto aufzunehmen.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const raw = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'tickets');
        setTicketImageUrl(optimizedUri);
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Kamera konnte nicht geöffnet werden: ' + (e?.message || e));
    }
  };

  const handleCreateTicket = async () => {
    if (!currentUser) return;
    if (!ticketTitle.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Betreff / Titel für das Ticket ein.');
      return;
    }
    if (!ticketDescription.trim()) {
      Alert.alert('Fehler', 'Bitte beschreibe deine Frage oder dein Anliegen.');
      return;
    }

    try {
      setSubmittingTicket(true);
      await mockDb.createTicket({
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        type: ticketType,
        title: ticketTitle.trim(),
        description: ticketDescription.trim(),
        imageUrl: ticketImageUrl || undefined,
      });
      setTicketTitle('');
      setTicketDescription('');
      setTicketImageUrl(null);
      setShowTicketForm(false);
      setTicketDropdownOpen(false);
      Alert.alert('Ticket eingereicht ✅', 'Vielen Dank! Dein Ticket wurde gespeichert (auch offline verfügbar) und an das Ausbilder-Team übermittelt.');
      loadData();
    } catch {
      Alert.alert('Fehler', 'Ticket konnte nicht erstellt werden.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    Alert.alert('Ticket löschen', 'Möchtest du dieses Ticket wirklich entfernen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await mockDb.deleteTicket(ticketId);
          loadData();
        }
      }
    ]);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung erforderlich', 'Wir benötigen Zugriff auf deine Fotos, um ein Profilbild auszuwählen.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const raw = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const optimizedUri = await uploadAndOptimizeImage(raw, 'avatar', 'avatars');

        setEditAvatarUrl(optimizedUri);

        // Sofort im Profil & AsyncStorage speichern
        if (currentUser) {
          const updated = await mockDb.updateUserProfile(
            currentUser.id,
            currentUser.name,
            currentUser.email,
            undefined,
            optimizedUri
          );
          setCurrentUser(updated);
        }
        Alert.alert('Erfolg', 'Dein Profilfoto wurde erfolgreich aktualisiert!');
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte die Bildgalerie nicht öffnen: ' + (e?.message || e));
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Ausbilder';
    if (role === 'moderator') return 'Mod';
    return 'Schüler';
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return { bg: '#fee2e2', text: '#ef4444' };
    if (role === 'moderator') return { bg: '#ffedd5', text: '#f97316' };
    return { bg: '#dcfce7', text: '#15803d' };
  };

  const isImgUri = (uri: string) => {
    return uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://') || uri.startsWith('data:') || uri.includes('/') || uri.includes('\\');
  };

  // Stats berechnen
  const statsCount = quizHistory.length;
  const bestScore = quizHistory.reduce((max, curr) => curr.score > max ? curr.score : max, 0);

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        automaticallyAdjustKeyboardInsets={true}
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: dynamicKeyboardPadding ? dynamicKeyboardPadding + 32 : 32 },
          isTablet && { maxWidth: 780, width: '100%', alignSelf: 'center' }
        ]} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentUser && (
          <>
            {/* PROFIL CARD */}
            <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <TouchableOpacity 
                  style={styles.avatarWrapper}
                  onPress={handlePickImage}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {currentUser.avatarUrl && isImgUri(currentUser.avatarUrl) ? (
                      <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatarImg} />
                    ) : currentUser.avatarUrl ? (
                      <Text style={styles.avatarEmoji}>{currentUser.avatarUrl}</Text>
                    ) : (
                      <UserIcon size={32} color={colors.textMuted} />
                    )}
                  </View>
                  
                  <View style={[styles.avatarCameraBadge, { backgroundColor: colors.primary }]}>
                    <Camera size={13} color="#ffffff" />
                  </View>
                </TouchableOpacity>

                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>{currentUser.name}</Text>
                  <Text style={[styles.userEmail, { color: colors.textMuted }]}>{currentUser.email}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <View style={[styles.badge, { backgroundColor: getRoleColor(currentUser.role).bg }]}>
                      <Text style={[styles.badgeText, { color: getRoleColor(currentUser.role).text }]}>
                        {getRoleLabel(currentUser.role)}
                      </Text>
                    </View>
                    {currentUser.title ? (
                      <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>
                          {currentUser.title}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* TITELAUSWAHL FÜR SCHÜLER BZW. DOZENTEN-TITEL */}
              {currentUser.role === 'user' ? (
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                    Deine Qualifikation / Ausbildungsbereich:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {(['Lokführer', 'Wagenmeister', 'Zf/Rb-bau'] as const).map((t) => {
                      const isSelected = (currentUser.title || editTitle) === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 14,
                            borderRadius: 10,
                            backgroundColor: isSelected ? colors.primary : (isDark ? '#1e293b' : '#f1f5f9'),
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderWidth: 1.5,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                          }}
                          onPress={() => handleSaveTitle(t)}
                        >
                          {isSelected && <Check size={14} color="#ffffff" />}
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? 'bold' : '600',
                              color: isSelected ? '#ffffff' : colors.text
                            }}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text, marginBottom: 6 }}>
                    Dozenten- / Zusatz-Titel:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 42, paddingVertical: 6, marginBottom: 0 }]}
                      placeholder="z.B. Ausbilder, Mod, Fachlehrer"
                      placeholderTextColor={colors.textMuted}
                      value={editTitle}
                      onChangeText={setEditTitle}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: colors.primary, paddingHorizontal: 14, height: 42, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      onPress={() => handleSaveTitle()}
                    >
                      <Check size={16} color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Titel bestätigen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!isEditing && (
                <TouchableOpacity 
                  style={[styles.editToggleBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                  onPress={handleStartEditing}
                >
                  <Settings size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.editToggleText}>Profil bearbeiten</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* EDIT MODE PANEL */}
            {isEditing && (
              <View style={[styles.editPanel, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.panelTitle, { color: colors.text }]}>Profil & Zugangsdaten anpassen</Text>
                
                <Text style={[styles.label, { color: colors.text }]}>Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Dein Name"
                  placeholderTextColor={colors.textMuted}
                  value={editName}
                  onChangeText={setEditName}
                />

                {currentUser.role === 'user' ? (
                  <View style={{ marginTop: 12, marginBottom: 4 }}>
                    <Text style={[styles.label, { color: colors.text, marginBottom: 6 }]}>Ausbildungsbereich / Titel</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {(['Lokführer', 'Wagenmeister', 'Zf/Rb-bau'] as const).map((t) => {
                        const isSelected = editTitle === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            style={{
                              paddingVertical: 8,
                              paddingHorizontal: 14,
                              borderRadius: 10,
                              backgroundColor: isSelected ? colors.primary : colors.background,
                              borderColor: isSelected ? colors.primary : colors.border,
                              borderWidth: 1.5,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6
                            }}
                            onPress={() => setEditTitle(t)}
                          >
                            {isSelected && <Check size={14} color="#ffffff" />}
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: isSelected ? 'bold' : '600',
                                color: isSelected ? '#ffffff' : colors.text
                              }}
                            >
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Dozenten-Titel / Zusatzbezeichnung</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginBottom: 0 }]}
                        placeholder="z.B. Ausbilder, Mod, Fachlehrer"
                        placeholderTextColor={colors.textMuted}
                        value={editTitle}
                        onChangeText={setEditTitle}
                      />
                      <TouchableOpacity
                        style={{ backgroundColor: colors.primary, paddingHorizontal: 12, height: 46, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => handleSaveTitle()}
                      >
                        <Check size={16} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Bestätigen</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>E-Mail-Adresse</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="name@adresse.de"
                  placeholderTextColor={colors.textMuted}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Neues Passwort (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Leer lassen für kein Wechsel"
                  placeholderTextColor={colors.textMuted}
                  value={editPassword}
                  onChangeText={setEditPassword}
                  secureTextEntry
                />

                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Profilbild / Avatar</Text>
                
                {/* Live Preview Box */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, padding: 10, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                  <View style={[styles.avatarContainer, { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    {editAvatarUrl && isImgUri(editAvatarUrl) ? (
                      <Image source={{ uri: editAvatarUrl }} style={styles.avatarImg} />
                    ) : editAvatarUrl ? (
                      <Text style={{ fontSize: 28 }}>{editAvatarUrl}</Text>
                    ) : (
                      <UserIcon size={24} color={colors.textMuted} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: 'bold' }}>Ausgewähltes Bild</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {editAvatarUrl && isImgUri(editAvatarUrl) ? 'Eigenes Foto aktiv' : editAvatarUrl ? `Emoji: ${editAvatarUrl}` : 'Kein Bild'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                    onPress={handlePickImage}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>🖼️ Aus Galerie</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.textMuted, fontSize: 11 }]}>Oder Bahn-Emoji wählen:</Text>
                <View style={styles.presetsGrid}>
                  {AVATAR_PRESETS.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.presetBtn,
                        { backgroundColor: editAvatarUrl === p ? colors.primary : colors.background }
                      ]}
                      onPress={() => setEditAvatarUrl(p)}
                    >
                      <Text style={{ fontSize: 24 }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={handleCancelEditing}
                  >
                    <Text style={{ color: colors.text }}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Speichern</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TICKET-SYSTEM / SUPPORT & FEEDBACK COMPACT BUTTON */}
            <TouchableOpacity
              style={[styles.ticketCompactCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              onPress={() => setTicketModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.ticketCompactIconBg, { backgroundColor: colors.primary + '18' }]}>
                <LifeBuoy size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.ticketCompactTitle, { color: colors.text }]}>
                    Support & Feedback
                  </Text>
                  {tickets.length > 0 && (
                    <View style={[styles.ticketCountBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.ticketCountBadgeText}>
                        {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.ticketCompactSubtitle, { color: colors.textMuted }]}>
                  Fehler melden & Verbesserungsvorschläge einreichen
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* BENACHRICHTIGUNGEN / STUMMSCHALTEN OPTION */}
            <View style={[styles.ticketCompactCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.ticketCompactIconBg, { backgroundColor: isChatMutedState ? '#ef444418' : colors.primary + '18' }]}>
                {isChatMutedState ? <BellOff size={22} color="#ef4444" /> : <Bell size={22} color={colors.primary} />}
              </View>
              <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                <Text style={[styles.ticketCompactTitle, { color: colors.text }]}>
                  Chat-Benachrichtigungen
                </Text>
                <Text style={[styles.ticketCompactSubtitle, { color: colors.textMuted }]}>
                  {isChatMutedState ? 'Stumm (Keine Push-Mitteilungen)' : 'Aktiv (Push bei neuen Nachrichten)'}
                </Text>
              </View>
              <Switch
                value={!isChatMutedState}
                onValueChange={async (active) => {
                  const nextMuted = !active;
                  setIsChatMutedState(nextMuted);
                  await setIsChatMuted(nextMuted);
                }}
                trackColor={{ false: isDark ? '#374151' : '#d1d5db', true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {/* PUSH-TOKEN REGISTRIEREN */}
            <TouchableOpacity 
              style={[
                styles.ticketCompactCard, 
                { 
                  backgroundColor: colors.cardBg, 
                  borderColor: colors.border,
                  marginTop: -2,
                  marginBottom: 12,
                  paddingVertical: 10
                }
              ]}
              onPress={async () => {
                if (!currentUser?.id) {
                  Alert.alert('Hinweis', 'Bitte melde dich erst an.');
                  return;
                }
                const res = await registerForPushNotificationsAsync(currentUser.id);
                if (res.token) {
                  Alert.alert(
                    '✅ Push-Token registriert!',
                    `Dein Smartphone ist jetzt direkt mit der Cloud verknüpft!\n\nToken: ${res.token.substring(0, 30)}...\n\nSperrbildschirm-Nachrichten erreichen dich ab sofort auch bei geschlossener App!`
                  );
                } else {
                  Alert.alert(
                    '⚙️ Push-Status',
                    res.error || 'Konnte keinen Push-Token von Android erhalten.'
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.ticketCompactIconBg, { backgroundColor: '#10b98118' }]}>
                <Smartphone size={18} color="#10b981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.ticketCompactTitle, { color: colors.text, fontSize: 13 }]}>
                  Push-Empfang für dieses Handy aktivieren
                </Text>
                <Text style={[styles.ticketCompactSubtitle, { color: colors.textMuted, fontSize: 11 }]}>
                  Verknüpft dein Gerät mit der Cloud für Chat-Nachrichten
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* FARBSCHEMA / DESIGN WECHSELN (HELL / DUNKEL) */}
            <View style={[styles.ticketCompactCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.ticketCompactIconBg, { backgroundColor: isDark ? '#818cf822' : '#f59e0b22' }]}>
                {isDark ? <Moon size={22} color="#818cf8" /> : <Sun size={22} color="#d97706" />}
              </View>
              <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                <Text style={[styles.ticketCompactTitle, { color: colors.text }]}>
                  Erscheinungsbild / Design
                </Text>
                <Text style={[styles.ticketCompactSubtitle, { color: colors.textMuted }]}>
                  {isDark ? 'Dunkles Design (Dark Mode)' : 'Helles Design (Light Mode)'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(active) => {
                  setThemePreference(active ? 'dark' : 'light');
                }}
                trackColor={{ false: '#cbd5e1', true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {/* STATS SECTION */}
            <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.secTitle, { color: colors.text }]}>Deine Quiz-Statistik</Text>
              
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                  <Activity size={24} color={colors.primary} />
                  <Text style={[styles.statVal, { color: colors.text }]}>{statsCount}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Absolvierte Tests</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                  <Award size={24} color="#f59e0b" />
                  <Text style={[styles.statVal, { color: colors.text }]}>{bestScore} Pkt.</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Höchste Punktzahl</Text>
                </View>
              </View>
            </View>

            {/* LIVE UPDATE CHECK BUTTON */}
            <TouchableOpacity 
              style={[
                styles.logoutBtn, 
                { 
                  backgroundColor: colors.cardBg, 
                  borderColor: colors.primary, 
                  borderWidth: 1.5, 
                  marginBottom: 12 
                }
              ]} 
              onPress={handleCheckOtaUpdate}
              disabled={checkingUpdate}
              activeOpacity={0.8}
            >
              {checkingUpdate ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              ) : (
                <RefreshCw size={18} color={colors.primary} style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.logoutText, { color: colors.primary, fontWeight: 'bold' }]}>
                {checkingUpdate ? 'Suche nach Updates...' : '🔄 Auf Live-Updates prüfen'}
              </Text>
            </TouchableOpacity>

            {/* LOGOUT & KONTO LÖSCHEN BUTTONS */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Abmelden</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.logoutBtn, 
                { 
                  backgroundColor: 'transparent', 
                  borderColor: isDark ? '#ef444460' : '#ef4444', 
                  borderWidth: 1, 
                  marginTop: 10 
                }
              ]} 
              onPress={handleDeleteAccount}
            >
              <Trash2 size={18} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={[styles.logoutText, { color: '#ef4444' }]}>Konto & alle Daten endgültig löschen</Text>
            </TouchableOpacity>

            {/* SCHRIFT: RailTrainer by Dennis Köster */}
            <View style={{ marginTop: 24, marginBottom: 12, alignItems: 'center' }}>
              <Text style={{ textAlign: 'center', color: colors.text, fontSize: 14, fontWeight: 'bold' }}>
                RailTrainer • © by Dennis Köster
              </Text>
              <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                Interaktive Lern- & Wissensplattform (Version 1.1.3)
              </Text>
            </View>

            {/* AUFKLAPPBARES IMPRESSUM DIREKT DARUNTER */}
            <View style={[styles.inlineImpressumCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                onPress={() => setShowImpressum(!showImpressum)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} color={colors.primary} />
                  <Text style={[styles.impressumSectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    Impressum, Datenschutz & Kontolöschung
                  </Text>
                </View>
                {showImpressum ? (
                  <ChevronUp size={18} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>

              {showImpressum && (
                <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                  {/* Angaben gem. § 5 TMG */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.impressumTextBold, { color: colors.text }]}>Angaben gemäß § 5 TMG:</Text>
                    <Text style={[styles.impressumText, { color: isDark ? '#e5e7eb' : '#4b5563' }]}>
                      Herausgeber & Entwicklung: Dennis Köster
                    </Text>
                    <Text style={[styles.impressumText, { color: colors.textMuted, marginTop: 2 }]}>
                      Interaktive Lernplattform für Triebfahrzeugführer, Wagenprüfer & Bahnbetriebspersonal.
                    </Text>
                  </View>

                  {/* Support */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.impressumTextBold, { color: colors.text }]}>Support & Feedback:</Text>
                    <Text style={[styles.impressumText, { color: isDark ? '#e5e7eb' : '#4b5563' }]}>
                      Über das integrierte Support-Ticketsystem im Benutzerkonto oder per E-Mail an: support@railtrainer.de
                    </Text>
                  </View>

                  {/* Datenschutz & Kontolöschung */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.impressumTextBold, { color: colors.text }]}>Datenschutz & Kontolöschung:</Text>
                    <Text style={[styles.impressumText, { color: colors.textMuted, marginTop: 2 }]}>
                      Nutzer können ihr Konto jederzeit in der App oder online über die offizielle Lösch-Seite unwiderruflich löschen lassen.
                    </Text>
                  </View>

                  {/* Regelwerke */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.impressumTextBold, { color: colors.text }]}>Fachliche Regelwerks-Grundlagen:</Text>
                    <Text style={[styles.impressumBullet, { color: isDark ? '#e5e7eb' : '#4b5563' }]}>• VDV-Schrift 757 (Bremsen und Bremsproben im Eisenbahnbetrieb)</Text>
                    <Text style={[styles.impressumBullet, { color: isDark ? '#e5e7eb' : '#4b5563' }]}>• VDV-Schrift 758 (Wagenprüfung im Güterverkehr)</Text>
                    <Text style={[styles.impressumBullet, { color: isDark ? '#e5e7eb' : '#4b5563' }]}>• Ril 301 (Signalbuch der DB InfraGO AG)</Text>
                    <Text style={[styles.impressumBullet, { color: isDark ? '#e5e7eb' : '#4b5563' }]}>• Ril 408 (Fahrdienstvorschrift) / FV-NE</Text>
                  </View>

                  {/* Haftungsausschluss */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.impressumTextBold, { color: colors.text }]}>Haftungsausschluss (Disclaimer):</Text>
                    <Text style={[styles.impressumText, { color: colors.textMuted, marginTop: 2 }]}>
                      Die in dieser Anwendung bereitgestellten Lerninhalte, Musterlösungen und Regelwerkszitate dienen ausschließlich als Ausbildungs- und Übungshilfe. Im praktischen Betriebsdienst sind stets die offiziellen und aktuell gültigen Regelwerke des zuständigen Eisenbahnverkehrsunternehmens (EVU) bzw. Infrastrukturbetreibers maßgebend.
                    </Text>
                  </View>

                  {/* Urheberrecht */}
                  <View>
                    <Text style={[styles.impressumTextBold, { color: colors.text }]}>Urheberrecht:</Text>
                    <Text style={[styles.impressumText, { color: colors.textMuted, marginTop: 2 }]}>
                      © Dennis Köster. Alle Rechte an der Software und den redaktionellen Ausarbeitungen vorbehalten.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* TICKET-SYSTEM MODAL */}
      <Modal
        visible={ticketModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setTicketModalVisible(false);
          setShowTicketForm(false);
          setTicketDropdownOpen(false);
        }}
      >
        <SafeAreaView style={[
          styles.modalSafeArea, 
          { backgroundColor: colors.background },
          isTablet && { maxWidth: 780, width: '100%', alignSelf: 'center' }
        ]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
              <LifeBuoy size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]} numberOfLines={1}>Support</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>Ticketsystem</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <TouchableOpacity
                style={[
                  styles.newTicketToggleBtn,
                  { backgroundColor: showTicketForm ? colors.border : colors.primary }
                ]}
                onPress={() => {
                  setShowTicketForm(!showTicketForm);
                  setTicketDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: showTicketForm ? colors.text : '#ffffff', fontSize: 12, fontWeight: 'bold' }} numberOfLines={1}>
                  {showTicketForm ? 'Übersicht' : '+ Ticket'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => {
                  setTicketModalVisible(false);
                  setShowTicketForm(false);
                  setTicketDropdownOpen(false);
                }}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            automaticallyAdjustKeyboardInsets={true}
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.modalScrollContent, { paddingBottom: dynamicKeyboardPadding ? dynamicKeyboardPadding + 32 : 32 }]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* TICKET FORMULAR */}
            {showTicketForm ? (
              <View style={[styles.ticketFormBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.secTitle, { color: colors.text, marginBottom: 12 }]}>Neues Ticket erstellen</Text>

                <Text style={[styles.label, { color: colors.text }]}>Kategorie / Anliegen *</Text>
                
                {/* DROPDOWN TRIGGER */}
                <TouchableOpacity
                  style={[styles.dropdownTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setTicketDropdownOpen(!ticketDropdownOpen)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {ticketType === 'exam_question' ? (
                      <>
                        <GraduationCap size={16} color="#8b5cf6" />
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13 }}>🎓 Prüfungsfrage einreichen</Text>
                      </>
                    ) : ticketType === 'bug' ? (
                      <>
                        <Bug size={16} color="#ef4444" />
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13 }}>🐞 Fehler melden</Text>
                      </>
                    ) : (
                      <>
                        <Lightbulb size={16} color="#3b82f6" />
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13 }}>💡 Verbesserungsvorschlag</Text>
                      </>
                    )}
                  </View>
                  {ticketDropdownOpen ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
                </TouchableOpacity>

                {/* DROPDOWN MENU ITEMS */}
                {ticketDropdownOpen && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        ticketType === 'exam_question' && { backgroundColor: isDark ? '#3b0764' : '#ede9fe' }
                      ]}
                      onPress={() => {
                        setTicketType('exam_question');
                        setTicketDropdownOpen(false);
                      }}
                    >
                      <GraduationCap size={16} color="#8b5cf6" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: 13 }}>🎓 Prüfungsfrage einreichen</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>Frage aus Prüfung/Unterlagen fotografieren & einreichen</Text>
                      </View>
                      {ticketType === 'exam_question' && <Check size={16} color="#8b5cf6" />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        ticketType === 'bug' && { backgroundColor: isDark ? '#374151' : '#fee2e2' },
                        { borderTopWidth: 1, borderTopColor: colors.border }
                      ]}
                      onPress={() => {
                        setTicketType('bug');
                        setTicketDropdownOpen(false);
                      }}
                    >
                      <Bug size={16} color="#ef4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 13 }}>🐞 Fehler melden</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>Falsche Frage, Tippfehler, Bug in der App</Text>
                      </View>
                      {ticketType === 'bug' && <Check size={16} color="#ef4444" />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        ticketType === 'feature' && { backgroundColor: isDark ? '#374151' : '#dbeafe' },
                        { borderTopWidth: 1, borderTopColor: colors.border }
                      ]}
                      onPress={() => {
                        setTicketType('feature');
                        setTicketDropdownOpen(false);
                      }}
                    >
                      <Lightbulb size={16} color="#3b82f6" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 13 }}>💡 Verbesserungsvorschlag</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>Neue Lerninhalte, Funktionswünsche, Ideen</Text>
                      </View>
                      {ticketType === 'feature' && <Check size={16} color="#2563eb" />}
                    </TouchableOpacity>
                  </View>
                )}

                {/* TITEL */}
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Betreff / Titel *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder={
                    ticketType === 'exam_question' 
                      ? 'z.B. Prüfungsfrage zu PZB Restriktiv / FV-NE...' 
                      : ticketType === 'bug' 
                      ? 'z.B. Fehler bei Quizfrage zur Bremsprobe...' 
                      : 'z.B. Mehr Fragen zu ETCS Betriebsarten...'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={ticketTitle}
                  onChangeText={setTicketTitle}
                />

                {/* BESCHREIBUNG */}
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Beschreibung / Frage *</Text>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      backgroundColor: colors.background, 
                      color: colors.text, 
                      borderColor: colors.border,
                      minHeight: 80,
                      textAlignVertical: 'top',
                      paddingTop: 10
                    }
                  ]}
                  placeholder={
                    ticketType === 'exam_question'
                      ? 'Beschreibe die Frage oder den Kontext aus der Prüfung...'
                      : 'Beschreibe dein Anliegen möglichst detailliert...'
                  }
                  placeholderTextColor={colors.textMuted}
                  multiline
                  scrollEnabled={false}
                  value={ticketDescription}
                  onChangeText={setTicketDescription}
                />

                {/* KAMERA & FOTO ANHANG */}
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>
                  Foto / Prüfungsunterlage (optional)
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={handlePickTicketCamera}
                  >
                    <Camera size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>Kamera (Foto)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallActionBtn, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={handlePickTicketImage}
                  >
                    <ImageIcon size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>Aus Galerie</Text>
                  </TouchableOpacity>
                </View>

                {ticketImageUrl && (
                  <View style={{ marginTop: 10, position: 'relative', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
                    <Image source={{ uri: ticketImageUrl }} style={{ width: '100%', height: 160 }} resizeMode="contain" />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#ef4444', padding: 6, borderRadius: 16 }}
                      onPress={() => setTicketImageUrl(null)}
                    >
                      <X size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* SUBMIT BUTTON */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      setShowTicketForm(false);
                      setTicketDropdownOpen(false);
                      setTicketImageUrl(null);
                    }}
                  >
                    <Text style={{ color: colors.text }}>Abbrechen</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCreateTicket}
                    disabled={submittingTicket}
                  >
                    <Send size={15} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>
                      {submittingTicket ? 'Wird gesendet...' : 'Ticket absenden'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* TICKET-LISTE (MEINE TICKETS) */
              <View>
                <Text style={[styles.subSecTitle, { color: colors.text, marginBottom: 12 }]}>
                  Meine eingereichten Tickets ({tickets.length})
                </Text>

                {tickets.length === 0 ? (
                  <View style={[styles.emptyTicketsBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <MessageSquare size={32} color={colors.textMuted} />
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginTop: 10 }}>
                      Keine Tickets vorhanden
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
                      Du hast bisher keine Tickets eingereicht. Klicke oben auf "+ Ticket", um Prüfungsfragen, Feedback oder Fehlermeldungen mit Foto zu senden.
                    </Text>
                  </View>
                ) : (
                  tickets.map((t) => {
                    const isBug = t.type === 'bug';
                    const isExam = t.type === 'exam_question';
                    const isPwdReset = t.type === 'password_reset';
                    const isResolved = t.status === 'resolved';
                    const isInProgress = t.status === 'in_progress';

                    return (
                      <View 
                        key={t.id} 
                        style={[styles.ticketCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                      >
                        {/* Header: Typ-Badge + Status-Badge */}
                        <View style={styles.ticketCardHeader}>
                          <View style={[
                            styles.ticketTypeBadge, 
                            { 
                              backgroundColor: isDark 
                                ? (isPwdReset ? '#78350f' : isExam ? '#4c1d95' : isBug ? '#7f1d1d' : '#1e3a8a') 
                                : (isPwdReset ? '#fef3c7' : isExam ? '#ede9fe' : isBug ? '#fee2e2' : '#dbeafe') 
                            }
                          ]}>
                            {isPwdReset ? (
                              <KeyRound size={12} color={isDark ? '#fde68a' : '#d97706'} />
                            ) : isExam ? (
                              <GraduationCap size={12} color={isDark ? '#c4b5fd' : '#7c3aed'} />
                            ) : isBug ? (
                              <Bug size={12} color={isDark ? '#fca5a5' : '#dc2626'} />
                            ) : (
                              <Lightbulb size={12} color={isDark ? '#93c5fd' : '#2563eb'} />
                            )}
                            <Text style={{ 
                              color: isDark 
                                ? (isPwdReset ? '#fde68a' : isExam ? '#c4b5fd' : isBug ? '#fca5a5' : '#93c5fd') 
                                : (isPwdReset ? '#d97706' : isExam ? '#7c3aed' : isBug ? '#dc2626' : '#2563eb'), 
                              fontSize: 11, 
                              fontWeight: 'bold',
                              marginLeft: 4 
                            }}>
                              {isPwdReset ? 'Passwort-Reset' : isExam ? 'Prüfungsfrage' : isBug ? 'Fehler' : 'Vorschlag'}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[
                              styles.ticketStatusBadge,
                              { 
                                backgroundColor: isDark 
                                ? (isResolved ? '#064e3b' : (isInProgress ? '#1e3a8a' : '#78350f')) 
                                : (isResolved ? '#d1fae5' : (isInProgress ? '#dbeafe' : '#fef3c7'))
                              }
                            ]}>
                              {isResolved ? (
                                <CheckCircle2 size={11} color={isDark ? '#6ee7b7' : '#059669'} />
                              ) : isInProgress ? (
                                <Clock size={11} color={isDark ? '#93c5fd' : '#2563eb'} />
                              ) : (
                                <AlertCircle size={11} color={isDark ? '#fde68a' : '#d97706'} />
                              )}
                              <Text style={{
                                color: isDark 
                                  ? (isResolved ? '#6ee7b7' : (isInProgress ? '#93c5fd' : '#fde68a')) 
                                  : (isResolved ? '#059669' : (isInProgress ? '#2563eb' : '#d97706')),
                                fontSize: 10,
                                fontWeight: 'bold',
                                marginLeft: 3
                              }}>
                                {isResolved ? 'Beantwortet' : (isInProgress ? 'In Bearbeitung' : 'Offen')}
                              </Text>
                            </View>

                            <TouchableOpacity onPress={() => handleDeleteTicket(t.id)}>
                              <Trash2 size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Title & Description */}
                        <Text style={[styles.ticketTitleText, { color: colors.text }]}>{t.title}</Text>
                        <Text style={[styles.ticketDescText, { color: isDark ? '#e5e7eb' : '#4b5563' }]}>{t.description}</Text>

                        {/* Foto-Anhang Vorschau */}
                        {t.imageUrl && (
                          <TouchableOpacity 
                            style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}
                            onPress={() => setPreviewModalImage(t.imageUrl || null)}
                            activeOpacity={0.8}
                          >
                            <Image source={{ uri: t.imageUrl }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                            <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#00000088', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>🔍 Antippen zum Vergrößern</Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        <Text style={[styles.ticketDateText, { color: colors.textMuted, marginTop: 8 }]}>
                          📅 {new Date(t.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>

                        {/* Ausbilder-Antwort (falls vorhanden) */}
                        {t.response && (
                          <View style={[styles.ticketResponseBox, { backgroundColor: isDark ? '#064e3b20' : '#ecfdf5', borderColor: '#10b981' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <CheckCircle2 size={14} color="#10b981" />
                              <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                                Antwort von {t.responderName} [{t.responderRole || 'Ausbilder'}]:
                              </Text>
                            </View>
                            <Text style={[styles.ticketResponseText, { color: colors.text }]}>
                              {t.response}
                            </Text>
                            {t.respondedAt && (
                              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}>
                                {new Date(t.respondedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      <Modal
        visible={previewModalImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalImage(null)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: '#000000dd', justifyContent: 'center', alignItems: 'center', padding: 16 }}
          activeOpacity={1}
          onPress={() => setPreviewModalImage(null)}
        >
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, backgroundColor: '#ffffff33', padding: 8, borderRadius: 20, zIndex: 10 }}
            onPress={() => setPreviewModalImage(null)}
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {previewModalImage && (
            <Image source={{ uri: previewModalImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  profileCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 13,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  editToggleBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editToggleText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  editPanel: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  saveBtn: {
    backgroundColor: '#16a34a',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subSecTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ticketCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  ticketCompactIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCompactTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  ticketCompactSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  ticketCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ticketCountBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  newTicketToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#16a34a',
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  ticketFormBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownMenu: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  emptyTicketsBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ticketTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ticketStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ticketTitleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ticketDescText: {
    fontSize: 12,
    lineHeight: 18,
  },
  ticketDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  ticketResponseBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  ticketResponseText: {
    fontSize: 12,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  statVal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLbl: {
    fontSize: 10,
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  impressumCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  inlineImpressumCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  impressumSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  impressumTextBold: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  impressumText: {
    fontSize: 12,
    lineHeight: 18,
  },
  impressumBullet: {
    fontSize: 12,
    lineHeight: 17,
  },
});
