import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useAuthStore } from '../../stores';
import { BACKEND_URL, getCurrentUser, setStoredToken } from '../../lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showWebView, setShowWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleSSOLogin = () => {
    setShowWebView(true);
  };

  const handleWebViewNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    // Check if redirected back with token (custom scheme)
    if (url.startsWith('chatdpupr://auth/callback')) {
      try {
        // Extract token from URL
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');

        if (token) {
          setIsLoading(true);
          setShowWebView(false);

          // Store token first
          await setStoredToken(token);

          // Get user info with the token
          const response = await getCurrentUser();

          if (response.success && response.data) {
            await setAuth(token, response.data);
            router.replace('/(main)');
          } else {
            Alert.alert('Error', 'Gagal mendapatkan data user');
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        Alert.alert('Error', 'Terjadi kesalahan saat login');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (showWebView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)}>
            <Text style={styles.cancelButton}>Batal</Text>
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Login SSO DPUPR</Text>
          <View style={{ width: 50 }} />
        </View>
        <WebView
          ref={webViewRef}
          source={{ uri: `${BACKEND_URL}/auth/sso?mobile=true` }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            // Allow custom scheme redirects
            if (request.url.startsWith('chatdpupr://')) {
              handleWebViewNavigationStateChange({ url: request.url });
              return false;
            }
            return true;
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo & Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MessageCircle size={64} color="#3b82f6" />
          </View>
          <Text style={styles.title}>Chat DPUPR</Text>
          <Text style={styles.subtitle}>
            Sistem Chat Internal{'\n'}DPUPR Provinsi Banten
          </Text>
        </View>

        {/* Login Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.ssoButton}
            onPress={handleSSOLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <View style={styles.ssoIcon}>
                  <Text style={styles.ssoIconText}>SSO</Text>
                </View>
                <Text style={styles.ssoButtonText}>Login dengan SSO DPUPR</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            Gunakan akun SSO DPUPR Banten untuk masuk
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          © 2024 IT DPUPR Banten
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  ssoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  ssoIcon: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ssoIconText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  ssoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cancelButton: {
    color: '#3b82f6',
    fontSize: 16,
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
