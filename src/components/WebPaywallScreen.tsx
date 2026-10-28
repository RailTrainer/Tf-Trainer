import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Linking
} from 'react-native';
import { mockDb, User } from '../database/mockDb';
import { sendAdminWebUnlockRequestNotification } from '../services/notificationService';
import { useAppTheme } from '../context/ThemeContext';
import { 
  RefreshCw, 
  CheckCircle2, 
  CreditCard, 
  Sparkles, 
  LogOut, 
  Info,
  Bell,
  Check,
  Send,
  Clock
} from 'lucide-react-native';

interface WebPaywallScreenProps {
  currentUser: User;
  onUnlocked: (user: User) => void;
  onLogout: () => void;
}

export default function WebPaywallScreen({ currentUser, onUnlocked, onLogout }: WebPaywallScreenProps) {
  const { isDark, colors: appColors } = useAppTheme();

  const [loadingPaypal, setLoadingPaypal] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [sendingPopup, setSendingPopup] = useState(false);
  const [isWaitingUnlock, setIsWaitingUnlock] = useState(mockDb.isUserWaitingForWebUnlock(currentUser));
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [popupSentCount, setPopupSentCount] = useState(0);

  const colors = {
    ...appColors,
    paypalYellow: '#ffc439',
    paypalBlue: '#0070ba',
    paypalDarkBlue: '#003087',
  };

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Freischalt-Status aus der Datenbank (z.B. nach Admin-Klick) prüfen
  const checkUnlockStatus = useCallback(async (silent: boolean = false) => {
    if (!silent) setCheckingStatus(true);
    try {
      let me = currentUser;
      const users = await mockDb.getUsers();
      const found = users.find(u => 
        (currentUser && u.id === currentUser.id) || 
        (currentUser && u.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
      );
      if (found) me = found;
      if (me) {
        const validatedMe = await mockDb.validateWebAccessAuthoritative(me);
        const effectiveMe = validatedMe || me;
        if (isMountedRef.current) {
          setIsWaitingUnlock(mockDb.isUserWaitingForWebUnlock(effectiveMe));
        }
        if (mockDb.isUserWebUnlocked(effectiveMe)) {
          if (isMountedRef.current) {
            setSuccessMessage('Dein Zugang wurde erfolgreich freigeschaltet! 🎉');
          }
          setTimeout(() => {
            onUnlocked(effectiveMe);
          }, 1000);
          return true;
        }
      }
      if (!silent) {
        Alert.alert(
          'Noch nicht freigeschaltet ⏳',
          'Dein Account wartet noch auf die Freigabe durch den Admin. Sobald deine Zahlung bestätigt und freigeschaltet wurde, öffnet sich die App automatisch.'
        );
      }
    } catch {
      if (!silent) Alert.alert('Hinweis', 'Konnte Status nicht abfragen.');
    } finally {
      if (!silent && isMountedRef.current) setCheckingStatus(false);
    }
    return false;
  }, [currentUser, onUnlocked]);

  // Pop-Up an Admin senden (Schritt 4: Führt NICHT automatisch zur Freischaltung)
  const handleSendAdminPopup = async () => {
    setSendingPopup(true);
    try {
      if (currentUser && currentUser.id) {
        // Status in Datenbank und Speicher auf wartend setzen
        await mockDb.requestWebUnlock(currentUser.id);
      }
      if (isMountedRef.current) {
        setIsWaitingUnlock(true);
        setPopupSentCount(prev => prev + 1);
      }

      // Push-Benachrichtigung & Pop-Up Trigger an Admins senden
      await sendAdminWebUnlockRequestNotification(currentUser, 'manual_request');

      Alert.alert(
        'Pop-Up an den Admin gesendet! 🔔',
        `Wir haben dem Administrator ein Pop-Up auf den Bildschirm gesendet.\n\n⚠️ Wichtig: Die Freischaltung erfolgt manuell durch den Admin nach Prüfung der 4,99 € PayPal-Zahlung. Sobald die Freigabe erteilt wird, öffnet sich die App hier automatisch!`
      );

      // Status silent im Hintergrund abgleichen
      await checkUnlockStatus(true);
    } catch {
      Alert.alert('Hinweis', 'Konnte Pop-Up nicht senden. Bitte versuche es in wenigen Augenblicken erneut.');
    } finally {
      if (isMountedRef.current) {
        setSendingPopup(false);
      }
    }
  };

  // PayPal Weiterleitung zur Zahlung (4,99 €)
  const handlePaypalCheckout = async () => {
    setLoadingPaypal(true);
    try {
      const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' && window.location?.pathname ? window.location.pathname : '';
      const returnUrl = origin ? `${origin}${pathname}?payment_status=completed` : '';
      const cancelUrl = origin ? `${origin}${pathname}?payment_status=cancelled` : '';

      const itemName = `Tf-Trainer Freischaltung - ${currentUser.name} (${currentUser.email})`;
      let paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
        `&business=dschmitz112%40web.de` +
        `&item_name=${encodeURIComponent(itemName)}` +
        `&amount=4.99` +
        `&currency_code=EUR` +
        `&rm=1` +
        `&no_shipping=1` +
        `&no_note=0`;

      if (returnUrl) paypalUrl += `&return=${encodeURIComponent(returnUrl)}`;
      if (cancelUrl) paypalUrl += `&cancel_return=${encodeURIComponent(cancelUrl)}`;

      await Linking.openURL(paypalUrl);

      // Nach Klick auf PayPal: Status als wartend markieren
      if (currentUser && currentUser.id) {
        await mockDb.requestWebUnlock(currentUser.id);
      }
      if (isMountedRef.current) {
        setIsWaitingUnlock(true);
      }

      // Admin auch direkt per Push informieren
      await sendAdminWebUnlockRequestNotification(currentUser, 'payment');

      Alert.alert(
        'PayPal geöffnet 💳',
        `Die PayPal-Zahlungsseite wurde geöffnet.\n\n⚠️ WICHTIGER HINWEIS:\nBitte achte darauf, dass im PayPal-Hinweis/Verwendungszweck deine Registrierungs-E-Mail angegeben ist:\n\n${currentUser.email}\n\nSobald du bezahlt hast, klicke unten auf „Pop-Up an den Admin senden“, falls die Freischaltung noch nicht erfolgt ist.`
      );
    } catch {
      Alert.alert('Fehler', 'Konnte den PayPal-Link nicht öffnen.');
    } finally {
      if (isMountedRef.current) {
        setLoadingPaypal(false);
      }
    }
  };

  useEffect(() => {
    // Sofort beim Öffnen prüfen (asynchron über Timer um synchrone Render-Kaskaden zu vermeiden)
    const initialTimer = setTimeout(() => {
      void checkUnlockStatus(true);
    }, 100);

    // Automatisch alle 5 Sekunden prüfen, ob der Admin die Freigabe erteilt hat
    const interval = setInterval(() => {
      void checkUnlockStatus(true);
    }, 5000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [checkUnlockStatus]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          
          {/* HEADER MIT LOGO & TITEL */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logoImage} 
                resizeMode="cover"
              />
            </View>

            <View style={[styles.badge, { backgroundColor: isDark ? '#1e3a8a30' : '#dbeafe', borderColor: colors.primary }]}>
              <Sparkles size={15} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Mitgliedschaft & Freischaltung</Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Willkommen beim Tf-Trainer! 🚆
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Um die vollständige Lern- und Wissensplattform unbegrenzt nutzen zu können, ist eine einmalige Freischaltung erforderlich.
            </Text>
          </View>

          {/* ERFOLGS-BANNER (WENN FREIGESCHALTET) */}
          {successMessage && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={24} color="#10b981" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* PRÜFUNGS-STATUS-BANNER (ACCOUNT DERZEIT IN DER PRÜFUNG) */}
          {isWaitingUnlock && !successMessage && (
            <View style={[styles.reviewNoticeBox, { backgroundColor: isDark ? '#451a0325' : '#fffbeb', borderColor: '#f59e0b' }]}>
              <View style={styles.reviewNoticeHeader}>
                <Clock size={22} color="#d97706" />
                <Text style={[styles.reviewNoticeTitle, { color: isDark ? '#fef08a' : '#92400e' }]}>
                  Account derzeit in Prüfung ⏳
                </Text>
              </View>

              <Text style={[styles.reviewNoticeText, { color: colors.text }]}>
                Deine Registrierung bzw. Zahlungsanfrage ist eingegangen! Dein Account befindet sich aktuell in der manuellen Prüfung durch einen Administrator. Sobald deine Freischaltung bestätigt wurde, öffnet sich der Tf-Trainer automatisch.
              </Text>

              {/* PAYPAL ZAHLUNGS-BUTTON DIREKT IM PRÜFUNGS-BILDSCHIRM */}
              <View style={{ marginVertical: 6, width: '100%' }}>
                <TouchableOpacity
                  style={[styles.paypalButton, { backgroundColor: colors.paypalYellow }]}
                  onPress={handlePaypalCheckout}
                  disabled={loadingPaypal || Boolean(successMessage)}
                  activeOpacity={0.85}
                >
                  {loadingPaypal ? (
                    <ActivityIndicator size="small" color="#003087" />
                  ) : (
                    <View style={styles.paypalButtonContent}>
                      <CreditCard size={20} color="#003087" />
                      <Text style={styles.paypalButtonText}>
                        Jetzt mit <Text style={{ fontStyle: 'italic', fontWeight: '900', color: '#003087' }}>Pay</Text><Text style={{ fontStyle: 'italic', fontWeight: '900', color: '#0070ba' }}>Pal</Text> bezahlen (4,99 €)
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 5 }}>
                  Empfängerkonto: <Text style={{ fontWeight: '600', color: colors.text }}>dschmitz112@web.de</Text> • Einmalig 4,99 €
                </Text>
              </View>

              {/* WICHTIGER EMAIL-HINWEIS FÜR DIE ZAHLUNG */}
              <View style={[styles.emailNoticeBox, { backgroundColor: isDark ? '#451a0335' : '#fffbeb', borderColor: isDark ? '#d97706' : '#f59e0b', marginVertical: 4 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Info size={14} color="#d97706" />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDark ? '#fbbf24' : '#b45309' }}>
                    Wichtig für die Zuordnung deiner PayPal-Zahlung:
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>
                  Bitte gib bei PayPal im Verwendungszweck deine Registrierungs-E-Mail an:
                </Text>
                <View style={[styles.emailBadge, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: colors.border, marginTop: 4 }]}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                    📧 {currentUser.email}
                  </Text>
                </View>
              </View>

              {/* TIPP ZUM WEBCACHE */}
              <View style={[styles.cacheTipBox, { backgroundColor: isDark ? '#0c4a6e30' : '#f0f9ff', borderColor: isDark ? '#0284c7' : '#bae6fd' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Info size={16} color="#0284c7" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cacheTipTitle, { color: isDark ? '#7dd3fc' : '#0369a1' }]}>
                      Wichtiger Hinweis zum Webcache:
                    </Text>
                    <Text style={[styles.cacheTipText, { color: isDark ? '#e0f2fe' : '#0c4a6e' }]}>
                      Wenn der Administrator deinen Account freigeschaltet hat, kann es helfen, den <Text style={{ fontWeight: 'bold' }}>Webcache deines Browsers zu leeren</Text> oder die Seite neu zu laden (<Text style={{ fontWeight: 'bold' }}>Strg + F5</Text> unter Windows bzw. <Text style={{ fontWeight: 'bold' }}>Cmd + Shift + R</Text> auf dem Mac), damit die Seite neu geladen und die Freigabe sofort aktiv wird.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.reviewButtonsRow}>
                <TouchableOpacity
                  style={[styles.reloadPageBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (typeof window !== 'undefined' && window.location) {
                      window.location.reload();
                    } else {
                      checkUnlockStatus(false);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={14} color="#ffffff" />
                  <Text style={styles.reloadPageBtnText}>Seite neu laden & Cache aktualisieren</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkStatusSmallBtn, { borderColor: colors.border }]}
                  onPress={() => checkUnlockStatus(false)}
                  disabled={checkingStatus}
                  activeOpacity={0.7}
                >
                  {checkingStatus ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                      Status prüfen
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 3-SCHRITTE ABLAUF-BOX */}
          <View style={[styles.stepsBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border }]}>
            <Text style={[styles.stepsTitle, { color: colors.text }]}>
              So funktioniert die Freischaltung:
            </Text>
            
            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepHeading, { color: colors.text }]}>4,99 € per PayPal bezahlen</Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Einmalige Zahlung für lebenslangen Zugriff ohne Abo.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: '#f59e0b' }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepHeading, { color: colors.text }]}>Admin erhält Benachrichtigung per Pop-Up</Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Der Administrator wird sofort über deine Registrierung & Zahlung informiert.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: '#10b981' }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepHeading, { color: colors.text }]}>Automatische Freischaltung</Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Sobald der Admin die Freigabe erteilt, öffnet sich die App automatisch.
                </Text>
              </View>
            </View>
          </View>

          {/* PREIS & VORTEILE */}
          <View style={[styles.pricingBox, { backgroundColor: isDark ? '#1e293b50' : '#f0fdf4', borderColor: isDark ? '#065f46' : '#86efac' }]}>
            <View style={styles.pricingHeader}>
              <View>
                <Text style={[styles.priceTag, { color: colors.text }]}>4,99 €</Text>
                <Text style={[styles.priceSub, { color: colors.textMuted }]}>Einmalzahlung • Dauerhafter Zugriff • Kein Abo</Text>
              </View>
              <View style={styles.unlimitedBadge}>
                <CheckCircle2 size={14} color="#166534" />
                <Text style={styles.unlimitedBadgeText}>Komplettpaket</Text>
              </View>
            </View>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Check size={16} color="#10b981" />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Über 1.000 Signal- & Prüfungsfragen, Lernkarten & Bremsprobe
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={16} color="#10b981" />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Unbegrenzter Zugriff auf PC, Laptop, Mac, Tablet & Smartphone
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Check size={16} color="#10b981" />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Automatische Live-Synchronisation auf all deinen Geräten
                </Text>
              </View>
            </View>
          </View>

          {/* SCHRITT 1: JETZT MIT PAYPAL BEZAHLEN */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.paypalButton, { backgroundColor: colors.paypalYellow }]}
              onPress={handlePaypalCheckout}
              disabled={loadingPaypal || Boolean(successMessage)}
              activeOpacity={0.85}
            >
              {loadingPaypal ? (
                <ActivityIndicator size="small" color="#003087" />
              ) : (
                <View style={styles.paypalButtonContent}>
                  <CreditCard size={20} color="#003087" />
                  <Text style={styles.paypalButtonText}>
                    Jetzt mit <Text style={{ fontStyle: 'italic', fontWeight: '900', color: '#003087' }}>Pay</Text><Text style={{ fontStyle: 'italic', fontWeight: '900', color: '#0070ba' }}>Pal</Text> bezahlen (4,99 €)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* WICHTIGER EMAIL-HINWEIS FÜR DIE ZAHLUNG */}
            <View style={[styles.emailNoticeBox, { backgroundColor: isDark ? '#451a0335' : '#fffbeb', borderColor: isDark ? '#d97706' : '#f59e0b' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Info size={15} color="#d97706" />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#fbbf24' : '#b45309' }}>
                  Wichtig für die Zuordnung deiner Zahlung:
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>
                Bitte gib bei PayPal im Verwendungszweck deine Registrierungs-E-Mail an:
              </Text>
              <View style={[styles.emailBadge, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: colors.border }]}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                  📧 {currentUser.email}
                </Text>
              </View>
            </View>
          </View>

          {/* SCHRITT 3 & 4: POP-UP AN DEN ADMIN SENDEN / STATUS PRÜFEN */}
          <View style={[styles.reminderCard, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: '#f59e0b' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {isWaitingUnlock ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <Bell size={20} color="#f59e0b" />
              )}
              <Text style={[styles.reminderTitle, { color: colors.text }]}>
                Freischaltung durch Administrator
              </Text>
            </View>

            <Text style={[styles.reminderDesc, { color: colors.textMuted }]}>
              Der Administrator wurde bei deiner Registrierung automatisch per Pop-Up informiert. Sobald deine 4,99 € Zahlung geprüft und freigeschaltet wurde, öffnet sich die App automatisch.
            </Text>

            {/* BUTTON: SCHRITT 4 - ERNEUTES POP-UP AN ADMIN SENDEN */}
            <TouchableOpacity
              style={[
                styles.sendPopupButton, 
                { 
                  backgroundColor: isDark ? '#451a0345' : '#fef3c7',
                  borderColor: '#f59e0b'
                }
              ]}
              onPress={handleSendAdminPopup}
              disabled={sendingPopup || Boolean(successMessage)}
              activeOpacity={0.8}
            >
              {sendingPopup ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <View style={styles.sendPopupButtonContent}>
                  <Send size={16} color="#d97706" />
                  <Text style={[styles.sendPopupButtonText, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                    {popupSentCount > 0 ? '🔔 Erneut Pop-Up an den Admin schicken' : '🔔 Neues Pop-Up an den Admin schicken'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.subHint, { color: colors.textMuted }]}>
              ℹ️ Das Senden eines Pop-Ups erinnert den Admin. Dies führt nicht automatisch zur Freischaltung.
            </Text>

            {/* TIPP ZUM WEBCACHE */}
            <View style={[styles.cacheTipSmallBox, { backgroundColor: isDark ? '#0c4a6e25' : '#f0f9ff', borderColor: isDark ? '#0284c7' : '#bae6fd' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                <Info size={14} color="#0284c7" style={{ marginTop: 2 }} />
                <Text style={[styles.cacheTipSmallText, { color: isDark ? '#bae6fd' : '#0369a1' }]}>
                  <Text style={{ fontWeight: 'bold' }}>Tipp:</Text> Nach der Freischaltung durch den Administrator kann das <Text style={{ fontWeight: 'bold' }}>Leeren des Webcaches</Text> (Strg + F5 bzw. Cmd + Shift + R) helfen, die Seite neu zu laden.
                </Text>
              </View>
            </View>

            {/* BUTTON: STATUS MANUELL PRÜFEN */}
            <TouchableOpacity
              style={[styles.checkStatusBtn, { borderColor: colors.border }]}
              onPress={() => checkUnlockStatus(false)}
              disabled={checkingStatus || Boolean(successMessage)}
              activeOpacity={0.7}
            >
              {checkingStatus ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={14} color={colors.primary} />
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                    Status jetzt prüfen
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={styles.userInfoRow}>
              <Text style={[styles.loggedInText, { color: colors.textMuted }]}>
                Angemeldet als: <Text style={{ fontWeight: 'bold', color: colors.text }}>{currentUser.name}</Text> ({currentUser.email})
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.logoutButton, { borderColor: colors.border }]} 
              onPress={onLogout}
              activeOpacity={0.7}
            >
              <LogOut size={14} color="#ef4444" />
              <Text style={styles.logoutButtonText}>Abmelden</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 580,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  successBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  stepsBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    gap: 12,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  pricingBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 20,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  priceTag: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  priceSub: {
    fontSize: 12,
    marginTop: 2,
  },
  unlimitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  unlimitedBadgeText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  actionSection: {
    marginBottom: 18,
  },
  paypalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  paypalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paypalButtonText: {
    color: '#003087',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emailNoticeBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  emailBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  reminderCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 18,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reminderDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  sendPopupButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sendPopupButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendPopupButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subHint: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
    textAlign: 'center',
  },
  checkStatusBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  userInfoRow: {
    flex: 1,
  },
  loggedInText: {
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewNoticeBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 18,
    gap: 10,
  },
  reviewNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewNoticeTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  reviewNoticeText: {
    fontSize: 13,
    lineHeight: 19,
  },
  cacheTipBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  cacheTipTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cacheTipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  cacheTipSmallBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  cacheTipSmallText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  reviewButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  reloadPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  reloadPageBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  checkStatusSmallBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
