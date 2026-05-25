import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabaseService';
import { WordPressLoginLog } from '../types';
import Sidebar from './Sidebar';
import LogsTable from './LogsTable';
import DailyUsers from './DailyUsers';
import TrafficAnalysis from './TrafficAnalysis';
import { 
  X, 
  Globe, 
  Monitor, 
  Terminal, 
  Cpu, 
  Clock, 
  Sparkles, 
  RefreshCw,
  MoreVertical,
  Menu,
  User,
  Activity,
  Users,
  LineChart,
  LogOut
} from 'lucide-react';
import { translations } from '../translations';

interface DashboardProps {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
  isSupabase: boolean;
  onLogout: () => void;
  onScrollToConfig: () => void;
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
}

export default function Dashboard({ 
  user, 
  isSupabase, 
  onLogout,
  language,
  theme
}: DashboardProps) {
  const t = translations[language];
  const isDark = theme === 'dark';
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'traffic'>('logs');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Subscribe to 'wp-go-home' custom event which is triggered when clicking logo in App.tsx
  useEffect(() => {
    const handleGoHome = () => {
      setActiveTab('logs');
    };
    window.addEventListener('wp-go-home', handleGoHome);
    return () => {
      window.removeEventListener('wp-go-home', handleGoHome);
    };
  }, []);
  
  // Storage for logs
  const [logs, setLogs] = useState<WordPressLoginLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Currently inspected log in our pop-up modal
  const [inspectedLog, setInspectedLog] = useState<WordPressLoginLog | null>(null);

  // Simulator state to allow easy data testing in developer/sandbox sessions
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Load logs on page/filter state changes
  const fetchDashboardLogs = async () => {
    setIsLoading(true);
    try {
      const result = await supabaseService.getLogs({
        page: currentPage,
        pageSize: pageSize,
        searchQuery: searchQuery,
        statusFilter: statusFilter
      });
      
      setLogs(result.data);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardLogs();
  }, [currentPage, searchQuery, statusFilter, isSupabase]);

  // Handle Real-time additions
  useEffect(() => {
    const supabase = supabaseService.getClient();
    if (!supabase || !isSupabase) return;

    const config = supabaseService.getConfig();
    
    const channel = supabase
      .channel('schema-db-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: config.tableName
        },
        (payload) => {
          const newRow = payload.new as WordPressLoginLog;
          
          if (statusFilter === 'ALL' || newRow.status === statusFilter) {
            setLogs((prev) => [newRow, ...prev.slice(0, pageSize - 1)]);
            setTotalCount((prev) => prev + 1);
          } else {
            setTotalCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSupabase, statusFilter]);

  const handleSimulateLog = async (type: 'success' | 'failed' | 'visit') => {
    setSimulationLoading(true);
    
    const testUsernames = ['tafhimul_admin', 'editorial_wp', 'malicious_robot', 'wp_editor_bd', 'visitor_guest'];
    const testIps = ['103.225.109.43', '198.51.100.12', '8.8.8.8', '192.168.10.12', '185.220.101.40'];
    const testIsps = ['Link3 Broadband BD', 'Unio Cloud VPN', 'Google LLC Gateway', 'Grameenphone Internet', 'Tor Exit Proxy'];
    const testLocations = ['Dhaka, Bangladesh', 'London, UK', 'California, USA', 'Sydney, Australia5', 'Berlin, Germany'];
    const testUrls = ['/wp-login.php', '/wp-admin/index.php', '/wp-admin/plugins.php', '/wp-content/themes', '/feed/'];

    const idx = Math.floor(Math.random() * 5);
    const nowIso = new Date().toISOString();

    let finalIp = testIps[idx];
    let finalLocation = testLocations[idx];
    let finalIsp = testIsps[idx];

    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const geo = await response.json();
        if (geo.ip) {
          finalIp = geo.ip;
          finalIsp = geo.org || geo.asn || finalIsp;
          if (geo.city && geo.country_name) {
            finalLocation = `${geo.city}, ${geo.country_name}`;
          } else if (geo.country_name) {
            finalLocation = geo.country_name;
          }
        }
      }
    } catch (e) {
      console.warn('Real IP Geolocation lookup bypassed, using fallback.', e);
    }

    const mockLog: Omit<WordPressLoginLog, 'id'> = {
      login_time: type === 'success' ? nowIso : null,
      failed_time: type === 'failed' ? nowIso : null,
      logout_time: null,
      username: type === 'failed' && Math.random() > 0.4 ? 'admin' : testUsernames[idx],
      ip_address: finalIp,
      site_url: 'https://demo-wordpress-site.bd/wp',
      location: finalLocation,
      user_agent: typeof window !== 'undefined' && window.navigator && window.navigator.userAgent 
        ? window.navigator.userAgent 
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) simulated_wordpress_agent_v1.3',
      isp: finalIsp,
      status: type === 'success' ? 'Logged In' : type === 'failed' ? 'Failed' : 'Page Visit',
      session_duration: null,
      visited_url: testUrls[idx]
    };

    const inserted = await supabaseService.createSimulationLog(mockLog);
    if (inserted) {
      setLogs((prev) => [inserted, ...prev.slice(0, pageSize - 1)]);
      setTotalCount((prev) => prev + 1);
    }
    setSimulationLoading(false);
  };

  const forceRefresh = () => {
    fetchDashboardLogs();
  };

  const formatModalTime = (timeStr: string | null) => {
    if (!timeStr) return 'N/A';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minStr = minutes < 10 ? '0' + minutes : minutes;
      const secStr = seconds < 10 ? '0' + seconds : seconds;
      
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      
      return `${day} ${month} ${year} at ${hours}:${minStr}:${secStr} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const getCleanDevice = (ua: string | null | undefined): string => {
    if (!ua) return 'Unknown Device';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) {
      const match = ua.match(/Android\s+([^\s;]+);\s+([^;)]+)/);
      if (match && match[2]) {
        return match[2].trim();
      }
      return 'Android Device';
    }
    if (ua.includes('Macintosh')) return 'Macbook Pro / Mac OS';
    if (ua.includes('Windows NT 10.0')) return 'Windows 10/11 PC Desktop';
    if (ua.includes('Windows NT 6.1')) return 'Windows 7 PC';
    if (ua.includes('Windows')) return 'Windows PC Machine';
    if (ua.includes('Linux')) return 'Linux Workspace Machine';
    return 'Desktop Client';
  };

  const downloadLogAsHDImage = (log: WordPressLoginLog) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Deep Dark professional luxury background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 1100, 700);

    // Dynamic emerald status border highlights
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 1080, 680);

    // Decorative digital grids
    ctx.fillStyle = 'rgba(16, 185, 129, 0.015)';
    ctx.fillRect(15, 15, 1070, 670);

    // Header Content
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('THINK EASY ACADEMY • SPECIFIC LOG INFO', 50, 75);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText(`LOG SECURITY TRANSACTION ID: #${log.id}`, 50, 105);

    // Thin elegant separator line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 130);
    ctx.lineTo(1050, 130);
    ctx.stroke();

    // Body Metadata Container
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(40, 160, 1020, 440);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(40, 160, 1020, 440);

    // Info Fields Layout - Column 1
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('TARGET ACCOUNT / USERNAME:', 80, 215);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(log.username || 'unknown', 80, 245);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('SECURITY STATUS:', 80, 315);
    ctx.fillStyle = log.status === 'Logged In' ? '#10b981' : '#f87171';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(log.status || 'N/A', 80, 345);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('LOGIN TIMESTAMP (12HR UTC):', 80, 415);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px monospace';
    ctx.fillText(formatModalTime(log.login_time || log.failed_time || log.logout_time), 80, 445);

    // Info Fields Layout - Column 2
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('IP ACCESS GATEWAY:', 580, 215);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(log.ip_address || 'N/A', 580, 245);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('WEBSITE:', 580, 315);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px monospace';
    ctx.fillText(log.site_url || 'N/A', 580, 345);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('VISITED URL:', 580, 415);
    ctx.fillStyle = '#60a5fa';
    ctx.font = '15px monospace';
    ctx.fillText(log.visited_url || 'N/A', 580, 445);

    // Bottom Combined Device block
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('DEVICE:', 80, 515);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(getCleanDevice(log.user_agent), 80, 545);

    // Centered professional signature footer
    ctx.fillStyle = '#475569';
    ctx.font = 'italic 11px monospace';
    ctx.fillText('*Electronic generated Picture', 50, 645);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Developed by Think Easy Academy...💖', 1050, 645);

    const imageURI = canvas.toDataURL('image/png');
    const dlLink = document.createElement('a');
    dlLink.href = imageURI;
    dlLink.download = `${log.username || 'unknown'}_Specificlog.png`;
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {activeTab === 'logs' 
              ? (isBn ? 'কার্যক্রম নিরাপত্তা লগ ড্যাশবোর্ড' : 'Security Log Activity')
              : activeTab === 'users'
                ? (isBn ? 'ড্যাশবোর্ড (Dashboard)' : 'Dashboard')
                : (isBn ? 'ট্রাফিক বিশ্লেষণ (Traffic Analysis)' : 'Traffic Analysis')}
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {activeTab === 'logs'
              ? (isBn ? 'ওয়ার্ডপ্রেস সাইটের রিয়েল-টাইম কার্যক্রম পর্যবেক্ষণ করুন।' : 'Monitor successful connections, page views, and potential hacking events in real-time.')
              : activeTab === 'users'
                ? (isBn ? 'কোন ডিভাইস, ব্রাউজার এবং পেইলোড দিয়ে ইউজাররা লগইন করেছেন তা দেখুন।' : 'Inspect browser contexts, IPs, and login payloads for active users.')
                : (isBn ? 'সহজ তালা-চাবির থিওরিতে ট্রাফিক ও নিরাপত্তা রেকর্ড পর্যবেক্ষণ।' : 'Simple lock and key explanations of visitor logs and actions.')}
          </p>
        </div>

        {/* Dynamic simulator shortcut - Simplified to be completely non-intrusive */}
        <div className={`border rounded-xl px-3.5 py-2 flex items-center gap-1.5 text-xs transition-colors duration-200 ${
          isDark ? 'bg-[#15192a] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {isBn ? 'টেস্ট সিমুলেশন:' : 'Test Inserts:'}
          </span>
          <button
            onClick={() => handleSimulateLog('success')}
            disabled={simulationLoading}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[9px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            + {isBn ? 'সফল লগইন' : 'Success'}
          </button>
          <button
            onClick={() => handleSimulateLog('failed')}
            disabled={simulationLoading}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-extrabold px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            + {isBn ? 'ব্যর্থ হ্যাক' : 'Failed'}
          </button>
          <button
            onClick={forceRefresh}
            className={`p-1 hover:bg-slate-55/60 ml-1 rounded ${isDark ? 'text-gray-450 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            title="Force refresh raw table"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Top Navigation Bar (lg:hidden) with elegant three-dot menu trigger */}
      <div className={`lg:hidden flex items-center justify-between px-5 py-3 border-b border-t rounded-2xl transition-all duration-200 ${
        isDark 
          ? 'bg-[#111420]/80 border-gray-800/60 text-gray-200' 
          : 'bg-white border-slate-200/80 text-slate-800 shadow-sm'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider leading-none mb-1">
              {isBn ? 'সক্রিয় বিভাগ' : 'ACTIVE VIEW'}
            </span>
            <span className="text-xs font-black tracking-tight leading-none">
              {activeTab === 'logs' 
                ? (isBn ? t.activeTabLogs : 'User Activity')
                : activeTab === 'users'
                  ? (isBn ? 'ব্যবহারকারীদের ডাটা (Users Data)' : 'Users Data')
                  : (isBn ? 'ট্রাফিক বিশ্লেষণ (Traffic Analysis)' : 'Traffic Analysis')}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center scale-100 active:scale-95 duration-100 ${
            isDark 
              ? 'bg-gray-850 hover:bg-gray-800 text-gray-300 border-gray-800' 
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title={isBn ? 'মেনু খুলুন' : 'Open Menu'}
        >
          <MoreVertical className="w-4 h-4 text-emerald-500" />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sidebar navigation */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          userEmail={user.email} 
          onLogout={onLogout}
          language={language}
          theme={theme}
        />

        {/* Main Viewport panel */}
        <div id="main-feed-container" className="flex-1 w-full min-w-0">
          {activeTab === 'logs' ? (
            <LogsTable 
              logs={logs}
              totalCount={totalCount}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              pageSize={pageSize}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              isSupabase={isSupabase}
              onRefresh={forceRefresh}
              isLoading={isLoading}
              language={language}
              theme={theme}
              onInspectLog={setInspectedLog}
            />
          ) : activeTab === 'users' ? (
            <DailyUsers 
              logs={logs}
              language={language}
              theme={theme}
              onInspectLog={setInspectedLog}
            />
          ) : (
            <TrafficAnalysis 
              logs={logs}
              language={language}
              theme={theme}
            />
          )}
        </div>

      </div>

      {/* --- Dynamic Inspections Detail POP-UP Modal with clear closing "X" button --- */}
      {inspectedLog && (
        <div className="fixed inset-0 bg-[#07090e]/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          
          <div className={`relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border transition-all duration-200 ${
            isDark ? 'bg-[#111420] border-gray-800 text-white' : 'bg-white border-slate-205 text-slate-800'
          }`}>
            
            {/* Pop-up Header Bar with X button */}
            <div className={`px-6 py-4.5 border-b flex items-center justify-between ${
              isDark ? 'bg-[#171b2d] border-gray-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <Cpu className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">{isBn ? 'বিস্তারিত বিবরণী' : 'Details'}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">UUID ID: #{inspectedLog.id}</p>
                </div>
              </div>

              {/* Close Button of the popup modal: clearly styled with RED Accent color highlight */}
              <button 
                onClick={() => setInspectedLog(null)}
                className={`p-2 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-center scale-100 hover:scale-105 ${
                  isDark 
                    ? 'bg-gray-800 hover:bg-red-500/20 hover:text-red-400 border-gray-700' 
                    : 'bg-slate-100 hover:bg-red-500/10 hover:text-red-500 border-slate-200'
                }`}
                title={isBn ? 'বন্ধ করুন (Close)' : 'Close dialog'}
              >
                <X className="w-4 h-4 text-red-500 font-black stroke-[3px]" />
              </button>
            </div>

            {/* Pop-up Body Contents */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Top Banner details */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isDark ? 'bg-[#090b12] border-gray-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{isBn ? 'ব্যবহারকারীর নাম (Username)' : 'Username'}</span>
                  <span className="text-sm font-extrabold text-emerald-500 block font-mono">{inspectedLog.username}</span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">{isBn ? 'লগইন অবস্থা (Status)' : 'Connectivity status'}</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                    inspectedLog.status === 'Logged In' 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25' 
                      : inspectedLog.status === 'Failed' 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/25' 
                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/25'
                  }`}>
                    {inspectedLog.status === 'Logged In' ? (isBn ? '🔑 সফল লগইন' : '🔑 Logged In') : inspectedLog.status === 'Failed' ? (isBn ? '💥 ব্যর্থ হ্যাক' : '💥 Failed Hack') : (isBn ? '🌐 পেজ ভিজিট' : '🌐 Page Visit')}
                  </span>
                </div>
              </div>

              {/* Grid detail entries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#0f111a] border-gray-800' : 'bg-transparent border-slate-205'}`}>
                  <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {isBn ? 'লগইন সময় (LOGIN TIME):' : 'LOGIN TIME:'}
                  </span>
                  <p className="font-semibold">{formatModalTime(inspectedLog.login_time || inspectedLog.failed_time || inspectedLog.logout_time)}</p>
                </div>

                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#0f111a] border-gray-800' : 'bg-transparent border-slate-205'}`}>
                  <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    {isBn ? 'আইপি অ্যাড্রেস (Network IP Address):' : 'IP Address:'}
                  </span>
                  <p className="font-mono font-bold text-emerald-400">{inspectedLog.ip_address}</p>
                </div>

                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#0f111a] border-gray-800' : 'bg-transparent border-slate-205'}`}>
                  <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider mb-1 block">{isBn ? 'আইএসপি / ব্রডব্যান্ড (ISP Gate):' : 'ISP Provider:'}</span>
                  <p className="font-medium">{inspectedLog.isp || 'N/A'}</p>
                </div>

                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#0f111a] border-gray-800' : 'bg-transparent border-slate-205'}`}>
                  <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider mb-1 block">{isBn ? 'ভৌগোলিক অবস্থান (Location Geo-IP):' : 'Geolocation Location:'}</span>
                  <p className="font-medium">{inspectedLog.location || 'N/A'}</p>
                </div>

                <div className={`p-3.5 rounded-xl border sm:col-span-2 ${isDark ? 'bg-[#0f111a] border-gray-800' : 'bg-transparent border-slate-205'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-800/20">
                    <div className="pr-0 sm:pr-2">
                      <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider mb-1">{isBn ? 'ওয়ার্ডপ্রেস সাইট URL:' : 'WP Site URL:'}</span>
                      <a href={inspectedLog.site_url} target="_blank" rel="noreferrer" className="text-emerald-450 hover:underline block break-all text-[11px] font-mono">{inspectedLog.site_url || 'N/A'}</a>
                    </div>
                    <div className="pt-2.5 sm:pt-0 pl-0 sm:pl-3">
                      <span className="text-slate-400 font-bold text-[10px] block uppercase tracking-wider mb-1">{isBn ? 'ভিজিটকৃত রাউট:' : 'Visited Target Road:'}</span>
                      <p className="text-blue-405 font-mono text-[11px] break-all whitespace-normal select-all">{inspectedLog.visited_url || 'N/A'}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* User Agent "What they logged in with" */}
              <div className="space-y-1.5 text-xs">
                <span className="text-slate-405 font-bold text-[10px] block uppercase tracking-wider flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                  {isBn ? 'যে ব্রাউজার দিয়ে লগইন করেছেন (what they logged in with):' : 'Logged environment user-agent headers:'}
                </span>
                <p className={`p-3.5 rounded-xl border font-mono text-[10px] leading-relaxed break-all select-all ${
                  isDark ? 'bg-[#0a0c13] border-gray-800 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-650'
                }`}>
                  {inspectedLog.user_agent}
                </p>
              </div>

              {/* Postgres Raw JSON logs payload */}
              <div className="space-y-1.5 text-xs">
                <span className="text-slate-405 font-bold text-[10px] block uppercase tracking-wider flex items-center gap-1 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-amber-500" />
                  raw postgres JSON database payload:
                </span>
                <pre className={`p-4 rounded-xl border font-mono text-[9px] overflow-x-auto max-h-[140px] whitespace-pre select-all ${
                  isDark ? 'bg-[#05060b] border-gray-800/80 text-emerald-450' : 'bg-slate-100 border-slate-220 text-emerald-800'
                }`}>
                  {JSON.stringify(inspectedLog, null, 2)}
                </pre>
              </div>

            </div>

            {/* Pop-up Footer button replaced with HD screenshot/PNG picture saver */}
            <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDark ? 'bg-[#0a0c13]/50 border-gray-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {isBn ? 'থিংক ইজি সিকিউরিটি শিল্ড' : 'Think Easy Security Card'}
              </span>
              <button 
                onClick={() => downloadLogAsHDImage(inspectedLog)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold rounded-xl text-xs py-2.5 px-5 shadow-lg flex items-center justify-center gap-2 transition-all duration-155 transform active:scale-95 cursor-pointer w-full sm:w-auto"
                title={isBn ? 'ছবি ডাউনলোড করুন' : 'Download Picture'}
              >
                📥 {isBn ? 'ছবি ডাউনলোড করুন' : 'Download Picture'}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Mobile Menu Backdrop & Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-[#07090e]/85 backdrop-blur-md z-[99999] flex items-end sm:items-center justify-center p-4 overflow-y-auto animate-fade-in">
          
          <div className={`relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300 transform scale-100 ${
            isDark ? 'bg-[#111420] border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            
            {/* Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-[#171b2d] border-gray-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold border border-emerald-500/20">
                  ⚡
                </div>
                <span className="font-extrabold text-xs tracking-tight">Think Easy Navigation</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer text-red-500 font-bold ${
                  isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-slate-100 border-slate-200 hover:bg-[#ffebeb]'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-5 space-y-5">
              
              {/* Operator info section */}
              <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                isDark ? 'bg-[#0e111b] border-gray-850' : 'bg-slate-50 border-slate-150'
              }`}>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block">
                    {isBn ? 'বর্তমান অপারেটর' : 'Current Operator'}
                  </span>
                  <div className="text-[11px] font-bold truncate opacity-85" title={user.email}>
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Navigation items */}
              <div className="space-y-1.5">
                {[
                  { key: 'logs', label: isBn ? t.activeTabLogs : 'User Activity', desc: isBn ? 'সফল ও ব্যর্থ হ্যাক ট্র্যাকার' : 'Activity & hacking trackers', icon: Activity },
                  { key: 'users', label: isBn ? 'ব্যবহারকারীদের ডাটা (Users Data)' : 'Users Data', desc: isBn ? 'ডিভাইস ও আইপি তথ্য' : 'Browser device and IP payload', icon: Users },
                  { key: 'traffic', label: isBn ? 'ট্রাফিক বিশ্লেষণ (Traffic Analysis)' : 'Traffic Analysis', desc: isBn ? 'সহজ থিওরিতে ট্রাফিক' : 'Lock & Key security analysis', icon: LineChart }
                ].map((item) => {
                  const IconComp = item.icon;
                  const isSelected = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveTab(item.key as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? isDark
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          : isDark ? 'bg-gray-900/40 border-gray-850 hover:bg-gray-850 text-gray-400 hover:text-white' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100/50 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-emerald-500' : 'opacity-70'}`} />
                      <div className="min-w-0">
                        <span className="font-bold text-xs block">{item.label}</span>
                        <span className="text-[10px] opacity-60 block mt-0.5">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Logout Block */}
              <div className="pt-4 border-t border-dashed border-gray-800/30 dark:border-gray-800 text-slate-500">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className={`w-full flex items-center justify-center gap-2 text-xs font-bold rounded-xl py-2.5 border transition-all duration-150 cursor-pointer ${
                    isDark 
                      ? 'bg-red-500/5 hover:bg-red-500 text-red-400 hover:text-white border-red-500/10 hover:border-red-500' 
                      : 'bg-red-50/50 hover:bg-red-600 text-red-600 hover:text-white border-red-100 hover:border-red-601'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.logoutSessions}</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
