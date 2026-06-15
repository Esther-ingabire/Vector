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
import { setPassword as apiSetPassword } from '../../api/auth';
import { C, S } from '../../theme';

function CheckItem({ passed, label }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons
        name={passed ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={passed ? C.success : C.gray400}
      />
      <Text style={[styles.checkLabel, passed && styles.checkLabelPassed]}>
        {label}
      </Text>
    </View>
  );
}

export default function SetPasswordScreen({ navigation, route }) {
  const credential = route?.params?.credential || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newFocused, setNewFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const canSubmit = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Invalid Password', 'Please meet all password requirements.');
      return;
    }
    setLoading(true);
    try {
      await apiSetPassword({
        credential: credential || undefined,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      navigation.navigate('Login', { message: 'Password set successfully! Please sign in.' });
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        data?.detail ||
        data?.new_password?.[0] ||
        data?.non_field_errors?.[0] ||
        'Failed to set password. Please try again.';
      Alert.alert('Error', msg);
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
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Ionicons name="key-outline" size={36} color={C.white} />
            </View>
            <Text style={styles.logoTitle}>Set Password</Text>
            <Text style={styles.logoSubtitle}>
              Create a secure password for your account
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={S.label}>New Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  newFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={newFocused ? C.primary : C.gray400}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Enter new password"
                  placeholderTextColor={C.gray400}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  onFocus={() => setNewFocused(true)}
                  onBlur={() => setNewFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowNew((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={C.gray400}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={S.label}>Confirm Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  confirmFocused && styles.inputWrapperFocused,
                  confirmPassword.length > 0 && !passwordsMatch && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={confirmFocused ? C.primary : C.gray400}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={C.gray400}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={C.gray400}
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={styles.errorHint}>Passwords do not match</Text>
              )}
            </View>

            {/* Password strength checklist */}
            <View style={styles.checkList}>
              <Text style={styles.checkListTitle}>Password Requirements</Text>
              <CheckItem passed={hasMinLength} label="At least 8 characters" />
              <CheckItem passed={hasUppercase} label="Contains an uppercase letter" />
              <CheckItem passed={hasNumber} label="Contains a number" />
              <CheckItem passed={passwordsMatch} label="Passwords match" />
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[S.button, (!canSubmit || loading) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={S.buttonText}>Set Password</Text>
              )}
            </TouchableOpacity>
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
  inputWrapperError: {
    borderColor: C.danger,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    fontSize: 15,
    color: C.gray900,
    paddingVertical: 13,
  },
  errorHint: {
    fontSize: 12,
    color: C.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  checkList: {
    backgroundColor: C.gray50,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  checkListTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  checkLabel: {
    fontSize: 13,
    color: C.gray500,
  },
  checkLabelPassed: {
    color: C.success,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 28,
  },
});
