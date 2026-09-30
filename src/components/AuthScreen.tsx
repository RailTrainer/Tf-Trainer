import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockDb, User } from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { Mail, Lock, User as UserIcon, KeyRound, ShieldCheck, RefreshCw, GraduationCap } from 'lucide-react-native';
import { useDynamicKeyboard } from '../hooks/useDynamicKeyboard';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { isDark, colors: appColors } = useAppTheme();
  const { isTablet } = useDeviceLayout();
  const { dynamicKeyboardPadding } = useDynamicKeyboard(32);

  // Modes: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = {
    ...appColors,
    error: '#ef4444',
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        Alert.alert('Fehler', 'Bitte gib deinen Namen an.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Fehler', 'Das Passwort muss mindestens 6 Zeichen lang sein.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await mockDb.loginUser(email, password);
        
        // WEB-GATE: Nur für Ausbilder & Dozenten freigeschaltet
        if (Platform.OS === 'web') {
          const userTitle = (user.title || '').toLowerCase();
          const isInstructor = user.role === 'admin' || 
            user.role === 'moderator' || 
            userTitle.includes('ausbilder') || 
            userTitle.includes('dozent') || 
            userTitle.includes('prüfer') ||
            userTitle.includes('lehrer');

          if (!isInstructor) {
            await mockDb.logoutUser();
            Alert.alert(
              'Zugriff nur für Ausbilder 🎓',
              'Die Webversion der RailTrainer-App ist exklusiv für Ausbilder & Dozenten zur Unterrichtsgestaltung freigeschaltet.\n\nBitte nutze als Schüler die offizielle RailTrainer Android- oder iOS-App auf deinem Smartphone.'
            );
            return;
          }
        }

        onLoginSuccess(user);
      } else {
        const user = await mockDb.registerUser(name, email, password);
        
        if (Platform.OS === 'web') {
          Alert.alert(
            'Account erstellt',
            `Willkommen ${name}! Dein Account wurde angelegt. Bitte wende dich an die Administration, um deinen Ausbilder-Status für die Webversion freizuschalten, falls dies noch nicht geschehen ist.`
          );
        } else {
          Alert.alert('Willkommen!', `Dein Account wurde erfolgreich erstellt, ${name}!`);
        }
        onLoginSuccess(user);
      }
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  // Schritt 1: 6-stelligen OTP per E-Mail anfordern
  const handleRequestOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Hinweis', 'Bitte gib deine registrierte E-Mail-Adresse ein.');
      return;
    }

    setLoading(true);
    try {
      await mockDb.sendPasswordResetOtp(email);
      setForgotStep('otp');
      Alert.alert(
        'Code gesendet! 📩',
        `Ein Bestätigungscode wurde an ${email.trim()} gesendet.\n\nBitte prüfe deinen Posteingang und deinen Spam-Ordner.`
      );
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Konnte keinen Sicherheitscode anfordern.');
    } finally {
      setLoading(false);
    }
  };

  // Schritt 2: OTP prüfen und neues Passwort setzen
  const handleVerifyOtpAndReset = async () => {
    if (!otpCode.trim()) {
      Alert.alert('Fehler', 'Bitte gib den Bestätigungscode aus deiner E-Mail ein.');
      return;
    }
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Fehler', 'Bitte gib dein neues Passwort ein und bestätige es.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Fehler', 'Das neue Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await mockDb.verifyOtpAndResetPassword(email, otpCode, password);
      Alert.alert(
        'Passwort erfolgreich geändert! 🎉',
        'Dein neues Passwort wurde gespeichert. Du wurdest automatisch angemeldet.'
      );
      onLoginSuccess(updatedUser);
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Konnte das Passwort nicht zurücksetzen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1, paddingBottom: dynamicKeyboardPadding }}>
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContainer, 
            { paddingBottom: dynamicKeyboardPadding ? dynamicKeyboardPadding + 20 : 48 },
            isTablet && { maxWidth: 460, width: '100%', alignSelf: 'center' }
          ]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* LOGO & TITEL */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logoImage} 
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>RailTrainer</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Die Eisenbahn-Lernhilfe für den Quereinstieg
            </Text>

            {Platform.OS === 'web' && (
              <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: isDark ? '#1e3a8a40' : '#dbeafe', borderColor: colors.primary, borderWidth: 1 }}>
                <GraduationCap size={15} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>
                  Dozenten- & Unterrichtsversion
                </Text>
              </View>
            )}
          </View>

          {/* FORMULAR-KARTE */}
          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {mode === 'login' 
                ? 'Anmelden' 
                : mode === 'register' 
                ? 'Registrieren' 
                : (forgotStep === 'email' ? 'Passwort vergessen?' : 'Sicherheitscode eingeben')}
            </Text>

            {/* INFO-BOX IM WEB: EXKLUSIV FÜR AUSBILDER */}
            {Platform.OS === 'web' && mode === 'login' && (
              <View style={{ marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: isDark ? '#1e293b90' : '#f8fafc', borderColor: colors.border, borderWidth: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18, textAlign: 'center' }}>
                  🎓 <Text style={{ fontWeight: 'bold', color: colors.text }}>Für den Unterricht:</Text> Der Webzugriff ist für Ausbilder freigeschaltet. Bitte logge dich mit deinem Ausbilder-Account ein.
                </Text>
              </View>
            )}

            {/* INFO-TEXT FÜR PASSWORT-ZURÜCKSETZEN */}
            {mode === 'forgot' && forgotStep === 'email' && (
              <View style={{ marginBottom: 14, padding: 12, borderRadius: 8, backgroundColor: isDark ? '#1e3a8a30' : '#dbeafe', borderColor: colors.border, borderWidth: 1 }}>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>
                  🔐 Gib deine registrierte E-Mail-Adresse ein. Wir senden dir einen Bestätigungscode per E-Mail zu.
                </Text>
              </View>
            )}

            {mode === 'forgot' && forgotStep === 'otp' && (
              <View style={{ marginBottom: 14, padding: 12, borderRadius: 8, backgroundColor: isDark ? '#064e3b30' : '#dcfce7', borderColor: '#10b98150', borderWidth: 1 }}>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>
                  📩 Ein Bestätigungscode wurde an <Text style={{ fontWeight: 'bold' }}>{email}</Text> gesendet. Bitte prüfe auch deinen Spam-Ordner.
                </Text>
              </View>
            )}

            {/* NAME (nur bei Registrierung) */}
            {mode === 'register' && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Name</Text>
                <View style={[styles.inputContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}>
                  <UserIcon size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Dein vollständiger Name"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>
            )}

            {/* E-MAIL (bei Login, Register und Forgot Step 1) */}
            {(mode !== 'forgot' || forgotStep === 'email') && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>E-Mail-Adresse</Text>
                <View style={[styles.inputContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}>
                  <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="z.B. name@bahn.de"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>
            )}

            {/* SICHERHEITSCODE (nur bei Forgot Step 2) */}
            {mode === 'forgot' && forgotStep === 'otp' && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Bestätigungscode (aus der E-Mail)</Text>
                <View style={[styles.inputContainer, { borderColor: colors.primary, backgroundColor: colors.inputBg }]}>
                  <KeyRound size={18} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text, letterSpacing: 4, fontWeight: 'bold', fontSize: 18 }]}
                    placeholder="12345678"
                    placeholderTextColor={colors.textMuted}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            )}

            {/* PASSWORT (bei Login, Register und Forgot Step 2) */}
            {(mode !== 'forgot' || forgotStep === 'otp') && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {mode === 'forgot' ? 'Neues Passwort festlegen' : 'Passwort'}
                </Text>
                <View style={[styles.inputContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}>
                  <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={mode === 'forgot' ? 'Mind. 6 Zeichen' : 'Dein Passwort'}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {/* PASSWORT BESTÄTIGEN (bei Register und Forgot Step 2) */}
            {(mode === 'register' || (mode === 'forgot' && forgotStep === 'otp')) && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Neues Passwort wiederholen</Text>
                <View style={[styles.inputContainer, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}>
                  <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Passwort wiederholen"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {/* SUBMIT BUTTON */}
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={
                mode === 'login' || mode === 'register'
                  ? handleAuth
                  : forgotStep === 'email'
                  ? handleRequestOtp
                  : handleVerifyOtpAndReset
              }
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'login' 
                    ? 'Einloggen' 
                    : mode === 'register' 
                    ? 'Account erstellen' 
                    : forgotStep === 'email' 
                    ? '📩 6-stelligen Code anfordern' 
                    : '🔓 Passwort speichern & Einloggen'}
                </Text>
              )}
            </TouchableOpacity>

            {/* CODE ERNEUT ANFORDERN BUTTON (nur bei Forgot Step 2) */}
            {mode === 'forgot' && forgotStep === 'otp' && (
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}
                onPress={handleRequestOtp}
                disabled={loading}
              >
                <RefreshCw size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Code erneut anfordern</Text>
              </TouchableOpacity>
            )}

            {/* TOGGLE LINKS */}
            <View style={styles.linksContainer}>
              {mode === 'login' ? (
                <>
                  <TouchableOpacity 
                    style={styles.linkBtn} 
                    onPress={() => { setMode('register'); setPassword(''); setConfirmPassword(''); setEmail(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.linkText, { color: colors.primary }]}>Konto erstellen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.linkBtn} 
                    onPress={() => { setMode('forgot'); setForgotStep('email'); setOtpCode(''); setPassword(''); setConfirmPassword(''); setEmail(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.linkText, { color: colors.primary }]}>Passwort vergessen?</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.linkBtn, { width: '100%', alignItems: 'center' }]} 
                  onPress={() => { setMode('login'); setForgotStep('email'); setOtpCode(''); setPassword(''); setConfirmPassword(''); setEmail(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.linkText, { color: colors.primary }]}>Zurück zum Login</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* COPYRIGHT */}
          <Text style={[styles.copyrightText, { color: colors.textMuted }]}>
            RailTrainer © by Dennis Köster • Version 1.1.3
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 48,
    alignItems: 'stretch',
    maxWidth: Platform.OS === 'web' ? 460 : '100%',
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  inputWrapper: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 14,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  linkBtn: {
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  copyrightText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 28,
    fontWeight: '500',
  },
});
