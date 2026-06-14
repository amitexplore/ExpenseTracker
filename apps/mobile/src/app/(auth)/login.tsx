import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'
import { useTheme } from '@/lib/ThemeContext'
import { Lock, Mail } from 'lucide-react-native'

export default function LoginScreen() {
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignup, setIsSignup] = useState(false)

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError(null)

    if (isSignup) {
      const { error: signUpErr } = await supabase.auth.signUp({ email: email.trim(), password })
      if (signUpErr) {
        setError(signUpErr.message)
      } else {
        setError('Check your email for a confirmation link.')
      }
    } else {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInErr) {
        setError('Invalid email or password. Please try again.')
      } else {
        router.replace('/(tabs)')
      }
    }
    setLoading(false)
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.pageBg },
    inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
    logoBox: {
      width: 72, height: 72, borderRadius: 22,
      backgroundColor: theme.accent,
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    logoText: { fontSize: 34, color: theme.btn.primary.text, fontWeight: '800' },
    title: { fontSize: 28, fontWeight: '800', color: theme.text.primary, marginBottom: 4, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: theme.text.muted, marginBottom: 40 },
    form: { width: '100%', gap: 12 },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: theme.input.border, borderRadius: 14,
      backgroundColor: theme.input.bg, paddingHorizontal: 16, paddingVertical: 4,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1, paddingVertical: 14, fontSize: 16,
      color: theme.input.text,
    },
    error: {
      fontSize: 13, textAlign: 'center', paddingHorizontal: 4,
      color: isSignup && error?.startsWith('Check') ? theme.positive : theme.negative,
      backgroundColor: isSignup && error?.startsWith('Check') ? theme.badge.successBg : theme.btn.danger.bg,
      borderRadius: 10, padding: 12,
    },
    btn: {
      backgroundColor: theme.btn.primary.bg,
      borderRadius: 14, paddingVertical: 17,
      alignItems: 'center', marginTop: 4,
    },
    btnText: { color: theme.btn.primary.text, fontSize: 16, fontWeight: '700' },
    toggle: { alignItems: 'center', paddingVertical: 10 },
    toggleText: { fontSize: 14, color: theme.accent, fontWeight: '500' },
  })

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
          <View style={s.logoBox}>
            <Text style={s.logoText}>₹</Text>
          </View>
          <Text style={s.title}>ExpenseTracker</Text>
          <Text style={s.subtitle}>Your personal finance dashboard</Text>

          <View style={s.form}>
            <View style={s.inputWrap}>
              <Mail size={18} color={theme.text.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="Email address"
                placeholderTextColor={theme.input.placeholder}
              />
            </View>

            <View style={s.inputWrap}>
              <Lock size={18} color={theme.text.muted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor={theme.input.placeholder}
              />
            </View>

            {error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              style={[s.btn, loading && { opacity: 0.6 }]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={s.btnText}>
                {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setIsSignup(!isSignup); setError(null) }} style={s.toggle}>
              <Text style={s.toggleText}>
                {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
