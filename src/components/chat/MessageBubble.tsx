import { memo, useRef } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, MoreHorizontal } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { RADIUS } from '../ui/tokens';
import { VisuallyHiddenText } from '../ui/VisuallyHidden';
import { formatTime } from '../../utils/chatFormat';
import { RoleLabel } from './RoleLabel';
import type { ChatListMessage, RoleKind } from './types';

/** Platzhaltertext, den der Ausbilderchat bei reinen Fotos speichert – wird bei vorhandenem Bild nicht angezeigt. */
const PHOTO_PLACEHOLDER_TEXT = '[Foto gesendet]';

/** Breite der Avatarspalte (32) + Abstand (8): Folgeblasen fremder Nachrichten werden so eingerückt. */
const AVATAR_COLUMN = 40;

export interface MessageBubbleProps {
  message: ChatListMessage;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  senderName: string;
  roleLabel: string;
  roleKind: RoleKind;
  avatarUrl?: string;
  /** Zeigt den „Mehr“-Button (⋯) mit Aktionsmenü */
  hasActions: boolean;
  onOpenActions?: (message: ChatListMessage, trigger: View | null) => void;
  onOpenProfile?: (message: ChatListMessage) => void;
  onRetry?: (message: ChatListMessage) => void;
  onDiscard?: (message: ChatListMessage) => void;
}

function MessageBubbleBase({
  message,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  senderName,
  roleLabel,
  roleKind,
  avatarUrl,
  hasActions,
  onOpenActions,
  onOpenProfile,
  onRetry,
  onDiscard,
}: MessageBubbleProps) {
  const { colors } = useAppTheme();
  const actionsRef = useRef<View>(null);

  const time = formatTime(message.timestamp);
  const speaker = isOwn ? 'Du' : senderName;
  const sending = message.sendStatus === 'sending';
  const failed = message.sendStatus === 'failed';
  const showText = Boolean(message.text) && !(message.imageUrl && message.text === PHOTO_PLACEHOLDER_TEXT);
  const meta = sending ? 'Wird gesendet …' : time;

  // Nativ: Blase als ein Element („Anna B., 08:28: …“). Web: verborgener Vorspann im Text (siehe unten).
  const spokenText = showText ? message.text : 'Foto';
  const nativeA11y =
    Platform.OS === 'web'
      ? null
      : {
          accessible: true,
          accessibilityLabel: `${speaker}, ${sending ? 'wird gesendet' : time}: ${spokenText}${failed ? '. Nicht gesendet' : ''}`,
        };

  const headerContent = (
    <>
      <Avatar uri={avatarUrl} size={32} />
      <View style={styles.headerTexts}>
        <Text style={[styles.senderName, { color: colors.text }]} numberOfLines={1}>
          {senderName}
        </Text>
        {roleLabel ? (
          <>
            <Text aria-hidden style={[styles.separator, { color: colors.textMuted }]}>
              ·
            </Text>
            <RoleLabel label={roleLabel} kind={roleKind} />
          </>
        ) : null}
      </View>
    </>
  );

  const actionsButton = hasActions ? (
    <IconButton
      ref={actionsRef}
      icon={MoreHorizontal}
      iconSize={20}
      hasPopup
      accessibilityLabel={isOwn ? 'Aktionen für deine Nachricht' : `Aktionen für Nachricht von ${senderName}`}
      onPress={() => onOpenActions?.(message, actionsRef.current)}
    />
  ) : null;

  return (
    <View style={isLastInGroup ? styles.groupEnd : styles.groupContinue}>
      {!isOwn && isFirstInGroup ? (
        onOpenProfile ? (
          <Pressable
            onPress={() => onOpenProfile(message)}
            accessibilityRole="button"
            accessibilityLabel={`Profil von ${senderName}${roleLabel ? `, ${roleLabel}` : ''}`}
            style={({ pressed }) => [styles.header, pressed && { backgroundColor: colors.buttonSecondaryPressedBg }]}
          >
            {headerContent}
          </Pressable>
        ) : (
          <View style={styles.header}>{headerContent}</View>
        )
      ) : null}

      <View
        style={[
          styles.bubbleRow,
          isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther,
          !hasActions && (isOwn ? styles.freeStart : styles.freeEnd),
        ]}
      >
        {isOwn ? actionsButton : null}
        <View
          {...nativeA11y}
          style={[
            styles.bubble,
            { backgroundColor: isOwn ? colors.accentBg : colors.surfaceSubtle },
            sending && styles.sending,
          ]}
        >
          <VisuallyHiddenText>{`${speaker}, ${sending ? 'wird gesendet' : time}:`}</VisuallyHiddenText>
          {showText ? (
            <Text selectable style={[styles.text, { color: colors.text }]}>
              {message.text}
            </Text>
          ) : null}
          {message.imageUrl ? (
            <Image
              source={{ uri: message.imageUrl }}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Foto von ${speaker === 'Du' ? 'dir' : speaker}`}
              resizeMode="contain"
              style={[styles.image, showText && styles.imageAfterText]}
            />
          ) : null}
          <Text aria-hidden style={[styles.meta, { color: isOwn ? colors.accentText : colors.textMuted }]}>
            {meta}
          </Text>
        </View>
        {!isOwn ? actionsButton : null}
      </View>

      {failed ? (
        <View style={styles.failedRow}>
          <View style={styles.failedLabel}>
            <View aria-hidden>
              <AlertCircle size={18} color={colors.errorText} strokeWidth={2.25} />
            </View>
            <Text style={[styles.failedText, { color: colors.errorText }]}>Nicht gesendet</Text>
          </View>
          {onRetry ? <Button variant="text" title="Erneut senden" onPress={() => onRetry(message)} /> : null}
          {onDiscard ? (
            <Button
              variant="text"
              title="Verwerfen"
              accessibilityLabel="Nicht gesendete Nachricht verwerfen"
              onPress={() => onDiscard(message)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

const styles = StyleSheet.create({
  groupContinue: {
    marginBottom: 4,
  },
  groupEnd: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 8,
    minHeight: 44,
    paddingRight: 8,
    borderRadius: RADIUS,
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flexShrink: 1,
    columnGap: 4,
  },
  senderName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    flexShrink: 1,
  },
  separator: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
    paddingLeft: AVATAR_COLUMN,
  },
  // Ohne Mehr-Button bleibt die Gegenseite trotzdem frei (Blasen nie randvoll)
  freeStart: {
    paddingLeft: 48,
  },
  freeEnd: {
    paddingRight: 48,
  },
  bubble: {
    flexShrink: 1,
    maxWidth: 560,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS,
  },
  sending: {
    opacity: 0.7,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  image: {
    width: 240,
    maxWidth: '100%',
    aspectRatio: 4 / 3,
    borderRadius: RADIUS,
  },
  imageAfterText: {
    marginTop: 8,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  failedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    columnGap: 8,
    marginTop: 4,
  },
  failedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  failedText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
