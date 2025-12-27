import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../utils/theme';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  image?: string;
  creator_id: string;
  creator_name: string;
  creator_role: string;
  is_paid: boolean;
  price: number;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, refreshUser } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      const response = await api.get(`/recipes/${id}`);
      setRecipe(response.data);
    } catch (error: any) {
      if (error.response?.status === 402) {
        Alert.alert('Locked Recipe', 'This recipe is paid. Purchase it to view the full content.');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to load recipe');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!recipe) return;
    
    try {
      const response = await api.post(`/recipes/${recipe.id}/like`);
      setRecipe({
        ...recipe,
        is_liked: response.data.liked,
        likes_count: response.data.likes_count,
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to like recipe');
    }
  };

  const handleSave = async () => {
    if (!recipe) return;

    try {
      const response = await api.post(`/cookbook/${recipe.id}`);
      setRecipe({
        ...recipe,
        is_saved: response.data.saved,
      });
      Alert.alert('Success', response.data.saved ? 'Saved to cookbook' : 'Removed from cookbook');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save recipe');
    }
  };

  const handlePurchase = async () => {
    if (!recipe) return;

    Alert.alert(
      'Purchase Recipe',
      `Buy this recipe for $${recipe.price.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setIsPurchasing(true);
            try {
              await api.post(`/wallet/purchase/${recipe.id}`);
              await refreshUser();
              Alert.alert('Success', 'Recipe purchased! Reloading...');
              loadRecipe();
            } catch (error: any) {
              Alert.alert('Purchase Failed', error.response?.data?.detail || error.message);
            } finally {
              setIsPurchasing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleLike}>
              <MaterialCommunityIcons
                name={recipe.is_liked ? 'heart' : 'heart-outline'}
                size={24}
                color={recipe.is_liked ? theme.colors.error : theme.colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleSave}>
              <MaterialCommunityIcons
                name={recipe.is_saved ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color={recipe.is_saved ? theme.colors.primary : theme.colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {recipe.image && (
            <Image source={{ uri: recipe.image }} style={styles.recipeImage} resizeMode="cover" />
          )}

          <View style={styles.titleContainer}>
            <Text style={styles.title}>{recipe.title}</Text>
            <View style={styles.creatorInfo}>
              <MaterialCommunityIcons
                name={recipe.creator_role === 'chef' ? 'chef-hat' : 'account'}
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.creatorName}>by {recipe.creator_name}</Text>
            </View>
          </View>

          {recipe.is_paid && !recipe.is_saved && (
            <View style={styles.purchaseCard}>
              <View style={styles.priceInfo}>
                <MaterialCommunityIcons name="lock" size={32} color={theme.colors.warning} />
                <View style={styles.priceText}>
                  <Text style={styles.priceLabel}>Premium Recipe</Text>
                  <Text style={styles.priceAmount}>${recipe.price.toFixed(2)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.purchaseButton}
                onPress={handlePurchase}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator color={theme.colors.text} />
                ) : (
                  <Text style={styles.purchaseButtonText}>Purchase</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {recipe.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <MaterialCommunityIcons name="circle-medium" size={16} color={theme.colors.primary} />
                <Text style={styles.ingredientText}>{ingredient}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {recipe.steps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="heart" size={20} color={theme.colors.error} />
              <Text style={styles.statText}>{recipe.likes_count}</Text>
            </View>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="comment" size={20} color={theme.colors.info} />
              <Text style={styles.statText}>{recipe.comments_count}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: theme.spacing.sm },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: theme.spacing.xxl },
  recipeImage: { width: '100%', height: 300, backgroundColor: theme.colors.surfaceLight },
  titleContainer: { padding: theme.spacing.lg },
  title: { fontSize: theme.fontSize.xxxl, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  creatorName: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  purchaseCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg, backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.warning },
  priceInfo: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  priceText: { flex: 1 },
  priceLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  priceAmount: { fontSize: theme.fontSize.xxl, fontWeight: '700', color: theme.colors.text },
  purchaseButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  purchaseButtonText: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '600' },
  section: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  ingredientItem: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  ingredientText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, flex: 1 },
  stepItem: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  stepNumberText: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text },
  stepText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.textSecondary, lineHeight: 24 },
  statsContainer: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xl, paddingVertical: theme.spacing.lg },
  stat: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  statText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
});
