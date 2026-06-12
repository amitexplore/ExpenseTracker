import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { SYNC_INTERVAL_OPTIONS } from '@tracker/core'
import type { Profile } from '@tracker/db'
import { LogOut, Clock, Target, DollarSign } from 'lucide-react-native'

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [salary, setSalary] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [syncInterval, setSyncInterval] = useState(60)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setSalary(String(data.monthly_salary))
      setTargetAmount(String(data.target_amount))
      setTargetDate(data.target_date ?? '')
      setSyncInterval(data.sync_interval_minutes)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      monthly_salary: parseFloat(salary) || 0,
      target_amount: parseFloat(targetAmount) || 0,
      target_date: targetDate || null,
      sync_interval_minutes: syncInterval,
    }).eq('id', user.id)
    setSaving(false)
    Alert.alert('Saved', 'Your settings have been updated.')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Settings</Text>

        {/* Income & Target */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={16} color="#16a34a" />
            <Text style={styles.sectionTitle}>Income & Savings Target</Text>
          </View>

          <Text style={styles.label}>Monthly Salary (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={salary}
            onChangeText={setSalary}
            placeholder="500000"
          />

          <Text style={styles.label}>Target Amount (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholder="4000000"
          />

          <Text style={styles.label}>Target Date</Text>
          <TextInput
            style={styles.input}
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Sync interval */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Auto-sync Interval</Text>
          </View>
          <Text style={styles.hint}>How often to check Gmail for new orders</Text>
          <View style={styles.chipRow}>
            {SYNC_INTERVAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, syncInterval === opt.value && styles.chipActive]}
                onPress={() => setSyncInterval(opt.value)}
              >
                <Text style={[styles.chipText, syncInterval === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={16} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 8 },
  section: { backgroundColor: '#fff', borderRadius: 16, margin: 16, marginBottom: 0, padding: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, backgroundColor: '#fafafa' },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa' },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 15, margin: 16, marginTop: 20, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 16, marginBottom: 32 },
  signOutText: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
})
