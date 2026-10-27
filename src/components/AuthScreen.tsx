import { useRef, useState, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ChevronLeft, KeyRound, Lock, Mail, User as UserIcon } from 'lucide-react-native';
import { mockDb, User } from '../database/mockDb';
import { useAppTheme } from '../context/ThemeContext';
import { AppKeyboardPane } from './ui/AppKeyboardPane';
import { useDynamicKeyboard } from '../hooks/useDynamicKeyboard';
import { TextField } from './ui/TextField';
import { Button } from './ui/Button';
import { SCREEN_PADDING } from './ui/tokens';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

type Mode = 'login' | 'register' | 'forgot';
type ForgotStep = 'email' | 'otp';
type FieldName = 'name' | 'email' | 'password' | 'code';
type FieldErrors = Partial<Record<FieldName, string>>;
type Pending = 'submit' | 'resend' | null;

const IS_WEB = Platform.OS === 'web';
const APP_NAME = 'Tf-Trainer';
const APP_VERSION = Constants.expoConfig?.version;
const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_HINT = `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`;

const MESSAGES = {
  emailMissing: 'Gib deine E-Mail-Adresse ein.',
  passwordMissing: 'Gib dein Passwort ein.',
  newPasswordMissing: 'Gib ein Passwort ein.',
  passwordTooShort: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`,
  nameMissing: 'Gib deinen Namen ein.',
  codeMissing: 'Gib den Code aus der E-Mail ein.',
  fallback: 'Das hat nicht geklappt. Bitte versuche es noch einmal.',
};

/** iOS liest Live-Regionen nicht vor – dort explizit ansagen. Android und Web nutzen Live-Region bzw. role="alert". */
function announce(message: string) {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : MESSAGES.fallback;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { isDark, colors } = useAppTheme();
  const { isKeyboardVisible } = useDynamicKeyboard(0);

  const [mode, setMode] = useState<Mode>('login');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [codeResent, setCodeResent] = useState(false);
  // Scrollen nur, wenn der Inhalt wirklich höher ist als der sichtbare Bereich (Tastatur, kleines Gerät, große Schrift).
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const nameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const codeRef = useRef<TextInputInstance>(null);

  const isForgot = mode === 'forgot';
  const isOtpStep = isForgot && forgotStep === 'otp';
  const isBusy = pending !== null;
  const screenBg = isDark ? colors.background : colors.cardBg;
  const trimmedEmail = email.trim();
  const canScroll = viewportHeight > 0 && contentHeight > viewportHeight + 1;

  const fieldRefs: Record<FieldName, RefObject<TextInputInstance | null>> = {
    name: nameRef,
    email: emailRef,
    password: passwordRef,
    code: codeRef,
  };

  // --- Hilfen für Fehlerzustände ---------------------------------------------

  /** Setzt Feldfehler, fokussiert das erste fehlerhafte Feld. Gibt true zurück, wenn es Fehler gab. */
  const applyFieldErrors = (errors: FieldErrors, order: FieldName[]): boolean => {
    setFieldErrors(errors);
    const first = order.find((field) => errors[field]);
    if (!first) return false;
    announce(errors[first] as string);
    // Nach dem Rendern fokussieren, damit Fehlertext und aria-describedby schon da sind.
    setTimeout(() => fieldRefs[first].current?.focus(), 0);
    return true;
  };

  const clearFieldError = (field: FieldName) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (formError) setFormError(null);
  };

  const showFormError = (message: string) => {
    setFormError(message);
    announce(message);
  };

  const switchMode = (next: Mode) => {
    // E-Mail und Name bleiben erhalten, Passwort und Code werden geleert.
    setMode(next);
    setForgotStep('email');
    setPassword('');
    setOtpCode('');
    setFieldErrors({});
    setFormError(null);
    setCodeResent(false);
  };

  // --- Aktionen (Aufrufe an mockDb unverändert) -------------------------------

  const handleLogin = async () => {
    if (isBusy) return;
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = MESSAGES.emailMissing;
    if (!password.trim()) errors.password = MESSAGES.passwordMissing;
    if (applyFieldErrors(errors, ['email', 'password'])) return;

    setFormError(null);
    setPending('submit');
    try {
      const user = await mockDb.loginUser(email, password);
      onLoginSuccess(user);
    } catch (e) {
      showFormError(errorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const handleRegister = async () => {
    if (isBusy) return;
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = MESSAGES.nameMissing;
    if (!email.trim()) errors.email = MESSAGES.emailMissing;
    if (!password.trim()) errors.password = MESSAGES.newPasswordMissing;
    else if (password.length < MIN_PASSWORD_LENGTH) errors.password = MESSAGES.passwordTooShort;
    if (applyFieldErrors(errors, ['name', 'email', 'password'])) return;

    setFormError(null);
    setPending('submit');
    try {
      // Web-Freischaltung (PayPal/Freischaltcode) erfolgt danach auf dem WebPaywallScreen.
      const user = await mockDb.registerUser(name, email, password);
      onLoginSuccess(user);
    } catch (e) {
      showFormError(errorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const handleRequestOtp = async (isResend: boolean) => {
    if (isBusy) return;
    if (!isResend && applyFieldErrors(email.trim() ? {} : { email: MESSAGES.emailMissing }, ['email'])) {
      return;
    }

    setFormError(null);
    setPending(isResend ? 'resend' : 'submit');
    try {
      await mockDb.sendPasswordResetOtp(email);
      setForgotStep('otp');
      setCodeResent(isResend);
      announce(`${isResend ? 'Neuer Code' : 'Code'} an ${email.trim()} gesendet.`);
    } catch (e) {
      showFormError(errorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const handleVerifyOtpAndReset = async () => {
    if (isBusy) return;
    const errors: FieldErrors = {};
    if (!otpCode.trim()) errors.code = MESSAGES.codeMissing;
    if (!password.trim()) errors.password = MESSAGES.newPasswordMissing;
    else if (password.length < MIN_PASSWORD_LENGTH) errors.password = MESSAGES.passwordTooShort;
    if (applyFieldErrors(errors, ['code', 'password'])) return;

    setFormError(null);
    setPending('submit');
    try {
      const updatedUser = await mockDb.verifyOtpAndResetPassword(email, otpCode, password);
      onLoginSuccess(updatedUser);
    } catch (e) {
      showFormError(errorMessage(e));
    } finally {
      setPending(null);
    }
  };

  // --- Texte je Ansicht --------------------------------------------------------

  const title =
    mode === 'login'
      ? `Willkommen beim ${APP_NAME}`
      : mode === 'register'
        ? 'Konto erstellen'
        : isOtpStep
          ? 'Code eingeben'
          : 'Passwort zurücksetzen';

  const primaryAction =
    mode === 'login'
      ? { title: 'Anmelden', loadingTitle: 'Wird angemeldet …', onPress: handleLogin }
      : mode === 'register'
        ? { title: 'Konto erstellen', loadingTitle: 'Konto wird erstellt …', onPress: handleRegister }
        : isOtpStep
          ? { title: 'Passwort speichern', loadingTitle: 'Wird gespeichert …', onPress: handleVerifyOtpAndReset }
          : { title: 'Code senden', loadingTitle: 'Code wird gesendet …', onPress: () => handleRequestOtp(false) };

  // --- Felder ------------------------------------------------------------------

  const nameField = (
    <TextField
      ref={nameRef}
      label="Name"
      placeholder="Vor- und Nachname"
      icon={UserIcon}
      value={name}
      onChangeText={(value) => {
        setName(value);
        clearFieldError('name');
      }}
      error={fieldErrors.name}
      autoCapitalize="words"
      autoCorrect={false}
      autoComplete="name"
      textContentType="name"
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => emailRef.current?.focus()}
    />
  );

  const emailField = (
    <TextField
      ref={emailRef}
      label="E-Mail-Adresse"
      placeholder="name@beispiel.de"
      icon={Mail}
      value={email}
      onChangeText={(value) => {
        setEmail(value);
        clearFieldError('email');
      }}
      error={fieldErrors.email}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="email"
      textContentType="emailAddress"
      returnKeyType={isForgot ? 'send' : 'next'}
      submitBehavior={isForgot ? 'blurAndSubmit' : 'submit'}
      onSubmitEditing={isForgot ? () => handleRequestOtp(false) : () => passwordRef.current?.focus()}
    />
  );

  const passwordField = (
    <TextField
      ref={passwordRef}
      label={isOtpStep ? 'Neues Passwort' : 'Passwort'}
      placeholder={isOtpStep ? 'Neues Passwort eingeben' : 'Passwort eingeben'}
      icon={Lock}
      password
      value={password}
      onChangeText={(value) => {
        setPassword(value);
        clearFieldError('password');
      }}
      error={fieldErrors.password}
      hint={mode === 'login' ? undefined : PASSWORD_HINT}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      textContentType={mode === 'login' ? 'password' : 'newPassword'}
      returnKeyType={mode === 'login' ? 'go' : 'done'}
      submitBehavior="blurAndSubmit"
      onSubmitEditing={primaryAction.onPress}
      containerStyle={mode === 'login' ? styles.fieldBeforeLink : undefined}
    />
  );

  const codeField = (
    <TextField
      ref={codeRef}
      label="Code"
      placeholder="Code aus der E-Mail"
      icon={KeyRound}
      value={otpCode}
      onChangeText={(value) => {
        setOtpCode(value);
        clearFieldError('code');
      }}
      error={fieldErrors.code}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={10}
      autoFocus
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => passwordRef.current?.focus()}
    />
  );

  // --- Darstellung -------------------------------------------------------------

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: screenBg }]}>
      <AppKeyboardPane style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={canScroll}
          bounces={canScroll}
          alwaysBounceVertical={false}
          overScrollMode="never"
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          onContentSizeChange={(_width, height) => setContentHeight(height)}
        >
          <View style={styles.column}>
            {isForgot ? (
              <Button
                variant="text"
                icon={ChevronLeft}
                title="Zurück"
                accessibilityLabel="Zurück zur Anmeldung"
                align="start"
                onPress={() => switchMode('login')}
                disabled={isBusy}
              />
            ) : null}

            <View style={styles.main}>
              <View style={styles.header}>
                {!isForgot ? (
                  <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.logo}
                    resizeMode="cover"
                    accessibilityRole="image"
                    accessibilityLabel={`${APP_NAME}-Logo`}
                    accessibilityIgnoresInvertColors
                  />
                ) : null}
                <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
                  {title}
                </Text>

                {mode === 'login' ? (
                  <Text style={[styles.intro, { color: colors.textMuted }]}>Melde dich mit deinem Konto an.</Text>
                ) : null}
                {mode === 'register' ? (
                  <Text style={[styles.intro, { color: colors.textMuted }]}>
                    Gib deinen Namen, deine E-Mail-Adresse und ein Passwort ein.
                  </Text>
                ) : null}
                {isForgot && !isOtpStep ? (
                  <Text style={[styles.intro, { color: colors.textMuted }]}>
                    {/* Geschützte Bindestriche (U+2011), damit „E-Mail-Adresse“ nicht umbricht. */}
                    Wir schicken dir einen Code an deine {'E\u2011Mail\u2011Adresse'}.
                  </Text>
                ) : null}
                {isOtpStep ? (
                  <Text accessibilityLiveRegion="polite" style={[styles.intro, { color: colors.textMuted }]}>
                    {codeResent ? 'Neuer Code an ' : 'Code an '}
                    <Text style={[styles.emphasis, { color: colors.text }]}>{trimmedEmail}</Text>
                    {' gesendet. Schau auch im Spam-Ordner nach.'}
                  </Text>
                ) : null}
              </View>

              {/* role="form" wird im Web zu <form>, damit Passwort-Manager das Formular erkennen. */}
              <View role="form" accessibilityLabel={title} style={styles.form}>
                {mode === 'register' ? nameField : null}
                {!isOtpStep ? emailField : null}
                {isOtpStep ? codeField : null}
                {!isForgot || isOtpStep ? passwordField : null}

                {mode === 'login' ? (
                  <Button
                    variant="text"
                    title="Passwort vergessen?"
                    align="end"
                    onPress={() => switchMode('forgot')}
                    disabled={isBusy}
                    style={styles.forgotLink}
                  />
                ) : null}

                {IS_WEB && mode === 'register' ? (
                  <Text style={[styles.note, { color: colors.textMuted }]}>
                    Der Web-Zugang kostet einmalig 4,99 €. Bezahlen kannst du nach der Registrierung.
                  </Text>
                ) : null}

                {formError ? (
                  <Text
                    role="alert"
                    accessibilityLiveRegion="assertive"
                    style={[styles.formError, { color: colors.errorText }]}
                  >
                    {formError}
                  </Text>
                ) : null}

                <Button
                  title={primaryAction.title}
                  loadingTitle={primaryAction.loadingTitle}
                  loading={pending === 'submit'}
                  disabled={pending === 'resend'}
                  onPress={primaryAction.onPress}
                />

                {mode === 'login' ? (
                  <Button
                    variant="text"
                    leadingText="Noch kein Konto?"
                    title="Konto erstellen"
                    onPress={() => switchMode('register')}
                    disabled={isBusy}
                    style={styles.secondaryAction}
                  />
                ) : null}
                {mode === 'register' ? (
                  <Button
                    variant="text"
                    leadingText="Schon ein Konto?"
                    title="Anmelden"
                    onPress={() => switchMode('login')}
                    disabled={isBusy}
                    style={styles.secondaryAction}
                  />
                ) : null}
                {isOtpStep ? (
                  <Button
                    variant="text"
                    title="Code erneut senden"
                    loadingTitle="Code wird gesendet …"
                    loading={pending === 'resend'}
                    disabled={pending === 'submit'}
                    onPress={() => handleRequestOtp(true)}
                    style={styles.secondaryAction}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      </AppKeyboardPane>

      {/* Footer steht fest unten (außerhalb der ScrollView); bei offener Tastatur ausgeblendet. */}
      {!isKeyboardVisible ? (
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {APP_NAME} © by Dennis Köster{APP_VERSION ? ` • Version ${APP_VERSION}` : ''}
        </Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
  },
  column: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  main: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 8,
  },
  emphasis: {
    fontWeight: '600',
  },
  form: {
    marginTop: 32,
  },
  fieldBeforeLink: {
    marginBottom: 4,
  },
  forgotLink: {
    marginBottom: 12,
  },
  note: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  formError: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 12,
  },
  secondaryAction: {
    marginTop: 16,
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
  },
});
