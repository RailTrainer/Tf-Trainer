import { useMemo, useRef, useState, type ReactElement } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import { Heading } from '../ui/Section';
import { SCREEN_PADDING } from '../ui/tokens';
import { LiveAnnouncer } from '../ui/VisuallyHidden';
import { buildMessageItems, truncate, type MessageListItem } from '../../utils/chatFormat';
import { MessageBubble } from './MessageBubble';
import type { ChatListMessage, SenderInfo } from './types';

/** Ab diesem Abstand zum Ende gilt die Liste als hochgescrollt. */
const BOTTOM_THRESHOLD = 80;

export interface MessageListProps {
  messages: ChatListMessage[];
  currentUserId?: string;
  /** Aktuelle Zeit für „Heute“/„Gestern“ (vom Screen, damit der Render rein bleibt) */
  now: number;
  /** Zeitpunkt der letzten Lesung: Davor steht der Trenner „Neue Nachrichten“ */
  unreadSince?: number | null;
  getSender: (message: ChatListMessage) => SenderInfo;
  canOpenActions: (message: ChatListMessage) => boolean;
  onOpenActions?: (message: ChatListMessage, trigger: View | null) => void;
  onOpenProfile?: (message: ChatListMessage) => void;
  onRetry?: (message: ChatListMessage) => void;
  onDiscard?: (message: ChatListMessage) => void;
  /** Inhalt über den Nachrichten, z. B. ein Hinweis */
  header?: ReactElement | null;
  /** Anzeige ohne Nachrichten */
  empty?: ReactElement | null;
  /** Bei „Bewegung reduzieren“ wird nicht animiert gescrollt */
  reduceMotion: boolean;
}

function lastFromOthers(messages: ChatListMessage[], currentUserId?: string) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.senderId !== currentUserId && !m.sendStatus) return m;
  }
  return undefined;
}

/**
 * Verlauf als FlatList (nicht invertiert, damit die Lesereihenfolge alt → neu auch im Web stimmt).
 * Bleibt am Ende „kleben“, solange man unten ist; sonst erscheint „Neue Nachrichten“ über der Eingabe.
 * Für jeden Kanal/Thread mit eigenem `key` einhängen, damit Scrollstand und Zähler neu beginnen.
 */
export function MessageList({
  messages,
  currentUserId,
  now,
  unreadSince,
  getSender,
  canOpenActions,
  onOpenActions,
  onOpenProfile,
  onRetry,
  onDiscard,
  header,
  empty,
  reduceMotion,
}: MessageListProps) {
  const { colors, isDark } = useAppTheme();
  const screenBg = isDark ? colors.background : colors.cardBg;
  const listRef = useRef<FlatList<MessageListItem<ChatListMessage>>>(null);
  const atBottomRef = useRef(true);
  const metricsRef = useRef({ contentHeight: 0, layoutHeight: 0 });
  const programmaticUntilRef = useRef(0);
  // Letzte eigene Nachricht (Id + Sendestatus), auf die bereits gescrollt wurde
  const lastOwnKeyRef = useRef<string | null>(null);
  const [scrolledUp, setScrolledUp] = useState(false);
  const lastTimestamp = messages.length ? messages[messages.length - 1].timestamp : 0;
  const [seenUntil, setSeenUntil] = useState(lastTimestamp);
  // Beim Einhängen vorhandene Nachrichten nicht ansagen, nur später eintreffende
  const [initialLastOtherId] = useState(() => lastFromOthers(messages, currentUserId)?.id);

  const items = useMemo(
    () => buildMessageItems(messages, { now, currentUserId, unreadSince }),
    [messages, now, currentUserId, unreadSince],
  );

  const newCount = scrolledUp
    ? messages.filter((m) => m.timestamp > seenUntil && m.senderId !== currentUserId).length
    : 0;

  const latestOther = lastFromOthers(messages, currentUserId);
  const announcement =
    latestOther && latestOther.id !== initialLastOtherId
      ? `Neue Nachricht von ${getSender(latestOther).displayName}: ${truncate(latestOther.text, 120)}`
      : null;

  const scrollToEnd = (animated: boolean) => {
    const smooth = animated && !reduceMotion;
    // Während des programmatischen Scrollens melden Scroll-Ereignisse Zwischenstände – kurz ignorieren.
    programmaticUntilRef.current = Date.now() + (smooth ? 600 : 150);
    const { contentHeight, layoutHeight } = metricsRef.current;
    if (contentHeight > 0 && layoutHeight > 0) {
      // Exakte Höhe aus onContentSizeChange – scrollToEnd der FlatList rechnet mit evtl. veralteten Zellhöhen.
      listRef.current?.scrollToOffset({ offset: Math.max(0, contentHeight - layoutHeight), animated: smooth });
    } else {
      listRef.current?.scrollToEnd({ animated: smooth });
    }
  };

  const updateBottomState = (offsetY: number) => {
    const { contentHeight, layoutHeight } = metricsRef.current;
    const atBottom = contentHeight - (offsetY + layoutHeight) < BOTTOM_THRESHOLD;
    if (!atBottom && Date.now() < programmaticUntilRef.current) return;
    atBottomRef.current = atBottom;
    if (atBottom) setSeenUntil(lastTimestamp);
    setScrolledUp(!atBottom);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    metricsRef.current = { contentHeight: contentSize.height, layoutHeight: layoutMeasurement.height };
    updateBottomState(contentOffset.y);
  };

  const handleContentSizeChange = (_width: number, height: number) => {
    const first = metricsRef.current.contentHeight === 0;
    metricsRef.current.contentHeight = height;
    // Eigene neue Nachricht (auch „Nicht gesendet“): immer zum Ende, auch wenn man hochgescrollt war
    const last = messages[messages.length - 1];
    const ownUpdate =
      last !== undefined &&
      last.senderId === currentUserId &&
      `${last.id}:${last.sendStatus ?? ''}` !== lastOwnKeyRef.current;
    if (last && last.senderId === currentUserId) lastOwnKeyRef.current = `${last.id}:${last.sendStatus ?? ''}`;
    if (atBottomRef.current || ownUpdate) {
      atBottomRef.current = true;
      setScrolledUp(false);
      scrollToEnd(!first);
      setSeenUntil(lastTimestamp);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    metricsRef.current.layoutHeight = event.nativeEvent.layout.height;
    // Tastatur/Größenänderung: am Ende bleiben, wenn man dort war
    if (atBottomRef.current) scrollToEnd(false);
  };

  const renderItem: ListRenderItem<MessageListItem<ChatListMessage>> = ({ item }) => {
    if (item.type === 'day') {
      return (
        <View style={styles.dayRow}>
          <Heading level={3} style={[styles.dayLabel, { color: colors.textMuted }]}>
            {item.label}
          </Heading>
        </View>
      );
    }
    if (item.type === 'unread') {
      return (
        <View style={styles.unreadRow}>
          <View aria-hidden style={[styles.unreadLine, { backgroundColor: colors.primary }]} />
          <Heading level={3} style={[styles.unreadLabel, { color: colors.primary }]}>
            Neue Nachrichten
          </Heading>
          <View aria-hidden style={[styles.unreadLine, { backgroundColor: colors.primary }]} />
        </View>
      );
    }
    const { message } = item;
    const sender = getSender(message);
    const isOwn = message.senderId === currentUserId;
    return (
      <MessageBubble
        message={message}
        isOwn={isOwn}
        isFirstInGroup={item.isFirstInGroup}
        isLastInGroup={item.isLastInGroup}
        senderName={sender.displayName}
        roleLabel={sender.roleLabel}
        roleKind={sender.roleKind}
        avatarUrl={sender.avatarUrl}
        hasActions={!message.sendStatus && canOpenActions(message)}
        onOpenActions={onOpenActions}
        onOpenProfile={onOpenProfile}
        onRetry={onRetry}
        onDiscard={onDiscard}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'interactive'}
        initialNumToRender={30}
        maxToRenderPerBatch={20}
        windowSize={15}
      />
      {scrolledUp ? (
        <View style={styles.jumpWrapper} pointerEvents="box-none">
          <Button
            variant="secondary"
            icon={ArrowDown}
            title={newCount > 0 ? `${newCount === 1 ? '1 neue Nachricht' : `${newCount} neue Nachrichten`}` : 'Zum Ende'}
            accessibilityHint="Springt zur neuesten Nachricht"
            onPress={() => {
              atBottomRef.current = true;
              scrollToEnd(true);
              setSeenUntil(lastTimestamp);
              setScrolledUp(false);
            }}
            style={[styles.jumpButton, { backgroundColor: screenBg }]}
          />
        </View>
      ) : null}
      <LiveAnnouncer message={announcement} id={latestOther ? latestOther.timestamp : 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
  },
  dayRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  unreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  unreadLine: {
    flex: 1,
    height: 1,
  },
  unreadLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  jumpWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
  },
  jumpButton: {
    minHeight: 44,
    paddingVertical: 8,
  },
});
