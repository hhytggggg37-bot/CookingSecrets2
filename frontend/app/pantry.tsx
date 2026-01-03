import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../utils/theme';
import api from '../utils/api';

// Pantry item shape returned by backend (kept JS-only for web build compatibility)

export default function PantryScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemImage, setNewItemImage] = useState<string | null>(null);
  const [newItemQuantityType, setNewItemQuantityType] = useState<'kg' | 'number' | 'none'>('kg');
  const [newItemQuantity, setNewItemQuantity] = useState('0');
  const [saving, setSaving] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth fade + slide animation on open
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await api.get('/pantry');
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load pantry:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access.');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNewItemImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleAddItem = async () => {
    // Validation: at least name OR image required
    if (!newItemName.trim() && !newItemImage) {
      Alert.alert('Error', 'Please provide either a name or image for the item');
      return;
    }

    const quantity = parseFloat(newItemQuantity);
    
    // Validation: number type must be integer
    if (newItemQuantityType === 'number' && quantity !== Math.floor(quantity)) {
      Alert.alert('Error', 'Quantity for "number" type must be an integer');
      return;
    }

    setSaving(true);
    try {
      await api.post('/pantry', {
        name: newItemName.trim() || null,
        image: newItemImage,
        quantity_type: newItemQuantityType,
        quantity: newItemQuantityType === 'none' ? 0 : quantity,
      });
      
      setNewItemName('');
      setNewItemImage(null);
      setNewItemQuantity('0');
      setShowAddForm(false);
      loadItems();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuantity = async (itemId, currentQuantity, quantityType, delta) => {
    if (quantityType === 'none') return;

    let newQuantity = currentQuantity + delta;
    
    // Enforce no negative quantities
    if (newQuantity < 0) newQuantity = 0;
    
    // Enforce integer for number type
    if (quantityType === 'number') {
      newQuantity = Math.floor(newQuantity);
    }

    try {
      await api.put(`/pantry/${itemId}`, { quantity: newQuantity });
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to update quantity');
    }
  };

  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/pantry/${itemId}`);
              setItems(prev => prev.filter(item => item.id !== itemId));
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pantry</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)}>
              <MaterialCommunityIcons name={showAddForm ? 'close' : 'plus'} size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {showAddForm && (
              <View style={styles.addForm}>
                <Text style={styles.formTitle}>Add New Item</Text>
                
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  {newItemImage ? (
                    <Image source={{ uri: newItemImage }} style={styles.pickedImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialCommunityIcons name="camera" size={32} color={theme.colors.textMuted} />
                      <Text style={styles.imagePlaceholderText}>Add Image (Optional)</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Item name (Optional)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newItemName}
                  onChangeText={setNewItemName}
                />

                <Text style={styles.label}>Quantity Type</Text>
                <View style={styles.quantityTypeButtons}>
                  <TouchableOpacity
                    style={[styles.typeButton, newItemQuantityType === 'kg' && styles.typeButtonActive]}
                    onPress={() => setNewItemQuantityType('kg')}
                  >
                    <Text style={[styles.typeButtonText, newItemQuantityType === 'kg' && styles.typeButtonTextActive]}>kg (decimal)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, newItemQuantityType === 'number' && styles.typeButtonActive]}
                    onPress={() => setNewItemQuantityType('number')}
                  >
                    <Text style={[styles.typeButtonText, newItemQuantityType === 'number' && styles.typeButtonTextActive]}>number (int)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, newItemQuantityType === 'none' && styles.typeButtonActive]}
                    onPress={() => setNewItemQuantityType('none')}
                  >
                    <Text style={[styles.typeButtonText, newItemQuantityType === 'none' && styles.typeButtonTextActive]}>none (checklist)</Text>
                  </TouchableOpacity>
                </View>

                {newItemQuantityType !== 'none' && (
                  <>
                    <Text style={styles.label}>Initial Quantity</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={theme.colors.textMuted}
                      value={newItemQuantity}
                      onChangeText={setNewItemQuantity}
                      keyboardType={newItemQuantityType === 'number' ? 'number-pad' : 'decimal-pad'}
                    />
                  </>
                )}

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddItem}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={theme.colors.text} />
                  ) : (
                    <Text style={styles.saveButtonText}>Add to Pantry</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="fridge-outline" size={64} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>Your pantry is empty</Text>
                <Text style={styles.emptySubtext}>Add items to track your ingredients</Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  )}
                  <View style={styles.itemContent}>
                    <Text style={styles.itemName}>{item.name || 'Unnamed Item'}</Text>
                    <Text style={styles.itemType}>
                      Type: {item.quantity_type}
                      {item.quantity_type === 'none' && ' (checklist)'}
                    </Text>
                    
                    {item.quantity_type !== 'none' && (
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.controlButton}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity, item.quantity_type, -1)}
                        >
                          <MaterialCommunityIcons name="minus" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        
                        <Text style={styles.quantityText}>
                          {item.quantity_type === 'kg'
                            ? `${item.quantity}${item.quantity_type}`
                            : `${Math.floor(item.quantity)}${item.quantity_type === 'number' ? '' : item.quantity_type}`
                          }
                        </Text>
                        
                        <TouchableOpacity
                          style={styles.controlButton}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity, item.quantity_type, 1)}
                        >
                          <MaterialCommunityIcons name="plus" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteItem(item.id)}
                  >
                    <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg },
  addForm: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  formTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  imagePickerButton: { marginBottom: theme.spacing.md },
  pickedImage: { width: '100%', height: 120, borderRadius: theme.borderRadius.md },
  imagePlaceholder: { width: '100%', height: 120, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.glassDark, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.textMuted },
  imagePlaceholderText: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  input: { backgroundColor: theme.colors.glassDark, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.text, fontSize: theme.fontSize.md, marginBottom: theme.spacing.md },
  label: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  quantityTypeButtons: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  typeButton: { flex: 1, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.glassDark, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  typeButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  typeButtonText: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, fontWeight: '600' },
  typeButtonTextActive: { color: theme.colors.text },
  saveButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.sm },
  saveButtonText: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text },
  loader: { marginTop: theme.spacing.xxl },
  emptyContainer: { alignItems: 'center', marginTop: theme.spacing.xxl },
  emptyText: { fontSize: theme.fontSize.xl, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.lg },
  emptySubtext: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  itemImage: { width: 60, height: 60, borderRadius: theme.borderRadius.sm, marginRight: theme.spacing.md },
  itemContent: { flex: 1 },
  itemName: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  itemType: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  controlButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  quantityText: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, minWidth: 60, textAlign: 'center' },
  deleteButton: { padding: theme.spacing.sm },
});
