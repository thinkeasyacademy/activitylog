import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WordPressLoginLog } from './types';

const STORAGE_KEYS = {
  URL: 'supabase_wp_url',
  ANON_KEY: 'supabase_wp_anon_key',
  TABLE: 'supabase_wp_table_name'
};

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    created_at: string;
  };
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private url: string = '';
  private anonKey: string = '';
  private tableName: string = 'login_logs';

  constructor() {
    this.reloadConfig();
  }

  /**
   * Reload configuration from environmental variables or localStorage overrides
   */
  public reloadConfig() {
    const storedUrl = localStorage.getItem(STORAGE_KEYS.URL);
    const storedKey = localStorage.getItem(STORAGE_KEYS.ANON_KEY);
    const storedTable = localStorage.getItem(STORAGE_KEYS.TABLE);

    this.url = storedUrl || ((import.meta as any).env?.VITE_SUPABASE_URL || '');
    this.anonKey = storedKey || ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '');
    this.tableName = storedTable || 'login_logs';

    if (this.url && this.anonKey) {
      try {
        this.client = createClient(this.url, this.anonKey);
      } catch (err) {
        console.error('Failed to initialize Supabase Client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public getConfig() {
    return {
      url: this.url,
      anonKey: this.anonKey,
      tableName: this.tableName,
      isConfigured: !!this.client
    };
  }

  public saveConfig(url: string, anonKey: string, tableName: string) {
    localStorage.setItem(STORAGE_KEYS.URL, url.trim());
    localStorage.setItem(STORAGE_KEYS.ANON_KEY, anonKey.trim());
    localStorage.setItem(STORAGE_KEYS.TABLE, tableName.trim());
    this.reloadConfig();
  }

  public resetConfig() {
    localStorage.removeItem(STORAGE_KEYS.URL);
    localStorage.removeItem(STORAGE_KEYS.ANON_KEY);
    localStorage.removeItem(STORAGE_KEYS.TABLE);
    this.reloadConfig();
  }

  /**
   * Standard connection testing
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'Supabase URL or Anon-Key values are not specified.' };
    }
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('id')
        .limit(1);

      if (error) {
        return { success: false, message: `Could not access "${this.tableName}" table: ${error.message}` };
      }
      return { success: true, message: `Connected successfully! "${this.tableName}" table exists and is readable.` };
    } catch (err: any) {
      return { success: false, message: `Network request error: ${err?.message || 'Unknown issue'}` };
    }
  }

  /**
   * Authentic login logic utilizing official Supabase Auth (or mock mode fallback if not set)
   */
  public async loginUser(email: string, password: string): Promise<AuthResponse> {
    const trimmedEmail = email.trim();

    if (!this.client) {
      return this.mockLogin(trimmedEmail, password);
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: trimmedEmail,
        password: password
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: 'Logged in successfully via Supabase Auth!',
        user: {
          id: data.user?.id || 'uid',
          email: data.user?.email || trimmedEmail,
          created_at: data.user?.created_at || new Date().toISOString()
        }
      };
    } catch (err: any) {
      return { success: false, message: `Unexpected auth error: ${err?.message || err}` };
    }
  }

  /**
   * Log out user session
   */
  public async logoutUser(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut().catch(() => {});
    }
  }

  /**
   * Fetch WordPress Security Logs
   */
  public async getLogs(options: {
    page: number;
    pageSize: number;
    searchQuery: string;
    statusFilter: string;
  }): Promise<{ data: WordPressLoginLog[]; totalCount: number; error: string | null }> {
    const { page, pageSize, searchQuery, statusFilter } = options;
    const fromOffset = (page - 1) * pageSize;
    const toOffset = fromOffset + pageSize - 1;

    if (!this.client) {
      // Local fallback logs helper
      const mockResult = this.getMockLogs(searchQuery, statusFilter, page, pageSize);
      return { data: mockResult.data, totalCount: mockResult.total, error: null };
    }

    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Apply filter
      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      // Apply search queries
      if (searchQuery.trim()) {
        const term = searchQuery.trim();
        // Since Supabase doesn't support easy OR chaining directly without raw SQL,
        // we can query by ip_address, username, or isp filtering
        query = query.or(`username.ilike.%${term}%,ip_address.ilike.%${term}%,isp.ilike.%${term}%`);
      }

      // Order by ID or login_time descending (latest first)
      query = query.order('id', { ascending: false }).range(fromOffset, toOffset);

      const { data, count, error } = await query;
      if (error) {
        return { data: [], totalCount: 0, error: error.message };
      }

      return {
        data: (data || []) as WordPressLoginLog[],
        totalCount: count || 0,
        error: null
      };
    } catch (err: any) {
      return { data: [], totalCount: 0, error: err?.message || 'Unknown DB error' };
    }
  }

  /**
   * Simulate or Insert logs directly from our client dashboard for testing
   */
  public async createSimulationLog(log: Omit<WordPressLoginLog, 'id'>): Promise<WordPressLoginLog | null> {
    if (!this.client) {
      const stored = localStorage.getItem('mock_wordpress_logs');
      const list: WordPressLoginLog[] = stored ? JSON.parse(stored) : this.createInitialMockLogs();
      const newLog: WordPressLoginLog = {
        ...log,
        id: Date.now()
      };
      localStorage.setItem('mock_wordpress_logs', JSON.stringify([newLog, ...list]));
      return newLog;
    }

    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .insert([log])
        .select()
        .single();

      if (error) {
        console.error('Failed to insert simulation log:', error.message);
        return null;
      }
      return data as WordPressLoginLog;
    } catch (err) {
      console.error('Failed to create mock data on Supabase:', err);
      return null;
    }
  }

  // --- Mock Engine Fallbacks for UI preview when no Supabase key is present ---

  private mockLogin(email: string, password: string): AuthResponse {
    // If mock, allow any email/password inside our dashboard for instant verification
    // Special test cred: admin@wpsecurity.io / security123
    return {
      success: true,
      message: 'Logged in successfully (Dev Mode - No API keys connected)!',
      user: {
        id: 'mock-admin-uid-99',
        email: email,
        created_at: new Date().toISOString()
      }
    };
  }

  private getMockLogs(search: string, status: string, page: number, limit: number) {
    const stored = localStorage.getItem('mock_wordpress_logs');
    let list: WordPressLoginLog[] = stored ? JSON.parse(stored) : [];
    
    if (list.length === 0) {
      list = this.createInitialMockLogs();
      localStorage.setItem('mock_wordpress_logs', JSON.stringify(list));
    }

    // Filter by status
    let filtered = list;
    if (status && status !== 'ALL') {
      filtered = filtered.filter(l => l.status === status);
    }

    // Filter by searchQuery
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(l => 
        l.username.toLowerCase().includes(q) || 
        l.ip_address.toLowerCase().includes(q) || 
        (l.isp && l.isp.toLowerCase().includes(q))
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      data: paginated,
      total: filtered.length
    };
  }

  private createInitialMockLogs(): WordPressLoginLog[] {
    const ispList = ['Comcast', 'Verizon Wireless', 'BT Broadband', 'Link3 Technologies', 'Grameenphone', 'Charter Communications'];
    const locations = ['Dhaka, Bangladesh', 'London, United Kingdom', 'California, USA', 'Berlin, Germany', 'Sydney, Australia', 'New York, USA'];
    const agents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 Chrome/114.0.0.0 Mobile Safari/537.36'
    ];
    
    const users = ['admin', 'tafhimul', 'wp_editor', 'malicious_bot', 'developer', 'guest_customer'];
    const sites = ['https://tafhimul.com/wp', 'https://techblog.bd', 'https://ecom-store.net'];

    const initial: WordPressLoginLog[] = [];
    const now = new Date();

    for (let i = 1; i <= 45; i++) {
      const date = new Date(now.getTime() - i * 4 * 60 * 60 * 1000); // spread across past days
      const isFailed = i % 3 === 0;
      const isVisit = i % 4 === 1;
      const isLogout = i % 5 === 2;
      
      let status: 'Logged In' | 'Failed' | 'Logged Out' | 'Page Visit' = 'Logged In';
      if (isFailed) status = 'Failed';
      else if (isVisit) status = 'Page Visit';
      else if (isLogout) status = 'Logged Out';

      initial.push({
        id: 10000 + i,
        login_time: status === 'Logged In' ? date.toISOString() : null,
        failed_time: status === 'Failed' ? date.toISOString() : null,
        logout_time: status === 'Logged Out' ? date.toISOString() : null,
        username: users[i % users.length],
        ip_address: `192.168.10.${10 + i}`,
        site_url: sites[i % sites.length],
        location: locations[i % locations.length],
        user_agent: agents[i % agents.length],
        isp: ispList[i % ispList.length],
        status: status,
        session_duration: status === 'Logged Out' ? `${10 + (i % 30)} minutes` : null,
        visited_url: status === 'Page Visit' ? '/wp-admin/plugins.php' : '/wp-login.php'
      });
    }

    return initial;
  }
}

export const supabaseService = new SupabaseService();
