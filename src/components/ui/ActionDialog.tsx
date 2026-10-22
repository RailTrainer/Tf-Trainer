import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { ListRow } from './ListRow';

export interface DialogAction {
  key: string;
  /** Nennt die Aktion, z. B. „Nachricht melden“ */
  label: string;
  icon?: LucideIcon;
  /** Rote Schrift und rotes Icon für destruktive Aktionen (Bestätigung folgt im nächsten Schritt) */
  danger?: boolean;
  description?: string;
  onPress: () => void;
}

export interface ActionDialogProps {
  visible: boolean;
  /** Bezug, z. B. „Nachricht von Jonas T.“ */
  title: string;
  /** Kontext unter dem Titel, z. B. Anfang der Nachricht */
  description?: ReactNode;
  actions: DialogAction[];
  onClose: () => void;
  cancelTitle?: string;
}

/**
 * Aktionsmenü als Dialog (statt Alert mit mehreren Buttons oder Long-Press-Menü).
 * Jede Aktion ist eine Zeile ≥ 56 px; destruktive Aktionen rot, aber ohne Fläche.
 */
export function ActionDialog({ visible, title, description, actions, onClose, cancelTitle = 'Abbrechen' }: ActionDialogProps) {
  return (
    <Dialog visible={visible} title={title} description={description} onClose={onClose}>
      <View style={styles.list}>
        {actions.map((action, index) => (
          <ListRow
            key={action.key}
            title={action.label}
            description={action.description}
            icon={action.icon}
            danger={action.danger}
            onPress={action.onPress}
            dividerBottom={index === actions.length - 1}
          />
        ))}
      </View>
      <Button variant="secondary" title={cancelTitle} onPress={onClose} style={styles.cancel} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 16,
  },
  cancel: {
    marginTop: 24,
  },
});
