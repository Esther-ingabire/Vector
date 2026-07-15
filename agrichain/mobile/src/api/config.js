/**
 * API Base URL Configuration
 *
 * Auto-detects a sensible backend host instead of relying on someone hand-editing this file
 * per machine/device (that was the old approach — easy to forget to revert, and it silently
 * breaks every API call the moment you test on a different network or device).
 *
 * Resolution order:
 *   1. EXPO_PUBLIC_API_URL env var (set it in mobile/.env) — always wins when set, e.g. to
 *      point at a Cloudflare tunnel URL for testing on a phone off the LAN.
 *   2. The host Metro/Expo is already being served from (Constants.expoConfig.hostUri) —
 *      this is the same IP a physical device or emulator is already using to load the app,
 *      so reusing it for the API avoids a stale hardcoded LAN IP.
 *   3. Platform fallback: Android emulator can't reach the host via 'localhost' (that
 *      resolves to the emulator itself), so it needs the '10.0.2.2' alias; everything else
 *      (iOS simulator, Expo web) can use 'localhost' directly.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PORT = 8000;

function detectHost() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${detectHost()}:${PORT}/api/v1`;
