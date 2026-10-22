import React from 'react';
import { View } from 'react-native';

// In native mobile builds (Google Play Store), PayPal / external web paywall is completely omitted
// in strict accordance with Google Play Store Payments Policy.
export default function WebPaywallScreen(_props: any) {
  return <View />;
}
