import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { initDatabase, getDb } from './src/services/DatabaseService';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        const db = getDb();
        const account = await db.getFirstAsync('SELECT * FROM accounts LIMIT 1');
        setIsAuthenticated(!!account);
      } catch (error) {
        console.error(error);
      } finally {
        setIsReady(true);
      }
    }
    setup();
  }, []);

  const handleLogout = async () => {
    const db = getDb();
    await db.runAsync('DELETE FROM accounts');
    setIsAuthenticated(false);
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#82AAFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isAuthenticated ? (
        <DashboardScreen onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
