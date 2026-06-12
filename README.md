# ExpenseTracker

A personal finance tracker that auto-imports expenses from Gmail (Blinkit, Zepto, Amazon, Swiggy, Zomato) and tracks your savings goals — available as a web app and iOS/Android mobile app.

## Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 14 (App Router) |
| Mobile | Expo (React Native) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Monorepo | Turborepo + pnpm workspaces |
| Shared packages | `@tracker/core`, `@tracker/db`, `@tracker/ui` |
| Background jobs | Supabase Edge Functions + pg_cron |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Supabase

```bash
# Create a new Supabase project at https://supabase.com
# Then apply migrations
supabase db push
```

### 3. Configure environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
# Fill in your Supabase URL, anon key, and Google OAuth credentials
```

### 4. Set up Google OAuth for Gmail

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → Enable Gmail API
3. Create OAuth credentials (Web Application)
4. Add redirect URI: `http://localhost:3000/api/gmail/callback`
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to your `.env.local`

### 5. Run the web app

```bash
pnpm dev --filter @tracker/web
```

### 6. Run the mobile app

```bash
pnpm dev --filter @tracker/mobile
# Then press 'i' for iOS simulator or 'a' for Android
```

## Project Structure

```
expense-tracker/
├── apps/
│   ├── web/              # Next.js web app
│   └── mobile/           # Expo mobile app
├── packages/
│   ├── core/             # Business logic (calculations, Gmail parser, formatters)
│   ├── db/               # Supabase client + TypeScript types
│   └── ui/               # Shared UI components (future)
└── supabase/
    ├── migrations/       # PostgreSQL schema + RLS policies
    └── functions/        # Edge Functions (background Gmail sync)
```

## Key Features

- **Auto-import**: Gmail integration auto-pulls order confirmations from Amazon, Blinkit, Zepto, Swiggy, Zomato, Flipkart
- **Savings goal tracking**: Set a target amount + date, see real-time progress with projected completion
- **Yearly grid view**: Spreadsheet-style overview of all 12 months
- **Fixed expenses**: Manage recurring expenses (Home Loan, RD, Credit Card, School Fees) with date ranges
- **Background sync**: Gmail auto-syncs at your chosen interval (15min → daily) even when app is closed
- **Multi-currency**: INR, USD, EUR

## Deployment

### Web (Vercel)

```bash
vercel --cwd apps/web
```

### Mobile (EAS Build)

```bash
eas build --platform all --cwd apps/mobile
```

### Supabase Edge Function

```bash
supabase functions deploy sync-gmail
# Schedule with pg_cron (runs every 15 min, skips users who don't need it)
# SQL: SELECT cron.schedule('gmail-sync', '*/15 * * * *', $$SELECT net.http_post(...)$$);
```

## Roadmap

- [ ] Bank SMS parsing (Android — auto-import UPI debits)
- [ ] WhatsApp receipt forwarding (via Twilio)
- [ ] Budget alerts (push notification when category overspends)
- [ ] Annual tax summary (ITR-ready report)
- [ ] Family sharing / household budget
- [ ] Open Banking via Account Aggregator (AA) framework
- [ ] AI-powered expense categorization
