import React, { useState, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { mockDb, User, QuizAttempt, Ticket, Category, Question, Fact } from '../database/mockDb';
import * as ImagePicker from 'expo-image-picker';
import * as Updates from 'expo-updates';
import { router, useLocalSearchParams } from 'expo-router';
import { uploadAndOptimizeImage } from '../utils/imageOptimizer';
import { useDynamicKeyboard } from '../hooks/useDynamicKeyboard';
import { CreateFactModal } from '../components/CreateFactModal';
import { CreateQuestionModal } from '../components/CreateQuestionModal';
import {
  AlertCircle,
  Bell,
  BellOff,
  BookOpen,
  Bug,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  GraduationCap,
  Image as ImageIcon,
  Inbox,
  KeyRound,
  LifeBuoy,
  Lightbulb,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  User as UserIcon,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { setIsChatMuted, registerForPushNotificationsAsync } from '../services/notificationService';
import { useAppTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ListRow } from '../components/ui/ListRow';
import { Heading, Section } from '../components/ui/Section';
import { StatusMessage, type Status } from '../components/ui/StatusMessage';
import { TextField } from '../components/ui/TextField';
import { CONTENT_MAX_WIDTH, MIN_TOUCH_TARGET, RADIUS, SCREEN_PADDING } from '../components/ui/tokens';

const IS_WEB = Platform.OS === 'web';
const APP_NAME = 'Tf-Trainer';
const APP_VERSION = Constants.expoConfig?.version;
const SUPPORT_EMAIL = 'support@tf-trainer.de';
// RN Web blurt bei „on-drag“ jedes fokussierte Feld, sobald die ScrollView scrollt (z. B. beim Fokus-Sprung) – im Web daher aus.
const KEYBOARD_DISMISS_MODE = IS_WEB ? 'none' : 'on-drag';

// Avatare sind Nutzerdaten (avatarUrl speichert das Zeichen); früher gewählte Symbole werden weiter angezeigt.
const AVATAR_PRESETS = [
  '👨‍✈️', '👩‍✈️', '🤪', '🥸', '🤠', '🤓', '😎', '🧐',
  '🥳', '🤯', '🤩', '🤑', '🤤', '🤡', '🧑‍🎤', '🧙‍♂️',
  '🦹‍♂️', '🦸‍♂️', '🧑‍🍳', '🧔‍♂️', '👨‍🦰', '👨‍🦳', '👨‍🦱', '👨‍🦲',
  '🕵️‍♂️', '🤭', '🥱', '🥶', '🥵', '😈', '🤖', '👽',
];
const AVATAR_PRESET_LABELS: Record<string, string> = {
  '👨‍✈️': 'Pilot',
  '👩‍✈️': 'Pilotin',
  '🤪': 'Albernes Gesicht',
  '🥸': 'Verkleidetes Gesicht',
  '🤠': 'Cowboy',
  '🤓': 'Gesicht mit Brille',
  '😎': 'Gesicht mit Sonnenbrille',
  '🧐': 'Gesicht mit Monokel',
  '🥳': 'Partygesicht',
  '🤯': 'Explodierender Kopf',
  '🤩': 'Begeistertes Gesicht',
  '🤑': 'Geldgesicht',
  '🤤': 'Sabberndes Gesicht',
  '🤡': 'Clown',
  '🧑‍🎤': 'Rockstar',
  '🧙‍♂️': 'Zauberer',
  '🦹‍♂️': 'Superschurke',
  '🦸‍♂️': 'Superheld',
  '🧑‍🍳': 'Koch',
  '🧔‍♂️': 'Mann mit Bart',
  '👨‍🦰': 'Mann mit roten Haaren',
  '👨‍🦳': 'Mann mit weißen Haaren',
  '👨‍🦱': 'Mann mit Locken',
  '👨‍🦲': 'Mann mit Glatze',
  '🕵️‍♂️': 'Detektiv',
  '🤭': 'Kicherndes Gesicht',
  '🥱': 'Gähnendes Gesicht',
  '🥶': 'Frierendes Gesicht',
  '🥵': 'Schwitzendes Gesicht',
  '😈': 'Teufelchen',
  '🤖': 'Roboter',
  '👽': 'Außerirdischer',
};

const TRAINING_TITLES = ['Lokführer', 'Wagenmeister', 'Zf/Rb-bau'] as const;

type TicketType = 'bug' | 'feature' | 'exam_question';

const TICKET_TYPES: { id: TicketType; title: string; description: string; icon: LucideIcon }[] = [
  {
    id: 'exam_question',
    title: 'Prüfungsfrage einreichen',
    description: 'Frage aus Prüfung oder Unterlagen fotografieren und einreichen',
    icon: GraduationCap,
  },
  {
    id: 'bug',
    title: 'Fehler melden',
    description: 'Falsche Frage, Tippfehler, Fehler in der App',
    icon: Bug,
  },
  {
    id: 'feature',
    title: 'Verbesserungsvorschlag',
    description: 'Neue Lerninhalte, Funktionswünsche, Ideen',
    icon: Lightbulb,
  },
];

type LegalEntryId = 'impressum' | 'kontoloeschung' | 'haftung' | 'regelwerke' | 'urheberrecht';

const LEGAL_ENTRIES: { id: LegalEntryId; title: string }[] = [
  { id: 'impressum', title: 'Impressum' },
  { id: 'kontoloeschung', title: 'Kontolöschung' },
  { id: 'haftung', title: 'Haftungsausschluss' },
  { id: 'regelwerke', title: 'Fachliche Regelwerks-Grundlagen' },
  { id: 'urheberrecht', title: 'Urheberrecht' },
];

const REGELWERKE = [
  'VDV-Schrift 757 (Bremsen und Bremsproben im Eisenbahnbetrieb)',
  'VDV-Schrift 758 (Wagenprüfung im Güterverkehr)',
  'Ril 301 (Signalbuch der DB InfraGO AG)',
  'Ril 408 (Fahrdienstvorschrift) / FV-NE',
];

type ProfileErrors = { name?: string; email?: string };
type TicketErrors = { title?: string; description?: string };

/** iOS liest Live-Regionen nicht vor – dort explizit ansagen. Android und Web nutzen Live-Region bzw. aria-live. */
function announce(message: string) {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/** Nach Abmelden oder Kontolöschung zurück zum Start; im Web per Neuladen, damit kein Sitzungszustand übrig bleibt. */
function goToStart() {
  if (IS_WEB && typeof window !== 'undefined') {
    window.location.href = '/';
    window.location.reload();
  } else {
    router.replace('/');
  }
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function formatDateTime(value: string | number) {
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProfileScreen() {
  const { isDark, colors, setThemePreference } = useAppTheme();
  const params = useLocalSearchParams<{ openTicket?: string }>();
  // Ein Hintergrund pro Screen: hell Weiß, dunkel der App-Hintergrund (wie der Login)
  const screenBg = isDark ? colors.background : colors.cardBg;

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
  const [ticketType, setTicketType] = useState<TicketType>('exam_question');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketImageUrl, setTicketImageUrl] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Eigene Einreichungen States
  const [categories, setCategories] = useState<Category[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<{ questions: Question[]; facts: Fact[] }>({ questions: [], facts: [] });
  const [createFactModalVisible, setCreateFactModalVisible] = useState(false);
  const [createQuestionModalVisible, setCreateQuestionModalVisible] = useState(false);
  const [submissionsModalVisible, setSubmissionsModalVisible] = useState(false);

  // Status- und Fehlerzeilen im Screen (statt Alert-Popups)
  const [profileStatus, setProfileStatus] = useState<Status | null>(null);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [titleStatus, setTitleStatus] = useState<Status | null>(null);
  const [pushStatus, setPushStatus] = useState<Status | null>(null);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<Status | null>(null);
  const [accountStatus, setAccountStatus] = useState<Status | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [ticketErrors, setTicketErrors] = useState<TicketErrors>({});
  const [ticketFormStatus, setTicketFormStatus] = useState<Status | null>(null);
  const [ticketListStatus, setTicketListStatus] = useState<Status | null>(null);
  const [ticketPendingDelete, setTicketPendingDelete] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [openLegalEntry, setOpenLegalEntry] = useState<LegalEntryId | null>(null);
  const [legalStatus, setLegalStatus] = useState<Status | null>(null);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const ticketTitleRef = useRef<TextInput>(null);
  const ticketDescriptionRef = useRef<TextInput>(null);

  // Automatisch Ticket-Modal öffnen, falls per Banner (/profile?openTicket=true) aufgerufen
  useEffect(() => {
    if (params?.openTicket === 'true') {
      setTicketModalVisible(true);
      setShowTicketForm(true);
    }
  }, [params?.openTicket]);

  // Dynamische Tastatur-Verschiebung für ruckelfreies Hochwandern aller Eingabemasken
  const { dynamicKeyboardPadding } = useDynamicKeyboard(48);

  // Benachrichtigungen States
  const [isChatMutedState, setIsChatMutedState] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckOtaUpdate = async () => {
    try {
      setCheckingUpdate(true);
      setUpdateStatus(null);
      if (__DEV__) {
        setUpdateStatus({ tone: 'info', message: 'Entwicklungsmodus: Der Code wird direkt über den PC synchronisiert.' });
        return;
      }
      if (!Updates.isEnabled) {
        setUpdateStatus({ tone: 'info', message: 'Live-Updates werden aktiv, sobald Build 9 aus dem Play Store installiert ist.' });
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } else {
        setUpdateStatus({
          tone: 'success',
          message: `Du nutzt bereits die neueste Version${APP_VERSION ? ` (Version ${APP_VERSION})` : ''}.`,
        });
      }
    } catch (e: any) {
      setUpdateStatus(
        e?.message
          ? { tone: 'error', message: `Update-Prüfung fehlgeschlagen: ${e.message}` }
          : { tone: 'success', message: 'App ist auf dem neuesten Stand.' }
      );
    } finally {
      setCheckingUpdate(false);
    }
  };

  const isEditingRef = useRef(isEditing);
  const hasInitializedUserRef = useRef(false);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

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
        const [userTickets, cats, subs] = await Promise.all([
          mockDb.getTickets(user.id),
          mockDb.getCategories(),
          mockDb.getUserSubmissions(user.id)
        ]);
        setTickets(prev => (prev.length === userTickets.length && prev[0]?.id === userTickets[0]?.id ? prev : userTickets));
        setCategories(cats);
        setUserSubmissions(subs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleStartEditing = () => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditEmail(currentUser.email);
      setEditAvatarUrl(currentUser.avatarUrl || '');
      setEditTitle(currentUser.title || '');
    }
    setEditPassword('');
    setProfileErrors({});
    setProfileFormError(null);
    setProfileStatus(null);
    setIsEditing(true);
    // Web: Fokus ins erste Feld, weil der Button „Profil bearbeiten“ verschwindet
    if (IS_WEB) setTimeout(() => nameRef.current?.focus(), 0);
  };

  const handleCancelEditing = () => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditEmail(currentUser.email);
      setEditAvatarUrl(currentUser.avatarUrl || '');
      setEditTitle(currentUser.title || '');
    }
    setEditPassword('');
    setProfileErrors({});
    setProfileFormError(null);
    setIsEditing(false);
  };

  const handleSaveTitle = async (customTitle?: string) => {
    if (!currentUser) return;
    const titleToSave = (customTitle !== undefined ? customTitle : editTitle).trim();
    setTitleStatus(null);
    try {
      await mockDb.updateUserTitle(currentUser.id, titleToSave);
      const updated = { ...currentUser, title: titleToSave };
      setCurrentUser(updated);
      setEditTitle(titleToSave);
      setTitleStatus({
        tone: 'success',
        message: titleToSave ? `Dein Titel ist jetzt „${titleToSave}“.` : 'Dein Titel wurde entfernt.',
      });
    } catch (e: any) {
      setTitleStatus({ tone: 'error', message: 'Der Titel konnte nicht gespeichert werden: ' + (e?.message || e) });
    }
  };

  // Abmelden ist nicht destruktiv (alle Daten bleiben), daher ohne Rückfrage.
  const handleLogout = async () => {
    setAccountStatus(null);
    setLoggingOut(true);
    try {
      await mockDb.logoutUser();
      setAccountStatus({ tone: 'success', message: 'Du bist abgemeldet.' });
      goToStart();
    } catch (e: any) {
      setAccountStatus({ tone: 'error', message: 'Abmelden hat nicht geklappt: ' + (e?.message || e) });
    } finally {
      setLoggingOut(false);
    }
  };

  // Schritt 1: Bestätigungsdialog im Screen öffnen (Alert.alert funktioniert in React Native Web nicht)
  const handleDeleteAccount = () => {
    setDeleteError(null);
    setDeleteDialogVisible(true);
  };

  // Schritt 2: Löschen – Aufrufe und Reihenfolge wie bisher (deleteUser, dann logoutUser)
  const handleConfirmDeleteAccount = async () => {
    setDeleteError(null);
    setDeletingAccount(true);
    try {
      if (currentUser) {
        await mockDb.deleteUser(currentUser.id);
      }
      await mockDb.logoutUser();
      setDeleteDialogVisible(false);
      setAccountStatus({ tone: 'success', message: 'Dein Konto und alle zugehörigen Daten wurden gelöscht.' });
      goToStart();
    } catch (e: any) {
      setDeleteError('Das Konto konnte nicht gelöscht werden: ' + (e?.message || e));
    } finally {
      setDeletingAccount(false);
    }
  };

  const clearProfileError = (field: keyof ProfileErrors) => {
    if (profileErrors[field]) {
      setProfileErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    const errors: ProfileErrors = {};
    if (!editName.trim()) errors.name = 'Gib deinen Namen ein.';
    if (!editEmail.trim()) errors.email = 'Gib deine E-Mail-Adresse ein.';
    setProfileErrors(errors);
    setProfileFormError(null);
    const firstError = errors.name ?? errors.email;
    if (firstError) {
      announce(firstError);
      const firstRef = errors.name ? nameRef : emailRef;
      setTimeout(() => firstRef.current?.focus(), 0);
      return;
    }

    setSavingProfile(true);
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
      setProfileStatus({ tone: 'success', message: 'Dein Profil wurde gespeichert.' });
    } catch (e: any) {
      setProfileFormError(e.message || 'Das Profil konnte nicht gespeichert werden.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePickTicketImage = async () => {
    setTicketFormStatus(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setTicketFormStatus({ tone: 'error', message: 'Wir benötigen Zugriff auf deine Fotos, um ein Bild an das Ticket anzuhängen.' });
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
      setTicketFormStatus({ tone: 'error', message: 'Das Foto konnte nicht geladen werden: ' + (e?.message || e) });
    }
  };

  const handlePickTicketCamera = async () => {
    setTicketFormStatus(null);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setTicketFormStatus({ tone: 'error', message: 'Wir benötigen Zugriff auf deine Kamera, um ein Foto für das Ticket aufzunehmen.' });
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
      setTicketFormStatus({ tone: 'error', message: 'Die Kamera konnte nicht geöffnet werden: ' + (e?.message || e) });
    }
  };

  const clearTicketError = (field: keyof TicketErrors) => {
    if (ticketErrors[field]) {
      setTicketErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreateTicket = async () => {
    if (!currentUser) return;
    const errors: TicketErrors = {};
    if (!ticketTitle.trim()) errors.title = 'Gib einen Betreff ein.';
    if (!ticketDescription.trim()) errors.description = 'Beschreibe deine Frage oder dein Anliegen.';
    setTicketErrors(errors);
    setTicketFormStatus(null);
    const firstError = errors.title ?? errors.description;
    if (firstError) {
      announce(firstError);
      const firstRef = errors.title ? ticketTitleRef : ticketDescriptionRef;
      setTimeout(() => firstRef.current?.focus(), 0);
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
      setTicketListStatus({
        tone: 'success',
        message: 'Dein Ticket wurde gespeichert (auch offline verfügbar) und an das Ausbilder-Team übermittelt.',
      });
      loadData();
    } catch {
      setTicketFormStatus({ tone: 'error', message: 'Das Ticket konnte nicht erstellt werden. Bitte versuche es noch einmal.' });
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Bestätigung erfolgt inline am Ticket (ticketPendingDelete), danach dieselben Aufrufe wie bisher
  const handleDeleteTicket = async (ticketId: string) => {
    setDeletingTicket(true);
    try {
      await mockDb.deleteTicket(ticketId);
      loadData();
      setTicketPendingDelete(null);
      setTicketListStatus({ tone: 'success', message: 'Das Ticket wurde gelöscht.' });
    } catch (e: any) {
      setTicketListStatus({ tone: 'error', message: 'Das Ticket konnte nicht gelöscht werden: ' + (e?.message || e) });
    } finally {
      setDeletingTicket(false);
    }
  };

  const handlePickImage = async () => {
    setProfileStatus(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setProfileStatus({ tone: 'error', message: 'Wir benötigen Zugriff auf deine Fotos, um ein Profilbild auszuwählen.' });
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
        setProfileStatus({ tone: 'success', message: 'Dein Profilfoto wurde aktualisiert.' });
      }
    } catch (e: any) {
      setProfileStatus({ tone: 'error', message: 'Die Bildauswahl konnte nicht geöffnet werden: ' + (e?.message || e) });
    }
  };

  const handleRegisterPush = async () => {
    if (!currentUser?.id) {
      setPushStatus({ tone: 'info', message: 'Bitte melde dich erst an.' });
      return;
    }
    setPushStatus(null);
    setRegisteringPush(true);
    try {
      const res = await registerForPushNotificationsAsync(currentUser.id);
      if (res.token) {
        setPushStatus({
          tone: 'success',
          message: 'Push-Empfang ist aktiv. Chat-Nachrichten erreichen dich auch bei geschlossener App.',
        });
      } else {
        setPushStatus({ tone: 'error', message: res.error || 'Vom Gerät kam kein Push-Token.' });
      }
    } finally {
      setRegisteringPush(false);
    }
  };

  const handleOpenSupportMail = async () => {
    setLegalStatus(null);
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    } catch {
      setLegalStatus({ tone: 'error', message: `Keine E-Mail-App gefunden. Schreib an ${SUPPORT_EMAIL}.` });
    }
  };

  const closeTicketModal = () => {
    setTicketModalVisible(false);
    setShowTicketForm(false);
    setTicketPendingDelete(null);
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Ausbilder';
    if (role === 'moderator') return 'Mod';
    return 'Schüler';
  };

  const isImgUri = (uri: string) => {
    return uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://') || uri.startsWith('data:') || uri.includes('/') || uri.includes('\\');
  };

  // Stats berechnen
  const statsCount = quizHistory.length;
  const bestScore = quizHistory.reduce((max, curr) => curr.score > max ? curr.score : max, 0);

  const verifiedFacts = userSubmissions.facts.filter(f => f.isVerified).length;
  const verifiedQuestions = userSubmissions.questions.filter(q => q.isVerified).length;
  const hasSubmissions = userSubmissions.facts.length > 0 || userSubmissions.questions.length > 0;

  const renderAvatar = (uri: string, size: number) => {
    if (uri && isImgUri(uri)) {
      return <Image source={{ uri }} style={styles.avatarImg} accessibilityIgnoresInvertColors />;
    }
    if (uri) {
      return <Text style={{ fontSize: Math.round(size * 0.5) }}>{uri}</Text>;
    }
    return <UserIcon size={Math.round(size * 0.45)} color={colors.textMuted} />;
  };

  const getTicketTypeMeta = (type: Ticket['type']) => {
    if (type === 'password_reset') return { label: 'Passwort-Reset', Icon: KeyRound, color: colors.warningText };
    if (type === 'exam_question') return { label: 'Prüfungsfrage', Icon: GraduationCap, color: isDark ? '#c4b5fd' : '#7c3aed' };
    if (type === 'bug') return { label: 'Fehler', Icon: Bug, color: colors.errorText };
    return { label: 'Vorschlag', Icon: Lightbulb, color: colors.primary };
  };

  const getTicketStatusMeta = (status: Ticket['status']) => {
    if (status === 'resolved') return { label: 'Beantwortet', Icon: CheckCircle2, color: colors.successText };
    if (status === 'in_progress') return { label: 'In Bearbeitung', Icon: Clock, color: colors.primary };
    return { label: 'Offen', Icon: AlertCircle, color: colors.warningText };
  };

  const renderVerification = (isVerified?: boolean) => (
    <View style={styles.metaItem}>
      <View aria-hidden>
        {isVerified ? (
          <CheckCircle2 size={16} color={colors.successText} />
        ) : (
          <Clock size={16} color={colors.warningText} />
        )}
      </View>
      <Text style={[styles.metaText, { color: isVerified ? colors.successText : colors.warningText }]}>
        {isVerified ? 'Freigegeben' : 'In Prüfung'}
      </Text>
    </View>
  );

  const renderLegalBody = (id: LegalEntryId) => {
    const textStyle = [styles.legalText, { color: colors.text }];
    const mutedStyle = [styles.legalText, { color: colors.textMuted }];
    const labelStyle = [styles.legalLabel, { color: colors.text }];

    if (id === 'impressum') {
      return (
        <>
          <Text style={labelStyle}>Angaben gemäß § 5 TMG</Text>
          <Text style={textStyle}>Herausgeber & Entwicklung: Dennis Köster</Text>
          <Text style={mutedStyle}>
            Interaktive Lernplattform für Triebfahrzeugführer, Wagenprüfer & Bahnbetriebspersonal.
          </Text>
          <Text style={[labelStyle, styles.legalLabelSpaced]}>Support & Feedback</Text>
          <Text style={textStyle}>
            Über das integrierte Support-Ticketsystem im Benutzerkonto oder per E-Mail an:
          </Text>
          <Pressable
            onPress={handleOpenSupportMail}
            accessibilityRole="link"
            accessibilityLabel={`E-Mail an ${SUPPORT_EMAIL}`}
            style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
          >
            <View aria-hidden>
              <Mail size={20} color={colors.primary} />
            </View>
            <Text style={[styles.linkText, { color: colors.primary }]}>{SUPPORT_EMAIL}</Text>
          </Pressable>
          <StatusMessage status={legalStatus} style={styles.legalStatus} />
        </>
      );
    }
    if (id === 'kontoloeschung') {
      return (
        <>
          <Text style={textStyle}>
            Nutzer können ihr Konto jederzeit in der App oder online über die offizielle Lösch-Seite unwiderruflich löschen lassen.
          </Text>
          <Text style={[...mutedStyle, styles.legalParagraph]}>In der App geht das unten im Bereich „Konto“.</Text>
        </>
      );
    }
    if (id === 'haftung') {
      return (
        <Text style={textStyle}>
          Die in dieser Anwendung bereitgestellten Lerninhalte, Musterlösungen und Regelwerkszitate dienen ausschließlich als Ausbildungs- und Übungshilfe. Im praktischen Betriebsdienst sind stets die offiziellen und aktuell gültigen Regelwerke des zuständigen Eisenbahnverkehrsunternehmens (EVU) bzw. Infrastrukturbetreibers maßgebend.
        </Text>
      );
    }
    if (id === 'regelwerke') {
      return (
        <View role="list">
          {REGELWERKE.map(item => (
            <View key={item} role="listitem" style={styles.bulletRow}>
              <View aria-hidden style={[styles.bulletDot, { backgroundColor: colors.textMuted }]} />
              <Text style={[...textStyle, styles.bulletText]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    }
    return (
      <Text style={textStyle}>
        © Dennis Köster. Alle Rechte an der Software und den redaktionellen Ausarbeitungen vorbehalten.
      </Text>
    );
  };

  const renderModalHeader = (title: string, onClose: () => void, closeLabel: string) => (
    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
      <Heading level={1} style={styles.modalTitle}>
        {title}
      </Heading>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.buttonSecondaryPressedBg }]}
      >
        <X size={24} color={colors.text} />
      </Pressable>
    </View>
  );

  const roleLine = currentUser
    ? `${getRoleLabel(currentUser.role)}${currentUser.title ? ` · ${currentUser.title}` : ''}`
    : '';
  const avatarBg = isDark ? colors.cardBg : colors.background;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: screenBg }]}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={true}
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: dynamicKeyboardPadding ? dynamicKeyboardPadding + 32 : 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentUser && (
          <View style={styles.column}>
            {/* PROFIL */}
            <View style={styles.profileHeader}>
              <Pressable
                onPress={handlePickImage}
                accessibilityRole="button"
                accessibilityLabel="Profilfoto ändern"
                accessibilityHint="Öffnet deine Fotos"
                style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
              >
                <View style={[styles.avatar, { backgroundColor: avatarBg, borderColor: colors.border }]}>
                  {renderAvatar(currentUser.avatarUrl || '', 72)}
                </View>
                <View
                  aria-hidden
                  style={[styles.avatarBadge, { backgroundColor: colors.buttonPrimaryBg, borderColor: screenBg }]}
                >
                  <Camera size={14} color={colors.buttonPrimaryText} />
                </View>
              </Pressable>

              <View style={styles.identity}>
                <Heading level={2} style={styles.userName}>
                  {currentUser.name}
                </Heading>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>{currentUser.email}</Text>
                <Text style={[styles.userRole, { color: colors.text }]}>{roleLine}</Text>
              </View>
            </View>

            {!isEditing ? (
              <>
                <StatusMessage status={profileStatus} />
                <Button
                  variant="secondary"
                  icon={Pencil}
                  title="Profil bearbeiten"
                  onPress={handleStartEditing}
                  style={styles.editButton}
                />
              </>
            ) : (
              <View style={[styles.editForm, { borderTopColor: colors.border }]}>
                <Heading level={3}>Profil bearbeiten</Heading>

                <TextField
                  ref={nameRef}
                  label="Name"
                  placeholder="Vor- und Nachname"
                  icon={UserIcon}
                  value={editName}
                  onChangeText={(value) => {
                    setEditName(value);
                    clearProfileError('name');
                  }}
                  error={profileErrors.name}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  containerStyle={styles.firstField}
                />
                <TextField
                  ref={emailRef}
                  label="E-Mail-Adresse"
                  placeholder="name@beispiel.de"
                  icon={Mail}
                  value={editEmail}
                  onChangeText={(value) => {
                    setEditEmail(value);
                    clearProfileError('email');
                  }}
                  error={profileErrors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <TextField
                  ref={passwordRef}
                  label="Neues Passwort (optional)"
                  placeholder="Neues Passwort eingeben"
                  icon={Lock}
                  password
                  hint="Leer lassen, wenn du dein Passwort behalten willst."
                  value={editPassword}
                  onChangeText={setEditPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={handleSave}
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Profilbild</Text>
                <View style={styles.avatarPickRow}>
                  <View style={[styles.avatarSmall, { backgroundColor: avatarBg, borderColor: colors.border }]}>
                    {renderAvatar(editAvatarUrl, 56)}
                  </View>
                  <Text style={[styles.bodyText, styles.flex, { color: colors.textMuted }]}>
                    {editAvatarUrl && isImgUri(editAvatarUrl)
                      ? 'Aktuell: eigenes Foto'
                      : editAvatarUrl
                        ? 'Aktuell: Symbol'
                        : 'Noch kein Profilbild'}
                  </Text>
                </View>
                <Button variant="secondary" icon={ImageIcon} title="Foto auswählen" onPress={handlePickImage} />
                <StatusMessage status={profileStatus} />

                <Text style={[styles.fieldLabel, styles.fieldLabelSpaced, { color: colors.text }]}>
                  Oder einen Comic-Avatar wählen
                </Text>
                <View role="radiogroup" accessibilityLabel="Comic-Avatar als Profilbild" style={styles.presetsGrid}>
                  {AVATAR_PRESETS.map((p) => {
                    const selected = editAvatarUrl === p;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setEditAvatarUrl(p)}
                        accessibilityRole="radio"
                        accessibilityLabel={AVATAR_PRESET_LABELS[p] ?? 'Symbol'}
                        accessibilityState={{ checked: selected }}
                        aria-checked={selected}
                        style={({ pressed }) => [
                          styles.presetBtn,
                          {
                            borderColor: selected ? colors.primary : colors.fieldBorder,
                            borderWidth: selected ? 2 : 1,
                            backgroundColor: selected
                              ? colors.accentBg
                              : pressed
                                ? colors.buttonSecondaryPressedBg
                                : 'transparent',
                          },
                        ]}
                      >
                        <Text style={styles.presetEmoji}>{p}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <StatusMessage status={profileFormError ? { tone: 'error', message: profileFormError } : null} />
                <View style={styles.formActions}>
                  <Button
                    variant="secondary"
                    title="Abbrechen"
                    onPress={handleCancelEditing}
                    disabled={savingProfile}
                    style={styles.formActionButton}
                  />
                  <Button
                    title="Speichern"
                    loadingTitle="Wird gespeichert …"
                    loading={savingProfile}
                    onPress={handleSave}
                    style={styles.formActionButton}
                  />
                </View>
              </View>
            )}

            {/* AUSBILDUNG: Titel und Quiz-Statistik */}
            <Section title="Ausbildung">
              {currentUser.role === 'user' ? (
                <>
                  <Heading level={3}>Dein Ausbildungsbereich</Heading>
                  <View role="radiogroup" accessibilityLabel="Dein Ausbildungsbereich" style={styles.chips}>
                    {TRAINING_TITLES.map((t) => {
                      const isSelected = (currentUser.title || editTitle) === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => handleSaveTitle(t)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: isSelected }}
                          aria-checked={isSelected}
                          style={({ pressed }) => [
                            styles.chip,
                            isSelected
                              ? { backgroundColor: colors.buttonPrimaryBg, borderColor: colors.buttonPrimaryBg }
                              : {
                                  borderColor: colors.fieldBorder,
                                  backgroundColor: pressed ? colors.buttonSecondaryPressedBg : 'transparent',
                                },
                          ]}
                        >
                          {isSelected ? (
                            <View aria-hidden>
                              <Check size={18} color={colors.buttonPrimaryText} strokeWidth={2.5} />
                            </View>
                          ) : null}
                          <Text
                            style={[
                              styles.chipText,
                              { color: isSelected ? colors.buttonPrimaryText : colors.text },
                            ]}
                          >
                            {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <TextField
                    label="Dozenten- oder Zusatztitel"
                    placeholder="z. B. Ausbilder, Mod, Fachlehrer"
                    value={editTitle}
                    onChangeText={setEditTitle}
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={() => handleSaveTitle()}
                    containerStyle={styles.titleField}
                  />
                  <Button variant="secondary" icon={Check} title="Titel speichern" onPress={() => handleSaveTitle()} />
                </>
              )}
              <StatusMessage status={titleStatus} />

              <Heading level={3} style={styles.subHeading}>
                Quiz-Statistik
              </Heading>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Absolvierte Tests</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{statsCount}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Höchste Punktzahl</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{bestScore} Pkt.</Text>
                </View>
              </View>
            </Section>

            {/* WISSEN BEITRAGEN */}
            <Section title="Wissen beitragen" description="Lernkarten und Quizfragen zur Freigabe einreichen.">
              <ListRow
                icon={BookOpen}
                title="Lernkarte einreichen"
                showChevron
                onPress={() => setCreateFactModalVisible(true)}
              />
              <ListRow
                icon={ListChecks}
                title="Quizfrage einreichen"
                showChevron
                onPress={() => setCreateQuestionModalVisible(true)}
                dividerBottom={!hasSubmissions}
              />
              {hasSubmissions ? (
                <ListRow
                  icon={Inbox}
                  title="Deine Einreichungen"
                  description={`${plural(userSubmissions.facts.length, 'Lernkarte', 'Lernkarten')} (${verifiedFacts} freigegeben) · ${plural(userSubmissions.questions.length, 'Quizfrage', 'Quizfragen')} (${verifiedQuestions} freigegeben)`}
                  showChevron
                  onPress={() => setSubmissionsModalVisible(true)}
                  dividerBottom
                />
              ) : null}
            </Section>

            {/* SUPPORT */}
            <Section title="Support">
              <ListRow
                icon={LifeBuoy}
                title={tickets.length > 0 ? `Support-Tickets (${tickets.length})` : 'Support-Tickets'}
                description="Fehler melden, Vorschläge machen oder Prüfungsfragen einreichen"
                showChevron
                onPress={() => setTicketModalVisible(true)}
                dividerBottom
              />
            </Section>

            {/* EINSTELLUNGEN */}
            <Section title="Einstellungen">
              <ListRow
                icon={Moon}
                title="Dunkles Design"
                switchValue={isDark}
                onPress={() => setThemePreference(isDark ? 'light' : 'dark')}
              />
              <ListRow
                icon={isChatMutedState ? BellOff : Bell}
                title="Chat-Benachrichtigungen"
                description={isChatMutedState ? 'Stumm, keine Push-Mitteilungen' : 'Push bei neuen Nachrichten'}
                switchValue={!isChatMutedState}
                onPress={async () => {
                  const nextMuted = !isChatMutedState;
                  setIsChatMutedState(nextMuted);
                  await setIsChatMuted(nextMuted);
                }}
                dividerBottom={IS_WEB}
              />
              {/* Push-Token und Live-Updates gibt es nur in der App, nicht im Browser */}
              {!IS_WEB ? (
                <>
                  <ListRow
                    icon={Smartphone}
                    title="Push-Empfang auf diesem Gerät aktivieren"
                    description="Verknüpft dein Gerät, damit Chat-Nachrichten auch bei geschlossener App ankommen."
                    loading={registeringPush}
                    onPress={handleRegisterPush}
                  />
                  <StatusMessage status={pushStatus} style={styles.rowStatus} />
                  <ListRow
                    icon={RefreshCw}
                    title={checkingUpdate ? 'Suche nach Updates …' : 'Nach Updates suchen'}
                    description={APP_VERSION ? `Installiert: Version ${APP_VERSION}` : undefined}
                    loading={checkingUpdate}
                    onPress={handleCheckOtaUpdate}
                    dividerBottom
                  />
                  <StatusMessage status={updateStatus} />
                </>
              ) : null}
            </Section>

            {/* RECHTLICHES */}
            <Section title="Rechtliches">
              {LEGAL_ENTRIES.map((entry) => {
                const isOpen = openLegalEntry === entry.id;
                return (
                  <View key={entry.id}>
                    <ListRow
                      title={entry.title}
                      expanded={isOpen}
                      onPress={() => setOpenLegalEntry(isOpen ? null : entry.id)}
                    />
                    {isOpen ? <View style={styles.legalBody}>{renderLegalBody(entry.id)}</View> : null}
                  </View>
                );
              })}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </Section>

            {/* KONTO: ganz unten, Löschen klar abgesetzt */}
            <Section title="Konto">
              <Button
                variant="secondary"
                icon={LogOut}
                title="Abmelden"
                loadingTitle="Wird abgemeldet …"
                loading={loggingOut}
                onPress={handleLogout}
              />
              <View style={[styles.dangerZone, { borderTopColor: colors.border }]}>
                <Heading level={3}>Konto löschen</Heading>
                <Text style={[styles.bodyText, styles.dangerText, { color: colors.textMuted }]}>
                  Löscht dein Benutzerkonto und alle persönlichen Daten: Lernfortschritte, Quiz-Ergebnisse und Chat-Beiträge. Das lässt sich nicht rückgängig machen.
                </Text>
                <Button
                  variant="secondary"
                  danger
                  icon={Trash2}
                  title="Konto und alle Daten löschen"
                  onPress={handleDeleteAccount}
                  disabled={deletingAccount}
                />
              </View>
              <StatusMessage status={accountStatus} />
            </Section>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>{APP_NAME} © by Dennis Köster</Text>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Interaktive Lern- & Wissensplattform{APP_VERSION ? ` · Version ${APP_VERSION}` : ''}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* KONTO LÖSCHEN: Bestätigung im Screen, „Abbrechen“ ist der sichere Standard */}
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Konto endgültig löschen?"
        message="Dein Benutzerkonto und alle deine persönlichen Daten (Lernfortschritte, Quiz-Ergebnisse, Chat-Beiträge) werden unwiderruflich gelöscht. Das kann nicht rückgängig gemacht werden."
        confirmTitle="Konto endgültig löschen"
        confirmLoadingTitle="Konto wird gelöscht …"
        confirmIcon={Trash2}
        destructive
        loading={deletingAccount}
        error={deleteError}
        onConfirm={handleConfirmDeleteAccount}
        onCancel={() => setDeleteDialogVisible(false)}
      />

      {/* TICKET-SYSTEM MODAL */}
      <Modal
        visible={ticketModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeTicketModal}
      >
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: screenBg }]}>
          {renderModalHeader('Support', closeTicketModal, 'Support schließen')}

          <ScrollView
            automaticallyAdjustKeyboardInsets={true}
            keyboardDismissMode={KEYBOARD_DISMISS_MODE}
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: dynamicKeyboardPadding ? dynamicKeyboardPadding + 32 : 32 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.column}>
              {showTicketForm ? (
                /* TICKET FORMULAR */
                <>
                  <Button
                    variant="text"
                    icon={ChevronLeft}
                    title="Zur Ticketübersicht"
                    align="start"
                    onPress={() => setShowTicketForm(false)}
                    disabled={submittingTicket}
                  />
                  <Heading level={2} style={styles.modalSectionTitle}>
                    Neues Ticket
                  </Heading>

                  <Heading level={3} style={styles.subHeadingTight}>
                    Worum geht es?
                  </Heading>
                  <View role="radiogroup" accessibilityLabel="Worum geht es?" style={styles.radioGroup}>
                    {TICKET_TYPES.map((option) => {
                      const selected = ticketType === option.id;
                      const OptionIcon = option.icon;
                      return (
                        <Pressable
                          key={option.id}
                          onPress={() => setTicketType(option.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          aria-checked={selected}
                          style={({ pressed }) => [
                            styles.radioRow,
                            { borderTopColor: colors.border },
                            pressed && { backgroundColor: colors.buttonSecondaryPressedBg },
                          ]}
                        >
                          <View
                            aria-hidden
                            style={[styles.radioOuter, { borderColor: selected ? colors.primary : colors.fieldBorder }]}
                          >
                            {selected ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
                          </View>
                          <View style={styles.flex}>
                            <Text style={[styles.radioTitle, { color: colors.text }]}>{option.title}</Text>
                            <Text style={[styles.radioDescription, { color: colors.textMuted }]}>
                              {option.description}
                            </Text>
                          </View>
                          <View aria-hidden>
                            <OptionIcon size={22} color={colors.textMuted} />
                          </View>
                        </Pressable>
                      );
                    })}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  </View>

                  <TextField
                    ref={ticketTitleRef}
                    label="Betreff"
                    placeholder={
                      ticketType === 'exam_question'
                        ? 'z. B. Prüfungsfrage zu PZB Restriktiv / FV-NE'
                        : ticketType === 'bug'
                          ? 'z. B. Fehler bei Quizfrage zur Bremsprobe'
                          : 'z. B. Mehr Fragen zu ETCS-Betriebsarten'
                    }
                    value={ticketTitle}
                    onChangeText={(value) => {
                      setTicketTitle(value);
                      clearTicketError('title');
                    }}
                    error={ticketErrors.title}
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => ticketDescriptionRef.current?.focus()}
                    containerStyle={styles.ticketFirstField}
                  />
                  <TextField
                    ref={ticketDescriptionRef}
                    label="Beschreibung"
                    placeholder={
                      ticketType === 'exam_question'
                        ? 'Beschreibe die Frage oder den Kontext aus der Prüfung'
                        : 'Beschreibe dein Anliegen möglichst genau'
                    }
                    multiline
                    scrollEnabled={false}
                    value={ticketDescription}
                    onChangeText={(value) => {
                      setTicketDescription(value);
                      clearTicketError('description');
                    }}
                    error={ticketErrors.description}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Foto (optional)</Text>
                  <View style={styles.photoActions}>
                    <Button
                      variant="secondary"
                      icon={Camera}
                      title="Foto aufnehmen"
                      onPress={handlePickTicketCamera}
                      style={styles.photoActionButton}
                    />
                    <Button
                      variant="secondary"
                      icon={ImageIcon}
                      title="Aus Galerie wählen"
                      onPress={handlePickTicketImage}
                      style={styles.photoActionButton}
                    />
                  </View>

                  {ticketImageUrl && (
                    <View style={styles.ticketImagePreview}>
                      <Image
                        source={{ uri: ticketImageUrl }}
                        style={[styles.ticketImage, { borderColor: colors.border }]}
                        resizeMode="contain"
                        accessibilityLabel="Angehängtes Foto"
                        accessibilityIgnoresInvertColors
                      />
                      <Button variant="secondary" icon={X} title="Foto entfernen" onPress={() => setTicketImageUrl(null)} />
                    </View>
                  )}

                  <StatusMessage status={ticketFormStatus} />
                  <View style={styles.formActions}>
                    <Button
                      variant="secondary"
                      title="Abbrechen"
                      onPress={() => {
                        setShowTicketForm(false);
                        setTicketImageUrl(null);
                        setTicketErrors({});
                        setTicketFormStatus(null);
                      }}
                      disabled={submittingTicket}
                      style={styles.formActionButton}
                    />
                    <Button
                      title="Ticket senden"
                      loadingTitle="Wird gesendet …"
                      loading={submittingTicket}
                      onPress={handleCreateTicket}
                      style={styles.formActionButton}
                    />
                  </View>
                </>
              ) : (
                /* TICKET-LISTE (MEINE TICKETS) */
                <>
                  <Text style={[styles.bodyText, { color: colors.textMuted }]}>
                    Fehler melden, Vorschläge machen oder Prüfungsfragen mit Foto einreichen. Die Antworten des Ausbilder-Teams findest du hier.
                  </Text>
                  <Button
                    icon={Plus}
                    title="Neues Ticket erstellen"
                    onPress={() => {
                      setTicketListStatus(null);
                      setShowTicketForm(true);
                    }}
                    style={styles.newTicketButton}
                  />
                  <StatusMessage status={ticketListStatus} />

                  <Heading level={2} style={styles.modalSectionTitle}>
                    Deine Tickets ({tickets.length})
                  </Heading>

                  {tickets.length === 0 ? (
                    <Text style={[styles.bodyText, styles.emptyText, { color: colors.textMuted }]}>
                      Du hast bisher keine Tickets eingereicht.
                    </Text>
                  ) : (
                    <View style={styles.itemList}>
                      {tickets.map((t) => {
                        const typeMeta = getTicketTypeMeta(t.type);
                        const statusMeta = getTicketStatusMeta(t.status);
                        const TypeIcon = typeMeta.Icon;
                        const StatusIcon = statusMeta.Icon;
                        const isPendingDelete = ticketPendingDelete === t.id;

                        return (
                          <View key={t.id} style={[styles.listItem, { borderTopColor: colors.border }]}>
                            <View style={styles.itemHeader}>
                              <View style={styles.itemMeta}>
                                <View style={styles.metaItem}>
                                  <View aria-hidden>
                                    <TypeIcon size={16} color={typeMeta.color} />
                                  </View>
                                  <Text style={[styles.metaText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <View aria-hidden>
                                    <StatusIcon size={16} color={statusMeta.color} />
                                  </View>
                                  <Text style={[styles.metaText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                                </View>
                              </View>
                              <Pressable
                                onPress={() => setTicketPendingDelete(isPendingDelete ? null : t.id)}
                                accessibilityRole="button"
                                accessibilityLabel={`Ticket „${t.title}“ löschen`}
                                accessibilityState={{ expanded: isPendingDelete }}
                                aria-expanded={isPendingDelete}
                                style={({ pressed }) => [
                                  styles.iconButton,
                                  pressed && { backgroundColor: colors.buttonSecondaryPressedBg },
                                ]}
                              >
                                <Trash2 size={20} color={colors.textMuted} />
                              </Pressable>
                            </View>

                            <Text style={[styles.itemTitle, { color: colors.text }]}>{t.title}</Text>
                            <Text style={[styles.bodyText, { color: colors.text }]}>{t.description}</Text>

                            {t.imageUrl && (
                              <Pressable
                                onPress={() => setPreviewModalImage(t.imageUrl || null)}
                                accessibilityRole="button"
                                accessibilityLabel="Foto zum Ticket vergrößern"
                                style={({ pressed }) => [
                                  styles.ticketThumb,
                                  { borderColor: colors.border },
                                  pressed && styles.pressed,
                                ]}
                              >
                                <Image
                                  source={{ uri: t.imageUrl }}
                                  style={styles.ticketThumbImage}
                                  resizeMode="cover"
                                  accessibilityIgnoresInvertColors
                                />
                              </Pressable>
                            )}

                            <Text style={[styles.itemFootnote, { color: colors.textMuted }]}>
                              Erstellt am {formatDateTime(t.createdAt)}
                            </Text>

                            {/* Ausbilder-Antwort (falls vorhanden) */}
                            {t.response && (
                              <View style={[styles.responseBlock, { borderLeftColor: colors.successText }]}>
                                <Text style={[styles.responseTitle, { color: colors.successText }]}>
                                  Antwort von {t.responderName} ({t.responderRole || 'Ausbilder'})
                                </Text>
                                <Text style={[styles.bodyText, { color: colors.text }]}>{t.response}</Text>
                                {t.respondedAt && (
                                  <Text style={[styles.itemFootnote, { color: colors.textMuted }]}>
                                    {formatDateTime(t.respondedAt)}
                                  </Text>
                                )}
                              </View>
                            )}

                            {isPendingDelete ? (
                              <View style={styles.inlineConfirm}>
                                <Text style={[styles.bodyText, styles.inlineConfirmText, { color: colors.text }]}>
                                  Möchtest du dieses Ticket wirklich entfernen?
                                </Text>
                                <View style={styles.formActions}>
                                  <Button
                                    variant="secondary"
                                    title="Abbrechen"
                                    onPress={() => setTicketPendingDelete(null)}
                                    disabled={deletingTicket}
                                    style={styles.formActionButton}
                                  />
                                  <Button
                                    variant="destructive"
                                    title="Ticket löschen"
                                    loadingTitle="Wird gelöscht …"
                                    loading={deletingTicket}
                                    onPress={() => handleDeleteTicket(t.id)}
                                    style={styles.formActionButton}
                                  />
                                </View>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    </View>
                  )}
                </>
              )}
            </View>
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
        <SafeAreaView style={styles.previewBackdrop}>
          {/* Tipp auf den Hintergrund schließt ebenfalls; für Screenreader gibt es den Schließen-Button */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPreviewModalImage(null)}
            accessible={false}
            focusable={false}
            importantForAccessibility="no"
          />
          {previewModalImage && (
            <Image
              source={{ uri: previewModalImage }}
              style={styles.previewImage}
              resizeMode="contain"
              accessibilityLabel="Foto zum Ticket"
              accessibilityIgnoresInvertColors
            />
          )}
          <Pressable
            onPress={() => setPreviewModalImage(null)}
            accessibilityRole="button"
            accessibilityLabel="Vorschau schließen"
            style={({ pressed }) => [styles.previewClose, pressed && styles.pressed]}
          >
            <X size={28} color="#ffffff" />
          </Pressable>
        </SafeAreaView>
      </Modal>

      {/* CREATE FACT MODAL */}
      <CreateFactModal
        visible={createFactModalVisible}
        onClose={() => setCreateFactModalVisible(false)}
        onSuccess={() => loadData()}
        categories={categories}
        currentUser={currentUser}
      />

      {/* CREATE QUESTION MODAL */}
      <CreateQuestionModal
        visible={createQuestionModalVisible}
        onClose={() => setCreateQuestionModalVisible(false)}
        onSuccess={() => loadData()}
        categories={categories}
        currentUser={currentUser}
      />

      {/* EIGENE EINREICHUNGEN DETAIL MODAL */}
      <Modal
        visible={submissionsModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSubmissionsModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: screenBg }]}>
          {renderModalHeader('Deine Einreichungen', () => setSubmissionsModalVisible(false), 'Einreichungen schließen')}

          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.column}>
              <Text style={[styles.bodyText, { color: colors.textMuted }]}>
                Übersicht deiner eingereichten Lernkarten und Quizfragen.
              </Text>

              {/* LERNKARTEN */}
              <Heading level={2} style={styles.modalSectionTitle}>
                Lernkarten ({userSubmissions.facts.length})
              </Heading>
              {userSubmissions.facts.length === 0 ? (
                <Text style={[styles.bodyText, styles.emptyText, { color: colors.textMuted }]}>
                  Noch keine Lernkarten eingereicht.
                </Text>
              ) : (
                <View style={styles.itemList}>
                  {userSubmissions.facts.map(f => (
                    <View key={f.id} style={[styles.listItem, { borderTopColor: colors.border }]}>
                      <View style={styles.itemMeta}>
                        <Text style={[styles.metaText, { color: colors.primary }]}>{f.category}</Text>
                        {renderVerification(f.isVerified)}
                      </View>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{f.title}</Text>
                      <Text style={[styles.bodyText, { color: colors.textMuted }]} numberOfLines={3}>
                        {f.content}
                      </Text>
                      {f.reference && (
                        <Text style={[styles.itemFootnote, { color: colors.textMuted }]}>Quelle: {f.reference}</Text>
                      )}
                      {f.isVerified && f.verifiedByName && (
                        <Text style={[styles.itemFootnote, { color: colors.successText }]}>
                          Geprüft und freigegeben von: {f.verifiedByName}
                        </Text>
                      )}
                    </View>
                  ))}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </View>
              )}

              {/* QUIZFRAGEN */}
              <Heading level={2} style={styles.modalSectionTitle}>
                Quizfragen ({userSubmissions.questions.length})
              </Heading>
              {userSubmissions.questions.length === 0 ? (
                <Text style={[styles.bodyText, styles.emptyText, { color: colors.textMuted }]}>
                  Noch keine Quizfragen eingereicht.
                </Text>
              ) : (
                <View style={styles.itemList}>
                  {userSubmissions.questions.map(q => (
                    <View key={q.id} style={[styles.listItem, { borderTopColor: colors.border }]}>
                      <View style={styles.itemMeta}>
                        <Text style={[styles.metaText, { color: colors.primary }]}>{q.category}</Text>
                        {renderVerification(q.isVerified)}
                      </View>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{q.text}</Text>
                      <Text style={[styles.bodyText, { color: colors.textMuted }]}>
                        {q.options?.length} Antwortmöglichkeiten ({q.questionType === 'order' ? 'Reihenfolge' : q.questionType === 'multiple' ? 'Multiple Choice' : 'Single Choice'})
                      </Text>
                      {q.isVerified && q.verifiedByName && (
                        <Text style={[styles.itemFootnote, { color: colors.successText }]}>
                          Geprüft und freigegeben von: {q.verifiedByName}
                        </Text>
                      )}
                    </View>
                  ))}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 24,
  },
  column: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.7,
  },

  // Profil
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 24,
    lineHeight: 30,
  },
  userEmail: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 2,
  },
  userRole: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginTop: 2,
  },
  editButton: {
    marginTop: 16,
  },
  editForm: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  firstField: {
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldLabelSpaced: {
    marginTop: 24,
  },
  avatarPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    width: 52,
    height: 52,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetEmoji: {
    fontSize: 26,
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  formActionButton: {
    flexGrow: 1,
    flexBasis: 140,
  },

  // Ausbildung
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  titleField: {
    marginBottom: 12,
  },
  subHeading: {
    marginTop: 24,
  },
  subHeadingTight: {
    marginTop: 16,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 140,
  },
  statLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    marginTop: 2,
  },

  // Allgemein
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  rowStatus: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: -8,
  },

  // Rechtliches
  legalBody: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  legalLabel: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  legalLabelSpaced: {
    marginTop: 16,
  },
  legalText: {
    fontSize: 15,
    lineHeight: 22,
  },
  legalParagraph: {
    marginTop: 8,
  },
  legalStatus: {
    marginTop: 4,
  },
  linkButton: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  linkText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
  },

  // Konto
  dangerZone: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  dangerText: {
    marginTop: 4,
    marginBottom: 16,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 2,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Modals
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingLeft: SCREEN_PADDING,
    paddingRight: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modalTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
  },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
    paddingBottom: 40,
  },
  modalSectionTitle: {
    marginTop: 24,
  },
  newTicketButton: {
    marginTop: 16,
  },
  radioGroup: {
    marginTop: 8,
  },
  radioRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderTopWidth: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  radioDescription: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  ticketFirstField: {
    marginTop: 24,
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoActionButton: {
    flexGrow: 1,
    // Auf dem Handy untereinander, ab ca. 460 px nebeneinander
    flexBasis: 220,
  },
  ticketImagePreview: {
    marginTop: 12,
    gap: 12,
  },
  ticketImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  emptyText: {
    marginTop: 8,
  },
  itemList: {
    marginTop: 12,
  },
  listItem: {
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemMeta: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 16,
    rowGap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  itemFootnote: {
    fontSize: 14,
    lineHeight: 20,
  },
  ticketThumb: {
    marginTop: 6,
    borderRadius: RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketThumbImage: {
    width: '100%',
    height: 160,
  },
  responseBlock: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 3,
    gap: 4,
  },
  responseTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  inlineConfirm: {
    marginTop: 8,
  },
  inlineConfirmText: {
    fontWeight: '600',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SCREEN_PADDING,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
  previewClose: {
    position: 'absolute',
    top: 48,
    right: SCREEN_PADDING,
    width: 48,
    height: 48,
    borderRadius: RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
