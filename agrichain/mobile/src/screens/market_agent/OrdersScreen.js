import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getMyOrders } from '../../api/marketAgent';
import { C, S } from '../../theme';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' });
}

function normStatus(s) {
  if (!s) return 'PENDING';
  if (s === 'PENDING_CONFIRMATION') return 'PENDING';
  if (['CONFIRMED', 'ADJUSTED'].includes(s)) return 'CONFIRMED';
  if (s === 'DECLINED') return 'DECLINED';
  return 'COMPLETED';
}

const STATUS_CONFIG = {
  PENDING:   { bg: '#fffbeb', color: '#b45309', label: 'Awaiting confirmation' },
  CONFIRMED: { bg: C.primaryLight, color: C.primary, label: 'Confirmed — ready to collect' },
  DECLINED:  { bg: '#fef2f2', color: '#dc2626', label: 'Declined' },
  COMPLETED: { bg: C.gray100, color: C.gray500, label: 'Collected' },
};

const DELIVERY_LABEL = {
  SELF_COLLECTION: 'You self-collect from distributor',
  TRANSPORTER_DELIVERY: 'Distributor sends transport to you',
};

function OrderCard({ item }) {
  const status = normStatus(item.status);
  const cfg = STATUS_CONFIG[status];

  return (
    <View style={S.card}>
      <View style={S.spaceBetween}>
        <View style={[S.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[S.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.preferred_collection_date)}</Text>
      </View>

      <Text style={styles.cropName}>{item.crop_name || '—'}</Text>
      {item.distributor_name && (
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={14} color={C.gray500} />
          <Text style={styles.detailText}>{item.distributor_name}</Text>
        </View>
      )}
      <View style={styles.detailRow}>
        <Ionicons name="scale-outline" size={14} color={C.gray500} />
        <Text style={styles.detailText}>
          {item.confirmed_quantity_kg ?? item.quantity_requested_kg ?? '—'} kg
          {item.confirmed_quantity_kg && item.confirmed_quantity_kg !== item.quantity_requested_kg
            ? ` (requested ${item.quantity_requested_kg} kg)` : ''}
        </Text>
      </View>
      {item.delivery_method && (
        <View style={styles.detailRow}>
          <Ionicons name="navigate-outline" size={14} color={C.gray500} />
          <Text style={styles.detailText}>{DELIVERY_LABEL[item.delivery_method] || item.delivery_method}</Text>
        </View>
      )}
    </View>
  );
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data } = await getMyOrders();
      setOrders(data?.results ?? data ?? []);
    } catch {
      // Best effort — leave the previous list visible rather than blocking with an alert.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  const renderEmpty = () => (
    <View style={[S.emptyContainer, { marginTop: 60 }]}>
      <Ionicons name="bag-outline" size={56} color={C.gray200} />
      <Text style={S.emptyText}>No orders yet</Text>
      <Text style={S.emptySubtext}>Orders you place from Notices will appear here</Text>
    </View>
  );

  return (
    <SafeAreaView style={S.screenBg}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>My Orders</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <OrderCard item={item} />}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchOrders(true);
              }}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.gray900,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listPad: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  dateText: {
    fontSize: 12,
    color: C.gray500,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.gray900,
    marginTop: 12,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: C.gray700,
  },
});
