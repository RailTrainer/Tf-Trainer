import { useId, type ReactNode } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View, type ViewProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { Button } from './Button';
import { Heading } from './Section';
import { StatusMessage } from './StatusMessage';
import { RADIUS, SCREEN_PADDING } from './tokens';

export interface ConfirmDialogProps {
  visible: boolean;
  /** Frage als Überschrift, z. B. „Konto endgültig löschen?“ */
  title: string;
  /** Kurze Erklärung, was passiert */
  message: ReactNode;
  /** Aktion, z. B. „Konto endgültig löschen“ */
  confirmTitle: string;
  confirmLoadingTitle?: string;
  confirmIcon?: LucideIcon;
  cancelTitle?: string;
  /** Rote Bestätigung für unumkehrbare Aktionen */
  destructive?: boolean;
  loading?: boolean;
  /** Fehlertext im Dialog, z. B. wenn die Aktion fehlgeschlagen ist */
  error?: string | null;
  onConfirm: () => void;
  /** „Abbrechen“, Zurück-Taste (Android) und Escape (Web) */
  onCancel: () => void;
}

/**
 * Bestätigungsdialog im Screen (statt Alert.alert, das in React Native Web nicht funktioniert).
 * „Abbrechen“ steht zuerst und bekommt im Web den Fokus – der sichere Standard.
 * Ein Tipp auf den abgedunkelten Hintergrund schließt bewusst nicht.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmTitle,
  confirmLoadingTitle,
  confirmIcon,
  cancelTitle = 'Abbrechen',
  destructive = false,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { isDark, colors } = useAppTheme();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const messageId = `${baseId}-message`;

  // Web: Dialog mit Namen und Beschreibung, damit der Screenreader beim Öffnen Frage und Erklärung vorliest.
  const webDialogProps =
    Platform.OS === 'web'
      ? ({ role: 'alertdialog', 'aria-labelledby': titleId, 'aria-describedby': messageId } as unknown as ViewProps)
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!loading) onCancel();
      }}
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
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            <View nativeID={titleId}>
              <Heading level={2} style={styles.title}>
                {title}
              </Heading>
            </View>
            <View nativeID={messageId}>
              {typeof message === 'string' ? (
                <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
              ) : (
                message
              )}
            </View>
            <StatusMessage status={error ? { tone: 'error', message: error } : null} />
            <View style={styles.actions}>
              <Button variant="secondary" title={cancelTitle} onPress={onCancel} disabled={loading} />
              <Button
                variant={destructive ? 'destructive' : 'primary'}
                icon={confirmIcon}
                title={confirmTitle}
                loadingTitle={confirmLoadingTitle}
                loading={loading}
                onPress={onConfirm}
              />
            </View>
          </ScrollView>
        </View>
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
  dialog: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '100%',
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
});
