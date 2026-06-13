import { NextResponse } from 'next/server'

export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()

  const urlPreview = url ? url.slice(0, 40) + '...' : 'MISSING'

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Missing env vars', urlPreview })
  }

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json({ ok: true, status: res.status, urlPreview, emailEnabled: data.external?.email })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: String(e.message ?? e),
      urlPreview,
    })
  }
}
