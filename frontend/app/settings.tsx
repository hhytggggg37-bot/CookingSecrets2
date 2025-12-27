import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user?.name}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role?.toUpperCase()}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={24} color={theme.colors.text} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  infoCard: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  infoLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  infoValue: { fontSize: theme.fontSize.md, color: theme.colors.text, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.error, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.xl },
  logoutText: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text },
});
