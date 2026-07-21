# NovaCRM

Internal lead & pipeline CRM for Nova Staffs' Sales/BDE teams. See `/Context`
(one level up, in the repo root) for the full product/architecture spec.

## First-time setup (Phase 1)

You need a Clerk app and a Supabase project — nobody but you can create
these, so do the following before running the app:

### 1. Clerk

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy the **Publishable key** and **Secret key** into `.env.local` (copy
   `.env.local.example` to `.env.local` first).
3. Under **Configure > Webhooks**, add an endpoint pointing at
   `<your-deployed-url>/api/webhooks/clerk` (use an ngrok/Vercel preview URL
   for local testing — Clerk can't reach `localhost` directly). Subscribe to
   `user.created`, `user.updated`, `user.deleted`. Copy the **Signing
   secret** into `CLERK_WEBHOOK_SIGNING_SECRET`.

### 2. Supabase

1. Create a project at [app.supabase.com](https://app.supabase.com).
2. Run `/supabase/migrations/0001_init.sql` in the SQL Editor (or via
   `supabase db push` if you use the CLI).
3. Copy the **Project URL**, **anon public key**, and **service_role key**
   into `.env.local`.
4. Under **Authentication > Sign In / Providers > Third Party Auth**, add
   Clerk as a provider (paste your Clerk instance's domain). This is what
   lets `auth.jwt() ->> 'sub'` in the RLS policies resolve to the signed-in
   Clerk user — without it, every RLS policy will silently deny access.

### 3. Run it

```bash
npm install
npm run dev
```

Sign up as the first user via `/sign-up`, then **manually set your own row's
`role` to `admin` in the Supabase `users` table** (the Users admin page can't
promote its first admin — chicken/egg). Every user after that can be
promoted through the in-app Users page.

## Stack

Next.js (App Router) + TypeScript, Supabase (Postgres + RLS), Clerk, Tailwind
+ shadcn/ui. See `/Context/architecture.md` for the full model.
