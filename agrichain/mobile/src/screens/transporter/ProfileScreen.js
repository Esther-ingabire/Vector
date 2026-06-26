import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/auth';
import { C } from '../../theme';

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function EditField({ icon, label, value, onChangeText, keyboardType, autoCapitalize }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.editGroup}>
      <Text style={styles.editLabel}>{label}</Text>
      <View style={[styles.editInputWrapper, focused && styles.editInputFocused]}>
        <Ionicons name={icon} size={16} color={focused ? C.primary : '#9ca3af'} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.editInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'words'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor="#9ca3af"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '?';

  const handleEdit = () => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    });
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      Alert.alert('Missing Fields', 'First and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
      });
      updateUser(data);
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.email?.[0] || 'Could not save changes.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      // Alert.alert buttons are no-ops on web — use native confirm instead
      if (window.confirm('Are you sure you want to sign out?')) logout();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Avatar + edit toggle */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="car-outline" size={12} color={C.primary} />
              <Text style={styles.roleText}>Transporter</Text>
            </View>

            {!editing && (
              <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.85}>
                <Ionicons name="pencil-outline" size={15} color={C.primary} />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            /* ── Edit mode ── */
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Edit Profile</Text>

              <EditField
                icon="person-outline"
                label="First Name"
                value={form.first_name}
                onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))}
              />
              <EditField
                icon="person-outline"
                label="Last Name"
                value={form.last_name}
                onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))}
              />
              <EditField
                icon="mail-outline"
                label="Email"
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── View mode ── */
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Account Details</Text>
                <InfoRow icon="person-outline" label="Full Name" value={`${user?.first_name || ''} ${user?.last_name || ''}`.trim()} />
                <InfoRow icon="mail-outline" label="Email" value={user?.email} />
                <InfoRow icon="call-outline" label="Phone" value={user?.phone_number} />
                <InfoRow icon="business-outline" label="Company" value={user?.organization_name} />
                <InfoRow icon="location-outline" label="District" value={user?.district} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Account Status</Text>
                <View style={styles.infoRow}>
                  <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={C.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Verification</Text>
                    <Text style={[styles.infoValue, { color: C.success }]}>
                      {user?.is_verified ? 'Verified' : 'Pending verification'}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Sign out */}
          {!editing && (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color={C.danger} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.footer}>ChainSight © 2026 · Ministry of Agriculture, Rwanda</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0faf4' },
  scroll: { padding: 20, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14,
  },
  roleText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: '#f0fdf4',
  },
  editBtnText: { fontSize: 14, color: C.primary, fontWeight: '600' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: {
    fontSize: 12, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14,
  },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  iconBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500' },

  /* Edit fields */
  editGroup: { marginBottom: 14 },
  editLabel: { fontSize: 12, color: '#374151', fontWeight: '600', marginBottom: 6 },
  editInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 2,
  },
  editInputFocused: { borderColor: C.primary, backgroundColor: '#fff' },
  editInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 11 },

  editActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#fecaca', borderRadius: 14,
    paddingVertical: 14, backgroundColor: '#fff5f5', marginBottom: 24,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: C.danger },
  footer: { textAlign: 'center', fontSize: 12, color: '#9ca3af' },
});
