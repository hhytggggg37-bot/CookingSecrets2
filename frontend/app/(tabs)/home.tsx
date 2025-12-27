import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import api from '../../utils/api';

interface Recipe {
  title: string;
  ingredients: string[];
  steps: string[];
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [showGenerator, setShowGenerator] = useState(false);
  const [ingredients, setIngredients] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [trendingRecipes, setTrendingRecipes] = useState([]);
  const [topChefs, setTopChefs] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [trending, chefs] = await Promise.all([
        api.get('/dashboard/trending'),
        api.get('/dashboard/top-chefs'),
      ]);
      setTrendingRecipes(trending.data);
      setTopChefs(chefs.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!ingredients.trim()) {
      Alert.alert('Error', 'Please enter some ingredients');
      return;
    }

    setGenerating(true);
    try {
      const ingredientList = ingredients.split(',').map(i => i.trim()).filter(Boolean);
      const response = await api.post('/recipes/generate', {
        ingredients: ingredientList,
        session_id: user?.id || 'guest-' + Date.now(),
      });

      setGeneratedRecipe(response.data.recipe);
      if (response.data.requires_login) {
        Alert.alert(
          'Guest Limit Reached',
          'You have used your one free recipe. Please sign up to generate unlimited recipes!'
        );
      }
    } catch (error: any) {
      Alert.alert('Generation Failed', error.response?.data?.detail || error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return;

    try {
      await api.post('/recipes', {
        ...generatedRecipe,
        image: null,
        is_paid: false,
        price: 0,
      });
      Alert.alert('Success', 'Recipe saved to your collection!');
      setShowGenerator(false);
      setGeneratedRecipe(null);
      setIngredients('');
    } catch (error: any) {
      Alert.alert('Save Failed', error.response?.data?.detail || error.message);
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.name || 'Guest'}!</Text>
              <Text style={styles.subGreeting}>What would you like to cook today?</Text>
            </View>
            <View style={styles.walletBadge}>
              <MaterialCommunityIcons name="wallet" size={20} color={theme.colors.primary} />
              <Text style={styles.walletText}>${user?.wallet_balance?.toFixed(2) || '0.00'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.aiGeneratorCard} onPress={() => setShowGenerator(true)}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark]}
              style={styles.aiGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="robot" size={48} color={theme.colors.text} />
              <Text style={styles.aiTitle}>AI Recipe Generator</Text>
              <Text style={styles.aiSubtitle}>Create recipes from your ingredients</Text>
            </LinearGradient>
          </TouchableOpacity>

          {trendingRecipes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Recipes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {trendingRecipes.map((recipe: any, index) => (
                  <View key={index} style={styles.recipeCard}>
                    <Text style={styles.recipeTitle}>{recipe.title}</Text>
                    <View style={styles.recipeStats}>
                      <MaterialCommunityIcons name="heart" size={16} color={theme.colors.error} />
                      <Text style={styles.recipeStatText}>{recipe.likes_count}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {topChefs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Chefs</Text>
              {topChefs.map((chef: any, index) => (
                <View key={index} style={styles.chefCard}>
                  <View style={styles.chefIcon}>
                    <MaterialCommunityIcons name="chef-hat" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.chefInfo}>
                    <Text style={styles.chefName}>{chef.name}</Text>
                    <Text style={styles.chefEarnings}>${chef.wallet_balance.toFixed(2)} earned</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showGenerator} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Recipe Generator</Text>
              <TouchableOpacity onPress={() => {
                setShowGenerator(false);
                setGeneratedRecipe(null);
                setIngredients('');
              }}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {!generatedRecipe ? (
              <>
                <TextInput
                  style={styles.ingredientInput}
                  placeholder="Enter ingredients (comma separated)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={ingredients}
                  onChangeText={setIngredients}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerateRecipe}
                  disabled={generating}
                >
                  {generating ? (
                    <ActivityIndicator color={theme.colors.text} />
                  ) : (
                    <Text style={styles.generateButtonText}>Generate Recipe</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <ScrollView style={styles.recipeResult}>
                <Text style={styles.resultTitle}>{generatedRecipe.title}</Text>
                
                <Text style={styles.resultSectionTitle}>Ingredients:</Text>
                {generatedRecipe.ingredients.map((ing, idx) => (
                  <Text key={idx} style={styles.resultItem}>• {ing}</Text>
                ))}
                
                <Text style={styles.resultSectionTitle}>Steps:</Text>
                {generatedRecipe.steps.map((step, idx) => (
                  <Text key={idx} style={styles.resultItem}>{idx + 1}. {step}</Text>
                ))}
                
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe}>
                  <Text style={styles.saveButtonText}>Save Recipe</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  greeting: { fontSize: theme.fontSize.xxl, fontWeight: '700', color: theme.colors.text },
  subGreeting: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  walletBadge: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: theme.colors.glassLight, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.full, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  walletText: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text },
  aiGeneratorCard: { marginBottom: theme.spacing.xl, borderRadius: theme.borderRadius.lg, overflow: 'hidden' },
  aiGradient: { padding: theme.spacing.xl, alignItems: 'center' },
  aiTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.md },
  aiSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  recipeCard: { width: 200, backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginRight: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  recipeTitle: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  recipeStats: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  recipeStatText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  chefCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  chefIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  chefInfo: { flex: 1 },
  chefName: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text },
  chefEarnings: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  modalContainer: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.backgroundLight, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text },
  ingredientInput: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.text, fontSize: theme.fontSize.md, marginBottom: theme.spacing.md, minHeight: 100, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  generateButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  generateButtonText: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '600' },
  recipeResult: { flex: 1 },
  resultTitle: { fontSize: theme.fontSize.xxl, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.lg },
  resultSectionTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  resultItem: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs, lineHeight: 24 },
  saveButton: { backgroundColor: theme.colors.success, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.lg },
  saveButtonText: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '600' },
});
