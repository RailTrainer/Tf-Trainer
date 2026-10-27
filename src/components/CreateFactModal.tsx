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
import { X, Camera, Trash2, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { mockDb, Category, User, SignalSubcategory } from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import { AppKeyboardPane } from './ui/AppKeyboardPane';
import { uploadAndOptimizeImage } from '../utils/imageOptimizer';

interface CreateFactModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categories: Category[];
  defaultCategory?: string;
  currentUser: User | null;
}

export const CreateFactModal: React.FC<CreateFactModalProps> = ({
  visible,
  onClose,
  onSuccess,
  categories,
  defaultCategory,
  currentUser,
}) => {
  const { colors, isDark } = useAppTheme();

  const [category, setCategory] = useState<string>(
    defaultCategory || categories[0]?.name || 'Allgemein'
  );
  const [signalSubcategories, setSignalSubcategories] = useState<SignalSubcategory[]>([]);
  const [subcategory, setSubcategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reference, setReference] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Synchronisiere defaultCategory bei Öffnung
  React.useEffect(() => {
    if (visible) {
      mockDb.getSignalSubcategories().then(subs => setSignalSubcategories(subs));
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
          'Wir benötigen Zugriff auf deine Fotos, um ein Bild an die Lernkarte anzuhängen.'
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
        const optimizedUri = await uploadAndOptimizeImage(raw, 'content', 'facts');
        setImageUrl(optimizedUri);
      }
    } catch (e: any) {
      Alert.alert('Fehler', 'Bild konnte nicht ausgewählt werden: ' + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setSubcategory('');
    setContent('');
    setReference('');
    setImageUrl('');
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel oder Begriff für die Lernkarte ein.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Fehler', 'Bitte gib den Inhalt bzw. die Erklärung ein.');
      return;
    }
    if (!reference.trim()) {
      Alert.alert(
        'Fehler',
        'Bitte gib die Regelwerks-Quelle an (z.B. VDV 757, VDV 758, Ril 301, KoRil).'
      );
      return;
    }

    try {
      setSubmitting(true);

      const creatorRole = currentUser?.role || 'user';
      const createdBy = currentUser?.id || 'anonymous_user';
      const createdByName = currentUser?.name || currentUser?.email || 'Schüler';

      // Lernkarten von Schülern sind IMMER isVerified = false
      await mockDb.saveFact({
        category: category || (categories[0]?.name ?? 'Allgemein'),
        subcategory: category === 'Signale' ? (subcategory.trim() || undefined) : undefined,
        title: title.trim(),
        content: content.trim(),
        reference: reference.trim(),
        imageUrl: imageUrl.trim() || undefined,
        isVerified: false,
        createdBy,
        createdByName,
        creatorRole,
      });

      Alert.alert(
        'Lernkarte eingereicht! 🎓',
        'Vielen Dank für deinen Beitrag!\n\nDeine Lernkarte wurde erfolgreich eingereicht. Ein Ausbilder oder Moderator wird sie prüfen und freigeben, bevor sie für alle Schüler sichtbar ist.',
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
      Alert.alert('Fehler', 'Konnte Lernkarte nicht einreichen: ' + (e?.message || e));
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
                Lernkarte einreichen
              </Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Wissen teilen & zur Prüfung einreichen
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
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* HINWEIS-BOX: 4-AUGEN-PRINZIP & FREIGABE */}
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
                Alle eingereichten Lernkarten werden vor der Veröffentlichung von einem Ausbilder
                oder Moderator geprüft. So stellen wir sicher, dass alle Fachinhalte fachlich korrekt
                sind.
              </Text>
            </View>
          </View>

          {/* KATEGORIE-AUSWAHL */}
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

          {/* SIGNAL-UNTERKATEGORIE */}
          {category === 'Signale' && signalSubcategories.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>Signal-Unterkategorie (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {signalSubcategories.map((s) => {
                  const isSelected = subcategory === s.name;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.cardBg,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSubcategory(isSelected ? '' : s.name)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: isSelected ? '#ffffff' : colors.text },
                        ]}
                      >
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* TITEL / BEGRIFF */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Titel / Begriff *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="z.B. Bremsprobeberechtigung VDV 757"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* INHALT / FACHWISSEN */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Inhalt / Fachwissen *</Text>
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
              placeholder="Erkläre den Sachverhalt präzise und verständlich..."
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* REGELWERKS-QUELLE */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Regelwerks-Quelle *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="z.B. VDV 757 Abs. 4.2 / Ril 301.0101"
              placeholderTextColor={colors.textMuted}
              value={reference}
              onChangeText={setReference}
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
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                  },
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
                    Lernkarte einreichen
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
    minHeight: 100,
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
