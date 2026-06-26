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
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { getMyAnalytics, getCollections } from '../../api/marketAgent';
import { C, S } from '../../theme';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function KPICard({ icon, label, value, color, bg }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: bg || C.white }]}>
      <View style={[styles.kpiIconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function CollectionItem({ item }) {
  const lossPercent = item.loss_percentage != null ? parseFloat(item.loss_percentage) : null;
  const lossColor =
    lossPercent === null
      ? C.gray400
      : lossPercent <= 2
      ? C.success
      : lossPercent <= 8
      ? C.warning
      : C.danger;

  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityDot, { backgroundColor: C.primaryLight }]}>
        <Ionicons name="basket-outline" size={14} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle}>
          {item.produce_type || item.notice_name || 'Collection'}
        </Text>
        <Text style={styles.activitySub}>{formatDate(item.collection_date)}</Text>
      </View>
      {lossPercent !== null && (
        <View style={[S.badge, { backgroundColor: lossColor + '1A' }]}>
          <Text style={[S.badgeText, { color: lossColor }]}>{lossPercent.toFixed(1)}% loss</Text>
        </View>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const [analytics, setAnalytics] = useState(null);
  const [recentCollections, setRecentCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.first_name || user?.username || 'Agent';
  const marketName = user?.market_name || user?.stall_name || 'Your Market';

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [analyticsRes, collectionsRes] = await Promise.allSettled([
        getMyAnalytics(),
        getCollections({ page_size: 3, ordering: '-collection_date' }),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data);
      }
      if (collectionsRes.status === 'fulfilled') {
        setRecentCollections(collectionsRes.value.data?.results || []);
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

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      if (window.confirm('Are you sure you want to sign out?')) logout();
      return;
    }
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

  const activeNotices = analytics?.active_notices ?? '—';
  const collectionLoss = analytics?.collection_loss_percent != null
    ? `${parseFloat(analytics.collection_loss_percent).toFixed(1)}%`
    : '—';
  const wasteRate = analytics?.waste_rate_percent != null
    ? `${parseFloat(analytics.waste_rate_percent).toFixed(1)}%`
    : '—';
  const collectionsThisMonth = analytics?.collections_this_month ?? '—';

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
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {getGreeting()}, {firstName}
            </Text>
            <Text style={styles.marketName}>{marketName}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={C.white} />
          </TouchableOpacity>
        </View>

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KPICard
            icon="megaphone-outline"
            label="Active Notices"
            value={activeNotices}
            color={C.primary}
          />
          <KPICard
            icon="trending-down-outline"
            label="Collection Loss"
            value={collectionLoss}
            color={
              analytics?.collection_loss_percent > 8
                ? C.danger
                : analytics?.collection_loss_percent > 2
                ? C.warning
                : C.success
            }
          />
          <KPICard
            icon="trash-outline"
            label="Waste Rate"
            value={wasteRate}
            color={
              analytics?.waste_rate_percent > 10
                ? C.danger
                : analytics?.waste_rate_percent > 5
                ? C.warning
                : C.success
            }
          />
          <KPICard
            icon="basket-outline"
            label="Collections"
            value={collectionsThisMonth}
            color={C.primary}
          />
        </View>

        {/* Quick actions */}
        <Text style={S.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="add-circle-outline"
            label="Record Collection"
            color={C.primary}
            onPress={() => navigation.navigate('Collections')}
          />
          <QuickAction
            icon="warning-outline"
            label="Submit Waste Report"
            color={C.warning}
            onPress={() => navigation.navigate('Reports')}
          />
          <QuickAction
            icon="megaphone-outline"
            label="View Notices"
            color="#0284c7"
            onPress={() => navigation.navigate('Notices')}
          />
        </View>

        {/* Recent Activity */}
        <Text style={S.sectionTitle}>Recent Collections</Text>
        {recentCollections.length === 0 ? (
          <View style={[S.card, S.emptyContainer, { paddingVertical: 32 }]}>
            <Ionicons name="basket-outline" size={40} color={C.gray200} />
            <Text style={S.emptyText}>No collections yet</Text>
            <Text style={S.emptySubtext}>Record your first collection to see activity</Text>
          </View>
        ) : (
          <View style={S.card}>
            {recentCollections.map((col, idx) => (
              <React.Fragment key={col.id}>
                <CollectionItem item={col} />
                {idx < recentCollections.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
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
  marketName: {
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: C.gray900,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
    color: C.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    color: C.gray700,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  activityDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gray900,
  },
  activitySub: {
    fontSize: 12,
    color: C.gray500,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: C.gray100,
    marginVertical: 8,
  },
});
