import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { getMyRequests, getMyActiveTrip, getMyTripHistory, acceptRequest, declineRequest } from '../../api/transport';
import { C, S } from '../../theme';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-RW', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function KPICard({ icon, label, value, color }) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function RequestCard({ item, onAccept, onDecline, accepting, declining }) {
  return (
    <View style={S.card}>
      <View style={S.spaceBetween}>
        <View style={[S.badge, { backgroundColor: C.primaryLight }]}>
          <Text style={[S.badgeText, { color: C.primaryDark }]}>
            {item.requester_type || 'Transport'}
          </Text>
        </View>
        <Text style={styles.requestDate}>
          {item.required_pickup_datetime ? formatDate(item.required_pickup_datetime) : '—'}
        </Text>
      </View>

      <View style={styles.routeRow}>
        <Ionicons name="location-outline" size={16} color={C.primary} />
        <Text style={styles.routeText} numberOfLines={1}>
          {item.pickup_location || '—'}
        </Text>
        <Ionicons name="arrow-forward" size={14} color={C.gray400} style={{ marginHorizontal: 4 }} />
        <Ionicons name="flag-outline" size={16} color={C.danger} />
        <Text style={styles.routeText} numberOfLines={1}>
          {item.destination || '—'}
        </Text>
      </View>

      <View style={styles.cargoRow}>
        <Ionicons name="cube-outline" size={14} color={C.gray500} />
        <Text style={styles.cargoText}>
          {item.cargo_description || 'Produce'} · {item.estimated_cargo_weight_kg ? `${item.estimated_cargo_weight_kg} kg` : '—'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[S.button, styles.acceptBtn, accepting && { opacity: 0.6 }]}
          onPress={() => onAccept(item.id)}
          disabled={accepting || declining}
        >
          {accepting ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color={C.white} />
              <Text style={[S.buttonText, { fontSize: 14 }]}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.buttonDanger, styles.declineBtn, declining && { opacity: 0.6 }]}
          onPress={() => onDecline(item.id)}
          disabled={accepting || declining}
        >
          {declining ? (
            <ActivityIndicator size="small" color={C.danger} />
          ) : (
            <>
              <Ionicons name="close" size={16} color={C.danger} />
              <Text style={[S.buttonDangerText, { fontSize: 14 }]}>Decline</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionState, setActionState] = useState({});

  const firstName = user?.first_name || user?.username || 'Driver';

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [tripRes, pendingRes, historyRes] = await Promise.allSettled([
        getMyActiveTrip(),
        getMyRequests({ status: 'PENDING', page_size: 2 }),
        getMyTripHistory({ page_size: 1 }),
      ]);

      if (tripRes.status === 'fulfilled') {
        const d = tripRes.value.data;
        const first = Array.isArray(d) ? d[0] : d;
        setActiveTrip(first?.id ? first : null);
      } else {
        setActiveTrip(null);
      }

      if (pendingRes.status === 'fulfilled') {
        const data = pendingRes.value.data;
        setPendingRequests(data?.results || []);
        setStats((s) => ({ ...s, pending: data?.count ?? (data?.results?.length ?? 0) }));
      }

      if (historyRes.status === 'fulfilled') {
        const data = historyRes.value.data;
        setStats((s) => ({ ...s, total: data?.count ?? (data?.results?.length ?? 0) }));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleAccept = async (id) => {
    setActionState((s) => ({ ...s, [`accept_${id}`]: true }));
    try {
      await acceptRequest(id);
      Alert.alert('Accepted', 'You have accepted this transport request.');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not accept request.');
    } finally {
      setActionState((s) => ({ ...s, [`accept_${id}`]: false }));
    }
  };

  const handleDecline = (id) => {
    Alert.alert('Decline Request', 'Are you sure you want to decline this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActionState((s) => ({ ...s, [`decline_${id}`]: true }));
          try {
            await declineRequest(id, { reason: 'Declined by driver' });
            fetchData();
          } catch (err) {
            Alert.alert('Error', err?.response?.data?.detail || 'Could not decline request.');
          } finally {
            setActionState((s) => ({ ...s, [`decline_${id}`]: false }));
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={S.screenBg}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.screenBg}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {firstName} 👋
            </Text>
            <Text style={styles.dateText}>{formatDate(new Date())}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={C.white} />
          </TouchableOpacity>
        </View>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <KPICard icon="checkmark-done-outline" label="Total Trips" value={stats.total || '—'} color={C.primary} />
          <KPICard icon="time-outline" label="Pending" value={stats.pending || 0} color={C.warning} />
          <KPICard
            icon="navigate-outline"
            label="Active"
            value={activeTrip ? 'In Progress' : 'None'}
            color={activeTrip ? C.success : C.gray400}
          />
        </View>

        {/* Active Trip */}
        <Text style={S.sectionTitle}>Active Trip</Text>
        {activeTrip ? (
          <View style={[S.card, styles.activeTripCard]}>
            <View style={styles.activeTripHeader}>
              <View style={[S.badge, { backgroundColor: '#fef9c3' }]}>
                <Text style={[S.badgeText, { color: C.warning }]}>IN PROGRESS</Text>
              </View>
              <Text style={styles.tripEta}>
                ETA: {activeTrip.estimated_delivery_date
                  ? formatDate(activeTrip.estimated_delivery_date)
                  : '—'}
              </Text>
            </View>

            <View style={styles.routeRow}>
              <Ionicons name="location" size={16} color={C.primary} />
              <Text style={styles.routeText}>{activeTrip.request?.pickup_location || '—'}</Text>
              <Ionicons name="arrow-forward" size={14} color={C.gray400} style={{ marginHorizontal: 4 }} />
              <Ionicons name="flag" size={16} color={C.danger} />
              <Text style={styles.routeText}>{activeTrip.request?.destination || '—'}</Text>
            </View>

            <View style={styles.cargoRow}>
              <Ionicons name="cube-outline" size={14} color={C.gray500} />
              <Text style={styles.cargoText}>
                {activeTrip.request?.cargo_description || 'Produce'} · {activeTrip.request?.estimated_cargo_weight_kg ? `${activeTrip.request.estimated_cargo_weight_kg} kg` : '—'}
              </Text>
              {activeTrip.request?.requires_refrigeration && (
                <>
                  <Ionicons name="snow-outline" size={14} color={C.primary} style={{ marginLeft: 12 }} />
                  <Text style={[styles.cargoText, { color: C.primary }]}>Cold Chain</Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[S.button, { marginTop: 12 }]}
              onPress={() => navigation.navigate('Active Trip')}
            >
              <Text style={S.buttonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[S.card, S.emptyContainer]}>
            <Ionicons name="navigate-circle-outline" size={40} color={C.gray200} />
            <Text style={S.emptyText}>No active trip</Text>
            <Text style={S.emptySubtext}>Accept a request to start a trip</Text>
          </View>
        )}

        {/* Pending Requests Preview */}
        <View style={S.spaceBetween}>
          <Text style={S.sectionTitle}>Pending Requests</Text>
          {stats.pending > 2 && (
            <TouchableOpacity onPress={() => navigation.navigate('Pending')}>
              <Text style={styles.viewAll}>View all ({stats.pending})</Text>
            </TouchableOpacity>
          )}
        </View>

        {pendingRequests.length === 0 ? (
          <View style={[S.card, S.emptyContainer]}>
            <Ionicons name="time-outline" size={40} color={C.gray200} />
            <Text style={S.emptyText}>No pending requests</Text>
            <Text style={S.emptySubtext}>New transport requests will appear here</Text>
          </View>
        ) : (
          pendingRequests.map((req) => (
            <RequestCard
              key={req.id}
              item={req}
              onAccept={handleAccept}
              onDecline={handleDecline}
              accepting={!!actionState[`accept_${req.id}`]}
              declining={!!actionState[`decline_${req.id}`]}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: C.white,
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '700',
    color: C.gray900,
  },
  kpiLabel: {
    fontSize: 10,
    color: C.gray500,
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  activeTripCard: {
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
  },
  activeTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripEta: {
    fontSize: 12,
    color: C.gray500,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  routeText: {
    fontSize: 13,
    color: C.gray700,
    marginHorizontal: 4,
    flexShrink: 1,
  },
  cargoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cargoText: {
    fontSize: 13,
    color: C.gray500,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
  },
  requestDate: {
    fontSize: 12,
    color: C.gray500,
  },
  viewAll: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
  },
});
