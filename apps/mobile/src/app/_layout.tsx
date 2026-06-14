import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { ThemeProvider, useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'

function RootNavigator() {
  const { theme, themeId } = useTheme()
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/(auth)/login')
      } else {
        router.replace('/(tabs)')
      }
      setBooted(true)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/(auth)/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!booted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.pageBg }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style={themeId === 'violet' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  )
}
