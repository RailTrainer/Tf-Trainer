/** Formatierung und Gruppierung für den Chat (reine Funktionen, ohne Datenzugriff). */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Nachrichten desselben Absenders innerhalb dieser Spanne bilden eine Gruppe. */
export const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** „08:24“ */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/** „Heute“, „Gestern“, „Montag, 19. Oktober“ (mit Jahr, wenn nicht das aktuelle) */
export function formatDayLabel(ts: number, now: number): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / DAY_MS);
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return new Date(ts).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? null : { year: 'numeric' }),
  });
}

/** „22.10., 05:06 Uhr“ – für Fristen, die über Mitternacht gehen können */
export function formatDateTime(ts: number): string {
  const date = new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return `${date}, ${formatTime(ts)} Uhr`;
}

/** Zeitangabe in Listen: heute Uhrzeit, gestern „Gestern“, sonst Datum („19.10.“) */
export function formatListTime(ts: number, now: number): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / DAY_MS);
  if (diffDays === 0) return formatTime(ts);
  if (diffDays === 1) return 'Gestern';
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

/** Kürzt Text für Vorschauen und Ansagen auf ganze Wörter. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()} …`;
}

export interface GroupableMessage {
  id: string;
  senderId: string;
  timestamp: number;
}

export type MessageListItem<T extends GroupableMessage> =
  | { type: 'day'; key: string; label: string }
  | { type: 'unread'; key: string }
  | { type: 'message'; key: string; message: T; isFirstInGroup: boolean; isLastInGroup: boolean };

/**
 * Baut die Zeilen der Nachrichtenliste: Tagestrenner, optional „Neue Nachrichten“ vor der ersten
 * ungelesenen fremden Nachricht, und Gruppen (gleicher Absender, ≤ 5 min, gleicher Tag).
 */
export function buildMessageItems<T extends GroupableMessage>(
  messages: T[],
  options: { now: number; currentUserId?: string; unreadSince?: number | null },
): MessageListItem<T>[] {
  const { now, currentUserId, unreadSince } = options;
  const items: MessageListItem<T>[] = [];
  let unreadInserted = false;

  messages.forEach((message, index) => {
    const prev = messages[index - 1];
    const next = messages[index + 1];

    if (!prev || !isSameDay(prev.timestamp, message.timestamp)) {
      items.push({ type: 'day', key: `day-${startOfDay(message.timestamp)}`, label: formatDayLabel(message.timestamp, now) });
    }

    if (
      !unreadInserted &&
      unreadSince &&
      message.timestamp > unreadSince &&
      message.senderId !== currentUserId
    ) {
      items.push({ type: 'unread', key: 'unread-marker' });
      unreadInserted = true;
    }

    const continuesFrom = (a: T | undefined, b: T | undefined): boolean =>
      a !== undefined &&
      b !== undefined &&
      a.senderId === b.senderId &&
      isSameDay(a.timestamp, b.timestamp) &&
      Math.abs(b.timestamp - a.timestamp) <= GROUP_WINDOW_MS;

    const lastItem = items[items.length - 1];
    // Nach einem Trenner beginnt immer eine neue Gruppe
    const isFirstInGroup = !continuesFrom(prev, message) || lastItem?.type !== 'message';
    const nextIsUnreadStart =
      !unreadInserted &&
      next !== undefined &&
      Boolean(unreadSince) &&
      next.timestamp > (unreadSince as number) &&
      next.senderId !== currentUserId;
    const isLastInGroup = !continuesFrom(message, next) || nextIsUnreadStart;

    items.push({ type: 'message', key: message.id, message, isFirstInGroup, isLastInGroup });
  });

  return items;
}
