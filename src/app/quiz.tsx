import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockDb, Question, QuizAttempt, Category, getQuestionCorrectIndices, isQuestionAnswerCorrect, generateAntiIdentityShuffle, shuffleQuestionOptions } from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';

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
  ListOrdered, 
  Lightbulb, 
  Maximize2, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Shuffle,
  GripVertical,
  X 
} from 'lucide-react-native';

const PASS_PERCENTAGE = 70; // Lokführerprüfung verlangt 70% zum Bestehen

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

  // Ensure panY is always 0 when not dragging
  useEffect(() => {
    if (!isDraggingThis) {
      panY.stopAnimation();
      panY.setValue(0);
    }
  }, [isDraggingThis]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !hasAnswered,
    onMoveShouldSetPanResponder: (_, gs) => !hasAnswered && Math.abs(gs.dy) > 3,
    onPanResponderGrant: () => {
      panY.stopAnimation();
      panY.setValue(0);
      onDragStart(slotIdx);
    },
    onPanResponderMove: (_, gs) => {
      panY.setValue(gs.dy);
      onDragMove(slotIdx, gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      const finalDy = gs.dy;
      panY.stopAnimation();
      panY.setValue(0);
      onDragEnd(slotIdx, finalDy);
    },
    onPanResponderTerminate: () => {
      panY.stopAnimation();
      panY.setValue(0);
      onDragEnd(slotIdx, 0);
    }
  }), [hasAnswered, slotIdx, onDragStart, onDragMove, onDragEnd]);

  let cardBg = colors.background;
  let cardBorder = colors.border;
  let cardBorderWidth = 1.5;
  let badgeBg = isDark ? '#1f2937' : '#e2e8f0';
  let badgeColor = colors.text;

  if (hasAnswered) {
    if (isSlotCorrect) {
      cardBg = isDark ? '#064e3b30' : '#ecfdf5';
      cardBorder = '#10b981';
      badgeBg = '#10b981';
      badgeColor = '#ffffff';
    } else {
      cardBg = isDark ? '#7f1d1d30' : '#fef2f2';
      cardBorder = '#ef4444';
      badgeBg = '#ef4444';
      badgeColor = '#ffffff';
    }
  } else if (isDraggingThis) {
    cardBg = isDark ? '#0e749030' : '#cffafe40';
    cardBorder = '#06b6d4';
    cardBorderWidth = 2;
    badgeBg = '#06b6d4';
    badgeColor = '#ffffff';
  }

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: cardBg,
          borderColor: cardBorder,
          borderWidth: cardBorderWidth,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 12,
          gap: 10,
        },
        isDraggingThis ? {
          transform: [{ translateY: panY }, { scale: 1.03 }],
          zIndex: 999,
          elevation: 12,
          shadowColor: '#06b6d4',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        } : {
          transform: [{ translateY: 0 }, { scale: 1 }],
          zIndex: 1,
          elevation: 0,
        }
      ]}
    >
      <View style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: badgeBg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: cardBorder
      }}>
        <Text style={{ color: badgeColor, fontWeight: 'bold', fontSize: 13 }}>
          {slotIdx + 1}
        </Text>
      </View>

      <Text style={{
        flex: 1,
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
        lineHeight: 19
      }}>
        {cleanText(stepText)}
      </Text>

      {hasAnswered ? (
        isSlotCorrect ? (
          <CheckCircle2 size={20} color="#10b981" />
        ) : (
          <XCircle size={20} color="#ef4444" />
        )
      ) : (
        <View
          {...panResponder.panHandlers}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: isDraggingThis ? (isDark ? '#083344' : '#cffafe') : (isDark ? '#1f293780' : '#f1f5f9'),
            borderWidth: 1,
            borderColor: isDraggingThis ? '#06b6d4' : (isDark ? '#374151' : '#e2e8f0'),
            justifyContent: 'center',
            alignItems: 'center',
          }}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <GripVertical size={20} color={isDraggingThis ? '#06b6d4' : (isDark ? '#9ca3af' : '#64748b')} />
        </View>
      )}
    </Animated.View>
  );
}

export default function QuizScreen() {
  const { isDark, colors: appColors } = useAppTheme();
  const { isTablet, isLandscape, isLandscapeTablet, contentMaxWidth } = useDeviceLayout();

  // States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const quizScrollRef = useRef<ScrollView>(null);

  // Color theme
  const colors = {
    ...appColors,
    success: '#10b981',
    error: '#ef4444',
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
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

  // Regelmäßig Historie im Hintergrund laden, falls sich was ändert
  useEffect(() => {
    if (quizStatus === 'setup') {
      mockDb.getQuizHistory().then(setHistory);
      mockDb.getCategories().then(setCategories);
      mockDb.getVerifiedQuestions().then(setQuestions);
    }
  }, [quizStatus]);

  // Synchronisiere Auswahl-Status bei Fragenwechsel (ohne redundante Re-Renders)
  useEffect(() => {
    const current = userAnswers[currentQuestionIndex] || [];
    setPendingMultiSelection(prev => (prev === current || (prev.length === 0 && current.length === 0) ? prev : current));
  }, [currentQuestionIndex, userAnswers]);

  // Bei Reihenfolge-Fragen: Garantiere zufällige, aber niemals die richtige Start-Reihenfolge (Anti-Identity)
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
            handleFinishQuiz(true); // Time out submit
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
    // Fragen filtern nach Freigabestatus und Kategorie
    let filtered = questions.filter(q => q.isVerified === true);
    if (selectedCategory !== 'Generaltest (Alle Themen)') {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    if (filtered.length === 0) {
      Alert.alert('Keine Fragen', 'Für diese Auswahl sind momentan keine geprüften Fragen vorhanden.');
      return;
    }

    // Fragen mischen
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    
    // Fragenanzahl bestimmen
    let count = questionCountChoice === 'all' ? shuffled.length : Number(questionCountChoice);
    if (count > shuffled.length) count = shuffled.length;
    const selection = shuffled.slice(0, count).map(q => shuffleQuestionOptions(q));

    setQuizQuestions(selection);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setPendingMultiSelection([]);
    setOrderSelections({});
    setTimeLeft(timeLimitMinutes * 60);
    setQuizStatus('active');
  };

  const handleSelectOption = (optionIndex: number) => {
    if (userAnswers[currentQuestionIndex] !== undefined) return; // Bereits beantwortet
    setPendingMultiSelection(prev => 
      prev.includes(optionIndex)
        ? prev.filter(i => i !== optionIndex)
        : [...prev, optionIndex].sort((a, b) => a - b)
    );
  };

  const handleConfirmSelection = () => {
    if (pendingMultiSelection.length === 0) {
      Alert.alert('Auswahl erforderlich', 'Bitte wähle mindestens eine Antwort aus.');
      return;
    }
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: pendingMultiSelection
    }));
  };

  const handleMoveOrderStep = (slotIdx: number, direction: 'up' | 'down') => {
    if (userAnswers[currentQuestionIndex] !== undefined) return; // Bereits eingeloggt
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ || !currentQ.options) return;
    const currentPerm = orderSelections[currentQuestionIndex] || currentQ.options.map((_, i) => i);
    const targetIdx = direction === 'up' ? slotIdx - 1 : slotIdx + 1;
    if (targetIdx < 0 || targetIdx >= currentPerm.length) return;

    triggerReorderAnimation();
    const nextPerm = [...currentPerm];
    const temp = nextPerm[slotIdx];
    nextPerm[slotIdx] = nextPerm[targetIdx];
    nextPerm[targetIdx] = temp;

    setOrderSelections(prev => ({
      ...prev,
      [currentQuestionIndex]: nextPerm
    }));
  };

  const handleDragStart = useCallback((slotIdx: number) => {
    setIsDragging(true);
    setDraggingSlot(slotIdx);
    setHoverSlot(slotIdx);
  }, []);

  const handleDragMove = useCallback((slotIdx: number, dy: number) => {
    const currentQ = quizQuestions[currentQuestionIndex];
    const totalCount = currentQ?.options?.length || 4;
    const slotDelta = Math.round(dy / 55);
    const target = Math.max(0, Math.min(totalCount - 1, slotIdx + slotDelta));
    setHoverSlot(prev => (prev === target ? prev : target));
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

    // Score berechnen
    let score = 0;
    quizQuestions.forEach((q, index) => {
      if (isQuestionAnswerCorrect(userAnswers[index], q)) {
        score += 1;
      }
    });

    try {
      await mockDb.addQuizAttempt(
        selectedCategory,
        score,
        quizQuestions.length
      );
    } catch (e) {
      console.error('Konnte Versuch nicht speichern', e);
    }

    if (wasTimeout) {
      Alert.alert('Zeit abgelaufen!', 'Die Zeit für die Prüfung ist abgelaufen. Deine Antworten wurden ausgewertet.');
    }

    setQuizStatus('result');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {quizStatus === 'setup' && (
        // --- QUIZ SETUP SCREEN ---
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer, 
            isTablet && { width: '100%', paddingHorizontal: 24 }
          ]} 
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.text }]}>Prüfungssimulation</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Bereite dich unter realen Bedingungen auf deine Theorieprüfung vor. Du erhältst eine zufällige Auswahl von Fragen.
          </Text>

          <View style={isTablet ? { flexDirection: 'row', gap: 20, alignItems: 'flex-start', marginTop: 12 } : undefined}>
            {/* LINKS: EINSTELLUNGEN */}
            <View style={isTablet ? { flex: 1.15 } : undefined}>
              {/* EINSTELLUNGEN */}
              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>1. Kategorie wählen</Text>
                <View style={styles.catGrid}>
                  {['Generaltest (Alle Themen)', ...categories.map(c => c.name)].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOption,
                        { 
                          backgroundColor: colors.background, 
                          borderColor: selectedCategory === cat ? colors.primary : colors.border,
                          borderWidth: selectedCategory === cat ? 2 : 1
                        }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[
                        styles.catOptionText, 
                        { color: colors.text, fontWeight: selectedCategory === cat ? 'bold' : 'normal' }
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>2. Zeitlimit wählen</Text>
                <View style={styles.timeGrid}>
                  {[5, 10, 15, 20].map(mins => (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.timeOption,
                        { 
                          backgroundColor: colors.background, 
                          borderColor: timeLimitMinutes === mins ? colors.primary : colors.border,
                          borderWidth: timeLimitMinutes === mins ? 2 : 1
                        }
                      ]}
                      onPress={() => setTimeLimitMinutes(mins)}
                    >
                      <Clock size={16} color={timeLimitMinutes === mins ? colors.primary : colors.textMuted} />
                      <Text style={[
                        styles.timeOptionText, 
                        { color: colors.text, fontWeight: timeLimitMinutes === mins ? 'bold' : 'normal' }
                      ]}>
                        {mins} Min.
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 3. FRAGENANZAHL WÄHLEN */}
              {(() => {
                const availableQs = selectedCategory === 'Generaltest (Alle Themen)' 
                  ? questions 
                  : questions.filter(q => q.category === selectedCategory);
                return (
                  <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>3. Anzahl der Fragen</Text>
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold' }}>
                        {availableQs.length} verfügbar
                      </Text>
                    </View>
                    <View style={[styles.timeGrid, { marginTop: 12 }]}>
                      {[5, 10, 15, 20, 'all'].map(cnt => (
                        <TouchableOpacity
                          key={cnt.toString()}
                          style={[
                            styles.timeOption,
                            { 
                              backgroundColor: colors.background, 
                              borderColor: questionCountChoice === cnt ? colors.primary : colors.border,
                              borderWidth: questionCountChoice === cnt ? 2 : 1
                            }
                          ]}
                          onPress={() => setQuestionCountChoice(cnt as any)}
                        >
                          <Text style={[
                            styles.timeOptionText, 
                            { color: colors.text, fontWeight: questionCountChoice === cnt ? 'bold' : 'normal' }
                          ]}>
                            {cnt === 'all' ? 'Alle' : cnt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* RECHTS AUF TABLET: START-BUTTON & HISTORY */}
            <View style={isTablet ? { flex: 0.85 } : undefined}>
              {/* START BUTTON */}
              <TouchableOpacity style={styles.startButton} onPress={handleStartQuiz}>
                <Play color="#ffffff" size={20} fill="#ffffff" />
                <Text style={styles.startButtonText}>Prüfung starten</Text>
              </TouchableOpacity>

              {/* HISTORY */}
              {history.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={[styles.historyTitle, { color: colors.text }]}>Bisherige Versuche</Text>
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
          <View style={[styles.quizHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }, isTablet && { alignItems: 'center' }]}>
            <View style={[{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }, isTablet && { paddingHorizontal: 8 }]}>
              <View style={[styles.progressContainer, isTablet && { flex: 1, marginRight: 24 }]}>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  Frage <Text style={{ fontWeight: 'bold' }}>{currentQuestionIndex + 1}</Text> von {quizQuestions.length}
                </Text>
                <View style={[styles.progressBarBg, { backgroundColor: colors.background }]}>
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

              <View style={[styles.timerContainer, { backgroundColor: timeLeft < 60 ? (isDark ? '#7f1d1d' : '#fecaca') : colors.background }]}>
                <Clock size={16} color={timeLeft < 60 ? (isDark ? '#fca5a5' : '#b91c1c') : colors.text} />
                <Text style={[
                  styles.timerText, 
                  { color: timeLeft < 60 ? (isDark ? '#fca5a5' : '#b91c1c') : colors.text, fontWeight: 'bold' }
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
              isTablet && { width: '100%', paddingHorizontal: 16 }
            ]} 
            showsVerticalScrollIndicator={false}
          >
            <View style={[
              styles.questionCard, 
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              isTablet && { padding: 24, borderRadius: 16 }
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#06b6d418', borderColor: '#06b6d4', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, marginBottom: 12 }}>
                        <Shuffle size={14} color="#06b6d4" />
                        <Text style={{ color: '#06b6d4', fontSize: 12, fontWeight: 'bold' }}>Reihenfolge bestimmen</Text>
                      </View>
                    ) : isMultiChoice ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.primary + '18', borderColor: colors.primary, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, marginBottom: 12 }}>
                        <CheckCircle2 size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>Mehrfachauswahl</Text>
                      </View>
                    ) : null}

                    <Text style={[styles.questionText, { color: colors.text }, isTablet && { fontSize: 18, lineHeight: 26 }]}>
                      {cleanText(currentQ?.text)}
                    </Text>

                    <View style={isTablet && currentQ?.imageUrl ? { flexDirection: 'row', gap: 24, marginTop: 12, alignItems: 'flex-start' } : undefined}>
                      {currentQ?.imageUrl && (
                        <View style={isTablet ? { flex: 0.95 } : undefined}>
                          <TouchableOpacity
                            onPress={() => setPreviewImageUrl(currentQ.imageUrl!)}
                            activeOpacity={0.85}
                            style={{ position: 'relative', marginTop: isTablet ? 0 : 10, marginBottom: 16 }}
                          >
                            <Image 
                              source={{ uri: currentQ.imageUrl }} 
                              style={[styles.questionImage, isTablet && { height: 320 }]} 
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
                      )}

                      <View style={isTablet && currentQ?.imageUrl ? { flex: 1.05 } : undefined}>
                        {/* INTERAKTIVER BEREICH: REIHENFOLGE VS. KLASSISCHE AUSWAHL */}
                        {isOrder ? (
                          <View style={{ gap: 10, marginTop: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <GripVertical size={16} color={colors.primary} />
                              <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>
                                Bringe die Schritte per <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Drag & Drop</Text> (Griff ⠿ ziehen) in die richtige Reihenfolge:
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
                            <View style={{ gap: 2 }}>
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
                                <TouchableOpacity
                                  onPress={handleConfirmOrderSelection}
                                  activeOpacity={0.8}
                                  style={{
                                    backgroundColor: colors.primary,
                                    paddingVertical: 14,
                                    paddingHorizontal: 16,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: 10,
                                    gap: 8,
                                  }}
                                >
                                  <CheckCircle2 size={20} color="#ffffff" />
                                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>
                                    Reihenfolge einloggen & prüfen
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    ) : (
                      <>
                        <View style={[
                          styles.optionsContainer,
                          isLandscapeTablet && !currentQ?.imageUrl && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }
                        ]}>
                          {currentQ?.options.map((option, oIndex) => {
                            const hasAnswered = userAnswers[currentQuestionIndex] !== undefined;
                            const selectedAnswers = hasAnswered 
                              ? (userAnswers[currentQuestionIndex] || []) 
                              : pendingMultiSelection;

                            const isSelected = selectedAnswers.includes(oIndex);
                            const isCorrectAnswer = correctIndices.includes(oIndex);
                            const isDangerOption = (currentQ?.danger_indices || currentQ?.dangerIndices || []).includes(oIndex);
                            const optionLetter = ['A', 'B', 'C', 'D', 'E', 'F'][oIndex] || `${oIndex + 1}`;

                            let btnBg = colors.background;
                            let btnBorder = colors.border;
                            let btnBorderWidth = 1.2;
                            let textColor = colors.text;
                            let badgeBg = isDark ? '#1f2937' : '#f3f4f6';
                            let badgeBorder = isDark ? '#374151' : '#e5e7eb';
                            let badgeTextColor = colors.textMuted;
                            let rightIcon = null;

                            if (hasAnswered) {
                              if (isSelected && isCorrectAnswer) {
                                // GRÜN = Richtig gewählt
                                btnBg = isDark ? '#064e3b35' : '#ecfdf5';
                                btnBorder = '#10b981';
                                btnBorderWidth = 1.8;
                                textColor = isDark ? '#6ee7b7' : '#065f46';
                                badgeBg = '#10b981';
                                badgeBorder = '#10b981';
                                badgeTextColor = '#ffffff';
                                rightIcon = <CheckCircle2 size={20} color="#10b981" style={{ marginLeft: 8 }} />;
                              } else if (isSelected && !isCorrectAnswer) {
                                // ROT = Falsch gewählt
                                btnBg = isDark ? '#7f1d1d35' : '#fef2f2';
                                btnBorder = '#ef4444';
                                btnBorderWidth = 1.8;
                                textColor = isDark ? '#fca5a5' : '#991b1b';
                                badgeBg = '#ef4444';
                                badgeBorder = '#ef4444';
                                badgeTextColor = '#ffffff';
                                rightIcon = <XCircle size={20} color="#ef4444" style={{ marginLeft: 8 }} />;
                              } else if (!isSelected && isCorrectAnswer) {
                                // GRÜNE UMRANDUNG = Verpasste richtige Antwort
                                btnBg = isDark ? '#064e3b20' : '#ecfdf580';
                                btnBorder = '#10b981';
                                btnBorderWidth = 1.8;
                                textColor = isDark ? '#6ee7b7' : '#065f46';
                                badgeBg = '#10b98180';
                                badgeBorder = '#10b981';
                                badgeTextColor = '#ffffff';
                                rightIcon = <CheckCircle2 size={18} color="#10b98180" style={{ marginLeft: 8 }} />;
                              } else {
                                textColor = colors.textMuted;
                              }
                            } else if (isSelected) {
                              btnBg = colors.primary + '18';
                              btnBorder = colors.primary;
                              btnBorderWidth = 1.8;
                              badgeBg = colors.primary;
                              badgeBorder = colors.primary;
                              badgeTextColor = '#ffffff';
                              rightIcon = <CheckCircle2 size={18} color={colors.primary} style={{ marginLeft: 8 }} />;
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
                                  },
                                  isLandscapeTablet && !currentQ?.imageUrl && { width: '48.8%', marginHorizontal: 0, marginBottom: 0 }
                                ]}
                                disabled={hasAnswered}
                                onPress={() => handleSelectOption(oIndex)}
                                activeOpacity={0.75}
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
                                  <View style={{ backgroundColor: '#ef444420', borderColor: '#ef4444', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 4, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <AlertTriangle size={11} color="#ef4444" />
                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ef4444' }}>BG</Text>
                                  </View>
                                )}
                                {rightIcon}
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* ANTWORT BESTÄTIGEN BUTTON (FÜR ALLE FRAGEN) */}
                        {userAnswers[currentQuestionIndex] === undefined && (
                          <TouchableOpacity
                            delayPressIn={0}
                            style={{
                              backgroundColor: pendingMultiSelection.length > 0 ? colors.primary : (isDark ? '#374151' : '#e2e8f0'),
                              paddingVertical: 14,
                              paddingHorizontal: 16,
                              borderRadius: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginTop: 14,
                              gap: 8,
                            }}
                            disabled={pendingMultiSelection.length === 0}
                            onPress={handleConfirmSelection}
                            activeOpacity={0.8}
                          >
                            <CheckCircle2 size={20} color={pendingMultiSelection.length > 0 ? '#ffffff' : colors.textMuted} />
                            <Text style={{ color: pendingMultiSelection.length > 0 ? '#ffffff' : colors.textMuted, fontWeight: 'bold', fontSize: 15 }}>
                              {pendingMultiSelection.length > 0 
                                ? (pendingMultiSelection.length === 1 ? 'Antwort bestätigen' : `Antworten bestätigen (${pendingMultiSelection.length} gewählt)`) 
                                : 'Antwort(en) auswählen'}
                            </Text>
                          </TouchableOpacity>
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
                              ? (isDark ? '#064e3b40' : '#d1fae5')
                              : (isDark ? '#7f1d1d40' : '#fee2e2'),
                            borderColor: isCorrect
                              ? '#10b981'
                              : '#ef4444'
                          }
                        ]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {isCorrect ? (
                              <>
                                <CheckCircle2 size={20} color="#10b981" />
                                <Text style={{ fontWeight: 'bold', color: '#10b981', fontSize: 15 }}>
                                  {isOrder ? 'Reihenfolge perfekt richtig!' : 'Richtig gelöst!'}
                                </Text>
                              </>
                            ) : (
                              <>
                                <XCircle size={20} color="#ef4444" />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontWeight: 'bold', color: '#ef4444', fontSize: 15 }}>
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

                          {/* Falls falsche Reihenfolge: Richtige Reihenfolge anzeigen */}
                          {isOrder && !isCorrect && (
                            <View style={{ marginTop: 8, padding: 10, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#10b981', marginBottom: 6 }}>
                                KORREKTE REIHENFOLGE:
                              </Text>
                              {currentQ?.options?.map((opt, sIdx) => (
                                <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginVertical: 2 }}>
                                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{sIdx + 1}</Text>
                                  </View>
                                  <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                                    {cleanText(opt)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* BETRIEBSGEFÄHRDEND WARNUNG */}
                          {isDangerTriggered && (
                            <View style={{ marginTop: 6, marginBottom: 8, padding: 10, backgroundColor: isDark ? '#7f1d1d60' : '#fee2e2', borderRadius: 10, borderWidth: 1.5, borderColor: '#ef4444', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <AlertTriangle size={20} color="#ef4444" />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 13 }}>
                                  BETRIEBSGEFÄHRDENDE ANTWORT (BG)!
                                </Text>
                                <Text style={{ color: isDark ? '#fca5a5' : '#991b1b', fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                                  Diese Fehlhandlung führt im realen Eisenbahnbetrieb zu einer akuten Betriebsgefahr für Züge, Personal und Fahrgäste!
                                </Text>
                              </View>
                            </View>
                          )}

                          {currentQ?.explanation && (
                            <View style={[styles.explanationContainer, { backgroundColor: colors.background }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <Lightbulb size={14} color={colors.primary} />
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>Erklärung:</Text>
                              </View>
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
            { backgroundColor: colors.cardBg, borderTopColor: colors.border },
            isTablet && { alignItems: 'center' }
          ]}>
            <View style={[
              { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 12 },
              isTablet && { width: '100%', paddingHorizontal: 8 }
            ]}>
              <TouchableOpacity 
                delayPressIn={0}
                style={[styles.navButton, { opacity: currentQuestionIndex === 0 ? 0.3 : 1 }]}
                disabled={currentQuestionIndex === 0}
                onPress={handlePrevQuestion}
              >
                <ChevronLeft color={colors.text} size={20} />
                <Text style={[styles.navButtonText, { color: colors.text }]}>Zurück</Text>
              </TouchableOpacity>

              {currentQuestionIndex === quizQuestions.length - 1 ? (
                <TouchableOpacity 
                  delayPressIn={0}
                  style={styles.submitButton}
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
                >
                  <Text style={styles.submitButtonText}>Prüfung abgeben</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  delayPressIn={0}
                  style={styles.navButton}
                  onPress={handleNextQuestion}
                >
                  <Text style={[styles.navButtonText, { color: colors.text }]}>Weiter</Text>
                  <ChevronRight color={colors.text} size={20} />
                </TouchableOpacity>
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
            isTablet && { width: '100%', paddingHorizontal: 20 }
          ]} 
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>Testergebnis</Text>
          
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
                { backgroundColor: colors.cardBg, borderColor: colors.border },
                isTablet && { width: '100%', padding: 28 }
              ]}>
                <Award size={64} color={passed ? colors.success : colors.error} style={styles.resultIcon} />
                <Text style={[styles.resultOutcome, { color: passed ? colors.success : colors.error }]}>
                  {passed ? 'Prüfung Bestanden!' : 'Leider nicht bestanden'}
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
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Antworten-Detailübersicht</Text>
          
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
                        <View style={[styles.badge, { backgroundColor: '#06b6d418', borderColor: '#06b6d4', borderWidth: 1, paddingVertical: 2, paddingHorizontal: 6 }]}>
                          <Text style={{ color: '#06b6d4', fontSize: 10, fontWeight: 'bold' }}>🔀 Reihenfolge</Text>
                        </View>
                      ) : isMulti ? (
                        <View style={[styles.badge, { backgroundColor: colors.primary + '18', paddingVertical: 2, paddingHorizontal: 6 }]}>
                          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>Mehrfachauswahl</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {isUserAnsDanger && (
                        <View style={{ backgroundColor: '#ef444420', borderColor: '#ef4444', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <AlertTriangle size={12} color="#ef4444" />
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ef4444' }}>BG</Text>
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
                          Deine gewählte Reihenfolge:{' '}
                        </Text>
                        {userAns.length > 0 ? (
                          userAns.map((origIdx, sIdx) => {
                            const isSlotCorrect = origIdx === sIdx;
                            return (
                              <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: isSlotCorrect ? colors.success : colors.error, width: 20 }}>
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
                          <View style={{ marginTop: 8, padding: 8, backgroundColor: colors.background, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10b981', marginBottom: 4 }}>
                              KORREKTE REIHENFOLGE:
                            </Text>
                            {q.options?.map((opt, sIdx) => (
                              <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginVertical: 2 }}>
                                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{sIdx + 1}</Text>
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
                          <Text style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 'bold' }}>
                            {userAns.length > 0 
                              ? userAns.map(i => `${['A', 'B', 'C', 'D', 'E', 'F'][i] || i + 1}) ${cleanText(q.options[i])}`).join(' • ')
                              : 'Keine Antwort abgegeben'}
                          </Text>
                        </Text>
                        {isUserAnsDanger && (
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ef4444', marginTop: 2 }}>
                            ⚠️ Diese Antwort ist betriebsgefährdend (BG)!
                          </Text>
                        )}
                        {!isCorrect && (
                          <Text style={[styles.ansLabel, { color: colors.textMuted, marginTop: 4 }]}>
                            Richtige Antwort:{' '}
                            <Text style={{ color: colors.success, fontWeight: 'bold' }}>
                              {correctIndices.map(i => `${['A', 'B', 'C', 'D', 'E', 'F'][i] || i + 1}) ${cleanText(q.options[i])}`).join(' • ')}
                            </Text>
                          </Text>
                        )}
                      </>
                    )}
                  </View>

                  {q.explanation && (
                    <View style={[styles.resultExplanation, { backgroundColor: colors.background }]}>
                      <Text style={[styles.explText, { color: colors.textMuted }]}>
                        <Text style={{ fontWeight: 'bold' }}>Erklärung: </Text>
                        {cleanText(q.explanation)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* BACK TO SETUP BUTTON */}
          <TouchableOpacity 
            style={[
              styles.restartButton,
              isTablet && { maxWidth: 400, width: '100%', alignSelf: 'center', marginTop: 24 }
            ]} 
            onPress={() => setQuizStatus('setup')}
          >
            <RotateCcw color="#ffffff" size={20} />
            <Text style={styles.restartButtonText}>Zurück zur Auswahl</Text>
          </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
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
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
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
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeOptionText: {
    fontSize: 13,
  },
  startButton: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  historySection: {
    marginTop: 24,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
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
    fontSize: 11,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressContainer: {
    flex: 1,
    marginRight: 20,
  },
  progressText: {
    fontSize: 12,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quizContentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  questionCard: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
    marginBottom: 16,
  },
  questionImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.2,
    gap: 12,
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultIcon: {
    marginBottom: 12,
  },
  resultOutcome: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  resultScore: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailAnswerCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  detailAnswerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailAnswerNum: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailAnswerText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 10,
  },
  resultAnsOptions: {
    gap: 2,
    marginBottom: 8,
  },
  ansLabel: {
    fontSize: 12,
  },
  resultExplanation: {
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  explText: {
    fontSize: 11,
    lineHeight: 16,
  },
  restartButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  restartButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  feedbackBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  explanationContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 18,
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  dropLineBar: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
});
