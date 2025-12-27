import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../utils/theme';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function CreateRecipeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'draft' | 'public' | 'paid' | 'followers'>('draft');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a recipe title');
      return;
    }

    if (!ingredients.trim()) {
      Alert.alert('Error', 'Please enter ingredients');
      return;
    }

    if (!steps.trim()) {
      Alert.alert('Error', 'Please enter cooking steps');
      return;
    }

    if (publish && !image) {
      Alert.alert('Image Required', 'Please add an image before publishing');
      return;
    }

    if (visibility === 'paid' && (!price || parseFloat(price) <= 0)) {
      Alert.alert('Error', 'Please set a valid price for paid recipes');
      return;
    }

    setSaving(true);
    try {
      const ingredientList = ingredients.split('\n').filter(i => i.trim());
      const stepList = steps.split('\n').filter(s => s.trim());

      await api.post('/recipes', {
        title: title.trim(),
        ingredients: ingredientList,
        steps: stepList,
        image: image,
        is_paid: visibility === 'paid',
        price: visibility === 'paid' ? parseFloat(price) : 0,
        category: publish ? visibility : 'draft',
      });

      Alert.alert(
        'Success',
        publish ? 'Recipe published!' : 'Recipe saved as draft',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const canPublish = title.trim() && ingredients.trim() && steps.trim() && image;

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Recipe</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.saveButton, styles.draftButton]}
                onPress={() => handleSave(false)}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, canPublish ? styles.publishButton : styles.disabledButton]}
                onPress={() => handleSave(true)}
                disabled={!canPublish || saving}
              >
                <Text style={[styles.saveButtonText, !canPublish && styles.disabledText]}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.recipeImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={48} color={theme.colors.textMuted} />
                  <Text style={styles.imagePlaceholderText}>Add Image (Required to Publish)</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter recipe title"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ingredients (one per line)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="1 cup flour&#10;2 eggs&#10;1/2 tsp salt"
                placeholderTextColor={theme.colors.textMuted}
                value={ingredients}
                onChangeText={setIngredients}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Steps (one per line)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Mix flour and eggs&#10;Knead dough for 5 minutes&#10;Let rest for 30 minutes"
                placeholderTextColor={theme.colors.textMuted}
                value={steps}
                onChangeText={setSteps}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Visibility</Text>
              <View style={styles.visibilityButtons}>
                <TouchableOpacity
                  style={[styles.visibilityButton, visibility === 'draft' && styles.visibilityButtonActive]}
                  onPress={() => setVisibility('draft')}
                >
                  <MaterialCommunityIcons name="file-document-outline" size={20} color={visibility === 'draft' ? theme.colors.text : theme.colors.textMuted} />
                  <Text style={[styles.visibilityButtonText, visibility === 'draft' && styles.visibilityButtonTextActive]}>Draft</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visibilityButton, visibility === 'public' && styles.visibilityButtonActive]}
                  onPress={() => setVisibility('public')}
                >
                  <MaterialCommunityIcons name="earth" size={20} color={visibility === 'public' ? theme.colors.text : theme.colors.textMuted} />
                  <Text style={[styles.visibilityButtonText, visibility === 'public' && styles.visibilityButtonTextActive]}>Public</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visibilityButton, visibility === 'paid' && styles.visibilityButtonActive]}
                  onPress={() => setVisibility('paid')}
                >
                  <MaterialCommunityIcons name="currency-usd" size={20} color={visibility === 'paid' ? theme.colors.text : theme.colors.textMuted} />
                  <Text style={[styles.visibilityButtonText, visibility === 'paid' && styles.visibilityButtonTextActive]}>Paid</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visibilityButton, visibility === 'followers' && styles.visibilityButtonActive]}
                  onPress={() => setVisibility('followers')}
                >
                  <MaterialCommunityIcons name="account-group" size={20} color={visibility === 'followers' ? theme.colors.text : theme.colors.textMuted} />
                  <Text style={[styles.visibilityButtonText, visibility === 'followers' && styles.visibilityButtonTextActive]}>Followers</Text>
                </TouchableOpacity>
              </View>
            </View>

            {visibility === 'paid' && (
              <View style={styles.field}>
                <Text style={styles.label}>Price ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text, flex: 1, textAlign: 'center' },
  headerActions: { flexDirection: 'row', gap: theme.spacing.sm },
  saveButton: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm },
  draftButton: { backgroundColor: theme.colors.glassLight },
  publishButton: { backgroundColor: theme.colors.primary },
  disabledButton: { backgroundColor: theme.colors.textMuted, opacity: 0.5 },
  saveButtonText: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text },
  disabledText: { color: theme.colors.textMuted },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  imageContainer: { marginBottom: theme.spacing.lg },
  recipeImage: { width: '100%', height: 200, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surfaceLight },
  imagePlaceholder: { width: '100%', height: 200, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.textMuted },
  imagePlaceholderText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  field: { marginBottom: theme.spacing.lg },
  label: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  input: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.text, fontSize: theme.fontSize.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  multilineInput: { minHeight: 120, textAlignVertical: 'top' },
  visibilityButtons: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  visibilityButton: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, backgroundColor: theme.colors.glassLight, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  visibilityButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  visibilityButtonText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, fontWeight: '600' },
  visibilityButtonTextActive: { color: theme.colors.text },
});
