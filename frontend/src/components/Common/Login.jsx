import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginRole, setLoginRole] = useState('coordinator'); // 'admin' or 'coordinator'

  // If already logged in, redirect straight away
  if (user) {
    return <Navigate to={user.role === 'Admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (result.success) {
      const savedUser = JSON.parse(localStorage.getItem('user'));
      if (savedUser?.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Blurred background image of VIT Chennai */}
      <div 
        className="absolute inset-0 bg-cover bg-center select-none pointer-events-none transform scale-105"
        style={{ 
          backgroundImage: "url('/vitc_image.png')", 
          filter: "blur(8px) brightness(0.9)" 
        }} 
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-vit-navy/40 dark:bg-vit-neutral-950/70 mix-blend-multiply" />

      {/* Login Card Panel */}
      <div className="relative w-full max-w-md bg-white/90 dark:bg-vit-neutral-850/90 rounded-3xl border border-white/20 dark:border-vit-neutral-750/30 shadow-2xl p-8 backdrop-blur-lg transition-all duration-300">
        
        {/* Brand Identity / VIT Logo */}
        <div className="text-center mb-6">
          <img 
            src="/vit_logo_colored.png" 
            alt="VIT Chennai Logo" 
            className="mx-auto h-16 w-auto mb-4 object-contain filter drop-shadow-sm select-none pointer-events-none" 
          />
          <h2 className="text-xl font-extrabold text-vit-navy dark:text-white leading-tight">
            Club & Chapter Event Management Portal
          </h2>
          <p className="text-xs text-vit-neutral-500 dark:text-vit-neutral-400 mt-2 font-medium tracking-wide">
            {loginRole === 'admin' ? 'Portal Administrator Panel' : 'Coordinators & Chairpersons Workspace'}
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="flex bg-vit-neutral-100/80 dark:bg-vit-neutral-900/80 p-1 rounded-2xl mb-6 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50">
          <button
            type="button"
            onClick={() => {
              setLoginRole('coordinator');
              setUsername('');
              setPassword('');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              loginRole === 'coordinator'
                ? 'bg-vit-blue text-white shadow-md'
                : 'text-vit-neutral-500 hover:text-vit-neutral-800 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Club Coordinator</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginRole('admin');
              setUsername('');
              setPassword('');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              loginRole === 'admin'
                ? 'bg-vit-navy text-white shadow-md'
                : 'text-vit-neutral-500 hover:text-vit-neutral-800 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Admin</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-vit-neutral-400 dark:text-vit-neutral-550">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={loginRole === 'admin' ? 'Enter admin username' : 'Enter coordinator username'}
                className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-vit-neutral-900/70 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 rounded-xl focus:ring-2 focus:ring-vit-blue focus:border-transparent outline-none transition-all text-sm font-semibold text-vit-neutral-800 dark:text-white"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-vit-neutral-400 dark:text-vit-neutral-550">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-vit-neutral-900/70 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 rounded-xl focus:ring-2 focus:ring-vit-blue focus:border-transparent outline-none transition-all text-sm font-semibold text-vit-neutral-800 dark:text-white"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white cursor-pointer ${
              loginRole === 'admin' 
                ? 'bg-gradient-to-r from-vit-navy to-slate-800 shadow-vit-navy/20 hover:shadow-slate-800/30' 
                : 'bg-gradient-to-r from-vit-navy to-vit-blue shadow-vit-navy/20 hover:shadow-vit-blue/30'
            }`}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Access Portal'
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center mt-8 text-[10px] font-semibold text-vit-neutral-450 dark:text-vit-neutral-500 tracking-wide">
          VIT Chennai • Clubs & Chapters Coordination Hub
        </div>
      </div>
    </div>
  );
};

export default Login;
