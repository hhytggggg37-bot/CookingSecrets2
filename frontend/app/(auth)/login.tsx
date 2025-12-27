import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Login() {
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
      await login(email, password, false);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primaryDark]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to continue</Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchLink}>Sign Up</Text></Text>
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
  title: { fontSize: 32, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  subtitle: { fontSize: theme.fontSize.lg, color: theme.colors.textSecondary, marginBottom: theme.spacing.xxl },
  form: { gap: theme.spacing.md },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, paddingVertical: theme.spacing.md, color: theme.colors.text, fontSize: theme.fontSize.md },
  loginButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.md },
  loginButtonText: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '600' },
  switchText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.lg },
  switchLink: { color: theme.colors.primary, fontWeight: '600' },
});
