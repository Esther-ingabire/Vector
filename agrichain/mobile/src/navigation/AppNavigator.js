import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

// Auth screens
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';

// Transporter screens
import TransporterDashboardScreen from '../screens/transporter/DashboardScreen';
import PendingRequestsScreen from '../screens/transporter/PendingRequestsScreen';
import ActiveTripScreen from '../screens/transporter/ActiveTripScreen';
import TripHistoryScreen from '../screens/transporter/TripHistoryScreen';
import TransporterProfileScreen from '../screens/transporter/ProfileScreen';

// Market Agent screens
import MarketAgentDashboardScreen from '../screens/market_agent/DashboardScreen';
import NoticesScreen from '../screens/market_agent/NoticesScreen';
import OrdersScreen from '../screens/market_agent/OrdersScreen';
import CollectionScreen from '../screens/market_agent/CollectionScreen';
import WasteReportScreen from '../screens/market_agent/WasteReportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
    </Stack.Navigator>
  );
}

function TransporterTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.gray400,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.gray200,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'speedometer-outline',
            Pending: 'time-outline',
            'Active Trip': 'navigate-outline',
            History: 'receipt-outline',
            Profile: 'person-circle-outline',
          };
          return (
            <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={TransporterDashboardScreen} />
      <Tab.Screen name="Pending" component={PendingRequestsScreen} />
      <Tab.Screen name="Active Trip" component={ActiveTripScreen} />
      <Tab.Screen name="History" component={TripHistoryScreen} />
      <Tab.Screen name="Profile" component={TransporterProfileScreen} />
    </Tab.Navigator>
  );
}

function MarketAgentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.gray400,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.gray200,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'home-outline',
            Notices: 'megaphone-outline',
            Orders: 'bag-outline',
            Collections: 'basket-outline',
            Waste: 'trash-outline',
          };
          return (
            <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={MarketAgentDashboardScreen} />
      <Tab.Screen name="Notices" component={NoticesScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Collections" component={CollectionScreen} />
      <Tab.Screen name="Waste" component={WasteReportScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();

  if (!user) return <AuthStack />;

  if (user.role === 'TRANSPORTER' || user.role === 'TRANSPORT_COMPANY') return <TransporterTabs />;
  if (user.role === 'MARKET_AGENT') return <MarketAgentTabs />;

  // Unsupported role — show a logout-only fallback so the user isn't stuck
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Unsupported"
        children={() => {
          const { logout } = useAuth();
          const React2 = require('react');
          const { View, Text, TouchableOpacity } = require('react-native');
          return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <Text style={{ fontSize: 16, color: '#374151', marginBottom: 24, textAlign: 'center' }}>
                This role is not supported in the mobile app.
              </Text>
              <TouchableOpacity
                onPress={logout}
                style={{ backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </Stack.Navigator>
  );
}
