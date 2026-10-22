import { useRef, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type PressableStateCallbackType,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { CountBadge } from '../ui/CountBadge';
import { IconButton } from '../ui/IconButton';
import { SCREEN_PADDING } from '../ui/tokens';
import { formatListTime } from '../../utils/chatFormat';
import { formatDisplayNameWithInitial } from '../../services/notificationService';
import type { SupportThread } from './types';

export interface ThreadListProps {
  threads: SupportThread[];
  /** Ausgewählte Anfrage (Split-View) */
  selectedId?: string | null;
  isUnread: (thread: SupportThread) => boolean;
  now: number;
  /** Zeigt den Papierkorb je Zeile (nur Ausbilder/Admins) */
  canDelete: boolean;
  onOpen: (thread: SupportThread) => void;
  onDelete: (thread: SupportThread, trigger: View | null) => void;
  /** Merkt sich die Zeilen, damit der Fokus nach „Zurück“ dorthin zurückkehren kann */
  registerRow?: (studentId: string, row: View | null) => void;
  /** Kopf über der Liste (z. B. Überschrift); scrollt mit */
  header?: ReactNode;
  /** Text, wenn keine Anfragen vorhanden sind */
  empty?: ReactNode;
}

/** Hover gibt es nur in React Native Web, daher nicht im nativen Typ. */
function isHovered(state: PressableStateCallbackType): boolean {
  return Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
}

/**
 * Anfragen der Schüler: Zeile öffnet den Chat, der Papierkorb steht daneben (nicht verschachtelt),
 * damit beide Ziele getrennt bedienbar sind.
 */
export function ThreadList({
  threads,
  selectedId,
  isUnread,
  now,
  canDelete,
  onOpen,
  onDelete,
  registerRow,
  header,
  empty,
}: ThreadListProps) {
  const { colors } = useAppTheme();
  const deleteRefs = useRef<Record<string, View | null>>({});

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {header}
      {threads.length === 0 ? empty : null}
      {threads.map((thread, index) => {
        const name = formatDisplayNameWithInitial(thread.studentName);
        const unread = isUnread(thread);
        const selected = thread.studentId === selectedId;
        // Auf der Auswahlfläche (accentBg) reicht textMuted im Dunkelmodus nicht (4,08:1) – dort volle Textfarbe
        const emphasized = unread || selected;
        const time = formatListTime(thread.timestamp, now);
        // Web: aktuelle Auswahl als aria-current (RN-Typ kennt es nicht)
        const webCurrent =
          Platform.OS === 'web' && selected ? ({ 'aria-current': 'true' } as unknown as PressableProps) : null;

        return (
          <View
            key={thread.studentId}
            style={[
              styles.row,
              { borderBottomColor: colors.border },
              index === 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
              selected && { backgroundColor: colors.accentBg },
            ]}
          >
            <Pressable
              ref={(node) => {
                registerRow?.(thread.studentId, node);
              }}
              onPress={() => onOpen(thread)}
              accessibilityRole="button"
              accessibilityLabel={`${name}${unread ? ', neu' : ''}, ${time}: ${thread.lastMessage}`}
              accessibilityHint="Öffnet den Chat"
              accessibilityState={{ selected }}
              {...webCurrent}
              style={(state) => [
                styles.main,
                (state.pressed || isHovered(state)) && !selected
                  ? { backgroundColor: colors.buttonSecondaryPressedBg }
                  : null,
              ]}
            >
              <View style={styles.topLine}>
                <Text
                  numberOfLines={1}
                  style={[styles.name, { color: colors.text, fontWeight: unread ? '700' : '500' }]}
                >
                  {name}
                </Text>
                {unread ? <CountBadge value="Neu" /> : null}
                <Text style={[styles.time, { color: emphasized ? colors.text : colors.textMuted }]}>{time}</Text>
              </View>
              <Text
                numberOfLines={2}
                style={[styles.preview, { color: emphasized ? colors.text : colors.textMuted }]}
              >
                {thread.lastMessage}
              </Text>
            </Pressable>
            {canDelete ? (
              <IconButton
                ref={(node) => {
                  deleteRefs.current[thread.studentId] = node;
                }}
                icon={Trash2}
                tone="danger"
                accessibilityLabel={`Chatverlauf mit ${name} löschen`}
                onPress={() => onDelete(thread, deleteRefs.current[thread.studentId] ?? null)}
                style={styles.deleteButton}
              />
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    paddingVertical: 12,
    paddingLeft: SCREEN_PADDING,
    paddingRight: 8,
    justifyContent: 'center',
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 24,
  },
  time: {
    marginLeft: 'auto',
    fontSize: 13,
    lineHeight: 18,
  },
  preview: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  deleteButton: {
    marginRight: 4,
  },
});
