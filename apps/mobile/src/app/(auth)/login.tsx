import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignup, setIsSignup] = useState(false)

  async function handleAuth() {
    setLoading(true)
    setError(null)

    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError('Check your email for a confirmation link.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.replace('/(tabs)')
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>₹</Text>
        </View>
        <Text style={styles.title}>ExpenseTracker</Text>
        <Text style={styles.subtitle}>Your personal finance dashboard</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Email address"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignup(!isSignup)} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 32, color: '#fff', fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9ca3af', marginBottom: 36 },
  form: { width: '100%', gap: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, backgroundColor: '#fff' },
  error: { fontSize: 13, color: '#dc2626', textAlign: 'center', paddingHorizontal: 4 },
  btn: { backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: { alignItems: 'center', paddingVertical: 8 },
  toggleText: { fontSize: 14, color: '#16a34a', fontWeight: '500' },
})
