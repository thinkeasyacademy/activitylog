import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Layers, 
  Play, 
  Sparkles,
  RefreshCw,
  TrendingUp,
  Activity,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { WordPressLoginLog, ChartDataPoint, DashboardStats } from '../types';
import { supabaseService } from '../supabaseService';
import { translations } from '../translations';

interface OverviewProps {
  logs: WordPressLoginLog[];
  isSupabase: boolean;
  onSimulateLog: (newLog: WordPressLoginLog) => void;
  isLoading: boolean;
  onRefresh: () => void;
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
}

export default function Overview({ 
  logs, 
  isSupabase, 
  onSimulateLog,
  isLoading,
  onRefresh,
  language,
  theme
}: OverviewProps) {
  const t = translations[language];
  const isDark = theme === 'dark';

  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    successfulLogins: 0,
    failedAttacks: 0,
    pageVisits: 0
  });

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [simulationLoading, setSimulationLoading] = useState(false);

  // Recalculate stats whenever logs array updates
  useEffect(() => {
    const total = logs.length;
    const logins = logs.filter(l => l.status === 'Logged In').length;
    const attacks = logs.filter(l => l.status === 'Failed').length;
    const visits = logs.filter(l => l.status === 'Page Visit').length;

    setStats({
      totalEvents: total,
      successfulLogins: logins,
      failedAttacks: attacks,
      pageVisits: visits
    });

    // Generate Chart Data Point Groupings by past 7 days
    const daysData: Record<string, { logins: number; attacks: number; visits: number }> = {};
    const now = new Date();

    // Initialize past 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      const dateString = d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', options);
      daysData[dateString] = { logins: 0, attacks: 0, visits: 0 };
    }

    // Populate actual days using logs timestamp
    logs.forEach(log => {
      const logDateString = log.login_time || log.failed_time || log.logout_time;
      if (logDateString) {
        const dateObj = new Date(logDateString);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const dayKey = dateObj.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', options);
        if (daysData[dayKey]) {
          if (log.status === 'Logged In') daysData[dayKey].logins += 1;
          else if (log.status === 'Failed') daysData[dayKey].attacks += 1;
          else if (log.status === 'Page Visit') daysData[dayKey].visits += 1;
        }
      }
    });

    const formattedPoints: ChartDataPoint[] = Object.keys(daysData).map(key => ({
      date: key,
      successfulLogins: daysData[key].logins,
      failedAttacks: daysData[key].attacks,
      pageVisits: daysData[key].visits
    }));

    setChartData(formattedPoints);
  }, [logs, language]);

  /**
   * WordPress traffic Webhook Simulator
   */
  const handleWordPressSimulation = async (type: 'success' | 'failed' | 'visit') => {
    setSimulationLoading(true);
    
    // Pick dynamic randomized payload properties
    const testUsernames = ['tafhim_wp', 'hacker_root', 'malicious_agent', 'admin_editorial', 'guest_buyer'];
    const testIps = ['103.220.207.12', '185.220.101.5', '8.8.8.8', '192.168.1.1', '66.249.66.1'];
    const testIsps = ['Amber IT', 'Tor Exit Node', 'Google LLC', 'Linode Cloud', 'Grameenphone Ltd'];
    const testLocations = ['Dhaka, BD', 'Frankfurt, DE', 'California, US', 'London, UK', 'Tokyo, JP'];
    const testUrls = ['/wp-login.php', '/wp-admin/index.php', '/wp-admin/plugins.php', '/wp-content/themes', '/blog-detail'];

    const randomIdx = Math.floor(Math.random() * 5);
    const dateString = new Date().toISOString();

    let finalIp = testIps[randomIdx];
    let finalLocation = testLocations[randomIdx];
    let finalIsp = testIsps[randomIdx];

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
      login_time: type === 'success' ? dateString : null,
      failed_time: type === 'failed' ? dateString : null,
      logout_time: null,
      username: type === 'failed' && Math.random() > 0.5 ? 'admin' : testUsernames[randomIdx],
      ip_address: finalIp,
      site_url: 'https://demo-wordpress-security.io',
      location: finalLocation,
      user_agent: typeof window !== 'undefined' && window.navigator && window.navigator.userAgent 
        ? window.navigator.userAgent 
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) simulated_wordpress_agent_v1.0',
      isp: finalIsp,
      status: type === 'success' ? 'Logged In' : type === 'failed' ? 'Failed' : 'Page Visit',
      session_duration: null,
      visited_url: testUrls[randomIdx]
    };

    const inserted = await supabaseService.createSimulationLog(mockLog);
    if (inserted) {
      onSimulateLog(inserted);
    }
    setSimulationLoading(false);
  };

  // Find max value in chart data to scale SVG correctly
  const maxVal = Math.max(...chartData.map(d => Math.max(d.successfulLogins, d.failedAttacks, d.pageVisits, 5)));

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Dynamic Minimalist Title block & Webhook simulation toggles */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.dashboardTitle}
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {t.dashboardSubTitle}
          </p>
        </div>
        
        {/* Simplified Webhook simulator Toolbar */}
        <div className={`border rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs transition-colors duration-200 ${
          isDark ? 'bg-[#171b2d] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            {t.simulatorTitle}:
          </span>
          <button
            onClick={() => handleWordPressSimulation('success')}
            disabled={simulationLoading}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {t.addLoggedIn}
          </button>
          <button
            onClick={() => handleWordPressSimulation('failed')}
            disabled={simulationLoading}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-red-500/20 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {t.addFailed}
          </button>
          <button
            onClick={() => handleWordPressSimulation('visit')}
            disabled={simulationLoading}
            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-blue-500/20 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {t.addVisit}
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`p-1 ml-1 transition-colors disabled:opacity-40 rounded hover:bg-slate-100/50 ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            title={t.refreshBtn}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Clean Minimal Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className={`border p-4 rounded-xl relative transition-all duration-200 ${
          isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {t.totalEvents}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className={`text-2xl font-black font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {stats.totalEvents}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 leading-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            {t.totalEventsDesc}
          </p>
        </div>

        {/* Card 2 */}
        <div className={`border p-4 rounded-xl relative transition-all duration-200 ${
          isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider">
            {t.successLogins}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-black font-mono tracking-tight text-emerald-500">
              {stats.successfulLogins}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 leading-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            {t.successLoginsDesc}
          </p>
        </div>

        {/* Card 3 */}
        <div className={`border p-4 rounded-xl relative transition-all duration-200 ${
          isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className="text-[10px] text-red-500 uppercase font-bold tracking-wider">
            {t.failedAttacks}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-black font-mono tracking-tight text-red-500">
              {stats.failedAttacks}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 leading-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            {t.failedAttacksDesc}
          </p>
        </div>

        {/* Card 4 */}
        <div className={`border p-4 rounded-xl relative transition-all duration-200 ${
          isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className="text-[10px] text-blue-500 uppercase font-bold tracking-wider">
            {t.pageVisits}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-black font-mono tracking-tight text-blue-500">
              {stats.pageVisits}
            </h3>
          </div>
          <p className={`text-[10px] mt-1 leading-normal ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
            {t.pageVisitsDesc}
          </p>
        </div>
      </div>

      {/* SVG Interactive Trend Lines Canvas Card - Highly simplified design */}
      <div className={`border rounded-xl p-5 transition-all duration-200 ${
        isDark ? 'bg-[#111420] border-gray-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-dashed border-gray-800/20">
          <div className="space-y-0.5">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              {t.trendTitle}
            </h3>
            <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {t.trendSub}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
            <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              <span className="w-2.5 h-2 rounded bg-emerald-500 inline-block" />
              {t.legendSuccess}
            </span>
            <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              <span className="w-2.5 h-2 rounded bg-red-500 inline-block" />
              {t.legendFailed}
            </span>
            <span className={`flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              <span className="w-2.5 h-2 rounded bg-blue-500 inline-block" />
              {t.legendVisit}
            </span>
          </div>
        </div>

        {/* Custom Clean SVG Coordinate Grid with direct styling */}
        <div className="relative pt-1">
          {chartData.length === 0 ? (
            <div className={`h-48 flex items-center justify-center text-[11px] italic rounded-xl border ${
              isDark ? 'bg-[#090b12] border-gray-800/40 text-gray-500' : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}>
              {t.emptyChart}
            </div>
          ) : (
            <div className="w-full overflow-x-auto select-none">
              <svg 
                viewBox="0 0 700 220" 
                className={`w-full min-w-[580px] h-52 font-mono text-[9px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}
              >
                {/* Grid horizontal guidelines */}
                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = 20 + ratio * 150;
                  const labelValue = Math.round(maxVal - ratio * maxVal);
                  return (
                    <g key={idx}>
                      <line 
                        x1="50" y1={y} x2="680" y2={y} 
                        stroke={isDark ? '#272d3d' : '#e2e8f0'} 
                        strokeWidth="0.8" 
                        strokeDasharray="3 3" 
                      />
                      <text x="15" y={y + 3} fill={isDark ? '#4b5563' : '#94a3b8'} className="text-right">{labelValue}</text>
                    </g>
                  );
                })}

                {/* Plot points and dynamic curves lines */}
                {(() => {
                  const paddingLeft = 60;
                  const paddingRight = 660;
                  const availableWidth = paddingRight - paddingLeft;
                  const interval = availableWidth / (chartData.length - 1);

                  // Calculate coordinate arrays
                  const pointsSuccess = chartData.map((d, i) => {
                    const x = paddingLeft + i * interval;
                    const y = 170 - (d.successfulLogins / maxVal) * 150;
                    return { x, y, value: d.successfulLogins };
                  });

                  const pointsFailed = chartData.map((d, i) => {
                    const x = paddingLeft + i * interval;
                    const y = 170 - (d.failedAttacks / maxVal) * 150;
                    return { x, y, value: d.failedAttacks };
                  });

                  const pointsVisits = chartData.map((d, i) => {
                    const x = paddingLeft + i * interval;
                    const y = 170 - (d.pageVisits / maxVal) * 150;
                    return { x, y, value: d.pageVisits };
                  });

                  // Build string path for line
                  const dSuccess = pointsSuccess.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const dFailed = pointsFailed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const dVisits = pointsVisits.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <>
                      {/* Clean paths contours */}
                      <path d={dSuccess} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                      <path d={dFailed} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                      <path d={dVisits} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />

                      {/* Points Circles and Value Tooltip labels */}
                      {pointsSuccess.map((p, i) => (
                        <g key={`s-${i}`}>
                          <circle cx={p.x} cy={p.y} r="3" fill="#10b981" stroke={isDark ? '#0d0f14' : '#ffffff'} strokeWidth="1" />
                          {p.value > 0 && (
                            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#10b981" className="font-bold text-[8px]">
                              {p.value}
                            </text>
                          )}
                        </g>
                      ))}

                      {pointsFailed.map((p, i) => (
                        <g key={`f-${i}`}>
                          <circle cx={p.x} cy={p.y} r="3" fill="#ef4444" stroke={isDark ? '#0d0f14' : '#ffffff'} strokeWidth="1" />
                          {p.value > 0 && (
                            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#ef4444" className="font-bold text-[8px]">
                              {p.value}
                            </text>
                          )}
                        </g>
                      ))}

                      {/* X Axis label days */}
                      {chartData.map((d, i) => {
                        const x = paddingLeft + i * interval;
                        return (
                          <g key={`lbl-${i}`}>
                            <line x1={x} y1="170" x2={x} y2="174" stroke={isDark ? '#374151' : '#cbd5e1'} />
                            <text x={x} y="190" textAnchor="middle" fill={isDark ? '#9ca3af' : '#64748b'} className="text-[8px]">
                              {d.date}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}

                {/* Base horizontal X axis baseline line */}
                <line x1="50" y1="170" x2="680" y2="170" stroke={isDark ? '#374151' : '#cbd5e1'} strokeWidth="1" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* WordPress Security integration highlights info panel - Simplified Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box Left */}
        <div className={`border rounded-xl p-5 transition-all duration-200 ${
          isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            {t.threatAnalysis}
          </h4>
          <div className={`space-y-3 text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            <div className="flex gap-2">
              <span className="bg-red-500/10 text-red-500 font-mono text-[9px] px-2 py-0.5 rounded h-fit font-bold shrink-0">Bot Hook</span>
              <p>{t.threatDesc1}</p>
            </div>
            <div className="flex gap-2">
              <span className="bg-amber-500/10 text-amber-500 font-mono text-[9px] px-2 py-0.5 rounded h-fit font-bold shrink-0">Geo Gate</span>
              <p>{t.threatDesc2}</p>
            </div>
          </div>
        </div>

        {/* Box Right */}
        <div className={`border rounded-xl p-5 transition-all duration-200 ${
          isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t.optTitle}
          </h4>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {t.optDesc}
          </p>

          <div className={`rounded-lg p-3 border mt-4 flex items-center justify-between ${
            isDark ? 'bg-[#171c2f] border-gray-800/80' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.latencyTitle}</span>
                <span className={`text-[10px] block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{t.latencyDesc}</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
              {isSupabase ? t.activeLatency : 'Offline Mode'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
