import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: user, error: userError } = await supabase.auth.signInWithPassword({
    email: 'phbhada@gmail.com',
    password: 'password123'
  });
  if (userError) {
    console.log("Auth error:", userError);
    // try to just insert without auth
  } else {
    console.log("Logged in:", user?.user?.id);
  }

  const { data, error } = await supabase.from('forms').insert({
    name: 'Test Form',
    code: 'TEST_FORM_' + Date.now(),
    reporting_period: 'Monthly',
    report_type: 'VILLAGE_NUMERICAL',
    active: true
  }).select();
  console.log("Insert result:", data, error);
}
run();
