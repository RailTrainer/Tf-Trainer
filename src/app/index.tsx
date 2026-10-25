import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  Platform,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockDb, Question, Category, User, Fact } from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import * as Icons from 'lucide-react-native';
import CategoryIcon from '../components/CategoryIcon';

function cleanText(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1');
}
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  LogOut,
  User as UserIcon,
  Settings,
  Check,
  Maximize2,
  X,
  Search,
  Bug,
  Sparkles,
  Star,
  Plus
} from 'lucide-react-native';

import { useDynamicKeyboard } from '../hooks/useDynamicKeyboard';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { CreateFactModal } from '../components/CreateFactModal';

const AVATAR_PRESETS = ['🚂', '👮', '🛡️', '🔧', '🚄', '⭐', '🚇', '🎒'];

interface FactCardItemProps {
  fact: Fact;
  index: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onImagePress: (url: string) => void;
  colors: any;
  isDark: boolean;
  showCategoryBadge?: boolean;
  containerStyle?: any;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const FactCardItem = memo(function FactCardItem({
  fact,
  index,
  isExpanded,
  onToggle,
  onImagePress,
  colors,
  isDark,
  showCategoryBadge,
  containerStyle,
  isFavorite,
  onToggleFavorite,
}: FactCardItemProps) {
  return (
    <View 
      style={[
        styles.factCard, 
        { backgroundColor: colors.cardBg, borderColor: colors.border },
        containerStyle
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: isExpanded ? 4 : 0,
        }}
      >
        <TouchableOpacity
          delayPressIn={0}
          style={{ flex: 1, marginRight: 8 }}
          onPress={() => onToggle(fact.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIndexRow, { alignItems: 'center', gap: 6, marginBottom: 4 }]}>
            {showCategoryBadge && (
              <View style={{
                backgroundColor: colors.primary + '20',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                alignSelf: 'flex-start'
              }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary }}>
                  {fact.category}
                </Text>
              </View>
            )}
            <Text style={[styles.factIndex, { color: colors.primary }]}>
              {showCategoryBadge ? `Treffer #${index + 1}` : `Lernkarte ${index + 1}`}
            </Text>
          </View>
          <Text style={[styles.factTitle, { color: colors.text, marginBottom: 0 }]}>
            {cleanText(fact.title)}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {onToggleFavorite && (
            <TouchableOpacity
              delayPressIn={0}
              onPress={() => onToggleFavorite(fact.id)}
              style={[
                styles.starBtn,
                {
                  backgroundColor: isFavorite ? '#eab30822' : (isDark ? '#37415160' : '#f3f4f6'),
                  borderColor: isFavorite ? '#eab30880' : 'transparent',
                }
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
              activeOpacity={0.6}
            >
              <Star
                size={17}
                color={isFavorite ? '#eab308' : (isDark ? '#9ca3af' : '#6b7280')}
                fill={isFavorite ? '#eab308' : 'none'}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            delayPressIn={0}
            onPress={() => onToggle(fact.id)}
            style={[styles.expandIconBg, { backgroundColor: isExpanded ? colors.primary + '20' : colors.background }]}
            activeOpacity={0.7}
          >
            {isExpanded ? (
              <ChevronUp size={20} color={colors.primary} />
            ) : (
              <ChevronDown size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isExpanded && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
          <Text style={[styles.factContentText, { color: isDark ? '#e5e7eb' : '#374151' }]}>
            {cleanText(fact.content)}
          </Text>

          {fact.imageUrl && (
            <TouchableOpacity
              delayPressIn={0}
              onPress={() => onImagePress(fact.imageUrl!)}
              activeOpacity={0.85}
              style={{ position: 'relative', marginTop: 8, marginBottom: 12 }}
            >
              <Image source={{ uri: fact.imageUrl }} style={styles.factImage} resizeMode="contain" />
              <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000bb' : '#ffffffdd' }]}>
                <Maximize2 size={13} color={colors.text} />
                <Text style={{ fontSize: 11, color: colors.text, fontWeight: 'bold', marginLeft: 4 }}>
                  Tippen zum Vergrößern
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={[styles.factRefBox, { backgroundColor: isDark ? '#111827' : '#f9fafb', borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
            <Text style={[styles.factRefLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Regelwerk-Referenz:
            </Text>
            <Text style={[styles.factRefValue, { color: isDark ? '#93c5fd' : '#2563eb' }]}>
              {fact.reference}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

export default function LernenScreen() {
  const router = useRouter();
  const { isDark, colors } = useAppTheme();
  const { dynamicKeyboardPadding } = useDynamicKeyboard(32);
  const { isTablet, isLandscape, isLandscapeTablet, columns, contentMaxWidth } = useDeviceLayout();

  // States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<{ [questionId: string]: number }>({});
  const [expandedFactIds, setExpandedFactIds] = useState<{ [id: string]: boolean }>({});
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'paging' | 'list'>('paging');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [favoriteFactIds, setFavoriteFactIds] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [createFactModalVisible, setCreateFactModalVisible] = useState(false);

  const categoryFacts = selectedCategory
    ? facts.filter(f => f.isVerified === true && f.category === selectedCategory)
    : [];
  const categoryFavorites = categoryFacts.filter(f => favoriteFactIds.includes(f.id));
  const categoryFavCount = categoryFavorites.length;
  const displayedListFacts = favoritesOnly ? categoryFavorites : categoryFacts;

  const pagingScrollRef = useRef<ScrollViewInstance>(null);

  const handleToggleFact = useCallback((id: string) => {
    setExpandedFactIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const handleToggleFavorite = useCallback(async (factId: string) => {
    setFavoriteFactIds(prev => {
      const isFav = prev.includes(factId);
      return isFav ? prev.filter(id => id !== factId) : [...prev, factId];
    });
    await mockDb.toggleFavoriteFact(factId, currentUser?.id);
  }, [currentUser?.id]);

  const handleImagePress = useCallback((url: string) => {
    setPreviewImageUrl(url);
  }, []);

  const handleNextCard = useCallback((maxCards: number) => {
    setCurrentCardIndex(prev => {
      if (prev < maxCards - 1) {
        pagingScrollRef.current?.scrollTo({ y: 0, animated: false });
        return prev + 1;
      }
      return prev;
    });
  }, []);

  const handlePrevCard = useCallback(() => {
    setCurrentCardIndex(prev => {
      if (prev > 0) {
        pagingScrollRef.current?.scrollTo({ y: 0, animated: false });
        return prev - 1;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await mockDb.getCurrentUser();
      setCurrentUser(user);
      const allCategories = await mockDb.getCategories();
      setCategories(allCategories);
      const verifiedFacts = await mockDb.getVerifiedFacts();
      setFacts(verifiedFacts);
      const favIds = await mockDb.getFavoriteFactIds(user?.id);
      setFavoriteFactIds(favIds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Regelmäßiges Laden im Hintergrund für Aktualisierungen (ohne unnötige Re-Renders)
  useEffect(() => {
    const interval = setInterval(async () => {
      const user = await mockDb.getCurrentUser();
      setCurrentUser(prev => (prev?.id === user?.id && prev?.role === user?.role ? prev : user));
      const allCategories = await mockDb.getCategories();
      setCategories(prev => (prev.length === allCategories.length && prev[0]?.name === allCategories[0]?.name ? prev : allCategories));
      const verifiedFacts = await mockDb.getVerifiedFacts();
      setFacts(prev => (prev.length === verifiedFacts.length && prev[0]?.id === verifiedFacts[0]?.id ? prev : verifiedFacts));
      const favIds = await mockDb.getFavoriteFactIds(user?.id);
      setFavoriteFactIds(prev => (prev.length === favIds.length && prev.every(id => favIds.includes(id)) ? prev : favIds));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getIconComponent = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp || Icons.BookOpen;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>

      {selectedCategory === null ? (
        // --- HAUPTÜBERSICHT: THEMENBEREICHE & SUCHE ---
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer, 
            { paddingBottom: dynamicKeyboardPadding ? dynamicKeyboardPadding + 20 : 20 },
            isTablet && { width: '100%', paddingHorizontal: 24 }
          ]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Wähle ein Thema zum Lernen</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textMuted }]}>
            Lerne wichtige Fachinhalte und Grundlagen mit Lernkarten inklusive direkter Quellenangabe zum Regelwerk.
          </Text>

          {/* BETA-FEEDBACK BANNER */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push('/profile?openTicket=true')}
            style={[
              styles.feedbackBanner,
              {
                backgroundColor: isDark ? '#0f172a' : '#f0fdf4',
                borderColor: isDark ? '#1e293b' : '#bbf7d0',
              }
            ]}
          >
            <View style={[styles.feedbackBannerIconBg, { backgroundColor: colors.primary + '25' }]}>
              <Bug size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.feedbackBannerTitle, { color: colors.text }]}>
                  Beta-Test Feedback
                </Text>
                <View style={{ backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 }}>
                  <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>TIPP</Text>
                </View>
              </View>
              <Text style={[styles.feedbackBannerText, { color: colors.textMuted }]}>
                Fehler entdeckt oder Idee für neue Prüfungsfragen? Tippe hier für direktes Feedback.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* LERNKARTE EINREICHEN BANNER */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => setCreateFactModalVisible(true)}
            style={[
              styles.contributeBanner,
              {
                backgroundColor: isDark ? '#1e293b' : '#eff6ff',
                borderColor: isDark ? '#334155' : '#bfdbfe',
              }
            ]}
          >
            <View style={[styles.contributeBannerIconBg, { backgroundColor: colors.primary + '25' }]}>
              <Plus size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.contributeBannerTitle, { color: colors.text }]}>
                  Lernkarte einreichen
                </Text>
                <View style={{ backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 }}>
                  <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>NEU</Text>
                </View>
              </View>
              <Text style={[styles.contributeBannerText, { color: colors.textMuted }]}>
                Wissen teilen: Reiche eigene Lernkarten ein – Ausbilder & Mods prüfen sie vor Freigabe.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* SUCHE-INPUT */}
          <View style={[styles.searchBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Lernkarten, Signale oder Regelwerke suchen..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* WENN SUCHANFRAGE AKTIV IST: ERGEBNISSE ANZEIGEN */}
          {searchQuery.trim().length > 0 ? (
            <View style={{ marginTop: 8 }}>
              {(() => {
                const query = searchQuery.trim().toLowerCase();
                const searchResults = facts.filter(f =>
                  f.isVerified === true && (
                    f.title.toLowerCase().includes(query) ||
                    f.content.toLowerCase().includes(query) ||
                    f.reference.toLowerCase().includes(query) ||
                    f.category.toLowerCase().includes(query)
                  )
                );

                return (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                        🔍 {searchResults.length} {searchResults.length === 1 ? 'Lernkarte gefunden' : 'Lernkarten gefunden'}
                      </Text>
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>Suche leeren</Text>
                      </TouchableOpacity>
                    </View>

                    {searchResults.length === 0 ? (
                      <View style={[styles.emptyBox, { paddingVertical: 40 }]}>
                        <HelpCircle size={40} color={colors.textMuted} />
                        <Text style={{ color: colors.text, marginTop: 10, fontWeight: 'bold' }}>
                          Keine Lernkarten für „{searchQuery}“ gefunden
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                          Probiere Begriffe wie z.B. „Bremsprobe“, „Signal“, „PZB“, „Anlage 5“ oder „Rangieren“.
                        </Text>
                      </View>
                    ) : (
                      <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : undefined}>
                        {searchResults.map((f, fIndex) => (
                          <FactCardItem
                            key={f.id}
                            fact={f}
                            index={fIndex}
                            isExpanded={!!expandedFactIds[f.id]}
                            isFavorite={favoriteFactIds.includes(f.id)}
                            onToggle={handleToggleFact}
                            onToggleFavorite={handleToggleFavorite}
                            onImagePress={handleImagePress}
                            colors={colors}
                            isDark={isDark}
                            showCategoryBadge={true}
                            containerStyle={isTablet ? { width: columns === 4 ? '23.4%' : (columns === 3 ? '31.8%' : '48.8%'), marginHorizontal: 0, marginBottom: 12 } : undefined}
                          />
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          ) : (
            /* STANDARD THEMEN-KATEGORIEN LISTE / GRID */
            <View style={[
              styles.listContainer,
              isTablet && {
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 14,
              }
            ]}>
              {categories.map((cat) => {
                const themeFacts = facts.filter(f => f.isVerified === true && f.category === cat.name);
                
                return (
                  <TouchableOpacity
                    key={cat.name}
                    delayPressIn={0}
                    style={[
                      styles.compactRow,
                      { 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border
                      },
                      isTablet && {
                        width: columns === 4 ? '23.4%' : (columns === 3 ? '31.8%' : '48.8%'),
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        padding: 16,
                        borderRadius: 14,
                        minHeight: 125,
                        justifyContent: 'space-between',
                      }
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.name);
                      setCurrentCardIndex(0);
                    }}
                  >
                    {isTablet ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <View style={[styles.rowIconBg, { backgroundColor: cat.color + '20', width: 44, height: 44, borderRadius: 12 }]}>
                            <CategoryIcon icon={cat.icon} size={24} color={cat.color} />
                          </View>
                          <View style={{
                            backgroundColor: colors.primary + '18',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}>
                            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                              {themeFacts.length} {themeFacts.length === 1 ? 'Karte' : 'Karten'}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowTitle, { color: colors.text, fontSize: 16, marginBottom: 4 }]}>{cat.name}</Text>
                          <Text style={[styles.rowDesc, { color: colors.textMuted, fontSize: 13, lineHeight: 18 }]} numberOfLines={2}>
                            {cat.desc}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Lernen starten</Text>
                          <ChevronRight size={14} color={colors.primary} />
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.rowLeft}>
                          <View style={[styles.rowIconBg, { backgroundColor: cat.color + '20' }]}>
                            <CategoryIcon icon={cat.icon} size={20} color={cat.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{cat.name}</Text>
                            <Text style={[styles.rowDesc, { color: colors.textMuted }]} numberOfLines={1}>
                              {cat.desc}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.rowRight}>
                          <Text style={[styles.rowQuestionCount, { color: colors.primary }]}>
                            {themeFacts.length} {themeFacts.length === 1 ? 'Lernkarte' : 'Lernkarten'}
                          </Text>
                          <ChevronRight size={16} color={colors.textMuted} />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        // --- THEMEN-DETAILANSICHT: LERNKARTEN ---
        <View style={{ flex: 1 }}>
          <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              delayPressIn={0}
              style={styles.backButton}
              onPress={() => {
                setSelectedCategory(null);
                setFavoritesOnly(false);
              }}
            >
              <ChevronLeft size={20} color={colors.primary} />
              <Text style={[styles.backButtonText, { color: colors.primary }]}>Themen</Text>
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedCategory}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {viewMode === 'list' && (
                <TouchableOpacity
                  delayPressIn={0}
                  onPress={() => setFavoritesOnly(prev => !prev)}
                  style={[
                    styles.headerFavFilterBtn,
                    favoritesOnly && {
                      backgroundColor: isDark ? '#854d0e40' : '#fef9c3',
                      borderColor: '#eab308',
                    }
                  ]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Favoriten filtern"
                >
                  <Star
                    size={14}
                    color={favoritesOnly ? '#eab308' : (categoryFavCount > 0 ? '#eab308' : colors.textMuted)}
                    fill={favoritesOnly || categoryFavCount > 0 ? '#eab308' : 'none'}
                  />
                  <Text style={[
                    styles.headerFavFilterText,
                    { color: favoritesOnly ? (isDark ? '#fde047' : '#a16207') : colors.textMuted },
                    favoritesOnly && { fontWeight: '700' }
                  ]}>
                    Favoriten
                  </Text>
                  {categoryFavCount > 0 && (
                    <View style={[
                      styles.favFilterBadge,
                      { backgroundColor: favoritesOnly ? '#eab308' : (isDark ? '#374151' : '#e5e7eb') }
                    ]}>
                      <Text style={[
                        styles.favFilterBadgeText,
                        { color: favoritesOnly ? '#000000' : colors.text }
                      ]}>
                        {categoryFavCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setCreateFactModalVisible(true)}
                style={[
                  styles.headerAddCardBtn,
                  { backgroundColor: colors.primary + '18', borderColor: colors.primary }
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Lernkarte einreichen"
              >
                <Plus size={14} color={colors.primary} />
                <Text style={[styles.headerAddCardBtnText, { color: colors.primary }]}>
                  + Karte
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {(() => {
            const categoryFacts = facts.filter(f => f.isVerified === true && f.category === selectedCategory);
            
            if (categoryFacts.length === 0) {
              return (
                <View style={styles.emptyBox}>
                  <HelpCircle size={48} color={colors.textMuted} />
                  <Text style={{ color: colors.text, marginTop: 12, fontWeight: 'bold' }}>
                    Noch keine Lernkarten eingetragen.
                  </Text>
                  <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 30, lineHeight: 18 }}>
                    Reiche jetzt die erste Lernkarte für dieses Thema ein! Ausbilder & Moderatoren prüfen und geben sie für alle Schüler frei.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setCreateFactModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                      Lernkarte einreichen
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            const currentFact = categoryFacts[Math.min(currentCardIndex, categoryFacts.length - 1)];

            return (
              <View style={{ flex: 1 }}>
                {/* MODUS-UMSCHALTER */}
                <View style={[
                  styles.viewModeToggle, 
                  { backgroundColor: isDark ? '#1f2937' : '#f3f4f6', borderColor: colors.border },
                  isTablet && { maxWidth: 560, width: '100%', alignSelf: 'center', marginVertical: 14 }
                ]}>
                  <TouchableOpacity
                    delayPressIn={0}
                    onPress={() => setViewMode('paging')}
                    style={[
                      styles.toggleBtn,
                      viewMode === 'paging' && { backgroundColor: isDark ? '#374151' : '#ffffff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 }
                    ]}
                  >
                    <Text style={[
                      styles.toggleBtnText,
                      { color: viewMode === 'paging' ? colors.primary : colors.textMuted, fontWeight: viewMode === 'paging' ? '700' : '500' }
                    ]}>
                      🗂️ Karten durchblättern
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    delayPressIn={0}
                    onPress={() => setViewMode('list')}
                    style={[
                      styles.toggleBtn,
                      viewMode === 'list' && { backgroundColor: isDark ? '#374151' : '#ffffff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 }
                    ]}
                  >
                    <Text style={[
                      styles.toggleBtnText,
                      { color: viewMode === 'list' ? colors.primary : colors.textMuted, fontWeight: viewMode === 'list' ? '700' : '500' }
                    ]}>
                      📋 Listenansicht ({favoritesOnly ? `${categoryFavCount} Fav.` : categoryFacts.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {viewMode === 'paging' ? (
                  // --- KARTEN DURCHBLÄTTERN (BLITZSCHNELL & INTUITIV) ---
                  <View style={{ flex: 1 }}>
                    {/* FORTSCHRITTSBALKEN & ZÄHLER */}
                    <View style={[
                      styles.pagingProgressContainer,
                      isTablet && { width: '100%', paddingHorizontal: 16 }
                    ]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                          Karte {currentCardIndex + 1} von {categoryFacts.length}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>
                          {Math.round(((currentCardIndex + 1) / categoryFacts.length) * 100)}%
                        </Text>
                      </View>
                      <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              backgroundColor: colors.primary, 
                              width: `${((currentCardIndex + 1) / categoryFacts.length) * 100}%` 
                            }
                          ]} 
                        />
                      </View>
                    </View>

                    {/* FOKUSSIERTE EINZELKARTE */}
                    <ScrollView 
                      ref={pagingScrollRef}
                      contentContainerStyle={[
                        styles.pagingCardScroll,
                        isTablet && { width: '100%', paddingBottom: 32 }
                      ]} 
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={[
                        styles.largeCard, 
                        { backgroundColor: colors.cardBg, borderColor: colors.border },
                        isTablet && { width: '100%', padding: 26 }
                      ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <View style={{
                            backgroundColor: colors.primary + '20',
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            borderRadius: 6,
                          }}>
                            <Text style={{ fontSize: isTablet ? 12 : 11, fontWeight: 'bold', color: colors.primary }}>
                              {selectedCategory}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                              delayPressIn={0}
                              onPress={() => handleToggleFavorite(currentFact.id)}
                              style={[
                                styles.starBtn,
                                {
                                  backgroundColor: favoriteFactIds.includes(currentFact.id) ? '#eab30822' : (isDark ? '#37415160' : '#f3f4f6'),
                                  borderColor: favoriteFactIds.includes(currentFact.id) ? '#eab30880' : 'transparent',
                                }
                              ]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel={favoriteFactIds.includes(currentFact.id) ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                              activeOpacity={0.6}
                            >
                              <Star
                                size={18}
                                color={favoriteFactIds.includes(currentFact.id) ? '#eab308' : (isDark ? '#9ca3af' : '#6b7280')}
                                fill={favoriteFactIds.includes(currentFact.id) ? '#eab308' : 'none'}
                              />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
                              #{currentCardIndex + 1}
                            </Text>
                          </View>
                        </View>

                        {isLandscapeTablet && currentFact.imageUrl ? (
                          /* QUERFORMAT TABLET: SPLIT-LAYOUT (TEXT LINKS, BILD RECHTS) */
                          <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start', marginTop: 4 }}>
                            <View style={{ flex: 1.15 }}>
                              <Text style={[styles.largeCardTitle, { color: colors.text, fontSize: 20, lineHeight: 26 }]}>
                                {cleanText(currentFact.title)}
                              </Text>
                              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
                              <Text style={[styles.largeCardContent, { color: isDark ? '#e5e7eb' : '#374151', fontSize: 15, lineHeight: 23 }]}>
                                {cleanText(currentFact.content)}
                              </Text>
                              <View style={[styles.factRefBox, { backgroundColor: isDark ? '#111827' : '#f9fafb', borderColor: isDark ? '#374151' : '#e5e7eb', marginTop: 14 }]}>
                                <Text style={[styles.factRefLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                  Regelwerk-Referenz:
                                </Text>
                                <Text style={[styles.factRefValue, { color: isDark ? '#93c5fd' : '#2563eb' }]}>
                                  {currentFact.reference}
                                </Text>
                              </View>
                            </View>

                            <View style={{ flex: 0.85 }}>
                              <TouchableOpacity
                                delayPressIn={0}
                                onPress={() => setPreviewImageUrl(currentFact.imageUrl!)}
                                activeOpacity={0.85}
                                style={{ position: 'relative' }}
                              >
                                <Image 
                                  source={{ uri: currentFact.imageUrl }} 
                                  style={[styles.largeCardImage, { height: 280, borderRadius: 12 }]} 
                                  resizeMode="contain" 
                                />
                                <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000bb' : '#ffffffdd' }]}>
                                  <Maximize2 size={13} color={colors.text} />
                                  <Text style={{ fontSize: 11, color: colors.text, fontWeight: 'bold', marginLeft: 4 }}>
                                    Tippen zum Vergrößern
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          /* STANDARD HOCHFORMAT ODER OHNE BILD */
                          <>
                            <Text style={[
                              styles.largeCardTitle, 
                              { color: colors.text },
                              isTablet && { fontSize: 21, lineHeight: 28 }
                            ]}>
                              {cleanText(currentFact.title)}
                            </Text>

                            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />

                            <Text style={[
                              styles.largeCardContent, 
                              { color: isDark ? '#e5e7eb' : '#374151' },
                              isTablet && { fontSize: 16, lineHeight: 25 }
                            ]}>
                              {cleanText(currentFact.content)}
                            </Text>

                            {currentFact.imageUrl && (
                              <TouchableOpacity
                                delayPressIn={0}
                                onPress={() => setPreviewImageUrl(currentFact.imageUrl!)}
                                activeOpacity={0.85}
                                style={{ position: 'relative', marginTop: 12, marginBottom: 16 }}
                              >
                                <Image 
                                  source={{ uri: currentFact.imageUrl }} 
                                  style={[styles.largeCardImage, isTablet && { height: 320 }]} 
                                  resizeMode="contain" 
                                />
                                <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000bb' : '#ffffffdd' }]}>
                                  <Maximize2 size={13} color={colors.text} />
                                  <Text style={{ fontSize: 11, color: colors.text, fontWeight: 'bold', marginLeft: 4 }}>
                                    Tippen zum Vergrößern
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            )}

                            <View style={[styles.factRefBox, { backgroundColor: isDark ? '#111827' : '#f9fafb', borderColor: isDark ? '#374151' : '#e5e7eb', marginTop: 12 }]}>
                              <Text style={[styles.factRefLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                                Regelwerk-Referenz:
                              </Text>
                              <Text style={[styles.factRefValue, { color: isDark ? '#93c5fd' : '#2563eb' }]}>
                                {currentFact.reference}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </ScrollView>

                    {/* BLÄTTER-NAVIGATION UNTEN */}
                    <View style={[
                      styles.pagingFooter, 
                      { backgroundColor: colors.cardBg, borderTopColor: colors.border },
                      isTablet && { justifyContent: 'center' }
                    ]}>
                      <View style={{ 
                        width: '100%', 
                        flexDirection: 'row', 
                        gap: 12,
                        paddingHorizontal: isTablet ? 16 : 0
                      }}>
                        <TouchableOpacity
                          delayPressIn={0}
                          disabled={currentCardIndex === 0}
                          onPress={handlePrevCard}
                          style={[
                            styles.pagingNavBtn,
                            { 
                              backgroundColor: isDark ? '#1f2937' : '#f3f4f6', 
                              opacity: currentCardIndex === 0 ? 0.3 : 1 
                            }
                          ]}
                        >
                          <ChevronLeft size={20} color={colors.text} />
                          <Text style={[styles.pagingNavBtnText, { color: colors.text }]}>Zurück</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          delayPressIn={0}
                          disabled={currentCardIndex === categoryFacts.length - 1}
                          onPress={() => handleNextCard(categoryFacts.length)}
                          style={[
                            styles.pagingNavBtn,
                            {
                              backgroundColor: currentCardIndex === categoryFacts.length - 1 ? (isDark ? '#1f2937' : colors.primary + '30') : colors.primary,
                              opacity: currentCardIndex === categoryFacts.length - 1 ? 0.4 : 1,
                            }
                          ]}
                        >
                          <Text style={[
                            styles.pagingNavBtnText, 
                            { color: currentCardIndex === categoryFacts.length - 1 ? colors.textMuted : '#ffffff' }
                          ]}>
                            Weiter
                          </Text>
                          <ChevronRight size={20} color={currentCardIndex === categoryFacts.length - 1 ? colors.textMuted : '#ffffff'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  // --- LISTENANSICHT (VIRTUALISIERT MIT FLATLIST FÜR MAXIMALE PERFORMANCE) ---
                  <View style={{ flex: 1 }}>
                    {/* FILTER-LEISTE OBEN IN DER LISTENANSICHT */}
                    <View style={[
                      styles.listFilterBar, 
                      isTablet && { maxWidth: 560, width: '100%', alignSelf: 'center' }
                    ]}>
                      <TouchableOpacity
                        delayPressIn={0}
                        onPress={() => setFavoritesOnly(false)}
                        style={[
                          styles.listFilterChip,
                          !favoritesOnly
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: colors.cardBg, borderColor: colors.border }
                        ]}
                      >
                        <Text style={[
                          styles.listFilterChipText,
                          { color: !favoritesOnly ? '#ffffff' : colors.textMuted, fontWeight: !favoritesOnly ? '700' : '500' }
                        ]}>
                          Alle ({categoryFacts.length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        delayPressIn={0}
                        onPress={() => setFavoritesOnly(true)}
                        style={[
                          styles.listFilterChip,
                          favoritesOnly
                            ? { backgroundColor: isDark ? '#854d0e40' : '#fef9c3', borderColor: '#eab308' }
                            : { backgroundColor: colors.cardBg, borderColor: colors.border }
                        ]}
                      >
                        <Star
                          size={14}
                          color={favoritesOnly ? '#ca8a04' : (categoryFavCount > 0 ? '#eab308' : colors.textMuted)}
                          fill={favoritesOnly || categoryFavCount > 0 ? '#eab308' : 'none'}
                        />
                        <Text style={[
                          styles.listFilterChipText,
                          { 
                            color: favoritesOnly ? (isDark ? '#fde047' : '#a16207') : colors.textMuted, 
                            fontWeight: favoritesOnly ? '700' : '500' 
                          }
                        ]}>
                          Nur Favoriten ({categoryFavCount})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {displayedListFacts.length === 0 ? (
                      <View style={[styles.emptyBox, { paddingVertical: 48, paddingHorizontal: 24 }]}>
                        <View style={{
                          width: 60,
                          height: 60,
                          borderRadius: 30,
                          backgroundColor: isDark ? '#854d0e30' : '#fef9c3',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 16,
                          borderWidth: 1.5,
                          borderColor: '#fde047',
                        }}>
                          <Star size={30} color="#ca8a04" fill="#fde047" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                          Keine Favoriten in dieser Kategorie
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                          Tippe bei einer Lernkarte auf das kleine Sternchen ⭐, um sie als Favorit zu markieren und hier schnell wiederzufinden.
                        </Text>
                        <TouchableOpacity
                          style={[styles.resetFilterBtn, { backgroundColor: colors.primary, marginTop: 18 }]}
                          onPress={() => setFavoritesOnly(false)}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                            Alle {categoryFacts.length} Lernkarten anzeigen
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <FlatList
                        key={isTablet ? (isLandscapeTablet ? 'tablet-landscape-grid' : 'tablet-portrait-grid') : 'phone-list'}
                        data={displayedListFacts}
                        keyExtractor={(item) => item.id}
                        numColumns={isTablet ? (isLandscapeTablet ? 3 : 2) : 1}
                        contentContainerStyle={[
                          styles.cardsScroll,
                          isTablet && { width: '100%', paddingHorizontal: 16 }
                        ]}
                        columnWrapperStyle={isTablet ? { gap: 12 } : undefined}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={8}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === 'android'}
                        renderItem={({ item: f, index: fIndex }) => (
                          <FactCardItem
                            fact={f}
                            index={fIndex}
                            isExpanded={!!expandedFactIds[f.id]}
                            isFavorite={favoriteFactIds.includes(f.id)}
                            onToggle={handleToggleFact}
                            onToggleFavorite={handleToggleFavorite}
                            onImagePress={handleImagePress}
                            colors={colors}
                            isDark={isDark}
                            containerStyle={isTablet ? { flex: 1, marginHorizontal: 0, marginBottom: 12 } : undefined}
                          />
                        )}
                      />
                    )}
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      )}

      {/* BILD-VERGRÖSSERUNGS-MODAL (LIGHTBOX) */}
      <Modal
        visible={!!previewImageUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseBackdrop} 
            onPress={() => setPreviewImageUrl(null)} 
            activeOpacity={1}
          />
          
          <View style={styles.lightboxContainer}>
            <TouchableOpacity 
              style={styles.lightboxCloseBtn}
              onPress={() => setPreviewImageUrl(null)}
            >
              <X size={22} color="#ffffff" />
            </TouchableOpacity>

            {previewImageUrl && (
              <Image 
                source={{ uri: previewImageUrl }} 
                style={styles.lightboxImage} 
                resizeMode="contain" 
              />
            )}
          </View>
        </View>
      </Modal>

      {/* LERNKARTE EINREICHEN MODAL */}
      <CreateFactModal
        visible={createFactModalVisible}
        onClose={() => setCreateFactModalVisible(false)}
        onSuccess={() => loadData()}
        categories={categories}
        defaultCategory={selectedCategory || undefined}
        currentUser={currentUser}
      />
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileActionBtn: {
    padding: 6,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmojiText: {
    fontSize: 22,
  },
  profileName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 6,
  },
  profileEditorPanel: {
    padding: 16,
    paddingBottom: 20,
  },
  editorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  editorInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  avatarPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  avatarPresetChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  editorBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  editorCancelBtn: {
    borderWidth: 1,
  },
  editorSaveBtn: {
    backgroundColor: '#2563eb',
  },
  galleryPickBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContainer: {
    gap: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIconBg: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  rowDesc: {
    fontSize: 11,
    marginTop: 2,
    paddingRight: 10,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowQuestionCount: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 6,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardsScroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  factCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  cardIndexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  factIndex: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  factTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  factContentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  factImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
  },
  factRefBox: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  factRefLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  factRefValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lightboxContainer: {
    width: '94%',
    height: '85%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1f2937cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  viewModeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnText: {
    fontSize: 13,
  },
  pagingProgressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pagingCardScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  largeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  largeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  largeCardContent: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 8,
  },
  largeCardImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  pagingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  pagingNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  pagingNavBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  feedbackBannerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackBannerText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  contributeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  contributeBannerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  contributeBannerText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  headerAddCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerAddCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  starBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerFavFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  headerFavFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  favFilterBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favFilterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  listFilterBar: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  listFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  listFilterChipText: {
    fontSize: 12,
  },
  resetFilterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 20,
  },
});
