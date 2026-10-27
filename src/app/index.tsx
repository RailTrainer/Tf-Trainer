import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  DeviceEventEmitter,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockDb, Question, Category, User, Fact, SignalSubcategory, getFactSignalSubcategory, sortSignalFacts, getFactImageUrls } from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import * as Icons from 'lucide-react-native';
import CategoryIcon from '../components/CategoryIcon';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Maximize2, 
  X, 
  Search, 
  Star, 
  Plus,
  BookOpen
} from 'lucide-react-native';
import { AppKeyboardPane } from '../components/ui/AppKeyboardPane';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { CreateFactModal } from '../components/CreateFactModal';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Section';
import { Tabs } from '../components/ui/Tabs';
import { RADIUS, SCREEN_PADDING, CONTENT_MAX_WIDTH, MIN_TOUCH_TARGET } from '../components/ui/tokens';

function cleanText(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1');
}

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
          accessibilityRole="button"
          accessibilityLabel={`${cleanText(fact.title)}, Details ${isExpanded ? 'einklappen' : 'ausklappen'}`}
        >
          <View style={[styles.cardIndexRow, { alignItems: 'center', gap: 6, marginBottom: 4 }]}>
            {showCategoryBadge && (
              <View style={{
                backgroundColor: colors.primary + '18',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                alignSelf: 'flex-start'
              }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
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
              accessibilityRole="button"
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
            style={[styles.expandIconBg, { backgroundColor: isExpanded ? colors.primary + '18' : 'transparent' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? "Einklappen" : "Ausklappen"}
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
          <Text style={[styles.factContentText, { color: colors.text }]}>
            {cleanText(fact.content)}
          </Text>

          {(() => {
            const images = getFactImageUrls(fact);
            if (images.length === 0) return null;
            if (images.length === 1) {
              return (
                <TouchableOpacity
                  delayPressIn={0}
                  onPress={() => onImagePress(images[0])}
                  activeOpacity={0.85}
                  style={{ position: 'relative', marginTop: 8, marginBottom: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Bild vergrößern"
                >
                  <Image source={{ uri: images[0] }} style={styles.factImage} resizeMode="contain" />
                  <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000cc' : '#ffffffdd' }]}>
                    <Maximize2 size={13} color={colors.text} />
                    <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600', marginLeft: 4 }}>
                      Tippen zum Vergrößern
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <View style={{ marginTop: 10, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6, fontWeight: '600' }}>
                  🖼️ {images.length} Bilder (wischen zum Durchsehen):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {images.map((imgUrl, imgIdx) => (
                    <TouchableOpacity
                      key={imgIdx}
                      delayPressIn={0}
                      onPress={() => onImagePress(imgUrl)}
                      activeOpacity={0.85}
                      style={{ 
                        position: 'relative', 
                        width: 220, 
                        height: 150, 
                        borderRadius: 8, 
                        overflow: 'hidden', 
                        backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: colors.border
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Bild ${imgIdx + 1} vergrößern`}
                    >
                      <Image source={{ uri: imgUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                      <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: '#00000088', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>
                          {imgIdx + 1} / {images.length}
                        </Text>
                      </View>
                      <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000cc' : '#ffffffdd' }]}>
                        <Maximize2 size={11} color={colors.text} />
                        <Text style={{ fontSize: 10, color: colors.text, fontWeight: '600', marginLeft: 3 }}>
                          Vergrößern
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            );
          })()}

          <View style={[styles.factRefBox, { backgroundColor: isDark ? '#1f293750' : '#f8fafc', borderColor: colors.border }]}>
            <Text style={[styles.factRefLabel, { color: colors.textMuted }]}>
              Regelwerk-Referenz
            </Text>
            <Text style={[styles.factRefValue, { color: colors.primary }]}>
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
  const screenBg = isDark ? colors.background : colors.cardBg;
  // Tastatur-Fixierung über AppKeyboardPane
  const { isTablet, isLandscape, isLandscapeTablet, columns } = useDeviceLayout();

  // States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [signalSubcategories, setSignalSubcategories] = useState<SignalSubcategory[]>([]);
  const [selectedSignalSubcategory, setSelectedSignalSubcategory] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<{ [questionId: string]: number }>({});
  const [expandedFactIds, setExpandedFactIds] = useState<{ [id: string]: boolean }>({});
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'paging' | 'list'>('paging');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [favoriteFactIds, setFavoriteFactIds] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [createFactModalVisible, setCreateFactModalVisible] = useState(false);

  const rawCategoryFacts = selectedCategory
    ? facts.filter(f => {
        if (f.isVerified !== true || f.category !== selectedCategory) return false;
        if (selectedCategory === 'Signale' && selectedSignalSubcategory && selectedSignalSubcategory !== 'all') {
          return getFactSignalSubcategory(f) === selectedSignalSubcategory;
        }
        return true;
      })
    : [];
  const categoryFacts = selectedCategory === 'Signale'
    ? sortSignalFacts(rawCategoryFacts, selectedSignalSubcategory && selectedSignalSubcategory !== 'all' ? selectedSignalSubcategory : undefined)
    : rawCategoryFacts;
  const categoryFavorites = categoryFacts.filter(f => favoriteFactIds.includes(f.id));
  const categoryFavCount = categoryFavorites.length;
  const displayedListFacts = favoritesOnly ? categoryFavorites : categoryFacts;

  const pagingScrollRef = useRef<ScrollViewInstance>(null);

  // Zurück zur Hauptübersicht beim erneuten/doppelten Tippen auf den Tab "Lernen"
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tabReset', (tabName: string) => {
      if (tabName === 'index') {
        setSelectedCategory(null);
        setSelectedSignalSubcategory(null);
        setFavoritesOnly(false);
        setSearchQuery('');
      }
    });
    return () => sub.remove();
  }, []);

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
      const allSigSubs = await mockDb.getSignalSubcategories();
      setSignalSubcategories(allSigSubs);
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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: screenBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: screenBg }]}>
      <AppKeyboardPane style={{ flex: 1 }}>

      {selectedCategory === null ? (
        // --- HAUPTÜBERSICHT: THEMENBEREICHE & SUCHE ---
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer, 
            { paddingBottom: 32 },
            { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }
          ]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Heading level={1} style={styles.welcomeTitle}>
            Wähle ein Thema zum Lernen
          </Heading>
          <Text style={[styles.welcomeSubtitle, { color: colors.textMuted }]}>
            Lerne wichtige Fachinhalte und Grundlagen mit Lernkarten inklusive direkter Quellenangabe zum Regelwerk.
          </Text>

          {/* LERNKARTE EINREICHEN AKTION */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCreateFactModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Lernkarte einreichen"
            style={[
              styles.contributeCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
              }
            ]}
          >
            <View style={[styles.contributeIconBg, { backgroundColor: colors.buttonPrimaryBg + '15' }]}>
              <Plus size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.contributeTitle, { color: colors.text }]}>
                Lernkarte einreichen
              </Text>
              <Text style={[styles.contributeText, { color: colors.textMuted }]}>
                Wissen teilen: Reiche eigene Lernkarten ein – Ausbilder & Moderatoren prüfen sie vor Freigabe.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* SUCHE-INPUT */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Lernkarten, Signale oder Regelwerke suchen …"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')} 
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Suche leeren"
              >
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
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                        {searchResults.length} {searchResults.length === 1 ? 'Lernkarte gefunden' : 'Lernkarten gefunden'}
                      </Text>
                      <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>Suche leeren</Text>
                      </TouchableOpacity>
                    </View>

                    {searchResults.length === 0 ? (
                      <View style={[styles.emptyBox, { paddingVertical: 40 }]}>
                        <HelpCircle size={40} color={colors.textMuted} />
                        <Text style={{ color: colors.text, marginTop: 12, fontWeight: '600', fontSize: 15 }}>
                          Keine Lernkarten für „{searchQuery}“ gefunden
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
                          Probiere Begriffe wie z. B. „Bremsprobe“, „Signal“, „PZB“, „Anlage 5“ oder „Rangieren“.
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
                gap: 12,
              }
            ]}>
              {categories.map((cat) => {
                const themeFacts = facts.filter(f => f.isVerified === true && f.category === cat.name);
                
                return (
                  <TouchableOpacity
                    key={cat.name}
                    delayPressIn={0}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.name}, ${themeFacts.length} Lernkarten`}
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
                        borderRadius: RADIUS,
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
                          <View style={[styles.rowIconBg, { backgroundColor: cat.imageUrl ? 'transparent' : cat.color + '20', width: 48, height: 48, overflow: 'hidden' }]}>
                            <CategoryIcon icon={cat.icon} imageUrl={cat.imageUrl} size={cat.imageUrl ? 48 : 24} color={cat.color} style={cat.imageUrl ? { width: '100%', height: '100%' } : undefined} />
                          </View>
                          <View style={{
                            backgroundColor: colors.primary + '18',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 4,
                          }}>
                            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
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
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Lernen starten</Text>
                          <ChevronRight size={14} color={colors.primary} />
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.rowLeft}>
                          <View style={[styles.rowIconBg, { backgroundColor: cat.imageUrl ? 'transparent' : cat.color + '20', width: 44, height: 44, overflow: 'hidden' }]}>
                            <CategoryIcon icon={cat.icon} imageUrl={cat.imageUrl} size={cat.imageUrl ? 44 : 22} color={cat.color} style={cat.imageUrl ? { width: '100%', height: '100%' } : undefined} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.rowTitle, { color: colors.text }]}>{cat.name}</Text>
                            <Text style={[styles.rowDesc, { color: colors.textMuted }]} numberOfLines={1}>
                              {cat.desc}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.rowRight}>
                          <Text style={[styles.rowQuestionCount, { color: colors.textMuted }]}>
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
      ) : selectedCategory === 'Signale' && selectedSignalSubcategory === null ? (
        // --- UNTERKATEGORIE ÜBERSICHT (SIGNALE) ---
        <View style={{ flex: 1 }}>
          <View style={[styles.detailHeader, { borderBottomColor: colors.border, backgroundColor: screenBg }]}>
            <TouchableOpacity 
              delayPressIn={0}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Zurück zur Themenauswahl"
              onPress={() => {
                setSelectedCategory(null);
                setFavoritesOnly(false);
              }}
            >
              <ChevronLeft size={22} color={colors.primary} />
              <Text style={[styles.backButtonText, { color: colors.primary }]}>Themen</Text>
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>
              Signale
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Button
                variant="secondary"
                icon={Plus}
                title="Karte"
                onPress={() => setCreateFactModalVisible(true)}
                style={{ height: 36, minHeight: 36, paddingHorizontal: 12, paddingVertical: 0 }}
              />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContainer,
              { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Heading level={2} style={{ marginBottom: 6 }}>
              Signal-Bereiche
            </Heading>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
              Wähle eine Unterkategorie aus, um alle zugehörigen Signale gezielt durchzublättern:
            </Text>

            {/* ALLE SIGNALE KARTE */}
            {(() => {
              const allSignalFacts = facts.filter(f => f.isVerified === true && f.category === 'Signale');
              return (
                <TouchableOpacity
                  delayPressIn={0}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Alle Signale, ${allSignalFacts.length} Signale`}
                  style={[
                    styles.compactRow,
                    { 
                      backgroundColor: colors.cardBg,
                      borderColor: colors.primary,
                      borderWidth: 1.5,
                      marginBottom: 10,
                    }
                  ]}
                  onPress={() => {
                    setSelectedSignalSubcategory('all');
                    setCurrentCardIndex(0);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIconBg, { backgroundColor: colors.primary + '20' }]}>
                      <BookOpen size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.text, fontWeight: '700' }]}>
                        Alle Signale durchblättern
                      </Text>
                      <Text style={[styles.rowDesc, { color: colors.textMuted }]} numberOfLines={1}>
                        Gesamtes Signalbuch mit allen Signalbildern & Bedeutungen
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowQuestionCount, { color: colors.primary, fontWeight: '600' }]}>
                      {allSignalFacts.length} {allSignalFacts.length === 1 ? 'Signal' : 'Signale'}
                    </Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* UNTERKATEGORIEN LISTE */}
            <View style={{ gap: 8, marginTop: 4 }}>
              {signalSubcategories.map((subcat) => {
                const subFacts = facts.filter(
                  f => f.isVerified === true && f.category === 'Signale' && getFactSignalSubcategory(f) === subcat.name
                );

                return (
                  <TouchableOpacity
                    key={subcat.id || subcat.name}
                    delayPressIn={0}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${subcat.name}, ${subFacts.length} Signale`}
                    style={[
                      styles.compactRow,
                      { 
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => {
                      setSelectedSignalSubcategory(subcat.name);
                      setCurrentCardIndex(0);
                    }}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.rowIconBg, { backgroundColor: subcat.imageUrl ? 'transparent' : (subcat.color || colors.primary) + '20', width: 44, height: 44, overflow: 'hidden' }]}>
                        <CategoryIcon icon={subcat.icon || 'Bookmark'} imageUrl={subcat.imageUrl} size={subcat.imageUrl ? 44 : 22} color={subcat.color || colors.primary} style={subcat.imageUrl ? { width: '100%', height: '100%' } : undefined} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>{subcat.name}</Text>
                        {!!subcat.desc && (
                          <Text style={[styles.rowDesc, { color: colors.textMuted }]} numberOfLines={1}>
                            {subcat.desc}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.rowRight}>
                      <Text style={[styles.rowQuestionCount, { color: colors.textMuted }]}>
                        {subFacts.length} {subFacts.length === 1 ? 'Signal' : 'Signale'}
                      </Text>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : (
        // --- THEMEN-DETAILANSICHT: LERNKARTEN ---
        <View style={{ flex: 1 }}>
          <View style={[styles.detailHeader, { borderBottomColor: colors.border, backgroundColor: screenBg }]}>
            <TouchableOpacity 
              delayPressIn={0}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={selectedCategory === 'Signale' ? 'Zurück zu Signal-Bereichen' : 'Zurück zur Themenauswahl'}
              onPress={() => {
                if (selectedCategory === 'Signale') {
                  setSelectedSignalSubcategory(null);
                } else {
                  setSelectedCategory(null);
                  setFavoritesOnly(false);
                }
              }}
            >
              <ChevronLeft size={22} color={colors.primary} />
              <Text style={[styles.backButtonText, { color: colors.primary }]}>
                {selectedCategory === 'Signale' ? 'Signale' : 'Themen'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedCategory === 'Signale'
                ? (selectedSignalSubcategory === 'all' ? 'Alle Signale' : selectedSignalSubcategory)
                : selectedCategory}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {viewMode === 'list' && (
                <TouchableOpacity
                  delayPressIn={0}
                  onPress={() => setFavoritesOnly(prev => !prev)}
                  style={[
                    styles.headerFavFilterBtn,
                    { borderColor: favoritesOnly ? '#eab308' : colors.border },
                    favoritesOnly && {
                      backgroundColor: isDark ? '#854d0e30' : '#fef9c3',
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

              <Button
                variant="secondary"
                icon={Plus}
                title="Karte"
                onPress={() => setCreateFactModalVisible(true)}
                style={{ height: 36, minHeight: 36, paddingHorizontal: 12, paddingVertical: 0 }}
              />
            </View>
          </View>

          {(() => {
            if (categoryFacts.length === 0) {
              return (
                <View style={styles.emptyBox}>
                  <HelpCircle size={44} color={colors.textMuted} />
                  <Text style={{ color: colors.text, marginTop: 12, fontWeight: '600', fontSize: 16 }}>
                    Noch keine Lernkarten eingetragen.
                  </Text>
                  <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 6, paddingHorizontal: 30, lineHeight: 20, fontSize: 14 }}>
                    Reiche jetzt die erste Lernkarte für dieses Thema ein! Ausbilder & Moderatoren prüfen und geben sie für alle Schüler frei.
                  </Text>
                  <Button
                    variant="primary"
                    icon={Plus}
                    title="Lernkarte einreichen"
                    onPress={() => setCreateFactModalVisible(true)}
                    style={{ marginTop: 20 }}
                  />
                </View>
              );
            }

            const currentFact = categoryFacts[Math.min(currentCardIndex, categoryFacts.length - 1)];

            return (
              <View style={{ flex: 1 }}>
                {/* MODUS-UMSCHALTER MIT STANDARD UI TABS */}
                <View style={[styles.tabsWrapper, isTablet && { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }]}>
                  <Tabs
                    items={[
                      { key: 'paging', label: 'Karten durchblättern' },
                      { key: 'list', label: 'Listenansicht', count: favoritesOnly ? categoryFavCount : categoryFacts.length },
                    ]}
                    selectedKey={viewMode}
                    onSelect={(key) => setViewMode(key as 'paging' | 'list')}
                    accessibilityLabel="Lernmodus"
                  />
                </View>

                {viewMode === 'paging' ? (
                  // --- KARTEN DURCHBLÄTTERN ---
                  <View style={{ flex: 1 }}>
                    {/* FORTSCHRITTSBALKEN & ZÄHLER */}
                    <View style={[
                      styles.pagingProgressContainer,
                      { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }
                    ]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                          Karte {currentCardIndex + 1} von {categoryFacts.length}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>
                          {Math.round(((currentCardIndex + 1) / categoryFacts.length) * 100)} %
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
                        { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }
                      ]} 
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={[
                        styles.largeCard, 
                        { backgroundColor: colors.cardBg, borderColor: colors.border },
                        isTablet && { width: '100%', padding: 24 }
                      ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <View style={{
                            backgroundColor: colors.primary + '18',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
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
                              accessibilityRole="button"
                              accessibilityLabel={favoriteFactIds.includes(currentFact.id) ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                              activeOpacity={0.6}
                            >
                              <Star
                                size={18}
                                color={favoriteFactIds.includes(currentFact.id) ? '#eab308' : (isDark ? '#9ca3af' : '#6b7280')}
                                fill={favoriteFactIds.includes(currentFact.id) ? '#eab308' : 'none'}
                              />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>
                              #{currentCardIndex + 1}
                            </Text>
                          </View>
                        </View>

                        {isLandscapeTablet && getFactImageUrls(currentFact).length > 0 ? (
                          /* QUERFORMAT TABLET: SPLIT-LAYOUT */
                          <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start', marginTop: 4 }}>
                            <View style={{ flex: 1.15 }}>
                              <Text style={[styles.largeCardTitle, { color: colors.text, fontSize: 20, lineHeight: 26 }]}>
                                {cleanText(currentFact.title)}
                              </Text>
                              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
                              <Text style={[styles.largeCardContent, { color: colors.text, fontSize: 15, lineHeight: 24 }]}>
                                {cleanText(currentFact.content)}
                              </Text>
                              <View style={[styles.factRefBox, { backgroundColor: isDark ? '#1f293750' : '#f8fafc', borderColor: colors.border, marginTop: 14 }]}>
                                <Text style={[styles.factRefLabel, { color: colors.textMuted }]}>
                                  Regelwerk-Referenz
                                </Text>
                                <Text style={[styles.factRefValue, { color: colors.primary }]}>
                                  {currentFact.reference}
                                </Text>
                              </View>
                            </View>

                            <View style={{ flex: 0.85 }}>
                              {(() => {
                                const factImages = getFactImageUrls(currentFact);
                                if (factImages.length === 1) {
                                  return (
                                    <TouchableOpacity
                                      delayPressIn={0}
                                      onPress={() => setPreviewImageUrl(factImages[0])}
                                      activeOpacity={0.85}
                                      style={{ position: 'relative' }}
                                      accessibilityRole="button"
                                      accessibilityLabel="Bild vergrößern"
                                    >
                                      <Image 
                                        source={{ uri: factImages[0] }} 
                                        style={[styles.largeCardImage, { height: 280 }]} 
                                        resizeMode="contain" 
                                      />
                                      <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000cc' : '#ffffffdd' }]}>
                                        <Maximize2 size={13} color={colors.text} />
                                        <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600', marginLeft: 4 }}>
                                          Tippen zum Vergrößern
                                        </Text>
                                      </View>
                                    </TouchableOpacity>
                                  );
                                }
                                return (
                                  <View>
                                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: '600' }}>
                                      🖼️ {factImages.length} Bilder (wischen zum Durchsehen):
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                      {factImages.map((img, idx) => (
                                        <TouchableOpacity
                                          key={idx}
                                          delayPressIn={0}
                                          onPress={() => setPreviewImageUrl(img)}
                                          activeOpacity={0.85}
                                          style={{ position: 'relative', width: 280, height: 260, borderRadius: 8, overflow: 'hidden', backgroundColor: isDark ? '#1f2937' : '#f1f5f9', borderWidth: 1, borderColor: colors.border }}
                                        >
                                          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                          <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: '#00000088', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                            <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>{idx + 1} / {factImages.length}</Text>
                                          </View>
                                          <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000cc' : '#ffffffdd' }]}>
                                            <Maximize2 size={11} color={colors.text} />
                                            <Text style={{ fontSize: 10, color: colors.text, fontWeight: '600', marginLeft: 3 }}>Vergrößern</Text>
                                          </View>
                                        </TouchableOpacity>
                                      ))}
                                    </ScrollView>
                                  </View>
                                );
                              })()}
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

                            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />

                            <Text style={[
                              styles.largeCardContent, 
                              { color: colors.text },
                              isTablet && { fontSize: 16, lineHeight: 25 }
                            ]}>
                              {cleanText(currentFact.content)}
                            </Text>

                            {(() => {
                              const factImages = getFactImageUrls(currentFact);
                              if (factImages.length === 0) return null;
                              if (factImages.length === 1) {
                                return (
                                  <TouchableOpacity
                                    delayPressIn={0}
                                    onPress={() => setPreviewImageUrl(factImages[0])}
                                    activeOpacity={0.85}
                                    style={{ position: 'relative', marginTop: 12, marginBottom: 16 }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Bild vergrößern"
                                  >
                                    <Image 
                                      source={{ uri: factImages[0] }} 
                                      style={[styles.largeCardImage, isTablet && { height: 320 }]} 
                                      resizeMode="contain" 
                                    />
                                    <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000cc' : '#ffffffdd' }]}>
                                      <Maximize2 size={13} color={colors.text} />
                                      <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600', marginLeft: 4 }}>
                                        Tippen zum Vergrößern
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              }

                              return (
                                <View style={{ marginTop: 14, marginBottom: 16 }}>
                                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8, fontWeight: '600' }}>
                                    🖼️ {factImages.length} Bilder (wischen zum Durchsehen):
                                  </Text>
                                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                    {factImages.map((img, idx) => (
                                      <TouchableOpacity
                                        key={idx}
                                        delayPressIn={0}
                                        onPress={() => setPreviewImageUrl(img)}
                                        activeOpacity={0.85}
                                        style={{ 
                                          position: 'relative', 
                                          width: isTablet ? 340 : 260, 
                                          height: isTablet ? 260 : 200, 
                                          borderRadius: 8, 
                                          overflow: 'hidden', 
                                          backgroundColor: isDark ? '#1f2937' : '#f1f5f9',
                                          borderWidth: 1,
                                          borderColor: colors.border
                                        }}
                                      >
                                        <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                        <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: '#00000088', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                          <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>{idx + 1} / {factImages.length}</Text>
                                        </View>
                                        <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000cc' : '#ffffffdd' }]}>
                                          <Maximize2 size={11} color={colors.text} />
                                          <Text style={{ fontSize: 10, color: colors.text, fontWeight: '600', marginLeft: 3 }}>Vergrößern</Text>
                                        </View>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              );
                            })()}

                            <View style={[styles.factRefBox, { backgroundColor: isDark ? '#1f293750' : '#f8fafc', borderColor: colors.border, marginTop: 12 }]}>
                              <Text style={[styles.factRefLabel, { color: colors.textMuted }]}>
                                Regelwerk-Referenz
                              </Text>
                              <Text style={[styles.factRefValue, { color: colors.primary }]}>
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
                      { backgroundColor: screenBg, borderTopColor: colors.border }
                    ]}>
                      <View style={{ 
                        width: '100%', 
                        maxWidth: CONTENT_MAX_WIDTH,
                        alignSelf: 'center',
                        flexDirection: 'row', 
                        gap: 12,
                      }}>
                        <Button
                          variant="secondary"
                          icon={ChevronLeft}
                          title="Zurück"
                          disabled={currentCardIndex === 0}
                          onPress={handlePrevCard}
                          style={{ flex: 1 }}
                        />

                        <Button
                          variant="primary"
                          icon={ChevronRight}
                          title="Weiter"
                          disabled={currentCardIndex === categoryFacts.length - 1}
                          onPress={() => handleNextCard(categoryFacts.length)}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  // --- LISTENANSICHT ---
                  <View style={{ flex: 1 }}>
                    {/* FILTER-LEISTE OBEN IN DER LISTENANSICHT */}
                    <View style={[
                      styles.listFilterBar, 
                      { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }
                    ]}>
                      <TouchableOpacity
                        delayPressIn={0}
                        onPress={() => setFavoritesOnly(false)}
                        accessibilityRole="button"
                        style={[
                          styles.listFilterChip,
                          !favoritesOnly
                            ? { backgroundColor: colors.buttonPrimaryBg, borderColor: colors.buttonPrimaryBg }
                            : { backgroundColor: colors.cardBg, borderColor: colors.border }
                        ]}
                      >
                        <Text style={[
                          styles.listFilterChipText,
                          { color: !favoritesOnly ? colors.buttonPrimaryText : colors.textMuted, fontWeight: !favoritesOnly ? '600' : '500' }
                        ]}>
                          Alle ({categoryFacts.length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        delayPressIn={0}
                        onPress={() => setFavoritesOnly(true)}
                        accessibilityRole="button"
                        style={[
                          styles.listFilterChip,
                          favoritesOnly
                            ? { backgroundColor: isDark ? '#854d0e30' : '#fef9c3', borderColor: '#eab308' }
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
                            fontWeight: favoritesOnly ? '600' : '500' 
                          }
                        ]}>
                          Nur Favoriten ({categoryFavCount})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {displayedListFacts.length === 0 ? (
                      <View style={[styles.emptyBox, { paddingVertical: 48, paddingHorizontal: 24 }]}>
                        <View style={{
                          width: 56,
                          height: 56,
                          borderRadius: RADIUS,
                          backgroundColor: isDark ? '#854d0e30' : '#fef9c3',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 16,
                          borderWidth: 1,
                          borderColor: '#fde047',
                        }}>
                          <Star size={28} color="#ca8a04" fill="#fde047" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                          Keine Favoriten in dieser Kategorie
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                          Tippe bei einer Lernkarte auf das Stern-Symbol, um sie als Favorit zu markieren und hier schnell wiederzufinden.
                        </Text>
                        <Button
                          variant="primary"
                          title={`Alle ${categoryFacts.length} Lernkarten anzeigen`}
                          onPress={() => setFavoritesOnly(false)}
                          style={{ marginTop: 18 }}
                        />
                      </View>
                    ) : (
                      <FlatList
                        key={isTablet ? (isLandscapeTablet ? 'tablet-landscape-grid' : 'tablet-portrait-grid') : 'phone-list'}
                        data={displayedListFacts}
                        keyExtractor={(item) => item.id}
                        numColumns={isTablet ? (isLandscapeTablet ? 3 : 2) : 1}
                        contentContainerStyle={[
                          styles.cardsScroll,
                          { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center', paddingHorizontal: SCREEN_PADDING }
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
            accessibilityRole="button"
            accessibilityLabel="Vollbild schließen"
          />
          
          <View style={styles.lightboxContainer}>
            <TouchableOpacity 
              style={styles.lightboxCloseBtn}
              onPress={() => setPreviewImageUrl(null)}
              accessibilityRole="button"
              accessibilityLabel="Schließen"
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
    </AppKeyboardPane>
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
  scrollContainer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
    paddingBottom: 32,
  },
  welcomeTitle: {
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  contributeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS,
    borderWidth: 1,
    marginBottom: 16,
  },
  contributeIconBg: {
    width: 40,
    height: 40,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  contributeText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  listContainer: {
    gap: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: RADIUS,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowDesc: {
    fontSize: 13,
    marginTop: 2,
    paddingRight: 10,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowQuestionCount: {
    fontSize: 13,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: SCREEN_PADDING,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginHorizontal: 8,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    paddingHorizontal: SCREEN_PADDING,
  },
  cardsScroll: {
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: SCREEN_PADDING,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  factCard: {
    borderRadius: RADIUS,
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
    fontSize: 12,
    fontWeight: '600',
  },
  factTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 21,
  },
  factContentText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  factImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS,
    marginBottom: 12,
  },
  factRefBox: {
    padding: 12,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  factRefLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  factRefValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  starBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  expandIconBg: {
    width: 36,
    height: 36,
    borderRadius: RADIUS,
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
    borderRadius: 4,
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
  pagingProgressContainer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  pagingCardScroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 24,
  },
  largeCard: {
    borderRadius: RADIUS,
    borderWidth: 1,
    padding: 20,
  },
  largeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
  },
  largeCardContent: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  largeCardImage: {
    width: '100%',
    height: 220,
    borderRadius: RADIUS,
  },
  pagingFooter: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  headerFavFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  headerFavFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  favFilterBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favFilterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listFilterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 12,
    alignItems: 'center',
  },
  listFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  listFilterChipText: {
    fontSize: 13,
  },
});
