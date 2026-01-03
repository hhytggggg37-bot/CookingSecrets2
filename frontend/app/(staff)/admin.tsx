import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../utils/theme';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

export default function AdminScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [escalatedReports, setEscalatedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModerator, setShowCreateModerator] = useState(false);
  const [modEmail, setModEmail] = useState('');
  const [modPassword, setModPassword] = useState('');
  const [modName, setModName] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [usersRes, reportsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/reports/escalated'),
      ]);
      setUsers(usersRes.data);
      setEscalatedReports(reportsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, currentlyBanned) => {
    try {
      await api.post('/admin/ban-user', { user_id: userId, banned: !currentlyBanned });
      Alert.alert('Success', currentlyBanned ? 'User unbanned' : 'User banned');
      loadAdminData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || error.message);
    }
  };

  const handleCreateModerator = async () => {
    if (!modEmail || !modPassword || !modName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await api.post('/admin/create-moderator', {
        email: modEmail,
        password: modPassword,
        name: modName,
      });
      Alert.alert('Success', 'Moderator created successfully');
      setShowCreateModerator(false);
      setModEmail('');
      setModPassword('');
      setModName('');
      loadAdminData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || error.message);
    }
  };

  return (
    <LinearGradient colors={['#6366F1', theme.colors.background]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Admin Panel</Text>
            <Text style={styles.subtitle}>{user?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await logout();
              router.replace('/');
            }}
          >
            <MaterialCommunityIcons name="logout" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Moderators</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateModerator(!showCreateModerator)}
              >
                <MaterialCommunityIcons name="plus" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {showCreateModerator && (
              <View style={styles.createForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor={theme.colors.textMuted}
                  value={modName}
                  onChangeText={setModName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textMuted}
                  value={modEmail}
                  onChangeText={setModEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={modPassword}
                  onChangeText={setModPassword}
                  secureTextEntry
                />
                <TouchableOpacity style={styles.createButton} onPress={handleCreateModerator}>
                  <Text style={styles.createButtonText}>Create Moderator</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escalated Reports ({escalatedReports.length})</Text>
            {escalatedReports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <Text style={styles.reportReason}>{report.reason}</Text>
                <Text style={styles.commentText}>{report.comment_content}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Users ({users.length})</Text>
            {users.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userIcon}>
                  <MaterialCommunityIcons
                    name={u.role === 'chef' ? 'chef-hat' : u.role === 'admin' ? 'shield-crown' : u.role === 'moderator' ? 'shield' : 'account'}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <Text style={styles.userRole}>{u.role.toUpperCase()}</Text>
                </View>
                {u.role !== 'admin' && (
                  <TouchableOpacity
                    style={[styles.banButton, u.banned && styles.unbanButton]}
                    onPress={() => handleBanUser(u.id, u.banned)}
                  >
                    <Text style={styles.banButtonText}>{u.banned ? 'Unban' : 'Ban'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, marginLeft: theme.spacing.md },
  title: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  logoutButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg },
  section: { marginBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  addButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
  createForm: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  input: { backgroundColor: theme.colors.glassDark, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, color: theme.colors.text },
  createButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, alignItems: 'center' },
  createButtonText: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  reportCard: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  reportReason: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  commentText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  userIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassDark, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  userInfo: { flex: 1 },
  userName: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text },
  userEmail: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  userRole: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  banButton: { backgroundColor: theme.colors.error, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm },
  unbanButton: { backgroundColor: theme.colors.success },
  banButtonText: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text },
});
