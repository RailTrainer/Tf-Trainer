import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { StatusMessage } from './StatusMessage';

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
  /** Zusätzlicher Inhalt zwischen Erklärung und Buttons, z. B. eine Auswahl */
  children?: ReactNode;
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
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog visible={visible} title={title} description={message} onClose={onCancel} role="alertdialog" busy={loading}>
      {children}
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
    </Dialog>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 24,
    gap: 12,
  },
});
