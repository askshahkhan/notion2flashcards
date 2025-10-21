// supabase-client.js
// Refactored version with better code organization

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../secrets.js';

// Core Supabase client with unified request handling
const supabaseClient = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  
  /**
   * Make a REST API request to a table
   */
  async request(endpoint, method, body = null, options = {}) {
    const url = `${this.url}/rest/v1/${endpoint}`;
    console.log(`🔵 ${method} ${url}`, body);
    
    const fetchOptions = {
      method,
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();
    
    console.log(`🔵 Response (${response.status}):`, responseText);
    
    if (!response.ok) {
      throw new Error(`Supabase error (${response.status}): ${responseText}`);
    }
    
    // Return parsed JSON or empty object if no content
    return responseText.trim() ? JSON.parse(responseText) : {};
  },
  
  /**
   * Call a Supabase RPC function
   */
  async rpc(functionName, params) {
    return this.request(`rpc/${functionName}`, 'POST', params);
  },
  
  /**
   * Insert data into a table
   */
  async insert(table, data) {
    return this.request(table, 'POST', data, {
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' }
    });
  },
  
  /**
   * Update data in a table with filter
   */
  async update(table, filter, data) {
    const endpoint = `${table}?${filter}`;
    return this.request(endpoint, 'PATCH', data, {
      headers: { 'Prefer': 'return=representation' }
    });
  }
};

/**
 * Save user email to Supabase
 */
export async function saveUserEmail(email, notionUserId) {
  try {
    console.log('📧 Saving user email:', { email, notionUserId });
    
    const data = await supabaseClient.insert('user_emails', {
      email,
      notion_user_id: notionUserId,
      updated_at: new Date().toISOString()
    });

    console.log('✅ User email saved:', email);
    return { success: true, data };
    
  } catch (error) {
    // Handle duplicate key error (email already exists)
    if (error.message.includes('23505') || error.message.includes('already exists')) {
      console.log('ℹ️ Email already exists, skipping...');
      return { success: true, data: { message: 'Email already exists' } };
    }
    
    console.error('❌ Error saving email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Increment generation counter for user
 */
export async function incrementGenerations(email) {
  try {
    console.log('🔢 Incrementing generations for:', email);
    
    await supabaseClient.rpc('increment_generations', { user_email: email });
    
    console.log('✅ Generation counter incremented');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error incrementing generations:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Increment Anki exports counter for user
 */
export async function incrementAnkiExports(email) {
  try {
    console.log('📦 Incrementing Anki exports for:', email);
    
    await supabaseClient.rpc('increment_anki_exports', { user_email: email });
    
    console.log('✅ Anki exports counter incremented');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error incrementing Anki exports:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update total accessible pages count
 */
export async function updateAccessiblePages(email, pageCount) {
  try {
    console.log('📊 Updating accessible pages:', { email, pageCount });
    
    const filter = `email=eq.${encodeURIComponent(email)}`;
    await supabaseClient.update('user_emails', filter, {
      accessible_pages: pageCount,
      updated_at: new Date().toISOString()
    });
    
    console.log('✅ Accessible pages updated to:', pageCount);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error updating accessible pages:', error.message);
    return { success: false, error: error.message };
  }
}