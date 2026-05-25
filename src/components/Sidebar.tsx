import React from 'react';
import { 
  Activity, 
  LogOut, 
  User,
  Users,
  LineChart
} from 'lucide-react';
import { translations } from '../translations';

interface SidebarProps {
  activeTab: 'logs' | 'users' | 'traffic';
  setActiveTab: (tab: 'logs' | 'users' | 'traffic') => void;
  userEmail: string;
  onLogout: () => void;
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  userEmail, 
  onLogout,
  language,
  theme
}: SidebarProps) {
  const t = translations[language];
  const isDark = theme === 'dark';
  const isBn = language === 'bn';

  return (
    <aside 
      id="sidebar-panel" 
      className={`hidden lg:flex w-full lg:w-64 border rounded-2xl p-5 flex flex-col justify-between h-auto lg:h-[calc(100vh-170px)] sticky top-[80px] transition-all duration-200 ${
        isDark 
          ? 'bg-[#111420] border-gray-800 text-gray-200' 
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      }`}
    >
      <div className="space-y-5">
        {/* User Card */}
        <div className={`flex items-center gap-3 pb-4 border-b ${isDark ? 'border-gray-800' : 'border-slate-100'}`}>
          <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className={`text-[9px] font-bold uppercase tracking-wider block ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
              {t.profileSummary}
            </span>
            <h3 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={userEmail}>
              {userEmail}
            </h3>
          </div>
        </div>

        {/* Nav List */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'logs' 
                ? isDark
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : `border border-transparent hover:bg-slate-100/50 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800/40' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'}`
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{t.activeTabLogs}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'users' 
                ? isDark
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : `border border-transparent hover:bg-slate-100/50 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800/40' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'}`
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isBn ? 'ব্যবহারকারীদের ডাটা (Users Data)' : 'Users Data'}</span>
          </button>

          <button
            onClick={() => setActiveTab('traffic')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'traffic' 
                ? isDark
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : `border border-transparent hover:bg-slate-100/50 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800/40' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'}`
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>{isBn ? 'ট্রাফিক বিশ্লেষণ (Traffic Analysis)' : 'Traffic Analysis'}</span>
          </button>
        </nav>
      </div>

      {/* Logout button */}
      <div className={`pt-4 border-t mt-5 lg:mt-0 ${isDark ? 'border-gray-800' : 'border-slate-100'}`}>
        <button
          onClick={onLogout}
          className={`w-full flex items-center justify-center gap-2 text-xs font-bold rounded-xl py-2.5 border transition-all duration-150 cursor-pointer ${
            isDark 
              ? 'bg-red-500/5 hover:bg-red-500 text-red-400 hover:text-white border-red-500/10 hover:border-red-500' 
              : 'bg-red-50/50 hover:bg-red-600 text-red-600 hover:text-white border-red-100 hover:border-red-600'
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.logoutSessions}</span>
        </button>
      </div>
    </aside>
  );
}
