import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // If not logged in, go back to landing.
  if (!user) return <Redirect href="/" />;

  // Only staff roles can access staff stack.
  if (user.role !== 'admin' && user.role !== 'moderator') {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="moderation" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
