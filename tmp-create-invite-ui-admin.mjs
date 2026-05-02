import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing backend admin env');
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now();
const email = `petersemrany1+ui-admin-${stamp}@gmail.com`;
const password = `InviteUI-${stamp}-Test!`;
const { data: userData, error: userErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { first_name: 'UI', last_name: 'Admin', full_name: 'UI Admin' },
});
if (userErr) throw userErr;
const userId = userData.user?.id;
if (!userId) throw new Error('No user id');
const { data: rep, error: repErr } = await admin.from('sales_reps').insert({
  name: 'UI Admin',
  first_name: 'UI',
  last_name: 'Admin',
  email,
  role: 'admin',
}).select('*').single();
if (repErr) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
  throw repErr;
}
console.log(JSON.stringify({ email, password, userId, repId: rep.id }));
