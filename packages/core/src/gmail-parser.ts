export interface ParsedTransaction {
  merchant: string
  amount: number
  date: Date
  description: string
  rawEmailId: string
  source: 'gmail'
}

interface MerchantPattern {
  merchant: string
  senderPattern: RegExp
  subjectPattern: RegExp
  amountPattern: RegExp
  datePattern?: RegExp
}

const MERCHANT_PATTERNS: MerchantPattern[] = [
  {
    merchant: 'Amazon',
    senderPattern: /auto-confirm@amazon\.in|ship-confirm@amazon\.in/i,
    subjectPattern: /order.*confirm|your.*amazon.*order/i,
    amountPattern: /(?:order total|grand total|total amount)[^\d]*₹?\s*([\d,]+\.?\d*)/i,
  },
  {
    merchant: 'Blinkit',
    senderPattern: /noreply@blinkit\.com|orders@blinkit\.com/i,
    subjectPattern: /order.*confirm|blinkit.*order|your.*order/i,
    amountPattern: /(?:total|amount paid|bill amount|order total)[^\d]*₹?\s*([\d,]+\.?\d*)/i,
  },
  {
    merchant: 'Zepto',
    senderPattern: /orders@zeptonow\.com|noreply@zeptonow\.com/i,
    subjectPattern: /order.*confirm|zepto.*order|your.*order/i,
    amountPattern: /(?:total|amount paid|order total|bill amount)[^\d]*₹?\s*([\d,]+\.?\d*)/i,
  },
  {
    merchant: 'Swiggy',
    senderPattern: /noreply@swiggy\.in|support@swiggy\.in/i,
    subjectPattern: /order.*confirm|swiggy.*order/i,
    amountPattern: /(?:total|amount paid|bill total)[^\d]*₹?\s*([\d,]+\.?\d*)/i,
  },
  {
    merchant: 'Zomato',
    senderPattern: /noreply@zomato\.com/i,
    subjectPattern: /order.*confirm|zomato.*order/i,
    amountPattern: /(?:total|bill amount|amount paid)[^\d]*₹?\s*([\d,]+\.?\d*)/i,
  },
  {
    merchant: 'Flipkart',
    senderPattern: /noreply@flipkart\.com|order@flipkart\.com/i,
    subjectPattern: /order.*confirm|flipkart.*order/i,
    amountPattern: /(?:order total|total amount|amount)[^\d]*₹?\s*([\d,]+\.?\d*)/i,
  },
]

export interface RawEmail {
  id: string
  from: string
  subject: string
  body: string
  date: string
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

export function parseEmailForTransaction(email: RawEmail): ParsedTransaction | null {
  for (const pattern of MERCHANT_PATTERNS) {
    if (!pattern.senderPattern.test(email.from)) continue
    if (!pattern.subjectPattern.test(email.subject)) continue

    const amountMatch = email.body.match(pattern.amountPattern)
      ?? email.subject.match(pattern.amountPattern)

    if (!amountMatch) continue

    const amount = parseAmount(amountMatch[1])
    if (!amount || amount <= 0) continue

    return {
      merchant: pattern.merchant,
      amount,
      date: new Date(email.date),
      description: email.subject,
      rawEmailId: email.id,
      source: 'gmail',
    }
  }

  return null
}

export function parseMultipleEmails(emails: RawEmail[]): ParsedTransaction[] {
  return emails
    .map(parseEmailForTransaction)
    .filter((t): t is ParsedTransaction => t !== null)
}

/**
 * Deduplicate parsed transactions against already-known email IDs
 */
export function deduplicateTransactions(
  parsed: ParsedTransaction[],
  existingEmailIds: Set<string>,
): ParsedTransaction[] {
  return parsed.filter((t) => !existingEmailIds.has(t.rawEmailId))
}
