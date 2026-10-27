import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Camera,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Plus,
  Check,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { mockDb, Category, User, QuestionType } from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import { AppKeyboardPane } from './ui/AppKeyboardPane';
import { useSmoothKeyboardScroll } from '../hooks/useSmoothKeyboardScroll';
import { uploadAndOptimizeImage } from '../utils/imageOptimizer';

interface CreateQuestionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categories: Category[];
  defaultCategory?: string;
  currentUser: User | null;
}

export const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  visible,
  onClose,
  onSuccess,
  categories,
  defaultCategory,
  currentUser,
}) => {
  const { colors, isDark } = useAppTheme();
  const scrollRef = React.useRef<any>(null);
  const { onScroll: onSmoothScroll, handleInputFocus } = useSmoothKeyboardScroll();

  const [category, setCategory] = useState<string>(
    defaultCategory || categories[0]?.name || 'Allgemein'
  );
  const [questionType, setQuestionType] = useState<QuestionType>('single');
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctIndices, setCorrectIndices] = useState<number[]>([0]);
  const [dangerIndices, setDangerIndices] = useState<number[]>([]);
  const [orderSteps, setOrderSteps] = useState<string[]>(['', '', '']);
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Synchronisiere defaultCategory bei Öffnung
  React.useEffect(() => {
    if (visible) {
      if (defaultCategory) {
        setCategory(defaultCategory);
      } else if (categories.length > 0 && !categories.some(c => c.name === category)) {
        setCategory(categories[0].name);
      }
    }
  }, [visible, defaultCategory, categories]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Berechtigung erforderlich',
          'Wir benötigen Zugriff auf deine Fotos, um ein Bild an die Frage anzuhängen.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSubmitting(true);
        const raw = result.assets[0].uri;
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'questions');
        setImageUrl(optimizedUri);
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Bild konnte nicht ausgewählt werden: ' + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCorrect = (idx: number) => {
    if (questionType === 'single') {
      setCorrectIndices([idx]);
    } else {
      setCorrectIndices((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b)
      );
    }
  };

  const handleToggleDanger = (idx: number) => {
    setDangerIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      Alert.alert('Hinweis', 'Maximal 6 Antwortmöglichkeiten erlaubt.');
      return;
    }
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 3) {
      Alert.alert('Hinweis', 'Mindestens 3 Antwortmöglichkeiten erforderlich.');
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    setCorrectIndices((prev) =>
      prev
        .filter((i) => i !== idx)
        .map((i) => (i > idx ? i - 1 : i))
    );
    setDangerIndices((prev) =>
      prev
        .filter((i) => i !== idx)
        .map((i) => (i > idx ? i - 1 : i))
    );
  };

  const handleAddOrderStep = () => {
    if (orderSteps.length >= 6) {
      Alert.alert('Hinweis', 'Maximal 6 Handlungsschritte erlaubt.');
      return;
    }
    setOrderSteps((prev) => [...prev, '']);
  };

  const handleRemoveOrderStep = (idx: number) => {
    if (orderSteps.length <= 2) {
      Alert.alert('Hinweis', 'Mindestens 2 Handlungsschritte erforderlich.');
      return;
    }
    setOrderSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveOrderStep = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= orderSteps.length) return;
    const updated = [...orderSteps];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setOrderSteps(updated);
  };

  const handleReset = () => {
    setText('');
    setOptions(['', '', '', '']);
    setCorrectIndices([0]);
    setDangerIndices([]);
    setOrderSteps(['', '', '']);
    setExplanation('');
    setImageUrl('');
    setQuestionType('single');
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Fehler', 'Bitte gib den Fragentext ein.');
      return;
    }

    let cleanOptions: string[] = [];
    let validCorrectIndices: number[] = [];
    let targetQuestionType = questionType;
    let targetDangerIndices: number[] = [];

    if (questionType === 'order') {
      cleanOptions = orderSteps.map((s) => s.trim()).filter((s) => s !== '');
      if (cleanOptions.length < 2) {
        Alert.alert('Fehler', 'Bitte gib mindestens 2 Handlungsschritte für die Reihenfolge an.');
        return;
      }
      validCorrectIndices = cleanOptions.map((_, i) => i);
      targetQuestionType = 'order';
      targetDangerIndices = [];
    } else {
      cleanOptions = options.map((o) => o.trim()).filter((o) => o !== '');
      if (cleanOptions.length < 3) {
        Alert.alert('Fehler', 'Bitte gib mindestens 3 Antwortmöglichkeiten ein.');
        return;
      }
      validCorrectIndices = correctIndices.filter((i) => i < cleanOptions.length);
      if (validCorrectIndices.length === 0) {
        Alert.alert(
          'Fehler',
          'Bitte markiere mindestens eine richtige Antwort mit dem grünen Häkchen.'
        );
        return;
      }
      targetQuestionType = validCorrectIndices.length > 1 ? 'multiple' : 'single';
      targetDangerIndices = dangerIndices.filter((i) => i < cleanOptions.length);
    }

    try {
      setSubmitting(true);

      const creatorRole = currentUser?.role || 'user';
      const createdBy = currentUser?.id || 'anonymous_user';
      const createdByName = currentUser?.name || currentUser?.email || 'Schüler';

      // Quizfragen von Schülern sind IMMER isVerified = false
      await mockDb.saveQuestion({
        category: category || (categories[0]?.name ?? 'Allgemein'),
        text: text.trim(),
        options: cleanOptions,
        questionType: targetQuestionType,
        correctIndex: validCorrectIndices[0] ?? 0,
        correctIndices: validCorrectIndices,
        correct_indices: validCorrectIndices,
        explanation: explanation.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        dangerIndices: targetDangerIndices,
        danger_indices: targetDangerIndices,
        isVerified: false,
        createdBy,
        createdByName,
        creatorRole,
      });

      Alert.alert(
        'Quizfrage eingereicht! 🎯',
        'Vielen Dank für deinen Beitrag!\n\nDeine Prüfungsfrage wurde erfolgreich eingereicht. Ein Ausbilder oder Moderator wird sie prüfen und freigeben, bevor sie im Prüfungsmodus erscheint.',
        [
          {
            text: 'Großartig!',
            onPress: () => {
              handleReset();
              if (onSuccess) onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte Quizfrage nicht einreichen: ' + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <AppKeyboardPane style={{ flex: 1, backgroundColor: colors.background }}>
        {/* HEADER */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.cardBg, borderBottomColor: colors.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Quizfrage einreichen
              </Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Prüfungsfrage vorschlagen & zur Prüfung einreichen
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          onScroll={onSmoothScroll}
          scrollEventThrottle={16}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 240 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* HINWEIS-BOX */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: isDark ? '#1e293b' : '#eff6ff',
                borderColor: isDark ? '#334155' : '#bfdbfe',
              },
            ]}
          >
            <ShieldCheck size={22} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoBannerTitle, { color: colors.primary }]}>
                Freigabe durch Ausbilder & Moderatoren
              </Text>
              <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
                Deine Frage wird vor der Aufnahme in die offizielle Prüfungssimulation von einem
                Ausbilder oder Moderator auf Korrektheit und Regelwerkskonformität geprüft.
              </Text>
            </View>
          </View>

          {/* KATEGORIE */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Themenbereich / Kategorie *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((c) => {
                const isSelected = category === c.name;
                return (
                  <TouchableOpacity
                    key={c.name}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.cardBg,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(c.name)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? '#ffffff' : colors.text },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* FRAGETYP */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Fragetyp wählen *</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: questionType === 'single' ? colors.primary : colors.cardBg,
                    borderColor: questionType === 'single' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setQuestionType('single');
                  if (correctIndices.length > 1) {
                    setCorrectIndices([correctIndices[0] ?? 0]);
                  }
                }}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    { color: questionType === 'single' ? '#ffffff' : colors.text },
                  ]}
                >
                  🔘 Single Choice
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: questionType === 'multiple' ? colors.primary : colors.cardBg,
                    borderColor: questionType === 'multiple' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setQuestionType('multiple')}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    { color: questionType === 'multiple' ? '#ffffff' : colors.text },
                  ]}
                >
                  ☑️ Multiple Choice
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: questionType === 'order' ? colors.primary : colors.cardBg,
                    borderColor: questionType === 'order' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setQuestionType('order')}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    { color: questionType === 'order' ? '#ffffff' : colors.text },
                  ]}
                >
                  🔀 Reihenfolge
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FRAGENTEXT */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Fragentext *</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.cardBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="z.B. Wie ist zu handeln, wenn das Hauptsignal Halt zeigt und ein Zs 1 aufleuchtet?"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ANTWORTMÖGLICHKEITEN: SINGLE / MULTIPLE CHOICE */}
          {questionType !== 'order' ? (
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
                  Antwortmöglichkeiten & Lösung *
                </Text>
                <Text style={{ fontSize: 11, color: colors.primary }}>
                  {questionType === 'single' ? 'Tippe 1 richtige an' : 'Tippe alle richtigen an'}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
                Tippe auf den linken Haken, um die richtige Antwort zu markieren (Grün = Richtig).
              </Text>

              <View style={{ gap: 8 }}>
                {options.map((opt, idx) => {
                  const isCorrect = correctIndices.includes(idx);
                  const isDanger = dangerIndices.includes(idx);

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.optionRow,
                        {
                          backgroundColor: colors.cardBg,
                          borderColor: isCorrect ? '#10b981' : colors.border,
                          borderWidth: isCorrect ? 1.5 : 1,
                        },
                      ]}
                    >
                      {/* CORRECT TOGGLE */}
                      <TouchableOpacity
                        style={[
                          styles.correctCheckBtn,
                          {
                            backgroundColor: isCorrect ? '#10b981' : 'transparent',
                            borderColor: isCorrect ? '#10b981' : colors.textMuted,
                          },
                        ]}
                        onPress={() => handleToggleCorrect(idx)}
                      >
                        {isCorrect && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </TouchableOpacity>

                      {/* TEXT INPUT */}
                      <TextInput
                        style={[styles.optionInput, { color: colors.text }]}
                        placeholder={`Antwort ${idx + 1}...`}
                        placeholderTextColor={colors.textMuted}
                        value={opt}
                        onChangeText={(val) => {
                          const updated = [...options];
                          updated[idx] = val;
                          setOptions(updated);
                        }}
                      />

                      {/* GEFAHRENPUNKT / DANGER TOGGLE (MULTIPLE CHOICE) */}
                      {questionType === 'multiple' && (
                        <TouchableOpacity
                          style={[
                            styles.dangerBtn,
                            { backgroundColor: isDanger ? '#ef444420' : 'transparent' },
                          ]}
                          onPress={() => handleToggleDanger(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        >
                          <AlertTriangle
                            size={16}
                            color={isDanger ? '#ef4444' : colors.textMuted}
                          />
                        </TouchableOpacity>
                      )}

                      {/* DELETE OPTION */}
                      {options.length > 3 && (
                        <TouchableOpacity
                          style={styles.deleteOptionBtn}
                          onPress={() => handleRemoveOption(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>

              {options.length < 6 && (
                <TouchableOpacity
                  style={[
                    styles.addOptionBtn,
                    { borderColor: colors.border, backgroundColor: colors.cardBg },
                  ]}
                  onPress={handleAddOption}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                    Antwortmöglichkeit hinzufügen
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* REIHENFOLGE BUILDER */
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
                  Handlungsschritte in korrekter Reihenfolge *
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
                Trage die Schritte von 1 bis {orderSteps.length} in der richtigen Ablauffolge ein.
                Im Quiz werden sie automatisch zufällig gemischt.
              </Text>

              <View style={{ gap: 8 }}>
                {orderSteps.map((step, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.orderRow,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.orderNumberBadge}>
                      <Text style={styles.orderNumberText}>{idx + 1}</Text>
                    </View>

                    <TextInput
                      style={[styles.orderInput, { color: colors.text }]}
                      placeholder={`Schritt ${idx + 1}...`}
                      placeholderTextColor={colors.textMuted}
                      value={step}
                      onChangeText={(val) => {
                        const updated = [...orderSteps];
                        updated[idx] = val;
                        setOrderSteps(updated);
                      }}
                    />

                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => handleMoveOrderStep(idx, 'up')}
                        disabled={idx === 0}
                      >
                        <ArrowUp
                          size={16}
                          color={idx === 0 ? colors.textMuted + '40' : colors.text}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => handleMoveOrderStep(idx, 'down')}
                        disabled={idx === orderSteps.length - 1}
                      >
                        <ArrowDown
                          size={16}
                          color={
                            idx === orderSteps.length - 1
                              ? colors.textMuted + '40'
                              : colors.text
                          }
                        />
                      </TouchableOpacity>
                    </View>

                    {orderSteps.length > 2 && (
                      <TouchableOpacity
                        style={styles.deleteOptionBtn}
                        onPress={() => handleRemoveOrderStep(idx)}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {orderSteps.length < 6 && (
                <TouchableOpacity
                  style={[
                    styles.addOptionBtn,
                    { borderColor: colors.border, backgroundColor: colors.cardBg },
                  ]}
                  onPress={handleAddOrderStep}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                    Schritt hinzufügen
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ERKLÄRUNG / BEGRÜNDUNG (OPTIONAL) */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Erklärung / Regelwerk (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.cardBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Begründung der richtigen Antwort bzw. Verweis auf Regelwerk (z.B. Ril 301)..."
              placeholderTextColor={colors.textMuted}
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* BILD / FOTO (OPTIONAL) */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Foto / Abbildung (optional)
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <TouchableOpacity
                style={[
                  styles.imagePickBtn,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
                onPress={handlePickImage}
              >
                <Camera size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                  Foto aus Galerie wählen
                </Text>
              </TouchableOpacity>

              {imageUrl.trim() !== '' && (
                <TouchableOpacity
                  style={[
                    styles.imageDeleteBtn,
                    {
                      backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
                      borderColor: '#ef4444',
                    },
                  ]}
                  onPress={() => setImageUrl('')}
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 13 }}>
                    Löschen
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Oder Bild-URL einfügen (https://...)"
              placeholderTextColor={colors.textMuted}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {imageUrl.trim() !== '' && (
              <View
                style={[
                  styles.imagePreviewWrapper,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.cancelBtn,
                { borderColor: colors.border, backgroundColor: colors.cardBg },
              ]}
              onPress={() => {
                handleReset();
                onClose();
              }}
              disabled={submitting}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.submitBtn,
                { backgroundColor: colors.primary },
                submitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={[styles.btnText, { color: '#ffffff', fontWeight: 'bold' }]}>
                    Quizfrage einreichen
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </AppKeyboardPane>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 8,
  },
  correctCheckBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  dangerBtn: {
    padding: 6,
    borderRadius: 6,
  },
  deleteOptionBtn: {
    padding: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  orderNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumberText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  orderInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  reorderBtn: {
    padding: 4,
  },
  imagePickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  imageDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imagePreviewWrapper: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  submitBtn: {},
  btnText: {
    fontSize: 15,
  },
});
