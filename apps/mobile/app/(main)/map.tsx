import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { theme } from '../../lib/theme';
import Constants from 'expo-constants';

export default function MapScreen() {
  // Use the production URL or configured backend URL's frontend counterpart
  // For now we assume the frontend is hosted or we use the IP of the dev machine
  // Adjust this URL to point to your Next.js map page
  const WEB_MAP_URL = 'http://192.168.1.5:3000/map'; // Replace with your actual LAN IP or production URL
  
  return (
    <>
      <Stack.Screen 
        options={{ 
            title: 'Peta Laporan',
            headerStyle: { backgroundColor: theme.colors.headerBackground },
            headerTintColor: '#fff',
        }} 
      />
      <View style={styles.container}>
        <WebView 
            source={{ uri: WEB_MAP_URL }}
            startInLoadingState={true}
            renderLoading={() => (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
