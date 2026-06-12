import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { formatINR, MONTH_SHORT, computeSavingsProgress, getCumulativeSavings, calcAvgMonthlySavings } from '@tracker/core'
import type { MonthlySnapshot, Profile } from '@tracker/db'
import { TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react-native'
import { format } from 'date-fns'

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('monthly_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(24),
    ])

    setProfile(p)
    setSnapshots(s ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const currentSnap = snapshots.find((s) => s.year === currentYear && s.month === currentMonth)
  const yearSnapshots = snapshots.filter((s) => s.year === currentYear)
  const cumulativeSavings = getCumulativeSavings(snapshots)
  const avgSavings = calcAvgMonthlySavings(snapshots)
  const progress = computeSavingsProgress(
    profile?.target_amount ?? 0,
    profile?.target_date ?? null,
    cumulativeSavings,
    avgSavings,
  )
  const pct = Math.min(100, Math.max(0, progress.percentageAchieved))

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 80 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋</Text>
            <Text style={styles.subtext}>{format(now, 'MMMM yyyy')}</Text>
          </View>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>₹</Text>
          </View>
        </View>

        {/* Current month card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This Month</Text>
          <Text style={styles.bigAmount}>{formatINR(currentSnap?.end_balance ?? 0)}</Text>
          <Text style={styles.cardSubLabel}>Closing Balance</Text>

          <View style={styles.row}>
            <View style={styles.statBox}>
              <TrendingUp size={14} color="#22c55e" />
              <Text style={styles.statLabel}>Income</Text>
              <Text style={[styles.statAmount, { color: '#22c55e' }]}>
                {formatINR((currentSnap?.salary ?? 0) + (currentSnap?.total_deposits ?? 0))}
              </Text>
            </View>
            <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' }]}>
              <TrendingDown size={14} color="#ef4444" />
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={[styles.statAmount, { color: '#ef4444' }]}>
                {formatINR((currentSnap?.total_fixed_expenses ?? 0) + (currentSnap?.total_variable_expenses ?? 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* Savings progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings Goal</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Target size={16} color={progress.onTrack ? '#22c55e' : '#f97316'} />
              <Text style={[styles.onTrack, { color: progress.onTrack ? '#22c55e' : '#f97316' }]}>
                {progress.onTrack ? 'On Track' : 'Behind Target'}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: `${pct}%` as any,
                backgroundColor: progress.onTrack ? '#22c55e' : '#f97316',
              }]} />
            </View>
            <View style={styles.row}>
              <Text style={styles.progressLabel}>{formatINR(cumulativeSavings)} saved</Text>
              <Text style={styles.progressLabel}>{pct.toFixed(1)}% of {formatINR(profile?.target_amount ?? 0)}</Text>
            </View>
            {progress.monthsRemaining !== null && progress.monthsRemaining > 0 && (
              <Text style={styles.cardSubLabel}>
                {progress.monthsRemaining} months to goal
              </Text>
            )}
          </View>
        </View>

        {/* Monthly mini-grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{currentYear} Overview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
            {Array.from({ length: 12 }, (_, i) => {
              const s = yearSnapshots.find((sn) => sn.month === i + 1)
              const isCurrentMonth = i + 1 === currentMonth
              return (
                <View key={i} style={[styles.monthChip, isCurrentMonth && styles.monthChipActive]}>
                  <Text style={[styles.monthLabel, isCurrentMonth && styles.monthLabelActive]}>
                    {MONTH_SHORT[i]}
                  </Text>
                  {s ? (
                    <Text style={[styles.monthAmount, { color: s.end_balance >= 0 ? '#22c55e' : '#ef4444' }]}>
                      {formatINR(s.end_balance, true)}
                    </Text>
                  ) : (
                    <Text style={styles.monthEmpty}>—</Text>
                  )}
                </View>
              )
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtext: { fontSize: 14, color: '#9ca3af', marginTop: 2 },
  logoBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },
  bigAmount: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 2 },
  cardSubLabel: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 4 },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  statAmount: { fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  onTrack: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  progressBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginVertical: 10 },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#6b7280', flex: 1 },
  monthScroll: { paddingVertical: 4 },
  monthChip: { alignItems: 'center', marginRight: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 12, minWidth: 64, shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  monthChipActive: { backgroundColor: '#16a34a' },
  monthLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', marginBottom: 4 },
  monthLabelActive: { color: '#ffffff' },
  monthAmount: { fontSize: 11, fontWeight: '700' },
  monthEmpty: { fontSize: 11, color: '#d1d5db' },
})
