import { Tabs } from 'expo-router'
import { LayoutDashboard, List, Settings } from 'lucide-react-native'
import { useTheme } from '@/lib/ThemeContext'

export default function TabLayout() {
  const { theme } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabBar.active,
        tabBarInactiveTintColor: theme.tabBar.inactive,
        tabBarStyle: {
          borderTopColor: theme.tabBar.borderTop,
          borderTopWidth: 1,
          backgroundColor: theme.tabBar.bg,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => <List color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  )
}
