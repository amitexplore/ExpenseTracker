import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase, supabaseWrite } from '@/lib/supabase'
import type { Profile } from '@tracker/db'
import { LogOut, DollarSign, Target, PiggyBank, Palette } from 'lucide-react-native'
import { useTheme } from '@/lib/ThemeContext'
import { THEMES } from '@/lib/theme'
import type { ThemeId } from '@/lib/theme'

export default function SettingsScreen() {
  const { theme, themeId, setTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [salary, setSalary] = useState('')
  const [currentSavings, setCurrentSavings] = useState('')
  const [accountBalanceStart, setAccountBalanceStart] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        const p = data as unknown as Profile
        setProfile(p)
        setSalary(String(p.monthly_salary ?? ''))
        setCurrentSavings(String(p.current_savings ?? ''))
        setAccountBalanceStart(String(p.account_balance_start ?? ''))
        setTargetAmount(String(p.target_amount ?? ''))
        setTargetDate(p.target_date ?? '')
      }
    } catch {
      Alert.alert('Error', 'Failed to load profile settings.')
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    const salaryVal = parseFloat(salary)
    const savingsVal = parseFloat(currentSavings)
    const balanceVal = parseFloat(accountBalanceStart)
    const targetVal = parseFloat(targetAmount)

    if (isNaN(salaryVal) || salaryVal < 0) {
      Alert.alert('Invalid Value', 'Monthly salary must be a positive number.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabaseWrite
        .from('profiles')
        .update({
          monthly_salary: salaryVal || 0,
          current_savings: savingsVal || 0,
          account_balance_start: balanceVal || 0,
          target_amount: targetVal || 0,
          target_date: targetDate || null,
        })
        .eq('id', user.id)

      if (error) throw error
      Alert.alert('Saved', 'Your settings have been updated.')
    } catch {
      Alert.alert('Error', 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
        },
      },
    ])
  }

  const themeIds: ThemeId[] = ['forest', 'violet']

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Settings</Text>

        {/* Income */}
        <SectionCard title="Income" icon={<DollarSign size={16} color={theme.accent} />} theme={theme}>
          <FieldRow label="Monthly Salary (₹)" theme={theme}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input.bg, borderColor: theme.input.border, color: theme.input.text }]}
              keyboardType="numeric"
              value={salary}
              onChangeText={setSalary}
              placeholder="e.g. 500000"
              placeholderTextColor={theme.input.placeholder}
            />
          </FieldRow>
        </SectionCard>

        {/* Savings & balance */}
        <SectionCard title="Savings & Balance" icon={<PiggyBank size={16} color={theme.positive} />} theme={theme}>
          <FieldRow label="Current Total Savings (₹)" theme={theme}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input.bg, borderColor: theme.input.border, color: theme.input.text }]}
              keyboardType="numeric"
              value={currentSavings}
              onChangeText={setCurrentSavings}
              placeholder="Your existing savings"
              placeholderTextColor={theme.input.placeholder}
            />
          </FieldRow>
          <FieldRow label="Opening Account Balance (₹)" theme={theme}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input.bg, borderColor: theme.input.border, color: theme.input.text }]}
              keyboardType="numeric"
              value={accountBalanceStart}
              onChangeText={setAccountBalanceStart}
              placeholder="Starting account balance"
              placeholderTextColor={theme.input.placeholder}
            />
          </FieldRow>
        </SectionCard>

        {/* Savings goal */}
        <SectionCard title="Savings Goal" icon={<Target size={16} color={theme.accent} />} theme={theme}>
          <FieldRow label="Target Amount (₹)" theme={theme}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input.bg, borderColor: theme.input.border, color: theme.input.text }]}
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="e.g. 4000000"
              placeholderTextColor={theme.input.placeholder}
            />
          </FieldRow>
          <FieldRow label="Target Date" theme={theme}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input.bg, borderColor: theme.input.border, color: theme.input.text }]}
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.input.placeholder}
            />
          </FieldRow>
        </SectionCard>

        {/* Theme picker */}
        <SectionCard title="App Theme" icon={<Palette size={16} color={theme.accent} />} theme={theme}>
          <View style={styles.themeRow}>
            {themeIds.map((id) => {
              const t = THEMES[id]
              const active = themeId === id
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.themeChip, {
                    backgroundColor: active ? t.accent : theme.chip.bg,
                    borderColor: active ? t.accent : theme.cardBorder,
                  }]}
                  onPress={() => setTheme(id)}
                >
                  <View style={[styles.themeSwatchLeft, { backgroundColor: t.pageBg }]} />
                  <View style={[styles.themeSwatchRight, { backgroundColor: t.cardBg }]} />
                  <Text style={[styles.themeChipText, { color: active ? '#fff' : theme.text.secondary }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </SectionCard>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.btn.primary.bg, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.saveBtnText, { color: theme.btn.primary.text }]}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Text>
        </TouchableOpacity>

        {/* Account info */}
        {profile?.full_name && (
          <Text style={[styles.accountInfo, { color: theme.text.muted }]}>
            Signed in as {profile.full_name}
          </Text>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={16} color={theme.negative} />
          <Text style={[styles.signOutText, { color: theme.negative }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function SectionCard({
  title, icon, theme, children,
}: {
  title: string
  icon: React.ReactNode
  theme: ReturnType<typeof useTheme>['theme']
  children: React.ReactNode
}) {
  return (
    <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function FieldRow({
  label, theme, children,
}: {
  label: string
  theme: ReturnType<typeof useTheme>['theme']
  children: React.ReactNode
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.label, { color: theme.text.secondary }]}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', padding: 20, paddingBottom: 8, letterSpacing: -0.5 },
  section: { borderRadius: 16, margin: 16, marginBottom: 0, padding: 18, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  fieldRow: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  themeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  themeChip: { flex: 1, borderWidth: 1, borderRadius: 14, overflow: 'hidden', alignItems: 'center', paddingBottom: 10 },
  themeSwatchLeft: { width: '50%', height: 36, position: 'absolute', top: 0, left: 0 },
  themeSwatchRight: { width: '50%', height: 36, position: 'absolute', top: 0, right: 0 },
  themeChipText: { fontSize: 12, fontWeight: '600', marginTop: 44 },
  saveBtn: { borderRadius: 14, paddingVertical: 15, margin: 16, marginTop: 20, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
  accountInfo: { textAlign: 'center', fontSize: 13, marginBottom: 4 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 16, marginBottom: 8 },
  signOutText: { fontSize: 14, fontWeight: '500' },
})
