import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function StaffLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password, true);
      router.replace('/(staff)/moderation');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, '#8B5CF6']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.badge}>
              <MaterialCommunityIcons name="shield-check" size={40} color={theme.colors.text} />
            </View>

            <Text style={styles.title}>Staff Login</Text>
            <Text style={styles.subtitle}>Admin & Moderator Access</Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Staff Email" placeholderTextColor={theme.colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
              </View>

              <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Staff Login'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.switchText}>Regular user? <Text style={styles.switchLink}>Login here</Text></Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: theme.spacing.xl },
  backButton: { marginBottom: theme.spacing.lg },
  badge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(139, 92, 246, 0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.lg, borderWidth: 2, borderColor: '#A78BFA' },
  title: { fontSize: 32, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  subtitle: { fontSize: theme.fontSize.lg, color: theme.colors.textSecondary, marginBottom: theme.spacing.xxl },
  form: { gap: theme.spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, paddingVertical: theme.spacing.md, color: theme.colors.text, fontSize: theme.fontSize.md },
  loginButton: { backgroundColor: '#8B5CF6', paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.md },
  loginButtonText: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '600' },
  switchText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.lg },
  switchLink: { color: '#A78BFA', fontWeight: '600' },
});
