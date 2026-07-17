import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { updateSettings, initDatabase } from '../services/DatabaseService';
import { exchangeCodeForToken, saveAccount, fetchUserInfo } from '../services/AuthService';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);

  // Setup Auth Session
  const redirectUri = AuthSession.makeRedirectUri();
  
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      redirectUri,
      responseType: 'code',
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      handleAuthCode(code);
    } else if (response?.type === 'error') {
      Alert.alert('Login Failed', response.error?.message || 'Unknown error');
    }
  }, [response]);

  const handleAuthCode = async (code: string) => {
    setLoading(true);
    try {
      await updateSettings(clientId, clientSecret);
      const tokenData = await exchangeCodeForToken(code, redirectUri);
      
      const userInfo = await fetchUserInfo(tokenData.access_token);
      
      await saveAccount(
        userInfo.email,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in
      );
      
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete login');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!clientId || !clientSecret) {
      Alert.alert('Validation Error', 'Please enter both Client ID and Client Secret');
      return;
    }
    
    await initDatabase();
    await updateSettings(clientId, clientSecret);
    promptAsync();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Text style={styles.title}>☁️ G Drive Connector</Text>
        <Text style={styles.subtitle}>Enter your Google Cloud credentials to connect</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Client ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste your Client ID here"
            placeholderTextColor="#888"
            value={clientId}
            onChangeText={setClientId}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Client Secret</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste your Client Secret here"
            placeholderTextColor="#888"
            value={clientSecret}
            onChangeText={setClientSecret}
            autoCapitalize="none"
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, (!clientId || !clientSecret) && styles.buttonDisabled]} 
          onPress={handleConnect}
          disabled={loading || !request}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect Account</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1E2E',
  },
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E', // Dark Mode background
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#A6ACCD',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
    width: '100%',
    maxWidth: 500, // Tablet layout constraint
    alignSelf: 'center',
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#292D3E',
    color: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3B4252',
  },
  button: {
    backgroundColor: '#82AAFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    maxWidth: 500, // Tablet layout constraint
    alignSelf: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#4E5579',
  },
  buttonText: {
    color: '#1E1E2E',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
