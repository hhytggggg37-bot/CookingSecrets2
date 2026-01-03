import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { useAuth } from '../../contexts/AuthContext';

const HomeIcon = ({ color, size }) => (
  <MaterialCommunityIcons name="home" size={size} color={color} />
);
const CookbookIcon = ({ color, size }: any) => (
  <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
);
const PantryIcon = ({ color, size }: any) => (
  <MaterialCommunityIcons name="fridge" size={size} color={color} />
);
const MarketplaceIcon = ({ color, size }: any) => (
  <MaterialCommunityIcons name="storefront" size={size} color={color} />
);
const ProfileIcon = ({ color, size }: any) => (
  <MaterialCommunityIcons name="account" size={size} color={color} />
);

export default function TabLayout() {
  const { user, loading } = useAuth();

  // Auth guard: prevents back-navigation into protected tab screens after logout.
  if (loading) return null;
  if (!user) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundLight,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cookbook"
        options={{
          title: 'Cookbook',
          tabBarIcon: ({ color, size }) => <CookbookIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => <PantryIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ color, size }) => <MarketplaceIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <ProfileIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
