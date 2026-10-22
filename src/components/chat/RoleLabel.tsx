import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { GraduationCap, Shield } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import type { RoleKind } from './types';

export interface RoleLabelProps {
  label: string;
  kind: RoleKind;
  style?: StyleProp<ViewStyle>;
}

/**
 * Rolle/Titel neutral in `textMuted` (7,58:1 bzw. 6,99:1). Ausbilder und Moderatoren erhalten ein
 * kleines Icon (dekorativ – die Rolle steht als Text daneben). Keine Rollenfarben.
 */
export function RoleLabel({ label, kind, style }: RoleLabelProps) {
  const { colors } = useAppTheme();
  if (!label) return null;
  const Icon = kind === 'admin' ? GraduationCap : kind === 'moderator' ? Shield : null;

  return (
    <View style={[styles.row, style]}>
      {Icon ? (
        <View aria-hidden>
          <Icon size={16} color={colors.textMuted} strokeWidth={2.25} />
        </View>
      ) : null}
      <Text style={[styles.text, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    flexShrink: 1,
  },
});
