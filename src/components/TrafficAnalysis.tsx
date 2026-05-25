import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar,
  ShieldCheck, 
  ShieldAlert, 
  Download, 
  BarChart3, 
  LineChart, 
  TableProperties, 
  PieChart,
  Sparkles,
  Info
} from 'lucide-react';
import { WordPressLoginLog } from '../types';

interface TrafficAnalysisProps {
  logs: WordPressLoginLog[];
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
}

export default function TrafficAnalysis({ 
  logs = [], 
  language, 
  theme 
}: TrafficAnalysisProps) {
  const isDark = theme === 'dark';
  const isBn = language === 'bn';

  // Toggle visual patterns
  // 'bar' | 'chart' | 'table' | 'pie'
  const [activePattern, setActivePattern] = useState<'bar' | 'chart' | 'table' | 'pie'>('bar');

  // Range and filter models
  const [rangeType, setRangeType] = useState<'today' | '7days' | 'customDays' | 'customDate'>('today');
  const [daysCount, setDaysCount] = useState<number>(15);
  const [startD, setStartD] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endD, setEndD] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Parse dates robustly
  const parseLogDate = (dateStr: string | null | undefined): Date => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    try {
      const cleanStr = dateStr.replace(/-/g, '/');
      const tr = new Date(cleanStr);
      if (!isNaN(tr.getTime())) return tr;
    } catch(e){}
    return new Date();
  };

  // Filter logs based on date range selection
  const filteredLogs = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return logs.filter(log => {
      const rawTime = log.login_time || log.failed_time || log.logout_time;
      if (!rawTime) return false;
      const logDate = parseLogDate(rawTime);

      if (rangeType === 'today') {
        return logDate.getTime() >= todayStart.getTime();
      }
      if (rangeType === '7days') {
        const boundary = new Date();
        boundary.setDate(boundary.getDate() - 7);
        boundary.setHours(0, 0, 0, 0);
        return logDate.getTime() >= boundary.getTime();
      }
      if (rangeType === 'customDays') {
        const boundary = new Date();
        boundary.setDate(boundary.getDate() - daysCount);
        boundary.setHours(0, 0, 0, 0);
        return logDate.getTime() >= boundary.getTime();
      }
      if (rangeType === 'customDate') {
        const sBound = new Date(startD);
        sBound.setHours(0, 0, 0, 0);
        const eBound = new Date(endD);
        eBound.setHours(23, 59, 59, 999);

        const logTimeMs = logDate.getTime();
        return logTimeMs >= sBound.getTime() && logTimeMs <= eBound.getTime();
      }
      return true;
    });
  }, [logs, rangeType, daysCount, startD, endD]);

  // General traffic metrics counts
  const stats = useMemo(() => {
    let success = 0;
    let failed = 0;
    let visit = 0;
    let loggedOut = 0;

    filteredLogs.forEach(log => {
      if (log.status === 'Logged In') success++;
      else if (log.status === 'Failed') failed++;
      else if (log.status === 'Logged Out') loggedOut++;
      else if (log.status === 'Page Visit') visit++;
    });

    const total = filteredLogs.length;
    return { total, success, failed, visit, loggedOut };
  }, [filteredLogs]);

  // Report label for heading
  const rangeLabel = useMemo(() => {
    if (rangeType === 'today') return isBn ? "আজকের রিপোর্ট (Today's Report)" : "Today's Report";
    if (rangeType === '7days') return isBn ? "গত ৭ দিনের রিপোর্ট (Last 7 Days)" : "Last 7 Days' Data";
    if (rangeType === 'customDays') return isBn ? `বিগত ${daysCount} দিনের রিপোর্ট` : `Last ${daysCount} Days`;
    if (rangeType === 'customDate') return isBn ? `তারিখের রিপোর্ট (${startD} থেকে ${endD})` : `Report from ${startD} to ${endD}`;
    return '';
  }, [rangeType, daysCount, startD, endD, isBn]);

  // Daily trends for the curve Line Chart (Last 7 Days)
  const dailyTrendData = useMemo(() => {
    const dayLabels: string[] = [];
    const days = 7;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayLabels.push(d.toISOString().split('T')[0]);
    }

    return dayLabels.map(dayStr => {
      const dayLogs = filteredLogs.filter(log => {
        const rawT = log.login_time || log.failed_time || log.logout_time;
        return rawT && rawT.startsWith(dayStr);
      });

      const success = dayLogs.filter(l => l.status === 'Logged In').length;
      const failed = dayLogs.filter(l => l.status === 'Failed').length;
      const visit = dayLogs.filter(l => l.status === 'Page Visit').length;

      return {
        date: dayStr.substring(5), // MM-DD
        success,
        failed,
        visit,
        total: dayLogs.length
      };
    });
  }, [filteredLogs]);

  // Download the selected active visual pattern as an HD PNG picture
  const downloadActivePatternImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background slate dark
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 1200, 800);

    // Dynamic emerald status border highlights
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 1180, 780);

    // Decorative digital grid accent
    ctx.fillStyle = 'rgba(16, 185, 129, 0.01)';
    ctx.fillRect(15, 15, 1170, 770);

    // Report Header block
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('THINK EASY ACADEMY • SECURITY ANALYTICS ENGINE', 50, 70);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 15px monospace';
    const subTitleStr = `ACTIVE RANGE: ${rangeLabel.toUpperCase()}  |  VISUAL TYPE: ${activePattern.toUpperCase()}`;
    ctx.fillText(subTitleStr, 50, 105);

    // Draw horizontal split line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 130);
    ctx.lineTo(1150, 130);
    ctx.stroke();

    // Stats Grid Info on side
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('METRIC SUMMARY DATA:', 50, 185);

    ctx.fillStyle = '#10b981';
    ctx.font = '14px monospace';
    ctx.fillText(`- Success Logins  : ${stats.success} Connections`, 50, 225);

    ctx.fillStyle = '#f87171';
    ctx.fillText(`- Failed Attempts : ${stats.failed} Blocked`, 50, 260);

    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`- Page View Hits  : ${stats.visit} Hits`, 50, 295);

    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(`- Logged Out      : ${stats.loggedOut} Secured Exit`, 50, 330);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`- Combined Volume : ${stats.total} Records`, 50, 370);

    // Graphic render quadrant
    const graphLeft = 450;
    const graphTop = 170;
    const graphWidth = 680;
    const graphHeight = 520;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(graphLeft, graphTop, graphWidth, graphHeight);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(graphLeft, graphTop, graphWidth, graphHeight);

    // Render logic per-pattern onto canvas
    if (activePattern === 'bar') {
      // Bar Chart visual
      const categories = [
        { label: 'Success Logins', value: stats.success, color: '#10b981' },
        { label: 'Blocked Attacks', value: stats.failed, color: '#f87171' },
        { label: 'Page View Hits', value: stats.visit, color: '#60a5fa' },
        { label: 'Logged Out', value: stats.loggedOut, color: '#a1a1aa' }
      ];

      const barMax = Math.max(stats.success, stats.failed, stats.visit, stats.loggedOut, 1);
      categories.forEach((cat, idx) => {
        const yCoord = graphTop + 50 + (idx * 115);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(cat.label, graphLeft + 40, yCoord);

        const barW = (cat.value / barMax) * 450;
        ctx.fillStyle = cat.color;
        ctx.fillRect(graphLeft + 40, yCoord + 15, barW, 25);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`${cat.value} (${Math.round((cat.value / (stats.total || 1)) * 100)}%)`, graphLeft + 40 + barW + 15, yCoord + 33);
      });

    } else if (activePattern === 'chart') {
      // Line/Area Chart trend
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(graphLeft + 50, graphTop + 50);
      ctx.lineTo(graphLeft + 50, graphTop + 450);
      ctx.lineTo(graphLeft + 630, graphTop + 450);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.fillText('Volume', graphLeft + 15, graphTop + 40);

      const maxPointY = Math.max(...dailyTrendData.map(d => d.total), 3);
      const points = dailyTrendData.map((d, i) => {
        const x = graphLeft + 70 + (i * 85);
        const y = graphTop + 430 - ((d.total / maxPointY) * 320);
        return { x, y, label: d.date, val: d.total };
      });

      // Area filled gradient under trend line
      const areaG = ctx.createLinearGradient(0, graphTop, 0, graphTop + 450);
      areaG.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      areaG.addColorStop(1, 'rgba(16, 185, 129, 0)');
      
      ctx.fillStyle = areaG;
      ctx.beginPath();
      ctx.moveTo(points[0].x, graphTop + 450);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, graphTop + 450);
      ctx.closePath();
      ctx.fill();

      // Draw the stroke line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw points & metrics
      points.forEach(p => {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(p.val.toString(), p.x - 7, p.y - 12);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(p.label, p.x - 15, graphTop + 470);
      });

    } else if (activePattern === 'table') {
      // Grid Table summary layout
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(graphLeft + 30, graphTop + 40, graphWidth - 60, 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('STATUS EVENT TYPE', graphLeft + 60, graphTop + 68);
      ctx.fillText('COUNT', graphLeft + 320, graphTop + 68);
      ctx.fillText('VOLUME RETENTION', graphLeft + 480, graphTop + 68);

      const rows = [
        { label: 'Success Pass (Logged In)', val: stats.success, valText: 'Safe Lock', color: '#10b981' },
         { label: 'Attempts Blocked (Failed)', val: stats.failed, valText: 'Alert Threat', color: '#f87171' },
         { label: 'Page View Activity (Hits)', val: stats.visit, valText: 'Public Browse', color: '#60a5fa' },
         { label: 'Secure Logged Out Exit', val: stats.loggedOut, valText: 'Clear Session', color: '#a1a1aa' }
      ];

      rows.forEach((row, idx) => {
        const rowY = graphTop + 120 + (idx * 80);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(graphLeft + 30, rowY, graphWidth - 60, 50);

        ctx.fillStyle = row.color;
        ctx.beginPath();
        ctx.arc(graphLeft + 55, rowY + 25, 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(row.label, graphLeft + 75, rowY + 30);
        
        ctx.font = '14px monospace';
        ctx.fillText(row.val.toString(), graphLeft + 320, rowY + 30);

        const pct = stats.total > 0 ? Math.round((row.val / stats.total) * 100) : 0;
        ctx.fillText(`${pct}%  [${row.valText}]`, graphLeft + 480, rowY + 30);
      });

    } else if (activePattern === 'pie') {
      // Graphic segment display pie ring representation
      const centerX = graphLeft + (graphWidth / 2);
      const centerY = graphTop + (graphHeight / 2) - 20;
      const radius = 130;

      const totalVal = stats.success + stats.failed + stats.visit + stats.loggedOut || 1;
      const dataSlices = [
        { val: stats.success, color: '#10b981', name: 'Success' },
        { val: stats.failed, color: '#f87171', name: 'Blocked' },
        { val: stats.visit, color: '#60a5fa', name: 'Visits' },
        { val: stats.loggedOut, color: '#a1a1aa', name: 'Logouts' }
      ];

      let startAngle = -0.5 * Math.PI;
      dataSlices.forEach(slice => {
        const slicePct = slice.val / totalVal;
        if (slicePct === 0) return;

        const endAngle = startAngle + (slicePct * 2 * Math.PI);
        ctx.fillStyle = slice.color;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();

        startAngle = endAngle;
      });

      // Draw inside cutout to make beautiful Donut Chart
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.55, 0, 2 * Math.PI);
      ctx.fill();

      // Legend Index Markers below circle
      dataSlices.forEach((slice, idx) => {
        const lx = graphLeft + 50 + (idx * 155);
        const ly = graphTop + graphHeight - 50;

        ctx.fillStyle = slice.color;
        ctx.fillRect(lx, ly, 15, 15);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${slice.name}: ${slice.val}`, lx + 23, ly + 13);
      });
    }

    // Footnote
    ctx.fillStyle = '#475569';
    ctx.font = 'italic 12px monospace';
    ctx.fillText('*Electronic generated Picture', 50, 755);

    // Save logic
    const dataUrl = canvas.toDataURL('image/png');
    const lk = document.createElement('a');
    lk.href = dataUrl;
    lk.download = `think_academy_${activePattern}_analysis.png`;
    document.body.appendChild(lk);
    lk.click();
    document.body.removeChild(lk);
  };

  return (
    <div className="space-y-6">
      
      {/* Date Range Selection Bar */}
      <div className={`p-5 rounded-2xl border transition-all duration-200 ${
        isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-emerald-500 font-extrabold tracking-widest uppercase block mb-1">
              📈 {isBn ? 'সহজ ট্রাফিক ও নিরাপত্তা বিশ্লেষণ' : 'SIMPLE TRAFFIC SECURITY ANALYSIS'}
            </span>
            <h2 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isBn ? 'ট্রাফিক বিশ্লেষণ (Traffic Analysis)' : 'Traffic Analysis'}
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              {isBn 
                ? 'আপনার ওয়ার্ডপ্রেস অ্যাডমিন গেটের প্রবেশ ট্রাফিক বিভিন্ন ডিজাইনের গ্রাফের মাধ্যমে পর্যবেক্ষণ করুন।' 
                : 'Monitor access security patterns utilizing responsive design trend vectors.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-stretch md:self-auto">
            {(['today', '7days', 'customDays', 'customDate'] as const).map((mode) => {
              const active = rangeType === mode;
              const lbl = mode === 'today' ? (isBn ? 'আজকে (Today)' : 'Today')
                        : mode === '7days' ? (isBn ? '৭ দিন (7 Days)' : '7 Days')
                        : mode === 'customDays' ? (isBn ? 'কাস্টম দিন' : 'Custom Days')
                        : (isBn ? 'কাস্টম তারিখ' : 'Custom Date');

              return (
                <button
                  key={mode}
                  onClick={() => setRangeType(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    active
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

        {/* Custom Config Parameters Inputs */}
        {(rangeType === 'customDays' || rangeType === 'customDate') && (
          <div className={`mt-4 p-4 rounded-xl border flex flex-wrap items-center gap-4 text-xs transition-colors duration-155 ${
            isDark ? 'bg-[#090b12] border-gray-800/80' : 'bg-slate-50/50 border-slate-200'
          }`}>
            {rangeType === 'customDays' && (
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-400">{isBn ? 'দিনের মোট সংখ্যা:' : 'Number of days to search:'}</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setDaysCount(p => Math.max(1, p - 5))}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg border font-black cursor-pointer ${isDark ? 'bg-gray-800' : 'bg-white hover:bg-slate-50'}`}
                  >-</button>
                  <input
                    type="number"
                    value={daysCount}
                    onChange={(e) => setDaysCount(Math.max(1, parseInt(e.target.value) || 15))}
                    className={`w-14 h-7 text-center rounded-lg font-mono font-bold border ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-300'}`}
                  />
                  <button 
                    onClick={() => setDaysCount(p => Math.min(180, p + 5))}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg border font-black cursor-pointer ${isDark ? 'bg-gray-800' : 'bg-white hover:bg-slate-50'}`}
                  >+</button>
                </div>
              </div>
            )}

            {rangeType === 'customDate' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">{isBn ? 'শুরু (Start):' : 'Start:'}</span>
                  <input 
                    type="date"
                    value={startD}
                    onChange={(e) => setStartD(e.target.value)}
                    className={`px-2 py-1 rounded-lg font-mono text-xs border cursor-pointer ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">{isBn ? 'শেষ (End):' : 'End:'}</span>
                  <input 
                    type="date"
                    value={endD}
                    onChange={(e) => setEndD(e.target.value)}
                    className={`px-2 py-1 rounded-lg font-mono text-xs border cursor-pointer ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual Pattern Viewport Segment */}
      <div className={`p-6 rounded-3xl border transition-all duration-300 ${
        isDark ? 'bg-[#111420] border-gray-800' : 'bg-white border-slate-200'
      }`}>
        
        {/* Toggle selectors & Screenshot trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-5 border-b border-gray-800/10 dark:border-gray-800/80 mb-6">
          <div className="flex flex-wrap items-center gap-1 font-mono">
            {([
              { key: 'bar', icon: <BarChart3 className="w-3.5 h-3.5" />, labelBn: 'বার চার্ট (Bar)', labelEn: 'Bar Graph' },
              { key: 'chart', icon: <LineChart className="w-3.5 h-3.5" />, labelBn: 'লাইন চার্ট (Line)', labelEn: 'Line Chart' },
              { key: 'table', icon: <TableProperties className="w-3.5 h-3.5" />, labelBn: 'টেবিল ভিউ (Table)', labelEn: 'Log Table' },
              { key: 'pie', icon: <PieChart className="w-3.5 h-3.5" />, labelBn: 'পাই চার্ট (Pie)', labelEn: 'Donut Pie' }
            ] as const).map((pat) => {
              const active = activePattern === pat.key;
              return (
                <button
                  key={pat.key}
                  onClick={() => setActivePattern(pat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : isDark
                        ? 'bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {pat.icon}
                  <span>{isBn ? pat.labelBn : pat.labelEn}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={downloadActivePatternImage}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 cursor-pointer shadow-md transition-all active:scale-95 text-center"
            title={isBn ? 'এই সাধারণ গ্রাফটির এইচডি ছবি ডাউনলোড করুন' : 'Download current security vector pattern as high quality PNG'}
          >
            <Download className="w-4 h-4" />
            <span>{isBn ? 'এইচডি গ্রাফ ছবি ডাউনলোড করুন' : 'Download Chart (HD)'}</span>
          </button>
        </div>

        {/* Graphics Render Area */}
        <div className="min-h-[300px] flex items-center justify-center">

          {/* RENDER VIEW: BAR CHART */}
          {activePattern === 'bar' && (
            <div className="w-full space-y-5 py-4">
              {(() => {
                const maxVal = Math.max(stats.success, stats.failed, stats.visit, stats.loggedOut, 1);
                
                const dataBars = [
                  { label: isBn ? 'সফল লগইন (Success Pass)' : 'Success Pass Logins', value: stats.success, color: 'bg-emerald-500', barCol: 'bg-emerald-500/10' },
                  { label: isBn ? 'ব্যর্থ চেষ্টা ও ব্লক (Attempts Blocked)' : 'Attempts Blocked (Attack Block)', value: stats.failed, color: 'bg-red-500', barCol: 'bg-red-500/10' },
                  { label: isBn ? 'পেজ ভিজিট রিকোয়েস্ট (Access Hits)' : 'Page Hits (Public views)', value: stats.visit, color: 'bg-blue-500', barCol: 'bg-blue-500/10' },
                  { label: isBn ? 'সিস্টেম প্রস্থান (Logged Out)' : 'Sessions Terminated (Logouts)', value: stats.loggedOut, color: 'bg-gray-400', barCol: 'bg-gray-400/10' }
                ];

                return (
                  <div className="space-y-5 max-w-2xl mx-auto w-full">
                    {dataBars.map((bar, index) => {
                      const pct = (bar.value / maxVal) * 100;
                      const displayPct = stats.total > 0 ? Math.round((bar.value / stats.total) * 100) : 0;
                      return (
                        <div key={index} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold font-mono text-slate-300">{bar.label}</span>
                            <span className="font-mono font-bold text-slate-400">{bar.value} {isBn ? 'বার' : 'connections'} ({displayPct}%)</span>
                          </div>
                          <div className={`h-5 rounded-lg w-full overflow-hidden ${isDark ? 'bg-gray-900/40' : 'bg-slate-100'}`}>
                            <div 
                              style={{ width: `${Math.max(3, pct)}%` }}
                              className={`h-full rounded-lg transition-all duration-500 ${bar.color}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* RENDER VIEW: SVG TREND LINE CHART */}
          {activePattern === 'chart' && (
            <div className="w-full flex flex-col items-center py-4">
              {stats.total === 0 ? (
                <div className="text-center text-xs text-slate-400 py-12">
                  {isBn ? 'এই ফিল্টারে কোনো ডেটা পাওয়া যায়নি।' : 'No database records found in selected range.'}
                </div>
              ) : (
                <div className="w-full max-w-2xl">
                  {/* Custom inline Area line SVG graph */}
                  <div className="h-56 w-full relative">
                    <svg className="w-full h-full select-none" viewBox="0 0 600 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="curveArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {(() => {
                        const maxVal = Math.max(...dailyTrendData.map(d => d.total), 3);
                        const points = dailyTrendData.map((d, i) => {
                          const x = 40 + i * (520 / 6);
                          const y = 160 - (d.total / maxVal) * 120;
                          return { x, y, label: d.date, value: d.total };
                        });

                        const areaPath = `M ${points[0].x} 160 ` + points.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length - 1].x} 160 Z`;
                        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                        return (
                          <>
                            {/* Filled Area */}
                            <path d={areaPath} fill="url(#curveArea)" />
                            
                            {/* Perimeter Line */}
                            <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                            {/* Base boundary coordinates */}
                            <line x1="40" y1="160" x2="560" y2="160" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="1" />
                            
                            {/* Points indicator logs */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle cx={p.x} cy={p.y} r="4.5" fill="#10b981" stroke={isDark ? '#111420' : '#ffffff'} strokeWidth="2" />
                                <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[9px] font-mono font-bold fill-emerald-500">
                                  {p.value}
                                </text>
                                <text x={p.x} y="176" textAnchor="middle" className="text-[9px] font-mono fill-slate-400">
                                  {p.label}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <p className="text-center text-[10px] text-slate-400 mt-4 italic">
                    {isBn ? 'বিগত ৭ দিনের মোট রিকোয়েস্ট ভলিউম গ্রাফ।' : 'Total transaction trends graphed over preceding 7 days.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* RENDER VIEW: TABLE COMPARISON GRID */}
          {activePattern === 'table' && (
            <div className="w-full max-w-2xl overflow-hidden border border-gray-800/10 dark:border-gray-800 rounded-2xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className={isDark ? 'bg-gray-900/60 border-b border-gray-800' : 'bg-slate-50 border-b border-slate-150'}>
                    <th className="p-3.5 font-bold uppercase tracking-wider text-slate-400">{isBn ? 'নিরাপত্তা ক্যাটাগরি' : 'Category'}</th>
                    <th className="p-3.5 font-bold uppercase tracking-wider text-slate-400 text-center">{isBn ? 'রিকোয়েস্ট সংখ্যা' : 'Counts'}</th>
                    <th className="p-3.5 font-bold uppercase tracking-wider text-slate-400 text-right">{isBn ? 'অনুপাত (Ratio)' : 'Proportion'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/10 dark:divide-gray-850">
                  <tr className="hover:bg-emerald-500/5">
                    <td className="p-3.5 font-bold">🟢 {isBn ? 'সফল প্রবেশ (Success Logins)' : 'Success Pass Logins'}</td>
                    <td className="p-3.5 text-center font-mono font-bold">{stats.success}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-500 font-bold">
                      {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-red-500/5">
                    <td className="p-3.5 font-bold">🔴 {isBn ? 'ব্যর্থ হ্যাক চেষ্টা (Blocked Attacks)' : 'Incorrect Attack blocks'}</td>
                    <td className="p-3.5 text-center font-mono font-bold">{stats.failed}</td>
                    <td className="p-3.5 text-right font-mono text-red-500 font-bold">
                      {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-blue-500/5">
                    <td className="p-3.5 font-bold">🔵 {isBn ? 'পেজ ভিউ ট্রাফিক (Page Hits)' : 'Browser Page Visits'}</td>
                    <td className="p-3.5 text-center font-mono font-bold">{stats.visit}</td>
                    <td className="p-3.5 text-right font-mono text-blue-500 font-bold">
                      {stats.total > 0 ? Math.round((stats.visit / stats.total) * 100) : 0}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-500/5">
                    <td className="p-3.5 font-bold">🔌 {isBn ? 'লগ-আউট প্রস্থান (Secure Exit)' : 'Sessions Terminated'}</td>
                    <td className="p-3.5 text-center font-mono font-bold">{stats.loggedOut}</td>
                    <td className="p-3.5 text-right font-mono text-slate-400 font-bold">
                      {stats.total > 0 ? Math.round((stats.loggedOut / stats.total) * 100) : 0}%
                    </td>
                  </tr>
                  <tr className={isDark ? 'bg-gray-900/10 font-bold' : 'bg-slate-50 font-bold'}>
                    <td className="p-3.5 text-emerald-505">{isBn ? 'সর্বমোট রেকর্ড (Grand Total)' : 'Total Log entries'}</td>
                    <td className="p-3.5 text-center font-mono text-emerald-505">{stats.total}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-505">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* RENDER VIEW: SVG PIE DONUT DIAGRAM */}
          {activePattern === 'pie' && (
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-10 py-4 max-w-2xl">
              {stats.total === 0 ? (
                <div className="text-center text-xs text-slate-400 py-12">
                  {isBn ? 'এই ফিল্টারে কোনো ডেটা পাওয়া যায়নি।' : 'No database records found in selected range.'}
                </div>
              ) : (
                <>
                  {/* Real responsive SVG donut segment */}
                  <div className="w-44 h-44 relative shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {(() => {
                        const totalUnits = stats.success + stats.failed + stats.visit + stats.loggedOut || 1;
                        const sPct = (stats.success / totalUnits) * 100;
                        const fPct = (stats.failed / totalUnits) * 100;
                        const vPct = (stats.visit / totalUnits) * 100;
                        const lPct = (stats.loggedOut / totalUnits) * 100;

                        // Stroke-dasharray metrics
                        const sStroke = `${sPct} ${100 - sPct}`;
                        const fStroke = `${fPct} ${100 - fPct}`;
                        const vStroke = `${vPct} ${100 - vPct}`;
                        const lStroke = `${lPct} ${100 - lPct}`;

                        // Offsets
                        const sOffset = 0;
                        const fOffset = -sPct;
                        const vOffset = -(sPct + fPct);
                        const lOffset = -(sPct + fPct + vPct);

                        return (
                          <>
                            {/* Success slice */}
                            {sPct > 0 && (
                              <circle 
                                cx="50" cy="50" r="16" 
                                fill="transparent" stroke="#10b981" strokeWidth="32" 
                                strokeDasharray={sStroke} strokeDashoffset={sOffset} 
                              />
                            )}
                            {/* Failed slice */}
                            {fPct > 0 && (
                              <circle 
                                cx="50" cy="50" r="16" 
                                fill="transparent" stroke="#f87171" strokeWidth="32" 
                                strokeDasharray={fStroke} strokeDashoffset={fOffset} 
                              />
                            )}
                            {/* Visited slice */}
                            {vPct > 0 && (
                              <circle 
                                cx="50" cy="50" r="16" 
                                fill="transparent" stroke="#60a5fa" strokeWidth="32" 
                                strokeDasharray={vStroke} strokeDashoffset={vOffset} 
                              />
                            )}
                            {/* LoggedOut slice */}
                            {lPct > 0 && (
                              <circle 
                                cx="50" cy="50" r="16" 
                                fill="transparent" stroke="#a1a1aa" strokeWidth="32" 
                                strokeDasharray={lStroke} strokeDashoffset={lOffset} 
                              />
                            )}

                            {/* Center Cutout hole */}
                            <circle cx="50" cy="50" r="18" fill={isDark ? '#111420' : '#ffffff'} />
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Legends labels list */}
                  <div className="space-y-3.5 text-left text-xs font-mono max-w-sm w-full">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 inline-block" />
                      <span className="font-bold">{isBn ? 'সফল লগইন :' : 'Success Pass :'}</span>
                      <span className="text-slate-400">{stats.success} ({stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-red-400 inline-block" />
                      <span className="font-bold">{isBn ? 'ব্যর্থ চেষ্টা :' : 'Blocked Atts :'}</span>
                      <span className="text-slate-400">{stats.failed} ({stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-blue-500 inline-block" />
                      <span className="font-bold">{isBn ? 'পেজ ভিজিট :' : 'Visitor Hits :'}</span>
                      <span className="text-slate-400">{stats.visit} ({stats.total > 0 ? Math.round((stats.visit / stats.total) * 100) : 0}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-zinc-400 inline-block" />
                      <span className="font-bold">{isBn ? 'প্রস্থান সেশন :' : 'Logouts Exit :'}</span>
                      <span className="text-slate-400">{stats.loggedOut} ({stats.total > 0 ? Math.round((stats.loggedOut / stats.total) * 100) : 0}%)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
