import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  LayoutAnimation,
  Platform,
  DeviceEventEmitter,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  mockDb, 
  Question, 
  QuizAttempt, 
  Category, 
  User, 
  getQuestionCorrectIndices, 
  isQuestionAnswerCorrect, 
  generateAntiIdentityShuffle, 
  shuffleQuestionOptions 
} from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { CreateQuestionModal } from '../components/CreateQuestionModal';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Section';
import { RADIUS, SCREEN_PADDING, CONTENT_MAX_WIDTH, MIN_TOUCH_TARGET } from '../components/ui/tokens';
import { 
  Award, 
  Play, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Maximize2, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Shuffle,
  GripVertical,
  X,
  Plus
} from 'lucide-react-native';

const PASS_PERCENTAGE = 70; // Lokführerprüfung verlangt 70% zum Bestehen

const triggerReorderAnimation = () => {
  try {
    LayoutAnimation.configureNext({
      duration: 450,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  } catch (e) {
    // fallback
  }
};

function DropLineIndicator({ active }: { active: boolean }) {
  if (!active) {
    return <View style={{ height: 4 }} />;
  }
  return (
    <View style={styles.dropLineContainer}>
      <View style={styles.dropLineDot} />
      <View style={styles.dropLineBar} />
      <View style={styles.dropLineDot} />
    </View>
  );
}

function cleanText(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1');
}

function DraggableOrderItem({
  slotIdx,
  origOptIdx,
  stepText,
  totalCount,
  hasAnswered,
  isSlotCorrect,
  colors,
  isDark,
  onMoveStep,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDraggingThis,
  draggingSlot
}: {
  slotIdx: number;
  origOptIdx: number;
  stepText: string;
  totalCount: number;
  hasAnswered: boolean;
  isSlotCorrect: boolean;
  colors: any;
  isDark: boolean;
  onMoveStep: (slotIdx: number, direction: 'up' | 'down') => void;
  onDragStart: (slotIdx: number) => void;
  onDragMove: (slotIdx: number, dy: number) => void;
  onDragEnd: (slotIdx: number, dy: number) => void;
  isDraggingThis: boolean;
  draggingSlot: number | null;
}) {
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isDraggingThis) {
      panY.stopAnimation();
      panY.setValue(0);
    }
  }, [isDraggingThis]);

  const handleArrowUp = () => {
    if (slotIdx > 0 && !hasAnswered) {
      onMoveStep(slotIdx, 'up');
    }
  };

  const handleArrowDown = () => {
    if (slotIdx < totalCount - 1 && !hasAnswered) {
      onMoveStep(slotIdx, 'down');
    }
  };

  let itemBorderColor = colors.border;
  let itemBg = colors.cardBg;
  let badgeBg = isDark ? '#1f2937' : '#f3f4f6';
  let badgeTextColor = colors.textMuted;
  let statusIcon = null;

  if (hasAnswered) {
    if (isSlotCorrect) {
      itemBorderColor = '#10b981';
      itemBg = isDark ? '#064e3b25' : '#ecfdf5';
      badgeBg = '#10b981';
      badgeTextColor = '#ffffff';
      statusIcon = <CheckCircle2 size={18} color="#10b981" style={{ marginLeft: 6 }} />;
    } else {
      itemBorderColor = '#ef4444';
      itemBg = isDark ? '#7f1d1d25' : '#fef2f2';
      badgeBg = '#ef4444';
      badgeTextColor = '#ffffff';
      statusIcon = <XCircle size={18} color="#ef4444" style={{ marginLeft: 6 }} />;
    }
  } else if (isDraggingThis) {
    itemBorderColor = colors.primary;
    itemBg = isDark ? '#1e293b' : '#eff6ff';
  }

  return (
    <Animated.View
      style={[
        styles.orderSlotCard,
        {
          borderColor: itemBorderColor,
          backgroundColor: itemBg,
          transform: [{ translateY: panY }],
          zIndex: isDraggingThis ? 999 : 1,
        },
      ]}
    >
      <View style={[styles.orderSlotBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.orderSlotBadgeText, { color: badgeTextColor }]}>
          {slotIdx + 1}
        </Text>
      </View>

      <Text style={[styles.orderSlotText, { color: colors.text, flex: 1 }]}>
        {cleanText(stepText)}
      </Text>

      {statusIcon}

      {!hasAnswered && (
        <View style={styles.orderControlsRow}>
          <TouchableOpacity
            onPress={handleArrowUp}
            disabled={slotIdx === 0}
            style={[styles.arrowButton, slotIdx === 0 && { opacity: 0.2 }]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Schritt nach oben schieben"
          >
            <ArrowUp size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleArrowDown}
            disabled={slotIdx === totalCount - 1}
            style={[styles.arrowButton, slotIdx === totalCount - 1 && { opacity: 0.2 }]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Schritt nach unten schieben"
          >
            <ArrowDown size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

export default function QuizScreen() {
  const { isDark, colors: appColors } = useAppTheme();
  const { isTablet, isLandscape, isLandscapeTablet } = useDeviceLayout();

  // Color theme
  const colors = {
    ...appColors,
    success: '#10b981',
    error: '#ef4444',
  };
  const screenBg = isDark ? colors.background : colors.cardBg;

  // States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [createQuestionModalVisible, setCreateQuestionModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // Quiz Status: 'setup' | 'active' | 'result'
  const [quizStatus, setQuizStatus] = useState<'setup' | 'active' | 'result'>('setup');
  
  // Setup config
  const [selectedCategory, setSelectedCategory] = useState<string>('Generaltest (Alle Themen)');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(10);
  const [questionCountChoice, setQuestionCountChoice] = useState<number | 'all'>(10);

  // Active quiz state
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [questionIndex: number]: number[] }>({});
  const [pendingMultiSelection, setPendingMultiSelection] = useState<number[]>([]);
  const [orderSelections, setOrderSelections] = useState<{ [questionIndex: number]: number[] }>({});
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isDragging, setIsDragging] = useState(false);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  const timerRef = useRef<any>(null);
  const quizScrollRef = useRef<ScrollViewInstance>(null);

  // Zurück zum Start/Setup beim 2x Tippen auf den Tab "Prüfung"
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tabReset', (tabName: string) => {
      if (tabName === 'quiz') {
        if (timerRef.current) clearInterval(timerRef.current);
        setQuizStatus('setup');
        setUserAnswers({});
        setPendingMultiSelection([]);
        setOrderSelections({});
        setCurrentQuestionIndex(0);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await mockDb.getCurrentUser();
      setCurrentUser(user);
      const verifiedQuestions = await mockDb.getVerifiedQuestions();
      setQuestions(verifiedQuestions);
      const quizHistory = await mockDb.getQuizHistory();
      setHistory(quizHistory);
      const allCategories = await mockDb.getCategories();
      setCategories(allCategories);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quizStatus === 'setup') {
      mockDb.getQuizHistory().then(setHistory);
      mockDb.getCategories().then(setCategories);
      mockDb.getVerifiedQuestions().then(setQuestions);
    }
  }, [quizStatus]);

  useEffect(() => {
    const current = userAnswers[currentQuestionIndex] || [];
    setPendingMultiSelection(prev => (prev === current || (prev.length === 0 && current.length === 0) ? prev : current));
  }, [currentQuestionIndex, userAnswers]);

  useEffect(() => {
    const currentQ = quizQuestions[currentQuestionIndex];
    if (currentQ?.questionType === 'order' && currentQ.options && currentQ.options.length > 0) {
      if (!orderSelections[currentQuestionIndex]) {
        const initialPerm = generateAntiIdentityShuffle(currentQ.options.length);
        setOrderSelections(prev => ({
          ...prev,
          [currentQuestionIndex]: initialPerm
        }));
      }
    }
  }, [currentQuestionIndex, quizQuestions, orderSelections]);

  // Timer logic
  useEffect(() => {
    if (quizStatus === 'active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinishQuiz(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizStatus, timeLeft]);

  const handleStartQuiz = () => {
    let pool = selectedCategory === 'Generaltest (Alle Themen)' 
      ? [...questions] 
      : questions.filter(q => q.category === selectedCategory);

    if (pool.length === 0) {
      Alert.alert('Keine Fragen', 'Für diese Kategorie sind noch keine Fragen freigegeben.');
      return;
    }

    // Zufällig durchmischen
    pool = pool.sort(() => Math.random() - 0.5);

    // Auf ausgewählte Anzahl beschränken
    if (questionCountChoice !== 'all') {
      pool = pool.slice(0, questionCountChoice);
    }

    // Antwortoptionen je Frage shufflen
    pool = pool.map(q => shuffleQuestionOptions(q));

    setQuizQuestions(pool);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setPendingMultiSelection([]);
    setOrderSelections({});
    setTimeLeft(timeLimitMinutes * 60);
    setQuizStatus('active');
  };

  const handleSelectOption = (index: number) => {
    if (userAnswers[currentQuestionIndex] !== undefined) return;
    
    setPendingMultiSelection(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (pendingMultiSelection.length === 0) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: pendingMultiSelection
    }));
  };

  const handleMoveOrderStep = useCallback((slotIdx: number, direction: 'up' | 'down') => {
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ || !currentQ.options) return;

    const totalCount = currentQ.options.length;
    const targetIdx = direction === 'up' ? slotIdx - 1 : slotIdx + 1;
    if (targetIdx < 0 || targetIdx >= totalCount) return;

    triggerReorderAnimation();

    const currentPerm = orderSelections[currentQuestionIndex] || currentQ.options.map((_, i) => i);
    const nextPerm = [...currentPerm];
    const temp = nextPerm[slotIdx];
    nextPerm[slotIdx] = nextPerm[targetIdx];
    nextPerm[targetIdx] = temp;

    setOrderSelections(prev => ({
      ...prev,
      [currentQuestionIndex]: nextPerm
    }));
  }, [quizQuestions, currentQuestionIndex, orderSelections]);

  const handleDragStart = useCallback((slotIdx: number) => {
    setIsDragging(true);
    setDraggingSlot(slotIdx);
    setHoverSlot(slotIdx);
  }, []);

  const handleDragMove = useCallback((slotIdx: number, dy: number) => {
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ || !currentQ.options) return;

    const totalCount = currentQ.options.length;
    const slotDelta = Math.round(dy / 55);
    const target = Math.max(0, Math.min(totalCount - 1, slotIdx + slotDelta));
    setHoverSlot(target);
  }, [quizQuestions, currentQuestionIndex]);

  const handleDragEnd = useCallback((slotIdx: number, dy: number) => {
    setIsDragging(false);
    setDraggingSlot(null);
    setHoverSlot(null);

    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ || !currentQ.options) return;

    const totalCount = currentQ.options.length;
    const slotDelta = Math.round(dy / 55);
    const target = Math.max(0, Math.min(totalCount - 1, slotIdx + slotDelta));

    if (target !== slotIdx) {
      triggerReorderAnimation();
      const currentPerm = orderSelections[currentQuestionIndex] || currentQ.options.map((_, i) => i);
      const nextPerm = [...currentPerm];
      const [removed] = nextPerm.splice(slotIdx, 1);
      nextPerm.splice(target, 0, removed);
      setOrderSelections(prev => ({
        ...prev,
        [currentQuestionIndex]: nextPerm
      }));
    }
  }, [quizQuestions, currentQuestionIndex, orderSelections]);

  const handleConfirmOrderSelection = () => {
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ || !currentQ.options) return;
    const currentPerm = orderSelections[currentQuestionIndex] || generateAntiIdentityShuffle(currentQ.options.length);
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: currentPerm
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setPendingMultiSelection(userAnswers[nextIdx] || []);
      quizScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIdx = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIdx);
      setPendingMultiSelection(userAnswers[prevIdx] || []);
      quizScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const handleFinishQuiz = async (wasTimeout = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    quizQuestions.forEach((q, index) => {
      const ans = userAnswers[index];
      if (ans !== undefined && isQuestionAnswerCorrect(ans, q)) {
        score += 1;
      }
    });

    try {
      const attempt = await mockDb.addQuizAttempt(
        selectedCategory,
        score,
        quizQuestions.length
      );
      if (attempt) {
        setHistory(prev => [attempt, ...prev]);
      }
    } catch (e) {
      console.error('Konnte Versuch nicht speichern', e);
    }

    setQuizStatus('result');

    if (wasTimeout) {
      Alert.alert('Zeit abgelaufen!', 'Die Zeit für diese Prüfungssimulation ist abgelaufen. Deine Antworten wurden ausgewertet.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getScorePercentage = () => {
    if (quizQuestions.length === 0) return 0;
    let score = 0;
    quizQuestions.forEach((q, index) => {
      if (isQuestionAnswerCorrect(userAnswers[index], q)) score += 1;
    });
    return Math.round((score / quizQuestions.length) * 100);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: screenBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]}>
      {quizStatus === 'setup' && (
        // --- QUIZ SETUP SCREEN ---
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer, 
            { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center', paddingHorizontal: SCREEN_PADDING }
          ]} 
          showsVerticalScrollIndicator={false}
        >
          <Heading level={1} style={styles.title}>Prüfungssimulation</Heading>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Bereite dich unter realen Bedingungen auf deine Theorieprüfung vor. Du erhältst eine zufällige Auswahl von Fragen.
          </Text>

          {/* FRAGE EINREICHEN AKTION */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCreateQuestionModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Quizfrage einreichen"
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
                Quizfrage einreichen
              </Text>
              <Text style={[styles.contributeText, { color: colors.textMuted }]}>
                Prüfungsfrage vorschlagen – Ausbilder & Moderatoren prüfen sie vor Aufnahme in die Prüfung.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={isTablet ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginTop: 12 } : undefined}>
            {/* EINSTELLUNGEN */}
            <View style={isTablet ? { flex: 1.15 } : undefined}>
              {/* 1. KATEGORIE */}
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Heading level={3} style={styles.cardHeading}>1. Kategorie wählen</Heading>
                <View style={styles.catGrid}>
                  {['Generaltest (Alle Themen)', ...categories.map(c => c.name)].map(cat => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        style={[
                          styles.catOption,
                          { 
                            backgroundColor: isSelected ? (colors.primary + '15') : (isDark ? '#1f2937' : '#ffffff'), 
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderWidth: isSelected ? 1.5 : 1
                          }
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                        <Text style={[
                          styles.catOptionText, 
                          { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '600' : 'normal' }
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. ZEITLIMIT */}
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Heading level={3} style={styles.cardHeading}>2. Zeitlimit wählen</Heading>
                <View style={styles.timeGrid}>
                  {[5, 10, 15, 20].map(mins => {
                    const isSelected = timeLimitMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        style={[
                          styles.timeOption,
                          { 
                            backgroundColor: isSelected ? (colors.primary + '15') : (isDark ? '#1f2937' : '#ffffff'), 
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderWidth: isSelected ? 1.5 : 1
                          }
                        ]}
                        onPress={() => setTimeLimitMinutes(mins)}
                      >
                        <Clock size={16} color={isSelected ? colors.primary : colors.textMuted} />
                        <Text style={[
                          styles.timeOptionText, 
                          { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '600' : 'normal' }
                        ]}>
                          {mins} Min.
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. FRAGENANZAHL */}
              {(() => {
                const availableQs = selectedCategory === 'Generaltest (Alle Themen)' 
                  ? questions 
                  : questions.filter(q => q.category === selectedCategory);
                return (
                  <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Heading level={3} style={{ marginBottom: 0 }}>3. Anzahl der Fragen</Heading>
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                        {availableQs.length} verfügbar
                      </Text>
                    </View>
                    <View style={styles.timeGrid}>
                      {[5, 10, 15, 20, 'all'].map(cnt => {
                        const isSelected = questionCountChoice === cnt;
                        return (
                          <TouchableOpacity
                            key={cnt.toString()}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            style={[
                              styles.timeOption,
                              { 
                                backgroundColor: isSelected ? (colors.primary + '15') : (isDark ? '#1f2937' : '#ffffff'), 
                                borderColor: isSelected ? colors.primary : colors.border,
                                borderWidth: isSelected ? 1.5 : 1
                              }
                            ]}
                            onPress={() => setQuestionCountChoice(cnt as any)}
                          >
                            <Text style={[
                              styles.timeOptionText, 
                              { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '600' : 'normal' }
                            ]}>
                              {cnt === 'all' ? 'Alle' : cnt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* START & HISTORIE */}
            <View style={isTablet ? { flex: 0.85 } : undefined}>
              {/* START BUTTON */}
              <Button
                variant="primary"
                icon={Play}
                title="Prüfung starten"
                onPress={handleStartQuiz}
                style={{ marginTop: 4, height: 48, minHeight: 48 }}
              />

              {/* HISTORY */}
              {history.length > 0 && (
                <View style={styles.historySection}>
                  <Heading level={2} style={styles.historyTitle}>Bisherige Versuche</Heading>
                  {history.map((attempt) => {
                    const percentage = Math.round((attempt.score / attempt.total) * 100);
                    const passed = percentage >= PASS_PERCENTAGE;
                    return (
                      <View 
                        key={attempt.id} 
                        style={[styles.historyItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                      >
                        <View style={styles.historyLeft}>
                          <Text style={[styles.historyCategory, { color: colors.text }]} numberOfLines={1}>
                            {attempt.category}
                          </Text>
                          <View style={styles.historyMeta}>
                            <Calendar size={12} color={colors.textMuted} />
                            <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                              {new Date(attempt.date).toLocaleDateString('de-DE')}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.historyRight}>
                          <Text style={[styles.historyScore, { color: passed ? colors.success : colors.error }]}>
                            {attempt.score}/{attempt.total} ({percentage}%)
                          </Text>
                          <Text style={[styles.historyStatus, { color: passed ? colors.success : colors.error }]}>
                            {passed ? 'Bestanden' : 'Nicht bestanden'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {quizStatus === 'active' && (
        // --- ACTIVE QUIZ SCREEN ---
        <View style={{ flex: 1 }}>
          {/* HEADER MIT TIMER & FORTSCHRITT */}
          <View style={[styles.quizHeader, { backgroundColor: screenBg, borderBottomColor: colors.border }]}>
            <View style={[
              { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
              { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }
            ]}>
              <View style={[styles.progressContainer, { flex: 1, marginRight: 16 }]}>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  Frage <Text style={{ fontWeight: '700' }}>{currentQuestionIndex + 1}</Text> von {quizQuestions.length}
                </Text>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`,
                        backgroundColor: colors.primary
                      }
                    ]} 
                  />
                </View>
              </View>

              <View style={[
                styles.timerContainer, 
                { 
                  backgroundColor: timeLeft < 60 ? (isDark ? '#7f1d1d40' : '#fee2e2') : (isDark ? '#1f2937' : '#f3f4f6'),
                  borderWidth: 1,
                  borderColor: timeLeft < 60 ? colors.error : colors.border
                }
              ]}>
                <Clock size={16} color={timeLeft < 60 ? colors.error : colors.text} />
                <Text style={[
                  styles.timerText, 
                  { color: timeLeft < 60 ? colors.error : colors.text, fontWeight: '700' }
                ]}>
                  {formatTime(timeLeft)}
                </Text>
              </View>
            </View>
          </View>

          {/* FRAGENANSICHT */}
          <ScrollView 
            ref={quizScrollRef} 
            scrollEnabled={!isDragging}
            contentContainerStyle={[
              styles.quizContentContainer,
              { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center', paddingHorizontal: SCREEN_PADDING }
            ]} 
            showsVerticalScrollIndicator={false}
          >
            <View style={[
              styles.questionCard, 
              { backgroundColor: colors.cardBg, borderColor: colors.border }
            ]}>
              {(() => {
                const currentQ = quizQuestions[currentQuestionIndex];
                const isOrder = currentQ?.questionType === 'order';
                const correctIndices = getQuestionCorrectIndices(currentQ);
                const isMultiChoice = correctIndices.length > 1;

                return (
                  <>
                    {/* MODUS-BADGE */}
                    {isOrder ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#06b6d418', borderColor: '#06b6d4', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, marginBottom: 12 }}>
                        <Shuffle size={14} color="#06b6d4" />
                        <Text style={{ color: '#06b6d4', fontSize: 12, fontWeight: '600' }}>Reihenfolge bestimmen</Text>
                      </View>
                    ) : isMultiChoice ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.primary + '18', borderColor: colors.primary, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, marginBottom: 12 }}>
                        <CheckCircle2 size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Mehrfachauswahl</Text>
                      </View>
                    ) : null}

                    <Text style={[styles.questionText, { color: colors.text }]}>
                      {cleanText(currentQ?.text)}
                    </Text>

                    <View style={isTablet && currentQ?.imageUrl ? { flexDirection: 'row', gap: 24, marginTop: 12, alignItems: 'flex-start' } : undefined}>
                      {currentQ?.imageUrl && (
                        <View style={isTablet ? { flex: 0.95 } : undefined}>
                          <TouchableOpacity
                            onPress={() => setPreviewImageUrl(currentQ.imageUrl!)}
                            activeOpacity={0.85}
                            style={{ position: 'relative', marginTop: isTablet ? 0 : 8, marginBottom: 16 }}
                            accessibilityRole="button"
                            accessibilityLabel="Bild vergrößern"
                          >
                            <Image 
                              source={{ uri: currentQ.imageUrl }} 
                              style={[styles.questionImage, isTablet && { height: 320 }]} 
                              resizeMode="contain" 
                            />
                            <View style={[styles.zoomBadge, { backgroundColor: isDark ? '#000000cc' : '#ffffffdd' }]}>
                              <Maximize2 size={13} color={colors.text} />
                              <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600', marginLeft: 4 }}>
                                Tippen zum Vergrößern
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={isTablet && currentQ?.imageUrl ? { flex: 1.05 } : undefined}>
                        {isOrder ? (
                          <View style={{ gap: 8, marginTop: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <GripVertical size={16} color={colors.primary} />
                              <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>
                                Bringe die Schritte per Pfeil oder Ziehen in die richtige Reihenfolge:
                              </Text>
                            </View>
                            {(() => {
                              const hasAnswered = userAnswers[currentQuestionIndex] !== undefined;
                              const activePermutation = hasAnswered 
                                ? (userAnswers[currentQuestionIndex] || [])
                                : (orderSelections[currentQuestionIndex] || currentQ?.options?.map((_, i) => i) || []);

                              const dropLinePosition = (isDragging && draggingSlot !== null && hoverSlot !== null && hoverSlot !== draggingSlot)
                                ? (hoverSlot < draggingSlot ? hoverSlot : hoverSlot + 1)
                                : -1;

                              return (
                                <View style={{ gap: 4 }}>
                                  {activePermutation.map((origOptIdx, slotIdx) => {
                                    const stepText = currentQ?.options?.[origOptIdx] || '';
                                    const isSlotCorrect = origOptIdx === slotIdx;
                                    const isDraggingThis = isDragging && draggingSlot === slotIdx;

                                    return (
                                      <View key={slotIdx}>
                                        {slotIdx === 0 && (
                                          <DropLineIndicator active={dropLinePosition === 0} />
                                        )}

                                        <DraggableOrderItem
                                          slotIdx={slotIdx}
                                          origOptIdx={origOptIdx}
                                          stepText={stepText}
                                          totalCount={activePermutation.length}
                                          hasAnswered={hasAnswered}
                                          isSlotCorrect={isSlotCorrect}
                                          colors={colors}
                                          isDark={isDark}
                                          onMoveStep={handleMoveOrderStep}
                                          onDragStart={handleDragStart}
                                          onDragMove={handleDragMove}
                                          onDragEnd={handleDragEnd}
                                          isDraggingThis={isDraggingThis}
                                          draggingSlot={draggingSlot}
                                        />

                                        <DropLineIndicator active={dropLinePosition === slotIdx + 1} />
                                      </View>
                                    );
                                  })}

                                  {!hasAnswered && (
                                    <Button
                                      variant="primary"
                                      icon={CheckCircle2}
                                      title="Reihenfolge einloggen & prüfen"
                                      onPress={handleConfirmOrderSelection}
                                      style={{ marginTop: 12 }}
                                    />
                                  )}
                                </View>
                              );
                            })()}
                          </View>
                        ) : (
                          <>
                            <View style={styles.optionsContainer}>
                              {currentQ?.options.map((option, oIndex) => {
                                const hasAnswered = userAnswers[currentQuestionIndex] !== undefined;
                                const selectedAnswers = hasAnswered 
                                  ? (userAnswers[currentQuestionIndex] || []) 
                                  : pendingMultiSelection;

                                const isSelected = selectedAnswers.includes(oIndex);
                                const isCorrectAnswer = correctIndices.includes(oIndex);
                                const isDangerOption = (currentQ?.danger_indices || currentQ?.dangerIndices || []).includes(oIndex);
                                const optionLetter = ['A', 'B', 'C', 'D', 'E', 'F'][oIndex] || `${oIndex + 1}`;

                                let btnBg = isDark ? '#1f293750' : '#ffffff';
                                let btnBorder = colors.border;
                                let btnBorderWidth = 1;
                                let textColor = colors.text;
                                let badgeBg = isDark ? '#374151' : '#f3f4f6';
                                let badgeBorder = isDark ? '#4b5563' : '#e5e7eb';
                                let badgeTextColor = colors.textMuted;
                                let rightIcon = null;

                                if (hasAnswered) {
                                  if (isSelected && isCorrectAnswer) {
                                    btnBg = isDark ? '#064e3b30' : '#ecfdf5';
                                    btnBorder = '#10b981';
                                    btnBorderWidth = 1.5;
                                    textColor = isDark ? '#6ee7b7' : '#065f46';
                                    badgeBg = '#10b981';
                                    badgeBorder = '#10b981';
                                    badgeTextColor = '#ffffff';
                                    rightIcon = <CheckCircle2 size={18} color="#10b981" style={{ marginLeft: 6 }} />;
                                  } else if (isSelected && !isCorrectAnswer) {
                                    btnBg = isDark ? '#7f1d1d30' : '#fef2f2';
                                    btnBorder = '#ef4444';
                                    btnBorderWidth = 1.5;
                                    textColor = isDark ? '#fca5a5' : '#991b1b';
                                    badgeBg = '#ef4444';
                                    badgeBorder = '#ef4444';
                                    badgeTextColor = '#ffffff';
                                    rightIcon = <XCircle size={18} color="#ef4444" style={{ marginLeft: 6 }} />;
                                  } else if (!isSelected && isCorrectAnswer) {
                                    btnBg = isDark ? '#064e3b15' : '#ecfdf560';
                                    btnBorder = '#10b981';
                                    btnBorderWidth = 1.5;
                                    textColor = isDark ? '#6ee7b7' : '#065f46';
                                    badgeBg = '#10b98180';
                                    badgeBorder = '#10b981';
                                    badgeTextColor = '#ffffff';
                                    rightIcon = <CheckCircle2 size={18} color="#10b98180" style={{ marginLeft: 6 }} />;
                                  } else {
                                    textColor = colors.textMuted;
                                  }
                                } else if (isSelected) {
                                  btnBg = colors.primary + '15';
                                  btnBorder = colors.primary;
                                  btnBorderWidth = 1.5;
                                  badgeBg = colors.primary;
                                  badgeBorder = colors.primary;
                                  badgeTextColor = '#ffffff';
                                  rightIcon = <CheckCircle2 size={18} color={colors.primary} style={{ marginLeft: 6 }} />;
                                }

                                return (
                                  <TouchableOpacity
                                    key={oIndex}
                                    delayPressIn={0}
                                    style={[
                                      styles.optionButton,
                                      {
                                        backgroundColor: btnBg,
                                        borderColor: btnBorder,
                                        borderWidth: btnBorderWidth,
                                        opacity: hasAnswered && !isCorrectAnswer && !isSelected ? 0.6 : 1,
                                      }
                                    ]}
                                    disabled={hasAnswered}
                                    onPress={() => handleSelectOption(oIndex)}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Antwort ${optionLetter}: ${cleanText(option)}`}
                                  >
                                    <View style={[styles.optionBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                                      <Text style={[styles.optionBadgeText, { color: badgeTextColor }]}>
                                        {optionLetter}
                                      </Text>
                                    </View>
                                    <Text style={[
                                      styles.optionText, 
                                      { color: textColor, fontWeight: isSelected || (hasAnswered && isCorrectAnswer) ? '600' : 'normal', flex: 1 }
                                    ]}>
                                      {cleanText(option)}
                                    </Text>
                                    {hasAnswered && isDangerOption && (
                                      <View style={{ backgroundColor: '#ef444420', borderColor: '#ef4444', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                        <AlertTriangle size={11} color="#ef4444" />
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444' }}>BG</Text>
                                      </View>
                                    )}
                                    {rightIcon}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

                            {/* ANTWORT BESTÄTIGEN BUTTON */}
                            {userAnswers[currentQuestionIndex] === undefined && (
                              <Button
                                variant="primary"
                                icon={CheckCircle2}
                                title={
                                  pendingMultiSelection.length > 0 
                                    ? (pendingMultiSelection.length === 1 ? 'Antwort bestätigen' : `Antworten bestätigen (${pendingMultiSelection.length} gewählt)`) 
                                    : 'Antwort(en) auswählen'
                                }
                                disabled={pendingMultiSelection.length === 0}
                                onPress={handleConfirmSelection}
                                style={{ marginTop: 14 }}
                              />
                            )}
                          </>
                        )}

                        {/* DIREKTES FEEDBACK & ERKLÄRUNG */}
                        {userAnswers[currentQuestionIndex] !== undefined && (() => {
                          const currentAns = userAnswers[currentQuestionIndex] || [];
                          const isCorrect = isQuestionAnswerCorrect(currentAns, currentQ);
                          const isDangerTriggered = !isOrder && currentAns.some(i => (currentQ?.danger_indices || currentQ?.dangerIndices || []).includes(i));

                          return (
                            <View style={[
                              styles.feedbackBox, 
                              { 
                                backgroundColor: isCorrect
                                  ? (isDark ? '#064e3b30' : '#ecfdf5')
                                  : (isDark ? '#7f1d1d30' : '#fef2f2'),
                                borderColor: isCorrect
                                  ? '#10b981'
                                  : '#ef4444'
                              }
                            ]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                {isCorrect ? (
                                  <>
                                    <CheckCircle2 size={20} color="#10b981" />
                                    <Text style={{ fontWeight: '700', color: '#10b981', fontSize: 15 }}>
                                      {isOrder ? 'Reihenfolge perfekt richtig!' : 'Richtig gelöst!'}
                                    </Text>
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={20} color="#ef4444" />
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontWeight: '700', color: '#ef4444', fontSize: 15 }}>
                                        {isOrder ? 'Reihenfolge nicht korrekt!' : 'Falsche Antwort!'}
                                      </Text>
                                      {!isOrder && isMultiChoice && (
                                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                                          Bei dieser Frage waren {correctIndices.length} Antworten richtig.
                                        </Text>
                                      )}
                                    </View>
                                  </>
                                )}
                              </View>

                              {/* Korrekte Reihenfolge anzeigen falls falsch */}
                              {isOrder && !isCorrect && (
                                <View style={{ marginTop: 8, padding: 10, backgroundColor: colors.cardBg, borderRadius: RADIUS, borderWidth: 1, borderColor: colors.border }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981', marginBottom: 6 }}>
                                    KORREKTE REIHENFOLGE:
                                  </Text>
                                  {currentQ?.options?.map((opt, sIdx) => (
                                    <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginVertical: 2 }}>
                                      <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{sIdx + 1}</Text>
                                      </View>
                                      <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                                        {cleanText(opt)}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {/* Betriebsgefährdend Warnung */}
                              {isDangerTriggered && (
                                <View style={{ marginTop: 8, marginBottom: 8, padding: 10, backgroundColor: isDark ? '#7f1d1d40' : '#fee2e2', borderRadius: RADIUS, borderWidth: 1, borderColor: '#ef4444', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <AlertTriangle size={18} color="#ef4444" />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>
                                      BETRIEBSGEFÄHRDENDE ANTWORT (BG)
                                    </Text>
                                    <Text style={{ color: isDark ? '#fca5a5' : '#991b1b', fontSize: 12, marginTop: 2, lineHeight: 16 }}>
                                      Diese Fehlhandlung führt im realen Eisenbahnbetrieb zu einer akuten Betriebsgefahr!
                                    </Text>
                                  </View>
                                </View>
                              )}

                              {currentQ?.explanation && (
                                <View style={[styles.explanationContainer, { backgroundColor: isDark ? '#1f293750' : '#f8fafc', borderColor: colors.border }]}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 2 }}>Erklärung:</Text>
                                  <Text style={[styles.explanationText, { color: colors.textMuted }]}>
                                    {cleanText(currentQ.explanation)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
          </ScrollView>

          {/* STEUERUNGSLEISTE UNTEN */}
          <View style={[
            styles.quizFooter, 
            { backgroundColor: screenBg, borderTopColor: colors.border }
          ]}>
            <View style={[
              { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 },
              { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }
            ]}>
              <Button
                variant="secondary"
                icon={ChevronLeft}
                title="Zurück"
                disabled={currentQuestionIndex === 0}
                onPress={handlePrevQuestion}
                style={{ flex: 1 }}
              />

              {currentQuestionIndex === quizQuestions.length - 1 ? (
                <Button
                  variant="primary"
                  icon={Award}
                  title="Prüfung abgeben"
                  onPress={() => {
                    const answeredCount = Object.keys(userAnswers).length;
                    if (answeredCount < quizQuestions.length) {
                      Alert.alert(
                        'Unvollständige Prüfung',
                        `Du hast ${quizQuestions.length - answeredCount} Fragen unbeantwortet gelassen. Möchtest du trotzdem abgeben?`,
                        [
                          { text: 'Abbrechen', style: 'cancel' },
                          { text: 'Ja, abgeben', onPress: () => handleFinishQuiz(false) }
                        ]
                      );
                    } else {
                      handleFinishQuiz(false);
                    }
                  }}
                  style={{ flex: 1 }}
                />
              ) : (
                <Button
                  variant="primary"
                  icon={ChevronRight}
                  title="Weiter"
                  onPress={handleNextQuestion}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </View>
        </View>
      )}

      {quizStatus === 'result' && (
        // --- QUIZ RESULT SCREEN ---
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer,
            { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center', paddingHorizontal: SCREEN_PADDING }
          ]} 
          showsVerticalScrollIndicator={false}
        >
          <Heading level={1} style={[styles.title, { textAlign: 'center', marginBottom: 16 }]}>Testergebnis</Heading>
          
          {/* RESULT CARD */}
          {(() => {
            const percentage = getScorePercentage();
            const passed = percentage >= PASS_PERCENTAGE;
            let correctCount = 0;
            quizQuestions.forEach((q, idx) => {
              if (isQuestionAnswerCorrect(userAnswers[idx], q)) correctCount++;
            });

            return (
              <View style={[
                styles.resultCard, 
                { backgroundColor: colors.cardBg, borderColor: colors.border }
              ]}>
                <Award size={56} color={passed ? colors.success : colors.error} style={styles.resultIcon} />
                <Text style={[styles.resultOutcome, { color: passed ? colors.success : colors.error }]}>
                  {passed ? 'Prüfung bestanden!' : 'Leider nicht bestanden'}
                </Text>
                <Text style={[styles.resultScore, { color: colors.text }]}>
                  {correctCount} / {quizQuestions.length} richtig ({percentage}%)
                </Text>
                <Text style={[styles.resultDesc, { color: colors.textMuted }]}>
                  {passed 
                    ? 'Hervorragende Leistung! Du hast das erforderliche Limit von 70% überschritten.' 
                    : 'Es hat noch nicht ganz gereicht. Lerne das Thema am besten noch einmal im Lernbereich.'
                  }
                </Text>
              </View>
            );
          })()}

          {/* DETAILÜBERSICHT ANTWORTEN */}
          <Heading level={2} style={[styles.sectionTitle, { color: colors.text, marginTop: 24, marginBottom: 12 }]}>
            Antworten-Detailübersicht
          </Heading>
          
          <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : undefined}>
            {quizQuestions.map((q, idx) => {
              const userAns = userAnswers[idx] || [];
              const isOrder = q.questionType === 'order';
              const correctIndices = getQuestionCorrectIndices(q);
              const isCorrect = isQuestionAnswerCorrect(userAns, q);
              const isUserAnsDanger = !isOrder && userAns.some(i => (q.danger_indices || q.dangerIndices || []).includes(i));
              const isMulti = !isOrder && correctIndices.length > 1;

              return (
                <View 
                  key={idx} 
                  style={[
                    styles.detailAnswerCard, 
                    { backgroundColor: colors.cardBg, borderColor: isUserAnsDanger ? '#ef4444' : colors.border },
                    isTablet && { width: isLandscapeTablet ? '31.8%' : '48.8%', marginHorizontal: 0, marginBottom: 12 }
                  ]}
                >
                  <View style={styles.detailAnswerHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.detailAnswerNum, { color: colors.primary }]}>Frage {idx + 1}</Text>
                      {isOrder ? (
                        <View style={[styles.badge, { backgroundColor: '#06b6d418', borderColor: '#06b6d4', borderWidth: 1 }]}>
                          <Text style={{ color: '#06b6d4', fontSize: 10, fontWeight: '600' }}>Reihenfolge</Text>
                        </View>
                      ) : isMulti ? (
                        <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
                          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>Mehrfachauswahl</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {isUserAnsDanger && (
                        <View style={{ backgroundColor: '#ef444420', borderColor: '#ef4444', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <AlertTriangle size={12} color="#ef4444" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444' }}>BG</Text>
                        </View>
                      )}
                      {isCorrect ? (
                        <View style={styles.resultBadgeContainer}>
                          <CheckCircle2 color={colors.success} size={16} />
                          <Text style={[styles.resultBadgeText, { color: colors.success }]}>Richtig</Text>
                        </View>
                      ) : (
                        <View style={styles.resultBadgeContainer}>
                          <XCircle color={colors.error} size={16} />
                          <Text style={[styles.resultBadgeText, { color: colors.error }]}>Falsch</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={[styles.detailAnswerText, { color: colors.text }]}>
                    {cleanText(q.text)}
                  </Text>

                  <View style={styles.resultAnsOptions}>
                    {isOrder ? (
                      <View style={{ gap: 4 }}>
                        <Text style={[styles.ansLabel, { color: colors.textMuted }]}>
                          Deine gewählte Reihenfolge:
                        </Text>
                        {userAns.length > 0 ? (
                          userAns.map((origIdx, sIdx) => {
                            const isSlotCorrect = origIdx === sIdx;
                            return (
                              <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isSlotCorrect ? colors.success : colors.error, width: 20 }}>
                                  {sIdx + 1}.
                                </Text>
                                <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                                  {cleanText(q.options[origIdx])}
                                </Text>
                              </View>
                            );
                          })
                        ) : (
                          <Text style={{ color: colors.error, fontStyle: 'italic', fontSize: 13 }}>
                            Keine Reihenfolge eingeloggt
                          </Text>
                        )}

                        {!isCorrect && (
                          <View style={{ marginTop: 8, padding: 10, backgroundColor: isDark ? '#1f293750' : '#f8fafc', borderRadius: RADIUS, borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981', marginBottom: 4 }}>
                              KORREKTE REIHENFOLGE:
                            </Text>
                            {q.options?.map((opt, sIdx) => (
                              <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginVertical: 2 }}>
                                <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{sIdx + 1}</Text>
                                </View>
                                <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>
                                  {cleanText(opt)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ) : (
                      <>
                        <Text style={[styles.ansLabel, { color: colors.textMuted }]}>
                          Deine Antwort:{' '}
                          <Text style={{ color: isCorrect ? colors.success : colors.error, fontWeight: '600' }}>
                            {userAns.length > 0 
                              ? userAns.map(i => `${['A', 'B', 'C', 'D', 'E', 'F'][i] || i + 1}) ${cleanText(q.options[i])}`).join(' • ')
                              : 'Keine Antwort abgegeben'}
                          </Text>
                        </Text>
                        {isUserAnsDanger && (
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444', marginTop: 2 }}>
                            Diese Antwort ist betriebsgefährdend (BG)!
                          </Text>
                        )}
                        {!isCorrect && (
                          <Text style={[styles.ansLabel, { color: colors.textMuted, marginTop: 4 }]}>
                            Richtige Antwort:{' '}
                            <Text style={{ color: colors.success, fontWeight: '600' }}>
                              {correctIndices.map(i => `${['A', 'B', 'C', 'D', 'E', 'F'][i] || i + 1}) ${cleanText(q.options[i])}`).join(' • ')}
                            </Text>
                          </Text>
                        )}
                      </>
                    )}
                  </View>

                  {q.explanation && (
                    <View style={[styles.resultExplanation, { backgroundColor: isDark ? '#1f293750' : '#f8fafc', borderColor: colors.border }]}>
                      <Text style={[styles.explText, { color: colors.textMuted }]}>
                        <Text style={{ fontWeight: '700', color: colors.text }}>Erklärung: </Text>
                        {cleanText(q.explanation)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* BACK TO SETUP BUTTON */}
          <Button
            variant="primary"
            icon={RotateCcw}
            title="Zurück zur Auswahl"
            onPress={() => setQuizStatus('setup')}
            style={{ marginTop: 24, maxWidth: 400, width: '100%', alignSelf: 'center' }}
          />

          {/* FRAGE EINREICHEN BUTTON ON RESULT SCREEN */}
          <Button
            variant="secondary"
            icon={Plus}
            title="Quizfrage einreichen"
            onPress={() => setCreateQuestionModalVisible(true)}
            style={{ marginTop: 12, marginBottom: 24, maxWidth: 400, width: '100%', alignSelf: 'center' }}
          />
        </ScrollView>
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

      {/* QUIZFRAGE EINREICHEN MODAL */}
      <CreateQuestionModal
        visible={createQuestionModalVisible}
        onClose={() => setCreateQuestionModalVisible(false)}
        onSuccess={() => loadData()}
        categories={categories}
        defaultCategory={selectedCategory !== 'Generaltest (Alle Themen)' ? selectedCategory : undefined}
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
  scrollContainer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
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
  card: {
    borderRadius: RADIUS,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardHeading: {
    marginBottom: 12,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catOption: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  catOptionText: {
    fontSize: 13,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  timeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  timeOptionText: {
    fontSize: 13,
  },
  historySection: {
    marginTop: 24,
  },
  historyTitle: {
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyLeft: {
    flex: 1,
    paddingRight: 10,
  },
  historyCategory: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressText: {
    fontSize: 13,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  quizContentContainer: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  questionCard: {
    borderRadius: RADIUS,
    padding: 18,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 25,
    marginBottom: 16,
  },
  questionImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS,
    borderWidth: 1,
    gap: 12,
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  quizFooter: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  resultCard: {
    borderRadius: RADIUS,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  resultIcon: {
    marginBottom: 12,
  },
  resultOutcome: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  resultScore: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  detailAnswerCard: {
    borderRadius: RADIUS,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailAnswerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailAnswerNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailAnswerText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 10,
  },
  resultAnsOptions: {
    gap: 4,
    marginBottom: 8,
  },
  ansLabel: {
    fontSize: 13,
    lineHeight: 19,
  },
  resultExplanation: {
    padding: 10,
    borderRadius: RADIUS,
    borderWidth: 1,
    marginTop: 6,
  },
  explText: {
    fontSize: 12,
    lineHeight: 18,
  },
  feedbackBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  explanationContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 19,
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  dropLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    marginHorizontal: 8,
    gap: 4,
  },
  dropLineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06b6d4',
  },
  dropLineBar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#06b6d4',
  },
  orderSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS,
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
  },
  orderSlotBadge: {
    width: 26,
    height: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSlotBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderSlotText: {
    fontSize: 14,
    lineHeight: 20,
  },
  orderControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
