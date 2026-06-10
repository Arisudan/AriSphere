const SUPABASE_URL = 'https://excffhqcwzfnexflqzqv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4Y2ZmaHFjd3pmbmV4ZmxxenF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODk3ODUsImV4cCI6MjA5NjY2NTc4NX0.PgHx2nljmHaeMPmofUdopzM0-LMimxqzMVKlCPvb6kM';

async function runTest() {
  console.log('--- starting connection test to Supabase ---');
  console.log(`URL: ${SUPABASE_URL}`);

  // Test 1: Fetch articles
  try {
    const url = `${SUPABASE_URL}/rest/v1/articles?limit=1`;
    console.log(`Fetching from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Response Body:', text);

    if (response.ok) {
      console.log('Success: Connection established and authenticated!');
    } else {
      console.log('Failed: Unauthorized or other API gateway error.');
    }
  } catch (err) {
    console.error('System Error during fetch:', err.message);
  }
}

runTest();
