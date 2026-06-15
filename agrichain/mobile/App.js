import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { setNavigationRef } from './src/api/client';
import { C } from './src/theme';

function RootNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  const navRef = React.useRef(null);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          ref={(ref) => {
            navRef.current = ref;
            setNavigationRef(ref);
          }}
        >
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
});
