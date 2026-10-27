import React, { useEffect } from 'react';
import { View, Text, StyleSheet, BackHandler, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpCircle, ExternalLink, Power } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { Button } from './ui/Button';
import { openAppStore, AppStoreUpdateInfo } from '../services/appStoreUpdateService';

interface ForceUpdateScreenProps {
  updateInfo: AppStoreUpdateInfo;
}

export default function ForceUpdateScreen({ updateInfo }: ForceUpdateScreenProps) {
  const { colors, isDark } = useAppTheme();

  // Android: Hardware-Zurück-Taste schließt die App
  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleUpdatePress = async () => {
    if (updateInfo.storeUrl) {
      await openAppStore(updateInfo.storeUrl);
    }
  };

  const handleExitPress = () => {
    BackHandler.exitApp();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Update Icon mit Soft-Glow */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '18' }]}>
          <ArrowUpCircle size={64} color={colors.primary} />
        </View>

        {/* Titel & Info */}
        <Text style={[styles.title, { color: colors.text }]}>Update erforderlich</Text>

        <View style={[styles.badge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {updateInfo.storeName}: Version {updateInfo.storeVersion}
          </Text>
        </View>

        <Text style={[styles.description, { color: colors.textMuted }]}>
          Eine neue Version von RailTrainer ist verfügbar. Um die App weiterhin sicher und fehlerfrei nutzen zu können, ist eine Aktualisierung erforderlich.
        </Text>

        <View style={[styles.versionBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: colors.textMuted }]}>Installierte Version:</Text>
            <Text style={[styles.versionVal, { color: colors.text }]}>{updateInfo.currentVersion}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: colors.textMuted }]}>Verfügbare Version:</Text>
            <Text style={[styles.versionVal, { color: colors.primary, fontWeight: '700' }]}>{updateInfo.storeVersion}</Text>
          </View>
        </View>

        {/* Aktionen */}
        <View style={styles.actions}>
          <Button
            variant="primary"
            title={`Jetzt im ${updateInfo.storeName} aktualisieren`}
            icon={ExternalLink}
            onPress={handleUpdatePress}
          />
          {Platform.OS === 'android' && (
            <Button
              variant="secondary"
              title="App beenden"
              icon={Power}
              onPress={handleExitPress}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  versionBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    gap: 8,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 14,
  },
  versionVal: {
    fontSize: 14,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
});
