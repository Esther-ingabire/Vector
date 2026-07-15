import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getNotices, placeOrder } from '../../api/marketAgent';
import { C, S } from '../../theme';

// Matches CollectionNoticeForAgentSerializer on the backend — the notice list has no
// "expiry"/"quantity" fields, it's collection_deadline / available_quantity_kg / etc.
function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-RW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isPastDeadline(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

const RISK_CONFIG = {
  LOW: { bg: '#f0fdf4', color: C.success, icon: 'checkmark-circle-outline', label: 'Low risk — safe to self-collect' },
  AMBER: { bg: '#fffbeb', color: '#b45309', icon: 'warning-outline', label: 'Amber risk — consider using a transporter' },
  HIGH: { bg: '#fef2f2', color: C.danger, icon: 'alert-circle-outline', label: 'High risk — use a transporter' },
};

function RiskBanner({ risk, label }) {
  const cfg = RISK_CONFIG[risk] || RISK_CONFIG.LOW;
  return (
    <View style={[styles.riskBanner, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={16} color={cfg.color} />
      <Text style={[styles.riskBannerText, { color: cfg.color }]}>{label || cfg.label}</Text>
    </View>
  );
}

function NoticeCard({ item, onPlaceOrder }) {
  const expired = isPastDeadline(item.collection_deadline);
  const deadlineLabel = formatDate(item.collection_deadline);
  const tons = item.available_quantity_kg != null ? (Number(item.available_quantity_kg) / 1000).toFixed(1) : null;

  return (
    <View style={[S.card, expired && styles.expiredCard]}>
      {item.risk_level && <RiskBanner risk={item.risk_level} label={item.risk_label} />}

      <View style={S.spaceBetween}>
        <View style={[S.badge, { backgroundColor: expired ? C.gray100 : C.primaryLight }]}>
          <Text style={[S.badgeText, { color: expired ? C.gray500 : C.primary }]}>
            {expired ? 'DEADLINE PASSED' : 'READY FOR COLLECTION'}
          </Text>
        </View>
        {deadlineLabel && (
          <Text style={styles.expiryDate}>{expired ? 'Was due' : 'Until'} {deadlineLabel}</Text>
        )}
      </View>

      <Text style={styles.produceName}>{item.distributor_name || '—'}</Text>

      <View style={styles.detailsGrid}>
        {item.crop_name && (
          <View style={styles.detailItem}>
            <Ionicons name="leaf-outline" size={14} color={C.gray500} />
            <Text style={styles.detailLabel}>Crop</Text>
            <Text style={styles.detailValue}>{item.crop_name}</Text>
          </View>
        )}
        {tons != null && (
          <View style={styles.detailItem}>
            <Ionicons name="scale-outline" size={14} color={C.gray500} />
            <Text style={styles.detailLabel}>Available</Text>
            <Text style={styles.detailValue}>{tons} tons ({item.available_quantity_kg} kg)</Text>
          </View>
        )}
        {item.price_per_kg != null && (
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color={C.gray500} />
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>RWF {Number(item.price_per_kg).toLocaleString()}/kg</Text>
          </View>
        )}
        {item.pickup_location && (
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color={C.gray500} />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{item.pickup_location}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[S.button, styles.orderButton]}
        onPress={() => onPlaceOrder(item)}
        activeOpacity={0.85}
      >
        <Ionicons name="add-outline" size={18} color={C.white} />
        <Text style={[S.buttonText, { marginLeft: 6 }]}>Place Order</Text>
      </TouchableOpacity>
    </View>
  );
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expired', label: 'Expired' },
];

const DELIVERY_METHODS = [
  { value: 'SELF_COLLECTION', label: "I'll self-collect", icon: 'cube-outline' },
  { value: 'TRANSPORTER_DELIVERY', label: 'Send it to me', icon: 'car-outline' },
];

export default function NoticesScreen() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  // Place Order modal state
  const [orderTarget, setOrderTarget] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('SELF_COLLECTION');
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  const fetchNotices = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data } = await getNotices({ page_size: 50 });
      setNotices(data?.results ?? data ?? []);
    } catch (err) {
      if (err?.response?.status !== 404) {
        Alert.alert('Error', 'Could not load notices.');
      }
      setNotices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotices();
    }, [fetchNotices]),
  );

  const filteredNotices = notices.filter((n) => {
    if (filter === 'all') return true;
    const expired = isPastDeadline(n.collection_deadline);
    return filter === 'expired' ? expired : !expired;
  });

  const openOrder = (notice) => {
    setOrderTarget(notice);
    setQuantity('');
    setDeliveryMethod('SELF_COLLECTION');
    setPreferredDate('');
    setNotes('');
  };

  const submitOrder = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid quantity', 'Enter a valid quantity.');
      return;
    }
    if (qty > Number(orderTarget.available_quantity_kg)) {
      Alert.alert('Too much', `Max available is ${orderTarget.available_quantity_kg} kg.`);
      return;
    }
    setPlacing(true);
    try {
      await placeOrder({
        collection_notice: orderTarget.id,
        quantity_requested_kg: qty,
        preferred_collection_date: preferredDate.trim() || null,
        delivery_method: deliveryMethod,
        notes,
      });
      setOrderTarget(null);
      Alert.alert('Order placed', `Order placed for ${qty} kg of ${orderTarget.crop_name} — waiting for the distributor to confirm.`);
      fetchNotices();
    } catch (err) {
      const data = err?.response?.data;
      const flatMsg = (d) => {
        if (!d) return '';
        if (typeof d === 'string') return d;
        if (Array.isArray(d)) return d.map(flatMsg).join(' ');
        if (typeof d === 'object') return Object.values(d).map(flatMsg).join(' ');
        return String(d);
      };
      Alert.alert('Error', flatMsg(data) || 'Could not place order.');
    } finally {
      setPlacing(false);
    }
  };

  const renderEmpty = () => (
    <View style={[S.emptyContainer, { marginTop: 60 }]}>
      <Ionicons name="megaphone-outline" size={56} color={C.gray200} />
      <Text style={S.emptyText}>No notices found</Text>
      <Text style={S.emptySubtext}>Distributor notices will appear here</Text>
    </View>
  );

  return (
    <SafeAreaView style={S.screenBg}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Notices</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.filterTab, filter === opt.key && styles.filterTabActive]}
            onPress={() => setFilter(opt.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === opt.key && styles.filterTabTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotices}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <NoticeCard item={item} onPlaceOrder={openOrder} />}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotices(true);
              }}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={!!orderTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setOrderTarget(null)}
      >
        <View style={styles.modalOverlay}>
          {orderTarget && (
            <View style={styles.modalCard}>
              <Text style={styles.cardTitle}>Place Order</Text>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>{orderTarget.distributor_name}</Text>
                <Text style={styles.summarySub}>
                  {orderTarget.crop_name} · {(Number(orderTarget.available_quantity_kg) / 1000).toFixed(1)} tons available
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Quantity needed (kg) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder={`Max ${orderTarget.available_quantity_kg} kg`}
                placeholderTextColor={C.gray400}
                value={quantity}
                onChangeText={setQuantity}
              />

              <Text style={styles.fieldLabel}>Preferred collection date (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.gray400}
                value={preferredDate}
                onChangeText={setPreferredDate}
              />

              <Text style={styles.fieldLabel}>How do you want this delivered?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {DELIVERY_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.deliveryOption, deliveryMethod === m.value && styles.deliveryOptionActive]}
                    onPress={() => setDeliveryMethod(m.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={m.icon} size={20} color={deliveryMethod === m.value ? C.primary : C.gray500} />
                    <Text style={[styles.deliveryLabel, deliveryMethod === m.value && { color: C.primary }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grade A only, early morning preferred..."
                placeholderTextColor={C.gray400}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[S.button, styles.modalCancelButton]}
                  onPress={() => setOrderTarget(null)}
                  disabled={placing}
                >
                  <Text style={[S.buttonText, { color: C.gray700 }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.button, { flex: 1 }]}
                  onPress={submitOrder}
                  disabled={placing}
                >
                  {placing ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={S.buttonText}>Place Order</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.gray900,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.gray100,
  },
  filterTabActive: {
    backgroundColor: C.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gray500,
  },
  filterTabTextActive: {
    color: C.white,
  },
  listPad: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredCard: {
    opacity: 0.7,
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  riskBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  expiryDate: {
    fontSize: 12,
    color: C.gray500,
  },
  produceName: {
    fontSize: 17,
    fontWeight: '700',
    color: C.gray900,
    marginTop: 10,
    marginBottom: 12,
  },
  detailsGrid: {
    gap: 8,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: C.gray500,
    width: 70,
  },
  detailValue: {
    fontSize: 13,
    color: C.gray700,
    fontWeight: '500',
    flex: 1,
  },
  orderButton: {
    flexDirection: 'row',
    marginTop: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  summaryBox: {
    backgroundColor: C.gray50,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.gray900,
  },
  summarySub: {
    fontSize: 12,
    color: C.gray500,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gray700,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: C.gray900,
    marginBottom: 16,
  },
  deliveryOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  deliveryOptionActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  deliveryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.gray500,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    backgroundColor: C.gray100,
    paddingHorizontal: 20,
  },
});
