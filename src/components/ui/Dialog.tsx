import { useId, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { X } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { IconButton } from './IconButton';
import { Heading } from './Section';
import { RADIUS, SCREEN_PADDING } from './tokens';

export interface DialogProps {
  visible: boolean;
  /** Überschrift, zugleich Name des Dialogs */
  title: string;
  /** Kurze Erklärung unter dem Titel (Web: aria-describedby) */
  description?: ReactNode;
  children?: ReactNode;
  /** Escape (Web), Zurück-Taste (Android), Schließen-Button und – falls `dismissable` – Tipp auf den Hintergrund */
  onClose: () => void;
  /**
   * `dialog`: Information/Auswahl, schließbar über Hintergrund und X.
   * `alertdialog`: Rückfrage vor einer Aktion – Hintergrund schließt nicht, kein X (Abbrechen-Button im Inhalt).
   */
  role?: 'dialog' | 'alertdialog';
  /** Ausgerichtet am Inhalt statt am Titel, z. B. Profil mit Avatar */
  align?: 'start' | 'center';
  /** Schließen gesperrt, z. B. während einer laufenden Aktion */
  busy?: boolean;
  closeLabel?: string;
  /** Inhalt vor dem Titel, z. B. ein Avatar */
  leading?: ReactNode;
}

/**
 * Gemeinsamer Dialog-Rahmen (statt Alert.alert, das in React Native Web nicht funktioniert).
 * Ein Hintergrund, Radius 6, keine Schatten. Bei „Bewegung reduzieren“ ohne Einblend-Animation.
 */
export function Dialog({
  visible,
  title,
  description,
  children,
  onClose,
  role = 'dialog',
  align = 'start',
  busy = false,
  closeLabel = 'Schließen',
  leading,
}: DialogProps) {
  const { isDark, colors } = useAppTheme();
  const reduceMotion = useReduceMotion();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const dismissable = role === 'dialog';

  const close = () => {
    if (!busy) onClose();
  };

  // Web: Rolle mit Namen und Beschreibung, damit der Screenreader beim Öffnen Titel und Erklärung vorliest.
  const webDialogProps =
    Platform.OS === 'web'
      ? ({
          role,
          'aria-modal': true,
          'aria-labelledby': titleId,
          'aria-describedby': description ? descriptionId : undefined,
        } as unknown as ViewProps)
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View
          {...webDialogProps}
          accessibilityViewIsModal
          style={[
            styles.dialog,
            { backgroundColor: isDark ? colors.background : colors.cardBg, borderColor: colors.border },
          ]}
        >
          {/* Schließen steht zuerst in der Reihenfolge (oben rechts); zIndex hält ihn über dem Scrollbereich. */}
          {dismissable ? (
            <IconButton icon={X} accessibilityLabel={closeLabel} onPress={close} style={styles.closeButton} />
          ) : null}
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            {leading ? <View style={styles.leading}>{leading}</View> : null}
            <View nativeID={titleId} style={[dismissable && styles.titleWithClose, align === 'center' && styles.center]}>
              <Heading level={2} style={[styles.title, align === 'center' && styles.textCenter]}>
                {title}
              </Heading>
            </View>
            {description ? (
              <View nativeID={descriptionId}>
                {typeof description === 'string' ? (
                  <Text style={[styles.description, { color: colors.text }, align === 'center' && styles.textCenter]}>
                    {description}
                  </Text>
                ) : (
                  description
                )}
              </View>
            ) : null}
            {children}
          </ScrollView>
        </View>
        {dismissable ? (
          // Tipp daneben schließt; für Tastatur und Screenreader gibt es den Schließen-Button.
          // Steht hinter dem Dialog, damit RN Web beim Öffnen nicht diese Fläche fokussiert (zIndex legt sie darunter).
          <Pressable
            style={[StyleSheet.absoluteFill, styles.backdropPress]}
            onPress={close}
            accessible={false}
            importantForAccessibility="no"
            tabIndex={-1}
            aria-hidden
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SCREEN_PADDING,
  },
  backdropPress: {
    zIndex: 0,
  },
  dialog: {
    zIndex: 1,
    width: '100%',
    maxWidth: 440,
    maxHeight: '100%',
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  content: {
    padding: 24,
  },
  leading: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleWithClose: {
    // Platz für den Schließen-Button oben rechts
    paddingRight: 40,
  },
  center: {
    paddingLeft: 40,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  textCenter: {
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
});
