import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getNotices } from '../../api/marketAgent';
import { C, S } from '../../theme';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function NoticeCard({ item }) {
  const expired = isExpired(item.expiry_date || item.valid_until);

  return (
    <View style={[S.card, expired && styles.expiredCard]}>
      {/* Header */}
      <View style={S.spaceBetween}>
        <View style={[S.badge, { backgroundColor: expired ? C.gray100 : C.primaryLight }]}>
          <Text style={[S.badgeText, { color: expired ? C.gray500 : C.primary }]}>
            {expired ? 'EXPIRED' : 'ACTIVE'}
          </Text>
        </View>
        <Text style={styles.expiryDate}>
          {expired ? 'Expired' : 'Expires'}: {formatDate(item.expiry_date || item.valid_until)}
        </Text>
      </View>

      {/* Produce */}
      <Text style={styles.produceName}>{item.produce_type || item.crop || item.title || '—'}</Text>

      {/* Details grid */}
      <View style={styles.detailsGrid}>
        {item.distributor_name && (
          <View style={styles.detailItem}>
            <Ionicons name="business-outline" size={14} color={C.gray500} />
            <Text style={styles.detailLabel}>Distributor</Text>
            <Text style={styles.detailValue}>{item.distributor_name}</Text>
          </View>
        )}
        {(item.quantity_kg || item.quantity) && (
          <View style={styles.detailItem}>
            <Ionicons name="scale-outline" size={14} color={C.gray500} />
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{item.quantity_kg || item.quantity} kg</Text>
          </View>
        )}
        {(item.price_per_kg || item.price) && (
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color={C.gray500} />
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>
              RWF {Number(item.price_per_kg || item.price).toLocaleString()}/kg
            </Text>
          </View>
        )}
        {(item.location || item.pickup_location) && (
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={14} color={C.gray500} />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{item.location || item.pickup_location}</Text>
          </View>
        )}
      </View>

      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
      )}
    </View>
  );
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expired', label: 'Expired' },
];

export default function NoticesScreen() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchNotices = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params = { page_size: 50 };
      if (filter === 'active') params.status = 'active';
      if (filter === 'expired') params.status = 'expired';
      const { data } = await getNotices(params);
      setNotices(data?.results || []);
    } catch (err) {
      if (err?.response?.status !== 404) {
        Alert.alert('Error', 'Could not load notices.');
      } else {
        setNotices([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchNotices();
    }, [fetchNotices]),
  );

  const filteredNotices = notices.filter((n) => {
    if (filter === 'all') return true;
    const expired = isExpired(n.expiry_date || n.valid_until);
    return filter === 'expired' ? expired : !expired;
  });

  const renderEmpty = () => (
    <View style={[S.emptyContainer, { marginTop: 60 }]}>
      <Ionicons name="megaphone-outline" size={56} color={C.gray200} />
      <Text style={S.emptyText}>No notices found</Text>
      <Text style={S.emptySubtext}>Distributor notices will appear here</Text>
    </View>
  );

  return (
    <SafeAreaView style={S.screenBg}>
      {/* Screen header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Notices</Text>
      </View>

      {/* Filter tabs */}
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
          renderItem={({ item }) => <NoticeCard item={item} />}
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
  notes: {
    fontSize: 12,
    color: C.gray500,
    lineHeight: 17,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.gray100,
    paddingTop: 8,
  },
});
