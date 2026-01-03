import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../utils/theme';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

export default function ModerationScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await api.get('/moderation/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = async (reportId) => {
    try {
      await api.post(`/moderation/reports/${reportId}/ignore`);
      Alert.alert('Success', 'Report ignored');
      loadReports();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || error.message);
    }
  };

  const handleEscalate = async (reportId) => {
    try {
      await api.post(`/moderation/reports/${reportId}/escalate`);
      Alert.alert('Success', 'Report escalated to admin');
      loadReports();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || error.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    // Reset navigation stack completely for staff logout
    router.replace('/');
  };

  return (
    <LinearGradient colors={['#8B5CF6', theme.colors.background]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Moderation Panel</Text>
            <Text style={styles.subtitle}>{user?.name} • {user?.role}</Text>
          </View>
          <View style={styles.headerButtons}>
            {user?.role === 'admin' && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/(staff)/admin')}
              >
                <MaterialCommunityIcons name="shield-crown" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Pending Reports ({reports.length})</Text>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : reports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="check-circle" size={64} color={theme.colors.success} />
              <Text style={styles.emptyText}>No pending reports</Text>
              <Text style={styles.emptySubtext}>All clear!</Text>
            </View>
          ) : (
            reports.map((report: any) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <MaterialCommunityIcons name="flag" size={20} color={theme.colors.warning} />
                  <Text style={styles.reportDate}>
                    {new Date(report.created_at).toLocaleDateString()}
                  </Text>
                </View>
                
                <Text style={styles.reportReason}>{report.reason}</Text>
                <View style={styles.commentBox}>
                  <Text style={styles.commentLabel}>Comment:</Text>
                  <Text style={styles.commentText}>{report.comment_content}</Text>
                </View>
                <Text style={styles.reporterText}>Reported by: {report.reporter_name}</Text>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.ignoreButton]}
                    onPress={() => handleIgnore(report.id)}
                  >
                    <Text style={styles.actionButtonText}>Ignore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.escalateButton]}
                    onPress={() => handleEscalate(report.id)}
                  >
                    <Text style={styles.actionButtonText}>Escalate</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md },
  title: { fontSize: theme.fontSize.xxl, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  headerButtons: { flexDirection: 'row', gap: theme.spacing.sm },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  loadingText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
  emptyContainer: { alignItems: 'center', marginTop: theme.spacing.xxl },
  emptyText: { fontSize: theme.fontSize.xl, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.lg },
  emptySubtext: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  reportCard: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  reportDate: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  reportReason: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  commentBox: { backgroundColor: theme.colors.glassDark, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, marginBottom: theme.spacing.sm },
  commentLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  commentText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  reporterText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  actionButtons: { flexDirection: 'row', gap: theme.spacing.sm },
  actionButton: { flex: 1, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, alignItems: 'center' },
  ignoreButton: { backgroundColor: theme.colors.textMuted },
  escalateButton: { backgroundColor: theme.colors.warning },
  actionButtonText: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text },
});
