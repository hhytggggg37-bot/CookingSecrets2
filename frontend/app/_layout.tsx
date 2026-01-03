import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

function RootLayoutNav() {
  const { user, loading } = useAuth();

  // While loading auth state, render nothing (prevents flicker and weird back stacks)
  if (loading) return null;

  // Keying the Stack by auth state forces a full navigation reset on login/logout.
  // This is the most reliable way to prevent back-navigation into protected screens.
  const stackKey = user ? 'auth' : 'guest';

  return (
    <Stack key={stackKey} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen name="recipe/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
