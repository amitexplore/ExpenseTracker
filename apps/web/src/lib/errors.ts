/**
 * Converts raw Supabase / network errors into short, user-friendly messages.
 * Call this before displaying any error string to the user.
 */
export function friendlyError(raw: unknown): string {
  const msg =
    typeof raw === 'string'
      ? raw
      : raw instanceof Error
      ? raw.message
      : typeof raw === 'object' && raw !== null && 'message' in raw
      ? String((raw as { message: unknown }).message)
      : ''

  if (!msg) return 'Something went wrong. Please try again.'

  // ── Auth errors ──────────────────────────────────────────────────────────
  if (/invalid.*(login|credentials)/i.test(msg))
    return 'Incorrect email or password.'
  if (/email.*not.*confirm/i.test(msg))
    return 'Please confirm your email first.'
  if (/already.*register|already.*exist|duplicate.*email/i.test(msg))
    return 'An account with this email already exists. Please sign in.'
  if (/password.*should|password.*at.*least/i.test(msg))
    return 'Password must be at least 8 characters.'
  if (/jwt|session.*expire|token.*expire/i.test(msg))
    return 'Your session has expired. Please sign in again.'

  // ── Database constraint errors ────────────────────────────────────────────
  if (/violates check constraint/i.test(msg))
    return 'Please enter valid values (amounts must be positive).'
  if (/violates foreign key/i.test(msg))
    return 'A related record no longer exists. Please refresh and try again.'
  if (/violates not-null/i.test(msg))
    return 'Please fill in all required fields.'
  if (/duplicate key|unique.*violat/i.test(msg))
    return 'This entry already exists.'
  if (/permission denied|42501/i.test(msg))
    return "You don't have permission to do that."

  // ── Network / connectivity errors ─────────────────────────────────────────
  if (/network|fetch.*fail|econnrefused|failed to fetch/i.test(msg))
    return 'Connection error. Please check your internet and try again.'

  return 'Something went wrong. Please try again.'
}
