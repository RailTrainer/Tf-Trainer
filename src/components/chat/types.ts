/** Gemeinsame Darstellungstypen für Fach-Chat und Ausbilderchat. */

export type SendStatus = 'sending' | 'failed';

/** Einheitliche Form einer Nachricht für die Liste (aus `ChatMessage` bzw. `SupportMessage` abgeleitet). */
export interface ChatListMessage {
  id: string;
  senderId: string;
  /** Voller Name aus der Nachricht (Fallback, falls der Nutzer nicht mehr existiert) */
  senderName: string;
  senderRole?: string;
  text: string;
  imageUrl?: string;
  timestamp: number;
  /** Nur lokal: Nachricht wird gesendet bzw. konnte nicht gesendet werden */
  sendStatus?: SendStatus;
}

/** Rolle mit eigenem Icon; alle anderen Rollen nur als Text. */
export type RoleKind = 'admin' | 'moderator' | null;

export interface SenderInfo {
  /** „Anna B.“ */
  displayName: string;
  /** Titel oder Rollenname, z. B. „Ausbilder“, „Tf-Ausbildung“ */
  roleLabel: string;
  roleKind: RoleKind;
  avatarUrl?: string;
}

export interface SupportThread {
  studentId: string;
  studentName: string;
  lastMessage: string;
  timestamp: number;
  lastSenderId?: string;
  lastSenderRole?: string;
}
