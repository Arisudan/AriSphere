const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://excffhqcwzfnexflqzqv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4Y2ZmaHFjd3pmbmV4ZmxxenF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODk3ODUsImV4cCI6MjA5NjY2NTc4NX0.PgHx2nljmHaeMPmofUdopzM0-LMimxqzMVKlCPvb6kM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createUser() {
  console.log('Signing up admin user...');
  const { data, error } = await supabase.auth.signUp({
    email: 'editor@arisphere.com',
    password: 'Password123!',
  });

  if (error) {
    console.error('Signup error:', error.message);
  } else {
    console.log('Signup success:', data);
  }
}

createUser();
