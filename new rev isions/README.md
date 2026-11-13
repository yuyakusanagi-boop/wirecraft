# Wirecraft online setup

## Architecture

- Vercel serves the static game and deploys changes pushed to the connected GitHub repository.
- Supabase provides email/password authentication, PostgreSQL, row-level security, and Realtime.
- Supabase Auth handles password storage and verification. Wirecraft never stores passwords in its own database or browser storage.
- The Supabase publishable/anon key is used in the browser and is not a secret. Do not put a Supabase `service_role` key in this app.

The current local player save is retained as a browser cache. On the first successful sign-in, Wirecraft uploads the saved record if that account has no cloud profile yet. Later changes sync to that account. Overall ranks use total completed circuits across Story, Practice Lab, Power Rush, and Endless Grid. The individual boards rank their own mode; Endless ranks by best streak.

## Configure Supabase

The Free-tier `wirecraft` project is configured in the Singapore region. The schema in [`supabase-schema.sql`](./supabase-schema.sql) creates the profile and leaderboard tables, row-level security policies, and Realtime publication entry. It can be rerun after schema or permission changes; apply it in the Supabase SQL Editor to update the live project.

Player profiles are private to their owner. Leaderboard rows are publicly readable; score writes are disabled until game completions can be verified by trusted server-side logic. Public usernames are unique regardless of letter case.

[`supabase-config.js`](./supabase-config.js) contains the project URL and publishable key. The URL and publishable key are intended for public browser use; never put a Supabase secret or `service_role` key in this app. The Vercel production URL is configured as the Supabase site URL and an allowed redirect. Configure email confirmation under **Authentication → Providers → Email** as desired.

Supabase Auth applies its own password security; the game sends passwords only to the Supabase Auth endpoint over HTTPS. This project does not implement its own password hashing.

### Email confirmation and account creation

Email/password sign-ups are enabled. Email confirmation is currently disabled so new accounts can sign in immediately without relying on Supabase's default mailer, which may only deliver to project-team addresses and is limited to 2 emails per hour. This means users can register without proving control of the address they enter. Use an email address you control; before relying on verified email identities, configure a transactional SMTP provider under **Authentication → Emails → SMTP Settings**, verify the sender/domain, then re-enable **Authentication → Sign In / Providers → Confirm email**. The production site URL and redirect allowlist are configured for `https://wirecraft-repo.vercel.app`.

## Deploy through GitHub and Vercel

The private GitHub repository [`tenjoukaito12-cloud/wirecraft-repo`](https://github.com/tenjoukaito12-cloud/wirecraft-repo) is connected to Vercel. The production site is [https://wirecraft-repo.vercel.app](https://wirecraft-repo.vercel.app), and pushes to the production branch trigger a deployment. This is a static site with no build step; use the repository root (`.`) as the output directory.

Visit the deployed site over HTTPS and open **Leaderboards** to view the public rankings. Verified scores update live for other open leaderboard pages. New completions can be verified by the server; historical player-reported totals remain separate.

## Leaderboard score integrity

The browser game calculates progress client-side, so any totals sent by the browser can be changed with JavaScript or forged in a network request. A server endpoint that only checks whether those submitted totals add up still cannot prove they were earned. A cheat-resistant writable leaderboard requires authoritative server-side gameplay validation and score calculation.

The score Edge Function issues user-bound, one-use challenges and validates each submitted wiring graph against the canonical level topology before recording a server-computed completion. A challenge can count once per mode, level, and UTC day; Endless challenges must be completed in level order, and Power Rush has a server-side time limit. Client-supplied score totals are never accepted. This blocks arbitrary score edits, but it is not bot detection: an automated solver that submits a valid circuit proof can still earn a verified clear.

Verified scores remain isolated in `leaderboard_scores`; the separate `unverified_leaderboard_scores` table is a public, read-only view of player-reported totals and is clearly separated in the UI. Neither table permits browser writes. The schema removes the old score-submission RPC and denies client inserts into the audit log. Player profile sync remains available. Historical browser-saved totals cannot be verified retroactively because no trusted run proof was stored.

Apply [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL Editor to remove the old RPC and update permissions. Deploy the Edge Function to replace any previously deployed version:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy submit-verified-score
```

Do not re-enable client-side writes or configure a score endpoint that trusts browser-supplied totals. Administrators may publish user-reported scores to the separate unverified table; these must never be copied into verified rankings without authoritative gameplay validation. Apply `supabase-schema.sql` and deploy the Edge Function whenever its validation or database flow changes.

Free-plan quotas and inactivity limits can change; check the current Supabase and Vercel plan terms before relying on them for production.
