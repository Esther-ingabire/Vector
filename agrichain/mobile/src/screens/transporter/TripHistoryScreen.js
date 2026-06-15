import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getMyTripHistory } from '../../api/transport';
import { C, S } from '../../theme';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getLossBadge(lossPercent) {
  if (lossPercent === null || lossPercent === undefined) return null;
  const pct = parseFloat(lossPercent);
  if (pct <= 2) return { color: C.success, bg: '#dcfce7', label: `${pct.toFixed(1)}% loss` };
  if (pct <= 8) return { color: C.warning, bg: '#fef3c7', label: `${pct.toFixed(1)}% loss` };
  return { color: C.danger, bg: '#fee2e2', label: `${pct.toFixed(1)}% loss` };
}

function TripCard({ item }) {
  const loss = getLossBadge(item.loss_percentage);

  return (
    <View style={S.card}>
      {/* Header row */}
      <View style={S.spaceBetween}>
        <Text style={styles.tripDate}>{formatDate(item.delivered_at || item.pickup_date)}</Text>
        {loss && (
          <View style={[S.badge, { backgroundColor: loss.bg }]}>
            <Text style={[S.badgeText, { color: loss.color }]}>{loss.label}</Text>
          </View>
        )}
        {!loss && (
          <View style={[S.badge, { backgroundColor: C.primaryLight }]}>
            <Text style={[S.badgeText, { color: C.primary }]}>DELIVERED</Text>
          </View>
        )}
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={styles.routeStop}>
          <View style={[styles.dot, { backgroundColor: C.primary }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup_location || '—'}</Text>
        </View>
        <View style={styles.routeArrow}>
          <View style={styles.routeLine} />
          <Ionicons name="arrow-forward" size={12} color={C.gray400} />
        </View>
        <View style={styles.routeStop}>
          <View style={[styles.dot, { backgroundColor: C.danger }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.destination || '—'}</Text>
        </View>
      </View>

      {/* Chips */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Ionicons name="cube-outline" size={12} color={C.gray500} />
          <Text style={styles.chipText}>{item.cargo_description || 'Produce'}</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="scale-outline" size={12} color={C.gray500} />
          <Text style={styles.chipText}>{item.estimated_cargo_weight_kg ? `${item.estimated_cargo_weight_kg} kg` : '—'}</Text>
        </View>
        {item.requires_refrigeration && (
          <View style={[styles.chip, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="snow-outline" size={12} color="#0284c7" />
            <Text style={[styles.chipText, { color: '#0284c7' }]}>Cold Chain</Text>
          </View>
        )}
      </View>

      {/* Cooperative */}
      {item.cooperative_name && (
        <Text style={styles.cooperativeText}>
          <Text style={{ color: C.gray700, fontWeight: '500' }}>{item.cooperative_name}</Text>
        </Text>
      )}
    </View>
  );
}

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data } = await getMyTripHistory({ page_size: 50 });
      setTrips(data?.results || []);
    } catch (err) {
      if (err?.response?.status !== 404) {
        Alert.alert('Error', 'Could not load trip history.');
      } else {
        setTrips([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  const renderEmpty = () => (
    <View style={[S.emptyContainer, { marginTop: 60 }]}>
      <Ionicons name="receipt-outline" size={56} color={C.gray200} />
      <Text style={S.emptyText}>No trips yet</Text>
      <Text style={S.emptySubtext}>Completed trips will appear here</Text>
    </View>
  );

  return (
    <SafeAreaView style={S.screenBg}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Trip History</Text>
        <View style={[S.badge, { backgroundColor: C.gray100 }]}>
          <Text style={[S.badgeText, { color: C.gray700 }]}>{trips.length} trips</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <TripCard item={item} />}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchHistory(true);
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.gray900,
  },
  listPad: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripDate: {
    fontSize: 14,
    fontWeight: '600',
    color: C.gray700,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  routeStop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  routeText: {
    fontSize: 13,
    color: C.gray700,
    fontWeight: '500',
    flex: 1,
  },
  routeArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  routeLine: {
    width: 16,
    height: 1,
    backgroundColor: C.gray200,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.gray100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    color: C.gray500,
  },
  cooperativeText: {
    fontSize: 12,
    color: C.gray500,
  },
});
