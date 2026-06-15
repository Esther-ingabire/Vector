import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { submitWasteReport, getWasteReports } from '../../api/marketAgent';
import { C, S } from '../../theme';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const WASTE_REASONS = [
  { key: 'spoilage', label: 'Spoilage', icon: 'leaf-outline', color: '#16a34a' },
  { key: 'overstock', label: 'Overstock', icon: 'archive-outline', color: '#d97706' },
  { key: 'damage', label: 'Damage', icon: 'hammer-outline', color: '#dc2626' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline', color: C.gray500 },
];

function WasteReportCard({ item }) {
  const reason = WASTE_REASONS.find((r) => r.key === item.reason) || WASTE_REASONS[3];

  return (
    <View style={styles.historyCard}>
      <View style={S.spaceBetween}>
        <Text style={styles.historyTitle}>{item.produce_type || 'Waste'}</Text>
        <Text style={styles.historyDate}>{formatDate(item.report_date || item.date)}</Text>
      </View>

      <View style={styles.historyRow}>
        <View style={[styles.reasonBadge, { backgroundColor: reason.color + '1A' }]}>
          <Ionicons name={reason.icon} size={13} color={reason.color} />
          <Text style={[styles.reasonText, { color: reason.color }]}>{reason.label}</Text>
        </View>
        <View style={styles.quantityBadge}>
          <Ionicons name="scale-outline" size={13} color={C.gray500} />
          <Text style={styles.quantityText}>
            {item.quantity_wasted_kg != null ? `${item.quantity_wasted_kg} kg` : '—'}
          </Text>
        </View>
      </View>

      {item.notes ? (
        <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
      ) : null}
    </View>
  );
}

export default function WasteReportScreen() {
  const [reports, setReports] = useState([]);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [produceType, setProduceType] = useState('');
  const [quantityWasted, setQuantityWasted] = useState('');
  const [reason, setReason] = useState('spoilage');
  const [notes, setNotes] = useState('');
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data } = await getWasteReports({ page_size: 20, ordering: '-report_date' });
      setReports(data?.results || []);
    } catch (err) {
      if (err?.response?.status !== 404) {
        Alert.alert('Error', 'Could not load waste reports.');
      } else {
        setReports([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [fetchReports]),
  );

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setProduceType('');
    setQuantityWasted('');
    setReason('spoilage');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!produceType.trim()) {
      Alert.alert('Missing Field', 'Please enter the produce type.');
      return;
    }
    if (!quantityWasted) {
      Alert.alert('Missing Field', 'Please enter the quantity wasted.');
      return;
    }
    const qty = parseFloat(quantityWasted);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid quantity.');
      return;
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid Date', 'Date must be in YYYY-MM-DD format.');
      return;
    }

    setSubmitting(true);
    try {
      await submitWasteReport({
        report_date: date,
        produce_type: produceType.trim(),
        quantity_wasted_kg: qty,
        reason,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Success', 'Waste report submitted successfully!');
      resetForm();
      fetchReports(true);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        Object.values(err?.response?.data || {}).flat()?.[0] ||
        'Could not submit waste report.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedReason = WASTE_REASONS.find((r) => r.key === reason) || WASTE_REASONS[0];

  if (loading) {
    return (
      <SafeAreaView style={S.screenBg}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Waste Reports</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.screenBg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchReports(true);
              }}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.screenHeader}>
            <Text style={styles.screenTitle}>Waste Reports</Text>
          </View>

          {/* Form */}
          <View style={S.card}>
            <Text style={styles.formTitle}>Submit New Waste Report</Text>

            {/* Date */}
            <View style={styles.fieldGroup}>
              <Text style={S.label}>Date (YYYY-MM-DD)</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="calendar-outline" size={16} color={C.gray500} style={styles.inputIcon} />
                <TextInput
                  style={[S.input, styles.inputFlex]}
                  placeholder="2026-06-14"
                  placeholderTextColor={C.gray400}
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Produce type */}
            <View style={styles.fieldGroup}>
              <Text style={S.label}>Produce Type</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="leaf-outline" size={16} color={C.gray500} style={styles.inputIcon} />
                <TextInput
                  style={[S.input, styles.inputFlex]}
                  placeholder="e.g. Maize, Beans, Tomatoes"
                  placeholderTextColor={C.gray400}
                  value={produceType}
                  onChangeText={setProduceType}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Quantity wasted */}
            <View style={styles.fieldGroup}>
              <Text style={S.label}>Quantity Wasted (kg)</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="scale-outline" size={16} color={C.gray500} style={styles.inputIcon} />
                <TextInput
                  style={[S.input, styles.inputFlex]}
                  placeholder="e.g. 25"
                  placeholderTextColor={C.gray400}
                  value={quantityWasted}
                  onChangeText={setQuantityWasted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Reason picker */}
            <View style={styles.fieldGroup}>
              <Text style={S.label}>Reason</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowReasonPicker((v) => !v)}
              >
                <Ionicons name={selectedReason.icon} size={16} color={selectedReason.color} />
                <Text style={styles.pickerText}>{selectedReason.label}</Text>
                <Ionicons
                  name={showReasonPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={C.gray400}
                />
              </TouchableOpacity>
              {showReasonPicker && (
                <View style={styles.pickerDropdown}>
                  {WASTE_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[
                        styles.pickerOption,
                        reason === r.key && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setReason(r.key);
                        setShowReasonPicker(false);
                      }}
                    >
                      <Ionicons name={r.icon} size={15} color={r.color} />
                      <Text
                        style={[
                          styles.pickerOptionText,
                          reason === r.key && { color: C.primary, fontWeight: '600' },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={S.label}>Notes (optional)</Text>
              <TextInput
                style={[S.input, styles.notesInput]}
                placeholder="Add any additional context..."
                placeholderTextColor={C.gray400}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[S.button, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={18} color={C.white} />
                  <Text style={[S.buttonText, { marginLeft: 8 }]}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* History */}
          <Text style={S.sectionTitle}>Past Reports</Text>
          {reports.length === 0 ? (
            <View style={[S.card, S.emptyContainer, { paddingVertical: 32 }]}>
              <Ionicons name="document-text-outline" size={40} color={C.gray200} />
              <Text style={S.emptyText}>No waste reports yet</Text>
            </View>
          ) : (
            reports.map((r) => <WasteReportCard key={r.id} item={r} />)
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.gray900,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.gray900,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.gray200,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputFlex: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  notesInput: {
    height: 80,
    paddingTop: 13,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.gray50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.gray200,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: C.gray900,
  },
  pickerDropdown: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.gray200,
    marginTop: 4,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  pickerOptionSelected: {
    backgroundColor: C.primaryLight,
  },
  pickerOptionText: {
    fontSize: 14,
    color: C.gray700,
  },
  historyCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.gray900,
  },
  historyDate: {
    fontSize: 12,
    color: C.gray500,
  },
  historyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.gray100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityText: {
    fontSize: 12,
    color: C.gray500,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 12,
    color: C.gray500,
    lineHeight: 17,
    marginTop: 4,
  },
});
