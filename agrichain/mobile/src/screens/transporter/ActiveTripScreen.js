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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getMyActiveTrip, confirmDelivery, confirmPickup } from '../../api/transport';
import { C, S } from '../../theme';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

function TempGauge({ temp }) {
  const isLow = temp !== null && temp < 2;
  const isHigh = temp !== null && temp > 8;
  const color = isHigh ? C.danger : isLow ? '#0284c7' : C.success;
  const label = isHigh ? 'TOO WARM' : isLow ? 'TOO COLD' : 'OPTIMAL';

  return (
    <View style={styles.tempGauge}>
      <View style={styles.tempHeader}>
        <Ionicons name="thermometer-outline" size={18} color={color} />
        <Text style={[styles.tempLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.tempValue, { color }]}>
        {temp !== null ? `${temp}°C` : '—'}
      </Text>
      <Text style={styles.tempRange}>Target range: 2–8°C</Text>
      <View style={styles.tempBar}>
        <View style={[styles.tempFill, { backgroundColor: color, width: `${Math.min(100, Math.max(0, ((temp ?? 5) / 15) * 100))}%` }]} />
      </View>
    </View>
  );
}

export default function ActiveTripScreen() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const fetchTrip = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data } = await getMyActiveTrip();
      // Backend returns trip with nested `request` object
      setTrip(data?.id ? data : null);
    } catch (err) {
      if (err?.response?.status === 404) {
        setTrip(null);
      } else {
        Alert.alert('Error', 'Could not load active trip.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrip();
    }, [fetchTrip]),
  );

  const handleMarkDelivered = () => {
    Alert.alert(
      'Confirm Delivery',
      'Are you sure you want to mark this trip as delivered? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Delivered',
          onPress: async () => {
            setDelivering(true);
            try {
              await confirmDelivery(trip.id, {});
              Alert.alert('Success', 'Trip marked as delivered!');
              setTrip(null);
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.detail || 'Could not mark as delivered.');
            } finally {
              setDelivering(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={S.screenBg}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Active Trip</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.screenBg}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Active Trip</Text>
        {trip && (
          <View style={[S.badge, { backgroundColor: '#fef9c3' }]}>
            <Text style={[S.badgeText, { color: C.warning }]}>IN PROGRESS</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchTrip(true);
            }}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!trip ? (
          <View style={[S.card, S.emptyContainer, { marginTop: 40 }]}>
            <Ionicons name="navigate-circle-outline" size={64} color={C.gray200} />
            <Text style={S.emptyText}>No active trip</Text>
            <Text style={S.emptySubtext}>Accept a pending request to begin a trip</Text>
          </View>
        ) : (
          <>
            {/* Route card */}
            <View style={S.card}>
              <Text style={styles.cardTitle}>Route Information</Text>

              <View style={styles.routeVisual}>
                <View style={styles.routeStop}>
                  <View style={[styles.routeStopDot, { backgroundColor: C.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeStopLabel}>PICKUP</Text>
                    <Text style={styles.routeStopValue}>{trip.request?.pickup_location || '—'}</Text>
                  </View>
                </View>
                <View style={styles.routeConnector}>
                  <View style={styles.routeConnectorLine} />
                  <Ionicons name="arrow-down" size={14} color={C.gray400} />
                </View>
                <View style={styles.routeStop}>
                  <View style={[styles.routeStopDot, { backgroundColor: C.danger }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeStopLabel}>DESTINATION</Text>
                    <Text style={styles.routeStopValue}>{trip.request?.destination || '—'}</Text>
                  </View>
                </View>
              </View>

              <InfoRow icon="calendar-outline" label="Required Pickup" value={formatDate(trip.request?.required_pickup_datetime)} />
              <InfoRow icon="person-outline" label="Requested By" value={trip.request?.requester_name} />
            </View>

            {/* Cargo card */}
            <View style={S.card}>
              <Text style={styles.cardTitle}>Cargo Details</Text>
              <InfoRow icon="cube-outline" label="Cargo" value={trip.request?.cargo_description} />
              <InfoRow icon="scale-outline" label="Weight" value={trip.request?.estimated_cargo_weight_kg ? `${trip.request.estimated_cargo_weight_kg} kg` : null} />
              <InfoRow icon="business-outline" label="From" value={trip.request?.requester_name} />
            </View>

            {/* Cold chain card */}
            {trip.request?.requires_refrigeration && (
              <View style={S.card}>
                <Text style={styles.cardTitle}>Cold Chain Monitoring</Text>
                <TempGauge temp={trip.current_temperature ?? null} />
                {trip.target_temp_min != null && trip.target_temp_max != null && (
                  <InfoRow
                    icon="thermometer-outline"
                    label="Target Range"
                    value={`${trip.target_temp_min}°C – ${trip.target_temp_max}°C`}
                  />
                )}
              </View>
            )}

            {/* Progress card */}
            <View style={S.card}>
              <Text style={styles.cardTitle}>Trip Progress</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${trip.progress_percent ?? 50}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {trip.progress_percent ?? 50}% of journey completed
              </Text>
            </View>

            {/* Notes */}
            {trip.notes ? (
              <View style={S.card}>
                <Text style={styles.cardTitle}>Notes</Text>
                <Text style={styles.notesText}>{trip.notes}</Text>
              </View>
            ) : null}

            {/* Mark as Delivered */}
            <TouchableOpacity
              style={[S.button, { marginTop: 8 }, delivering && { opacity: 0.6 }]}
              onPress={handleMarkDelivered}
              disabled={delivering}
              activeOpacity={0.85}
            >
              {delivering ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                  <Text style={[S.buttonText, { marginLeft: 8 }]}>Mark as Delivered</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 16 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: C.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: C.gray900,
    fontWeight: '500',
  },
  routeVisual: {
    marginBottom: 16,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeStopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeStopLabel: {
    fontSize: 10,
    color: C.gray400,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  routeStopValue: {
    fontSize: 14,
    color: C.gray900,
    fontWeight: '500',
    marginTop: 1,
  },
  routeConnector: {
    alignItems: 'center',
    paddingLeft: 5,
    paddingVertical: 4,
  },
  routeConnectorLine: {
    width: 2,
    height: 14,
    backgroundColor: C.gray200,
    marginBottom: 2,
  },
  tempGauge: {
    marginBottom: 8,
  },
  tempHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tempLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tempValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  tempRange: {
    fontSize: 12,
    color: C.gray500,
    marginBottom: 8,
  },
  tempBar: {
    height: 8,
    backgroundColor: C.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tempFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBar: {
    height: 10,
    backgroundColor: C.gray200,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 13,
    color: C.gray500,
    textAlign: 'center',
  },
  notesText: {
    fontSize: 14,
    color: C.gray700,
    lineHeight: 20,
  },
});
