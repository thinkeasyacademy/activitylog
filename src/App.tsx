import { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SupabaseInstructions from './components/SupabaseInstructions';
import { supabaseService } from './supabaseService';
import { 
  Database, 
  ShieldCheck, 
  Heart, 
  Sun, 
  Moon, 
  Languages 
} from 'lucide-react';
import { translations } from './translations';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; created_at: string } | null>(null);
  const [isSupabaseConnection, setIsSupabaseConnection] = useState(false);
  const [configTrigger, setConfigTrigger] = useState(false);

  // Theme & Language defaults
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');

  // Load user session and state from local storage on reload
  useEffect(() => {
    const storedUser = localStorage.getItem('wp_dashboard_session_user');
    const wasSupabase = localStorage.getItem('wp_dashboard_session_issupabase') === 'true';
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setIsSupabaseConnection(wasSupabase);
    }

    const currentConf = supabaseService.getConfig();
    setIsSupabaseConnection(currentConf.isConfigured);

    // Persisted preferences
    const savedTheme = localStorage.getItem('wp_dashboard_theme') as 'dark' | 'light';
    const savedLang = localStorage.getItem('wp_dashboard_lang') as 'bn' | 'en';
    if (savedTheme) setTheme(savedTheme);
    if (savedLang) setLanguage(savedLang);
  }, [configTrigger]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('wp_dashboard_theme', nextTheme);
  };

  const handleToggleLanguage = () => {
    const nextLang = language === 'bn' ? 'en' : 'bn';
    setLanguage(nextLang);
    localStorage.setItem('wp_dashboard_lang', nextLang);
  };

  const handleLoginSuccess = (user: { id: string; email: string; created_at: string }, connectedViaSupabase: boolean) => {
    setCurrentUser(user);
    setIsSupabaseConnection(connectedViaSupabase);
    localStorage.setItem('wp_dashboard_session_user', JSON.stringify(user));
    localStorage.setItem('wp_dashboard_session_issupabase', String(connectedViaSupabase));
  };

  const handleLogout = async () => {
    await supabaseService.logoutUser();
    setCurrentUser(null);
    localStorage.removeItem('wp_dashboard_session_user');
    localStorage.removeItem('wp_dashboard_session_issupabase');
  };

  const handleConfigChanged = () => {
    // Force reload parameter configuration state
    setConfigTrigger(prev => !prev);
  };

  const handleScrollToConfig = () => {
    const el = document.getElementById('supabase-guide-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const t = translations[language];
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col justify-between font-sans antialiased selection:bg-emerald-500/30 transition-colors duration-200 ${
      isDark ? 'bg-[#121826] text-gray-200' : 'bg-[#F8F9FA] text-slate-800'
    }`}>
      
      {/* Universal Header NavBar */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md transition-all duration-200 ${
        isDark ? 'border-gray-800/80 bg-[#121826]/85 text-white' : 'border-slate-200 bg-[#F8F9FA]/85 text-slate-900 shadow-sm'
      }`}>
        <div id="header-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          
          {/* Logo Brand */}
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('wp-go-home'));
            }}
            className="flex items-center gap-3 hover:opacity-85 active:scale-95 transition-all text-left border-none bg-transparent p-0 cursor-pointer focus:outline-none"
            title={language === 'bn' ? 'হোম পেজে যান' : 'Go to Home'}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
              ⚡
            </div>
            <div>
              <span className={`font-extrabold tracking-tight text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.appTitle}</span>
            </div>
          </button>

          {/* Interactive controls (Theme and Language toggles) */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            
            {/* Language Selection */}
            <button
              onClick={handleToggleLanguage}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isDark 
                  ? 'bg-gray-850 hover:bg-gray-800 text-gray-300 border-gray-850 hover:border-gray-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={language === 'bn' ? 'Translate to English' : 'বাংলায় পরিবর্তন করুন'}
            >
              <Languages className="w-3.5 h-3.5 text-emerald-500" />
              <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Dark Light Switcher */}
            <button
              onClick={handleToggleTheme}
              className={`p-2 rounded-lg transition-all cursor-pointer border ${
                isDark 
                  ? 'bg-gray-850 hover:bg-gray-800 text-gray-300 border-gray-850' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-10">
        
        {/* Section 1: Authentication Form or Dashboard Panel */}
        {currentUser ? (
          <Dashboard 
            user={currentUser} 
            isSupabase={isSupabaseConnection} 
            onLogout={handleLogout} 
            onScrollToConfig={handleScrollToConfig}
            language={language}
            theme={theme}
          />
        ) : (
          <LoginScreen 
            onLoginSuccess={handleLoginSuccess}
            configUpdated={configTrigger}
            language={language}
            theme={theme}
          />
        )}

      </main>

      {/* Modern, Simple, Elegant Footer */}
      <footer className={`border-t py-6 transition-colors duration-200 ${
        isDark ? 'border-gray-900 bg-[#090b12] text-gray-500' : 'border-slate-200 bg-white text-slate-400'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs font-mono font-bold">
          <span className="text-emerald-500 inline-flex items-center gap-1 justify-center">
            Developed by Think Easy Academy...💖
          </span>
        </div>
      </footer>

    </div>
  );
}
