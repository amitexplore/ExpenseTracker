import { NextResponse, type NextRequest } from 'next/server'

// Auth is handled by individual layouts — no middleware redirect needed
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
