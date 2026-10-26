# FraudGuard Supabase backend

This adds authenticated transaction history and a server-side scoring endpoint to the GitHub Pages website.

## 1. Create the database table

1. Open your Supabase project.
2. Go to **SQL Editor → New query**.
3. Paste and run `supabase/schema.sql`.

The table uses Row Level Security (RLS): authenticated users can read, insert, and delete only their own transaction rows.

## 2. Configure authentication

In Supabase Dashboard, open **Authentication → URL Configuration** and set:
- Site URL: your GitHub Pages URL, e.g. `https://YOUR-USERNAME.github.io/fraud-detection-project-digital-finance/`
- Add that same URL to Redirect URLs.

Enable the sign-in method you intend to use (for example, email/password).

## 3. Deploy the Edge Function

Install and sign in to the Supabase CLI, then from this project directory run:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy score-transaction
```

The function checks the caller's JWT (`verify_jwt = true`) and calculates a demo score on the server. The score is a simple rule, not a trained ML model.

## 4. Connect the frontend

In `index.html`, load the Supabase JavaScript client before `script.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="script.js"></script>
```

In `script.js`, initialize with your **Project URL** and **publishable/anon key**:

```js
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

The publishable/anon key is intended for browser use only when RLS policies are correct. **Never put a `service_role` key or secret key in GitHub/frontend code.**

## 5. Example frontend calls

Sign in:

```js
const { data, error } = await supabaseClient.auth.signInWithPassword({
  email: emailInput.value,
  password: passwordInput.value
});
if (error) alert(error.message);
```

Call scoring endpoint:

```js
const { data: { session } } = await supabaseClient.auth.getSession();
const { data, error } = await supabaseClient.functions.invoke("score-transaction", {
  body: {
    amount: 15000,
    hour: 2,
    frequency: 8,
    international: true,
    threshold: 0.5
  }
});
if (error) throw error;
console.log(data.risk_score, data.flagged);
```

Save transaction history after scoring:

```js
const { data: { user } } = await supabaseClient.auth.getUser();
const { error } = await supabaseClient.from("transactions").insert({
  user_id: user.id,
  amount: 15000,
  transaction_hour: 2,
  transactions_last_hour: 8,
  international: true,
  risk_score: data.risk_score,
  review_threshold: data.threshold,
  flagged: data.flagged
});
if (error) throw error;
```

Load only the signed-in user's history:

```js
const { data, error } = await supabaseClient
  .from("transactions")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(100);
if (error) throw error;
```

## Security notes

- Keep the Edge Function JWT verification enabled.
- Never commit Supabase secret or `service_role` keys.
- Use only the publishable/anon key in the browser and enforce RLS.
- Do not collect real card numbers, CVVs, PINs, passwords, or OTPs.
- This is a college demo. The scoring formula is not a validated fraud model and must not be used to block payments or make real financial decisions.
