import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@tracker/core'
import { format } from 'date-fns'
import { Plus, X, Mail, PenLine } from 'lucide-react-native'
import type { Transaction, ExpenseCategory } from '@tracker/db'

type TxWithCat = Transaction & {
  expense_categories: Pick<ExpenseCategory, 'name' | 'color'> | null
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<TxWithCat[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: txs }, { data: cats }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, expense_categories(name, color)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100),
      supabase
        .from('expense_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order'),
    ])

    setTransactions((txs as TxWithCat[]) ?? [])
    setCategories(cats ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const renderItem = ({ item }: { item: TxWithCat }) => (
    <View style={styles.txRow}>
      <View style={[styles.txDot, { backgroundColor: (item.expense_categories?.color ?? '#94a3b8') + '30' }]}>
        <View style={[styles.txDotInner, { backgroundColor: item.expense_categories?.color ?? '#94a3b8' }]} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant}>{item.merchant ?? item.description ?? 'Unknown'}</Text>
        <Text style={styles.txMeta}>
          {format(new Date(item.date), 'dd MMM yyyy')}
          {item.expense_categories ? `  ·  ${item.expense_categories.name}` : ''}
          {item.source === 'gmail' ? '  ·  📧' : ''}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: item.is_income ? '#22c55e' : '#ef4444' }]}>
        {item.is_income ? '+' : '-'}{formatINR(item.amount)}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No transactions yet</Text>
          }
        />
      )}

      <AddTransactionModal
        visible={showAdd}
        categories={categories}
        onClose={() => setShowAdd(false)}
        onAdded={() => { setShowAdd(false); load() }}
      />
    </SafeAreaView>
  )
}

function AddTransactionModal({
  visible, categories, onClose, onAdded,
}: {
  visible: boolean
  categories: ExpenseCategory[]
  onClose: () => void
  onAdded: () => void
}) {
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [isIncome, setIsIncome] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!amount) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('transactions').insert({
      user_id: user.id,
      amount: parseFloat(amount),
      date,
      merchant: merchant || null,
      source: 'manual',
      category_id: categoryId,
      is_income: isIncome,
    })

    setAmount(''); setMerchant(''); setCategoryId(null); setIsIncome(false)
    setLoading(false)
    onAdded()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Add Transaction</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={modalStyles.form}>
          <Text style={modalStyles.label}>Amount (₹)</Text>
          <TextInput
            style={modalStyles.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
          />

          <Text style={modalStyles.label}>Merchant</Text>
          <TextInput
            style={modalStyles.input}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="e.g. Blinkit, Amazon"
          />

          <Text style={modalStyles.label}>Date</Text>
          <TextInput
            style={modalStyles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />

          <Text style={modalStyles.label}>Type</Text>
          <View style={modalStyles.typeRow}>
            <TouchableOpacity
              style={[modalStyles.typeBtn, !isIncome && modalStyles.typeBtnActive]}
              onPress={() => setIsIncome(false)}
            >
              <Text style={[modalStyles.typeBtnText, !isIncome && { color: '#fff' }]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.typeBtn, isIncome && { backgroundColor: '#22c55e' }]}
              onPress={() => setIsIncome(true)}
            >
              <Text style={[modalStyles.typeBtnText, isIncome && { color: '#fff' }]}>Income</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[modalStyles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={modalStyles.saveBtnText}>{loading ? 'Saving...' : 'Save Transaction'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  addBtn: { backgroundColor: '#16a34a', width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  txDot: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txDotInner: { width: 10, height: 10, borderRadius: 5 },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 14, fontWeight: '500', color: '#111827' },
  txMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#f8fafc' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60 },
})

const modalStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: '600', color: '#111827' },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#fafafa' },
  typeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  typeBtnText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  saveBtn: { margin: 20, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
