import React, { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { C, S } from '../../theme';
import ChainSightLogo from '../../components/ChainSightLogo';

export default function LoginScreen({ navigation, route }) {
  const { login } = useAuth();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credFocused, setCredFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  // Show success message if coming from SetPassword
  const successMessage = route?.params?.message;

  const handleLogin = async () => {
    if (!credential.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your phone/email and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(credential.trim(), password);
      if (user?.must_change_password) {
        navigation.navigate('SetPassword', { credential: credential.trim() });
      }
      // If login sets user state, AppNavigator auto-switches to the main app
    } catch (err) {
      if (!err?.response) {
        Alert.alert('Connection Error', `Cannot reach server at ${require('../../api/config').API_BASE_URL}. Make sure the backend is running and your phone is on the same Wi-Fi.`);
        return;
      }
      const data = err.response.data;
      const msg =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        data?.credential ||
        data?.password ||
        'Invalid credentials. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
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
          {/* Logo area */}
          <View style={styles.logoSection}>
            <ChainSightLogo size={72} />
            <Text style={styles.logoTitle}>ChainSight</Text>
            <Text style={styles.logoSubtitle}>Rwanda Supply Chain Analytics</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>

            {successMessage ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={16} color={C.success} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* Credential input */}
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
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password input */}
            <View style={styles.inputGroup}>
              <Text style={S.label}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  pwFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={pwFocused ? C.primary : C.gray400}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Enter password"
                  placeholderTextColor={C.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={C.gray400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              style={[S.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={S.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Activate link */}
            <TouchableOpacity
              style={styles.activateLink}
              onPress={() => navigation.navigate('OTP')}
            >
              <Text style={styles.activateLinkText}>
                Activate your account?{' '}
                <Text style={styles.activateLinkBold}>Enter OTP</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
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
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
    gap: 12,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    letterSpacing: 0.3,
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
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.gray900,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: C.gray500,
    marginBottom: 24,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    fontSize: 13,
    color: C.success,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
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
  eyeBtn: {
    paddingLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  activateLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  activateLinkText: {
    fontSize: 14,
    color: C.gray500,
  },
  activateLinkBold: {
    color: C.primary,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 28,
  },
});
