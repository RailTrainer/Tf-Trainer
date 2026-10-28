import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { User, mockDb } from '../database/mockDb';
import { 
  Bell, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Mail, 
  CreditCard,
  ShieldCheck,
} from 'lucide-react-native';

interface AdminUnlockModalProps {
  visible: boolean;
  requests: User[];
  onUnlock: (userId: string, userName: string) => Promise<void>;
  onDismiss: (userId: string) => void;
  onDismissAll: () => void;
  colors: any;
  isDark: boolean;
}

export default function AdminUnlockModal({
  visible,
  requests,
  onUnlock,
  onDismiss,
  onDismissAll,
  colors,
  isDark,
}: AdminUnlockModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [unlocking, setUnlocking] = useState(false);

  if (!visible || !requests || requests.length === 0) {
    return null;
  }

  // Sicherstellen, dass Index innerhalb der Grenzen liegt
  const safeIndex = Math.min(currentIndex, requests.length - 1);
  const currentUser = requests[safeIndex];

  if (!currentUser) return null;

  const isAlreadyUnlocked = mockDb.isUserWebUnlocked(currentUser);

  const handleUnlockClick = async () => {
    setUnlocking(true);
    try {
      await onUnlock(currentUser.id, currentUser.name);
      if (currentIndex >= requests.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } finally {
      setUnlocking(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < requests.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => onDismiss(currentUser.id)}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.cardBg, borderColor: isDark ? '#d97706' : '#f59e0b' }]}>
          
          {/* HEADER */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBadge, { backgroundColor: isDark ? '#451a03' : '#fef3c7' }]}>
                <Bell size={20} color="#f59e0b" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Freischaltung erforderlich!
                </Text>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                  {requests.length === 1 ? '1 Mitglied wartet auf Freischaltung' : `${requests.length} Mitglieder warten auf Freischaltung`}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.closeBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
              onPress={() => onDismiss(currentUser.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* CONTENT */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* USER CARD */}
            <View style={[styles.userCard, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border }]}>
              <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {(currentUser.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {currentUser.name}
                    </Text>
                    {isAlreadyUnlocked ? (
                      <View style={[styles.paymentTag, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                        <ShieldCheck size={12} color="#166534" />
                        <Text style={[styles.paymentTagText, { color: '#166534' }]}>Bereits freigeschaltet</Text>
                      </View>
                    ) : (
                      <View style={styles.paymentTag}>
                        <CreditCard size={12} color="#0070ba" />
                        <Text style={styles.paymentTagText}>4,99 € PayPal</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.emailRow}>
                    <Mail size={13} color={colors.textMuted} />
                    <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                      {currentUser.email}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* HINWEIS-INFO */}
            <View style={[styles.infoBox, { backgroundColor: isDark ? '#1e293b' : '#eff6ff', borderColor: isDark ? '#1e3a8a' : '#bfdbfe' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Clock size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoTitle, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                    Ablauf der Freischaltung:
                  </Text>
                  <Text style={[styles.infoDesc, { color: colors.text }]}>
                    Das Mitglied hat sich registriert bzw. ein Pop-Up gesendet, um nach der PayPal-Zahlung freigeschaltet zu werden. Klicke auf „Jetzt freischalten“, um den Zugang sofort zu aktivieren.
                  </Text>
                </View>
              </View>
            </View>

            {/* MEHRERE ANFRAGEN NAVIGATION */}
            {requests.length > 1 && (
              <View style={[styles.paginationRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.pageBtn, safeIndex === 0 && styles.pageBtnDisabled]}
                  onPress={handlePrev}
                  disabled={safeIndex === 0}
                >
                  <ChevronLeft size={16} color={safeIndex === 0 ? colors.textMuted : colors.primary} />
                  <Text style={[styles.pageBtnText, { color: safeIndex === 0 ? colors.textMuted : colors.primary }]}>
                    Vorherige
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.pageIndicator, { color: colors.textMuted }]}>
                  {safeIndex + 1} von {requests.length}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, safeIndex === requests.length - 1 && styles.pageBtnDisabled]}
                  onPress={handleNext}
                  disabled={safeIndex === requests.length - 1}
                >
                  <Text style={[styles.pageBtnText, { color: safeIndex === requests.length - 1 ? colors.textMuted : colors.primary }]}>
                    Nächste
                  </Text>
                  <ChevronRight size={16} color={safeIndex === requests.length - 1 ? colors.textMuted : colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* ACTIONS */}
          <View style={[styles.actions, { borderTopColor: colors.border, backgroundColor: colors.cardBg }]}>
            <TouchableOpacity
              style={[styles.unlockButton, { backgroundColor: '#10b981' }]}
              onPress={handleUnlockClick}
              disabled={unlocking}
              activeOpacity={0.85}
            >
              {unlocking ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <ShieldCheck size={18} color="#ffffff" />
                  <Text style={styles.unlockButtonText}>
                    {isAlreadyUnlocked ? '✓ Freigabe bestätigen & erledigen' : '🔓 Jetzt freischalten'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.dismissButton, { borderColor: colors.border }]}
                onPress={() => onDismiss(currentUser.id)}
                activeOpacity={0.7}
              >
                <Clock size={14} color={colors.textMuted} />
                <Text style={[styles.dismissButtonText, { color: colors.textMuted }]}>
                  Später erinnern
                </Text>
              </TouchableOpacity>

              {requests.length > 1 && (
                <TouchableOpacity
                  style={[styles.dismissButton, { borderColor: colors.border }]}
                  onPress={onDismissAll}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dismissButtonText, { color: colors.textMuted }]}>
                    Alle überspringen
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
    maxHeight: 400,
  },
  userCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  paymentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paymentTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0070ba',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    fontSize: 12,
  },
  infoBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    gap: 10,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  unlockButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dismissButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
