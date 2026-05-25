import React from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Layers,
  ZoomIn,
  Key,
  ShieldAlert,
  Eye,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Clock
} from 'lucide-react';
import { WordPressLoginLog } from '../types';
import { translations } from '../translations';

interface LogsTableProps {
  logs: WordPressLoginLog[];
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  isSupabase: boolean;
  onRefresh: () => void;
  isLoading: boolean;
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
  onInspectLog: (log: WordPressLoginLog) => void;
}

export default function LogsTable({
  logs,
  totalCount,
  currentPage,
  setCurrentPage,
  pageSize,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  isSupabase,
  onRefresh,
  isLoading,
  language,
  theme,
  onInspectLog
}: LogsTableProps) {
  const t = translations[language];
  const isDark = theme === 'dark';

  // Total calculated pages
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getLogTime = (log: WordPressLoginLog) => {
    return log.login_time || log.failed_time || log.logout_time;
  };

  // Convert raw timestamp to clean 'Time Ago' human-readable text
  const getTimeAgo = (timeStr: string | null) => {
    if (!timeStr) return '';
    const now = new Date();
    const date = new Date(timeStr);
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSecs < 60) {
      return language === 'bn' ? 'এইমাত্র' : 'just now';
    }
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return language === 'bn' ? `${diffMins} মিনিট আগে` : `${diffMins}m ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return language === 'bn' ? `${diffHours} ঘণ্টা আগে` : `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return language === 'bn' ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
  };

  /**
   * BANNER STATE COMPUTATION:
   * Alert state: If any 'Failed' rows are registered in the last 30 minutes, show Alert State.
   * Else: normal state with total successful user logins today.
   */
  const now = new Date();
  const last30MinsLogs = logs.filter(log => {
    if (log.status !== 'Failed') return false;
    const timeStr = log.failed_time || log.login_time || log.logout_time;
    if (!timeStr) return false;
    const logDate = new Date(timeStr);
    return (now.getTime() - logDate.getTime()) < 30 * 60 * 1000;
  });

  const isAlertState = last30MinsLogs.length > 0;
  const alertCount = last30MinsLogs.length;
  const alertLocation = last30MinsLogs[0]?.location || (language === 'bn' ? 'অজানা অবস্থান' : 'Unknown Origin');

  const todaySuccessCount = logs.filter(log => {
    if (log.status !== 'Logged In') return false;
    const timeStr = log.login_time;
    if (!timeStr) return false;
    const logDate = new Date(timeStr);
    return logDate.toDateString() === now.toDateString();
  }).length;

  /**
   * AREA CHART COMPUTATION:
   * Tracking general log trends over the last 24 hours (12 periods of 2 hours).
   */
  const hourlyRange = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getTime() - (11 - i) * 2 * 60 * 60 * 1000);
    return d;
  });

  const trafficTrendData = hourlyRange.map(d => {
    const hourLabel = d.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const windowStart = d.getTime() - 1 * 60 * 60 * 1000;
    const windowEnd = d.getTime() + 1 * 60 * 60 * 1000;

    const count = logs.filter(log => {
      const logTimeStr = log.login_time || log.failed_time || log.logout_time;
      if (!logTimeStr) return false;
      const logTime = new Date(logTimeStr).getTime();
      return logTime >= windowStart && logTime < windowEnd;
    }).length;

    return { label: hourLabel, value: count };
  });

  const maxTrafficVal = Math.max(...trafficTrendData.map(t => t.value), 4);

  // Return story item icon
  const getStoryIcon = (status: string) => {
    switch (status) {
      case 'Logged In':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Key className="w-4 h-4" />
          </div>
        );
      case 'Failed':
        return (
          <div className="w-8 h-8 rounded-full bg-red-400/10 text-red-500 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      case 'Page Visit':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
        );
      case 'Logged Out':
        return (
          <div className="w-8 h-8 rounded-full bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        );
    }
  };

  // Human-readable formatted text generator
  const getStorySentence = (log: WordPressLoginLog) => {
    const rawUsername = log.username || '';
    const usernameText = rawUsername || (language === 'bn' ? 'অজানা ব্যবহারকারী' : 'Anonymous');
    const locationText = log.location || (language === 'bn' ? 'অজানা অবস্থান' : 'Unknown Origin');
    const ispText = log.isp ? `(via ${log.isp})` : '';
    const ipText = log.ip_address ? `(IP: ${log.ip_address})` : '';

    if (log.status === 'Logged In') {
      return language === 'bn' ? (
        <>
          <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{usernameText}</span> {locationText} থেকে সফলভাবে প্রবেশ করেছেন {ispText}.
        </>
      ) : (
        <>
          <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{usernameText}</span> logged in safely from {locationText} {ispText}.
        </>
      );
    } else if (log.status === 'Failed') {
      return language === 'bn' ? (
        <>
          <span className="text-red-500 font-extrabold">{usernameText === 'admin' ? 'প্রশাসনিক অ্যাকাউন্ট (admin)' : usernameText}</span>-এ লগইনের ব্যর্থ আক্রমণ সনাক্ত হয়েছে {locationText} থেকে {ipText}.
        </>
      ) : (
        <>
          Anonymous Attempt failed under username <span className="text-red-500 font-extrabold">{usernameText}</span> from {locationText} {ipText}.
        </>
      );
    } else if (log.status === 'Page Visit') {
      const visitedUrlText = log.visited_url || '/wp-admin';
      return language === 'bn' ? (
        <>
          <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{usernameText}</span> পেইজ ভিউ সম্পন্ন করেছেন <span className="font-mono text-[10px] text-blue-400">{visitedUrlText}</span>.
        </>
      ) : (
        <>
          <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{usernameText}</span> visited <span className="font-mono text-[11px] bg-slate-500/10 px-1.5 py-0.5 rounded text-blue-500">{visitedUrlText}</span>.
        </>
      );
    } else if (log.status === 'Logged Out') {
      return language === 'bn' ? (
        <>
          <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{usernameText}</span> সফলভাবে প্রস্থান (Logout) করেছেন {locationText}.
        </>
      ) : (
        <>
          <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{usernameText}</span> logged out from {locationText}.
        </>
      );
    } else {
      return language === 'bn' ? (
        <>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{usernameText}</span> কোনো ঘটনা ঘটিয়েছে {locationText}.
        </>
      ) : (
        <>
          Event captured by operator <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{usernameText}</span> at {locationText}.
        </>
      );
    }
  };

  // Return status bagde element
  const getStatusLabelBadge = (status: string) => {
    switch (status) {
      case 'Logged In':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/15 leading-none shrink-0 font-mono">
            {language === 'bn' ? '🔑 সফল' : '🔑 Logged In'}
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/15 leading-none shrink-0 font-mono">
            {language === 'bn' ? '💥 ব্যর্থ হ্যাক' : '💥 Alert'}
          </span>
        );
      case 'Page Visit':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/15 leading-none shrink-0 font-mono">
            {language === 'bn' ? '🌐 ভিউ' : '🌐 Page views'}
          </span>
        );
      case 'Logged Out':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/15 leading-none shrink-0 font-mono">
            {language === 'bn' ? '🔌 প্রস্থান' : '🔌 Logged Out'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/15 leading-none shrink-0">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* 3. Top Banner (Dynamic Health Status Box) */}
      <div className={`p-6 md:p-8 rounded-2xl border transition-all duration-300 ${
        isAlertState 
          ? 'bg-red-500/5 border-red-500/15 text-left' 
          : isDark 
            ? 'bg-[#1b2234] border-gray-800' 
            : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-start gap-4">
          <span className="relative flex h-3.5 w-3.5 mt-1.5 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isAlertState ? 'bg-red-400' : 'bg-emerald-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
              isAlertState ? 'bg-red-500' : 'bg-emerald-500'
            }`}></span>
          </span>
          <div className="space-y-1 text-left">
            <h2 className={`text-base sm:text-lg font-medium tracking-tight leading-relaxed ${
              isAlertState ? 'text-red-400' : isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {isAlertState ? (
                language === 'bn' 
                  ? `সতর্কতা: সম্প্রতি ${alertLocation} থেকে ${alertCount} টি ব্যর্থ লগইনের চেষ্টা সনাক্ত করা হয়েছে।`
                  : `Alert: ${alertCount} failed login attempts detected from ${alertLocation} recently.`
              ) : (
                language === 'bn'
                  ? `সবকিছু শান্ত দেখাচ্ছে, অ্যাডমিন। আজ ${todaySuccessCount} জন ব্যবহারকারী নিরাপদে লগইন করেছেন।`
                  : `Everything looks quiet right now, Admin. ${todaySuccessCount} users logged in safely today.`
              )}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {isAlertState 
                ? (language === 'bn' ? 'তাত্ক্ষণিক সাইন-ইন ট্র্যাফিক পর্যবেক্ষণ করতে ব্যর্থ লগইনটি বিশদভাবে দেখুন।' : 'Investigate failed login headers immediately to trace brute-force origins.')
                : (language === 'bn' ? 'রিয়েল-টাইম লাইভ সাবস্ক্রিপশন সক্রিয় রয়েছে' : 'Live real-time monitoring active. All gateways secure.')}
            </p>
          </div>
        </div>
      </div>



      {/* Interactive Controls & 5. Log Feed (The Story Format) */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 ${
        isDark ? 'bg-[#1b2234] border-gray-800' : 'bg-white border-slate-200'
      }`}>
        
        {/* Toggle + Search Header */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b border-gray-800/10 dark:border-gray-800 mb-6">
          
          {/* 6. Filter Toggle buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`text-xs font-semibold pb-1.5 transition-all relative cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-350'
              }`}
            >
              [ {language === 'bn' ? 'সকল কার্যক্রম প্রদর্শন' : 'Show All Activity'} ]
            </button>
            
            <button
              onClick={() => { setStatusFilter('Failed'); setCurrentPage(1); }}
              className={`text-xs font-semibold pb-1.5 transition-all relative cursor-pointer ${
                statusFilter === 'Failed'
                  ? 'text-red-500 border-b-2 border-red-500'
                  : 'text-slate-400 hover:text-red-400/80'
              }`}
            >
              [ {language === 'bn' ? 'সন্দেহজনক লগ্স (ব্যর্থ আক্রমণ)' : 'Suspicious Logs Only'} ]
            </button>
          </div>

          {/* Minimal Search Line */}
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-52">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder={t.searchPlaceholder}
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-[#121826] text-gray-200 border border-gray-800 focus:border-emerald-500' 
                    : 'bg-slate-100 text-slate-900 border border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`p-2 border rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 ${
                isDark 
                  ? 'bg-gray-850 hover:bg-gray-800 text-gray-300 border-gray-800' 
                  : 'bg-slate-100 hover:bg-slate-205 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title={t.refreshBtn}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 5. Human Readable Story-Driven Sentence Feed */}
        <div className="space-y-3.5">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400 italic">
              <div className="flex justify-center items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                <span>{language === 'bn' ? 'তথ্য লোড হচ্ছে...' : 'Loading secure records...'}</span>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic">
              {language === 'bn' ? 'কোনো রেকর্ড পাওয়া যায়নি।' : 'No activity records matching query filters.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-800/10 dark:divide-gray-850/50">
              {logs.map((log) => {
                const timeStr = getLogTime(log);
                const timeAgoText = getTimeAgo(timeStr);
                return (
                  <div
                    key={log.id}
                    onClick={() => onInspectLog(log)}
                    className={`flex items-center justify-between gap-4 py-3.5 px-2.5 transition-all duration-200 rounded-xl cursor-pointer ${
                      isDark 
                        ? 'hover:bg-gray-800/20' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {getStoryIcon(log.status)}
                      <div className="text-xs leading-relaxed text-slate-400 min-w-0">
                        {getStorySentence(log)}
                        
                        <span className="inline-flex items-center text-[10px] text-slate-400 whitespace-nowrap ml-1.5">
                          • {timeAgoText}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-1 shrink-0">
                      {getStatusLabelBadge(log.status)}
                      <button
                        onClick={(e) => { e.stopPropagation(); onInspectLog(log); }}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isDark 
                            ? 'bg-gray-850 border-gray-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30' 
                            : 'bg-white border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300'
                        }`}
                        title={t.logActionDetail}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Pagination section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-gray-800/10 dark:border-gray-800">
          <span className="text-[11px] text-slate-400 font-mono">
            {t.pageOf} {currentPage} / {totalPages} ({totalCount} {t.recordsTotal})
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isLoading}
              className={`p-1.5 border rounded-lg transition-all disabled:opacity-30 cursor-pointer ${
                isDark 
                  ? 'bg-gray-850 hover:bg-gray-800 text-gray-400 border-gray-800 hover:text-white' 
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 shadow-sm'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            <span className={`text-xs font-mono px-3 py-1 bg-slate-500/5 rounded-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {currentPage}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isLoading}
              className={`p-1.5 border rounded-lg transition-all disabled:opacity-30 cursor-pointer ${
                isDark 
                  ? 'bg-gray-850 hover:bg-gray-800 text-gray-400 border-gray-800 hover:text-white' 
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 shadow-sm'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
