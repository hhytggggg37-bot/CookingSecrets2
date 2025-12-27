import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function MarketplaceScreen() {
  const { user, refreshUser } = useAuth();
  const [paidRecipes, setPaidRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaidRecipes();
  }, []);

  const loadPaidRecipes = async () => {
    try {
      const response = await api.get('/recipes?skip=0&limit=50');
      const paid = response.data.filter((r: any) => r.is_paid);
      setPaidRecipes(paid);
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (recipeId: string, price: number) => {
    try {
      await api.post(`/wallet/purchase/${recipeId}`);
      Alert.alert('Success', 'Recipe purchased successfully!');
      await refreshUser();
      loadPaidRecipes();
    } catch (error: any) {
      Alert.alert('Purchase Failed', error.response?.data?.detail || error.message);
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Marketplace</Text>
          <Text style={styles.subtitle}>Premium recipes from top chefs</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : paidRecipes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="storefront" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No recipes for sale yet</Text>
              <Text style={styles.emptySubtext}>Chefs can create paid recipes here</Text>
            </View>
          ) : (
            paidRecipes.map((recipe: any) => (
              <View key={recipe.id} style={styles.recipeCard}>
                <View style={styles.chefBadge}>
                  <MaterialCommunityIcons name="chef-hat" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.recipeContent}>
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  <Text style={styles.chefName}>by {recipe.creator_name}</Text>
                  <View style={styles.recipeStats}>
                    <View style={styles.stat}>
                      <MaterialCommunityIcons name="heart" size={16} color={theme.colors.error} />
                      <Text style={styles.statText}>{recipe.likes_count}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>${recipe.price.toFixed(2)}</Text>
                  <TouchableOpacity
                    style={styles.buyButton}
                    onPress={() => handlePurchase(recipe.id, recipe.price)}
                  >
                    <Text style={styles.buyButtonText}>Buy</Text>
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
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md },
  title: { fontSize: theme.fontSize.xxxl, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg },
  loadingText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
  emptyContainer: { alignItems: 'center', marginTop: theme.spacing.xxl },
  emptyText: { fontSize: theme.fontSize.xl, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.lg },
  emptySubtext: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  recipeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  chefBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  recipeContent: { flex: 1 },
  recipeTitle: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  chefName: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  recipeStats: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  statText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  priceContainer: { alignItems: 'flex-end' },
  priceText: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.primary, marginBottom: theme.spacing.xs },
  buyButton: { backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm },
  buyButtonText: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
});
