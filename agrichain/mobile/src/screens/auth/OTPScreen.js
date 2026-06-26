import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { verifyOtp, resendOtp } from '../../api/auth';
import { setAuthTokens } from '../../api/client';
import { me } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { C, S } from '../../theme';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function OTPScreen({ navigation }) {
  const { updateUser } = useAuth();
  const [credential, setCredential] = useState('');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [credFocused, setCredFocused] = useState(false);

  const inputRefs = useRef([]);
  const cooldownRef = useRef(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDigitChange = (text, index) => {
    // Handle paste of full OTP
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      const newDigits = Array(OTP_LENGTH).fill('');
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = text.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
    }
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (!credential.trim()) {
      Alert.alert('Missing Credential', 'Please enter your phone number or email.');
      return;
    }
    if (otp.length < OTP_LENGTH) {
      Alert.alert('Incomplete OTP', 'Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await verifyOtp({ credential: credential.trim(), otp_code: otp });
      if (data.access) {
        setAuthTokens(data.access, data.refresh);
        if (data.must_change_password) {
          navigation.navigate('SetPassword', { credential: credential.trim() });
          return;
        }
        // Fetch full user profile
        const { data: userData } = await me();
        updateUser(userData);
        // AppNavigator will switch automatically
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.otp?.[0] ||
        'Invalid or expired OTP.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!credential.trim()) {
      Alert.alert('Missing Credential', 'Please enter your phone number or email first.');
      return;
    }
    setResendLoading(true);
    try {
      await resendOtp({ credential: credential.trim() });
      startCooldown();
      Alert.alert('OTP Sent', 'A new verification code has been sent.');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to resend OTP.';
      Alert.alert('Error', msg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Ionicons name="shield-checkmark-outline" size={36} color={C.white} />
            </View>
            <Text style={styles.logoTitle}>Activate Account</Text>
            <Text style={styles.logoSubtitle}>Enter your OTP to verify your identity</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Credential */}
            <View style={styles.inputGroup}>
              <Text style={S.label}>Phone / Email</Text>
              <View
                style={[
                  styles.inputWrapper,
                  credFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={credFocused ? C.primary : C.gray400}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter phone or email"
                  placeholderTextColor={C.gray400}
                  value={credential}
                  onChangeText={setCredential}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setCredFocused(true)}
                  onBlur={() => setCredFocused(false)}
                />
              </View>
            </View>

            {/* OTP digit boxes */}
            <View style={styles.inputGroup}>
              <Text style={S.label}>Verification Code</Text>
              <View style={styles.otpRow}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => (inputRefs.current[i] = r)}
                    style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                    value={d}
                    onChangeText={(text) => handleDigitChange(text, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={6} // allows paste detection
                    textContentType="oneTimeCode"
                    selectTextOnFocus
                  />
                ))}
              </View>
            </View>

            {/* Verify button */}
            <TouchableOpacity
              style={[S.button, loading && { opacity: 0.7 }]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={S.buttonText}>Activate Account</Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn't receive a code? </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={cooldown > 0 || resendLoading}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : cooldown > 0 ? (
                  <Text style={styles.resendCooldown}>Resend in {cooldown}s</Text>
                ) : (
                  <Text style={styles.resendLink}>Resend Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footer}>
            ChainSight © 2026 · Ministry of Agriculture, Rwanda
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.primaryDark,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.gray50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.gray200,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: C.primary,
    backgroundColor: C.white,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: C.gray900,
    paddingVertical: 13,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.gray50,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: C.gray900,
  },
  otpBoxFilled: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
    color: C.primaryDark,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  resendPrompt: {
    fontSize: 14,
    color: C.gray500,
  },
  resendLink: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '600',
  },
  resendCooldown: {
    fontSize: 14,
    color: C.gray400,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 28,
  },
});
