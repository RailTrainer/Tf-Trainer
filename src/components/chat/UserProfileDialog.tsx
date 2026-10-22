import { StyleSheet, View } from 'react-native';
import { Ban, Clock, ShieldCheck } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Heading } from '../ui/Section';
import { StatusMessage } from '../ui/StatusMessage';
import { formatDateTime } from '../../utils/chatFormat';
import { RoleLabel } from './RoleLabel';
import type { RoleKind } from './types';

export interface ProfileModeration {
  /** Aktueller Zustand des Nutzers */
  restriction: { type: 'timeout'; until: number } | { type: 'banned' } | null;
  onTimeout: () => void;
  onBan: () => void;
  onUnban: () => void;
}

export interface UserProfileDialogProps {
  visible: boolean;
  name: string;
  avatarUrl?: string;
  roleLabel: string;
  roleKind: RoleKind;
  /** Nur für Ausbilder/Mods mit Berechtigung */
  moderation?: ProfileModeration | null;
  onClose: () => void;
}

/** Profil-Vorschau aus dem Chat: Bild, Name, Rolle und – falls erlaubt – Moderation. */
export function UserProfileDialog({
  visible,
  name,
  avatarUrl,
  roleLabel,
  roleKind,
  moderation,
  onClose,
}: UserProfileDialogProps) {
  const restriction = moderation?.restriction ?? null;

  return (
    <Dialog
      visible={visible}
      title={name}
      align="center"
      leading={<Avatar uri={avatarUrl} size={64} />}
      onClose={onClose}
      closeLabel="Profil schließen"
    >
      <RoleLabel label={roleLabel} kind={roleKind} style={styles.role} />
      {moderation ? (
        <View style={styles.moderation}>
          <Heading level={3}>Moderation</Heading>
          {restriction ? (
            <>
              <StatusMessage
                status={
                  restriction.type === 'timeout'
                    ? {
                        tone: 'warning',
                        icon: Clock,
                        message: `Stummgeschaltet bis ${formatDateTime(restriction.until)}.`,
                      }
                    : { tone: 'error', icon: Ban, message: 'Im Chat gesperrt.' }
                }
              />
              <Button
                variant="secondary"
                icon={ShieldCheck}
                title="Sperre aufheben"
                onPress={moderation.onUnban}
                style={styles.firstAction}
              />
            </>
          ) : (
            <View style={[styles.actions, styles.firstAction]}>
              <Button variant="secondary" icon={Clock} title="24 Stunden stummschalten" onPress={moderation.onTimeout} />
              <Button variant="secondary" danger icon={Ban} title="Dauerhaft sperren" onPress={moderation.onBan} />
            </View>
          )}
        </View>
      ) : null}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  role: {
    alignSelf: 'center',
    marginTop: 4,
  },
  moderation: {
    marginTop: 24,
  },
  actions: {
    gap: 12,
  },
  firstAction: {
    marginTop: 16,
  },
});
