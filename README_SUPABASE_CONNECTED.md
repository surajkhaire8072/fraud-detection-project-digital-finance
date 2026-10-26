# FraudGuard — Supabase-connected GitHub Pages website

## Included
- Responsive HTML/CSS/JavaScript dashboard
- Supabase email sign-up/sign-in
- Transaction records stored in Supabase
- Per-user history protected by Row Level Security (RLS)
- Calls `score-transaction` Edge Function if it is deployed; otherwise explicitly labels the browser formula as a demo fallback

## A. Configure the browser keys
Open `script.js` and replace:
```js
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
```
with your project's **Project URL** and **publishable key**. These are intended for browser use when RLS is enabled. Never use a secret or `service_role` key in this file.

## B. Database
Run `supabase/schema.sql` in Supabase Dashboard → SQL Editor. This should create `public.transactions` and RLS policies. If you already ran the schema and the table exists, don't run it again unless you understand any policy conflicts.

## C. Authentication
In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://YOUR-USERNAME.github.io/fraud-detection-project-digital-finance/`
- Add that URL to Redirect URLs.
Enable Email authentication. For a demo, you may turn off email confirmation only if you understand the security implications; otherwise confirm the signup email before signing in.

## D. Optional server-side scoring
This frontend attempts to call the `score-transaction` Edge Function. Deploy it separately with the Supabase CLI; uploading files to GitHub alone does not deploy functions.
The current Edge Function in the previous backend bundle uses JWT verification. The score is illustrative rule-based scoring, not a trained/validated model. If the function is not deployed, the site falls back to a browser-side demo formula and labels that method.

## E. GitHub Pages deployment
Upload/replace `index.html`, `style.css`, `script.js` in the root of the existing GitHub repository, preserving the `main` branch. Commit changes. GitHub Pages should redeploy automatically.

## Security and limitations
- Keep RLS enabled and policies limited to `auth.uid() = user_id`.
- Do not add a secret or `service_role` key to the repository.
- Never enter real card numbers, CVVs, banking passwords, PINs, or OTPs.
- This is a college demonstration, not production fraud detection.
