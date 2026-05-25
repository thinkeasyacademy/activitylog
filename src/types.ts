/**
 * Types and interfaces for the WordPress Security Logging Dashboard.
 */

export interface WordPressLoginLog {
  id: string | number;
  login_time: string | null;
  failed_time: string | null;
  logout_time: string | null;
  username: string;
  ip_address: string;
  site_url: string;
  location: string;
  user_agent: string;
  isp: string;
  status: 'Logged In' | 'Failed' | 'Logged Out' | 'Page Visit';
  session_duration: string | null;
  visited_url: string | null;
}

export interface ChartDataPoint {
  date: string;
  successfulLogins: number;
  failedAttacks: number;
  pageVisits: number;
}

export interface DashboardStats {
  totalEvents: number;
  successfulLogins: number;
  failedAttacks: number;
  pageVisits: number;
}
