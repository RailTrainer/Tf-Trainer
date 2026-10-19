import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Platform,
  Linking
} from 'react-native';
import { mockDb, User } from '../database/mockDb';
import { sendAdminWebUnlockRequestNotification } from '../services/notificationService';
import { useAppTheme } from '../context/ThemeContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { 
  Monitor, 
  RefreshCw, 
  CheckCircle2, 
  KeyRound, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  BookOpen, 
  LogOut, 
  Lock, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Bell,
  FileText
} from 'lucide-react-native';

interface WebPaywallScreenProps {
  currentUser: User;
  onUnlocked: (user: User) => void;
  onLogout: () => void;
}

export default function WebPaywallScreen({ currentUser, onUnlocked, onLogout }: WebPaywallScreenProps) {
  const { isDark, colors: appColors } = useAppTheme();
  const { isTablet } = useDeviceLayout();

  const [activationCode, setActivationCode] = useState('');
  const [loadingPaypal, setLoadingPaypal] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [requestingUnlock, setRequestingUnlock] = useState(false);
  const [isWaitingUnlock, setIsWaitingUnlock] = useState(mockDb.isUserWaitingForWebUnlock(currentUser));
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const colors = {
    ...appColors,
    paypalYellow: '#ffc439',
    paypalBlue: '#0070ba',
    paypalDarkBlue: '#003087',
  };

  // Freischalt-Status aus der Datenbank (z.B. nach Admin-Klick) prüfen
  const checkUnlockStatus = async (silent: boolean = false) => {
    if (!silent) setCheckingStatus(true);
    try {
      const users = await mockDb.getUsers();
      const me = users.find(u => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
      if (me) {
        setIsWaitingUnlock(mockDb.isUserWaitingForWebUnlock(me));
        if (mockDb.isUserWebUnlocked(me)) {
          setSuccessMessage('Dein Web-Zugang wurde erfolgreich freigeschaltet! 🎉');
          setTimeout(() => {
            onUnlocked(me);
          }, 1200);
          return true;
        }
      }
      if (!silent) {
        Alert.alert(
          'Noch nicht freigeschaltet ⏳',
          'Dein Account wartet noch auf die Freigabe durch den Admin oder die Eingabe eines Codes. Sobald deine Zahlung bestätigt wurde, wirst du freigegeben.'
        );
      }
    } catch {
      if (!silent) Alert.alert('Hinweis', 'Konnte Status nicht abfragen.');
    } finally {
      if (!silent) setCheckingStatus(false);
    }
    return false;
  };

  // Freischaltung anfordern und Admin benachrichtigen
  const handleRequestUnlock = async (isAutoFromPayment = false) => {
    setRequestingUnlock(true);
    try {
      await mockDb.requestWebUnlock(currentUser.id);
      setIsWaitingUnlock(true);
      await sendAdminWebUnlockRequestNotification(currentUser);
      if (isAutoFromPayment) {
        setSuccessMessage('Vielen Dank für deine Zahlung! Deine Freischaltung wurde automatisch angefordert. Der Admin wurde per Push-Benachrichtigung benachrichtigt. Dein Browser prüft die Freigabe.');
      } else {
        Alert.alert(
          'Freischaltung angefordert ⏳',
          'Wir haben deine Anfrage an den Administrator gesendet. Die Admins erhalten eine Push-Benachrichtigung auf ihr Handy und schalten dich in Kürze frei!'
        );
      }
      await checkUnlockStatus(true);
    } catch (e: any) {
      if (!isAutoFromPayment) {
        Alert.alert('Hinweis', 'Konnte Anfrage nicht senden. Bitte versuche es in wenigen Momenten erneut.');
      }
    } finally {
      setRequestingUnlock(false);
    }
  };

  useEffect(() => {
    // 1. Automatisch prüfen, ob der Nutzer von PayPal mit payment_status=completed zurückgeleitet wurde
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('payment_status');
        if (status === 'completed') {
          // URL-Parameter säubern ohne Reload
          window.history.replaceState({}, document.title, window.location.pathname);
          handleRequestUnlock(true);
        }
      } catch (e) {
        console.warn('Could not parse URLSearchParams:', e);
      }
    }

    // 2. Automatisch alle 8 Sekunden prüfen, falls der Admin den Nutzer in der App freischaltet
    const interval = setInterval(() => {
      checkUnlockStatus(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // PayPal Weiterleitung zur Zahlung (4,99 €)
  const handlePaypalCheckout = async () => {
    setLoadingPaypal(true);
    try {
      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '';
      const returnUrl = `${origin}${pathname}?payment_status=completed`;
      const cancelUrl = `${origin}${pathname}?payment_status=cancelled`;

      const itemName = `Tf-Trainer Web-Zugang - ${currentUser.name} (${currentUser.email})`;
      const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
        `&business=dschmitz112%40web.de` +
        `&item_name=${encodeURIComponent(itemName)}` +
        `&amount=4.99` +
        `&currency_code=EUR` +
        `&return=${encodeURIComponent(returnUrl)}` +
        `&cancel_return=${encodeURIComponent(cancelUrl)}` +
        `&rm=1` +
        `&no_shipping=1` +
        `&no_note=0`;

      await Linking.openURL(paypalUrl);
      setShowCodeInput(true);
      Alert.alert(
        'PayPal geöffnet 💳',
        `Die PayPal-Zahlungsseite wurde geöffnet.\n\n⚠️ WICHTIGER HINWEIS:\nBitte achte darauf, dass im PayPal-Hinweis/Verwendungszweck deine Registrierungs-E-Mail angegeben ist:\n\n${currentUser.email}\n\nNach der Zahlung wirst du automatisch hierher zurückgeleitet und die Admins erhalten eine Benachrichtigung!`
      );
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte den PayPal-Link nicht öffnen.');
    } finally {
      setLoadingPaypal(false);
    }
  };
  const handleRedeemCode = async () => {
    if (!activationCode.trim()) {
      Alert.alert('Hinweis', 'Bitte gib deinen Lizenzschlüssel ein.');
      return;
    }

    setLoadingKey(true);
    try {
      const result = await mockDb.redeemWebKey(currentUser.id, activationCode.trim());
      if (result.success && result.user) {
        setSuccessMessage(result.message);
        setTimeout(() => {
          onUnlocked(result.user!);
        }, 1200);
      } else {
        Alert.alert('Ungültiger Code', result.message);
      }
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Konnte den Code nicht einlösen.');
    } finally {
      setLoadingKey(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          
          {/* HEADER MIT LOGO & BADGE */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logoImage} 
                resizeMode="cover"
              />
            </View>

            <View style={[styles.badge, { backgroundColor: isDark ? '#1e3a8a30' : '#dbeafe', borderColor: colors.primary }]}>
              <Monitor size={16} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Tf-Trainer Web-Edition</Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Tf-Trainer Web freischalten 🖥️
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Nutze den Tf-Trainer auf deinem PC, Laptop oder Mac – mit automatischer Live-Synchronisation zu deinem Smartphone.
            </Text>
          </View>

          {/* ERFOLGS-BANNER */}
          {successMessage && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={24} color="#10b981" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* WARTET AUF FREISCHALTUNG STATUS-BANNER */}
          {isWaitingUnlock && (
            <View style={[styles.waitingBanner, { backgroundColor: isDark ? '#451a0335' : '#fffbeb', borderColor: isDark ? '#d97706' : '#f59e0b' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="small" color="#d97706" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.waitingTitle, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                    ⏳ Web-Freischaltung angefordert!
                  </Text>
                  <Text style={[styles.waitingSubtitle, { color: colors.text }]}>
                    Deine Anfrage ist beim Administrator eingegangen. Admins wurden per Push-Benachrichtigung benachrichtigt. Sobald die Freischaltung erfolgt, öffnet sich die Web-App automatisch (automatische Live-Prüfung).
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* PREIS-BOX */}
          <View style={[styles.pricingBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border }]}>
            <View style={styles.pricingHeader}>
              <View>
                <Text style={[styles.priceTag, { color: colors.text }]}>4,99 €</Text>
                <Text style={[styles.priceSub, { color: colors.textMuted }]}>Einmalzahlung • Dauerhafter Zugriff • Kein Abo</Text>
              </View>
              <View style={styles.priceSaveBadge}>
                <Sparkles size={14} color="#166534" />
                <Text style={styles.priceSaveBadgeText}>Unbegrenzt</Text>
              </View>
            </View>

            {/* VORTEILE */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color="#10b981" style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  <Text style={{ fontWeight: 'bold' }}>Großes Display:</Text> Perfekt zum Lernen am Monitor, Laptop & Beamer
                </Text>
              </View>

              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color="#10b981" style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  <Text style={{ fontWeight: 'bold' }}>1:1 Synchronisation:</Text> Dein Lernstand ist sofort auch auf dem Handy aktuell
                </Text>
              </View>

              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color="#10b981" style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  <Text style={{ fontWeight: 'bold' }}>Komplettes Paket:</Text> Über 1.000 Signal- & Fachfragen, Bremsprobe & Lernkarten
                </Text>
              </View>

              <View style={styles.featureItem}>
                <CheckCircle2 size={18} color="#10b981" style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  <Text style={{ fontWeight: 'bold' }}>Sofortige Freischaltung:</Text> Keine Wartezeit nach der Zahlung
                </Text>
              </View>
            </View>
          </View>

          {/* OPTION 1: MIT PAYPAL BEZAHLEN */}
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
                    Jetzt mit <Text style={{ fontStyle: 'italic', fontWeight: '900', color: '#003087' }}>Pay</Text><Text style={{ fontStyle: 'italic', fontWeight: '900', color: '#0070ba' }}>Pal</Text> freischalten (4,99 €)
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.secureNote, { color: colors.textMuted }]}>
              🔒 Sichere PayPal-Zahlung an dschmitz112@web.de (4,99 €)
            </Text>

            {/* WICHTIGER HINWEIS: EMAIL-ZUORDNUNG */}
            <View style={{
              width: '100%',
              backgroundColor: isDark ? '#451a0335' : '#fffbeb',
              borderColor: isDark ? '#d97706' : '#f59e0b',
              borderWidth: 1.5,
              borderRadius: 12,
              padding: 14,
              marginTop: 14,
              marginBottom: 4,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Info size={16} color="#d97706" />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#fbbf24' : '#b45309' }}>
                  Wichtig für die Zuordnung deiner Zahlung:
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>
                Bitte gib bei PayPal im Hinweis-/Mitteilungsfeld deine Registrierungs-E-Mail an:
              </Text>
              <View style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 7,
                marginTop: 8,
                alignSelf: 'flex-start',
              }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                  📧 {currentUser.email}
                </Text>
              </View>
            </View>

            {/* BUTTON: FREISCHALTUNG ANFORDERN / ADMIN PER PUSH INFORMIEREN */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: isWaitingUnlock ? (isDark ? '#064e3b35' : '#ecfdf5') : (isDark ? '#451a0345' : '#fef3c7'),
                borderWidth: 1.5,
                borderColor: isWaitingUnlock ? '#10b981' : '#f59e0b',
                marginTop: 12,
                width: '100%',
                gap: 8,
              }}
              onPress={() => handleRequestUnlock(false)}
              disabled={requestingUnlock || Boolean(successMessage)}
              activeOpacity={0.8}
            >
              {requestingUnlock ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <>
                  <Bell size={16} color={isWaitingUnlock ? '#10b981' : '#d97706'} />
                  <Text style={{ fontSize: 13, color: isWaitingUnlock ? '#10b981' : (isDark ? '#fbbf24' : '#b45309'), fontWeight: '700' }}>
                    {isWaitingUnlock ? '🔔 Admin erneut benachrichtigen' : '🙋 Bereits bezahlt? Jetzt Freischaltung anfordern & Admin per Push benachrichtigen'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* FREISCHALTUNG PRÜFEN BUTTON */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                borderWidth: 1,
                borderColor: colors.border,
                marginTop: 10,
                width: '100%',
                gap: 8,
              }}
              onPress={() => checkUnlockStatus(false)}
              disabled={checkingStatus || Boolean(successMessage)}
              activeOpacity={0.7}
            >
              {checkingStatus ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <RefreshCw size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>
                    🔄 Freischaltungsstatus jetzt prüfen
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* INFO-HINWEIS ZUM ABLAUF */}
            <View style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              backgroundColor: isDark ? '#1e293b50' : '#f8fafc',
              borderWidth: 1,
              borderColor: colors.border,
              width: '100%'
            }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
                💡 Nach deiner PayPal-Zahlung wird dein Account in Kürze freigeschaltet. Dein Browser prüft die Freischaltung automatisch alle paar Sekunden.
              </Text>
            </View>
          </View>

          {/* TRENNLINIE */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>ODER MIT LIZENZSCHLÜSSEL</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* OPTION 2: CODE EINGEBEN */}
          {!showCodeInput ? (
            <TouchableOpacity
              style={[styles.toggleCodeButton, { borderColor: colors.border, backgroundColor: isDark ? '#1e293b50' : '#f1f5f9' }]}
              onPress={() => setShowCodeInput(true)}
              activeOpacity={0.7}
            >
              <KeyRound size={17} color={colors.primary} />
              <Text style={[styles.toggleCodeText, { color: colors.text }]}>
                Hast du bereits einen Aktivierungscode? Hier eingeben
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.codeInputContainer, { borderColor: colors.border, backgroundColor: isDark ? '#1e293b40' : '#f8fafc' }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Aktivierungscode / Lizenz-Key eingeben:
              </Text>
              <View style={styles.codeRow}>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBg }]}
                  placeholder="z.B. RT-WEB-BMEC-9PTH"
                  placeholderTextColor={colors.textMuted}
                  value={activationCode}
                  onChangeText={(val) => setActivationCode(val.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.redeemButton, { backgroundColor: colors.primary }]}
                  onPress={handleRedeemCode}
                  disabled={loadingKey || Boolean(successMessage)}
                  activeOpacity={0.8}
                >
                  {loadingKey ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.redeemButtonText}>Einlösen</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Tipp: Der Code ist auf deiner PayPal-Rechnung oder wurde dir per E-Mail zugestellt.
              </Text>
            </View>
          )}

          {/* FUSSBEREICH: ANGEMELDETER BENUTZER & LOGOUT */}
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
              <LogOut size={15} color="#ef4444" />
              <Text style={styles.logoutButtonText}>Abmelden / Anderes Konto</Text>
            </TouchableOpacity>
          </View>

          {/* RECHTLICHE HINWEISE / IMPRESSUM & DATENSCHUTZ */}
          <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
              <TouchableOpacity onPress={() => setShowImpressum(!showImpressum)} activeOpacity={0.7}>
                <Text style={{ fontSize: 12, color: colors.primary, textDecorationLine: 'underline' }}>
                  {showImpressum ? 'Impressum ausblenden' : 'Impressum anzeigen'}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>•</Text>
              <TouchableOpacity onPress={() => setShowDatenschutz(!showDatenschutz)} activeOpacity={0.7}>
                <Text style={{ fontSize: 12, color: colors.primary, textDecorationLine: 'underline' }}>
                  {showDatenschutz ? 'Datenschutz ausblenden' : 'Datenschutz anzeigen'}
                </Text>
              </TouchableOpacity>
            </View>

            {showImpressum && (
              <View style={{ width: '100%', padding: 14, borderRadius: 10, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Impressum – Tf-Trainer</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                  Herausgeber & Entwicklung: Dennis Köster{'\n'}
                  Interaktive Lernplattform für Triebfahrzeugführer, Wagenprüfer & Bahnbetriebspersonal.{'\n'}
                  E-Mail: support@tf-trainer.de{'\n'}
                  © Dennis Köster. Alle Rechte vorbehalten.
                </Text>
              </View>
            )}

            {showDatenschutz && (
              <View style={{ width: '100%', padding: 14, borderRadius: 10, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Datenschutzerklärung – Tf-Trainer</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                  Der Schutz Ihrer persönlichen Daten hat für uns höchste Priorität. Tf-Trainer verarbeitet Daten ausschließlich zweckgebunden für den Lernbetrieb. Keine Weitergabe an Werbenetzwerke oder Dritte.{'\n'}
                  Kontakt: datenschutz@tf-trainer.de
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Tf-Trainer Web • Version 2.0.0 • support@tf-trainer.de
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingVertical: 40,
    width: '100%',
    alignItems: 'center',
  },
  card: {
    maxWidth: 620,
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 500,
  },
  successBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  waitingBanner: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  waitingSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  pricingBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    marginBottom: 24,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  priceTag: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  priceSub: {
    fontSize: 12,
    marginTop: 2,
  },
  priceSaveBadge: {
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
  priceSaveBadgeText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  actionSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  paypalButton: {
    width: '100%',
    paddingVertical: 15,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  secureNote: {
    fontSize: 12,
    marginTop: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  toggleCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  toggleCodeText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  codeInputContainer: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  redeemButton: {
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hintText: {
    fontSize: 11,
    marginTop: 8,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
