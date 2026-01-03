import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../utils/theme';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import FakeRazorpayModal from '../components/FakeRazorpayModal';


export default function WalletScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await api.get('/wallet/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    const amount = parseFloat(depositAmount);

    // Validate payment details
    if (paymentMethod === 'card') {
      if (cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
        Alert.alert('Error', 'Card number must be exactly 16 digits');
        return;
      }
      if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        Alert.alert('Error', 'Enter valid expiry date (MM/YY)');
        return;
      }
      if (cvv.length !== 3 || !/^\d+$/.test(cvv)) {
        Alert.alert('Error', 'CVV must be 3 digits');
        return;
      }
    } else {
      if (!upiId || !upiId.includes('@')) {
        Alert.alert('Error', 'Enter valid UPI ID (e.g., user@paytm)');
        return;
      }
    }

    setDepositing(true);
    try {
      await api.post('/wallet/deposit', { amount });
      await refreshUser();
      setDepositAmount('');
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setUpiId('');
      setShowPaymentModal(false);
      loadTransactions();
      Alert.alert('Success', 'Payment successful! Funds added to wallet');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Payment failed');
    } finally {
      setDepositing(false);
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.balanceCard}>
            <MaterialCommunityIcons name="wallet" size={48} color={theme.colors.primary} />
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceAmount}>${user?.wallet_balance?.toFixed(2) || '0.00'}</Text>
          </View>

          <View style={styles.depositCard}>
            <Text style={styles.depositTitle}>Add Funds</Text>
            <View style={styles.depositInput}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="decimal-pad"
              />
            </View>
            <TouchableOpacity
              style={styles.depositButton}
              onPress={handleDeposit}
              disabled={depositing}
            >
              {depositing ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.depositButtonText}>Add Funds</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Transaction History</Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet</Text>
          ) : (
            transactions.map((tx: any) => (
              <View key={tx.id} style={styles.transactionItem}>
                <MaterialCommunityIcons
                  name={tx.type === 'deposit' ? 'plus-circle' : 'minus-circle'}
                  size={24}
                  color={tx.type === 'deposit' ? theme.colors.success : theme.colors.error}
                />
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionType}>
                    {tx.type === 'deposit' ? 'Deposit' : 'Purchase'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.transactionAmount, tx.type === 'purchase' && styles.negativeAmount]}>
                  {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                </Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.glassLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: theme.spacing.lg },
  balanceCard: { alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  balanceLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  balanceAmount: { fontSize: 40, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.xs },
  depositCard: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  depositTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  depositInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassDark, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
  currencySymbol: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text, marginRight: theme.spacing.sm },
  input: { flex: 1, paddingVertical: theme.spacing.md, color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '600' },
  depositButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  depositButtonText: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  loader: { marginTop: theme.spacing.xl },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xl },
  transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  transactionInfo: { flex: 1, marginLeft: theme.spacing.md },
  transactionType: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text },
  transactionDate: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  transactionAmount: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.success },
  negativeAmount: { color: theme.colors.error },
  modalContainer: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.backgroundLight, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text },
  amountDisplay: { fontSize: theme.fontSize.xxl, fontWeight: '700', color: theme.colors.primary, textAlign: 'center', marginBottom: theme.spacing.lg },
  paymentMethodSelector: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  methodButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.glassLight, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  methodButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryLight },
  methodText: { fontSize: theme.fontSize.md, color: theme.colors.textMuted, fontWeight: '600' },
  methodTextActive: { color: theme.colors.text },
  paymentInput: { backgroundColor: theme.colors.glassLight, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, color: theme.colors.text, fontSize: theme.fontSize.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  row: { flexDirection: 'row', gap: theme.spacing.md },
  halfInput: { flex: 1 },
  payButton: { backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.md },
  payButtonText: { fontSize: theme.fontSize.lg, fontWeight: '600', color: theme.colors.text },
});
