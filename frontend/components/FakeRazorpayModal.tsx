import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

function onlyDigits(value) {
  return (value || '').replace(/\D/g, '');
}

function formatCardNumber(digits) {
  const clean = onlyDigits(digits).slice(0, 16);
  // 4-4-4-4 grouping
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function FakeRazorpayModal({ visible, amount, onCancel, onPay }) {
  const [cardDigits, setCardDigits] = useState('');
  const [name, setName] = useState('');

  const formattedCard = useMemo(() => formatCardNumber(cardDigits), [cardDigits]);
  const isValid = useMemo(() => onlyDigits(cardDigits).length === 16, [cardDigits]);

  const handleClose = () => {
    setCardDigits('');
    setName('');
    onCancel?.();
  };

  const handlePay = () => {
    const digits = onlyDigits(cardDigits);
    if (digits.length !== 16) return;
    onPay?.({ cardDigits: digits, name });
  };

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.headerRow}>
              <View style={styles.brandRow}>
                <View style={styles.logo}>
                  <MaterialCommunityIcons name="alpha-r" size={18} color={theme.colors.text} />
                </View>
                <Text style={styles.brandText}>Razorpay</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <MaterialCommunityIcons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.secureText}>Secure payment</Text>
            <Text style={styles.amountText}>Pay ${Number(amount || 0).toFixed(2)}</Text>

            <View style={styles.cardBox}>
              <View style={styles.cardBoxHeader}>
                <MaterialCommunityIcons name="credit-card" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.cardBoxTitle}>Card</Text>
                <Text style={styles.cardBoxHint}>TEST</Text>
              </View>

              <Text style={styles.label}>Card number</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="number-pad"
                value={formattedCard}
                onChangeText={(t) => setCardDigits(onlyDigits(t))}
                maxLength={19}
              />
              <Text style={styles.helper}>
                {isValid ? 'Valid card number' : 'Enter a valid 16-digit card number'}
              </Text>

              <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Name on card (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <TouchableOpacity
              style={[styles.payBtn, !isValid && styles.payBtnDisabled]}
              onPress={handlePay}
              disabled={!isValid}
            >
              <Text style={styles.payBtnText}>Pay now</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>This is a FAKE Razorpay test screen (no real payment).</Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.backgroundLight,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.text },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.glassLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  amountText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.xxl,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  cardBox: {
    backgroundColor: theme.colors.glassLight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardBoxTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text },
  cardBoxHint: {
    marginLeft: 'auto',
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  label: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.glassDark,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  helper: { marginTop: 8, fontSize: theme.fontSize.xs, color: theme.colors.textMuted },
  payBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { color: theme.colors.text, fontWeight: '800', fontSize: theme.fontSize.lg },
  footerText: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
