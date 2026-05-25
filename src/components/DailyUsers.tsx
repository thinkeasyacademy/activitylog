import React, { useState, useMemo } from 'react';
import { 
  User, 
  Globe, 
  Monitor, 
  Clock, 
  ShieldAlert, 
  Activity, 
  Calendar,
  Settings,
  ArrowRight,
  Filter,
  CheckCircle,
  XCircle,
  TrendingUp,
  Download
} from 'lucide-react';
import { WordPressLoginLog } from '../types';

interface DailyUsersProps {
  logs: WordPressLoginLog[];
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
  onInspectLog: (log: WordPressLoginLog) => void;
}

export default function DailyUsers({ 
  logs = [], 
  language, 
  theme,
  onInspectLog
}: DailyUsersProps) {
  const isDark = theme === 'dark';
  const isBn = language === 'bn';

  // State elements
  const [filterType, setFilterType] = useState<'today' | '7days' | 'customDays' | 'customDate'>('today');
  const [customDaysCount, setCustomDaysCount] = useState<number>(15);
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // State to filter Success vs Failed vs All
  const [statusMode, setStatusMode] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  // Expanded state tracker
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // States for preview & template choice before download
  const [selectedPreviewGroup, setSelectedPreviewGroup] = useState<any | null>(null);
  const [activePresetTemplate, setActivePresetTemplate] = useState<'emerald' | 'navy' | 'ivory' | 'brutalist'>('emerald');

  // Parse time flexibly with solid error recovery
  const parseLogDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    
    // In case string has custom spaces or characters
    try {
      const cleaned = dateStr.replace(/-/g, '/');
      const tr = new Date(cleaned);
      if (!isNaN(tr.getTime())) return tr;
    } catch(e){}
    return new Date();
  };

  // 1. Identify active time boundaries
  const filteredLogsByDate = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return logs.filter(log => {
      // Pick best timestamp available
      const rawTime = log.login_time || log.failed_time || log.logout_time;
      if (!rawTime) return false;
      const logDate = parseLogDate(rawTime);

      if (filterType === 'today') {
        // Only logs recorded strictly from 12:00 AM of today
        return logDate.getTime() >= todayStart.getTime();
      }

      if (filterType === '7days') {
        const boundary = new Date();
        boundary.setDate(boundary.getDate() - 7);
        boundary.setHours(0, 0, 0, 0);
        return logDate.getTime() >= boundary.getTime();
      }

      if (filterType === 'customDays') {
        const boundary = new Date();
        boundary.setDate(boundary.getDate() - customDaysCount);
        boundary.setHours(0, 0, 0, 0);
        return logDate.getTime() >= boundary.getTime();
      }

      if (filterType === 'customDate') {
        const sBound = new Date(startDateStr);
        sBound.setHours(0, 0, 0, 0);

        const eBound = new Date(endDateStr);
        eBound.setHours(23, 59, 59, 999);

        const logTimeMs = logDate.getTime();
        return logTimeMs >= sBound.getTime() && logTimeMs <= eBound.getTime();
      }

      return true;
    });
  }, [logs, filterType, customDaysCount, startDateStr, endDateStr]);

  // 2. Apply Success, Failed, or All Status Sorting
  const sortedAndFilteredLogs = useMemo(() => {
    return filteredLogsByDate.filter(log => {
      if (statusMode === 'ALL') {
        // Return both successful and failed logins
        return log.status === 'Logged In' || log.status === 'Failed' || log.status === 'Logged Out' || log.status === 'Page Visit';
      }
      if (statusMode === 'SUCCESS') {
        return log.status === 'Logged In';
      }
      if (statusMode === 'FAILED') {
        return log.status === 'Failed';
      }
      return true;
    });
  }, [filteredLogsByDate, statusMode]);

  // 3. User Grouping Memoization
  const userGroups = useMemo(() => {
    const groups: Record<string, {
      username: string;
      logs: WordPressLoginLog[];
      loginCount: number;
      failedCount: number;
      pageVisitsCount: number;
      ips: string[];
      userAgents: string[];
      lastActive: string | null;
    }> = {};

    sortedAndFilteredLogs.forEach(log => {
      const rawUser = log.username || 'unknown';
      if (!groups[rawUser]) {
        groups[rawUser] = {
          username: rawUser,
          logs: [],
          loginCount: 0,
          failedCount: 0,
          pageVisitsCount: 0,
          ips: [],
          userAgents: [],
          lastActive: null
        };
      }

      const g = groups[rawUser];
      g.logs.push(log);

      if (log.status === 'Logged In') g.loginCount++;
      else if (log.status === 'Failed') g.failedCount++;
      else if (log.status === 'Page Visit') g.pageVisitsCount++;

      if (log.ip_address && !g.ips.includes(log.ip_address)) {
        g.ips.push(log.ip_address);
      }
      if (log.user_agent && !g.userAgents.includes(log.user_agent)) {
        g.userAgents.push(log.user_agent);
      }

      // Track latest observed time
      const logTime = log.login_time || log.failed_time || log.logout_time;
      if (logTime) {
        if (!g.lastActive || new Date(logTime).getTime() > new Date(g.lastActive).getTime()) {
          g.lastActive = logTime;
        }
      }
    });

    // Convert keys to structured array
    return Object.values(groups).sort((a,b) => b.logs.length - a.logs.length);
  }, [sortedAndFilteredLogs]);

  // Beautiful human time formatting helper
  const formatTime = (timeStr: string | null | undefined): string => {
    if (!timeStr) return 'N/A';
    try {
      const date = parseLogDate(timeStr);
      return date.toLocaleTimeString(isBn ? 'bn-BD' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }) + ' - ' + date.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (err) {
      return timeStr;
    }
  };

  const formatTime12Hr = (timeStr: string | null | undefined): string => {
    if (!timeStr) return 'N/A';
    try {
      const date = parseLogDate(timeStr);
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
    } catch (err) {
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

  // Filter option label string
  const activeFilterLabel = useMemo(() => {
    if (filterType === 'today') return isBn ? "আজকের ডেটা (Today's Data)" : "Today's Data";
    if (filterType === '7days') return isBn ? "গত ৭ দিনের ডেটা (Last 7 Days' Data)" : "Last 7 Days' Data";
    if (filterType === 'customDays') return isBn ? `বিগত ${customDaysCount} দিনের ডেটা (Last ${customDaysCount} Days' Data)` : `Last ${customDaysCount} Days' Data`;
    if (filterType === 'customDate') return isBn ? `তারিখের ডেটা (${startDateStr} থেকে ${endDateStr})` : `Data from ${startDateStr} to ${endDateStr}`;
    return '';
  }, [filterType, customDaysCount, startDateStr, endDateStr, isBn]);

  // Exporter to download a specific User's Activity Card in high quality PNG image with beautiful preset theme options
  const downloadUserSummaryCard = (group: typeof userGroups[0], template: 'emerald' | 'navy' | 'ivory' | 'brutalist' = 'emerald') => {
    // Sort logs date wise (Update date to previous date, i.e., latest to oldest)
    const sortedLogsForCard = [...group.logs].sort((a, b) => {
      const timeA = new Date(a.login_time || a.failed_time || a.logout_time || 0).getTime();
      const timeB = new Date(b.login_time || b.failed_time || b.logout_time || 0).getTime();
      return timeB - timeA; // Descending (update date to previous date)
    });

    const sessionCount = sortedLogsForCard.length;
    const canvasWidth = 1000;
    const canvasHeight = Math.max(680, 440 + (sessionCount * 45));

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background color palette styling presets
    let bg = '#0a0d14';
    let accent = '#10b981';
    let textMain = '#ffffff';
    let textMuted = '#94a3b8';
    let containerBg = '#0f172a';
    let gridColor = 'rgba(16, 185, 129, 0.015)';

    if (template === 'navy') {
      bg = '#0a1128';
      accent = '#fbbf24';
      textMain = '#ffffff';
      textMuted = '#94a3b8';
      containerBg = '#141e33';
      gridColor = 'rgba(251, 191, 36, 0.015)';
    } else if (template === 'ivory') {
      bg = '#faf8f5';
      accent = '#7c2d12';
      textMain = '#1c1917';
      textMuted = '#78716c';
      containerBg = '#f5f3ef';
      gridColor = 'rgba(124, 45, 18, 0.01)';
    } else if (template === 'brutalist') {
      bg = '#000000';
      accent = '#ffffff';
      textMain = '#ffffff';
      textMuted = '#a1a1aa';
      containerBg = '#111111';
      gridColor = 'rgba(255, 255, 255, 0.01)';
    }

    // Border and fill canvas backgrounds
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Accent line borders
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);

    // Grid details
    ctx.fillStyle = gridColor;
    ctx.fillRect(15, 15, canvasWidth - 30, canvasHeight - 30);

    // Line 1: Main Header line
    ctx.fillStyle = accent;
    ctx.font = 'bold 24px monospace';
    ctx.fillText('THINK EASY ACADEMY • USER DEVICE ACCESS LOGS', 50, 70);

    // Sub headers
    ctx.fillStyle = textMuted;
    ctx.font = '13px monospace';
    const filterText = activeFilterLabel ? activeFilterLabel.toUpperCase() : 'UNKNOWN';
    ctx.fillText(`FILTER TIMELINE RANGE: ${filterText}`, 50, 102);

    const now12hrStr = formatTime12Hr(new Date().toISOString());
    ctx.fillText(`GENERATION TIME (LOCAL): ${now12hrStr}`, 50, 124);

    // Separator line
    ctx.strokeStyle = template === 'ivory' ? '#e7e5e4' : '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 142);
    ctx.lineTo(950, 142);
    ctx.stroke();

    // Boxed Profile details
    ctx.fillStyle = containerBg;
    ctx.fillRect(50, 165, 900, 130);
    ctx.strokeStyle = template === 'ivory' ? '#e7e5e4' : '#1e293b';
    ctx.strokeRect(50, 165, 900, 130);

    // Username
    ctx.fillStyle = textMain;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`TARGET USERNAME: ${group.username.toUpperCase()}`, 75, 205);

    // Counts info
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`SUCCESS CONFIG LOGINS: ${group.loginCount}`, 75, 240);

    ctx.fillStyle = '#ef4444';
    ctx.fillText(`BLOCKED INCIDENT TRIALS: ${group.failedCount}`, 380, 240);

    // Simple Device
    ctx.fillStyle = textMuted;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`DEVICE: ${getCleanDevice(group.userAgents[0]).toUpperCase()}`, 75, 275);

    // Session Details header title
    ctx.fillStyle = accent;
    ctx.font = 'bold 15px monospace';
    ctx.fillText('DETAILED SESSION HISTORY LOGS:', 50, 335);

    // Separator
    ctx.strokeStyle = template === 'ivory' ? '#e7e5e4' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(50, 350);
    ctx.lineTo(950, 350);
    ctx.stroke();

    let currentY = 385;
    ctx.font = '12px monospace';

    sortedLogsForCard.forEach((log) => {
      const rawTime = log.login_time || log.failed_time || log.logout_time;
      const formattedLogTime = formatTime12Hr(rawTime);
      
      let description = '';
      if (log.status === 'Logged In') {
        description = `Logged In successfully (IP: ${log.ip_address || 'N/A'})`;
      } else if (log.status === 'Failed') {
        description = `Failed attempt block try !! (IP: ${log.ip_address || 'N/A'})`;
      } else if (log.status === 'Page Visit') {
        description = `Visited Url: ${log.visited_url || '/wp-admin/index.php'} (IP: ${log.ip_address || 'N/A'})`;
      } else if (log.status === 'Logged Out') {
        description = `Logged Out securely (IP: ${log.ip_address || 'N/A'})`;
      } else {
        description = `${log.status} activity observed safely`;
      }

      ctx.fillStyle = log.status === 'Failed' ? '#ef4444' : log.status === 'Logged In' ? '#10b981' : textMain;
      ctx.fillText(`• [${formattedLogTime}] - ${description}`, 55, currentY);
      currentY += 45;
    });

    // footnote
    ctx.fillStyle = '#475569';
    ctx.font = 'italic 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('*Electronic generated Picture', 50, canvasHeight - 35);

    ctx.fillStyle = accent;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Developed by Think Easy Academy...💖', 950, canvasHeight - 35);

    // Save URI Trigger
    const dataURI = canvas.toDataURL('image/png');
    const lk = document.createElement('a');
    lk.href = dataURI;
    lk.download = `${group.username}_Specificlog.png`;
    document.body.appendChild(lk);
    lk.click();
    document.body.removeChild(lk);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Filtering & Sorting Header Widget */}
      <div className={`p-5 rounded-2xl border transition-all duration-200 ${
        isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-emerald-500 font-extrabold tracking-widest uppercase block mb-1">
              📌 {isBn ? 'ব্যবহারকারীদের ডাটা সংকেত' : 'USER DATABASE RECORD CONTEXT'}
            </span>
            <h2 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isBn ? 'ব্যবহারকারীদের ডাটা (Users Data)' : 'Users Data'}
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {isBn 
                ? 'টাইমলাইন সীমা নির্বাচন করুন এবং সফল বা ব্যর্থ ঘটনার প্যারামিটার সর্টিং করুন।' 
                : 'Select range parameters and sorting criteria for all connectivity logs.'}
            </p>
          </div>

          {/* Quick Filter Selection Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 self-stretch md:self-auto">
            {(['today', '7days', 'customDays', 'customDate'] as const).map((mode) => {
              const isActive = filterType === mode;
              const lbl = mode === 'today' ? (isBn ? 'আজকে (Today)' : 'Today')
                        : mode === '7days' ? (isBn ? '৭ দিন (7 Days)' : '7 Days')
                        : mode === 'customDays' ? (isBn ? 'কাস্টম দিন' : 'Custom Days')
                        : (isBn ? 'কাস্টম তারিখ' : 'Custom Date');

              return (
                <button
                  key={mode}
                  onClick={() => setFilterType(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : isDark 
                        ? 'bg-gray-850 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        {/* --- Interactive Context Settings Form for Custom options --- */}
        {(filterType === 'customDays' || filterType === 'customDate') && (
          <div className={`mt-4 p-4 rounded-xl border flex flex-wrap items-center gap-4 text-xs transition-colors duration-155 ${
            isDark ? 'bg-[#090b12] border-gray-800/80' : 'bg-slate-50/50 border-slate-200'
          }`}>
            {filterType === 'customDays' && (
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-400">{isBn ? 'বিগত দিনের সংখ্যা:' : 'Select days lookback count:'}</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setCustomDaysCount(p => Math.max(1, p - 5))}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg border font-black cursor-pointer ${isDark ? 'bg-gray-800 border-gray-750' : 'bg-white border-slate-250 hover:bg-slate-50'}`}
                  >-</button>
                  <input
                    type="number"
                    value={customDaysCount}
                    onChange={(e) => setCustomDaysCount(Math.max(1, parseInt(e.target.value) || 15))}
                    className={`w-14 h-7 text-center rounded-lg font-mono font-bold border ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-300'}`}
                  />
                  <button 
                    onClick={() => setCustomDaysCount(p => Math.min(180, p + 5))}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg border font-black cursor-pointer ${isDark ? 'bg-gray-800 border-gray-750' : 'bg-white border-slate-250 hover:bg-slate-50'}`}
                  >+</button>
                </div>
              </div>
            )}

            {filterType === 'customDate' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">{isBn ? 'শুরু:' : 'Start:'}</span>
                  <input 
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className={`px-2 py-1 rounded-lg font-mono text-xs border cursor-pointer ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">{isBn ? 'শেষ:' : 'End:'}</span>
                  <input 
                    type="date"
                    value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className={`px-2 py-1 rounded-lg font-mono text-xs border cursor-pointer ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Mode sorting menu */}
        <div className="flex items-center justify-between border-t border-dashed border-gray-800/20 mt-4 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-bold text-slate-400">{isBn ? 'সর্টিং ফিল্টার:' : 'Activity Status Filter:'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {(['ALL', 'SUCCESS', 'FAILED'] as const).map((mode) => {
              const active = statusMode === mode;
              const label = mode === 'ALL' ? (isBn ? 'সব একসাথে (Success & Failed)' : 'All Integrated')
                          : mode === 'SUCCESS' ? (isBn ? 'শুধু সফল (Success Only)' : 'Success Logins')
                          : (isBn ? 'শুধু ব্যর্থ (Failed Only)' : 'Failed Attacks');
              return (
                <button
                  key={mode}
                  onClick={() => setStatusMode(mode)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                    active 
                      ? 'bg-emerald-500 text-slate-950 shadow' 
                      : isDark ? 'bg-gray-850 hover:bg-gray-800 text-gray-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* --- Active Filter Label Display Header --- */}
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span>{activeFilterLabel}</span>
          <span className="normal-case px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-500 font-mono">
            {userGroups.length} {isBn ? 'জন ইউজার' : 'Matched Users'}
          </span>
        </h3>
      </div>

      {/* 2. Main users block, showing dynamic listings context */}
      {userGroups.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200'
        }`}>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-3">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isBn ? 'কোনো একটিভিটি ডেটা বা রেকর্ড এখন পর্যন্ত নেই' : 'No data records yet'}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
            {isBn 
              ? 'বাছাইকৃত ফিল্টারের সীমার মধ্যে কোনো সফল বা ব্যর্থ ট্রাফিক এন্ট্রি পাওয়া যায়নি।' 
              : 'No login events or security sessions match your selected time constraints and filtering modes.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {userGroups.map((group) => {
            const isExpanded = expandedUser === group.username;

            return (
              <div 
                key={group.username}
                className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isDark
                    ? isExpanded ? 'bg-[#141829] border-emerald-500/30 shadow-lg' : 'bg-[#111420] border-gray-850 hover:border-gray-800'
                    : isExpanded ? 'bg-emerald-50/15 border-emerald-300 shadow-md' : 'bg-white border-slate-205 hover:border-slate-300'
                }`}
              >
                
                {/* Expandable summary headers */}
                <div 
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedUser(isExpanded ? null : group.username)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-emerald-500 ${
                      isDark ? 'bg-emerald-500/5' : 'bg-emerald-50'
                    }`}>
                      <User className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {group.username}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-gray-800 text-gray-400' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {group.logs.length} {isBn ? 'টি ঘটনা' : 'records'}
                        </span>
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          IPs: {group.ips.slice(0, 3).join(', ')}
                        </span>
                        {group.lastActive && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              {isBn ? 'সর্বশেষ:' : 'Last observed:'} {formatTime(group.lastActive)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Status summary block */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                    
                    <div className="flex items-center gap-1.5">
                      {group.loginCount > 0 && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20">
                          🔑 {group.loginCount} {isBn ? 'সফল' : 'Success'}
                        </span>
                      )}
                      {group.failedCount > 0 && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/20">
                          💥 {group.failedCount} {isBn ? 'ব্যর্থ' : 'Failed'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Exporter HD png image button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreviewGroup(group);
                        }}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-gray-800/80 hover:bg-emerald-500/20 hover:text-emerald-400 border-gray-700' 
                            : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-605 border-slate-200'
                        }`}
                        title={isBn ? 'ডাউনলোড ইমেজ' : 'Download Picture'}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                        isDark ? 'bg-[#121826] border-gray-800 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        {isExpanded ? (isBn ? 'বন্ধ করুন' : 'Hide') : (isBn ? 'দেখুন' : 'Check Logs')}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Expanded inner feeds content */}
                {isExpanded && (
                  <div className={`p-5 border-t border-dashed ${isDark ? 'border-gray-800' : 'border-slate-150'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      
                      {/* Left Block info column */}
                      <div className="md:col-span-5 space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>
                          <Monitor className="w-4 h-4 text-indigo-505" />
                          {isBn ? 'ডিভাইস এবং নেটওয়ার্ক সোর্স:' : 'Device & Network Hosts:'}
                        </h4>

                        <div className={`p-4 rounded-xl border space-y-3 text-xs leading-relaxed ${
                          isDark ? 'bg-[#121826] border-gray-850' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mb-1">
                              {isBn ? 'ব্যবহৃত ব্রাউজার (User Agent Strings):' : 'Observed User Agents:'}
                            </span>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400 font-mono">
                              {group.userAgents.slice(0, 3).map((agent, index) => (
                                <li key={index} className="break-all">{agent}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-2.5 border-t border-gray-800/10">
                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider mb-1">
                              {isBn ? 'নিবন্ধিত আইএসপি নেটওয়ার্ক গেইটওয়ে:' : 'Registered Network ISP Providers:'}
                            </span>
                            <p className="text-[11px] text-emerald-500 font-semibold font-mono">
                              {group.logs.map(log => log.isp).filter((value, idx, self) => value && self.indexOf(value) === idx).join(', ') || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right Block detail activities stream logs list */}
                      <div className="md:col-span-7 space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>
                          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                          {isBn ? 'নিরাপত্তা লগ কার্যক্রম ভিউয়ার:' : 'Detailed Activities Stream:'}
                        </h4>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {group.logs.map((log) => {
                            const eventTime = log.login_time || log.failed_time || log.logout_time;
                            return (
                              <div 
                                key={log.id}
                                onClick={() => onInspectLog(log)}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                                  isDark 
                                    ? 'bg-[#0a0c13] border-gray-850 hover:border-emerald-500/30 hover:bg-[#0d101d]' 
                                    : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      log.status === 'Logged In' ? 'bg-emerald-500' : log.status === 'Failed' ? 'bg-red-500' : 'bg-blue-500'
                                    }`} />
                                    <span className={`font-black uppercase text-[10px] tracking-wider ${
                                      log.status === 'Logged In' ? 'text-emerald-500' : log.status === 'Failed' ? 'text-red-500' : 'text-blue-500'
                                    }`}>
                                      {log.status}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 block font-mono leading-normal mt-1 space-y-1">
                                    <div>IP: <span className="font-bold text-slate-300">{log.ip_address}</span></div>
                                    <div className="flex items-start gap-1 flex-wrap">
                                      <span className="text-slate-500 font-bold shrink-0">Path:</span>
                                      <span className="text-emerald-500 font-bold tracking-tight select-all break-all whitespace-normal">
                                        {log.visited_url || '/'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-[10px] text-slate-400 block font-mono leading-none">
                                    {formatTime(eventTime)}
                                  </span>
                                  <span className="text-[9px] text-emerald-500 font-bold block uppercase tracking-wider mt-1">
                                    {isBn ? 'বিশদ দেখুন →' : 'Details →'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW TEMPLATE CHOOSER DIALOG/MODAL */}
      {selectedPreviewGroup && (
        <div className="fixed inset-0 bg-[#07090e]/95 backdrop-blur-md z-[99999] flex items-center justify-center p-4 overflow-y-auto text-xs font-sans">
          <div className={`relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border transition-all duration-200 ${
            isDark ? 'bg-[#111420] border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            
            {/* Header bar */}
            <div className={`px-6 py-4.5 border-b flex items-center justify-between ${
              isDark ? 'bg-[#171b2d] border-gray-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest block">🎨 PRE-DOWNLOAD SAMPLE OUTCOME SELECTOR</span>
                <h3 className="text-sm font-black tracking-tight mt-0.5">
                  {isBn ? 'লগ-ইন ছবি টেমপ্লেট নির্বাচন করুন' : 'Select Design Template for User Logs Image'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreviewGroup(null)}
                className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer text-red-500 font-bold ${
                  isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-slate-100 hover:bg-[#ffebeb] border-slate-200'
                }`}
              >
                ✕ Close
              </button>
            </div>

            {/* Split layout: Selector List (Left) and Live Preview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-800 dark:divide-gray-800">
              
              {/* Presets selectors */}
              <div className="lg:col-span-5 p-6 space-y-4">
                <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider mb-2">
                  {isBn ? 'ডাউনলোড করার আগে পছন্দ করুন:' : 'CHOOSE FROM 4 MINIMAL PRESETS:'}
                </span>

                <div className="space-y-3">
                  {[
                    { key: 'emerald', title: 'Cyber Security Slate', desc: 'Futuristic black layout accented by radioactive emerald green highlights.', previewBg: 'bg-[#0a0d14]', borderCol: 'border-emerald-500' },
                    { key: 'navy', title: 'Royal Navy Classic', desc: 'Elegant deep sapphire marine background with rich amber-gold elements.', previewBg: 'bg-[#0a1128]', borderCol: 'border-amber-400' },
                    { key: 'ivory', title: 'Warm Ivory Editorial', desc: 'Exquisite fine-art off-white canvas featuring sepia tone display fonts.', previewBg: 'bg-[#faf8f5]', borderCol: 'border-amber-900' },
                    { key: 'brutalist', title: 'Brutalist Stark', desc: 'No gradients, bold contrasts: pure black and stark monochromatic solid white.', previewBg: 'bg-black', borderCol: 'border-white' }
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => setActivePresetTemplate(preset.key as any)}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        activePresetTemplate === preset.key
                          ? 'bg-emerald-500/10 border-emerald-500'
                          : isDark ? 'bg-gray-900/40 border-gray-850 hover:bg-gray-800' : 'bg-slate-50 border-slate-150 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full ${preset.previewBg} border-2 ${preset.borderCol} shrink-0 mt-0.5`} />
                      <div className="min-w-0">
                        <span className="font-bold text-xs block">{preset.title}</span>
                        <span className="text-[10px] text-slate-400 leading-relaxed block mt-1">{preset.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-dashed border-gray-800/20 dark:border-gray-800">
                  <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wide mb-1">DOWNLOAD PROPERTIES:</span>
                  <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4 leading-normal">
                    <li>Dynamic Device parsing: <span className="text-emerald-500 font-bold">{getCleanDevice(selectedPreviewGroup.userAgents[0])}</span></li>
                    <li>Saves as exactly: <span className="font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-1 rounded">{selectedPreviewGroup.username}_Specificlog.png</span></li>
                    <li>No redundant telemetry country or region codes.</li>
                    <li>Accurate 12-hour AM/PM real-time display tags.</li>
                  </ul>
                </div>
              </div>

              {/* Live Preview Pane */}
              <div className="lg:col-span-7 p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#07090e]">
                <span className="text-[10px] text-slate-400 font-black uppercase mb-3 block text-center">
                  👁️ LIVE HIGH FIDELITY PREVIEW CHART
                </span>

                {/* Simulated PNG look */}
                <div className={`w-full border-4 rounded-xl p-5 shadow-inner scale-95 transition-all duration-300 font-mono ${
                  activePresetTemplate === 'emerald'
                    ? 'bg-[#0a0d14] border-emerald-500 text-white'
                    : activePresetTemplate === 'navy'
                      ? 'bg-[#0a1128] border-amber-400 text-white'
                      : activePresetTemplate === 'ivory'
                        ? 'bg-[#faf8f5] border-[#7c2d12] text-stone-900'
                        : 'bg-black border-white text-white'
                }`}>
                  <div className="space-y-3 leading-snug">
                    <div className={`font-bold text-xs ${
                      activePresetTemplate === 'emerald' ? 'text-emerald-400' : activePresetTemplate === 'navy' ? 'text-amber-400' : activePresetTemplate === 'ivory' ? 'text-[#7c2d12]' : 'text-white'
                    }`}>
                      THINK EASY ACADEMY • USER DEVICE ACCESS LOGS
                    </div>
                    
                    <div className="text-[9px] opacity-65">
                      FILTER TIMELINE RANGE: {activeFilterLabel.toUpperCase()}<br/>
                      GENERATION TIME: {formatTime12Hr(new Date().toISOString())}
                    </div>

                    <div className="border-t border-current opacity-20 my-1"></div>

                    <div className={`p-3 rounded border text-[9.5px] space-y-1 my-2 ${
                      activePresetTemplate === 'emerald' ? 'bg-[#0f172a] border-slate-800' : activePresetTemplate === 'navy' ? 'bg-[#141e33] border-slate-800' : activePresetTemplate === 'ivory' ? 'bg-[#f5f3ef] border-stone-200' : 'bg-[#111] border-slate-900'
                    }`}>
                      <div className="font-bold">TARGET USERNAME: {selectedPreviewGroup.username.toUpperCase()}</div>
                      <div className="text-emerald-500 font-bold">SUCCESS CONFIG LOGINS: {selectedPreviewGroup.loginCount}</div>
                      <div className="text-red-500 font-bold">BLOCKED INCIDENT TRIALS: {selectedPreviewGroup.failedCount}</div>
                      <div className="opacity-70">DEVICE: {getCleanDevice(selectedPreviewGroup.userAgents[0]).toUpperCase()}</div>
                    </div>

                    <div className={`text-[10px] font-bold ${
                      activePresetTemplate === 'emerald' ? 'text-emerald-400' : activePresetTemplate === 'navy' ? 'text-amber-400' : activePresetTemplate === 'ivory' ? 'text-[#7c2d12]' : 'text-white'
                    }`}>
                      DETAILED SESSION HISTORY LOGS:
                    </div>

                    <div className="space-y-1 max-h-[140px] overflow-y-auto text-[9px] leading-relaxed">
                      {selectedPreviewGroup.logs.slice(0, 3).map((log: any, i: number) => (
                        <div key={i} className={log.status === 'Failed' ? 'text-red-500' : log.status === 'Logged In' ? 'text-emerald-500' : ''}>
                          • [{formatTime12Hr(log.login_time || log.failed_time || log.logout_time)}] - {
                            log.status === 'Logged In' ? 'Logged In successfully' : log.status === 'Failed' ? 'Failed attempt block try !!' : 'Activity'
                          } (IP: {log.ip_address || 'N/A'})
                        </div>
                      ))}
                      {selectedPreviewGroup.logs.length > 3 && (
                        <div className="opacity-50 italic">• ... and {selectedPreviewGroup.logs.length - 3} more items</div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    downloadUserSummaryCard(selectedPreviewGroup, activePresetTemplate);
                    setSelectedPreviewGroup(null);
                  }}
                  className="mt-4 w-full max-w-sm px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black cursor-pointer shadow-lg active:scale-95 transition-all text-center text-xs"
                >
                  📥 {isBn ? 'এই নির্বাচিত টেমপ্লেটের ছবি ডাউনলোড করুন' : 'Confirm & Download Selected Picture'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
