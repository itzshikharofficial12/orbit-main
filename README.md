# Orbit

**Internal Operating System & Client Platform**  
*by Celestia Studios*

---

## Technical Stack

- **Framework**: Next.js (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS & shadcn/ui
- **Backend & Database**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **Package Manager**: `pnpm`

---

## Directory Structure

```text
Orbit Main/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   │   └── login/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── hq/
│       │   │   │   └── client/
│       │   │   ├── api/auth/callback/
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   └── layout/
│       │   ├── modules/
│       │   │   └── auth/
│       │   ├── lib/
│       │   │   ├── supabase/
│       │   │   ├── env.ts
│       │   │   └── utils.ts
│       │   └── hooks/
│       ├── supabase/
│       │   └── migrations/
│       ├── .env.example
│       └── .env.local
├── package.json
└── pnpm-workspace.yaml
```

---

## Getting Started

### 1. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Execute the database migration SQL in `supabase/migrations/00001_initial_schema.sql` in your Supabase SQL Editor.
3. Copy `.env.example` to `.env.local` inside `apps/web`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

### 2. Run Development Server

```bash
pnpm install
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Validation Commands

```bash
pnpm lint        # Run ESLint across packages
pnpm typecheck   # Typecheck TypeScript codebase
pnpm build       # Production build
```
# orbit-main
