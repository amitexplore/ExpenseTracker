import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, Alert, StyleSheet, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase, supabaseWrite } from '@/lib/supabase'
import { formatINR } from '@tracker/core'
import { format } from 'date-fns'
import { Plus, X, Check } from 'lucide-react-native'
import type { Transaction, ExpenseCategory } from '@tracker/db'
import { useTheme } from '@/lib/ThemeContext'

const PAGE_SIZE = 30

type TxWithCat = Pick<Transaction, 'id' | 'amount' | 'date' | 'merchant' | 'description' | 'is_income' | 'source'> & {
  expense_categories: Pick<ExpenseCategory, 'name' | 'color'> | null
}

export default function TransactionsScreen() {
  const { theme } = useTheme()
  const [transactions, setTransactions] = useState<TxWithCat[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const cursorRef = useRef<string | null>(null)

  const fetchPage = useCallback(async (after: string | null, append: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('transactions')
      .select('id,amount,date,merchant,description,is_income,source,expense_categories(name,color)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(PAGE_SIZE)

    if (after) {
      query = query.lt('date', after)
    }

    const { data } = await query

    if (data && data.length > 0) {
      const items = data as TxWithCat[]
      cursorRef.current = items[items.length - 1].date
      setHasMore(items.length === PAGE_SIZE)
      setTransactions((prev) => append ? [...prev, ...items] : items)
    } else {
      setHasMore(false)
      if (!append) setTransactions([])
    }
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      cursorRef.current = null

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [, { data: cats }] = await Promise.all([
        fetchPage(null, false),
        supabase
          .from('expense_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order'),
      ])
      setCategories(cats ?? [])
    } catch {
      Alert.alert('Error', 'Failed to load transactions.')
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  useEffect(() => { load() }, [load])

  async function loadMore() {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    await fetchPage(cursorRef.current, true)
    setLoadingMore(false)
  }

  const renderItem = ({ item }: { item: TxWithCat }) => (
    <View style={[styles.txRow, { borderBottomColor: theme.separator }]}>
      <View style={[styles.txDot, { backgroundColor: ((item.expense_categories?.color ?? '#94a3b8') + '25') }]}>
        <View style={[styles.txDotInner, { backgroundColor: item.expense_categories?.color ?? theme.text.muted }]} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txMerchant, { color: theme.text.primary }]} numberOfLines={1}>
          {item.merchant ?? item.description ?? 'Unknown'}
        </Text>
        <Text style={[styles.txMeta, { color: theme.text.muted }]}>
          {format(new Date(item.date), 'dd MMM yyyy')}
          {item.expense_categories ? `  ·  ${item.expense_categories.name}` : ''}
          {item.source === 'gmail' ? '  ·  📧' : ''}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: item.is_income ? theme.positive : theme.negative }]}>
        {item.is_income ? '+' : '-'}{formatINR(item.amount)}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[styles.header, { borderBottomColor: theme.separator }]}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Transactions</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.btn.primary.bg }]}
          onPress={() => setShowAdd(true)}
        >
          <Plus size={18} color={theme.btn.primary.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.text.muted }]}>No transactions yet</Text>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={[styles.loadMore, { borderColor: theme.cardBorder }]}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <ActivityIndicator size="small" color={theme.accent} />
                  : <Text style={[styles.loadMoreText, { color: theme.accent }]}>Load more</Text>
                }
              </TouchableOpacity>
            ) : null
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
  const { theme } = useTheme()
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [isIncome, setIsIncome] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const val = parseFloat(amount)
    if (!val || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabaseWrite.from('transactions').insert({
        user_id: user.id,
        amount: val,
        date,
        merchant: merchant.trim() || null,
        source: 'manual',
        category_id: categoryId,
        is_income: isIncome,
      })

      if (error) throw error

      setAmount(''); setMerchant(''); setCategoryId(null); setIsIncome(false)
      onAdded()
    } catch {
      Alert.alert('Error', 'Failed to save transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <View style={[m.header, { borderBottomColor: theme.separator }]}>
          <Text style={[m.title, { color: theme.text.primary }]}>Add Transaction</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={m.form}>
          <Text style={[m.label, { color: theme.text.secondary }]}>Amount (₹)</Text>
          <TextInput
            style={[m.input, { backgroundColor: theme.input.bg, borderColor: theme.input.border, color: theme.input.text }]}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.input.placeholder}
          />

          <Text style={[m.label, { color: theme.text.secondary }]}>Merchant</Text>
          <TextInput
            style={[m.input, { backgroundColor: theme.input.bg, borderColor: theme.input.border, color: theme.input.text }]}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="e.g. Blinkit, Amazon"
            placeholderTextColor={theme.input.placeholder}
          />

          <Text style={[m.label, { color: theme.text.secondary }]}>Date</Text>
          <TextInput
            style={[m.input, { backgroundColor: theme.input.bg, borderColor: theme.input.border, color: theme.input.text }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.input.placeholder}
          />

          <Text style={[m.label, { color: theme.text.secondary }]}>Type</Text>
          <View style={m.typeRow}>
            <TouchableOpacity
              style={[m.typeBtn, {
                backgroundColor: !isIncome ? theme.negative : theme.input.bg,
                borderColor: !isIncome ? theme.negative : theme.input.border,
              }]}
              onPress={() => setIsIncome(false)}
            >
              <Text style={[m.typeBtnText, { color: !isIncome ? '#fff' : theme.text.secondary }]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.typeBtn, {
                backgroundColor: isIncome ? theme.positive : theme.input.bg,
                borderColor: isIncome ? theme.positive : theme.input.border,
              }]}
              onPress={() => setIsIncome(true)}
            >
              <Text style={[m.typeBtnText, { color: isIncome ? '#fff' : theme.text.secondary }]}>Income</Text>
            </TouchableOpacity>
          </View>

          {categories.length > 0 && (
            <>
              <Text style={[m.label, { color: theme.text.secondary }]}>Category</Text>
              <View style={m.catGrid}>
                {categories.map((cat) => {
                  const selected = categoryId === cat.id
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[m.catChip, {
                        backgroundColor: selected ? cat.color + '30' : theme.input.bg,
                        borderColor: selected ? cat.color : theme.input.border,
                      }]}
                      onPress={() => setCategoryId(selected ? null : cat.id)}
                    >
                      {selected && <Check size={12} color={cat.color} style={{ marginRight: 4 }} />}
                      <View style={[m.catDot, { backgroundColor: cat.color }]} />
                      <Text style={[m.catText, { color: selected ? cat.color : theme.text.secondary }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[m.saveBtn, { backgroundColor: theme.btn.primary.bg, opacity: loading ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={[m.saveBtnText, { color: theme.btn.primary.text }]}>
            {loading ? 'Saving…' : 'Save Transaction'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1 },
  txDot: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txDotInner: { width: 10, height: 10, borderRadius: 5 },
  txInfo: { flex: 1, minWidth: 0 },
  txMerchant: { fontSize: 14, fontWeight: '500' },
  txMeta: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '600', flexShrink: 0 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15 },
  loadMore: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginHorizontal: 20, marginTop: 16 },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
})

const m = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  form: { padding: 20, paddingBottom: 100 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  typeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  typeBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  catText: { fontSize: 13, fontWeight: '500' },
  saveBtn: { margin: 20, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
})
