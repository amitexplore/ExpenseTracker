import { NextResponse } from 'next/server'

export async function GET() {
  // Read the actual .env.local file directly to compare
  const fs = await import('fs')
  const path = await import('path')
  let fileContent = ''
  try {
    fileContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8').split('\n')[1] ?? 'file not found'
  } catch (e) {
    fileContent = 'error: ' + String(e)
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()

  const urlPreview = url ? url.slice(0, 40) + '...' : 'MISSING'
  const keyPreview = key ? key.slice(0, 20) + '...' : 'MISSING'

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Missing env vars', urlPreview, keyPreview })
  }

  const testUrl = `${url}/auth/v1/settings`

  try {
    const res = await fetch(testUrl, {
      headers: { apikey: key },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json({ ok: true, status: res.status, urlPreview, emailEnabled: data.external?.email })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: String(e),
      cause: e?.cause?.code ?? e?.cause?.message ?? null,
      urlPreview,
      testUrl,
      cwd: process.cwd(),
      envFileLine2: fileContent,
    })
  }
}
