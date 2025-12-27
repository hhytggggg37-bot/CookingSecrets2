import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../utils/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen() {
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons
                name={user?.role === 'chef' ? 'chef-hat' : 'account'}
                size={48}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet</Text>
            <TouchableOpacity
              style={styles.walletCard}
              onPress={() => router.push('/wallet')}
              // Wallet card navigates to full wallet screen for deposits/history
            >
              <View style={styles.walletIcon}>
                <MaterialCommunityIcons name="wallet" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>Balance</Text>
                <Text style={styles.walletAmount}>${user?.wallet_balance?.toFixed(2) || '0.00'}</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/wallet')}
              >
                <MaterialCommunityIcons name="plus" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
              <MaterialCommunityIcons name="bell" size={24} color={theme.colors.textSecondary} />
              <Text style={styles.menuText}>Notifications</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/wallet')}>
              <MaterialCommunityIcons name="wallet" size={24} color={theme.colors.textSecondary} />
              <Text style={styles.menuText}>Wallet</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>

            {user?.role === 'chef' && (
              <TouchableOpacity style={styles.menuItem}>
                <MaterialCommunityIcons name="chef-hat" size={24} color={theme.colors.textSecondary} />
                <Text style={styles.menuText}>My Recipes</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
              <MaterialCommunityIcons name="cog" size={24} color={theme.colors.textSecondary} />
              <Text style={styles.menuText}>Settings</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color={theme.colors.error} />
              <Text style={[styles.menuText, { color: theme.colors.error }]}>Logout</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg },
  profileHeader: { alignItems: 'center', marginBottom: theme.spacing.xl },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md, borderWidth: 2, borderColor: theme.colors.primary },
  name: { fontSize: theme.fontSize.xxl, fontWeight: '700', color: theme.colors.text },
  email: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  roleBadge: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.full, marginTop: theme.spacing.sm },
  roleText: { fontSize: theme.fontSize.xs, fontWeight: '700', color: theme.colors.text },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  walletCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  walletIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  walletInfo: { flex: 1 },
  walletLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  walletAmount: { fontSize: theme.fontSize.xxl, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.xs },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  menuText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.text, marginLeft: theme.spacing.md },
});
