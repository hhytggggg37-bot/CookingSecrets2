import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // If already authenticated, keep user out of auth screens.
  if (user) {
    if (user.role === 'admin' || user.role === 'moderator') {
      return <Redirect href="/(staff)/moderation" />;
    }
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="staff-login" />
    </Stack>
  );
}
