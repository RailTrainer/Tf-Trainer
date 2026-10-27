import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Keyboard,
  Platform,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
  RefreshControl,
  type ScrollViewInstance,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockDb, Question, Category, User as DbUser, Fact, RoleDefinition, Ticket, ChatMessageReport, getQuestionCorrectIndices, CustomIconItem, ChatBanRecord, SignalSubcategory, getFactSignalSubcategory, getFactImageUrls, sortSignalFacts, compareSignalFacts } from '../database/mockDb';
import CategoryIcon, { RAILWAY_ICONS_DEF, POPULAR_LUCIDE_ICONS_DEF, PRESET_CATEGORY_SYMBOLS } from '../components/CategoryIcon';
import { useAppTheme } from '../context/ThemeContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import * as ImagePicker from 'expo-image-picker';
import { optimizeImage, uploadAndOptimizeImage } from '../utils/imageOptimizer';
import { useDynamicKeyboard } from '../hooks/useDynamicKeyboard';
import { AppKeyboardPane } from '../components/ui/AppKeyboardPane';
import { useSmoothKeyboardScroll } from '../hooks/useSmoothKeyboardScroll';
import { 
  findDuplicateQuestionsAsync, 
  findDuplicateFactsAsync, 
  DuplicateQuestionPair, 
  DuplicateFactPair, 
  getPairKey 
} from '../utils/similarity';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldAlert, 
  Ban, 
  Check, 
  X, 
  BookOpen, 
  Users, 
  Layers, 
  FolderPlus, 
  UserCheck,
  Lightbulb,
  Bookmark,
  Shield,
  ShieldCheck,
  LifeBuoy,
  Bug,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  GraduationCap,
  Flag,
  KeyRound,
  AlertTriangle,
  Search,
  ArrowUp,
  ArrowDown,
  Shuffle,
  ListOrdered,
  GripVertical,
  CopyCheck,
  GitCompare,
  CheckCheck,
  RefreshCw,
  Laptop,
  Sparkles,
  EllipsisVertical
} from 'lucide-react-native';
import { CONTENT_MAX_WIDTH, RADIUS } from '../components/ui/tokens';

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const PRESET_ICONS = ['Compass', 'Sliders', 'BookOpen', 'GraduationCap', 'Wrench', 'Eye', 'HelpCircle'];

const isImgUri = (uri?: string | null) => {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://') || uri.startsWith('data:') || uri.includes('/') || uri.includes('\\');
};

// Top-level component to edit ticket response (prevents keyboard dismiss)
const TicketResponseEditor = React.memo(({ 
  ticket, 
  colors,
  onSave,
  onCancel
}: { 
  ticket: Ticket; 
  colors: { background: string; cardBg: string; text: string; border: string; textMuted: string; primary: string };
  onSave: (response: string, status: 'open' | 'in_progress' | 'resolved') => void;
  onCancel: () => void;
}) => {
  const [text, setText] = useState(ticket.response || '');
  const [status, setStatus] = useState<'open' | 'in_progress' | 'resolved'>(
    ticket.status === 'open' ? 'resolved' : ticket.status
  );

  return (
    <View style={[styles.ticketResponseEditorBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.formLabel, { color: colors.text, marginBottom: 6 }]}>
        Antwort verfassen an {ticket.userName}:
      </Text>
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor: colors.cardBg, 
            color: colors.text, 
            borderColor: colors.border,
            minHeight: 75,
            textAlignVertical: 'top',
            paddingTop: 8,
            marginBottom: 10
          }
        ]}
        placeholder="Schreibe deine Antwort oder Erklärung für den Schüler..."
        placeholderTextColor={colors.textMuted}
        multiline
        scrollEnabled={false}
        value={text}
        onChangeText={setText}
      />

      {/* Status Wahl */}
      <Text style={[styles.formLabel, { color: colors.text, marginBottom: 6 }]}>Neuer Status:</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TouchableOpacity
          style={[
            styles.statusSelectBtn,
            { 
              backgroundColor: status === 'in_progress' ? '#2563eb' : colors.cardBg,
              borderColor: colors.border 
            }
          ]}
          onPress={() => setStatus('in_progress')}
        >
          <Text style={{ color: status === 'in_progress' ? '#ffffff' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
            ⏳ In Bearbeitung
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statusSelectBtn,
            { 
              backgroundColor: status === 'resolved' ? '#10b981' : colors.cardBg,
              borderColor: colors.border 
            }
          ]}
          onPress={() => setStatus('resolved')}
        >
          <Text style={{ color: status === 'resolved' ? '#ffffff' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
            ✅ Beantwortet / Gelöst
          </Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={[styles.smallActionBtn, { borderColor: colors.border, borderWidth: 1 }]}
          onPress={onCancel}
        >
          <Text style={{ color: colors.text }}>Abbrechen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallActionBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (!text.trim()) {
              Alert.alert('Fehler', 'Bitte gib einen Antworttext ein.');
              return;
            }
            onSave(text.trim(), status);
          }}
        >
          <Send size={14} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Antwort speichern</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Top-level component to edit user titles (prevents keyboard dismiss)
const UserTitleEditor = React.memo(({ 
  user, 
  colors,
  onSave
}: { 
  user: DbUser; 
  colors: { background: string; text: string; border: string; textMuted: string; primary: string };
  onSave: (newTitle: string) => void;
}) => {
  const [titleVal, setTitleVal] = useState(user.title || '');
  useEffect(() => {
    setTitleVal(user.title || '');
  }, [user.title]);

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.titleInputRow}>
        <TextInput
          style={[styles.titleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="z.B. Lokführer, Ausbilder..."
          placeholderTextColor={colors.textMuted}
          value={titleVal}
          onChangeText={setTitleVal}
        />
        <TouchableOpacity
          style={[styles.saveTitleBtn, { backgroundColor: colors.primary, paddingHorizontal: 10, width: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
          onPress={() => onSave(titleVal)}
        >
          <Check size={14} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Speichern</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {(['Lokführer', 'Wagenmeister', 'Zf/Rb-bau'] as const).map((t) => {
          const isSelected = titleVal === t;
          return (
            <TouchableOpacity
              key={t}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 6,
                backgroundColor: isSelected ? colors.primary : colors.background,
                borderColor: isSelected ? colors.primary : colors.border,
                borderWidth: 1,
              }}
              onPress={() => {
                setTitleVal(t);
                onSave(t);
              }}
            >
              <Text style={{ fontSize: 10, color: isSelected ? '#ffffff' : colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>
                {t}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

// Top-level component to edit user names (prevents keyboard dismiss)
const UserNameEditor = React.memo(({ 
  user, 
  colors,
  onSave
}: { 
  user: DbUser; 
  colors: { background: string; text: string; border: string; textMuted: string; primary: string };
  onSave: (newName: string) => void;
}) => {
  const [nameVal, setNameVal] = useState(user.name || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setNameVal(user.name || '');
  }, [user.name]);

  if (!isEditing) {
    return (
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}
        onPress={() => setIsEditing(true)}
      >
        <Edit3 size={13} color={colors.primary} />
        <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>Name anpassen</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.titleInputRow}>
        <TextInput
          style={[styles.titleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="Vollständiger Name..."
          placeholderTextColor={colors.textMuted}
          value={nameVal}
          onChangeText={setNameVal}
        />
        <TouchableOpacity
          style={[styles.saveTitleBtn, { backgroundColor: colors.primary, paddingHorizontal: 10, width: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
          onPress={() => {
            if (!nameVal.trim()) {
              Alert.alert('Fehler', 'Bitte gib einen Namen ein.');
              return;
            }
            onSave(nameVal.trim());
            setIsEditing(false);
          }}
        >
          <Check size={14} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Speichern</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ paddingHorizontal: 8, justifyContent: 'center' }}
          onPress={() => {
            setNameVal(user.name || '');
            setIsEditing(false);
          }}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function AdminScreen() {
  const { isDark, colors: appColors } = useAppTheme();
  const { isTablet } = useDeviceLayout();

  // States
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<DbUser[]>([]);
  const usersMap = useMemo(() => {
    const map: Record<string, DbUser> = {};
    for (const u of users) {
      if (u.id) map[u.id] = u;
    }
    return map;
  }, [users]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Hauptbereiche: 'questions' | 'facts' | 'categories' | 'users' | 'tickets' | 'reports' | 'duplicates'
  const [activeTab, setActiveTab] = useState<'questions' | 'facts' | 'categories' | 'users' | 'tickets' | 'reports' | 'duplicates'>('questions');
  
  // Unterbereiche
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'form'>('list');
  const [factSubTab, setFactSubTab] = useState<'list' | 'form'>('list');
  const [catSubTab, setCatSubTab] = useState<'list' | 'form' | 'signal_subcategories'>('list');
  const [signalSubcategories, setSignalSubcategories] = useState<SignalSubcategory[]>([]);
  const [newSigSubName, setNewSigSubName] = useState('');
  const [newSigSubDesc, setNewSigSubDesc] = useState('');
  const [editingSubcatId, setEditingSubcatId] = useState<string | null>(null);
  const [editingSubcatOldName, setEditingSubcatOldName] = useState<string | null>(null);
  const [subcatImageUrl, setSubcatImageUrl] = useState<string>('');
  const [pickingSubcatImage, setPickingSubcatImage] = useState<boolean>(false);
  const [userSubTab, setUserSubTab] = useState<'users' | 'roles' | 'webkeys'>('users');
  const [webKeysList, setWebKeysList] = useState<{ key: string; isRedeemed: boolean; redeemedBy?: string; createdAt: number }[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<DbUser | null>(null);

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    const q = userSearchQuery.trim().toLowerCase();
    return users.filter(u => {
      if (!u) return false;
      const roleDef = Array.isArray(roles) ? roles.find(r => r && r.id === u.role) : undefined;
      const roleName = (roleDef?.name || u.role || '').toLowerCase();
      const title = (u.title || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      if (!q) return true;
      return name.includes(q) || email.includes(q) || roleName.includes(q) || title.includes(q);
    });
  }, [users, userSearchQuery, roles]);

  const activeUserInMenu = useMemo(() => {
    if (!selectedUserForMenu) return null;
    return users.find(u => u.id === selectedUserForMenu.id) || selectedUserForMenu;
  }, [selectedUserForMenu, users]);

  // Ticket Filter & Response State
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState<'all' | 'bug' | 'feature' | 'exam_question' | 'password_reset'>('all');
  const [activeRespondingTicketId, setActiveRespondingTicketId] = useState<string | null>(null);
  const [adminPreviewImage, setAdminPreviewImage] = useState<string | null>(null);

  // Chat Reports State
  const [chatReports, setChatReports] = useState<ChatMessageReport[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'deleted'>('all');
  const [chatBans, setChatBans] = useState<ChatBanRecord[]>([]);

  // Doppel-Check (Duplikaterkennung) State
  const [duplicateSubTab, setDuplicateSubTab] = useState<'all' | 'questions' | 'facts'>('all');
  const [duplicateQuestionPairs, setDuplicateQuestionPairs] = useState<DuplicateQuestionPair[]>([]);
  const [duplicateFactPairs, setDuplicateFactPairs] = useState<DuplicateFactPair[]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState<boolean>(false);
  const [hasScannedOnce, setHasScannedOnce] = useState<boolean>(false);
  const [scanProgressText, setScanProgressText] = useState<string>('');
  const [scanProgressPercent, setScanProgressPercent] = useState<number>(0);
  const [duplicateDisplayLimit, setDuplicateDisplayLimit] = useState<number>(15);
  const [reviewedDuplicateKeys, setReviewedDuplicateKeys] = useState<string[]>([]);
  const isScanningDuplicatesRef = useRef<boolean>(false);

  // ScrollView Refs für dynamisches Scrollen zum aktiven Eingabefeld
  const questionScrollRef = useRef<ScrollViewInstance>(null);
  const factScrollRef = useRef<ScrollViewInstance>(null);
  const catScrollRef = useRef<ScrollViewInstance>(null);
  const userScrollRef = useRef<ScrollViewInstance>(null);
  const ticketScrollRef = useRef<ScrollViewInstance>(null);
  const reportScrollRef = useRef<ScrollViewInstance>(null);
  const duplicateScrollRef = useRef<ScrollViewInstance>(null);

  // Bildschirmabmessungen und ScrollView-Viewport für dynamische Tastaturanpassung
  const { height: windowHeight } = useWindowDimensions();
  const [scrollViewportHeight, setScrollViewportHeight] = useState<number>(0);

  // Dynamische Tastatur-Verschiebung für nahtloses Hochwandern ohne grauen Leerraum
  const { keyboardHeight, isKeyboardVisible, dynamicKeyboardPadding } = useDynamicKeyboard(0);

  // Sanftes, ruckelfreies Hochwandern des fokussierten Feldes direkt über die Tastatur
  const { onScroll: onSmoothScroll, handleInputFocus } = useSmoothKeyboardScroll();

  // KATEGORIE-, STATUS-FILTER FÜR FRAGEN & LERNKARTEN
  const [questionCategoryFilter, setQuestionCategoryFilter] = useState<string>('all');
  const [questionVerificationFilter, setQuestionVerificationFilter] = useState<'all' | 'unverified' | 'verified'>('all');
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [factCategoryFilter, setFactCategoryFilter] = useState<string>('all');
  const [factSubcategoryFilter, setFactSubcategoryFilter] = useState<string>('all');
  const [factVerificationFilter, setFactVerificationFilter] = useState<'all' | 'unverified' | 'verified'>('all');
  const [factSearchQuery, setFactSearchQuery] = useState('');
  const [factDisplayLimit, setFactDisplayLimit] = useState<number>(40);

  // FORMULAR-STATES: FRAGEN
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [formQType, setFormQType] = useState<'classic' | 'order'>('classic');
  const [formQOrderSteps, setFormQOrderSteps] = useState<string[]>(['', '', '', '']);
  const [formQCategory, setFormQCategory] = useState<string>('');
  const [formQIsVerified, setFormQIsVerified] = useState<boolean>(true);
  const [formQText, setFormQText] = useState('');
  const [formQOptions, setFormQOptions] = useState<string[]>(['', '', '', '']);
  const [formQCorrectIndices, setFormQCorrectIndices] = useState<number[]>([0]);
  const [formQExplanation, setFormQExplanation] = useState('');
  const [formQImageUrl, setFormQImageUrl] = useState('');
  const [formQDangerIndices, setFormQDangerIndices] = useState<number[]>([]);

  // FORMULAR-STATES: LERNKARTEN
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [formFCategory, setFormFCategory] = useState<string>('');
  const [formFSubcategory, setFormFSubcategory] = useState<string>('');
  const [formFIsVerified, setFormFIsVerified] = useState<boolean>(true);
  const [formFTitle, setFormFTitle] = useState('');
  const [formFContent, setFormFContent] = useState('');
  const [formFReference, setFormFReference] = useState('');
  const [formFImageUrl, setFormFImageUrl] = useState('');
  const [formFImageUrls, setFormFImageUrls] = useState<string[]>([]);
  const [newFactImageUrlInput, setNewFactImageUrlInput] = useState('');

  // FORMULAR-STATES: KATEGORIEN
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [formCatName, setFormCatName] = useState('');
  const [formCatDesc, setFormCatDesc] = useState('');
  const [formCatColor, setFormCatColor] = useState('#3b82f6');
  const [formCatIcon, setFormCatIcon] = useState('Lokomotive');
  const [formCatImageUrl, setFormCatImageUrl] = useState('');
  const [pickingCatImage, setPickingCatImage] = useState(false);

  // CUSTOM ICONS & ICON PICKER
  const [customIcons, setCustomIcons] = useState<CustomIconItem[]>([]);
  const [iconPickerTab, setIconPickerTab] = useState<'railway' | 'popular' | 'custom' | 'all'>('railway');
  const [showAddIconModal, setShowAddIconModal] = useState(false);
  const [newIconType, setNewIconType] = useState<'lucide' | 'emoji'>('lucide');
  const [newIconInput, setNewIconInput] = useState('');
  const [newIconLabel, setNewIconLabel] = useState('');
  const [addingIcon, setAddingIcon] = useState(false);

  // FORMULAR-STATES: ROLLEN
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [formRoleName, setFormRoleName] = useState('');
  const [formRoleColor, setFormRoleColor] = useState('#8b5cf6');
  const [formRoleCanAccessAdmin, setFormRoleCanAccessAdmin] = useState(false);

  // Themes
  const colors = {
    ...appColors,
    error: '#ef4444',
    success: '#10b981',
  };

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      if (!forceRefresh) setLoading(true);
      const user = await mockDb.getCurrentUser();
      setCurrentUser(user);
      const allRoles = await mockDb.getRoles();
      setRoles(allRoles);

      const hasAdminAccess = user && (user.role === 'admin' || user.role === 'moderator' || allRoles.find(r => r.id === user.role)?.canAccessAdmin);

      if (hasAdminAccess) {
        // Für Admin & Mod alle Fragen und Lernkarten inklusive ungeprüfter laden
        const allQuestions = await mockDb.getQuestions(false, forceRefresh);
        setQuestions(allQuestions);
        const allFacts = await mockDb.getFacts(undefined, false, forceRefresh);
        setFacts(allFacts);
        const allCategories = await mockDb.getCategories();
        setCategories(allCategories);
        const allSigSubs = await mockDb.getSignalSubcategories();
        setSignalSubcategories(allSigSubs);
        const allTickets = await mockDb.getTickets();
        setTickets(allTickets);
        const allReports = await mockDb.getChatReports();
        setChatReports(allReports);
        const allBans = await mockDb.getChatBans();
        setChatBans(allBans);
        
        // Erste Kategorie als Standard setzen für Formulare
        if (allCategories.length > 0) {
          setFormQCategory(allCategories[0].name);
          setFormFCategory(allCategories[0].name);
        }

        const allUsers = await mockDb.getUsers();
        setUsers(allUsers);

        try {
          const allWebKeys = await mockDb.getWebKeys();
          setWebKeysList(allWebKeys);
        } catch {}

        const allCustomIcons = await mockDb.getCustomIcons();
        setCustomIcons(allCustomIcons);

        try {
          const [storedReviewed, dbReviewed] = await Promise.all([
            AsyncStorage.getItem('railtrainer_reviewed_duplicate_keys'),
            mockDb.getReviewedDuplicates()
          ]);
          const parsedStored: string[] = storedReviewed ? JSON.parse(storedReviewed) : [];
          const combinedKeys = Array.from(new Set([...parsedStored, ...(dbReviewed || [])]));
          setReviewedDuplicateKeys(combinedKeys);
        } catch {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  // Im Hintergrund regelmäßig Daten synchronisieren (ressourcenschonend ohne Unterbrechung beim Editieren)
  useEffect(() => {
    const interval = setInterval(async () => {
      // Wenn der Nutzer gerade ein Formular ausfüllt oder die Tastatur offen ist, Hintergrund-Updates überspringen
      if (activeSubTab === 'form' || factSubTab === 'form' || catSubTab === 'form' || isKeyboardVisible) {
        return;
      }

      const user = await mockDb.getCurrentUser();
      setCurrentUser(prev => (prev?.id === user?.id && prev?.role === user?.role ? prev : user));
      const allRoles = await mockDb.getRoles();
      setRoles(prev => (prev.length === allRoles.length && prev[0]?.id === allRoles[0]?.id ? prev : allRoles));

      const hasAdminAccess = user && (user.role === 'admin' || user.role === 'moderator' || allRoles.find(r => r.id === user.role)?.canAccessAdmin);

      if (hasAdminAccess) {
        const allQuestions = await mockDb.getQuestions(false);
        setQuestions(prev => (prev.length === allQuestions.length && prev[0]?.id === allQuestions[0]?.id ? prev : allQuestions));
        const allFacts = await mockDb.getFacts(undefined, false);
        setFacts(prev => (prev.length === allFacts.length && prev[0]?.id === allFacts[0]?.id ? prev : allFacts));
        const allCategories = await mockDb.getCategories();
        setCategories(prev => (prev.length === allCategories.length && prev[0]?.name === allCategories[0]?.name ? prev : allCategories));
        const allTickets = await mockDb.getTickets();
        setTickets(prev => (prev.length === allTickets.length && prev[0]?.id === allTickets[0]?.id ? prev : allTickets));
        const allReports = await mockDb.getChatReports();
        setChatReports(prev => (prev.length === allReports.length && prev[0]?.id === allReports[0]?.id ? prev : allReports));
        
        const allUsers = await mockDb.getUsers();
        setUsers(prev => (prev.length === allUsers.length && prev[0]?.id === allUsers[0]?.id ? prev : allUsers));
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [activeSubTab, factSubTab, catSubTab, isKeyboardVisible]);

  // --- DOPPEL-CHECK LOGIK ---
  // Ermittelt für ein Duplikatpaar, welches Element neuer / zuletzt hinzugefügt ist und formatiert Daten
  const getDuplicatePairMetadata = useCallback(<T extends { id: string; isVerified?: boolean; createdAt?: string; created_at?: string }>(
    item1: T,
    item2: T,
    allList?: T[]
  ) => {
    const d1 = item1.createdAt || item1.created_at;
    const d2 = item2.createdAt || item2.created_at;

    const t1 = d1 ? new Date(d1).getTime() : NaN;
    const t2 = d2 ? new Date(d2).getTime() : NaN;

    const formatDate = (dStr?: string) => {
      if (!dStr) return undefined;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return undefined;
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    let is1Newer = false;
    let is2Newer = false;

    if (!isNaN(t1) && !isNaN(t2) && t1 !== t2) {
      is1Newer = t1 > t2;
      is2Newer = t2 > t1;
    } else if (!isNaN(t1) && isNaN(t2)) {
      is1Newer = true;
    } else if (isNaN(t1) && !isNaN(t2)) {
      is2Newer = true;
    } else {
      // Fallback 1: Timestamp aus ID extrahieren (z.B. q_1710000000000 oder fact_1710000000000)
      const extractTs = (id: string): number => {
        const m = id.match(/_(\d{10,14})/);
        return m ? parseInt(m[1], 10) : NaN;
      };
      const ts1 = extractTs(item1.id);
      const ts2 = extractTs(item2.id);
      if (!isNaN(ts1) && !isNaN(ts2) && ts1 !== ts2) {
        is1Newer = ts1 > ts2;
        is2Newer = ts2 > ts1;
      } else if (!isNaN(ts1) && isNaN(ts2)) {
        is1Newer = true;
      } else if (isNaN(ts1) && !isNaN(ts2)) {
        is2Newer = true;
      } else if (allList && allList.length > 0) {
        // Fallback 2: Position in Gesamtliste (später hinzugefügt = höherer Index)
        const idx1 = allList.findIndex(x => x.id === item1.id);
        const idx2 = allList.findIndex(x => x.id === item2.id);
        if (idx1 !== -1 && idx2 !== -1 && idx1 !== idx2) {
          is1Newer = idx1 > idx2;
          is2Newer = idx2 > idx1;
        }
      }
    }

    return {
      is1Newer,
      is2Newer,
      item1DateText: formatDate(d1),
      item2DateText: formatDate(d2),
    };
  }, []);

  const reviewedKeysSet = useMemo(() => new Set(reviewedDuplicateKeys), [reviewedDuplicateKeys]);
  const pendingDuplicatesCount = duplicateQuestionPairs.length + duplicateFactPairs.length;

  const runDuplicateScanAsync = useCallback(async (forced: boolean = false) => {
    if (isScanningDuplicatesRef.current) return;
    isScanningDuplicatesRef.current = true;
    setIsScanningDuplicates(true);
    setScanProgressPercent(0);
    setScanProgressText('Bereite Prüfung vor...');

    try {
      // Immer aktuellsten Stand an ignorierten / bestätigten Duplikaten aus Speicher & DB laden
      let currentReviewedSet = reviewedKeysSet;
      try {
        const [storedRaw, dbKeys] = await Promise.all([
          AsyncStorage.getItem('railtrainer_reviewed_duplicate_keys'),
          mockDb.getReviewedDuplicates()
        ]);
        const parsedStored: string[] = storedRaw ? JSON.parse(storedRaw) : [];
        const merged = Array.from(new Set([...reviewedDuplicateKeys, ...parsedStored, ...(dbKeys || [])]));
        currentReviewedSet = new Set(merged);
        setReviewedDuplicateKeys(merged);
      } catch {}

      // 1. Fragen prüfen (0% bis 45%)
      setScanProgressText('Prüfe Fragen auf Duplikate...');
      const qPairs = await findDuplicateQuestionsAsync(
        questions,
        currentReviewedSet,
        new Set(),
        (curr, total) => {
          const pct = total > 0 ? Math.round((curr / total) * 45) : 20;
          setScanProgressPercent(pct);
          setScanProgressText(`Prüfe Fragen (${curr} / ${total})...`);
        }
      );
      setDuplicateQuestionPairs(qPairs);
      setScanProgressPercent(50);

      // 2. Lernkarten prüfen (50% bis 95%)
      setScanProgressText('Prüfe Lernkarten auf Duplikate...');
      const fPairs = await findDuplicateFactsAsync(
        facts,
        currentReviewedSet,
        new Set(),
        (curr, total) => {
          const pct = total > 0 ? 50 + Math.round((curr / total) * 45) : 70;
          setScanProgressPercent(pct);
          setScanProgressText(`Prüfe Lernkarten (${curr} / ${total})...`);
        }
      );
      setDuplicateFactPairs(fPairs);

      setScanProgressPercent(100);
      setScanProgressText('Abgeschlossen!');
      setHasScannedOnce(true);
    } catch (err) {
      console.error('Error running duplicate scan', err);
    } finally {
      setIsScanningDuplicates(false);
      isScanningDuplicatesRef.current = false;
    }
  }, [questions, facts, reviewedKeysSet, reviewedDuplicateKeys]);

  // Doppel-Check beim ersten Aufruf des Tabs starten
  useEffect(() => {
    if (activeTab === 'duplicates' && !hasScannedOnce && !isScanningDuplicatesRef.current) {
      runDuplicateScanAsync();
    }
  }, [activeTab, hasScannedOnce, runDuplicateScanAsync]);

  const handleMarkDuplicateReviewed = useCallback(async (pairKey: string) => {
    setReviewedDuplicateKeys(prev => {
      const next = prev.includes(pairKey) ? prev : [...prev, pairKey];
      AsyncStorage.setItem('railtrainer_reviewed_duplicate_keys', JSON.stringify(next)).catch(() => {});
      return next;
    });
    mockDb.markDuplicateReviewed(pairKey).catch(() => {});
    setDuplicateQuestionPairs(prev => prev.filter(p => p.pairKey !== pairKey));
    setDuplicateFactPairs(prev => prev.filter(p => p.pairKey !== pairKey));
  }, []);

  const handleResetReviewedDuplicates = useCallback(async () => {
    Alert.alert(
      'Geprüfte Duplikate zurücksetzen?',
      'Möchtest du alle bisher als "Kein Duplikat" bestätigten Paare wieder in der Liste anzeigen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen & Neu prüfen',
          onPress: async () => {
            setReviewedDuplicateKeys([]);
            await Promise.all([
              AsyncStorage.removeItem('railtrainer_reviewed_duplicate_keys'),
              mockDb.clearReviewedDuplicates()
            ]);
            runDuplicateScanAsync(true);
          }
        }
      ]
    );
  }, [runDuplicateScanAsync]);

  const handleDeleteDuplicateQuestionChoice = useCallback((
    pair: DuplicateQuestionPair,
    targetIndex: 1 | 2
  ) => {
    const qToDelete = targetIndex === 1 ? pair.question1 : pair.question2;
    const qToKeep = targetIndex === 1 ? pair.question2 : pair.question1;
    const labelNum = targetIndex === 1 ? '1' : '2';
    const keepNum = targetIndex === 1 ? '2' : '1';

    Alert.alert(
      `Frage ${labelNum} löschen?`,
      `Möchtest du Frage ${labelNum} wirklich dauerhaft löschen?\n\n` +
      `Frage ${labelNum}: "${qToDelete.text.length > 70 ? qToDelete.text.substring(0, 67) + '...' : qToDelete.text}"\n\n` +
      `Frage ${keepNum} bleibt unverändert erhalten.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: `Frage ${labelNum} löschen`,
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await mockDb.deleteQuestion(qToDelete.id);
              if (success) {
                setQuestions(prev => {
                  const updated = prev.filter(q => q.id !== qToDelete.id);
                  Alert.alert(
                    'Gelöscht ✓',
                    `Frage ${labelNum} wurde gelöscht.\n\nVerbleibende Fragen: ${updated.length}`
                  );
                  return updated;
                });

                setDuplicateQuestionPairs(prev => 
                  prev.filter(p => p.question1.id !== qToDelete.id && p.question2.id !== qToDelete.id)
                );

                if (editingQuestionId === qToDelete.id) {
                  handleQResetForm();
                }
              } else {
                Alert.alert('Fehler', 'Konnte die Frage nicht löschen.');
              }
            } catch (err: any) {
              Alert.alert('Fehler', 'Löschen fehlgeschlagen: ' + (err?.message || err));
            }
          }
        }
      ]
    );
  }, [editingQuestionId]);

  const handleDeleteDuplicateFactChoice = useCallback((
    pair: DuplicateFactPair,
    targetIndex: 1 | 2
  ) => {
    const fToDelete = targetIndex === 1 ? pair.fact1 : pair.fact2;
    const fToKeep = targetIndex === 1 ? pair.fact2 : pair.fact1;
    const labelNum = targetIndex === 1 ? '1' : '2';
    const keepNum = targetIndex === 1 ? '2' : '1';

    Alert.alert(
      `Lernkarte ${labelNum} löschen?`,
      `Möchtest du Lernkarte ${labelNum} wirklich dauerhaft löschen?\n\n` +
      `Lernkarte ${labelNum}: "${fToDelete.title}"\n\n` +
      `Lernkarte ${keepNum} bleibt unverändert erhalten.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: `Lernkarte ${labelNum} löschen`,
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await mockDb.deleteFact(fToDelete.id);
              if (success) {
                setFacts(prev => {
                  const updated = prev.filter(f => f.id !== fToDelete.id);
                  Alert.alert(
                    'Gelöscht ✓',
                    `Lernkarte ${labelNum} wurde gelöscht.\n\nVerbleibende Lernkarten: ${updated.length}`
                  );
                  return updated;
                });

                setDuplicateFactPairs(prev => 
                  prev.filter(p => p.fact1.id !== fToDelete.id && p.fact2.id !== fToDelete.id)
                );

                if (editingFactId === fToDelete.id) {
                  handleFResetForm();
                }
              } else {
                Alert.alert('Fehler', 'Konnte die Lernkarte nicht löschen.');
              }
            } catch (err: any) {
              Alert.alert('Fehler', 'Löschen fehlgeschlagen: ' + (err?.message || err));
            }
          }
        }
      ]
    );
  }, [editingFactId]);

  // --- LERNKARTEN LOGIK ---
  const handleFEditClick = (f: Fact) => {
    setActiveTab('facts');
    setEditingFactId(f.id);
    setFormFCategory(f.category);
    setFormFSubcategory(f.subcategory || (f.category === 'Signale' ? getFactSignalSubcategory(f) : ''));
    setFormFTitle(f.title);
    setFormFContent(f.content);
    setFormFReference(f.reference || '');
    const imgs = getFactImageUrls(f);
    setFormFImageUrl(imgs[0] || '');
    setFormFImageUrls(imgs);
    setNewFactImageUrlInput('');
    setFormFIsVerified(f.isVerified ?? true);
    setFactSubTab('form');
  };

  const handleFDeleteClick = (id: string, title?: string) => {
    const label = title ? `"${title.length > 50 ? title.substring(0, 47) + '...' : title}"` : 'diese Lernkarte';
    Alert.alert(
      'Lernkarte löschen?',
      `Möchtest du ${label} wirklich dauerhaft löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Löschen', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await mockDb.deleteFact(id);
              if (success) {
                setFacts(prev => prev.filter(f => f.id !== id));
                setDuplicateFactPairs(prev => prev.filter(p => p.fact1.id !== id && p.fact2.id !== id));
                if (editingFactId === id) handleFResetForm();
                Alert.alert('Gelöscht ✓', 'Die Lernkarte wurde erfolgreich gelöscht.');
              } else {
                Alert.alert('Fehler', 'Konnte die Lernkarte nicht löschen.');
              }
            } catch (err: any) {
              Alert.alert('Fehler', 'Löschen fehlgeschlagen: ' + (err?.message || err));
            }
          }
        }
      ]
    );
  };

  const handleFResetForm = () => {
    setEditingFactId(null);
    setFormFTitle('');
    setFormFSubcategory('');
    setFormFContent('');
    setFormFReference('');
    setFormFImageUrl('');
    setFormFImageUrls([]);
    setNewFactImageUrlInput('');
    setFormFIsVerified(currentUser?.role === 'admin');
    if (categories.length > 0) {
      setFormFCategory(categories[0].name);
    }
  };

  const handleFSave = async () => {
    if (!formFTitle.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel für die Lernkarte ein.');
      return;
    }
    if (!formFContent.trim()) {
      Alert.alert('Fehler', 'Bitte gib den Inhalt / die Erklärung ein.');
      return;
    }
    if (!formFReference.trim()) {
      Alert.alert('Fehler', 'Bitte gib die Regelwerks-Referenz ein (z.B. VDV 757, VDV 758, Ril 301).');
      return;
    }

    try {
      const existingFact = editingFactId ? facts.find(f => f.id === editingFactId) : undefined;
      const isNew = !editingFactId;
      const isAdmin = currentUser?.role === 'admin' || Boolean(roles.find(r => r.id === currentUser?.role)?.canAccessAdmin && currentUser?.role !== 'moderator');
      const shouldVerify = isAdmin ? formFIsVerified : false;

      const createdBy = isNew ? currentUser?.id : (existingFact?.createdBy || currentUser?.id);
      const createdByName = isNew
        ? (currentUser?.name || currentUser?.email)
        : (existingFact?.createdByName || (existingFact?.createdBy && usersMap[existingFact.createdBy]?.name) || currentUser?.name || currentUser?.email);
      const creatorRole = isNew ? currentUser?.role : (existingFact?.creatorRole || currentUser?.role);

      const allImages = formFImageUrls.length > 0 ? formFImageUrls : (formFImageUrl.trim() ? [formFImageUrl.trim()] : []);

      await mockDb.saveFact({
        id: editingFactId || undefined,
        category: formFCategory || (categories[0]?.name ?? 'Allgemein'),
        subcategory: formFCategory === 'Signale' ? (formFSubcategory.trim() || undefined) : undefined,
        title: formFTitle.trim(),
        content: formFContent.trim(),
        reference: formFReference.trim(),
        imageUrl: allImages[0] || undefined,
        imageUrls: allImages.length > 0 ? allImages : undefined,
        isVerified: shouldVerify,
        createdBy: createdBy,
        createdByName: createdByName,
        creatorRole: creatorRole,
        verifiedBy: shouldVerify ? (isAdmin ? (currentUser?.id || existingFact?.verifiedBy) : (existingFact?.verifiedBy || currentUser?.id)) : undefined,
        verifiedByName: shouldVerify ? (isAdmin ? (currentUser?.name || currentUser?.email || existingFact?.verifiedByName) : (existingFact?.verifiedByName || currentUser?.name || currentUser?.email)) : undefined
      });

      if (!isAdmin) {
        Alert.alert(
          '4-Augen-Prinzip 👁️👁️',
          isNew
            ? 'Die Lernkarte wurde erfolgreich gespeichert!\n\nDa du Moderator bist, muss sie gemäß 4-Augen-Prinzip erst von einem anderen Moderator oder Administrator geprüft und freigegeben werden, bevor sie für Schüler sichtbar ist.'
            : 'Die Änderungen wurden gespeichert!\n\nGemäß 4-Augen-Prinzip muss die bearbeitete Lernkarte erst wieder von einem anderen Moderator oder Administrator freigegeben werden.'
        );
      } else {
        Alert.alert('Erfolg', shouldVerify ? (isNew ? 'Lernkarte erstellt & freigegeben! ✓' : 'Lernkarte aktualisiert & freigegeben! ✓') : 'Lernkarte gespeichert (ungeprüft).');
      }
      handleFResetForm();
      setFactSubTab('list');
      loadData();
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Konnte die Lernkarte nicht speichern.');
    }
  };

  // --- FRAGEN LOGIK ---
  const handleQOptionChange = (text: string, index: number) => {
    const updated = [...formQOptions];
    updated[index] = text;
    setFormQOptions(updated);
  };

  const handleQAddOption = () => {
    if (formQOptions.length < 6) {
      setFormQOptions(prev => [...prev, '']);
    }
  };

  const handleQRemoveOption = (index: number) => {
    if (formQOptions.length > 3) {
      const updated = formQOptions.filter((_, i) => i !== index);
      setFormQOptions(updated);
      setFormQDangerIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
      setFormQCorrectIndices(prev => {
        const next = prev.filter(i => i !== index).map(i => i > index ? i - 1 : i);
        return next.length > 0 ? next : [0];
      });
    }
  };

  const toggleQCorrectIndex = (index: number) => {
    setFormQCorrectIndices(prev => {
      if (prev.includes(index)) {
        if (prev.length <= 1) {
          Alert.alert('Hinweis', 'Mindestens eine Antwort muss als richtig markiert sein.');
          return prev;
        }
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const toggleQDangerIndex = (index: number) => {
    setFormQDangerIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // Bild(er) aus Galerie für Lernkarte wählen (Mehrfachauswahl möglich)
  const handlePickFactImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung fehlt', 'Wir benötigen Zugriff auf deine Fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.35,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris: string[] = [];
        for (const asset of result.assets) {
          const raw = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'facts');
          newUris.push(optimizedUri);
        }
        setFormFImageUrls(prev => {
          const updated = [...prev, ...newUris];
          setFormFImageUrl(updated[0] || '');
          return updated;
        });
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte Galerie nicht öffnen: ' + (e?.message || e));
    }
  };

  const handleAddFactImageUrl = () => {
    const val = newFactImageUrlInput.trim();
    if (!val) return;
    if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('data:image')) {
      Alert.alert('Ungültige URL', 'Bitte gib eine gültige Bild-URL ein (beginnend mit http:// oder https://).');
      return;
    }
    setFormFImageUrls(prev => {
      const updated = [...prev, val];
      setFormFImageUrl(updated[0] || '');
      return updated;
    });
    setNewFactImageUrlInput('');
  };

  const handleRemoveFactImage = (indexToRemove: number) => {
    setFormFImageUrls(prev => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      setFormFImageUrl(updated[0] || '');
      return updated;
    });
  };

  const handleSetPrimaryFactImage = (indexToPrimary: number) => {
    setFormFImageUrls(prev => {
      if (indexToPrimary <= 0 || indexToPrimary >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(indexToPrimary, 1);
      copy.unshift(item);
      setFormFImageUrl(copy[0] || '');
      return copy;
    });
  };

  // Bild aus Galerie für Frage wählen
  const handlePickQuestionImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung fehlt', 'Wir benötigen Zugriff auf deine Fotos.');
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
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'questions');
        setFormQImageUrl(optimizedUri);
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte Galerie nicht öffnen: ' + (e?.message || e));
    }
  };

  const handleQEditClick = (q: Question) => {
    setActiveTab('questions');
    setEditingQuestionId(q.id);
    setFormQCategory(q.category);
    setFormQText(q.text);
    const isOrder = q.questionType === 'order';
    setFormQType(isOrder ? 'order' : 'classic');
    if (isOrder) {
      setFormQOrderSteps(q.options.length >= 2 ? [...q.options] : ['', '', '', '']);
    } else {
      setFormQOptions(q.options.length >= 3 ? [...q.options] : [...q.options, '']);
      const cIndices = getQuestionCorrectIndices(q);
      setFormQCorrectIndices(cIndices);
      setFormQDangerIndices(q.dangerIndices || q.danger_indices || []);
    }
    setFormQIsVerified(q.isVerified ?? true);
    setFormQExplanation(q.explanation || '');
    setFormQImageUrl(q.imageUrl || '');
    setActiveSubTab('form');
  };

  const handleQDeleteClick = (id: string, text?: string) => {
    const label = text ? `"${text.length > 50 ? text.substring(0, 47) + '...' : text}"` : 'diese Frage';
    Alert.alert(
      'Frage löschen?',
      `Möchtest du ${label} wirklich dauerhaft löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Löschen', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await mockDb.deleteQuestion(id);
              if (success) {
                setQuestions(prev => prev.filter(q => q.id !== id));
                setDuplicateQuestionPairs(prev => prev.filter(p => p.question1.id !== id && p.question2.id !== id));
                if (editingQuestionId === id) handleQResetForm();
                Alert.alert('Gelöscht ✓', 'Die Frage wurde erfolgreich gelöscht.');
              } else {
                Alert.alert('Fehler', 'Konnte die Frage nicht löschen.');
              }
            } catch (err: any) {
              Alert.alert('Fehler', 'Löschen fehlgeschlagen: ' + (err?.message || err));
            }
          }
        }
      ]
    );
  };

  const handleQResetForm = () => {
    setEditingQuestionId(null);
    setFormQType('classic');
    setFormQText('');
    setFormQOptions(['', '', '', '']);
    setFormQOrderSteps(['', '', '', '']);
    setFormQIsVerified(currentUser?.role === 'admin');
    setFormQCorrectIndices([0]);
    setFormQExplanation('');
    setFormQImageUrl('');
    setFormQDangerIndices([]);
    if (categories.length > 0) {
      setFormQCategory(categories[0].name);
    }
  };

  const handleQSave = async () => {
    if (!formQText.trim()) {
      Alert.alert('Fehler', 'Bitte gib den Fragentext ein.');
      return;
    }
    if (!formQCategory) {
      Alert.alert('Fehler', 'Es wurde keine Kategorie ausgewählt. Erstelle zuerst eine Kategorie!');
      return;
    }

    let cleanOptions: string[] = [];
    let validCorrectIndices: number[] = [];
    let targetQuestionType: 'single' | 'multiple' | 'order' = 'single';
    let targetDangerIndices: number[] = [];

    if (formQType === 'order') {
      const cleanSteps = formQOrderSteps.map(s => s.trim()).filter(Boolean);
      if (cleanSteps.length < 2) {
        Alert.alert('Fehler', 'Bitte gib mindestens 2 Schritte für die korrekte Reihenfolge ein.');
        return;
      }
      cleanOptions = cleanSteps;
      validCorrectIndices = cleanSteps.map((_, i) => i);
      targetQuestionType = 'order';
      targetDangerIndices = [];
    } else {
      cleanOptions = formQOptions.map(o => o.trim()).filter(o => o !== '');
      if (cleanOptions.length < 3) {
        Alert.alert('Fehler', 'Bitte fülle mindestens 3 Antwortmöglichkeiten aus.');
        return;
      }
      validCorrectIndices = formQCorrectIndices.filter(i => i < cleanOptions.length);
      if (validCorrectIndices.length === 0) {
        Alert.alert('Fehler', 'Bitte markiere mindestens eine richtige Antwortmöglichkeit (grüner Haken).');
        return;
      }
      targetQuestionType = validCorrectIndices.length > 1 ? 'multiple' : 'single';
      targetDangerIndices = formQDangerIndices;
    }

    try {
      const existingQuestion = editingQuestionId ? questions.find(q => q.id === editingQuestionId) : undefined;
      const isNew = !editingQuestionId;
      const isAdmin = currentUser?.role === 'admin' || Boolean(roles.find(r => r.id === currentUser?.role)?.canAccessAdmin && currentUser?.role !== 'moderator');
      const shouldVerify = isAdmin ? formQIsVerified : false;

      const createdBy = isNew ? currentUser?.id : (existingQuestion?.createdBy || currentUser?.id);
      const createdByName = isNew
        ? (currentUser?.name || currentUser?.email)
        : (existingQuestion?.createdByName || (existingQuestion?.createdBy && usersMap[existingQuestion.createdBy]?.name) || currentUser?.name || currentUser?.email);
      const creatorRole = isNew ? currentUser?.role : (existingQuestion?.creatorRole || currentUser?.role);

      await mockDb.saveQuestion({
        id: editingQuestionId || undefined,
        category: formQCategory,
        text: formQText.trim(),
        options: cleanOptions,
        questionType: targetQuestionType,
        correctIndex: validCorrectIndices[0] ?? 0,
        correctIndices: validCorrectIndices,
        correct_indices: validCorrectIndices,
        explanation: formQExplanation.trim() || undefined,
        imageUrl: formQImageUrl.trim() || undefined,
        dangerIndices: targetDangerIndices,
        danger_indices: targetDangerIndices,
        isVerified: shouldVerify,
        createdBy: createdBy,
        createdByName: createdByName,
        creatorRole: creatorRole,
        verifiedBy: shouldVerify ? (isAdmin ? (currentUser?.id || existingQuestion?.verifiedBy) : (existingQuestion?.verifiedBy || currentUser?.id)) : undefined,
        verifiedByName: shouldVerify ? (isAdmin ? (currentUser?.name || currentUser?.email || existingQuestion?.verifiedByName) : (existingQuestion?.verifiedByName || currentUser?.name || currentUser?.email)) : undefined
      });

      if (!isAdmin) {
        Alert.alert(
          '4-Augen-Prinzip 👁️👁️',
          isNew
            ? 'Die Frage wurde erfolgreich gespeichert!\n\nDa du Moderator bist, muss sie gemäß 4-Augen-Prinzip erst von einem anderen Moderator oder Administrator geprüft und freigegeben werden, bevor sie für Schüler im Quiz sichtbar ist.'
            : 'Die Änderungen wurden gespeichert!\n\nGemäß 4-Augen-Prinzip muss die bearbeitete Frage erst wieder von einem anderen Prüfer freigegeben werden.'
        );
      } else {
        Alert.alert(
          'Erfolg', 
          shouldVerify 
            ? (isNew ? 'Frage erstellt & sofort freigegeben! ✓' : 'Frage aktualisiert & freigegeben! ✓')
            : 'Frage gespeichert (als ungeprüft markiert).'
        );
      }
      handleQResetForm();
      setActiveSubTab('list');
      loadData();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Konnte die Frage nicht speichern.');
    }
  };

  const handleToggleQuestionVerification = async (q: Question) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
      Alert.alert('Keine Berechtigung', 'Nur Moderatoren und Administratoren können Fragen freigeben.');
      return;
    }

    const isAdmin = currentUser?.role === 'admin' || Boolean(roles.find(r => r.id === currentUser?.role)?.canAccessAdmin && currentUser?.role !== 'moderator');
    const isAuthor = Boolean(
      (q.createdBy && currentUser?.id && q.createdBy === currentUser.id) ||
      (q.createdBy && currentUser?.email && q.createdBy === currentUser.email) ||
      (q.createdByName && currentUser?.name && q.createdByName === currentUser.name) ||
      (q.createdByName && currentUser?.email && q.createdByName === currentUser.email)
    );

    // 4-Augen-Prinzip Check: Nur Moderatoren dürfen ihre eigenen Fragen nicht selbst freigeben
    if (!isAdmin && !q.isVerified && isAuthor) {
      Alert.alert(
        '4-Augen-Prinzip ⚠️',
        'Du hast diese Frage als Moderator selbst erstellt. Gemäß 4-Augen-Prinzip muss ein anderer Moderator oder Administrator die Frage prüfen und freigeben.'
      );
      return;
    }

    const nextStatus = !q.isVerified;
    const authorName = q.createdByName || (q.createdBy && usersMap[q.createdBy]?.name);
    try {
      const updated = await mockDb.saveQuestion({
        ...q,
        createdByName: authorName || q.createdByName,
        isVerified: nextStatus,
        verifiedBy: nextStatus ? currentUser?.id : undefined,
        verifiedByName: nextStatus ? (currentUser?.name || currentUser?.email) : undefined
      });
      setQuestions(prev => prev.map(item => item.id === q.id ? updated : item));
      Alert.alert(
        'Prüfstatus geändert',
        nextStatus 
          ? '✓ Frage wurde geprüft und freigegeben!\n\nSie ist jetzt für alle Schüler im Quiz sichtbar.' 
          : '⏳ Frage wurde als ungeprüft markiert und ist für Schüler nicht mehr sichtbar.'
      );
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte Prüfstatus nicht ändern: ' + (e?.message || e));
    }
  };

  const handleToggleFactVerification = async (f: Fact) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
      Alert.alert('Keine Berechtigung', 'Nur Moderatoren und Administratoren können Lernkarten freigeben.');
      return;
    }

    const isAdmin = currentUser?.role === 'admin' || Boolean(roles.find(r => r.id === currentUser?.role)?.canAccessAdmin && currentUser?.role !== 'moderator');
    const isAuthor = Boolean(
      (f.createdBy && currentUser?.id && f.createdBy === currentUser.id) ||
      (f.createdBy && currentUser?.email && f.createdBy === currentUser.email) ||
      (f.createdByName && currentUser?.name && f.createdByName === currentUser.name) ||
      (f.createdByName && currentUser?.email && f.createdByName === currentUser.email)
    );

    // 4-Augen-Prinzip Check: Nur Moderatoren dürfen ihre eigenen Lernkarten nicht selbst freigeben
    if (!isAdmin && !f.isVerified && isAuthor) {
      Alert.alert(
        '4-Augen-Prinzip ⚠️',
        'Du hast diese Lernkarte als Moderator selbst erstellt. Gemäß 4-Augen-Prinzip muss ein anderer Moderator oder Administrator die Lernkarte prüfen und freigeben.'
      );
      return;
    }

    const nextStatus = !f.isVerified;
    const authorName = f.createdByName || (f.createdBy && usersMap[f.createdBy]?.name);
    try {
      const updated = await mockDb.saveFact({
        ...f,
        createdByName: authorName || f.createdByName,
        isVerified: nextStatus,
        verifiedBy: nextStatus ? currentUser?.id : undefined,
        verifiedByName: nextStatus ? (currentUser?.name || currentUser?.email) : undefined
      });
      setFacts(prev => prev.map(item => item.id === f.id ? updated : item));
      Alert.alert(
        'Prüfstatus geändert',
        nextStatus 
          ? '✓ Lernkarte wurde geprüft und freigegeben!\n\nSie ist jetzt für alle Schüler sichtbar.' 
          : '⏳ Lernkarte wurde als ungeprüft markiert und ist für Schüler nicht mehr sichtbar.'
      );
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte Prüfstatus nicht ändern: ' + (e?.message || e));
    }
  };

  // --- KATEGORIEN LOGIK ---
  const handleCatEditClick = (cat: Category) => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Keine Berechtigung', 'Nur Ausbilder/Administratoren kÃ¶nnen Kategorien bearbeiten.');
      return;
    }
    setEditingCatName(cat.name);
    setFormCatName(cat.name);
    setFormCatDesc(cat.desc);
    setFormCatColor(cat.color);
    setFormCatIcon(cat.icon);
    setFormCatImageUrl(cat.imageUrl || '');
    setCatSubTab('form');
  };

  const handleCatDeleteClick = (name: string) => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Keine Berechtigung', 'Nur Ausbilder/Administratoren kÃ¶nnen Kategorien lÃ¶schen.');
      return;
    }
    if (name.toLowerCase() === 'bahnbetrieb') {
      Alert.alert('GeschÃ¼tzte Kategorie', 'Die Standardkategorie â€žBahnbetriebâ€œ kann nicht gelÃ¶scht werden.');
      return;
    }
    Alert.alert(
      'Kategorie lÃ¶schen?',
      `MÃ¶chtest du die Kategorie "${name}" wirklich lÃ¶schen? Alle verknÃ¼pften Fragen und Lernkarten werden automatisch in die Kategorie â€žBahnbetriebâ€œ verschoben.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'LÃ¶schen & Verschieben', 
          style: 'destructive',
          onPress: async () => {
            const success = await mockDb.deleteCategory(name);
            if (success) {
              setCategories(prev => prev.filter(c => c.name !== name));
              loadData();
            }
          }
        }
      ]
    );
  };

  const handleCatResetForm = () => {
    setEditingCatName(null);
    setFormCatName('');
    setFormCatDesc('');
    setFormCatColor('#3b82f6');
    setFormCatIcon('Lokomotive');
    setFormCatImageUrl('');
  };

  const handlePickCatImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung fehlt', 'Wir benÃ¶tigen Zugriff auf deine Fotos.');
        return;
      }
      setPickingCatImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const raw = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'categories');
        setFormCatImageUrl(optimizedUri);
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Bild konnte nicht ausgewÃ¤hlt werden: ' + (e?.message || e));
    } finally {
      setPickingCatImage(false);
    }
  };

  const handlePickSubcatImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung fehlt', 'Wir benÃ¶tigen Zugriff auf deine Fotos.');
        return;
      }
      setPickingSubcatImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const raw = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'categories');
        setSubcatImageUrl(optimizedUri);
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Bild konnte nicht ausgewÃ¤hlt werden: ' + (e?.message || e));
    } finally {
      setPickingSubcatImage(false);
    }
  };

  const handleAddCustomIcon = async () => {
    if (!newIconInput.trim()) {
      Alert.alert('Eingabe fehlt', newIconType === 'emoji' ? 'Bitte gib ein Emoji ein (z.B. ðŸš‚ oder ðŸš¦).' : 'Bitte gib einen Lucide-Icon-Namen ein (z.B. TrainFront, Flame, Zap).');
      return;
    }
    const name = newIconInput.trim();
    const label = newIconLabel.trim() || name;
    setAddingIcon(true);
    try {
      const saved = await mockDb.saveCustomIcon({
        name: name,
        label: label,
        type: newIconType,
      });
      setCustomIcons(prev => [...prev.filter(item => item.id !== saved.id), saved]);
      setFormCatIcon(saved.name);
      setNewIconInput('');
      setNewIconLabel('');
      setShowAddIconModal(false);
      Alert.alert('Erfolg', `Symbol "${label}" wurde hinzugefÃ¼gt und ausgewÃ¤hlt!`);
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Symbol konnte nicht hinzugefÃ¼gt werden.');
    } finally {
      setAddingIcon(false);
    }
  };

  const handleDeleteCustomIcon = (iconItem: CustomIconItem) => {
    Alert.alert(
      'Symbol entfernen?',
      `MÃ¶chtest du das Symbol "${iconItem.label}" wirklich aus deiner Liste lÃ¶schen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'LÃ¶schen',
          style: 'destructive',
          onPress: async () => {
            const success = await mockDb.deleteCustomIcon(iconItem.id);
            if (success) {
              setCustomIcons(prev => prev.filter(item => item.id !== iconItem.id));
              if (formCatIcon === iconItem.name) {
                setFormCatIcon('Lokomotive');
              }
            }
          }
        }
      ]
    );
  };

  const displayedIcons = useMemo(() => {
    switch (iconPickerTab) {
      case 'railway':
        return RAILWAY_ICONS_DEF.map(i => ({ name: i.id, label: i.label, isCustom: false as const }));
      case 'popular':
        return POPULAR_LUCIDE_ICONS_DEF.map(i => ({ name: i.id, label: i.label, isCustom: false as const }));
      case 'custom':
        return customIcons.map(c => ({ name: c.name, label: c.label, isCustom: true as const, item: c }));
      case 'all':
      default:
        return [
          ...RAILWAY_ICONS_DEF.map(i => ({ name: i.id, label: i.label, isCustom: false as const })),
          ...customIcons.map(c => ({ name: c.name, label: c.label, isCustom: true as const, item: c })),
          ...POPULAR_LUCIDE_ICONS_DEF.map(i => ({ name: i.id, label: i.label, isCustom: false as const })),
        ];
    }
  }, [iconPickerTab, customIcons]);

  const handleCatSave = async () => {
    if (currentUser?.role !== 'admin') {
      Alert.alert('Keine Berechtigung', 'Nur Ausbilder/Administratoren kÃ¶nnen Kategorien erstellen oder bearbeiten.');
      return;
    }
    if (!formCatName.trim()) {
      Alert.alert('Fehler', 'Bitte gib den Kategorienamen ein.');
      return;
    }
    if (!formCatDesc.trim()) {
      Alert.alert('Fehler', 'Bitte gib eine kurze Beschreibung ein.');
      return;
    }

    try {
      await mockDb.saveCategory({
        name: formCatName.trim(),
        desc: formCatDesc.trim(),
        color: formCatColor,
        icon: formCatIcon,
        imageUrl: formCatImageUrl.trim() || undefined,
      }, editingCatName || undefined);

      Alert.alert('Erfolg', 'Kategorie wurde gespeichert.');
      handleCatResetForm();
      setCatSubTab('list');
      loadData();
    } catch {
      Alert.alert('Fehler', 'Konnte die Kategorie nicht speichern.');
    }
  };

  const handleSaveSignalSubcategory = async () => {
    if (!newSigSubName.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen fÃ¼r die Signal-Unterkategorie ein.');
      return;
    }
    try {
      const saved = await mockDb.saveSignalSubcategory({
        id: editingSubcatId || undefined,
        name: newSigSubName.trim(),
        desc: newSigSubDesc.trim(),
        color: '#ef4444',
        icon: 'Bookmark',
        imageUrl: subcatImageUrl.trim() || undefined,
      }, editingSubcatOldName || undefined);

      setSignalSubcategories(prev => {
        const idx = prev.findIndex(s => (editingSubcatId && s.id === editingSubcatId) || (editingSubcatOldName && s.name.toLowerCase() === editingSubcatOldName.toLowerCase()) || s.id === saved.id || s.name.toLowerCase() === saved.name.toLowerCase());
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });

      const isEdit = !!editingSubcatOldName;
      setEditingSubcatId(null);
      setEditingSubcatOldName(null);
      setNewSigSubName('');
      setNewSigSubDesc('');
      setSubcatImageUrl('');
      if (isEdit) {
        loadData();
      }
      Alert.alert('Erfolg âœ“', isEdit ? `Signal-Unterkategorie "${saved.name}" wurde aktualisiert.` : `Signal-Unterkategorie "${saved.name}" wurde erstellt.`);
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte Signal-Unterkategorie nicht speichern: ' + (e?.message || e));
    }
  };

  const handleEditSignalSubcategory = (sub: SignalSubcategory) => {
    setEditingSubcatId(sub.id || sub.name);
    setEditingSubcatOldName(sub.name);
    setNewSigSubName(sub.name);
    setNewSigSubDesc(sub.desc || '');
    setSubcatImageUrl(sub.imageUrl || '');
  };

  const handleCancelEditSignalSubcategory = () => {
    setEditingSubcatId(null);
    setEditingSubcatOldName(null);
    setNewSigSubName('');
    setNewSigSubDesc('');
    setSubcatImageUrl('');
  };

  const handleDeleteSignalSubcategory = (sub: SignalSubcategory) => {
    Alert.alert(
      'Unterkategorie löschen?',
      `Möchtest du die Signal-Unterkategorie "${sub.name}" wirklich löschen? Zugeordnete Signalkarten werden nicht gelöscht, sondern standardmäßig unter "Sonstige Signale" einsortiert.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await mockDb.deleteSignalSubcategory(sub.id);
              if (success) {
                setSignalSubcategories(prev => prev.filter(s => s.id !== sub.id));
                Alert.alert('Gelöscht ✓', `Signal-Unterkategorie "${sub.name}" wurde gelöscht.`);
              } else {
                Alert.alert('Fehler', 'Konnte Unterkategorie nicht löschen.');
              }
            } catch (e: any) {
              Alert.alert('Fehler', 'Löschen fehlgeschlagen: ' + (e?.message || e));
            }
          }
        }
      ]
    );
  };

  // --- TICKET LOGIK ---
  const handleSaveTicketResponse = async (
    ticketId: string,
    response: string,
    status: 'open' | 'in_progress' | 'resolved'
  ) => {
    if (!currentUser) return;
    try {
      await mockDb.updateTicketResponse(
        ticketId,
        response,
        status,
        currentUser.name,
        currentUser.title || (currentUser.role === 'admin' ? 'Ausbilder' : 'Mod')
      );
      setActiveRespondingTicketId(null);
      Alert.alert('Erfolg', 'Antwort wurde erfolgreich gespeichert und an den Benutzer übermittelt.');
      loadData();
    } catch {
      Alert.alert('Fehler', 'Konnte die Antwort nicht speichern.');
    }
  };

  const handleDeleteTicketAdmin = (ticketId: string) => {
    Alert.alert('Ticket löschen', 'Möchtest du dieses Ticket wirklich dauerhaft entfernen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await mockDb.deleteTicket(ticketId);
          loadData();
          Alert.alert('Erfolg', 'Ticket gelöscht.');
        }
      }
    ]);
  };

  const handleAdminResetPassword = (userEmailOrId: string, userName: string, ticketId?: string) => {
    Alert.alert(
      'Passwort zurücksetzen',
      `Möchtest du das Passwort für ${userName} (${userEmailOrId}) wirklich auf das Standard-Passwort "railtrainer" zurücksetzen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, zurücksetzen',
          style: 'destructive',
          onPress: async () => {
            try {
              await mockDb.resetUserPasswordToDefault(
                userEmailOrId, 
                ticketId, 
                currentUser?.name || 'Administrator', 
                currentUser?.title || (currentUser?.role === 'admin' ? 'Ausbilder' : 'Mod')
              );
              Alert.alert(
                'Erfolg! 🔑', 
                `Das Passwort für ${userName} wurde erfolgreich auf das Standard-Passwort "railtrainer" zurückgesetzt.`
              );
              loadData();
            } catch (e: any) {
              Alert.alert('Fehler', e.message || 'Konnte Passwort nicht zurücksetzen.');
            }
          }
        }
      ]
    );
  };

  // --- BENUTZER & ROLLEN LOGIK ---
  const handleSaveUserName = async (userId: string, newName: string) => {
    try {
      await mockDb.updateUserName(userId, newName.trim());
      Alert.alert('Erfolg ✅', `Name wurde erfolgreich auf „${newName.trim()}“ aktualisiert.`);
      loadData();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Name konnte nicht geändert werden.');
    }
  };

  const handleSaveUserTitle = async (userId: string, newTitle: string) => {
    const targetUser = users.find(u => u.id === userId);
    await mockDb.updateUserTitle(userId, newTitle.trim());
    Alert.alert('Erfolg', `Titel von ${targetUser?.name || 'Benutzer'} wurde geändert.`);
    loadData();
  };

  const handleUserRoleChange = async (userId: string, targetUser: DbUser, newRole: string) => {
    if (currentUser?.id === userId) {
      Alert.alert('Aktion blockiert', 'Du kannst deine eigene Rolle nicht verändern, um deinen Admin-Zugang nicht zu sperren.');
      return;
    }

    const targetRoleDef = roles.find(r => r.id === newRole);
    const targetRoleName = targetRoleDef?.name || newRole;

    Alert.alert(
      'Rolle ändern?',
      `Möchtest du die Rolle von ${targetUser.name} zu "${targetRoleName}" ändern?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Ändern', 
          onPress: async () => {
            await mockDb.updateUserRole(userId, newRole);
            loadData();
            Alert.alert('Erfolg', 'Benutzerrolle aktualisiert.');
          }
        }
      ]
    );
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (currentUser?.id === userId) {
      Alert.alert('Nicht möglich', 'Du kannst deinen eigenen Administrator-Account nicht löschen.');
      return;
    }
    Alert.alert(
      'Benutzer löschen',
      `Möchtest du den Benutzer "${userName}" wirklich dauerhaft löschen? Der Account und alle verknüpften Daten werden unwiderruflich entfernt.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Dauerhaft löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await mockDb.deleteUser(userId);
              loadData();
              Alert.alert('Gelöscht', `Der Benutzer "${userName}" wurde erfolgreich gelöscht.`);
            } catch (e: any) {
              Alert.alert('Fehler', e?.message || 'Benutzer konnte nicht gelöscht werden.');
            }
          }
        }
      ]
    );
  };

  const handleToggleWebAccess = async (userId: string, userName: string, isCurrentlyUnlocked: boolean) => {
    try {
      if (isCurrentlyUnlocked) {
        await mockDb.revokeWebAccess(userId);
        Alert.alert('Web-Zugang gesperrt', `Der Web-Zugang für "${userName}" wurde entzogen.`);
      } else {
        await mockDb.unlockWebAccess(userId, { provider: 'admin_manual', amount: '4.99' });
        Alert.alert('Web-Zugang freigeschaltet', `Der Web-Zugang für "${userName}" wurde erfolgreich freigeschaltet!`);
      }
      loadData();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Aktion fehlgeschlagen.');
    }
  };

  const handleGenerateWebKeys = async () => {
    try {
      const newKeys = await mockDb.generateAndSaveWebKeys(3);
      const list = await mockDb.getWebKeys();
      setWebKeysList(list);
      Alert.alert('3 Keys generiert! 🎉', `Neu generierte 4,99 € PayPal Lizenz-Codes:\n\n${newKeys.join('\n')}`);
    } catch (e: any) {
      Alert.alert('Fehler', 'Keys konnten nicht generiert werden.');
    }
  };

  const handleEditRoleClick = (role: RoleDefinition) => {
    setEditingRoleId(role.id);
    setFormRoleName(role.name);
    setFormRoleColor(role.color);
    setFormRoleCanAccessAdmin(role.canAccessAdmin);
  };

  const handleResetRoleForm = () => {
    setEditingRoleId(null);
    setFormRoleName('');
    setFormRoleColor('#8b5cf6');
    setFormRoleCanAccessAdmin(false);
  };

  const handleSaveRole = async () => {
    if (!formRoleName.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen für die Rolle ein (z.B. "Fahrlehrer" oder "Streckenprüfer").');
      return;
    }
    try {
      const existing = roles.find(r => r.id === editingRoleId);
      await mockDb.saveRole({
        id: editingRoleId || undefined,
        name: formRoleName.trim(),
        color: formRoleColor,
        canAccessAdmin: editingRoleId === 'admin' ? true : formRoleCanAccessAdmin,
        isSystem: existing?.isSystem,
      });
      Alert.alert('Erfolg', editingRoleId ? `Rolle "${formRoleName.trim()}" wurde aktualisiert!` : `Rolle "${formRoleName.trim()}" wurde erfolgreich angelegt!`);
      handleResetRoleForm();
      loadData();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Konnte die Rolle nicht speichern.');
    }
  };

  const handleDeleteRole = (id: string, name: string) => {
    Alert.alert(
      'Rolle löschen?',
      `Möchtest du die Rolle "${name}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            const success = await mockDb.deleteRole(id);
            if (success) {
              setRoles(prev => prev.filter(r => r.id !== id));
              loadData();
              Alert.alert('Erfolg', `Rolle "${name}" gelöscht.`);
            } else {
              Alert.alert('Hinweis', 'System-Standardrollen können nicht gelöscht werden.');
            }
          }
        }
      ]
    );
  };

  // --- CHAT REPORT HANDLERS ---
  const handleDismissChatReport = async (reportId: string) => {
    await mockDb.dismissChatReport(reportId);
    setChatReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'reviewed' as const } : r));
    Alert.alert('Erledigt ✅', 'Die Meldung wurde als geprüft markiert und verworfen.');
  };

  const handleDeleteReportedChatMessage = (reportId: string, messageId: string) => {
    Alert.alert(
      'Nachricht endgültig löschen?',
      'Möchtest du diese Nachricht wirklich für alle Teilnehmer aus dem Chat löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await mockDb.deleteReportedMessage(reportId, messageId);
            setChatReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'deleted' as const } : r));
            Alert.alert('Gelöscht 🗑️', 'Die gemeldete Nachricht wurde erfolgreich aus dem Chat entfernt.');
          }
        }
      ]
    );
  };

  const handleTimeoutUser = (targetUserId: string, targetUserName: string) => {
    if (!currentUser) return;
    Alert.alert(
      '⏱️ 1 Tag Timeout verhängen',
      `Möchtest du ${targetUserName} für 24 Stunden im Chat stummschalten?\n\nDer Nutzer kann für 1 Tag keine Nachrichten mehr senden.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: '1 Tag Timeout',
          style: 'destructive',
          onPress: async () => {
            await mockDb.setChatBan(targetUserId, targetUserName, 'timeout_1d', currentUser);
            const bans = await mockDb.getChatBans();
            setChatBans(bans);
            Alert.alert('Timeout aktiv ✅', `${targetUserName} wurde für 24 Stunden stummgeschaltet.`);
          }
        }
      ]
    );
  };

  const handleBanUser = (targetUserId: string, targetUserName: string) => {
    if (!currentUser) return;
    Alert.alert(
      '🚫 Im Chat bannen',
      `Möchtest du ${targetUserName} dauerhaft aus dem Chat verbannen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Dauerhaft bannen',
          style: 'destructive',
          onPress: async () => {
            await mockDb.setChatBan(targetUserId, targetUserName, 'permanent', currentUser);
            const bans = await mockDb.getChatBans();
            setChatBans(bans);
            Alert.alert('Gebannt ✅', `${targetUserName} wurde im Chat gesperrt.`);
          }
        }
      ]
    );
  };

  const handleUnbanUser = async (targetUserId: string, targetUserName: string) => {
    await mockDb.removeChatBan(targetUserId);
    const bans = await mockDb.getChatBans();
    setChatBans(bans);
    Alert.alert('Entsperrt ✅', `Die Sperre für ${targetUserName} wurde aufgehoben.`);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // --- NUR FÜR ADMINS & MODERATOREN (ZUGRIFF VERWEIGERT FÜR SCHÜLER) ---
  if (!currentUser || currentUser.role === 'user') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <ShieldAlert size={64} color={colors.error} style={{ marginBottom: 16 }} />
        <Text style={[styles.deniedTitle, { color: colors.text }]}>Zugriff verweigert</Text>
        <Text style={[styles.deniedText, { color: colors.textMuted }]}>
          Dieser Bereich ist nur für Administratoren und Moderatoren freigegeben.
        </Text>
        <Text style={[styles.deniedInstruction, { color: colors.primary }]}>
          Melden Sie sich mit einem berechtigten Account an, um Fragen oder Kategorien zu verwalten.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={isKeyboardVisible ? ['left', 'right'] : ['bottom', 'left', 'right']} style={[
      styles.container, 
      { backgroundColor: colors.background },
      isTablet && { width: '100%' }
    ]}>
      
      {/* OBERE NAVIGATION (HAUPT-TABS - HORIZONTAL SCROLLBAR / SLIDE - BEI TASTATUR IM FORMULAR AUSGEBLENDET FÜR MAXIMALEN PLATZ) */}
      
      <View style={[styles.mainTabBarWrapper, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mainTabBarScroll}
        >
          {(() => {
            const openTicketsCount = tickets.filter(t => t.status === 'open').length;
            const pendingReportsCount = chatReports.filter(r => r.status === 'pending').length;
            const unverifiedQuestionsCount = questions.filter(q => !q.isVerified).length;
            const unverifiedFactsCount = facts.filter(f => !f.isVerified).length;

            const tabDefs: {
              id: 'questions' | 'facts' | 'categories' | 'users' | 'tickets' | 'reports' | 'duplicates';
              label: string;
              icon: (active: boolean) => React.ReactNode;
              badgeCount?: number;
              badgeColor?: string;
              hasAlert?: boolean;
              activeBg?: string;
              visible: boolean;
              priority: number;
            }[] = [
              {
                id: 'reports',
                label: 'Meldungen',
                icon: (active) => <Flag size={16} color={active ? '#ffffff' : (pendingReportsCount > 0 ? '#ef4444' : colors.textMuted)} />,
                badgeCount: pendingReportsCount,
                badgeColor: '#ef4444',
                hasAlert: pendingReportsCount > 0,
                activeBg: '#ef4444',
                visible: true,
                priority: pendingReportsCount > 0 ? 100 : 10,
              },
              {
                id: 'tickets',
                label: 'Tickets',
                icon: (active) => <LifeBuoy size={16} color={active ? '#ffffff' : (openTicketsCount > 0 ? '#f97316' : colors.textMuted)} />,
                badgeCount: openTicketsCount,
                badgeColor: '#f97316',
                hasAlert: openTicketsCount > 0,
                activeBg: colors.primary,
                visible: true,
                priority: openTicketsCount > 0 ? 90 : 15,
              },
              {
                id: 'duplicates',
                label: 'Doppel-Check',
                icon: (active) => <CopyCheck size={16} color={active ? '#ffffff' : (pendingDuplicatesCount > 0 ? '#ef4444' : colors.textMuted)} />,
                badgeCount: pendingDuplicatesCount > 0 ? pendingDuplicatesCount : undefined,
                badgeColor: '#ef4444',
                hasAlert: pendingDuplicatesCount > 0,
                activeBg: colors.primary,
                visible: true,
                priority: pendingDuplicatesCount > 0 ? 85 : 25,
              },
              {
                id: 'questions',
                label: 'Fragen',
                icon: (active) => <BookOpen size={16} color={active ? '#ffffff' : (unverifiedQuestionsCount > 0 ? '#f59e0b' : colors.textMuted)} />,
                badgeCount: unverifiedQuestionsCount,
                badgeColor: '#f59e0b',
                hasAlert: unverifiedQuestionsCount > 0,
                activeBg: colors.primary,
                visible: true,
                priority: unverifiedQuestionsCount > 0 ? 80 : 50,
              },
              {
                id: 'facts',
                label: 'Lernkarten',
                icon: (active) => <Lightbulb size={16} color={active ? '#ffffff' : (unverifiedFactsCount > 0 ? '#f59e0b' : colors.textMuted)} />,
                badgeCount: unverifiedFactsCount,
                badgeColor: '#f59e0b',
                hasAlert: unverifiedFactsCount > 0,
                activeBg: colors.primary,
                visible: true,
                priority: unverifiedFactsCount > 0 ? 70 : 40,
              },
              {
                id: 'categories',
                label: 'Kategorien',
                icon: (active) => <Layers size={16} color={active ? '#ffffff' : colors.textMuted} />,
                activeBg: colors.primary,
                visible: currentUser.role === 'admin',
                priority: 30,
              },
              {
                id: 'users',
                label: 'Benutzer',
                icon: (active) => <Users size={16} color={active ? '#ffffff' : colors.textMuted} />,
                activeBg: colors.primary,
                visible: currentUser.role === 'admin',
                priority: 20,
              },
            ];

            const sortedTabs = tabDefs
              .filter(t => t.visible)
              .sort((a, b) => b.priority - a.priority);

            return sortedTabs.map(tab => {
              const isActive = activeTab === tab.id;
              const hasAlert = tab.hasAlert && !isActive;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.mainTabBtn,
                    hasAlert && { borderColor: tab.badgeColor, backgroundColor: (tab.badgeColor || '#ef4444') + '18' },
                    isActive && [styles.mainTabBtnActive, { backgroundColor: tab.activeBg || colors.primary, borderColor: 'transparent' }]
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  {tab.icon(isActive)}
                  <Text style={[
                    styles.mainTabText,
                    { color: isActive ? '#ffffff' : (hasAlert ? (tab.badgeColor || colors.primary) : colors.text) }
                  ]}>
                    {tab.label}
                  </Text>
                  {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                    <View style={[
                      styles.tabBadge,
                      { backgroundColor: isActive ? '#ffffff' : (tab.badgeColor || colors.primary) }
                    ]}>
                      <Text style={[
                        styles.tabBadgeText,
                        { color: isActive ? (tab.badgeColor || colors.primary) : '#ffffff' }
                      ]}>
                        {tab.badgeCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            });
          })()}
        </ScrollView>
      </View>

      {/* HAUPTINHALT MIT DYNAMISCHER TASTATURANPASSUNG WIE IM CHAT */}
      <AppKeyboardPane style={{ flex: 1 }}>
        {/* --- REITER 1: FRAGEN VERWALTEN --- */}
        {activeTab === 'questions' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.subTabBar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.subTabBtn, activeSubTab === 'list' && { borderBottomColor: colors.primary }]}
              onPress={() => {
                setActiveSubTab('list');
                handleQResetForm();
              }}
            >
              <Text style={[styles.subTabText, { color: activeSubTab === 'list' ? colors.primary : colors.textMuted }]}>
                Fragenliste ({questions.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, activeSubTab === 'form' && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveSubTab('form')}
            >
              <Text style={[styles.subTabText, { color: activeSubTab === 'form' ? colors.primary : colors.textMuted }]}>
                {editingQuestionId ? 'Frage bearbeiten' : 'Neue Frage'}
              </Text>
            </TouchableOpacity>
          </View>

          {activeSubTab === 'list' ? (
            <View style={{ flex: 1 }}>
              {/* SUCHLEISTE FÜR FRAGEN (VERHINDERT DOPPELTE FRAGEN) */}
              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: colors.background, 
                  borderRadius: RADIUS, 
                  borderWidth: 1, 
                  borderColor: colors.border, 
                  paddingHorizontal: 12,
                  height: 42
                }}>
                  <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 13, paddingVertical: 0 }}
                    placeholder="Fragen durchsuchen (Text, Antworten, Stichwort)..."
                    placeholderTextColor={colors.textMuted}
                    value={questionSearchQuery}
                    onChangeText={setQuestionSearchQuery}
                    autoCorrect={false}
                  />
                  {questionSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setQuestionSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* KATEGORIE-FILTER FÜR FRAGEN */}
              <View style={[styles.categoryFilterContainer, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterScroll}>
                  <TouchableOpacity
                    style={[
                      styles.categoryFilterChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      questionCategoryFilter === 'all' && [styles.categoryFilterChipActive, { backgroundColor: colors.primary }]
                    ]}
                    onPress={() => setQuestionCategoryFilter('all')}
                  >
                    <Text style={[
                      styles.categoryFilterText,
                      { color: colors.text },
                      questionCategoryFilter === 'all' && styles.categoryFilterTextActive
                    ]}>
                      Alle ({questions.length})
                    </Text>
                  </TouchableOpacity>

                  {categories.map((c) => {
                    const count = questions.filter(q => q.category === c.name).length;
                    const isSelected = questionCategoryFilter === c.name;
                    return (
                      <TouchableOpacity
                        key={c.name}
                        style={[
                          styles.categoryFilterChip,
                          { backgroundColor: colors.background, borderColor: colors.border },
                          isSelected && [styles.categoryFilterChipActive, { backgroundColor: colors.primary }]
                        ]}
                        onPress={() => setQuestionCategoryFilter(c.name)}
                      >
                        <Text style={[
                          styles.categoryFilterText,
                          { color: colors.text },
                          isSelected && styles.categoryFilterTextActive
                        ]}>
                          {c.name} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <ScrollView 
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                  />
                }
              >
                {(() => {
                  const query = questionSearchQuery.trim().toLowerCase();
                  const filteredQuestions = questions.filter(q => {
                    if (questionCategoryFilter !== 'all' && q.category !== questionCategoryFilter) return false;
                    if (questionVerificationFilter === 'unverified' && q.isVerified) return false;
                    if (questionVerificationFilter === 'verified' && !q.isVerified) return false;
                    if (query) {
                      const inText = (q.text || '').toLowerCase().includes(query);
                      const inExpl = (q.explanation || '').toLowerCase().includes(query);
                      const inOpts = (q.options || []).some(opt => (opt || '').toLowerCase().includes(query));
                      if (!inText && !inExpl && !inOpts) return false;
                    }
                    return true;
                  });

                  return (
                    <>
                      {/* HINWEIS: DOPPEL-CHECK */}
                      <TouchableOpacity
                        onPress={() => setActiveTab('duplicates')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: colors.cardBg,
                          borderColor: colors.border,
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          borderRadius: RADIUS,
                          marginBottom: 12
                        }}
                        activeOpacity={0.7}
                      >
                        <CopyCheck size={16} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>
                          Doppel-Check: <Text style={{ color: colors.textMuted }}>Fragen auf Duplikate & Ähnlichkeiten prüfen</Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>Prüfen →</Text>
                      </TouchableOpacity>

                      {/* FILTERLEISTE: STATUS */}
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: questionVerificationFilter === 'all' ? colors.primary : colors.cardBg, borderColor: questionVerificationFilter === 'all' ? colors.primary : colors.border }
                          ]}
                          onPress={() => setQuestionVerificationFilter('all')}
                        >
                          <Text style={[styles.filterChipText, { color: questionVerificationFilter === 'all' ? '#ffffff' : colors.text }]}>
                            Status: Alle ({questions.length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: questionVerificationFilter === 'unverified' ? '#f59e0b' : colors.cardBg, borderColor: '#f59e0b' }
                          ]}
                          onPress={() => setQuestionVerificationFilter('unverified')}
                        >
                          <Text style={[styles.filterChipText, { color: questionVerificationFilter === 'unverified' ? '#ffffff' : '#f59e0b' }]}>
                            ⏳ Ungeprüft ({questions.filter(q => !q.isVerified).length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: questionVerificationFilter === 'verified' ? '#10b981' : colors.cardBg, borderColor: '#10b981' }
                          ]}
                          onPress={() => setQuestionVerificationFilter('verified')}
                        >
                          <Text style={[styles.filterChipText, { color: questionVerificationFilter === 'verified' ? '#ffffff' : '#10b981' }]}>
                            ✓ Geprüft ({questions.filter(q => q.isVerified).length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: colors.cardBg, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 5 }
                          ]}
                          onPress={handleRefresh}
                          disabled={refreshing}
                        >
                          <RefreshCw size={12} color={colors.primary} />
                          <Text style={[styles.filterChipText, { color: colors.primary, fontSize: 11 }]}>
                            {refreshing ? 'Sync...' : 'Neu laden'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.secTitle, { color: colors.text }]}>
                        {questionSearchQuery.trim()
                          ? `Suchergebnisse (${filteredQuestions.length})`
                          : (questionCategoryFilter === 'all' 
                              ? `Gefilterte Fragen (${filteredQuestions.length})` 
                              : `${questionCategoryFilter} (${filteredQuestions.length})`)}
                      </Text>

                      {filteredQuestions.length === 0 ? (
                        <View style={styles.emptyBox}>
                          <BookOpen size={40} color={colors.textMuted} />
                          <Text style={{ color: colors.textMuted, marginTop: 8 }}>Keine Fragen für diese Filtereinstellungen gefunden.</Text>
                        </View>
                      ) : (
                        filteredQuestions.map((q) => {
                          const isAuthor = Boolean(
                            (q.createdBy && currentUser?.id && q.createdBy === currentUser.id) ||
                            (q.createdBy && currentUser?.email && q.createdBy === currentUser.email) ||
                            (q.createdByName && currentUser?.name && q.createdByName === currentUser.name) ||
                            (q.createdByName && currentUser?.email && q.createdByName === currentUser.email)
                          );
                          const isAdmin = currentUser?.role === 'admin' || Boolean(roles.find(r => r.id === currentUser?.role)?.canAccessAdmin && currentUser?.role !== 'moderator');
                          const canVerify = isAdmin || !isAuthor;

                          return (
                            <View key={q.id} style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                              <View style={styles.cardHeader}>
                                <View style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <View style={[styles.badge, { backgroundColor: colors.background }]}>
                                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>{q.category}</Text>
                                  </View>
                                  <TouchableOpacity 
                                    onPress={() => handleToggleQuestionVerification(q)}
                                    style={[
                                      styles.badge, 
                                      { 
                                        backgroundColor: q.isVerified ? '#10b98120' : '#f59e0b20', 
                                        borderColor: q.isVerified ? '#10b981' : '#f59e0b', 
                                        borderWidth: 1,
                                        opacity: (!canVerify && !q.isVerified) ? 0.75 : 1
                                      }
                                    ]}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={{ color: q.isVerified ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 'bold' }}>
                                      {q.isVerified ? '✓ Geprüft' : (!canVerify ? '⏳ Ungeprüft (4-Augen: Fremdprüfung nötig)' : '⏳ Ungeprüft (Tippen zum Freigeben)')}
                                    </Text>
                                  </TouchableOpacity>
                                  <View style={[styles.badge, { backgroundColor: colors.background }]}>
                                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{q.options.length} Optionen</Text>
                                  </View>
                                  {q.questionType === 'order' ? (
                                    <View style={[styles.badge, { backgroundColor: '#06b6d420', borderColor: '#06b6d4', borderWidth: 1 }]}>
                                      <Text style={{ color: '#06b6d4', fontSize: 11, fontWeight: 'bold' }}>🔀 Reihenfolge ({q.options.length} Schritte)</Text>
                                    </View>
                                  ) : (
                                    getQuestionCorrectIndices(q).length > 1 ? (
                                      <View style={[styles.badge, { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1 }]}>
                                        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>✨ Multiple Choice ({getQuestionCorrectIndices(q).length})</Text>
                                      </View>
                                    ) : (
                                      <View style={[styles.badge, { backgroundColor: colors.background }]}>
                                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>Single Choice</Text>
                                      </View>
                                    )
                                  )}
                                  {(q.dangerIndices?.length || q.danger_indices?.length) ? (
                                    <View style={[styles.badge, { backgroundColor: '#ef444420', borderColor: '#ef4444', borderWidth: 1 }]}>
                                      <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: 'bold' }}>⚠️ BG</Text>
                                    </View>
                                  ) : null}
                                </View>
                                <View style={[styles.headerActions, { flexShrink: 0, paddingTop: 2 }]}>
                                  <TouchableOpacity 
                                    onPress={() => handleQEditClick(q)}
                                    hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                                    style={{ padding: 4 }}
                                  >
                                    <Edit3 size={18} color={colors.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    onPress={() => handleQDeleteClick(q.id, q.text)}
                                    hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                                    style={{ padding: 4, marginLeft: 8 }}
                                  >
                                    <Trash2 size={18} color={colors.error} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                              <Text style={[styles.itemText, { color: colors.text }]}>{q.text}</Text>
                              {(() => {
                                const displayAuthor = q.createdByName || (q.createdBy && usersMap[q.createdBy]?.name);
                                const displayVerifier = q.verifiedByName || (q.verifiedBy && usersMap[q.verifiedBy]?.name);
                                if (!displayAuthor && !displayVerifier) return null;
                                return (
                                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                                    {!!displayAuthor && (
                                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                        ✍️ Erstellt von: <Text style={{ fontWeight: '600', color: colors.text }}>{displayAuthor}</Text>
                                        {q.creatorRole === 'user' ? ' (Schüler)' : (q.creatorRole === 'moderator' ? ' (Mod)' : (q.creatorRole === 'admin' ? ' (Ausbilder)' : ''))}
                                        {isAuthor ? ' (Du)' : ''}
                                      </Text>
                                    )}
                                    {!!displayVerifier && (
                                      <Text style={{ fontSize: 11, color: '#10b981' }}>
                                        🛡️ Geprüft von: <Text style={{ fontWeight: '600', color: '#10b981' }}>{displayVerifier}</Text>
                                      </Text>
                                    )}
                                  </View>
                                );
                              })()}
                            </View>
                          );
                        })
                      )}
                    </>
                  );
                })()}
              </ScrollView>
            </View>
          ) : (
            <ScrollView 
              ref={questionScrollRef}
              onScroll={onSmoothScroll}
              scrollEventThrottle={16}
              keyboardDismissMode="on-drag"
              contentContainerStyle={[styles.formContent, { paddingBottom: 280 }]} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.secTitle, { color: colors.text }]}>
                {editingQuestionId ? 'Frage bearbeiten' : 'Neue Frage anlegen'}
              </Text>

              {/* 4-AUGEN-PRINZIP STATUS / ADMIN TOGGLE */}
              {!(currentUser?.role === 'admin' || Boolean(roles.find(r => r.id === currentUser?.role)?.canAccessAdmin && currentUser?.role !== 'moderator')) ? (
                <View style={{ backgroundColor: '#f59e0b18', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Shield size={24} color="#f59e0b" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#f59e0b' }}>
                      4-Augen-Prinzip aktiv (Moderator)
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 16 }}>
                      Von Moderatoren erstellte oder geänderte Fragen werden als ungeprüft gespeichert und müssen von einem anderen Moderator oder Administrator geprüft und freigegeben werden, bevor sie für Schüler sichtbar sind.
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.checkboxRow,
                    { 
                      backgroundColor: formQIsVerified ? '#10b98118' : colors.cardBg, 
                      borderColor: formQIsVerified ? '#10b981' : colors.border,
                      marginBottom: 16,
                      marginTop: 0
                    }
                  ]}
                  onPress={() => setFormQIsVerified(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkboxBox, 
                    { 
                      borderColor: formQIsVerified ? '#10b981' : colors.border,
                      backgroundColor: formQIsVerified ? '#10b981' : 'transparent'
                    }
                  ]}>
                    {formQIsVerified && <Check size={14} color="#ffffff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: formQIsVerified ? '#10b981' : colors.text }}>
                      {formQIsVerified ? '✓ Sofort als geprüft freigeben' : '⏳ Als ungeprüft speichern (Prüfung nötig)'}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                      {formQIsVerified 
                        ? 'Die Frage wird sofort für alle Schüler im Quiz freigeschaltet.' 
                        : 'Die Frage bleibt für Schüler verborgen, bis sie freigegeben wird.'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* MODUS-AUSWAHL: KLASSISCH VS. REIHENFOLGE */}
              <Text style={[styles.formLabel, { color: colors.text, marginBottom: 6 }]}>Fragentyp / Modus *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    backgroundColor: formQType === 'classic' ? colors.primary : colors.cardBg,
                    borderWidth: 1,
                    borderColor: formQType === 'classic' ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onPress={() => setFormQType('classic')}
                >
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: formQType === 'classic' ? '#ffffff' : colors.text }}>
                    📋 Klassische Frage
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    backgroundColor: formQType === 'order' ? '#06b6d4' : colors.cardBg,
                    borderWidth: 1,
                    borderColor: formQType === 'order' ? '#06b6d4' : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 5
                  }}
                  onPress={() => setFormQType('order')}
                >
                  <Shuffle size={14} color={formQType === 'order' ? '#ffffff' : '#06b6d4'} />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: formQType === 'order' ? '#ffffff' : colors.text }}>
                    🔀 Reihenfolge-Modus
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Kategorie-Auswahl */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Themenkategorie</Text>
              <View style={styles.chipGrid}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.pickerChip,
                      { 
                        backgroundColor: formQCategory === c.name ? colors.primary : colors.cardBg,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => setFormQCategory(c.name)}
                  >
                    <Text style={{ color: formQCategory === c.name ? '#ffffff' : colors.text, fontSize: 12 }}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fragentext */}
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Fragentext *</Text>
                </View>
                <TextInput
                  style={[
                    styles.input, 
                    styles.textArea, 
                    { 
                    minHeight: 80, 
                    backgroundColor: colors.cardBg, 
                    color: colors.text, 
                    borderColor: colors.border, 
                    marginTop: 6,
                    textAlignVertical: 'top'
                  }
                ]}
                placeholder="z.B. Was ist zu tun bei Signal Zs 1?"
                placeholderTextColor={colors.textMuted}
                value={formQText}
                onChangeText={setFormQText}
                onFocus={(e) => handleInputFocus(e, questionScrollRef)}
                multiline
                scrollEnabled={false}
              />
            </View>

            {formQType === 'order' ? (
              /* REIHENFOLGE-MODUS SCHRITTE BUILDER */
              <View style={{ marginTop: 18 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: colors.text, marginBottom: 2 }]}>
                      Schritte in korrekter Reihenfolge (1 = Erster Schritt)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#06b6d4' }}>
                      Trage die Handlungen von oben nach unten ein. Schüler sehen sie automatisch gemischt.
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 10, gap: 8 }}>
                  {formQOrderSteps.map((step, sIdx) => {
                    const isFirst = sIdx === 0;
                    const isLast = sIdx === formQOrderSteps.length - 1;
                    const canDelete = formQOrderSteps.length > 2;

                    return (
                      <View 
                        key={sIdx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.cardBg,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 12,
                          padding: 8,
                          gap: 8
                        }}
                      >
                        <View style={{ padding: 2, marginRight: -2 }}>
                          <GripVertical size={16} color={colors.textMuted} />
                        </View>

                        <View style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          backgroundColor: '#06b6d4',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>{sIdx + 1}</Text>
                        </View>

                        <TextInput
                          style={{
                            flex: 1,
                            color: colors.text,
                            fontSize: 13,
                            minHeight: 38,
                            paddingVertical: 4
                          }}
                          placeholder={`Schritt ${sIdx + 1} eingeben...`}
                          placeholderTextColor={colors.textMuted}
                          value={step}
                          onChangeText={(val) => {
                            const updated = [...formQOrderSteps];
                            updated[sIdx] = val;
                            setFormQOrderSteps(updated);
                          }}
                          multiline
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <TouchableOpacity
                            disabled={isFirst}
                            onPress={() => {
                              if (isFirst) return;
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              const updated = [...formQOrderSteps];
                              const temp = updated[sIdx];
                              updated[sIdx] = updated[sIdx - 1];
                              updated[sIdx - 1] = temp;
                              setFormQOrderSteps(updated);
                            }}
                            style={{ padding: 6, opacity: isFirst ? 0.3 : 1 }}
                          >
                            <ArrowUp size={16} color={colors.text} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            disabled={isLast}
                            onPress={() => {
                              if (isLast) return;
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              const updated = [...formQOrderSteps];
                              const temp = updated[sIdx];
                              updated[sIdx] = updated[sIdx + 1];
                              updated[sIdx + 1] = temp;
                              setFormQOrderSteps(updated);
                            }}
                            style={{ padding: 6, opacity: isLast ? 0.3 : 1 }}
                          >
                            <ArrowDown size={16} color={colors.text} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            disabled={!canDelete}
                            onPress={() => {
                              if (!canDelete) return;
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              setFormQOrderSteps(prev => prev.filter((_, i) => i !== sIdx));
                            }}
                            style={{ padding: 6, opacity: canDelete ? 1 : 0.3 }}
                          >
                            <Trash2 size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {formQOrderSteps.length < 8 && (
                  <TouchableOpacity
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setFormQOrderSteps(prev => [...prev, '']);
                    }}
                    style={{
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: '#06b6d4',
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 10,
                      flexDirection: 'row',
                      gap: 6
                    }}
                  >
                    <Plus size={16} color="#06b6d4" />
                    <Text style={{ color: '#06b6d4', fontWeight: 'bold', fontSize: 12 }}>
                      Weiteren Schritt hinzufügen (max. 8)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              /* KLASSISCHER MODUS: OPTIONEN (3 BIS 6) */
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                  <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>
                    Antwortmöglichkeiten ({formQOptions.length} von 6)
                  </Text>
                  <View style={[styles.badge, { backgroundColor: formQCorrectIndices.length > 1 ? colors.primary + '20' : colors.cardBg, borderWidth: 1, borderColor: formQCorrectIndices.length > 1 ? colors.primary : colors.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: formQCorrectIndices.length > 1 ? colors.primary : colors.textMuted }}>
                      {formQCorrectIndices.length > 1 ? `✨ ${formQCorrectIndices.length} richtige Antworten` : '1 richtige Antwort'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, marginBottom: 8 }}>
                  Tippe auf die Kreise für die richtigen Antworten (1 oder mehrere) • BG = Betriebsgefährdend
                </Text>

                {formQOptions.map((opt, idx) => {
                  const optionLetter = ['A', 'B', 'C', 'D', 'E', 'F'][idx] || `${idx + 1}`;
                  const key = `opt_${idx}`;
                  return (
                    <View 
                      key={idx}
                      style={[styles.optionRow, { alignItems: 'flex-start' }]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.correctCheck,
                          { 
                            backgroundColor: formQCorrectIndices.includes(idx) ? colors.success : colors.cardBg,
                            borderColor: formQCorrectIndices.includes(idx) ? colors.success : colors.border,
                            marginTop: 8
                          }
                        ]}
                        onPress={() => toggleQCorrectIndex(idx)}
                      >
                        {formQCorrectIndices.includes(idx) ? (
                          <Check size={14} color="#ffffff" />
                        ) : (
                          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: 'bold' }}>{optionLetter}</Text>
                        )}
                      </TouchableOpacity>
                      <TextInput
                        style={[
                          styles.input, 
                          { 
                            flex: 1, 
                            minHeight: 44, 
                            backgroundColor: colors.cardBg, 
                            color: colors.text, 
                            borderColor: colors.border,
                            textAlignVertical: 'top',
                            paddingTop: 10,
                            paddingBottom: 10
                          }
                        ]}
                        placeholder={`Antwortmöglichkeit ${optionLetter}`}
                        placeholderTextColor={colors.textMuted}
                        value={opt}
                        onChangeText={(t) => handleQOptionChange(t, idx)}
                        multiline
                        scrollEnabled={false}
                        onFocus={(e) => handleInputFocus(e, questionScrollRef)}
                      />
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 7,
                          borderRadius: 8,
                          borderWidth: 1.2,
                          backgroundColor: formQDangerIndices.includes(idx) ? '#ef444425' : colors.cardBg,
                          borderColor: formQDangerIndices.includes(idx) ? '#ef4444' : colors.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          marginLeft: 6,
                          marginTop: 8
                        }}
                        onPress={() => toggleQDangerIndex(idx)}
                        activeOpacity={0.7}
                      >
                        <AlertTriangle size={13} color={formQDangerIndices.includes(idx) ? '#ef4444' : colors.textMuted} />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: formQDangerIndices.includes(idx) ? '#ef4444' : colors.textMuted }}>
                          BG
                        </Text>
                      </TouchableOpacity>
                      {formQOptions.length > 3 && (
                        <TouchableOpacity
                          style={[styles.removeOptionBtn, { borderColor: colors.border, marginLeft: 4, marginTop: 4 }]}
                          onPress={() => handleQRemoveOption(idx)}
                        >
                          <Trash2 size={15} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {/* Option hinzufügen (bis zu 6 Optionen) */}
                {formQOptions.length < 6 && (
                  <TouchableOpacity
                    style={[styles.addOptionBtn, { borderColor: colors.primary }]}
                    onPress={handleQAddOption}
                  >
                    <Plus size={16} color={colors.primary} />
                    <Text style={[styles.addOptionText, { color: colors.primary }]}>
                      Weitere Antwortmöglichkeit hinzufügen ({formQOptions.length + 1}. Option {['A', 'B', 'C', 'D', 'E', 'F'][formQOptions.length]})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

              {/* Erklärung */}
              <View>
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>Erklärung (optional)</Text>
                <TextInput
                  style={[
                    styles.input, 
                    styles.textArea, 
                    { 
                      minHeight: 70, 
                      backgroundColor: colors.cardBg, 
                      color: colors.text, 
                      borderColor: colors.border, 
                      textAlignVertical: 'top'
                    }
                  ]}
                  placeholder="Erklärung für das Lernen..."
                  placeholderTextColor={colors.textMuted}
                  value={formQExplanation}
                  onChangeText={setFormQExplanation}
                  onFocus={(e) => handleInputFocus(e, questionScrollRef)}
                  multiline
                  scrollEnabled={false}
                />
              </View>

              {/* Bild (Galerie oder URL) */}
              <View>
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>Foto / Abbildung (optional)</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { flex: 1, backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={handlePickQuestionImage}
                  >
                    <Camera size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>Foto aus Galerie wählen</Text>
                  </TouchableOpacity>
                  {formQImageUrl.trim() !== '' && (
                    <TouchableOpacity
                      style={[styles.smallActionBtn, { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}
                      onPress={() => setFormQImageUrl('')}
                    >
                      <Trash2 size={16} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 13 }}>Foto löschen</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Oder Bild-URL eingeben (https://...)"
                  placeholderTextColor={colors.textMuted}
                  value={formQImageUrl}
                  onChangeText={setFormQImageUrl}
                  onFocus={(e) => handleInputFocus(e, questionScrollRef)}
                />
              </View>

              {formQImageUrl.trim() !== '' && (
                <View style={{ alignItems: 'center', marginTop: 8, padding: 8, backgroundColor: colors.cardBg, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: formQImageUrl }} style={styles.formImgPreview} resizeMode="contain" />
                </View>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={[styles.formBtn, styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    handleQResetForm();
                    setActiveSubTab('list');
                  }}
                >
                  <X size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontWeight: 'bold' }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formBtn, styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleQSave}>
                  <Check size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* --- REITER 2: LERNKARTEN VERWALTEN --- */}
      {activeTab === 'facts' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.subTabBar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.subTabBtn, factSubTab === 'list' && { borderBottomColor: colors.primary }]}
              onPress={() => {
                setFactSubTab('list');
                handleFResetForm();
              }}
            >
              <Text style={[styles.subTabText, { color: factSubTab === 'list' ? colors.primary : colors.textMuted }]}>
                Lernkarten ({facts.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, factSubTab === 'form' && { borderBottomColor: colors.primary }]}
              onPress={() => setFactSubTab('form')}
            >
              <Text style={[styles.subTabText, { color: factSubTab === 'form' ? colors.primary : colors.textMuted }]}>
                {editingFactId ? 'Lernkarte bearbeiten' : 'Neue Lernkarte'}
              </Text>
            </TouchableOpacity>
          </View>

          {factSubTab === 'list' ? (
            <View style={{ flex: 1 }}>
              {/* SUCHLEISTE FÜR LERNKARTEN */}
              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: colors.background, 
                  borderRadius: RADIUS, 
                  borderWidth: 1, 
                  borderColor: colors.border, 
                  paddingHorizontal: 12,
                  height: 42
                }}>
                  <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 13, paddingVertical: 0 }}
                    placeholder="Lernkarten durchsuchen (Titel, Inhalt, Stichwort)..."
                    placeholderTextColor={colors.textMuted}
                    value={factSearchQuery}
                    onChangeText={setFactSearchQuery}
                    autoCorrect={false}
                  />
                  {factSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setFactSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* KATEGORIE-FILTER FÜR LERNKARTEN */}
              <View style={[styles.categoryFilterContainer, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterScroll}>
                  <TouchableOpacity
                    style={[
                      styles.categoryFilterChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      factCategoryFilter === 'all' && [styles.categoryFilterChipActive, { backgroundColor: colors.primary }]
                    ]}
                    onPress={() => setFactCategoryFilter('all')}
                  >
                    <Text style={[
                      styles.categoryFilterText,
                      { color: colors.text },
                      factCategoryFilter === 'all' && styles.categoryFilterTextActive
                    ]}>
                      Alle ({facts.length})
                    </Text>
                  </TouchableOpacity>

                  {categories.map((c) => {
                    const count = facts.filter(f => f.category === c.name).length;
                    const isSelected = factCategoryFilter === c.name;
                    return (
                      <TouchableOpacity
                        key={c.name}
                        style={[
                          styles.categoryFilterChip,
                          { backgroundColor: colors.background, borderColor: colors.border },
                          isSelected && [styles.categoryFilterChipActive, { backgroundColor: colors.primary }]
                        ]}
                        onPress={() => setFactCategoryFilter(c.name)}
                      >
                        <Text style={[
                          styles.categoryFilterText,
                          { color: colors.text },
                          isSelected && styles.categoryFilterTextActive
                        ]}>
                          {c.name} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* UNTERKATEGORIE-FILTER FÃœR LERNKARTEN */}
              {factCategoryFilter === 'Signale' && (
                <View style={[styles.categoryFilterContainer, { backgroundColor: colors.cardBg, borderBottomColor: colors.border, paddingTop: 4 }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterScroll}>
                    <TouchableOpacity
                      style={[
                        styles.categoryFilterChip,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        factSubcategoryFilter === 'all' && [styles.categoryFilterChipActive, { backgroundColor: colors.primary }]
                      ]}
                      onPress={() => { setFactSubcategoryFilter('all'); setFactDisplayLimit(40); }}
                    >
                      <Text style={[
                        styles.categoryFilterText,
                        { color: colors.text },
                        factSubcategoryFilter === 'all' && styles.categoryFilterTextActive
                      ]}>
                        Alle Untergruppen ({facts.filter(f => f.category === 'Signale').length})
                      </Text>
                    </TouchableOpacity>

                    {signalSubcategories.map((sub) => {
                      const count = facts.filter(f => f.category === 'Signale' && getFactSignalSubcategory(f) === sub.name).length;
                      const isSelected = factSubcategoryFilter === sub.name;
                      return (
                        <TouchableOpacity
                          key={sub.id || sub.name}
                          style={[
                            styles.categoryFilterChip,
                            { backgroundColor: colors.background, borderColor: colors.border },
                            isSelected && [styles.categoryFilterChipActive, { backgroundColor: colors.primary }]
                          ]}
                          onPress={() => { setFactSubcategoryFilter(sub.name); setFactDisplayLimit(40); }}
                        >
                          <Text style={[
                            styles.categoryFilterText,
                            { color: colors.text },
                            isSelected && styles.categoryFilterTextActive
                          ]}>
                            {sub.name} ({count})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <ScrollView 
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                  />
                }
              >
                {(() => {
                  const query = factSearchQuery.trim().toLowerCase();
                  const rawFiltered = facts.filter(f => {
                    if (factCategoryFilter !== 'all' && f.category !== factCategoryFilter) return false;
                    if (factCategoryFilter === 'Signale' && factSubcategoryFilter !== 'all') {
                      if (getFactSignalSubcategory(f) !== factSubcategoryFilter) return false;
                    }
                    if (factVerificationFilter === 'unverified' && f.isVerified) return false;
                    if (factVerificationFilter === 'verified' && !f.isVerified) return false;
                    if (query) {
                      const inTitle = (f.title || '').toLowerCase().includes(query);
                      const inContent = (f.content || '').toLowerCase().includes(query);
                      const inRef = (f.reference || '').toLowerCase().includes(query);
                      const inAuthor = (f.createdByName || '').toLowerCase().includes(query);
                      if (!inTitle && !inContent && !inRef && !inAuthor) return false;
                    }
                    return true;
                  });

                  // Genau so sortieren wie im Lernbereich!
                  const filteredFacts = (() => {
                    if (factCategoryFilter === 'Signale') {
                      return sortSignalFacts(rawFiltered, factSubcategoryFilter !== 'all' ? factSubcategoryFilter : undefined);
                    }
                    const catOrder = categories.map(c => c.name.toLowerCase());
                    return [...rawFiltered].sort((a, b) => {
                      const catA = (a.category || '').toLowerCase();
                      const catB = (b.category || '').toLowerCase();
                      if (catA !== catB) {
                        const idxA = catOrder.indexOf(catA);
                        const idxB = catOrder.indexOf(catB);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return catA.localeCompare(catB, 'de');
                      }
                      if (catA === 'signale') {
                        return compareSignalFacts(a, b);
                      }
                      return 0;
                    });
                  })();

                  const visibleFacts = filteredFacts.slice(0, factDisplayLimit);

                  return (
                    <>
                      {/* HINWEIS: DOPPEL-CHECK */}
                      <TouchableOpacity
                        onPress={() => setActiveTab('duplicates')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: colors.cardBg,
                          borderColor: colors.border,
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          borderRadius: RADIUS,
                          marginBottom: 12
                        }}
                        activeOpacity={0.7}
                      >
                        <CopyCheck size={16} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>
                          Doppel-Check: <Text style={{ color: colors.textMuted }}>Lernkarten auf Duplikate & Ähnlichkeiten prüfen</Text>
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>Prüfen →</Text>
                      </TouchableOpacity>

                      {/* FILTERLEISTE: STATUS */}
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: factVerificationFilter === 'all' ? colors.primary : colors.cardBg, borderColor: factVerificationFilter === 'all' ? colors.primary : colors.border }
                          ]}
                          onPress={() => { setFactVerificationFilter('all'); setFactDisplayLimit(40); }}
                        >
                          <Text style={[styles.filterChipText, { color: factVerificationFilter === 'all' ? '#ffffff' : colors.text }]}>
                            Status: Alle ({facts.length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: factVerificationFilter === 'unverified' ? '#f59e0b' : colors.cardBg, borderColor: '#f59e0b' }
                          ]}
                          onPress={() => { setFactVerificationFilter('unverified'); setFactDisplayLimit(40); }}
                        >
                          <Text style={[styles.filterChipText, { color: factVerificationFilter === 'unverified' ? '#ffffff' : '#f59e0b' }]}>
                            ⏳ Ungeprüft ({facts.filter(f => !f.isVerified).length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: factVerificationFilter === 'verified' ? '#10b981' : colors.cardBg, borderColor: '#10b981' }
                          ]}
                          onPress={() => { setFactVerificationFilter('verified'); setFactDisplayLimit(40); }}
                        >
                          <Text style={[styles.filterChipText, { color: factVerificationFilter === 'verified' ? '#ffffff' : '#10b981' }]}>
                            ✓ Geprüft ({facts.filter(f => f.isVerified).length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            { backgroundColor: colors.cardBg, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 5 }
                          ]}
                          onPress={handleRefresh}
                          disabled={refreshing}
                        >
                          <RefreshCw size={12} color={colors.primary} />
                          <Text style={[styles.filterChipText, { color: colors.primary, fontSize: 11 }]}>
                            {refreshing ? 'Sync...' : 'Neu laden'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.secTitle, { color: colors.text }]}>
                        {factSearchQuery.trim()
                          ? `Suchergebnisse (${filteredFacts.length})`
                          : (factCategoryFilter === 'all' 
                              ? `Gefilterte Lernkarten (${filteredFacts.length})` 
                              : `${factCategoryFilter} (${filteredFacts.length})`)}
                      </Text>

                      {filteredFacts.length === 0 ? (
                        <View style={styles.emptyBox}>
                          <Lightbulb size={40} color={colors.textMuted} />
                          <Text style={{ color: colors.textMuted, marginTop: 8 }}>Keine Lernkarten für diese Filtereinstellungen gefunden.</Text>
                        </View>
                      ) : (
                        <>
                          {visibleFacts.map((f) => {
                            const isAuthor = Boolean(
                              (f.createdBy && currentUser?.id && f.createdBy === currentUser.id) ||
                              (f.createdBy && currentUser?.email && f.createdBy === currentUser.email) ||
                              (f.createdByName && currentUser?.name && f.createdByName === currentUser.name) ||
                              (f.createdByName && currentUser?.email && f.createdByName === currentUser.email)
                            );
                            const isAdmin = currentUser?.role === 'admin' || Boolean(roles.find(r => r.id === currentUser?.role)?.canAccessAdmin && currentUser?.role !== 'moderator');
                            const canVerify = isAdmin || !isAuthor;

                            return (
                              <View key={f.id} style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                                <View style={styles.cardHeader}>
                                  <View style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <View style={[styles.badge, { backgroundColor: colors.background }]}>
                                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>{f.category}</Text>
                                    </View>
                                    <TouchableOpacity 
                                      onPress={() => handleToggleFactVerification(f)}
                                      style={[
                                        styles.badge, 
                                        { 
                                          backgroundColor: f.isVerified ? '#10b98120' : '#f59e0b20', 
                                          borderColor: f.isVerified ? '#10b981' : '#f59e0b', 
                                          borderWidth: 1,
                                          opacity: (!canVerify && !f.isVerified) ? 0.75 : 1
                                        }
                                      ]}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={{ color: f.isVerified ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 'bold' }}>
                                        {f.isVerified ? '✓ Geprüft' : (!canVerify ? '⏳ Ungeprüft (4-Augen: Fremdprüfung nötig)' : '⏳ Ungeprüft (Tippen zum Freigeben)')}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                  <View style={[styles.headerActions, { flexShrink: 0, paddingTop: 2 }]}>
                                    <TouchableOpacity 
                                      onPress={() => handleFEditClick(f)}
                                      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                                      style={{ padding: 4 }}
                                    >
                                      <Edit3 size={18} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                      onPress={() => handleFDeleteClick(f.id, f.title)}
                                      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                                      style={{ padding: 4, marginLeft: 8 }}
                                    >
                                      <Trash2 size={18} color={colors.error} />
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                <Text style={[styles.itemText, { color: colors.text, fontWeight: 'bold' }]}>
                                  {f.title}
                                </Text>
                                <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }} numberOfLines={3}>
                                  {f.content}
                                </Text>

                                {(() => {
                                   const images = getFactImageUrls(f);
                                   if (images.length === 0) return null;
                                   if (images.length === 1) {
                                     return (
                                       <TouchableOpacity 
                                         style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 120, backgroundColor: colors.background }}
                                         activeOpacity={0.9}
                                         onPress={() => setAdminPreviewImage(images[0])}
                                       >
                                         <Image 
                                           source={{ uri: images[0] }} 
                                           style={{ width: '100%', height: '100%' }} 
                                           resizeMode="cover" 
                                         />
                                         <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#00000080', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                           <Text style={{ color: '#fff', fontSize: 10 }}>🔍 Vergrößern</Text>
                                         </View>
                                       </TouchableOpacity>
                                     );
                                   }

                                   return (
                                     <View style={{ marginTop: 8 }}>
                                       <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: '600' }}>
                                         🖼️ {images.length} Bilder (antippen zum Vergrößern):
                                       </Text>
                                       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                         {images.map((img, idx) => (
                                           <TouchableOpacity
                                             key={idx}
                                             style={{ width: 140, height: 100, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
                                             onPress={() => setAdminPreviewImage(img)}
                                             activeOpacity={0.85}
                                           >
                                             <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                             <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: '#00000088', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                                               <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>{idx + 1}/{images.length}</Text>
                                             </View>
                                           </TouchableOpacity>
                                         ))}
                                       </ScrollView>
                                     </View>
                                   );
                                 })()}

                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                                  <Bookmark size={13} color={colors.textMuted} />
                                  <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: 'italic', flex: 1 }} numberOfLines={1}>
                                    {f.reference || 'Keine Regelwerks-Angabe'}
                                  </Text>
                                </View>

                                {(() => {
                                  const displayAuthor = f.createdByName || (f.createdBy && usersMap[f.createdBy]?.name);
                                  const displayVerifier = f.verifiedByName || (f.verifiedBy && usersMap[f.verifiedBy]?.name);
                                  if (!displayAuthor && !displayVerifier) return null;
                                  return (
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                                      {!!displayAuthor && (
                                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                          ✍️ Erstellt von: <Text style={{ fontWeight: '600', color: colors.text }}>{displayAuthor}</Text>
                                          {f.creatorRole === 'user' ? ' (Schüler)' : (f.creatorRole === 'moderator' ? ' (Mod)' : (f.creatorRole === 'admin' ? ' (Ausbilder)' : ''))}
                                          {isAuthor ? ' (Du)' : ''}
                                        </Text>
                                      )}
                                      {!!displayVerifier && (
                                        <Text style={{ fontSize: 11, color: '#10b981' }}>
                                          🛡️ Geprüft von: <Text style={{ fontWeight: '600', color: '#10b981' }}>{displayVerifier}</Text>
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })()}
                              </View>
                            );
                          })}

                          {filteredFacts.length > visibleFacts.length && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: colors.cardBg,
                                borderWidth: 1.5,
                                borderColor: colors.primary,
                                paddingVertical: 14,
                                paddingHorizontal: 20,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 12,
                                marginBottom: 24
                              }}
                              onPress={() => setFactDisplayLimit(prev => prev + 50)}
                              activeOpacity={0.7}
                            >
                              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>
                                Weitere 50 Lernkarten laden ({visibleFacts.length} von {filteredFacts.length} angezeigt)
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </ScrollView>
            </View>
          ) : (
            <ScrollView 
              ref={factScrollRef}
              onScroll={onSmoothScroll}
              scrollEventThrottle={16}
              keyboardDismissMode="on-drag"
              contentContainerStyle={[styles.formContent, { paddingBottom: 280 }]} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.secTitle, { color: colors.text }]}>
                {editingFactId ? 'Lernkarte bearbeiten' : 'Neue Lernkarte anlegen'}
              </Text>

              {/* 4-AUGEN-PRINZIP STATUS / ADMIN TOGGLE */}
              {!(currentUser?.role === 'admin' || Boolean(roles.find(r => r.id === currentUser?.role)?.canAccessAdmin && currentUser?.role !== 'moderator')) ? (
                <View style={{ backgroundColor: '#f59e0b18', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Shield size={24} color="#f59e0b" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#f59e0b' }}>
                      4-Augen-Prinzip aktiv (Moderator)
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 16 }}>
                      Von Moderatoren erstellte oder geänderte Lernkarten werden als ungeprüft gespeichert und müssen von einem anderen Moderator oder Administrator geprüft und freigegeben werden, bevor sie für Schüler sichtbar sind.
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.checkboxRow,
                    { 
                      backgroundColor: formFIsVerified ? '#10b98118' : colors.cardBg, 
                      borderColor: formFIsVerified ? '#10b981' : colors.border,
                      marginBottom: 16,
                      marginTop: 0
                    }
                  ]}
                  onPress={() => setFormFIsVerified(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkboxBox, 
                    { 
                      borderColor: formFIsVerified ? '#10b981' : colors.border,
                      backgroundColor: formFIsVerified ? '#10b981' : 'transparent'
                    }
                  ]}>
                    {formFIsVerified && <Check size={14} color="#ffffff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: formFIsVerified ? '#10b981' : colors.text }}>
                      {formFIsVerified ? '✓ Sofort als geprüft freigeben' : '⏳ Als ungeprüft speichern (Prüfung nötig)'}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                      {formFIsVerified 
                        ? 'Die Lernkarte wird sofort für alle Schüler freigeschaltet.' 
                        : 'Die Lernkarte bleibt für Schüler verborgen, bis sie freigegeben wird.'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Kategorie-Auswahl */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Themenkategorie</Text>
              <View style={styles.chipGrid}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.pickerChip,
                      {
                        backgroundColor: formFCategory === c.name ? colors.primary : colors.cardBg,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => setFormFCategory(c.name)}
                  >
                    <Text style={{ color: formFCategory === c.name ? '#ffffff' : colors.text, fontSize: 12 }}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Signal-Unterkategorie (nur wenn Kategorie "Signale" ist) */}
              {formFCategory === 'Signale' && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Signalgruppe (Unterkategorie)</Text>
                  <View style={styles.chipGrid}>
                    {signalSubcategories.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.pickerChip,
                          {
                            backgroundColor: formFSubcategory === s.name ? colors.primary : colors.cardBg,
                            borderColor: colors.border
                          }
                        ]}
                        onPress={() => setFormFSubcategory(s.name)}
                      >
                        <Text style={{ color: formFSubcategory === s.name ? '#ffffff' : colors.text, fontSize: 12 }}>
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Titel */}
              <View>
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>Titel / Stichwort</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="z.B. Prüfstufen der Wagenprüfung"
                  placeholderTextColor={colors.textMuted}
                  value={formFTitle}
                  onChangeText={setFormFTitle}
                  onFocus={(e) => handleInputFocus(e, factScrollRef)}
                />
              </View>

              {/* Inhalt */}
              <View>
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>Inhalt / Fachwissen</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Detaillierte Fachinformation zum Lernen..."
                  placeholderTextColor={colors.textMuted}
                  value={formFContent}
                  onChangeText={setFormFContent}
                  onFocus={(e) => handleInputFocus(e, factScrollRef)}
                  multiline
                  scrollEnabled={false}
                />
              </View>

              {/* Regelwerks-Referenz */}
              <View>
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Regelwerks-Quelle</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="z.B. VDV-Schrift 758 / VDV-Schrift 757 / Ril 301"
                  placeholderTextColor={colors.textMuted}
                  value={formFReference}
                  onChangeText={setFormFReference}
                  onFocus={(e) => handleInputFocus(e, factScrollRef)}
                />
              </View>

              {/* Fotos / Abbildungen (mehrere Bilder möglich) */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 4 }}>
                  <Text style={[styles.formLabel, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>
                    Fotos / Abbildungen ({formFImageUrls.length})
                  </Text>
                  {formFImageUrls.length > 0 && (
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      Mehrere Bilder möglich
                    </Text>
                  )}
                </View>

                {/* AKTIONEN: FOTO AUS GALERIE ODER URL */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { flex: 1, backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={handlePickFactImage}
                  >
                    <Camera size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                      + Fotos aus Galerie wählen
                    </Text>
                  </TouchableOpacity>
                  {formFImageUrls.length > 0 && (
                    <TouchableOpacity
                      style={[styles.smallActionBtn, { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}
                      onPress={() => {
                        setFormFImageUrls([]);
                        setFormFImageUrl('');
                      }}
                    >
                      <Trash2 size={16} color="#ef4444" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 13 }}>Alle löschen</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* URL EINGABE MIT HINZUFÜGEN-BUTTON */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border, marginBottom: 0 }]}
                    placeholder="Oder Bild-URL einfügen (https://...)"
                    placeholderTextColor={colors.textMuted}
                    value={newFactImageUrlInput}
                    onChangeText={setNewFactImageUrlInput}
                    onSubmitEditing={handleAddFactImageUrl}
                    onFocus={(e) => handleInputFocus(e, factScrollRef)}
                  />
                  {newFactImageUrlInput.trim() !== '' && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.primary,
                        height: 44,
                        paddingHorizontal: 14,
                        borderRadius: RADIUS,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onPress={handleAddFactImageUrl}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>+ Hinzufügen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* BILDER-VORSCHAU / GALERIE IM FORMULAR */}
              {formFImageUrls.length > 0 && (
                <View style={{ marginTop: 10, marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                    Ausgewählte Bilder ({formFImageUrls.length}):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {formFImageUrls.map((url, idx) => {
                      const isPrimary = idx === 0;
                      return (
                        <View 
                          key={idx}
                          style={{
                            width: 170,
                            backgroundColor: colors.cardBg,
                            borderRadius: RADIUS,
                            borderWidth: 1.5,
                            borderColor: isPrimary ? colors.primary : colors.border,
                            overflow: 'hidden',
                            padding: 6
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => setAdminPreviewImage(url)}
                            style={{ width: '100%', height: 110, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.background }}
                          >
                            <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: isPrimary ? colors.primary : '#00000088', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>
                                {isPrimary ? '★ Hauptbild' : `Bild ${idx + 1}`}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 4 }}>
                            {!isPrimary ? (
                              <TouchableOpacity
                                style={{ flex: 1, backgroundColor: colors.primary + '18', paddingVertical: 4, borderRadius: 4, alignItems: 'center' }}
                                onPress={() => handleSetPrimaryFactImage(idx)}
                              >
                                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>Als Hauptbild</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, color: colors.primary, fontWeight: 'bold' }}>Titelbild</Text>
                              </View>
                            )}
                            <TouchableOpacity
                              style={{ backgroundColor: '#ef444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}
                              onPress={() => handleRemoveFactImage(idx)}
                            >
                              <Trash2 size={12} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={[styles.formBtn, styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    handleFResetForm();
                    setFactSubTab('list');
                  }}
                >
                  <X size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontWeight: 'bold' }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formBtn, styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleFSave}>
                  <Check size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* --- REITER 3: KATEGORIEN VERWALTEN (NUR ADMIN) --- */}
      {activeTab === 'categories' && currentUser?.role === 'admin' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.subTabBar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.subTabBtn, catSubTab === 'list' && { borderBottomColor: colors.primary }]}
              onPress={() => {
                setCatSubTab('list');
                handleCatResetForm();
              }}
            >
              <Text style={[styles.subTabText, { color: catSubTab === 'list' ? colors.primary : colors.textMuted }]}>
                Kategorienliste
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, catSubTab === 'form' && { borderBottomColor: colors.primary }]}
              onPress={() => setCatSubTab('form')}
            >
              <Text numberOfLines={1} style={[styles.subTabText, { color: catSubTab === 'form' ? colors.primary : colors.textMuted }]}>
                {editingCatName ? 'Bearbeiten' : 'Neu'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, catSubTab === 'signal_subcategories' && { borderBottomColor: colors.primary }]}
              onPress={() => setCatSubTab('signal_subcategories')}
            >
              <Text numberOfLines={1} style={[styles.subTabText, { color: catSubTab === 'signal_subcategories' ? colors.primary : colors.textMuted }]}>
                Signalgruppen
              </Text>
            </TouchableOpacity>
          </View>

          {catSubTab === 'list' && (
            <ScrollView 
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.scrollContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.secTitle, { color: colors.text }]}>Verfügbare Kategorien ({categories.length})</Text>
              {categories.map((c) => (
                <View key={c.name} style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.row, { flex: 1, marginRight: 8, alignItems: 'center' }]}>
                      <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: c.imageUrl ? 'transparent' : `${c.color}22`, alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' }}>
                        <CategoryIcon icon={c.icon} imageUrl={c.imageUrl} size={c.imageUrl ? 38 : 20} color={c.color} style={c.imageUrl ? { width: '100%', height: '100%' } : undefined} />
                      </View>
                      <Text style={[styles.itemTitle, { color: colors.text, flex: 1, marginLeft: 0 }]} numberOfLines={1}>{c.name}</Text>
                    </View>
                    <View style={[styles.headerActions, { flexShrink: 0, paddingTop: 2 }]}>
                      <TouchableOpacity 
                        onPress={() => handleCatEditClick(c)}
                        hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                        style={{ padding: 4 }}
                      >
                        <Edit3 size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleCatDeleteClick(c.name)}
                        hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                        style={{ padding: 4, marginLeft: 8 }}
                      >
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.itemDescText, { color: colors.textMuted }]}>{c.desc}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                    <CategoryIcon icon={c.icon} imageUrl={c.imageUrl} size={14} color={c.color} />
                    <Text style={{ fontSize: 12, color: c.color, fontWeight: '600' }}>
                      {c.icon}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {catSubTab === 'form' && (
            // KATEGORIEN FORMULAR
            <ScrollView 
              ref={catScrollRef}
              onScroll={onSmoothScroll}
              scrollEventThrottle={16}
              keyboardDismissMode="on-drag"
              contentContainerStyle={[styles.formContent, { paddingBottom: 280 }]} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.secTitle, { color: colors.text }]}>
                {editingCatName ? 'Kategorie bearbeiten' : 'Kategorie erstellen'}
              </Text>

              {/* Name */}
              <View>
                <Text style={[styles.formLabel, { color: colors.text }]}>Kategoriename (z.B. Signale)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Name eingeben..."
                  placeholderTextColor={colors.textMuted}
                  value={formCatName}
                  onChangeText={setFormCatName}
                  onFocus={(e) => handleInputFocus(e, catScrollRef)}
                />
              </View>

              {/* Beschreibung */}
              <View>
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>Beschreibung</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Kurze Beschreibung für die Hauptliste..."
                  placeholderTextColor={colors.textMuted}
                  value={formCatDesc}
                  onChangeText={setFormCatDesc}
                  onFocus={(e) => handleInputFocus(e, catScrollRef)}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Farb-Auswahl */}
              <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>Design-Farbe</Text>
              <View style={styles.colorSelectorRow}>
                {PRESET_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorBadge, 
                      { backgroundColor: color, borderColor: formCatColor === color ? colors.text : 'transparent' }
                    ]}
                    onPress={() => setFormCatColor(color)}
                  >
                    {formCatColor === color && <Check size={16} color="#ffffff" />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* KATEGORIE-BILD / SYMBOL (FOTO-BIBLIOTHEK & 9 BAHN-SYMBOLE) */}
              <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>Kategorie-Bild & Symbol</Text>
              <View style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: colors.border, marginTop: 4, padding: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={[styles.selectedIconCircle, { backgroundColor: formCatImageUrl ? 'transparent' : formCatColor, width: 56, height: 56, borderRadius: 12, overflow: 'hidden' }]}>
                    <CategoryIcon icon={formCatIcon} imageUrl={formCatImageUrl} size={formCatImageUrl ? 56 : 30} color="#ffffff" style={formCatImageUrl ? { width: '100%', height: '100%' } : undefined} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>AKTIVES BILD / SYMBOL</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginTop: 2 }} numberOfLines={1}>
                      {formCatImageUrl ? (formCatImageUrl.startsWith('asset:') ? formCatImageUrl.replace('asset:', '').toUpperCase() : 'Eigenes Foto / Upload') : formCatIcon}
                    </Text>
                    {!!formCatImageUrl && (
                      <TouchableOpacity onPress={() => setFormCatImageUrl('')} style={{ marginTop: 4 }}>
                        <Text style={{ fontSize: 12, color: colors.error, fontWeight: '600' }}>Bild entfernen (auf Vektoricon zurÃ¼cksetzen)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primary,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginBottom: 12
                  }}
                  onPress={handlePickCatImage}
                  disabled={pickingCatImage}
                >
                  <Camera size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                    {pickingCatImage ? 'Wird optimiert...' : 'Aus Foto-Bibliothek wÃ¤hlen'}
                  </Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8 }}>
                  ODER AUS DEN 9 OFFIZIELLEN BAHN-SYMBOLEN WÃ„HLEN:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {PRESET_CATEGORY_SYMBOLS.map((sym) => {
                    const isSelected = formCatImageUrl === sym.id;
                    return (
                      <TouchableOpacity
                        key={sym.id}
                        style={{
                          alignItems: 'center',
                          padding: 6,
                          borderRadius: 8,
                          backgroundColor: isSelected ? `${formCatColor}25` : colors.background,
                          borderColor: isSelected ? formCatColor : colors.border,
                          borderWidth: isSelected ? 2 : 1,
                          width: 78
                        }}
                        onPress={() => {
                          setFormCatImageUrl(sym.id);
                          setFormCatIcon(sym.name);
                        }}
                      >
                        <View style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                          <CategoryIcon icon={sym.id} size={52} style={{ width: '100%', height: '100%' }} />
                        </View>
                        <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: isSelected ? '700' : '500', color: isSelected ? colors.text : colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                          {sym.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Icon-Auswahl */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Kategorie-Symbol</Text>
                <TouchableOpacity
                  style={[styles.addCustomIconHeaderBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
                  onPress={() => setShowAddIconModal(true)}
                >
                  <Plus size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginLeft: 4 }}>
                    + Eigenes Symbol
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Aktuell gewähltes Icon Preview */}
              <View style={[styles.selectedIconCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={[styles.selectedIconCircle, { backgroundColor: formCatColor }]}>
                  <CategoryIcon icon={formCatIcon} size={24} color="#ffffff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.5 }}>AUSGEWÄHLTES SYMBOL</Text>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, marginTop: 2 }}>{formCatIcon}</Text>
                </View>
              </View>

              {/* Tabs */}
              <View style={styles.iconFilterTabsRow}>
                <TouchableOpacity 
                  style={[styles.iconFilterTab, iconPickerTab === 'railway' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setIconPickerTab('railway')}
                >
                  <Text style={[styles.iconFilterTabText, { color: iconPickerTab === 'railway' ? '#ffffff' : colors.text }]}>
                    🚂 Eisenbahn ({RAILWAY_ICONS_DEF.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.iconFilterTab, iconPickerTab === 'popular' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setIconPickerTab('popular')}
                >
                  <Text style={[styles.iconFilterTabText, { color: iconPickerTab === 'popular' ? '#ffffff' : colors.text }]}>
                    💡 Allgemein
                  </Text>
                </TouchableOpacity>
                {customIcons.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.iconFilterTab, iconPickerTab === 'custom' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setIconPickerTab('custom')}
                  >
                    <Text style={[styles.iconFilterTabText, { color: iconPickerTab === 'custom' ? '#ffffff' : colors.text }]}>
                      ⭐ Eigene ({customIcons.length})
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.iconFilterTab, iconPickerTab === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setIconPickerTab('all')}
                >
                  <Text style={[styles.iconFilterTabText, { color: iconPickerTab === 'all' ? '#ffffff' : colors.text }]}>
                    Alle
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Icon Grid */}
              <View style={styles.iconGridContainer}>
                {displayedIcons.map((item) => {
                  const isSelected = formCatIcon.toLowerCase() === item.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.iconTile,
                        { 
                          backgroundColor: isSelected ? `${formCatColor}20` : colors.cardBg,
                          borderColor: isSelected ? formCatColor : colors.border,
                          borderWidth: isSelected ? 2 : 1
                        }
                      ]}
                      onPress={() => setFormCatIcon(item.name)}
                    >
                      <View style={[styles.iconTileInner, isSelected && { transform: [{ scale: 1.08 }] }]}>
                        <CategoryIcon 
                          icon={item.name} 
                          size={24} 
                          color={isSelected ? formCatColor : colors.text} 
                        />
                      </View>
                      <Text 
                        style={[
                          styles.iconTileLabel, 
                          { color: isSelected ? colors.text : colors.textMuted, fontWeight: isSelected ? '700' : '500' }
                        ]} 
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {item.isCustom && (item as any).item && (
                        <TouchableOpacity 
                          style={styles.deleteCustomIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomIcon((item as any).item);
                          }}
                        >
                          <Trash2 size={11} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity 
                  style={[styles.formBtn, styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    handleCatResetForm();
                    setCatSubTab('list');
                  }}
                >
                  <X size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontWeight: 'bold' }}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formBtn, styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleCatSave}>
                  <Check size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {catSubTab === 'signal_subcategories' && (
            <ScrollView 
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.scrollContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.secTitle, { color: colors.text }]}>
                Signalgruppen verwalten
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
                Lege hier Signalgruppen (Unterkategorien) fÃ¼r Signale fest (z.B. Hauptsignale, Zusatzsignale, Rangiersignale). Unterkategorien und deren Bilder kÃ¶nnen hier jederzeit bearbeitet oder neu angelegt werden.
              </Text>

              {/* UNTERKATEGORIE ERSTELLEN ODER BEARBEITEN */}
              <View style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: editingSubcatId ? colors.primary : colors.border, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.formLabel, { color: colors.text, marginTop: 0 }]}>
                    {editingSubcatId ? 'Signalgruppe bearbeiten' : 'Neue Signalgruppe hinzufÃ¼gen'}
                  </Text>
                  {editingSubcatId && (
                    <TouchableOpacity onPress={handleCancelEditSignalSubcategory} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold' }}>Abbrechen</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                  placeholder="Name (z.B. Hauptsignale, Rangiersignale, ETCS)"
                  placeholderTextColor={colors.textMuted}
                  value={newSigSubName}
                  onChangeText={setNewSigSubName}
                />

                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                  placeholder="Beschreibung (optional, z.B. Signale fÃ¼r Rangierfahrten)"
                  placeholderTextColor={colors.textMuted}
                  value={newSigSubDesc}
                  onChangeText={setNewSigSubDesc}
                />

                {/* Bild-Auswahl fÃ¼r Unterkategorie */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: subcatImageUrl ? 'transparent' : colors.background, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <CategoryIcon icon="Bookmark" imageUrl={subcatImageUrl} size={subcatImageUrl ? 44 : 24} color={colors.primary} style={subcatImageUrl ? { width: '100%', height: '100%' } : undefined} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primary + '18',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: colors.primary + '35'
                      }}
                      onPress={handlePickSubcatImage}
                      disabled={pickingSubcatImage}
                    >
                      <ImageIcon size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                        {pickingSubcatImage ? 'Wird geladen...' : 'Bild aus Foto-Bibliothek'}
                      </Text>
                    </TouchableOpacity>
                    {!!subcatImageUrl && (
                      <TouchableOpacity onPress={() => setSubcatImageUrl('')} style={{ alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: 11, color: colors.error }}>Bild entfernen</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.formBtn, styles.saveBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                  onPress={handleSaveSignalSubcategory}
                >
                  <Check size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>
                    {editingSubcatId ? 'Ã„nderungen speichern' : 'Unterkategorie anlegen'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* LISTE DER UNTERKATEGORIEN */}
              <Text style={[styles.secTitle, { color: colors.text }]}>
                Vorhandene Unterkategorien ({signalSubcategories.length})
              </Text>

              {signalSubcategories.length === 0 ? (
                <View style={[styles.emptyBox, { paddingVertical: 24 }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>
                    Noch keine Signal-Unterkategorien angelegt.
                  </Text>
                </View>
              ) : (
                signalSubcategories.map((sub) => {
                  const assignedCount = facts.filter(
                    f => f.category === 'Signale' && getFactSignalSubcategory(f) === sub.name
                  ).length;

                  return (
                    <View 
                      key={sub.id || sub.name} 
                      style={[styles.itemCard, { backgroundColor: colors.cardBg, borderColor: colors.border, marginBottom: 10 }]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={[styles.row, { flex: 1, marginRight: 8, alignItems: 'center' }]}>
                          <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: sub.imageUrl ? 'transparent' : `${sub.color || colors.primary}22`, alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' }}>
                            <CategoryIcon icon={sub.icon || 'Bookmark'} imageUrl={sub.imageUrl} size={sub.imageUrl ? 38 : 20} color={sub.color || colors.primary} style={sub.imageUrl ? { width: '100%', height: '100%' } : undefined} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={[styles.itemTitle, { color: colors.text, marginLeft: 0 }]}>
                                {sub.name}
                              </Text>
                              <View style={{
                                backgroundColor: colors.primary + '18',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                                  {assignedCount} {assignedCount === 1 ? 'Signal' : 'Signale'}
                                </Text>
                              </View>
                            </View>
                            {!!sub.desc && (
                              <Text style={[styles.itemDescText, { color: colors.textMuted, marginTop: 4 }]}>
                                {sub.desc}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={[styles.headerActions, { flexShrink: 0, paddingTop: 2 }]}>
                          <TouchableOpacity 
                            onPress={() => handleEditSignalSubcategory(sub)}
                            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                            style={{ padding: 4 }}
                          >
                            <Edit3 size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteSignalSubcategory(sub)}
                            hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                            style={{ padding: 4, marginLeft: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Unterkategorie ${sub.name} lÃ¶schen`}
                          >
                            <Trash2 size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* --- REITER 4: BENUTZER & ROLLEN VERWALTEN (NUR ADMIN) --- */}
      {activeTab === 'users' && currentUser?.role === 'admin' && (
        <View style={{ flex: 1 }}>
          {/* UNTERREITER: BENUTZER VS ROLLEN */}
          <View style={[styles.subTabsContainer, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.subTabBtn, userSubTab === 'users' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setUserSubTab('users')}
            >
              <Users size={16} color={userSubTab === 'users' ? colors.primary : colors.textMuted} />
              <Text style={[styles.subTabText, { color: userSubTab === 'users' ? colors.primary : colors.textMuted, fontWeight: userSubTab === 'users' ? 'bold' : 'normal' }]}>
                Benutzer ({users.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.subTabBtn, userSubTab === 'roles' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setUserSubTab('roles')}
            >
              <ShieldCheck size={16} color={userSubTab === 'roles' ? colors.primary : colors.textMuted} />
              <Text style={[styles.subTabText, { color: userSubTab === 'roles' ? colors.primary : colors.textMuted, fontWeight: userSubTab === 'roles' ? 'bold' : 'normal' }]}>
                Rollen ({roles.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.subTabBtn, userSubTab === 'webkeys' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setUserSubTab('webkeys')}
            >
              <KeyRound size={16} color={userSubTab === 'webkeys' ? colors.primary : colors.textMuted} />
              <Text style={[styles.subTabText, { color: userSubTab === 'webkeys' ? colors.primary : colors.textMuted, fontWeight: userSubTab === 'webkeys' ? 'bold' : 'normal' }]}>
                Web-Keys ({webKeysList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {userSubTab === 'users' && (
            <ScrollView 
              ref={userScrollRef}
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.scrollContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.secTitle, { color: colors.text }]}>Eingetragene Benutzer ({users.length})</Text>

              {/* SUCHE-INPUT BENUTZER */}
              <View style={[styles.searchBox, { backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: colors.border }]}>
                <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Benutzer suchen (Name, E-Mail, Rolle, Titel) …"
                  placeholderTextColor={colors.textMuted}
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                  clearButtonMode="while-editing"
                />
                {userSearchQuery.trim().length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setUserSearchQuery('')} 
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Suche leeren"
                  >
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {userSearchQuery.trim().length > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'Benutzer gefunden' : 'Benutzer gefunden'}
                  </Text>
                  <TouchableOpacity onPress={() => setUserSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>Suche leeren</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* HINWEIS-BANNER FÜR BENUTZER, DIE AUF WEB-FREISCHALTUNG WARTEN */}
              {(() => {
                const waitingList = Array.isArray(users) ? users.filter(u => u && mockDb.isUserWaitingForWebUnlock(u) && !mockDb.isUserWebUnlocked(u, roles)) : [];
                if (waitingList.length === 0) return null;
                return (
                  <View style={{
                    backgroundColor: isDark ? '#451a0360' : '#fffbeb',
                    borderColor: isDark ? '#d97706' : '#f59e0b',
                    borderWidth: 1.5,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Text style={{ fontSize: 16 }}>⏳</Text>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: isDark ? '#fbbf24' : '#b45309', flex: 1 }}>
                        {waitingList.length === 1 
                          ? '1 Benutzer wartet auf Web-Freischaltung!' 
                          : `${waitingList.length} Benutzer warten auf Web-Freischaltung!`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.text, marginBottom: 10 }}>
                      Die folgenden Benutzer haben gezahlt oder eine Web-Freischaltung angefordert:
                    </Text>
                    {waitingList.map(wu => {
                      if (!wu) return null;
                      return (
                        <View key={wu.id} style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isDark ? '#d97706' : '#fcd34d',
                          marginBottom: 6,
                          gap: 8,
                        }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>{wu.name || 'Benutzer'}</Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>{wu.email || ''}</Text>
                          </View>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#10b981',
                              paddingVertical: 6,
                              paddingHorizontal: 12,
                              borderRadius: 6,
                            }}
                            onPress={() => handleToggleWebAccess(wu.id, wu.name, false)}
                            activeOpacity={0.8}
                          >
                            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
                              🔓 Jetzt freischalten
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}

              {filteredUsers.length === 0 ? (
                <View style={[styles.emptyBox, { paddingVertical: 40 }]}>
                  <Users size={36} color={colors.textMuted} />
                  <Text style={{ color: colors.text, marginTop: 12, fontWeight: '600', fontSize: 15 }}>
                    {userSearchQuery.trim() ? `Keine Benutzer für „${userSearchQuery}“ gefunden` : 'Keine Benutzer vorhanden'}
                  </Text>
                </View>
              ) : (
                filteredUsers.map((u) => {
                  if (!u) return null;
                  const isMe = u.id === currentUser?.id;
                  const userRoleDef = Array.isArray(roles) ? roles.find(r => r && r.id === u.role) : undefined;
                  const roleName = userRoleDef?.name || u.role || 'Benutzer';
                  const roleColor = userRoleDef?.color || '#3b82f6';
                  const isWaiting = mockDb.isUserWaitingForWebUnlock(u) && !mockDb.isUserWebUnlocked(u, roles);
                  const isWebUnlocked = mockDb.isUserWebUnlocked(u, roles);

                  return (
                    <TouchableOpacity 
                      key={u.id} 
                      style={[
                        styles.userRowItem, 
                        { 
                          backgroundColor: isWaiting ? (isDark ? '#451a0325' : '#fffbeb') : colors.cardBg, 
                          borderColor: isWaiting ? '#f59e0b' : colors.border,
                          borderWidth: isWaiting ? 1.5 : 1,
                        }
                      ]}
                      onPress={() => setSelectedUserForMenu(u)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <View style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: roleColor + '20',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {u.avatarUrl && isImgUri(u.avatarUrl) ? (
                            <Image source={{ uri: u.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Text style={{ fontSize: 18 }}>{u.avatarUrl || '👤'}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text numberOfLines={1} style={[styles.userName, { color: colors.text, fontSize: 15, fontWeight: '600' }]}>
                              {u.name || 'Benutzer'}
                            </Text>
                            {isMe && (
                              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>(Du)</Text>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                            {u.title ? (
                              <Text numberOfLines={1} style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>
                                {u.title}
                              </Text>
                            ) : null}
                            {isWaiting ? (
                              <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: 'bold' }}>⏳ Wartet auf Web</Text>
                            ) : isWebUnlocked ? (
                              <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '500' }}>🖥️ Web</Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[
                          styles.roleBadge, 
                          { 
                            backgroundColor: roleColor + '20',
                            borderColor: roleColor,
                            borderWidth: 1,
                          }
                        ]}>
                          <Text style={{ 
                            fontSize: 11, 
                            fontWeight: 'bold',
                            color: roleColor
                          }}>
                            {roleName.toUpperCase()}
                          </Text>
                        </View>

                        <TouchableOpacity
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          onPress={() => setSelectedUserForMenu(u)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: colors.background,
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Menü für ${u.name || 'Benutzer'} öffnen`}
                        >
                          <EllipsisVertical size={18} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* USER DETAIL MODAL (3-PUNKTE MENÜ IM NEUEN DESIGN) */}
          {activeUserInMenu && (() => {
            const activeUserRoleDef = Array.isArray(roles) ? roles.find(r => r && r.id === activeUserInMenu.role) : undefined;
            const activeUserRoleName = activeUserRoleDef?.name || activeUserInMenu.role || 'Benutzer';
            const activeUserRoleColor = activeUserRoleDef?.color || '#3b82f6';

            return (
              <Modal
                visible={!!activeUserInMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedUserForMenu(null)}
              >
                <View style={styles.modalOverlay}>
                  <Pressable 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => setSelectedUserForMenu(null)} 
                  />
                  <View style={[
                    styles.userModalContainer, 
                    { 
                      backgroundColor: colors.cardBg, 
                      borderColor: colors.border,
                      maxWidth: CONTENT_MAX_WIDTH,
                    }
                  ]}>
                    {/* Modal Header */}
                    <View style={[styles.userModalHeader, { borderBottomColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: activeUserRoleColor + '20',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {activeUserInMenu.avatarUrl && isImgUri(activeUserInMenu.avatarUrl) ? (
                            <Image source={{ uri: activeUserInMenu.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Text style={{ fontSize: 20 }}>{activeUserInMenu.avatarUrl || '👤'}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                            {activeUserInMenu.name || 'Benutzer'}
                          </Text>
                          <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textMuted }}>
                            {activeUserInMenu.email || ''}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedUserForMenu(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: colors.background
                        }}
                      >
                        <X size={18} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    {/* Modal Scroll Content */}
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ padding: 16, gap: 14 }}
                    >
                      {/* Status & Badges */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <View style={[styles.roleBadge, { 
                          backgroundColor: activeUserRoleColor + '20',
                          borderColor: activeUserRoleColor,
                          borderWidth: 1,
                        }]}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: activeUserRoleColor }}>
                            {activeUserRoleName.toUpperCase()}
                          </Text>
                        </View>

                        {activeUserInMenu.title ? (
                          <View style={{ backgroundColor: colors.primary + '18', borderColor: colors.primary, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>Titel: {activeUserInMenu.title}</Text>
                          </View>
                        ) : null}

                        {mockDb.isUserWebUnlocked(activeUserInMenu, roles) ? (
                          <View style={{ backgroundColor: isDark ? '#064e3b' : '#dcfce7', borderColor: '#10b981', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 11, color: '#10b981', fontWeight: 'bold' }}>🖥️ Web freigeschaltet</Text>
                          </View>
                        ) : mockDb.isUserWaitingForWebUnlock(activeUserInMenu) ? (
                          <View style={{ backgroundColor: isDark ? '#78350f' : '#fef3c7', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 11, color: isDark ? '#fef08a' : '#b45309', fontWeight: 'bold' }}>⏳ Wartet auf Freischaltung</Text>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>🖥️ Kein Web-Zugang</Text>
                          </View>
                        )}
                      </View>

                      {/* ROLLE ÄNDERN */}
                      {activeUserInMenu.id !== currentUser?.id && (
                        <View style={[styles.modalSectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Rolle zuweisen</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              {Array.isArray(roles) && roles.map(r => {
                                if (!r) return null;
                                const isCurrentRole = activeUserInMenu.role === r.id;
                                return (
                                  <TouchableOpacity
                                    key={r.id}
                                    style={[
                                      styles.roleBtn,
                                      {
                                        backgroundColor: isCurrentRole ? r.color : colors.cardBg,
                                        borderColor: isCurrentRole ? r.color : colors.border,
                                        borderWidth: 1,
                                        paddingHorizontal: 12,
                                        paddingVertical: 7,
                                      }
                                    ]}
                                    onPress={() => handleUserRoleChange(activeUserInMenu.id, activeUserInMenu, r.id)}
                                  >
                                    <Text style={[
                                      styles.roleBtnText,
                                      { color: isCurrentRole ? '#ffffff' : colors.text, fontWeight: isCurrentRole ? 'bold' : 'normal' }
                                    ]}>
                                      {r.name || r.id}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                      {/* NAME & TITEL ANPASSEN */}
                      <View style={[styles.modalSectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Name & Titel anpassen</Text>
                        
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Name:</Text>
                          <UserNameEditor user={activeUserInMenu} colors={colors} onSave={(val) => handleSaveUserName(activeUserInMenu.id, val)} />
                        </View>

                        <View style={{ marginTop: 12 }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Titel (z. B. Tf-Ausbilder):</Text>
                          <UserTitleEditor user={activeUserInMenu} colors={colors} onSave={(val) => handleSaveUserTitle(activeUserInMenu.id, val)} />
                        </View>
                      </View>

                      {/* PASSWORT-RESET */}
                      <View style={[styles.modalSectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Passwort zurücksetzen</Text>
                            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                              Setzt das Kennwort auf „railtrainer“ zurück.
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#f59e0b',
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: RADIUS,
                              gap: 6
                            }}
                            onPress={() => handleAdminResetPassword(activeUserInMenu.id, activeUserInMenu.name)}
                          >
                            <KeyRound size={14} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                              Zurücksetzen
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* CHAT-MODERATION */}
                      {activeUserInMenu.id !== currentUser?.id && (
                        <View style={[styles.modalSectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Chat-Moderation</Text>
                            {(() => {
                              const ban = chatBans.find(b => b.targetUserId === activeUserInMenu.id);
                              const isRestricted = ban && (ban.type === 'permanent' || (ban.type === 'timeout_1d' && (!ban.timeoutUntil || Date.now() < ban.timeoutUntil)));
                              if (!isRestricted) {
                                return <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 'bold' }}>🟢 Aktiv</Text>;
                              }
                              if (ban.type === 'timeout_1d') {
                                return <Text style={{ fontSize: 12, color: '#f59e0b', fontWeight: 'bold' }}>⏱️ 24h Timeout</Text>;
                              }
                              return <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold' }}>🚫 Gebannt</Text>;
                            })()}
                          </View>

                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {(() => {
                              const ban = chatBans.find(b => b.targetUserId === activeUserInMenu.id);
                              const isRestricted = ban && (ban.type === 'permanent' || (ban.type === 'timeout_1d' && (!ban.timeoutUntil || Date.now() < ban.timeoutUntil)));
                              if (isRestricted) {
                                return (
                                  <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#10b981', paddingVertical: 8, borderRadius: RADIUS, alignItems: 'center', justifyContent: 'center' }}
                                    onPress={() => handleUnbanUser(activeUserInMenu.id, activeUserInMenu.name)}
                                  >
                                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>🟢 Sperre aufheben</Text>
                                  </TouchableOpacity>
                                );
                              }
                              return (
                                <>
                                  <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#f59e0b', paddingVertical: 8, borderRadius: RADIUS, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}
                                    onPress={() => handleTimeoutUser(activeUserInMenu.id, activeUserInMenu.name)}
                                  >
                                    <Clock size={13} color="#ffffff" />
                                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>1 Tag Timeout</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: 8, borderRadius: RADIUS, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}
                                    onPress={() => handleBanUser(activeUserInMenu.id, activeUserInMenu.name)}
                                  >
                                    <Ban size={13} color="#ffffff" />
                                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Chat-Bann</Text>
                                  </TouchableOpacity>
                                </>
                              );
                            })()}
                          </View>
                        </View>
                      )}

                      {/* WEB-FREISCHALTUNG */}
                      {activeUserInMenu.id !== currentUser?.id && (
                        <View style={[styles.modalSectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Web-Plattform (4,99 €)</Text>
                              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                                Desktop- & Browser-Zugang freischalten.
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={{
                                backgroundColor: mockDb.isUserWebUnlocked(activeUserInMenu, roles) 
                                  ? (isDark ? '#7f1d1d35' : '#fee2e2') 
                                  : (isDark ? '#064e3b' : '#10b981'),
                                borderWidth: 1,
                                borderColor: mockDb.isUserWebUnlocked(activeUserInMenu, roles) ? '#fca5a5' : '#059669',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: RADIUS,
                              }}
                              onPress={() => handleToggleWebAccess(activeUserInMenu.id, activeUserInMenu.name, mockDb.isUserWebUnlocked(activeUserInMenu, roles))}
                            >
                              <Text style={{
                                color: mockDb.isUserWebUnlocked(activeUserInMenu, roles) ? '#ef4444' : '#ffffff',
                                fontSize: 12,
                                fontWeight: '700'
                              }}>
                                {mockDb.isUserWebUnlocked(activeUserInMenu, roles) 
                                  ? '🚫 Web entziehen' 
                                  : '🔓 Web freischalten'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* ACCOUNT LÖSCHEN */}
                      {activeUserInMenu.id !== currentUser?.id && (
                        <View style={[styles.modalSectionCard, { backgroundColor: isDark ? '#450a0a20' : '#fef2f2', borderColor: '#fca5a5' }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={[styles.modalSectionTitle, { color: '#ef4444' }]}>Account entfernen</Text>
                              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                                Löscht den Benutzer dauerhaft aus dem System.
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#ef4444',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: RADIUS,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6
                              }}
                              onPress={() => {
                                const targetId = activeUserInMenu.id;
                                const targetName = activeUserInMenu.name;
                                setSelectedUserForMenu(null);
                                handleDeleteUser(targetId, targetName);
                              }}
                            >
                              <Trash2 size={13} color="#ffffff" />
                              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                                Löschen
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            );
          })()}

          {userSubTab === 'roles' && (
            <ScrollView 
              keyboardDismissMode="on-drag"
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ROLLE ERSTELLEN ODER BEARBEITEN */}
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <ShieldCheck size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
                    {editingRoleId ? 'Rolle bearbeiten' : 'Neue Rolle anlegen'}
                  </Text>
                </View>

                <Text style={[styles.formLabel, { color: colors.text }]}>Rollenname *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="z.B. Fahrlehrer, Mod, Streckenwärter..."
                  placeholderTextColor={colors.textMuted}
                  value={formRoleName}
                  onChangeText={setFormRoleName}
                />

                <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Rollenfarbe</Text>
                <View style={styles.colorSelectorRow}>
                  {PRESET_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorBadge, 
                        { backgroundColor: color, borderColor: formRoleColor === color ? colors.text : 'transparent' }
                      ]}
                      onPress={() => setFormRoleColor(color)}
                    >
                      {formRoleColor === color && <Check size={16} color="#ffffff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Admin-Zugriff Berechtigung */}
                <TouchableOpacity
                  style={[
                    styles.checkboxRow,
                    { 
                      backgroundColor: formRoleCanAccessAdmin ? colors.primary + '15' : colors.background,
                      borderColor: formRoleCanAccessAdmin ? colors.primary : colors.border,
                      opacity: editingRoleId === 'admin' ? 0.6 : 1
                    }
                  ]}
                  disabled={editingRoleId === 'admin'}
                  onPress={() => setFormRoleCanAccessAdmin(!formRoleCanAccessAdmin)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkboxBox, 
                    { 
                      backgroundColor: (formRoleCanAccessAdmin || editingRoleId === 'admin') ? colors.primary : 'transparent',
                      borderColor: (formRoleCanAccessAdmin || editingRoleId === 'admin') ? colors.primary : colors.border
                    }
                  ]}>
                    {(formRoleCanAccessAdmin || editingRoleId === 'admin') && <Check size={14} color="#ffffff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>
                      Darf Adminbereich öffnen {editingRoleId === 'admin' ? '(Fest für Admin)' : ''}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      Erlaubt das Erstellen & Bearbeiten von Prüfungsfragen, Lernfakten und Themen.
                    </Text>
                  </View>
                </TouchableOpacity>

                {editingRoleId ? (
                  <View style={[styles.formActions, { marginTop: 16 }]}>
                    <TouchableOpacity 
                      style={[styles.formBtn, styles.cancelBtn, { borderColor: colors.border }]}
                      onPress={handleResetRoleForm}
                    >
                      <X size={16} color={colors.text} />
                      <Text style={{ color: colors.text, fontWeight: 'bold' }}>Abbrechen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.formBtn, styles.saveBtn, { backgroundColor: colors.primary }]} 
                      onPress={handleSaveRole}
                    >
                      <Check size={16} color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Änderungen speichern</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.formBtn, styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]} 
                    onPress={handleSaveRole}
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Rolle speichern</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* LISTE DER ROLLEN */}
              <Text style={[styles.secTitle, { color: colors.text }]}>Vorhandene Rollen ({roles.length})</Text>
              {roles.map(r => (
                <View key={r.id} style={[styles.userCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: r.color }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.userName, { color: colors.text }]}>{r.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {r.canAccessAdmin ? '🔑 Admin-Zugang: Ja' : '👤 Standard-Schüler Zugang'}
                          {r.isSystem && ' • System-Rolle'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleEditRoleClick(r)}
                      >
                        <Edit3 size={15} color="#ffffff" />
                      </TouchableOpacity>

                      {!r.isSystem && r.id !== 'admin' && r.id !== 'moderator' && r.id !== 'user' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.deleteBtn]}
                          onPress={() => handleDeleteRole(r.id, r.name)}
                        >
                          <Trash2 size={15} color="#ffffff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {userSubTab === 'webkeys' && (
            <ScrollView 
              keyboardDismissMode="on-drag"
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* KEY GENERATOR KARTE */}
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <KeyRound size={22} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 2 }]}>
                      Web-Zugang Lizenz-Codes (4,99 €)
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      Aktivierungscodes für PayPal-Käufer. Jeder Code schaltet einen Account dauerhaft im Web frei.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 8
                  }}
                  onPress={handleGenerateWebKeys}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                    + 3 neue Lizenz-Keys generieren
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.secTitle, { color: colors.text }]}>
                Verfügbare & eingelöste Codes ({webKeysList.length})
              </Text>

              {webKeysList.map((k, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.userCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: k.isRedeemed ? colors.border : '#10b981',
                      borderWidth: k.isRedeemed ? 1 : 1.5,
                      marginBottom: 10,
                      opacity: k.isRedeemed ? 0.7 : 1
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 1.2, color: colors.text }}>
                        {k.key}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        {k.isRedeemed 
                          ? `Eingelöst von Benutzer: ${k.redeemedBy || 'Unbekannt'}`
                          : 'Gültig für 1x Web-Freischaltung (4,99 €)'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      {k.isRedeemed ? (
                        <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Bereits eingelöst</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#86efac' }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#166534' }}>⚡ Bereit zum Senden</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={{
                          backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}
                        onPress={() => {
                          if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(k.key);
                          }
                          Alert.alert('Code kopiert 📋', `Der Lizenz-Key wurde kopiert:\n\n${k.key}`);
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>📋 Kopieren</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* --- REITER 5: TICKETS VERWALTEN (SUPPORT & FEEDBACK) --- */}
      {activeTab === 'tickets' && (
        <View style={{ flex: 1 }}>
          {/* FILTERBAR */}
          <View style={[styles.filterBarBox, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            {/* STATUS FILTER */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
              <TouchableOpacity
                style={[styles.filterChip, ticketFilter === 'all' && { backgroundColor: colors.primary }]}
                onPress={() => setTicketFilter('all')}
              >
                <Text style={[styles.filterChipText, { color: ticketFilter === 'all' ? '#ffffff' : colors.text }]}>
                  Alle ({tickets.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, ticketFilter === 'open' && { backgroundColor: '#f59e0b' }]}
                onPress={() => setTicketFilter('open')}
              >
                <Text style={[styles.filterChipText, { color: ticketFilter === 'open' ? '#ffffff' : colors.text }]}>
                  ⚠️ Offen ({tickets.filter(t => t.status === 'open').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, ticketFilter === 'in_progress' && { backgroundColor: '#3b82f6' }]}
                onPress={() => setTicketFilter('in_progress')}
              >
                <Text style={[styles.filterChipText, { color: ticketFilter === 'in_progress' ? '#ffffff' : colors.text }]}>
                  ⏳ In Bearbeitung ({tickets.filter(t => t.status === 'in_progress').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, ticketFilter === 'resolved' && { backgroundColor: '#10b981' }]}
                onPress={() => setTicketFilter('resolved')}
              >
                <Text style={[styles.filterChipText, { color: ticketFilter === 'resolved' ? '#ffffff' : colors.text }]}>
                  ✅ Beantwortet ({tickets.filter(t => t.status === 'resolved').length})
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* TYP FILTER */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 }}>
              <TouchableOpacity
                style={[styles.typeFilterBtn, ticketTypeFilter === 'all' && { backgroundColor: colors.border }]}
                onPress={() => setTicketTypeFilter('all')}
              >
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: ticketTypeFilter === 'all' ? 'bold' : 'normal' }}>
                  Alle Typen
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeFilterBtn, ticketTypeFilter === 'exam_question' && { backgroundColor: '#ede9fe' }]}
                onPress={() => setTicketTypeFilter('exam_question')}
              >
                <GraduationCap size={12} color="#7c3aed" />
                <Text style={{ color: '#7c3aed', fontSize: 11, fontWeight: ticketTypeFilter === 'exam_question' ? 'bold' : 'normal' }}>
                  Nur Prüfungsfragen
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeFilterBtn, ticketTypeFilter === 'bug' && { backgroundColor: '#fee2e2' }]}
                onPress={() => setTicketTypeFilter('bug')}
              >
                <Bug size={12} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: ticketTypeFilter === 'bug' ? 'bold' : 'normal' }}>
                  Nur Fehler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeFilterBtn, ticketTypeFilter === 'feature' && { backgroundColor: '#dbeafe' }]}
                onPress={() => setTicketTypeFilter('feature')}
              >
                <Lightbulb size={12} color="#2563eb" />
                <Text style={{ color: '#2563eb', fontSize: 11, fontWeight: ticketTypeFilter === 'feature' ? 'bold' : 'normal' }}>
                  Nur Vorschläge
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeFilterBtn, ticketTypeFilter === 'password_reset' && { backgroundColor: '#fef3c7' }]}
                onPress={() => setTicketTypeFilter('password_reset')}
              >
                <KeyRound size={12} color="#d97706" />
                <Text style={{ color: '#d97706', fontSize: 11, fontWeight: ticketTypeFilter === 'password_reset' ? 'bold' : 'normal' }}>
                  Passwort-Reset ({tickets.filter(t => t.type === 'password_reset').length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* TICKET LISTE */}
          <ScrollView 
            ref={ticketScrollRef}
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {(() => {
              const filtered = tickets.filter(t => {
                const matchesStatus = ticketFilter === 'all' || t.status === ticketFilter;
                const matchesType = ticketTypeFilter === 'all' || t.type === ticketTypeFilter;
                return matchesStatus && matchesType;
              });

              if (filtered.length === 0) {
                return (
                  <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <MessageSquare size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>Keine Tickets gefunden</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                      Für den ausgewählten Filter liegen aktuell keine Tickets vor.
                    </Text>
                  </View>
                );
              }

              return filtered.map(ticket => {
                const isBug = ticket.type === 'bug';
                const isExam = ticket.type === 'exam_question';
                const isPwdReset = ticket.type === 'password_reset';
                const isResolved = ticket.status === 'resolved';
                const isInProgress = ticket.status === 'in_progress';
                const isEditingThisResponse = activeRespondingTicketId === ticket.id;

                return (
                  <View
                    key={ticket.id}
                    style={[styles.ticketAdminCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  >
                    {/* Header: Typ-Badge + Status-Badge + User-Info */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[
                          styles.ticketTypeBadge,
                          { 
                            backgroundColor: isPwdReset ? '#fef3c7' : (isExam ? '#ede9fe' : (isBug ? '#fee2e2' : '#dbeafe')) 
                          }
                        ]}>
                          {isPwdReset ? (
                            <KeyRound size={13} color="#d97706" />
                          ) : isExam ? (
                            <GraduationCap size={13} color="#7c3aed" />
                          ) : isBug ? (
                            <Bug size={13} color="#ef4444" />
                          ) : (
                            <Lightbulb size={13} color="#2563eb" />
                          )}
                          <Text style={{ 
                            color: isPwdReset ? '#d97706' : (isExam ? '#7c3aed' : (isBug ? '#ef4444' : '#2563eb')), 
                            fontSize: 11, 
                            fontWeight: 'bold', 
                            marginLeft: 4 
                          }}>
                            {isPwdReset ? 'Passwort-Reset' : isExam ? 'Prüfungsfrage' : isBug ? 'Fehlermeldung' : 'Verbesserung'}
                          </Text>
                        </View>

                        <View style={[
                          styles.ticketStatusBadge,
                          { backgroundColor: isResolved ? '#d1fae5' : (isInProgress ? '#dbeafe' : '#fef3c7') }
                        ]}>
                          {isResolved ? (
                            <CheckCircle2 size={12} color="#059669" />
                          ) : isInProgress ? (
                            <Clock size={12} color="#2563eb" />
                          ) : (
                            <AlertCircle size={12} color="#d97706" />
                          )}
                          <Text style={{
                            color: isResolved ? '#059669' : (isInProgress ? '#2563eb' : '#d97706'),
                            fontSize: 10,
                            fontWeight: 'bold',
                            marginLeft: 3
                          }}>
                            {isResolved ? 'Beantwortet' : (isInProgress ? 'In Bearbeitung' : 'Offen')}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn, { width: 32, height: 32 }]}
                        onPress={() => handleDeleteTicketAdmin(ticket.id)}
                      >
                        <Trash2 size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>

                    {/* Absender & Datum */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>
                        Von: {ticket.userName} ({ticket.userEmail})
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>•</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {new Date(ticket.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    {/* Titel & Beschreibung */}
                    <Text style={[styles.ticketAdminTitle, { color: colors.text }]}>{ticket.title}</Text>
                    <Text style={[styles.ticketAdminDesc, { color: colors.textMuted }]}>{ticket.description}</Text>

                    {/* Spezieller 1-Klick-Button für Passwort-Reset Tickets */}
                    {isPwdReset && !isResolved && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#f59e0b',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          marginTop: 10,
                          marginBottom: 4,
                          gap: 6
                        }}
                        onPress={() => handleAdminResetPassword(ticket.userEmail, ticket.userName, ticket.id)}
                      >
                        <KeyRound size={15} color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                          🔑 Passwort auf „railtrainer“ zurücksetzen & Ticket lösen
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Foto-Vorschau der Prüfungsfrage */}
                    {ticket.imageUrl && (
                      <TouchableOpacity 
                        style={{ marginTop: 10, marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}
                        onPress={() => setAdminPreviewImage(ticket.imageUrl || null)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: ticket.imageUrl }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
                        <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#00000088', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>🔍 Foto in Großansicht öffnen</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Antwort des Ausbilders (falls bereits vorhanden) */}
                    {ticket.response && !isEditingThisResponse && (
                      <View style={[styles.adminResponseBox, { backgroundColor: isDark ? '#064e3b20' : '#ecfdf5', borderColor: '#10b981' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <CheckCircle2 size={14} color="#10b981" />
                          <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                            Bestehende Antwort ({ticket.responderName} [{ticket.responderRole || 'Ausbilder'}]):
                          </Text>
                        </View>
                        <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
                          {ticket.response}
                        </Text>
                        {ticket.respondedAt && (
                          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}>
                            Beantwortet am: {new Date(ticket.respondedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Antwort-Editor (Top-level Memoized) */}
                    {isEditingThisResponse ? (
                      <TicketResponseEditor
                        ticket={ticket}
                        colors={colors}
                        onSave={(resp, st) => handleSaveTicketResponse(ticket.id, resp, st)}
                        onCancel={() => setActiveRespondingTicketId(null)}
                      />
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.openResponseBtn,
                          { backgroundColor: ticket.response ? colors.border : colors.primary }
                        ]}
                        onPress={() => setActiveRespondingTicketId(ticket.id)}
                      >
                        <Send size={13} color={ticket.response ? colors.text : '#ffffff'} style={{ marginRight: 6 }} />
                        <Text style={{ color: ticket.response ? colors.text : '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
                          {ticket.response ? 'Antwort bearbeiten / Status ändern' : 'Ticket beantworten'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              });
            })()}
          </ScrollView>
        </View>
      )}

      {/* --- REITER 6: GEMELDETE NACHRICHTEN (REPORTS) --- */}
      {activeTab === 'reports' && (
        <View style={{ flex: 1 }}>
          {/* FILTER-BAR */}
          <View style={[styles.filterBarBox, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  reportFilter === 'all' && { backgroundColor: colors.primary, borderColor: 'transparent' }
                ]}
                onPress={() => setReportFilter('all')}
              >
                <Text style={[styles.filterChipText, { color: reportFilter === 'all' ? '#ffffff' : colors.text }]}>
                  Alle ({chatReports.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  reportFilter === 'pending' && { backgroundColor: '#ef4444', borderColor: 'transparent' }
                ]}
                onPress={() => setReportFilter('pending')}
              >
                <Text style={[styles.filterChipText, { color: reportFilter === 'pending' ? '#ffffff' : colors.text }]}>
                  ⏳ Offen ({chatReports.filter(r => r.status === 'pending').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  reportFilter === 'reviewed' && { backgroundColor: '#10b981', borderColor: 'transparent' }
                ]}
                onPress={() => setReportFilter('reviewed')}
              >
                <Text style={[styles.filterChipText, { color: reportFilter === 'reviewed' ? '#ffffff' : colors.text }]}>
                  ✅ Behalten ({chatReports.filter(r => r.status === 'reviewed').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  reportFilter === 'deleted' && { backgroundColor: '#6b7280', borderColor: 'transparent' }
                ]}
                onPress={() => setReportFilter('deleted')}
              >
                <Text style={[styles.filterChipText, { color: reportFilter === 'deleted' ? '#ffffff' : colors.text }]}>
                  🗑️ Gelöscht ({chatReports.filter(r => r.status === 'deleted').length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* REPORTS LIST */}
          <ScrollView 
            ref={reportScrollRef}
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 12 }} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {(() => {
              const filteredReports = chatReports.filter(r => {
                if (reportFilter === 'all') return true;
                return r.status === reportFilter;
              });

              if (filteredReports.length === 0) {
                return (
                  <View style={[styles.emptyBox, { paddingVertical: 60 }]}>
                    <CheckCircle2 size={48} color="#10b981" />
                    <Text style={{ color: colors.text, marginTop: 12, fontWeight: 'bold', fontSize: 15 }}>
                      Keine gemeldeten Chatnachrichten
                    </Text>
                    <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 30, fontSize: 13 }}>
                      Aktuell liegen keine offenen Meldungen von Schülern oder Ausbildern vor.
                    </Text>
                  </View>
                );
              }

              return filteredReports.map((report) => {
                return (
                  <View
                    key={report.id}
                    style={[
                      styles.ticketAdminCard,
                      { 
                        backgroundColor: colors.cardBg, 
                        borderColor: report.status === 'pending' ? '#ef4444' : colors.border,
                        borderWidth: report.status === 'pending' ? 1.5 : 1
                      }
                    ]}
                  >
                    {/* Header mit Grund & Status */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ backgroundColor: '#ef444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#ef444450' }}>
                        <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: 'bold' }}>
                          🚩 {report.reason}
                        </Text>
                      </View>

                      <View style={[
                        styles.ticketStatusBadge,
                        {
                          backgroundColor: report.status === 'pending' ? '#ef444420' : report.status === 'reviewed' ? '#10b98120' : '#6b728020',
                          borderColor: report.status === 'pending' ? '#ef4444' : report.status === 'reviewed' ? '#10b981' : '#6b7280',
                          borderWidth: 1,
                        }
                      ]}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: 'bold',
                          color: report.status === 'pending' ? '#ef4444' : report.status === 'reviewed' ? '#10b981' : '#6b7280'
                        }}>
                          {report.status === 'pending' ? '⏳ Offen' : report.status === 'reviewed' ? '✅ Behalten' : '🗑️ Gelöscht'}
                        </Text>
                      </View>
                    </View>

                    {/* Metadaten */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        Gemeldet von: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{report.reporterName}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Sender: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{report.messageSenderName}</Text> in #{report.messageCategory || 'Allgemein'} • {new Date(report.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    {/* Gemeldeter Nachrichtentext */}
                    <View style={{ backgroundColor: colors.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: 'bold', marginBottom: 4 }}>
                        Gemeldeter Inhalt:
                      </Text>
                      <Text style={{ color: colors.text, fontSize: 14, fontStyle: 'italic' }}>
                        „{report.messageText}“
                      </Text>
                    </View>

                    {/* Admin Aktionen */}
                    {report.status === 'pending' && (
                      <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={[styles.smallActionBtn, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                            onPress={() => handleDismissChatReport(report.id)}
                          >
                            <Check size={14} color="#10b981" style={{ marginRight: 6 }} />
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 12 }}>Meldung verwerfen</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallActionBtn, { flex: 1, backgroundColor: '#ef4444' }]}
                            onPress={() => handleDeleteReportedChatMessage(report.id, report.messageId)}
                          >
                            <Trash2 size={14} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Nachricht löschen</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={[styles.smallActionBtn, { flex: 1, backgroundColor: '#f59e0b' }]}
                            onPress={() => handleTimeoutUser(report.messageSenderId, report.messageSenderName)}
                          >
                            <Clock size={14} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>⏱️ 1 Tag Timeout</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallActionBtn, { flex: 1, backgroundColor: '#b91c1c' }]}
                            onPress={() => handleBanUser(report.messageSenderId, report.messageSenderName)}
                          >
                            <Ban size={14} color="#ffffff" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>🚫 Chat-Bann</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </ScrollView>
        </View>
      )}

      {/* --- REITER: DOPPEL-CHECK & DUPLIKAT-PRÜFUNG --- */}
      {activeTab === 'duplicates' && (
        <View style={{ flex: 1 }}>
          {/* SUB-HEADER & FILTERLEISTE */}
          <View style={[styles.subTabBar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingVertical: 12, paddingHorizontal: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                  Doppel-Check 🔍
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {isScanningDuplicates 
                    ? scanProgressText 
                    : (hasScannedOnce 
                        ? `${pendingDuplicatesCount} Duplikat-Verdachtsfälle gefunden` 
                        : 'Prüfe Fragen und Lernkarten auf Duplikate')}
                </Text>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: isScanningDuplicates ? colors.textMuted : colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
                onPress={() => runDuplicateScanAsync(true)}
                disabled={isScanningDuplicates}
                activeOpacity={0.7}
              >
                {isScanningDuplicates ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <RefreshCw size={14} color="#ffffff" />
                )}
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
                  {isScanningDuplicates ? 'Prüft...' : (hasScannedOnce ? 'Neu prüfen' : 'Scan starten')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* FORTSCHRITTSBALKEN WÄHREND DES SCANS */}
            {isScanningDuplicates && (
              <View style={{ width: '100%', marginTop: 2 }}>
                <View style={{ height: 6, width: '100%', backgroundColor: colors.background, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.min(100, Math.max(5, scanProgressPercent))}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' }}>
                  {scanProgressPercent}% abgeschlossen
                </Text>
              </View>
            )}

            {/* SUB-TABS: ALLE / FRAGEN / LERNKARTEN */}
            {hasScannedOnce && !isScanningDuplicates && (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: duplicateSubTab === 'all' ? colors.primary : colors.background, borderColor: duplicateSubTab === 'all' ? colors.primary : colors.border }
                  ]}
                  onPress={() => { setDuplicateSubTab('all'); setDuplicateDisplayLimit(15); }}
                >
                  <Text style={[styles.filterChipText, { color: duplicateSubTab === 'all' ? '#ffffff' : colors.text }]}>
                    Alle ({pendingDuplicatesCount} Paare)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: duplicateSubTab === 'questions' ? colors.primary : colors.background, borderColor: duplicateSubTab === 'questions' ? colors.primary : colors.border }
                  ]}
                  onPress={() => { setDuplicateSubTab('questions'); setDuplicateDisplayLimit(15); }}
                >
                  <Text style={[styles.filterChipText, { color: duplicateSubTab === 'questions' ? '#ffffff' : colors.text }]}>
                    📋 Fragen ({duplicateQuestionPairs.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: duplicateSubTab === 'facts' ? colors.primary : colors.background, borderColor: duplicateSubTab === 'facts' ? colors.primary : colors.border }
                  ]}
                  onPress={() => { setDuplicateSubTab('facts'); setDuplicateDisplayLimit(15); }}
                >
                  <Text style={[styles.filterChipText, { color: duplicateSubTab === 'facts' ? '#ffffff' : colors.text }]}>
                    💡 Lernkarten ({duplicateFactPairs.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView 
            ref={duplicateScrollRef}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]} 
            showsVerticalScrollIndicator={false}
          >
            {/* NOCH NICHT GESCANNT */}
            {!hasScannedOnce && !isScanningDuplicates && (
              <View style={[styles.emptyBox, { paddingVertical: 40, alignItems: 'center' }]}>
                <CopyCheck size={56} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: 'bold', marginTop: 14, textAlign: 'center' }}>
                  Intelligenter Doppel-Check
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, maxWidth: 320, lineHeight: 18 }}>
                  Finde doppelt oder sehr ähnlich formulierte Fragen und Lernkarten. Du kannst für jedes Paar einzeln aussuchen, welche gelöscht werden soll.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 20
                  }}
                  onPress={() => runDuplicateScanAsync(true)}
                  activeOpacity={0.8}
                >
                  <CopyCheck size={18} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                    Doppel-Check jetzt starten
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SCAN LÄUFT */}
            {isScanningDuplicates && (
              <View style={[styles.emptyBox, { paddingVertical: 40, alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginTop: 16 }}>
                  Prüfung läuft...
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 300 }}>
                  {scanProgressText}
                </Text>
              </View>
            )}

            {/* KEINE DUPLIKATE */}
            {hasScannedOnce && !isScanningDuplicates && pendingDuplicatesCount === 0 && (
              <View style={[styles.emptyBox, { paddingVertical: 40, alignItems: 'center' }]}>
                <CheckCheck size={50} color="#10b981" />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginTop: 12 }}>
                  Keine offenen Duplikate! 🎉
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 6, maxWidth: 320 }}>
                  Alle Fragen und Lernkarten sind einzigartig oder wurden bereits als geprüft bestätigt.
                </Text>
              </View>
            )}

            {/* ERGEBNISSE ANZEIGEN */}
            {hasScannedOnce && !isScanningDuplicates && pendingDuplicatesCount > 0 && (() => {
              const showQuestions = duplicateSubTab === 'all' || duplicateSubTab === 'questions';
              const showFacts = duplicateSubTab === 'all' || duplicateSubTab === 'facts';

              const visibleQuestionPairs = showQuestions ? duplicateQuestionPairs : [];
              const visibleFactPairs = showFacts ? duplicateFactPairs : [];
              const totalPairsCount = visibleQuestionPairs.length + visibleFactPairs.length;

              return (
                <>
                  {/* FRAGEN PAARE */}
                  {showQuestions && visibleQuestionPairs.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={[styles.secTitle, { color: colors.text, marginBottom: 12 }]}>
                        📋 Ähnliche Fragen ({visibleQuestionPairs.length})
                      </Text>

                      {visibleQuestionPairs.slice(0, duplicateDisplayLimit).map((p) => {
                        const meta = getDuplicatePairMetadata(p.question1, p.question2, questions);

                        const renderQuestionBox = (
                          q: Question,
                          num: 1 | 2,
                          isNewer: boolean,
                          isOlder: boolean,
                          dateText?: string
                        ) => {
                          const isVerified = q.isVerified === true;
                          const correctIndices = getQuestionCorrectIndices(q);

                          return (
                            <View
                              style={{
                                backgroundColor: colors.background,
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: isNewer ? '#3b82f650' : (isVerified ? '#10b98140' : colors.border),
                                marginBottom: 12
                              }}
                            >
                              {/* HEADER: NUMMER, STATUS-BADGES & BEARBEITEN */}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                                    Frage {num}:
                                  </Text>

                                  {/* FREIGABE-STATUS */}
                                  {isVerified ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b98120', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#10b98160' }}>
                                      <CheckCircle2 size={12} color="#10b981" />
                                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#10b981' }}>✓ Freigegeben</Text>
                                    </View>
                                  ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f59e0b20', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#f59e0b60' }}>
                                      <Clock size={12} color="#f59e0b" />
                                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#f59e0b' }}>⏳ Ungeprüft</Text>
                                    </View>
                                  )}

                                  {/* ALTER / NEU STATUS */}
                                  {isNewer && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b82f620', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#3b82f660' }}>
                                      <Sparkles size={12} color="#3b82f6" />
                                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#3b82f6' }}>⭐ Neu / Zuletzt hinzugefügt</Text>
                                    </View>
                                  )}
                                  {isOlder && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.border + '60', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                                      <Clock size={11} color={colors.textMuted} />
                                      <Text style={{ fontSize: 10, color: colors.textMuted }}>Älterer Bestand</Text>
                                    </View>
                                  )}

                                  {!!dateText && (
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>
                                      ({dateText})
                                    </Text>
                                  )}
                                </View>

                                <TouchableOpacity 
                                  onPress={() => {
                                    setActiveTab('questions');
                                    handleQEditClick(q);
                                  }}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                >
                                  <Edit3 size={12} color={colors.primary} />
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Bearbeiten</Text>
                                </TouchableOpacity>
                              </View>

                              {/* FRAGENTEXT (VOLLSTÄNDIG) */}
                              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 10, lineHeight: 19 }}>
                                {q.text}
                              </Text>

                              {/* AUSGEKLAPPTE ANTWORTOPTIONEN */}
                              <View style={{ gap: 6, marginBottom: 10 }}>
                                {(q.options || []).map((opt, optIdx) => {
                                  const isCorrect = correctIndices.includes(optIdx);
                                  const isDanger = (q.dangerIndices || q.danger_indices || []).includes(optIdx);
                                  const letter = String.fromCharCode(65 + optIdx);

                                  return (
                                    <View
                                      key={optIdx}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        paddingVertical: 7,
                                        paddingHorizontal: 10,
                                        borderRadius: 8,
                                        backgroundColor: isCorrect ? '#10b98118' : colors.cardBg,
                                        borderWidth: 1,
                                        borderColor: isCorrect ? '#10b981' : colors.border,
                                        gap: 8
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 20,
                                          height: 20,
                                          borderRadius: 10,
                                          backgroundColor: isCorrect ? '#10b981' : colors.border,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          marginTop: 1
                                        }}
                                      >
                                        <Text style={{ color: isCorrect ? '#ffffff' : colors.textMuted, fontSize: 10, fontWeight: 'bold' }}>
                                          {letter}
                                        </Text>
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 12, color: isCorrect ? '#10b981' : colors.text, fontWeight: isCorrect ? 'bold' : 'normal', lineHeight: 17 }}>
                                          {opt}
                                        </Text>
                                        {isDanger && (
                                          <Text style={{ fontSize: 9, color: '#ef4444', fontWeight: 'bold', marginTop: 2 }}>
                                            ⚠️ Betriebsgefährdend (BG)
                                          </Text>
                                        )}
                                      </View>
                                      {isCorrect && (
                                        <Check size={14} color="#10b981" style={{ marginTop: 2 }} />
                                      )}
                                    </View>
                                  );
                                })}
                              </View>

                              {/* ERKLÄRUNG (FALLS VORHANDEN) */}
                              {!!q.explanation && (
                                <View style={{ backgroundColor: colors.cardBg, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginBottom: 10 }}>
                                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary, marginBottom: 2 }}>
                                    💡 Erklärung:
                                  </Text>
                                  <Text style={{ fontSize: 11, color: colors.textMuted, lineHeight: 16 }}>
                                    {q.explanation}
                                  </Text>
                                </View>
                              )}

                              {/* LÖSCHBUTTON FÜR DIESE FRAGE */}
                              <TouchableOpacity
                                style={{
                                  backgroundColor: '#ef444418',
                                  borderColor: '#ef4444',
                                  borderWidth: 1,
                                  borderRadius: 8,
                                  paddingVertical: 8,
                                  paddingHorizontal: 12,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6
                                }}
                                onPress={() => handleDeleteDuplicateQuestionChoice(p, num)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={14} color="#ef4444" />
                                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>
                                  Frage {num} löschen
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        };

                        return (
                          <View 
                            key={p.pairKey}
                            style={[
                              styles.itemCard,
                              {
                                backgroundColor: colors.cardBg,
                                borderColor: p.score >= 90 ? '#ef4444' : '#f59e0b',
                                borderWidth: 1.5,
                                marginBottom: 16
                              }
                            ]}
                          >
                            {/* SCORE HEADER */}
                            <View style={{ marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                  <AlertTriangle size={16} color={p.score >= 90 ? '#ef4444' : '#f59e0b'} />
                                  <Text style={{ fontWeight: 'bold', color: p.score >= 90 ? '#ef4444' : '#f59e0b', fontSize: 13, flex: 1 }}>
                                    {p.score}% Ähnlichkeit • {p.reason}
                                  </Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: colors.background }]}>
                                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>{p.question1.category}</Text>
                                </View>
                              </View>

                              {/* DETAIL-METRIKEN: FRAGENTEXT VS ANTWORTEN VS LÖSUNG */}
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: colors.border }}>
                                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Fragentext:</Text>
                                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text }}>{p.textScore}%</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: colors.border }}>
                                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Antworten:</Text>
                                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text }}>{p.optionsScore}%</Text>
                                </View>
                                {p.correctAnswerScore !== undefined && (
                                  <View style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    gap: 4, 
                                    backgroundColor: p.sameCorrectAnswer ? '#10b98115' : '#ef444415', 
                                    paddingHorizontal: 7, 
                                    paddingVertical: 3, 
                                    borderRadius: 4, 
                                    borderWidth: 1, 
                                    borderColor: p.sameCorrectAnswer ? '#10b98150' : '#ef444450' 
                                  }}>
                                    <Text style={{ fontSize: 10, color: p.sameCorrectAnswer ? '#10b981' : '#ef4444' }}>Lösung:</Text>
                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: p.sameCorrectAnswer ? '#10b981' : '#ef4444' }}>
                                      {p.sameCorrectAnswer ? 'Gleiche Lösung ✓' : `${p.correctAnswerScore}%`}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            {renderQuestionBox(p.question1, 1, meta.is1Newer, meta.is2Newer, meta.item1DateText)}
                            {renderQuestionBox(p.question2, 2, meta.is2Newer, meta.is1Newer, meta.item2DateText)}

                            {/* BEIDE BEHALTEN (BESTÄTIGEN / KEIN DUPLIKAT) */}
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#10b98115',
                                borderWidth: 1,
                                borderColor: '#10b981',
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                              }}
                              onPress={() => handleMarkDuplicateReviewed(p.pairKey)}
                              activeOpacity={0.7}
                            >
                              <Check size={16} color="#10b981" />
                              <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                                Beide behalten (Kein Duplikat – dauerhaft merken)
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* LERNKARTEN PAARE */}
                  {showFacts && visibleFactPairs.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={[styles.secTitle, { color: colors.text, marginBottom: 12 }]}>
                        💡 Ähnliche Lernkarten ({visibleFactPairs.length})
                      </Text>

                      {visibleFactPairs.slice(0, duplicateDisplayLimit).map((p) => {
                        const meta = getDuplicatePairMetadata(p.fact1, p.fact2, facts);

                        const renderFactBox = (
                          f: Fact,
                          num: 1 | 2,
                          isNewer: boolean,
                          isOlder: boolean,
                          dateText?: string
                        ) => {
                          const isVerified = f.isVerified === true;

                          return (
                            <View
                              style={{
                                backgroundColor: colors.background,
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: isNewer ? '#3b82f650' : (isVerified ? '#10b98140' : colors.border),
                                marginBottom: 12
                              }}
                            >
                              {/* HEADER: NUMMER, STATUS-BADGES & BEARBEITEN */}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                                    Lernkarte {num}:
                                  </Text>

                                  {/* FREIGABE-STATUS */}
                                  {isVerified ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b98120', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#10b98160' }}>
                                      <CheckCircle2 size={12} color="#10b981" />
                                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#10b981' }}>✓ Freigegeben</Text>
                                    </View>
                                  ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f59e0b20', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#f59e0b60' }}>
                                      <Clock size={12} color="#f59e0b" />
                                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#f59e0b' }}>⏳ Ungeprüft</Text>
                                    </View>
                                  )}

                                  {/* ALTER / NEU STATUS */}
                                  {isNewer && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b82f620', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#3b82f660' }}>
                                      <Sparkles size={12} color="#3b82f6" />
                                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#3b82f6' }}>⭐ Neu / Zuletzt hinzugefügt</Text>
                                    </View>
                                  )}
                                  {isOlder && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.border + '60', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                                      <Clock size={11} color={colors.textMuted} />
                                      <Text style={{ fontSize: 10, color: colors.textMuted }}>Älterer Bestand</Text>
                                    </View>
                                  )}

                                  {!!dateText && (
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>
                                      ({dateText})
                                    </Text>
                                  )}
                                </View>

                                <TouchableOpacity 
                                  onPress={() => {
                                    setActiveTab('facts');
                                    handleFEditClick(f);
                                  }}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                                >
                                  <Edit3 size={12} color={colors.primary} />
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Bearbeiten</Text>
                                </TouchableOpacity>
                              </View>

                              {/* TITEL */}
                              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                                {f.title}
                              </Text>

                              {/* VOLLSTÄNDIGER INHALT (OHNE ZEILENBESCHRÄNKUNG) */}
                              <View style={{ backgroundColor: colors.cardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
                                <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>
                                  {f.content}
                                </Text>
                              </View>

                              {!!f.reference && (
                                <Text style={{ fontSize: 10, color: colors.textMuted, fontStyle: 'italic', marginBottom: 10 }}>
                                  📖 Quelle / Regelwerk: {f.reference}
                                </Text>
                              )}

                              {/* LÖSCHBUTTON FÜR DIESE LERNKARTE */}
                              <TouchableOpacity
                                style={{
                                  backgroundColor: '#ef444418',
                                  borderColor: '#ef4444',
                                  borderWidth: 1,
                                  borderRadius: 8,
                                  paddingVertical: 8,
                                  paddingHorizontal: 12,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6
                                }}
                                onPress={() => handleDeleteDuplicateFactChoice(p, num)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={14} color="#ef4444" />
                                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>
                                  Lernkarte {num} löschen
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        };

                        return (
                          <View 
                            key={p.pairKey}
                            style={[
                              styles.itemCard,
                              {
                                backgroundColor: colors.cardBg,
                                borderColor: p.score >= 90 ? '#ef4444' : '#f59e0b',
                                borderWidth: 1.5,
                                marginBottom: 16
                              }
                            ]}
                          >
                            {/* SCORE HEADER */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                <AlertTriangle size={16} color={p.score >= 90 ? '#ef4444' : '#f59e0b'} />
                                <Text style={{ fontWeight: 'bold', color: p.score >= 90 ? '#ef4444' : '#f59e0b', fontSize: 12, flex: 1 }}>
                                  {p.score}% Ähnlichkeit • {p.reason}
                                </Text>
                              </View>
                              <View style={[styles.badge, { backgroundColor: colors.background }]}>
                                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>{p.fact1.category}</Text>
                              </View>
                            </View>

                            {renderFactBox(p.fact1, 1, meta.is1Newer, meta.is2Newer, meta.item1DateText)}
                            {renderFactBox(p.fact2, 2, meta.is2Newer, meta.is1Newer, meta.item2DateText)}

                            {/* BEIDE BEHALTEN (BESTÄTIGEN / KEIN DUPLIKAT) */}
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#10b98115',
                                borderWidth: 1,
                                borderColor: '#10b981',
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                              }}
                              onPress={() => handleMarkDuplicateReviewed(p.pairKey)}
                              activeOpacity={0.7}
                            >
                              <Check size={16} color="#10b981" />
                              <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                                Beide behalten (Kein Duplikat – dauerhaft merken)
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* PAGINIERUNG: WEITERE LADEN */}
                  {(visibleQuestionPairs.length > duplicateDisplayLimit || visibleFactPairs.length > duplicateDisplayLimit) && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.cardBg,
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginVertical: 14
                      }}
                      onPress={() => setDuplicateDisplayLimit(prev => prev + 15)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>
                        Weitere 15 Duplikate anzeigen ({Math.min(duplicateDisplayLimit, Math.max(visibleQuestionPairs.length, visibleFactPairs.length))} von {totalPairsCount} angezeigt)
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}

            {/* BEREITS GEPRÜFTE DUPLIKATE WIEDER EINBLENDEN */}
            {hasScannedOnce && !isScanningDuplicates && reviewedDuplicateKeys.length > 0 && (
              <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
                  Bereits als geprüft abgehakte Duplikate: {reviewedDuplicateKeys.length}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.cardBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onPress={handleResetReviewedDuplicates}
                >
                  <RefreshCw size={13} color={colors.textMuted} />
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: 'bold' }}>
                    Geprüfte Duplikate wieder einblenden
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
      </AppKeyboardPane>

      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      <Modal
        visible={adminPreviewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAdminPreviewImage(null)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: '#000000dd', justifyContent: 'center', alignItems: 'center', padding: 16 }}
          activeOpacity={1}
          onPress={() => setAdminPreviewImage(null)}
        >
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, backgroundColor: '#ffffff33', padding: 8, borderRadius: 20, zIndex: 10 }}
            onPress={() => setAdminPreviewImage(null)}
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {adminPreviewImage && (
            <Image source={{ uri: adminPreviewImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>

      {/* MODAL: ZUSÄTZLICHES SYMBOL HINZUFÜGEN */}
      <Modal
        visible={showAddIconModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddIconModal(false)}
      >
        <AppKeyboardPane style={styles.modalBackdrop} contentContainerStyle={{ justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.customIconModalBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.customIconModalHeader}>
              <Text style={[styles.modalTitleText, { color: colors.text }]}>Zusätzliches Symbol hinzufügen</Text>
              <TouchableOpacity onPress={() => setShowAddIconModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14, lineHeight: 18 }}>
              Wähle ein Eisenbahn- oder Technik-Emoji oder einen Lucide-Icon-Namen aus. Das Symbol wird gespeichert und steht dauerhaft für Kategorien zur Verfügung.
            </Text>

            {/* Typ-Auswahl */}
            <View style={styles.iconTypeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.iconTypeToggleBtn,
                  newIconType === 'lucide' && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setNewIconType('lucide')}
              >
                <Text style={[styles.iconTypeToggleText, { color: newIconType === 'lucide' ? '#ffffff' : colors.text }]}>
                  Lucide Icon (z.B. TrainFront)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.iconTypeToggleBtn,
                  newIconType === 'emoji' && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setNewIconType('emoji')}
              >
                <Text style={[styles.iconTypeToggleText, { color: newIconType === 'emoji' ? '#ffffff' : colors.text }]}>
                  Emoji (z.B. 🚂, 🚦, ⛽)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input */}
            <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>
              {newIconType === 'emoji' ? 'Emoji' : 'Icon-Name'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder={newIconType === 'emoji' ? 'z.B. 🚂 oder 🚦 oder ⛽' : 'z.B. TrainFront, Flame, Zap, Shield, Key'}
              placeholderTextColor={colors.textMuted}
              value={newIconInput}
              onChangeText={setNewIconInput}
              autoCapitalize={newIconType === 'emoji' ? 'none' : 'words'}
            />

            <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>
              Anzeigename / Beschriftung (optional)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="z.B. Schnellzug, Hochspannung, Diesel..."
              placeholderTextColor={colors.textMuted}
              value={newIconLabel}
              onChangeText={setNewIconLabel}
            />

            {/* Vorschau */}
            <View style={[styles.iconPreviewBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginRight: 12 }}>Vorschau:</Text>
              <CategoryIcon icon={newIconInput.trim() || 'Lokomotive'} size={28} color={formCatColor} />
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginLeft: 12 }}>
                {newIconLabel.trim() || newIconInput.trim() || 'Vorschau'}
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn, { borderColor: colors.border, flex: 1 }]}
                onPress={() => setShowAddIconModal(false)}
              >
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn, { backgroundColor: colors.primary, flex: 1.4 }]}
                onPress={handleAddCustomIcon}
                disabled={addingIcon}
              >
                {addingIcon ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Hinzufügen</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </AppKeyboardPane>
      </Modal>
    </SafeAreaView>
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
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deniedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deniedText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  deniedInstruction: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  mainTabBarWrapper: {
    borderBottomWidth: 1,
  },
  mainTabBarScroll: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  mainTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: '#6b728030',
    gap: 6,
  },
  mainTabBtnActive: {
    borderWidth: 1,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  mainTabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  subTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryFilterContainer: {
    borderBottomWidth: 1,
  },
  categoryFilterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  categoryFilterChipActive: {
    borderColor: 'transparent',
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryFilterTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  secTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  itemCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  itemDescText: {
    fontSize: 12,
    lineHeight: 16,
  },
  catIconColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  correctCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeOptionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  addOptionText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  formImgPreview: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginTop: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  formBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  saveBtn: {
    backgroundColor: '#2563eb',
  },
  colorSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  colorBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleActionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLabel: {
    fontSize: 12,
  },
  roleBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  roleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  roleBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  titleActionRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    width: 140,
  },
  saveTitleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
  },
  referenceText: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  filterBarBox: {
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6b728040',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  ticketAdminCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 4,
  },
  ticketTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketAdminTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  ticketAdminDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
    marginBottom: 8,
  },
  adminResponseBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  openResponseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  ticketResponseEditorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  statusSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  selectedIconCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomIconHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  iconFilterTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  iconFilterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: '#6b728030',
  },
  iconFilterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconTile: {
    width: '23%',
    minWidth: 70,
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  iconTileInner: {
    marginBottom: 4,
  },
  iconTileLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  deleteCustomIconBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#ef444422',
    borderRadius: 6,
    padding: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  customIconModalBox: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  customIconModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  iconTypeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  iconTypeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6b728030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTypeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  userRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS,
    borderWidth: 1,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  userModalContainer: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  userModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalSectionCard: {
    padding: 14,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
});
