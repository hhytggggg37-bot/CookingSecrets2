import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Signup() {
  const router = useRouter();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name, role);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
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

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join CookingSecrets</Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="account" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Name" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} autoComplete="name" />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
              </View>

              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>I am a:</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity style={[styles.roleButton, role === 'user' && styles.roleButtonActive]} onPress={() => setRole('user')}>
                    <MaterialCommunityIcons name="account" size={24} color={role === 'user' ? theme.colors.text : theme.colors.textMuted} />
                    <Text style={[styles.roleButtonText, role === 'user' && styles.roleButtonTextActive]}>User</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.roleButton, role === 'chef' && styles.roleButtonActive]} onPress={() => setRole('chef')}>
                    <MaterialCommunityIcons name="chef-hat" size={24} color={role === 'chef' ? theme.colors.text : theme.colors.textMuted} />
                    <Text style={[styles.roleButtonText, role === 'chef' && styles.roleButtonTextActive]}>Chef</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={loading}>
                <Text style={styles.signupButtonText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.switchText}>Already have an account? <Text style={styles.switchLink}>Login</Text></Text>
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
  roleContainer: { marginVertical: theme.spacing.md },
  roleLabel: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  roleButtons: { flexDirection: 'row', gap: theme.spacing.md },
  roleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.glassLight, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  roleButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  roleButtonText: { color: theme.colors.textMuted, fontSize: theme.fontSize.md, fontWeight: '600' },
  roleButtonTextActive: { color: theme.colors.text },
  signupButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.md },
  signupButtonText: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '600' },
  switchText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.lg },
  switchLink: { color: theme.colors.primary, fontWeight: '600' },
});
