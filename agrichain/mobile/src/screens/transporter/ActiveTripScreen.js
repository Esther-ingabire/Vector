import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import * as Location from 'expo-location';

import { getMyActiveTrip, confirmDelivery, confirmPickup, reportIncident, getVehicleIotReadings, postGPSUpdate } from '../../api/transport';
import { C, S } from '../../theme';

// Matches the ~2-minute posting interval documented on the backend (GPSTrack model docstring,
// the delay-alert heuristic's threshold). Only runs while a trip is actually in transit —
// pickup confirmed, delivery not yet confirmed — and only while this screen is focused, so it
// doesn't quietly drain the battery once the driver has moved on to something else.
const GPS_POST_INTERVAL_MS = 2 * 60 * 1000;

const INCIDENT_TYPES = [
  { value: 'FLAT_TIRE', label: 'Flat Tire' },
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'BREAKDOWN', label: 'Breakdown' },
  { value: 'ROAD_CLOSURE', label: 'Road Closure' },
  { value: 'OTHER', label: 'Other' },
];

// Matches Trip.ConditionOnArrival on the backend — confirm-delivery rejects anything else
// with a 400, so these values must stay in sync with that model.
const CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Good', desc: 'No visible damage' },
  { value: 'MINOR_DAMAGE', label: 'Minor damage', desc: 'Some bruising or spillage' },
  { value: 'MAJOR_DAMAGE', label: 'Major damage', desc: 'Significant spoilage or loss' },
  { value: 'PARTIAL_QUANTITY', label: 'Partial delivery', desc: 'Full cargo not delivered' },
];

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
  const [pickingUp, setPickingUp] = useState(false);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [incidentType, setIncidentType] = useState('FLAT_TIRE');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [latestTemp, setLatestTemp] = useState(null);

  // Proof-of-delivery form state — recipient name + condition are required by the backend,
  // so "Mark as Delivered" opens this modal instead of firing an empty confirm straight away.
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [conditionOnArrival, setConditionOnArrival] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryGps, setDeliveryGps] = useState(null); // { lat, lng } | null
  const [locatingDelivery, setLocatingDelivery] = useState(false);

  const fetchTrip = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data } = await getMyActiveTrip();
      // Backend returns a list of active trips (each with a nested `request` object) — a
      // transporter can have several active stops on one multi-stop run. This screen shows
      // the first one; the dedicated multi-stop view on web covers the full stop list.
      const first = Array.isArray(data) ? data[0] : data;
      setTrip(first?.id ? first : null);
      if (first?.id) {
        getVehicleIotReadings(first.id)
          .then(({ data: readings }) => setLatestTemp(readings?.length ? readings[readings.length - 1].temperature_celsius : null))
          .catch(() => setLatestTemp(null));
      }
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

  // Live GPS reporting — only while a trip is actually in transit, and only while this
  // screen has focus. Cleans itself up automatically when either condition stops being true.
  const tripIdRef = useRef(null);
  tripIdRef.current = trip?.id ?? null;

  useFocusEffect(
    useCallback(() => {
      if (!trip?.pickup_confirmed_at || trip?.delivery_confirmed_at) return;

      let cancelled = false;
      let intervalId = null;

      const postOnce = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted' || cancelled) return;
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (cancelled || !tripIdRef.current) return;
          await postGPSUpdate({
            trip: tripIdRef.current,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed_kmh: position.coords.speed != null ? Math.max(0, position.coords.speed * 3.6) : null,
          });
        } catch {
          // Best effort — a missed GPS tick isn't worth interrupting the driver over.
        }
      };

      postOnce();
      intervalId = setInterval(postOnce, GPS_POST_INTERVAL_MS);

      return () => {
        cancelled = true;
        if (intervalId) clearInterval(intervalId);
      };
    }, [trip?.id, trip?.pickup_confirmed_at, trip?.delivery_confirmed_at]),
  );

  const handleConfirmPickup = () => {
    Alert.alert(
      'Confirm Pickup',
      'Confirm that you have collected the cargo and are now in transit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Pickup',
          onPress: async () => {
            setPickingUp(true);
            try {
              await confirmPickup(trip.id);
              fetchTrip();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.detail || 'Could not confirm pickup.');
            } finally {
              setPickingUp(false);
            }
          },
        },
      ],
    );
  };

  const openDeliveryModal = () => {
    setRecipientName('');
    setConditionOnArrival('');
    setDeliveryNotes('');
    setDeliveryGps(null);
    setDeliveryModalVisible(true);
  };

  const captureDeliveryLocation = async () => {
    setLocatingDelivery(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location unavailable', 'Permission denied — confirming without GPS.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeliveryGps({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch {
      Alert.alert('Location unavailable', 'Could not capture location — confirming without GPS.');
    } finally {
      setLocatingDelivery(false);
    }
  };

  const handleSubmitDelivery = async () => {
    if (!recipientName.trim()) {
      Alert.alert('Recipient required', 'Enter who received the delivery.');
      return;
    }
    if (!conditionOnArrival) {
      Alert.alert('Condition required', 'Select the condition of the cargo on arrival.');
      return;
    }
    setDelivering(true);
    try {
      await confirmDelivery(trip.id, {
        recipient_name: recipientName.trim(),
        condition_on_arrival: conditionOnArrival,
        notes: deliveryNotes,
        ...(deliveryGps ? { delivery_gps_lat: deliveryGps.lat, delivery_gps_lng: deliveryGps.lng } : {}),
      });
      setDeliveryModalVisible(false);
      Alert.alert('Success', 'Trip marked as delivered!');
      setTrip(null);
    } catch (err) {
      const data = err?.response?.data;
      const message = data ? Object.values(data).flat().join(' ') : 'Could not mark as delivered.';
      Alert.alert('Error', message);
    } finally {
      setDelivering(false);
    }
  };

  const handleSubmitIncident = async () => {
    setSubmittingIncident(true);
    try {
      await reportIncident({
        trip: trip.id,
        incident_type: incidentType,
        description: incidentDescription,
      });
      setIncidentModalVisible(false);
      setIncidentDescription('');
      Alert.alert('Reported', 'The distributor/cooperative has been notified.');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not submit incident report.');
    } finally {
      setSubmittingIncident(false);
    }
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
          <View style={[S.badge, {
            backgroundColor: trip.request?.status === 'ACCEPTED' ? C.primaryLight : '#fef9c3',
          }]}>
            <Text style={[S.badgeText, {
              color: trip.request?.status === 'ACCEPTED' ? C.primary : C.warning,
            }]}>
              {trip.request?.status === 'ACCEPTED' ? 'ACCEPTED' : 'IN PROGRESS'}
            </Text>
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
                <TempGauge temp={latestTemp} />
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

            {/* Report incident — visible once in transit */}
            {trip.request?.status === 'IN_PROGRESS' && (
              <TouchableOpacity
                style={[S.card, styles.incidentTrigger]}
                onPress={() => setIncidentModalVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="warning-outline" size={20} color={C.danger} />
                <Text style={styles.incidentTriggerText}>Report an Incident</Text>
                <Ionicons name="chevron-forward" size={18} color={C.gray400} />
              </TouchableOpacity>
            )}

            {/* Notes */}
            {trip.notes ? (
              <View style={S.card}>
                <Text style={styles.cardTitle}>Notes</Text>
                <Text style={styles.notesText}>{trip.notes}</Text>
              </View>
            ) : null}

            {/* Confirm Pickup — shown only before pickup is confirmed */}
            {trip.request?.status === 'ACCEPTED' && (
              <TouchableOpacity
                style={[S.button, { marginTop: 8, backgroundColor: C.primary }, pickingUp && { opacity: 0.6 }]}
                onPress={handleConfirmPickup}
                disabled={pickingUp}
                activeOpacity={0.85}
              >
                {pickingUp ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <>
                    <Ionicons name="bag-check-outline" size={20} color={C.white} />
                    <Text style={[S.buttonText, { marginLeft: 8 }]}>Confirm Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Mark as Delivered — shown only after pickup confirmed */}
            {trip.request?.status === 'IN_PROGRESS' && (
              <TouchableOpacity
                style={[S.button, { marginTop: 8 }, delivering && { opacity: 0.6 }]}
                onPress={openDeliveryModal}
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
            )}

            <View style={{ height: 16 }} />
          </>
        )}
      </ScrollView>

      <Modal
        visible={incidentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIncidentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Report an Incident</Text>

            <View style={styles.typeChipRow}>
              {INCIDENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeChip, incidentType === t.value && styles.typeChipActive]}
                  onPress={() => setIncidentType(t.value)}
                >
                  <Text style={[styles.typeChipText, incidentType === t.value && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.descriptionInput}
              placeholder="Briefly describe what happened (optional)"
              placeholderTextColor={C.gray400}
              value={incidentDescription}
              onChangeText={setIncidentDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[S.button, styles.modalCancelButton]}
                onPress={() => setIncidentModalVisible(false)}
                disabled={submittingIncident}
              >
                <Text style={[S.buttonText, { color: C.gray700 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.button, { backgroundColor: C.danger, flex: 1 }]}
                onPress={handleSubmitIncident}
                disabled={submittingIncident}
              >
                {submittingIncident ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={S.buttonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deliveryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDeliveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={styles.cardTitle}>Confirm Delivery</Text>

            <Text style={styles.fieldLabel}>Received by *</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Name of person who accepted the delivery"
              placeholderTextColor={C.gray400}
              value={recipientName}
              onChangeText={setRecipientName}
            />

            <Text style={styles.fieldLabel}>Condition on arrival *</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {CONDITION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.conditionOption, conditionOnArrival === opt.value && styles.conditionOptionActive]}
                  onPress={() => setConditionOnArrival(opt.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, conditionOnArrival === opt.value && styles.radioCircleActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.conditionLabel}>{opt.label}</Text>
                    <Text style={styles.conditionDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.gpsButton}
              onPress={captureDeliveryLocation}
              disabled={locatingDelivery}
              activeOpacity={0.8}
            >
              {locatingDelivery ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <Ionicons name="location-outline" size={16} color={deliveryGps ? C.success : C.primary} />
              )}
              <Text style={[styles.gpsButtonText, deliveryGps && { color: C.success }]}>
                {deliveryGps ? 'Delivery location captured' : 'Attach delivery location (optional)'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Anything else worth recording about this delivery…"
              placeholderTextColor={C.gray400}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.helperText}>This creates a permanent delivery record and cannot be undone.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[S.button, styles.modalCancelButton]}
                onPress={() => setDeliveryModalVisible(false)}
                disabled={delivering}
              >
                <Text style={[S.buttonText, { color: C.gray700 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.button, { flex: 1 }]}
                onPress={handleSubmitDelivery}
                disabled={delivering}
              >
                {delivering ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={S.buttonText}>Confirm Delivery</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  incidentTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  incidentTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.danger,
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
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.gray100,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  typeChipActive: {
    backgroundColor: C.danger,
    borderColor: C.danger,
  },
  typeChipText: {
    fontSize: 13,
    color: C.gray700,
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: C.white,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: C.gray900,
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    backgroundColor: C.gray100,
    paddingHorizontal: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gray700,
    marginBottom: 8,
  },
  conditionOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  conditionOptionActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.gray200,
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: C.primary,
    backgroundColor: C.primary,
  },
  conditionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.gray900,
  },
  conditionDesc: {
    fontSize: 12,
    color: C.gray500,
    marginTop: 1,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.gray200,
    backgroundColor: C.gray50,
    marginBottom: 16,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
  helperText: {
    fontSize: 11,
    color: C.gray400,
    marginBottom: 16,
  },
});
