// supabase-client.js
// Create this new file in your services folder

// Import Supabase URL and key from secrets
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../secrets.js';

// Simple Supabase client without external dependencies
const supabaseClient = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  
  async query(table, method, data) {
    console.log('🔵 Making request to:', `${this.url}/rest/v1/${table}`);
    console.log('🔵 Method:', method);
    console.log('🔵 Data:', data);
    
    const response = await fetch(`${this.url}/rest/v1/${table}`, {
      method: method,
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(data)
    });
    
    console.log('🔵 Response status:', response.status);
    console.log('🔵 Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('🔵 Response text:', responseText);
    
    if (!response.ok) {
      throw new Error(`Supabase error (${response.status}): ${responseText}`);
    }
    
    // If response is empty, return empty object
    if (!responseText || responseText.trim() === '') {
      return {};
    }
    
    return JSON.parse(responseText);
  }
};

/**
 * Save user email to Supabase
 */
export async function saveUserEmail(email, notionUserId) {
  try {
    console.log('🔵 saveUserEmail called with:', { email, notionUserId });
    console.log('🔵 Supabase URL:', supabaseClient.url);
    console.log('🔵 API Key exists:', !!supabaseClient.key);
    
    const data = await supabaseClient.query('user_emails', 'POST', {
      email: email,
      notion_user_id: notionUserId,
      updated_at: new Date().toISOString()
    });

    console.log('✅ User email saved to Supabase:', email);
    console.log('✅ Response data:', data);
    return { success: true, data };
    
  } catch (error) {
    // Check if it's a duplicate key error (email already exists)
    if (error.message.includes('23505') || error.message.includes('already exists')) {
      console.log('ℹ️ Email already exists in Supabase, skipping...');
      return { success: true, data: { message: 'Email already exists' } };
    }
    
    console.error('❌ Error saving to Supabase:', error);
    console.error('❌ Error details:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Increment generation counter for user
 */
export async function incrementGenerations(email) {
    try {
      console.log('🔵 Incrementing generations for:', email);
      
      const response = await fetch(`${supabaseClient.url}/rest/v1/rpc/increment_generations`, {
        method: 'POST',
        headers: {
          'apikey': supabaseClient.key,
          'Authorization': `Bearer ${supabaseClient.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_email: email })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Failed to increment:', error);
        return { success: false };
      }
      
      console.log('✅ Generation counter incremented');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error incrementing generations:', error);
      return { success: false };
    }
  }