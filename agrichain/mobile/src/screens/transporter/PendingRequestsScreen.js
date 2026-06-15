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

import { getMyRequests, acceptRequest, declineRequest } from '../../api/transport';
import { C, S } from '../../theme';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SkeletonCard() {
  return (
    <View style={[S.card, styles.skeleton]}>
      <View style={styles.skRow}>
        <View style={[styles.skBox, { width: 80, height: 22, borderRadius: 11 }]} />
        <View style={[styles.skBox, { width: 60, height: 16 }]} />
      </View>
      <View style={[styles.skBox, { width: '90%', height: 16, marginTop: 12 }]} />
      <View style={[styles.skBox, { width: '60%', height: 14, marginTop: 6 }]} />
      <View style={styles.skRow}>
        <View style={[styles.skBox, { flex: 1, height: 40, borderRadius: 10, marginTop: 14 }]} />
        <View style={{ width: 10 }} />
        <View style={[styles.skBox, { flex: 1, height: 40, borderRadius: 10, marginTop: 14 }]} />
      </View>
    </View>
  );
}

function RequestCard({ item, onAccept, onDecline, accepting, declining }) {
  return (
    <View style={S.card}>
      <View style={S.spaceBetween}>
        <View style={[S.badge, { backgroundColor: C.primaryLight }]}>
          <Text style={[S.badgeText, { color: C.primaryDark }]}>
            {item.requester_type || 'TRANSPORT'}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.required_pickup_datetime)}</Text>
      </View>

      {/* Route */}
      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: C.primary }]} />
          <Text style={styles.routeLabel} numberOfLines={1}>{item.pickup_location || '—'}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: C.danger }]} />
          <Text style={styles.routeLabel} numberOfLines={1}>{item.destination || '—'}</Text>
        </View>
      </View>

      {/* Cargo info */}
      <View style={styles.infoRow}>
        <View style={styles.infoChip}>
          <Ionicons name="cube-outline" size={13} color={C.gray500} />
          <Text style={styles.infoChipText}>{item.cargo_description || 'Produce'}</Text>
        </View>
        <View style={styles.infoChip}>
          <Ionicons name="scale-outline" size={13} color={C.gray500} />
          <Text style={styles.infoChipText}>{item.estimated_cargo_weight_kg ? `${item.estimated_cargo_weight_kg} kg` : '—'}</Text>
        </View>
        {item.requires_refrigeration && (
          <View style={[styles.infoChip, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="snow-outline" size={13} color="#0284c7" />
            <Text style={[styles.infoChipText, { color: '#0284c7' }]}>Cold Chain</Text>
          </View>
        )}
      </View>

      {/* Requester */}
      {item.requester_name && (
        <Text style={styles.requesterText}>
          Requested by: <Text style={{ fontWeight: '600', color: C.gray700 }}>{item.requester_name}</Text>
        </Text>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
          onPress={() => onAccept(item.id)}
          disabled={accepting || declining}
          activeOpacity={0.85}
        >
          {accepting ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={16} color={C.white} />
              <Text style={styles.acceptText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.declineBtn, declining && { opacity: 0.6 }]}
          onPress={() => onDecline(item.id)}
          disabled={accepting || declining}
          activeOpacity={0.85}
        >
          {declining ? (
            <ActivityIndicator size="small" color={C.danger} />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={16} color={C.danger} />
              <Text style={styles.declineText}>Decline</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PendingRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionState, setActionState] = useState({});

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data } = await getMyRequests({ status: 'PENDING', page_size: 50 });
      setRequests(data?.results || []);
    } catch (err) {
      if (err?.response?.status !== 404) {
        Alert.alert('Error', 'Could not load pending requests.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests]),
  );

  const handleAccept = async (id) => {
    setActionState((s) => ({ ...s, [`accept_${id}`]: true }));
    try {
      await acceptRequest(id);
      Alert.alert('Accepted', 'Transport request accepted successfully.');
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not accept request.');
    } finally {
      setActionState((s) => ({ ...s, [`accept_${id}`]: false }));
    }
  };

  const handleDecline = (id) => {
    Alert.prompt
      ? Alert.prompt(
          'Decline Request',
          'Please provide a reason (optional):',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Decline',
              style: 'destructive',
              onPress: async (reason = '') => {
                await doDecline(id, reason);
              },
            },
          ],
        )
      : Alert.alert('Decline Request', 'Are you sure you want to decline?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: () => doDecline(id, ''),
          },
        ]);
  };

  const doDecline = async (id, reason) => {
    setActionState((s) => ({ ...s, [`decline_${id}`]: true }));
    try {
      await declineRequest(id, { reason: reason || 'Declined by driver' });
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not decline request.');
    } finally {
      setActionState((s) => ({ ...s, [`decline_${id}`]: false }));
    }
  };

  const renderEmpty = () => (
    <View style={[S.emptyContainer, { marginTop: 60 }]}>
      <Ionicons name="time-outline" size={56} color={C.gray200} />
      <Text style={S.emptyText}>No pending requests</Text>
      <Text style={S.emptySubtext}>New transport requests will appear here</Text>
    </View>
  );

  const renderSkeleton = () => (
    <>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </>
  );

  return (
    <SafeAreaView style={S.screenBg}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Pending Requests</Text>
        <View style={[S.badge, { backgroundColor: C.primaryLight, marginLeft: 8 }]}>
          <Text style={[S.badgeText, { color: C.primary }]}>{requests.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.listPad}>{renderSkeleton()}</View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              onAccept={handleAccept}
              onDecline={handleDecline}
              accepting={!!actionState[`accept_${item.id}`]}
              declining={!!actionState[`decline_${item.id}`]}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchRequests(true);
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
  dateText: {
    fontSize: 12,
    color: C.gray500,
  },
  routeContainer: {
    marginTop: 14,
    marginBottom: 12,
    paddingLeft: 4,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLabel: {
    fontSize: 14,
    color: C.gray700,
    fontWeight: '500',
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: C.gray200,
    marginLeft: 4,
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.gray100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoChipText: {
    fontSize: 12,
    color: C.gray500,
  },
  requesterText: {
    fontSize: 12,
    color: C.gray500,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 11,
  },
  acceptText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: C.danger,
    borderRadius: 10,
    paddingVertical: 11,
  },
  declineText: {
    color: C.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  // Skeleton
  skeleton: {
    opacity: 0.6,
  },
  skRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skBox: {
    backgroundColor: C.gray200,
    borderRadius: 6,
  },
});
