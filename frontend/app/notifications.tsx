import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../utils/theme';
import api from '../utils/api';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map((n: any) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return 'heart';
      case 'comment': return 'comment';
      case 'purchase': return 'currency-usd';
      case 'escalation': return 'alert';
      default: return 'bell';
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="bell-outline" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            notifications.map((notif: any) => (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notificationItem, !notif.read && styles.unreadItem]}
                onPress={() => markAsRead(notif.id)}
              >
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name={getIcon(notif.type)}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationText}>{notif.content}</Text>
                  <Text style={styles.notificationDate}>
                    {new Date(notif.created_at).toLocaleString()}
                  </Text>
                </View>
                {!notif.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
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
  emptyContainer: { alignItems: 'center', marginTop: theme.spacing.xxl },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.lg },
  notificationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  unreadItem: { borderColor: theme.colors.primary },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassDark, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  notificationContent: { flex: 1 },
  notificationText: { fontSize: theme.fontSize.md, color: theme.colors.text, marginBottom: theme.spacing.xs },
  notificationDate: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
});
