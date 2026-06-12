import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'

const SYNC_TASK_NAME = 'gmail-background-sync'

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return BackgroundFetch.BackgroundFetchResult.NoData

    // Trigger the sync via the API
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/gmail/sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) return BackgroundFetch.BackgroundFetchResult.Failed

    const data = await res.json()

    if (data.imported > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💳 New expenses detected',
          body: `${data.imported} new transaction${data.imported > 1 ? 's' : ''} imported from Gmail`,
        },
        trigger: null,
      })
    }

    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

export async function registerBackgroundSync(intervalMinutes: number) {
  const status = await BackgroundFetch.getStatusAsync()

  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn('Background fetch is not available')
    return
  }

  await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
    minimumInterval: intervalMinutes * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  })
}

export async function unregisterBackgroundSync() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME)
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME)
  }
}
