import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../utils/theme';
import api from '../../utils/api';

export default function CookbookScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCookbook();
  }, []);

  const loadCookbook = async () => {
    try {
      const response = await api.get('/cookbook');
      setRecipes(response.data);
    } catch (error) {
      console.error('Failed to load cookbook:', error);
      Alert.alert('Error', 'Failed to load your cookbook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>My Cookbook</Text>
          <Text style={styles.subtitle}>{recipes.length} saved recipes</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : recipes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="book-open-variant" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>Your cookbook is empty</Text>
              <Text style={styles.emptySubtext}>Save recipes to access them here</Text>
            </View>
          ) : (
            recipes.map((recipe: any, index) => (
              <TouchableOpacity key={recipe.id} style={styles.recipeCard}>
                <View style={styles.recipeNumber}>
                  <Text style={styles.recipeNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.recipeContent}>
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  <Text style={styles.recipeIngredients}>
                    {recipe.ingredients.length} ingredients
                  </Text>
                  <View style={styles.recipeStats}>
                    <View style={styles.stat}>
                      <MaterialCommunityIcons name="heart" size={16} color={theme.colors.error} />
                      <Text style={styles.statText}>{recipe.likes_count}</Text>
                    </View>
                    <View style={styles.stat}>
                      <MaterialCommunityIcons name="comment" size={16} color={theme.colors.info} />
                      <Text style={styles.statText}>{recipe.comments_count}</Text>
                    </View>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
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
  recipeNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  recipeNumberText: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text },
  recipeContent: { flex: 1 },
  recipeTitle: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  recipeIngredients: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  recipeStats: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  statText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
});
