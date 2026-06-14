import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { THEMES, DEFAULT_THEME, type ThemeId, type MobileTheme } from './theme'

const THEME_KEY = 'app_theme'

interface ThemeContextValue {
  theme: MobileTheme
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES[DEFAULT_THEME],
  themeId: DEFAULT_THEME,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME)

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'forest' || stored === 'violet') {
        setThemeId(stored)
      }
    })
  }, [])

  function setTheme(id: ThemeId) {
    setThemeId(id)
    AsyncStorage.setItem(THEME_KEY, id)
  }

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeId], themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
