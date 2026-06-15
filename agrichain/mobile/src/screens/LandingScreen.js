import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ChainSightLogo from '../components/ChainSightLogo';
import { C } from '../theme';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'git-network-outline',
    color: '#52c484',
    bg: 'rgba(82,196,132,0.15)',
    title: 'End-to-End Traceability',
    body: 'Every batch tracked from field to market with GPS-verified handovers.',
  },
  {
    icon: 'trending-down-outline',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.15)',
    title: 'Predictive Loss Analytics',
    body: 'AI-powered risk scoring detects post-harvest losses before they happen.',
  },
  {
    icon: 'shield-checkmark-outline',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.15)',
    title: 'Trusted Data Network',
    body: 'Cooperatives, distributors and MINAGRI sharing one source of truth.',
  },
];

export default function LandingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0a2e16" />

      <View style={styles.container}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          {/* Glow ring behind logo */}
          <View style={styles.logoGlow}>
            <ChainSightLogo size={72} />
          </View>

          <Text style={styles.brand}>ChainSight</Text>
          <Text style={styles.tagline}>Rwanda Supply Chain Analytics</Text>

          {/* Pill badge */}
          <View style={styles.badge}>
            <Ionicons name="leaf" size={11} color="#52c484" />
            <Text style={styles.badgeText}>Ministry of Agriculture · Rwanda</Text>
          </View>
        </View>

        {/* ── Feature cards ── */}
        <View style={styles.cards}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.88}
          >
            <Ionicons name="log-in-outline" size={18} color="#0a2e16" style={styles.btnIcon} />
            <Text style={styles.btnPrimaryText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('OTP')}
            activeOpacity={0.88}
          >
            <Ionicons name="key-outline" size={17} color="rgba(255,255,255,0.75)" style={styles.btnIcon} />
            <Text style={styles.btnSecondaryText}>Activate Account with OTP</Text>
          </TouchableOpacity>

          {/* Stat strip */}
          <View style={styles.statStrip}>
            {[
              { value: '12+', label: 'Districts' },
              { value: '500+', label: 'Cooperatives' },
              { value: '98%', label: 'Uptime' },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
                {i < 2 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a2e16',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },

  /* Hero */
  hero: {
    alignItems: 'center',
    paddingTop: 12,
  },
  logoGlow: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(82,196,132,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(82,196,132,0.2)',
  },
  brand: {
    fontSize: 38,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
    backgroundColor: 'rgba(82,196,132,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(82,196,132,0.25)',
  },
  badgeText: {
    fontSize: 11,
    color: '#52c484',
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  /* Feature cards */
  cards: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  cardBody: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 17,
  },

  /* Actions */
  actions: {
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a2e16',
  },
  btnSecondary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  btnIcon: {
    marginTop: 1,
  },

  /* Stat strip */
  statStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#52c484',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
