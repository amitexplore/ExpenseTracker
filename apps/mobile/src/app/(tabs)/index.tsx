import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase, supabaseWrite } from '@/lib/supabase'
import { formatINR, MONTH_SHORT, computeSavingsProgress } from '@tracker/core'
import type { MonthlySnapshot, Profile } from '@tracker/db'
import {
  TrendingUp, TrendingDown, Target, Wallet, PiggyBank,
  ArrowRightLeft, Palette, ChevronLeft, ChevronRight,
} from 'lucide-react-native'
import { format } from 'date-fns'
import { useTheme } from '@/lib/ThemeContext'
import type { ThemeId } from '@/lib/theme'
import { THEMES } from '@/lib/theme'

export default function HomeScreen() {
  const { theme, themeId, setTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: p }, { data: s }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,currency,monthly_salary,current_savings,account_balance_start,target_amount,target_date,full_name')
          .eq('id', user.id)
          .single(),
        supabase
          .from('monthly_snapshots')
          .select('id,user_id,year,month,starting_balance,salary,total_deposits,total_fixed_expenses,total_variable_expenses,end_balance')
          .eq('user_id', user.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(36),
      ])

      setProfile((p ?? null) as Profile | null)
      setSnapshots((s ?? []) as MonthlySnapshot[])
    } catch {
      Alert.alert('Error', 'Failed to load dashboard data. Please pull to refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const yearSnapshots = useMemo(
    () => snapshots.filter((s) => s.year === year),
    [snapshots, year],
  )

  const currentSnap = useMemo(
    () => snapshots.find((s) => s.year === currentYear && s.month === currentMonth),
    [snapshots, currentYear, currentMonth],
  )

  const accountBalance = useMemo(() => {
    const confirmedSnaps = snapshots.filter((s) => !(s.year === currentYear && s.month > currentMonth))
    if (confirmedSnaps.length === 0) return profile?.account_balance_start ?? 0
    const latest = confirmedSnaps[0]
    return latest?.end_balance ?? profile?.account_balance_start ?? 0
  }, [snapshots, profile, currentYear, currentMonth])

  const totalSavings = profile?.current_savings ?? 0

  const savingsProgress = useMemo(() => {
    if (!profile) return null
    return computeSavingsProgress(
      profile.target_amount ?? 0,
      profile.target_date ?? null,
      totalSavings,
      0,
    )
  }, [profile, totalSavings])

  const pct = useMemo(
    () => Math.min(100, Math.max(0, savingsProgress?.percentageAchieved ?? 0)),
    [savingsProgress],
  )

  const availableYears = useMemo(() => {
    const yrs = new Set(snapshots.map((s) => s.year))
    yrs.add(currentYear)
    return Array.from(yrs).sort((a, b) => b - a)
  }, [snapshots, currentYear])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.pageBg }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    )
  }

  const monthlyIncome = (currentSnap?.salary ?? 0) + (currentSnap?.total_deposits ?? 0)
  const monthlyExpenses = (currentSnap?.total_fixed_expenses ?? 0) + (currentSnap?.total_variable_expenses ?? 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: theme.separator }]}>
          <View>
            <Text style={[styles.greeting, { color: theme.text.primary }]}>
              Hello, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={[styles.subtext, { color: theme.text.muted }]}>
              {format(now, 'MMMM yyyy')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: theme.accentBg, borderColor: theme.cardBorder }]}
            onPress={() => setTheme(themeId === 'forest' ? 'violet' : 'forest')}
          >
            <Palette size={16} color={theme.accent} />
            <Text style={[styles.themeBtnText, { color: theme.accent }]}>
              {THEMES[themeId === 'forest' ? 'violet' : 'forest'].name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Balance cards row ── */}
        <View style={styles.balanceRow}>
          <View style={[styles.balanceCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={[styles.balanceIcon, { backgroundColor: theme.accentBg }]}>
              <Wallet size={16} color={theme.accent} />
            </View>
            <Text style={[styles.balanceLabel, { color: theme.text.muted }]}>Account Balance</Text>
            <Text style={[styles.balanceAmount, { color: theme.text.primary }]}>
              {formatINR(accountBalance)}
            </Text>
          </View>

          <View style={[styles.balanceCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={[styles.balanceIcon, { backgroundColor: theme.badge.successBg }]}>
              <PiggyBank size={16} color={theme.positive} />
            </View>
            <Text style={[styles.balanceLabel, { color: theme.text.muted }]}>Total Savings</Text>
            <Text style={[styles.balanceAmount, { color: theme.positive }]}>
              {formatINR(totalSavings)}
            </Text>
          </View>
        </View>

        {/* ── Transfer funds button ── */}
        <TouchableOpacity
          style={[styles.transferBtn, { backgroundColor: theme.accentBg, borderColor: theme.cardBorder }]}
          onPress={() => setShowTransfer(true)}
        >
          <ArrowRightLeft size={16} color={theme.accent} />
          <Text style={[styles.transferBtnText, { color: theme.accent }]}>Transfer to Savings</Text>
        </TouchableOpacity>

        {/* ── This month ── */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardLabel, { color: theme.text.muted }]}>This Month</Text>
          <View style={styles.cardRow}>
            <View style={[styles.statBox, { borderRightColor: theme.separator }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.badge.successBg }]}>
                <TrendingUp size={13} color={theme.positive} />
              </View>
              <Text style={[styles.statLabel, { color: theme.text.muted }]}>Income</Text>
              <Text style={[styles.statAmount, { color: theme.positive }]}>{formatINR(monthlyIncome)}</Text>
            </View>
            <View style={styles.statBox}>
              <View style={[styles.statIcon, { backgroundColor: theme.btn.danger.bg }]}>
                <TrendingDown size={13} color={theme.negative} />
              </View>
              <Text style={[styles.statLabel, { color: theme.text.muted }]}>Expenses</Text>
              <Text style={[styles.statAmount, { color: theme.negative }]}>{formatINR(monthlyExpenses)}</Text>
            </View>
          </View>
        </View>

        {/* ── Savings goal ── */}
        {savingsProgress && (
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.cardHeaderRow}>
              <Target size={16} color={savingsProgress.onTrack ? theme.positive : theme.accent} />
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Savings Goal</Text>
              <View style={[styles.badge, {
                backgroundColor: savingsProgress.onTrack ? theme.badge.successBg : theme.badge.warningBg,
              }]}>
                <Text style={[styles.badgeText, {
                  color: savingsProgress.onTrack ? theme.badge.successText : theme.badge.warningText,
                }]}>
                  {savingsProgress.onTrack ? 'On Track' : 'Behind Target'}
                </Text>
              </View>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: theme.progressBar.track }]}>
              <View style={[styles.progressFill, {
                width: `${pct}%` as `${number}%`,
                backgroundColor: savingsProgress.onTrack ? theme.progressBar.fill : theme.progressBar.fillAlt,
              }]} />
            </View>

            <View style={styles.progressLabels}>
              <Text style={[styles.progressText, { color: theme.text.secondary }]}>
                {formatINR(totalSavings)} saved
              </Text>
              <Text style={[styles.progressText, { color: theme.text.secondary }]}>
                {pct.toFixed(1)}% of {formatINR(profile?.target_amount ?? 0)}
              </Text>
            </View>

            {savingsProgress.monthsRemaining !== null && savingsProgress.monthsRemaining > 0 && (
              <Text style={[styles.months, { color: theme.text.muted }]}>
                {savingsProgress.monthsRemaining} months to goal
              </Text>
            )}
          </View>
        )}

        {/* ── Year selector + monthly grid ── */}
        <View style={styles.yearHeader}>
          <TouchableOpacity
            onPress={() => setYear((y) => y - 1)}
            disabled={!availableYears.includes(year - 1)}
            style={{ opacity: availableYears.includes(year - 1) ? 1 : 0.3 }}
          >
            <ChevronLeft size={20} color={theme.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: theme.text.primary }]}>{year} Overview</Text>
          <TouchableOpacity
            onPress={() => setYear((y) => y + 1)}
            disabled={year >= currentYear}
            style={{ opacity: year < currentYear ? 1 : 0.3 }}
          >
            <ChevronRight size={20} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, paddingBottom: 8 }}>
          {Array.from({ length: 12 }, (_, i) => {
            const snap = yearSnapshots.find((sn) => sn.month === i + 1)
            const isCurrentMonth = i + 1 === currentMonth && year === currentYear
            const isFuture = year === currentYear && i + 1 > currentMonth

            return (
              <View
                key={i}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: isCurrentMonth ? theme.chip.activeBg : theme.chip.bg,
                    borderColor: isCurrentMonth ? theme.chip.activeBg : theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.monthLabel, { color: isCurrentMonth ? theme.chip.activeText : theme.text.muted }]}>
                  {MONTH_SHORT[i]}
                </Text>
                {snap ? (
                  <Text style={[styles.monthAmount, {
                    color: snap.end_balance >= 0 ? theme.positive : theme.negative,
                    opacity: isFuture ? 0.5 : 1,
                  }]}>
                    {formatINR(snap.end_balance, true)}
                  </Text>
                ) : isFuture && profile?.monthly_salary ? (
                  <Text style={[styles.monthAmount, { color: theme.text.muted }]}>
                    {formatINR(profile.monthly_salary, true)}
                  </Text>
                ) : (
                  <Text style={[styles.monthEmpty, { color: theme.text.muted }]}>—</Text>
                )}
              </View>
            )
          })}
        </ScrollView>

        <View style={{ height: 24 }} />
      </ScrollView>

      <TransferModal
        visible={showTransfer}
        accountBalance={accountBalance}
        onClose={() => setShowTransfer(false)}
        onDone={async () => {
          setShowTransfer(false)
          await load()
        }}
        theme={theme}
      />
    </SafeAreaView>
  )
}

function TransferModal({
  visible, accountBalance, onClose, onDone, theme,
}: {
  visible: boolean
  accountBalance: number
  onClose: () => void
  onDone: () => Promise<void>
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleTransfer() {
    const val = parseFloat(amount)
    if (!val || val <= 0) {
      Alert.alert('Invalid Amount', 'Enter a positive number.')
      return
    }
    if (val > accountBalance) {
      Alert.alert('Insufficient Balance', 'Transfer amount exceeds your account balance.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('current_savings,account_balance_start')
        .eq('id', user.id)
        .single()
      if (!prof) throw new Error('Profile not found')

      const [{ error: txErr }, { error: profErr }] = await Promise.all([
        supabaseWrite.from('transactions').insert({
          user_id: user.id,
          amount: val,
          date: new Date().toISOString().split('T')[0],
          merchant: 'Transfer to Savings',
          description: 'Funds transferred to savings pot',
          is_income: false,
          source: 'manual',
        }),
        supabaseWrite.from('profiles').update({
          current_savings: ((prof as { current_savings: number | null }).current_savings ?? 0) + val,
        }).eq('id', user.id),
      ])

      if (txErr || profErr) throw new Error('Transfer failed')

      Alert.alert('Success', `${formatINR(val)} transferred to savings.`)
      setAmount('')
      await onDone()
    } catch {
      Alert.alert('Error', 'Transfer failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <View style={[mStyles.header, { borderBottomColor: theme.separator }]}>
          <Text style={[mStyles.title, { color: theme.text.primary }]}>Transfer to Savings</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[mStyles.close, { color: theme.text.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={mStyles.body}>
          <Text style={[mStyles.available, { color: theme.text.secondary }]}>
            Available: {formatINR(accountBalance)}
          </Text>

          <Text style={[mStyles.label, { color: theme.text.secondary }]}>Amount (₹)</Text>
          <TextInput
            style={[mStyles.input, {
              backgroundColor: theme.input.bg,
              borderColor: theme.input.border,
              color: theme.input.text,
            }]}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            placeholderTextColor={theme.input.placeholder}
          />

          <TouchableOpacity
            style={[mStyles.btn, { backgroundColor: theme.btn.primary.bg, opacity: loading ? 0.6 : 1 }]}
            onPress={handleTransfer}
            disabled={loading}
          >
            <ArrowRightLeft size={16} color={theme.btn.primary.text} />
            <Text style={[mStyles.btnText, { color: theme.btn.primary.text }]}>
              {loading ? 'Transferring…' : 'Transfer Funds'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  greeting: { fontSize: 22, fontWeight: '700' },
  subtext: { fontSize: 14, marginTop: 2 },
  themeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  themeBtnText: { fontSize: 12, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 16, marginBottom: 4 },
  balanceCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14 },
  balanceIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  balanceLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  balanceAmount: { fontSize: 17, fontWeight: '800' },
  transferBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginVertical: 10, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  transferBtnText: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 16, borderWidth: 1 },
  cardLabel: { fontSize: 11, fontWeight: '500', marginBottom: 10 },
  cardRow: { flexDirection: 'row' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 5, borderRightWidth: 1 },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 11 },
  statAmount: { fontSize: 14, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  progressTrack: { height: 7, borderRadius: 4, marginVertical: 10, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12 },
  months: { fontSize: 12, marginTop: 6, textAlign: 'center' },
  yearHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8, marginBottom: 10 },
  yearText: { fontSize: 15, fontWeight: '700' },
  monthChip: { alignItems: 'center', marginRight: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, minWidth: 64, borderWidth: 1 },
  monthLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  monthAmount: { fontSize: 10, fontWeight: '700' },
  monthEmpty: { fontSize: 10 },
})

const mStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  close: { fontSize: 15 },
  body: { padding: 24, gap: 12 },
  available: { fontSize: 14, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontWeight: '600' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: '700' },
})
