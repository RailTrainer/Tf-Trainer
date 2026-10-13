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
  ChevronRight
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
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showSmartButtons, setShowSmartButtons] = useState(false);
  const [smartButtonLoading, setSmartButtonLoading] = useState(false);
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
      if (me && mockDb.isUserWebUnlocked(me)) {
        setSuccessMessage('Dein Web-Zugang wurde erfolgreich freigeschaltet! 🎉');
        setTimeout(() => {
          onUnlocked(me);
        }, 1200);
        return true;
      } else if (!silent) {
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

  useEffect(() => {
    // Automatisch alle 8 Sekunden prüfen, falls der Admin den Nutzer in der App freischaltet
    const interval = setInterval(() => {
      checkUnlockStatus(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // PayPal Weiterleitung zur Zahlung (4,99 €)
  const handlePaypalCheckout = async () => {
    setLoadingPaypal(true);
    try {
      await Linking.openURL(mockDb.PAYPAL_CONFIG.paymentUrl);
      setShowCodeInput(true);
      Alert.alert(
        'PayPal geöffnet 💳',
        'Die PayPal-Zahlungsseite wurde in einem neuen Fenster geöffnet.\n\nSobald du die 4,99 € gezahlt hast, erhältst du deinen Lizenzschlüssel (per E-Mail / Mitteilung). Gib ihn einfach unten ein, um deinen Zugang sofort freizuschalten!'
      );
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte den PayPal-Link nicht öffnen.');
    } finally {
      setLoadingPaypal(false);
    }
  };

  // Weg 3: Offizieller PayPal Smart Button Checkout (Echtzeit-Verifizierung)
  const initPayPalSmartButtons = () => {
    if (typeof window === 'undefined') return;
    setSmartButtonLoading(true);
    setShowSmartButtons(true);

    const scriptId = 'paypal-sdk-smart-button';
    const existing = document.getElementById(scriptId);

    const renderButtons = () => {
      const container = document.getElementById('paypal-smart-container');
      if (container && (window as any).paypal) {
        container.innerHTML = '';
        (window as any).paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
          },
          createOrder: (_data: any, actions: any) => {
            return actions.order.create({
              purchase_units: [{
                description: 'Tf-Trainer Web-Zugang',
                amount: {
                  currency_code: 'EUR',
                  value: '4.99'
                }
              }]
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.order.capture();
              const updated = await mockDb.unlockWebAccess(currentUser.id, {
                provider: 'paypal_smart_button',
                orderId: details.id || data.orderID,
                amount: '4.99'
              });
              setSuccessMessage('Zahlung via PayPal erfolgreich autorisiert! 🎉 Dein Web-Zugang ist sofort freigeschaltet.');
              setTimeout(() => {
                onUnlocked(updated);
              }, 1200);
            } catch (err: any) {
              Alert.alert('Fehler', 'Zahlung konnte nicht erfasst werden.');
            }
          },
          onError: (_err: any) => {
            Alert.alert('PayPal Hinweis', 'Die Zahlung wurde abgebrochen oder ist fehlgeschlagen.');
          }
        }).render('#paypal-smart-container');
        setSmartButtonLoading(false);
      }
    };

    if (existing && (window as any).paypal) {
      setTimeout(renderButtons, 200);
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${mockDb.PAYPAL_CONFIG.clientId}&currency=EUR`;
      script.onload = () => {
        setTimeout(renderButtons, 250);
      };
      script.onerror = () => {
        setSmartButtonLoading(false);
        Alert.alert('Hinweis', 'PayPal Smart Buttons konnten nicht geladen werden.');
      };
      document.body.appendChild(script);
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
                    🔄 Freischaltung prüfen (nach Zahlung / durch Admin)
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* WEG 3: AUTOMATISCHE PAYPAL SMART BUTTONS */}
            {Platform.OS === 'web' && (
              <View style={{ marginTop: 14, width: '100%' }}>
                {!showSmartButtons ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: isDark ? '#1e3a8a30' : '#eff6ff',
                      borderWidth: 1,
                      borderColor: '#3b82f6',
                      gap: 6,
                    }}
                    onPress={initPayPalSmartButtons}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={15} color="#3b82f6" />
                    <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: 'bold' }}>
                      ⚡ Option 3: PayPal Direkt-Checkout (Sofort-Freischaltung)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
                      ⚡ Offizieller PayPal Direkt-Checkout (4,99 €)
                    </Text>
                    {smartButtonLoading && <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 12 }} />}
                    <View style={{ minHeight: 45 }}>
                      <div id="paypal-smart-container" style={{ minHeight: 45 }} />
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
                      Zahlung wird in Echtzeit verifiziert und schaltet deinen Account sofort frei.
                    </Text>
                  </View>
                )}
              </View>
            )}
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
