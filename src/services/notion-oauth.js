import { NOTION_OAUTH_CLIENT_ID, NOTION_OAUTH_CLIENT_SECRET } from '../../secrets.js';
import { saveUserEmail } from '../services/supabase-client.js';


const REDIRECT_URI = 'https://mkdjckjdkeconibpdkdhpoknmpoeabbp.chromiumapp.org';
const TOKEN_STORAGE_KEY = 'notion_access_token';

class NotionOAuth {
    constructor() {
        this.accessToken = null;
    }

    /**
     * Check if user is currently authenticated
     */
    async isAuthenticated() {
        try {
            const result = await chrome.storage.local.get([TOKEN_STORAGE_KEY]);
            return !!result[TOKEN_STORAGE_KEY];
        } catch (error) {
            console.error('Error checking authentication status:', error);
            return false;
        }
    }

    /**
     * Get the stored access token
     */
    async getAccessToken() {
        try {
            const result = await chrome.storage.local.get([TOKEN_STORAGE_KEY]);
            return result[TOKEN_STORAGE_KEY] || null;
        } catch (error) {
            console.error('Error retrieving access token:', error);
            return null;
        }
    }

    /**
     * Store access token securely
     */
    async storeAccessToken(token) {
        try {
            await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: token });
            this.accessToken = token;
        } catch (error) {
            console.error('Error storing access token:', error);
            throw error;
        }
    }

    /**
     * Remove stored access token (logout)
     */
    async logout() {
        try {
            await chrome.storage.local.remove([TOKEN_STORAGE_KEY]);
            this.accessToken = null;
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    }

    /**
     * Launch OAuth authorization flow
     */
    async authorize() {
        try {
            console.log('OAuth authorize() called');
            console.log('Client ID:', NOTION_OAUTH_CLIENT_ID);
            console.log('Redirect URI:', REDIRECT_URI);
            
            // Construct authorization URL
            const authParams = new URLSearchParams({
                client_id: NOTION_OAUTH_CLIENT_ID,
                response_type: 'code',
                owner: 'user',
                redirect_uri: REDIRECT_URI
            });
            
            const authUrl = `https://api.notion.com/v1/oauth/authorize?${authParams.toString()}`;

            console.log('Launching OAuth flow with URL:', authUrl);

            // Launch OAuth flow using tab-based approach (more reliable)
            console.log('Starting OAuth flow using tab-based approach...');
            console.log('Full auth URL:', authUrl);
            
            // Use tab-based OAuth flow as the default method
            const redirectUrl = await this.performTabBasedOAuth(authUrl);

            console.log('OAuth redirect URL received:', redirectUrl);

            // Extract authorization code from redirect URL
            const urlParams = new URLSearchParams(new URL(redirectUrl).search);
            const authCode = urlParams.get('code');

            if (!authCode) {
                throw new Error('No authorization code received from Notion');
            }

            console.log('Authorization code received:', authCode);

            // Exchange authorization code for access token
            const accessToken = await this.exchangeCodeForToken(authCode);
            
            // Store the access token
            await this.storeAccessToken(accessToken);

            console.log('OAuth flow completed successfully');
            return accessToken;

        } catch (error) {
            console.error('OAuth authorization failed:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(authCode) {
        try {
            const tokenUrl = 'https://api.notion.com/v1/oauth/token';
            
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(`${NOTION_OAUTH_CLIENT_ID}:${NOTION_OAUTH_CLIENT_SECRET}`)}`
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code: authCode,
                    redirect_uri: REDIRECT_URI
                })
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
            }
    
            const tokenData = await response.json();
            
            if (!tokenData.access_token) {
                throw new Error('No access token in response');
            }
    
            console.log('Access token obtained successfully');
            console.log('🔍 Full tokenData:', tokenData);
            
            // NEW: Save user email to Supabase
            const userEmail = tokenData.owner?.user?.person?.email;
            const notionUserId = tokenData.owner?.user?.id;

            console.log('🔍 Extracted email:', userEmail);
            console.log('🔍 Extracted notion user ID:', notionUserId);
            
            if (userEmail) {
                console.log('✅ Email found, saving to Supabase...');
                const result = await saveUserEmail(userEmail, notionUserId);
                console.log('📊 Supabase save result:', result);
            } else {
                console.log('❌ No email found in tokenData');
            }
    
            return tokenData.access_token;
    
        } catch (error) {
            console.error('Token exchange failed:', error);
            throw error;
        }
    }

    /**
     * Perform OAuth flow using tab-based approach (primary method)
     */
    async performTabBasedOAuth(authUrl) {
        return new Promise((resolve, reject) => {
            console.log('Opening OAuth authorization page in new tab...');
            
            // Open OAuth URL in new tab
            chrome.tabs.create({ url: authUrl, active: true }).then((tab) => {
                console.log('OAuth tab opened with ID:', tab.id);
                
                // Listen for URL changes in the OAuth tab
                const tabListener = (tabId, changeInfo, updatedTab) => {
                    if (tabId === tab.id && changeInfo.url) {
                        console.log('Tab URL changed to:', changeInfo.url);
                        
                        const url = new URL(changeInfo.url);
                        
                        // Check if we've been redirected to our extension's redirect URI
                        if (url.hostname === 'mkdjckjdkeconibpdkdhpoknmpoeabbp.chromiumapp.org') {
                            console.log('OAuth redirect detected, closing tab...');
                            
                            // Clean up
                            chrome.tabs.onUpdated.removeListener(tabListener);
                            chrome.tabs.remove(tabId);
                            
                            // Resolve with the redirect URL
                            resolve(changeInfo.url);
                            return;
                        }
                        
                        // Check for error in URL
                        if (changeInfo.url.includes('error=')) {
                            console.error('OAuth error detected in URL:', changeInfo.url);
                            chrome.tabs.onUpdated.removeListener(tabListener);
                            chrome.tabs.remove(tabId);
                            reject(new Error('OAuth authorization failed'));
                            return;
                        }
                    }
                };
                
                // Add the listener
                chrome.tabs.onUpdated.addListener(tabListener);
                
                // Timeout after 5 minutes
                const timeout = setTimeout(() => {
                    console.log('OAuth timeout - cleaning up...');
                    chrome.tabs.onUpdated.removeListener(tabListener);
                    chrome.tabs.remove(tab.id);
                    reject(new Error('OAuth timeout - please try again'));
                }, 300000);
                
                // Clear timeout if we resolve early
                const originalResolve = resolve;
                resolve = (value) => {
                    clearTimeout(timeout);
                    originalResolve(value);
                };
                
            }).catch((error) => {
                console.error('Failed to create OAuth tab:', error);
                reject(new Error('Failed to open OAuth authorization page'));
            });
        });
    }

    /**
     * Extract page ID from Notion URL
     */
    extractPageIdFromUrl(url) {
        try {
            // Handle various Notion URL formats
            const patterns = [
                /notion\.so\/[^\/]*-([a-f0-9]{32})/,  // https://www.notion.so/Page-Title-267ad5f651558081a9fdfa77fd4da2c5
                /notion\.so\/([a-f0-9]{32})/,         // https://notion.so/267ad5f651558081a9fdfa77fd4da2c5
                /notion\.so\/[^\/]*\/([a-f0-9]{32})/, // https://www.notion.so/workspace/267ad5f651558081a9fdfa77fd4da2c5
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) {
                    return match[1];
                }
            }

            throw new Error('Could not extract page ID from URL');
        } catch (error) {
            console.error('Error extracting page ID:', error);
            throw error;
        }
    }

    /**
     * Validate Notion URL format
     */
    isValidNotionUrl(url) {
        try {
            this.extractPageIdFromUrl(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Save user info if we haven't already (for already-authenticated users)
     */
    /**
     * Save user info if we haven't already (for already-authenticated users)
     */
    async saveUserInfoIfNeeded() {
        try {
            // Check if we've already saved this user
            const saved = await chrome.storage.local.get(['user_info_saved']);
            if (saved.user_info_saved) {
                console.log('User info already saved to Supabase');
                return;
            }

            // Get current access token
            const accessToken = await this.getAccessToken();
            if (!accessToken) return;

            // Fetch user info from Notion API
            const response = await fetch('https://api.notion.com/v1/users/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Notion-Version': '2022-06-28'
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch user info');
                return;
            }

            const userData = await response.json();
            console.log('🔍 User data from Notion:', userData);

            // Fix: Check both possible paths for email
            let userEmail = userData.person?.email;
            let notionUserId = userData.id;
            
            // If it's a bot response, get the owner's email
            if (!userEmail && userData.bot?.owner?.user?.person?.email) {
                userEmail = userData.bot.owner.user.person.email;
                notionUserId = userData.bot.owner.user.id;
            }

            console.log('🔍 Extracted email:', userEmail);
            console.log('🔍 Extracted notion user ID:', notionUserId);

            if (userEmail) {
                console.log('✅ Calling saveUserEmail...');
                const result = await saveUserEmail(userEmail, notionUserId);
                console.log('📊 Save result:', result);

                // Store email locally for quick access
                await chrome.storage.local.set({ user_email: userEmail });
                console.log('✅ Email stored in local storage:', userEmail);
            } else {
                console.log('❌ No email found in userData');
            }

        } catch (error) {
            console.error('❌ Error saving user info:', error);
        }
    }
}

// Export singleton instance
export const notionOAuth = new NotionOAuth();
