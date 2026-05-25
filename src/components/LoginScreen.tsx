import React, { useState } from 'react';
import { supabaseService } from '../supabaseService';
import { 
  LogIn, 
  Lock, 
  Mail, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { translations } from '../translations';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; email: string; created_at: string }, isSupabase: boolean) => void;
  configUpdated: boolean;
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
}

export default function LoginScreen({ 
  onLoginSuccess, 
  configUpdated, 
  language, 
  theme 
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
  const currentConfig = supabaseService.getConfig();
  const t = translations[language];
  const isDark = theme === 'dark';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setStatus({ type: 'error', message: t.emailError });
      return;
    }

    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const result = await supabaseService.loginUser(email, password);
      if (result.success && result.user) {
        setStatus({ type: 'success', message: result.message });
        setTimeout(() => {
          onLoginSuccess(result.user!, currentConfig.isConfigured);
        }, 800);
      } else {
        setStatus({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.message || 'Server login failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[500px] w-full px-4 py-12 animate-fade-in">
      <div className={`w-full max-w-md border rounded-3xl overflow-hidden transition-all duration-300 shadow-xl ${
        isDark 
          ? 'bg-[#111420] border-gray-850 text-gray-200' 
          : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* Header containing simple branding title */}
        <div className={`border-b px-8 py-5.5 flex items-center gap-2.5 text-xs font-bold text-emerald-500 ${
          isDark ? 'bg-[#161a2b] border-gray-850' : 'bg-slate-50 border-slate-150'
        }`}>
          <LogIn className="w-4.5 h-4.5 animate-pulse" />
          <span className="tracking-widest uppercase">{t.adminGate}</span>
        </div>

        {/* Credentials Entering box */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email field container */}
            <div className="space-y-1.5">
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {t.emailLabel}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@wpsecurity.io"
                  className={`w-full rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-[#121826] text-gray-100 border border-gray-800 focus:border-emerald-500' 
                      : 'bg-slate-100 text-slate-900 border border-slate-200 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Password field container */}
            <div className="space-y-1.5">
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {t.passwordLabel}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl pl-10 pr-10 py-3 text-xs focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-[#121826] text-gray-100 border border-gray-800 focus:border-emerald-500' 
                      : 'bg-slate-100 text-slate-900 border border-slate-200 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Feedback alert box */}
            {status.type && (
              <div className={`flex gap-2.5 p-3 rounded-xl border text-xs leading-relaxed ${
                status.type === 'success' 
                  ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' 
                  : 'bg-red-500/5 text-red-500 border-red-500/10'
              }`}>
                {status.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs py-3.5 px-4 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider font-mono"
            >
              {isLoading && (
                <svg className="animate-spin h-3.5 w-3.5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {t.loginBtn}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
