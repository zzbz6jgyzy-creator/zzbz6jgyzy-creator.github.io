# Enable account saving

The website works on one device immediately. For the same personal home on multiple devices:

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/luidcuzdrcvmzdxpiiwf/sql/new).
2. Open [the complete setup SQL](../supabase/migrations/202610240001_personal_home.sql), copy all of it into the editor and press **Run**.
3. Wait for **Success. No rows returned**.
4. After the website PR is merged, open [Your Supercharged Daily](https://superchargeddaily.com/daily.html), tap **Connect your account**, sign in and continue to your personal home.
5. Wait for **Saved to your account**, then try the same account on another device.

No new database password, secret key, paid tool or Google OAuth configuration is needed for this step. The website uses the existing member sign-in. The SQL adds private preference storage with authenticated access and revision checks.
