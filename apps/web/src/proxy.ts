import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require an authenticated session
const PROTECTED_PREFIXES = ['/dashboard', '/transactions', '/settings', '/month']
// Auth routes — authenticated users should be redirected away
const AUTH_PREFIXES = ['/login', '/signup']

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Start with a passthrough response that carries the original request cookies
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Step 1: update the request-side cookies (for subsequent getAll() calls)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Step 2: rebuild the response so it inherits the updated request cookies
          supabaseResponse = NextResponse.next({ request })
          // Step 3: write session cookies — strip maxAge/expires so the browser
          // clears them when closed. Deletions (maxAge ≤ 0) keep maxAge=0.
          cookiesToSet.forEach(({ name, value, options }) => {
            const { maxAge, expires, ...rest } = options as Record<string, unknown>
            const isDelete = typeof maxAge === 'number' && maxAge <= 0
            supabaseResponse.cookies.set(name, value, {
              ...rest,
              ...(isDelete ? { maxAge: 0 } : {}),
            } as Parameters<typeof supabaseResponse.cookies.set>[2])
          })
        },
      },
    }
  )

  // IMPORTANT: always call getUser() here to keep the session alive.
  // Do NOT remove this call.
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthPage  = AUTH_PREFIXES.some((p) => pathname.startsWith(p))

  // Unauthenticated user on a protected page → send to login
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user on login/signup → send to dashboard
  if (isAuthPage && user) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/dashboard'
    dashUrl.searchParams.delete('next')
    return NextResponse.redirect(dashUrl)
  }

  // Return the supabaseResponse so any refreshed session cookies are forwarded
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (build assets)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - public static files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)',
  ],
}
