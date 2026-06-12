'use client'

import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

interface GmailConnection {
  gmail_address: string
  sync_status: string
  last_synced_at: string | null
  enabled: boolean
}

interface GmailConnectCardProps {
  connection: GmailConnection | null
}

export default function GmailConnectCard({ connection }: GmailConnectCardProps) {
  async function handleConnect() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/gmail/callback`,
        scopes: 'https://www.googleapis.com/auth/gmail.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  async function handleSync() {
    await fetch('/api/gmail/sync', { method: 'POST' })
    window.location.reload()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Mail className="w-5 h-5 text-red-500" />
        <h2 className="text-base font-semibold text-gray-900">Gmail Integration</h2>
      </div>

      {connection ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">{connection.gmail_address}</p>
              <p className="text-xs text-green-600">
                {connection.last_synced_at
                  ? `Last synced ${formatDistanceToNow(new Date(connection.last_synced_at))} ago`
                  : 'Never synced'}
              </p>
            </div>
            {connection.sync_status === 'syncing' && (
              <RefreshCw className="w-4 h-4 text-green-500 animate-spin" />
            )}
            {connection.sync_status === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>

          <p className="text-xs text-gray-400">
            Auto-imports orders from Amazon, Blinkit, Zepto, Swiggy, and Zomato.
          </p>

          <button
            onClick={handleSync}
            disabled={connection.sync_status === 'syncing'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Sync now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Connect your Gmail to automatically import order confirmations from Blinkit, Zepto, Amazon, and more.
          </p>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Read-only access — we never send emails on your behalf
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Only order confirmation emails are scanned
            </div>
          </div>
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect Gmail
          </button>
        </div>
      )}
    </div>
  )
}
