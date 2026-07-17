import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Compass,
  FileSpreadsheet,
  FileCheck,
  CalendarDays,
  PlusCircle,
  Upload,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Database
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isAdmin = user.role === 'Admin';

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/daily-view', label: 'Unified Daily View', icon: CalendarDays },
    { to: '/admin/clubs', label: 'Manage Clubs', icon: Compass },
    { to: '/admin/chairpersons', label: 'Manage Chairpersons', icon: Users },
    { to: '/admin/pre-events', label: 'Pre-Event Operations', icon: CalendarDays },
    { to: '/admin/reports', label: 'Event Reports', icon: FileCheck },
    { to: '/admin/ods', label: 'OD Lists', icon: FileSpreadsheet },
    { to: '/admin/od-registry', label: 'OD Registry', icon: Database }
  ];

  const chairpersonLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/pre-events/new', label: 'Pre-Event Operations', icon: CalendarDays },
    { to: '/reports/new', label: 'Submit Event Report', icon: PlusCircle },
    { to: '/ods/new', label: 'Upload OD List', icon: Upload }
  ];

  const links = isAdmin ? adminLinks : chairpersonLinks;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-vit-navy text-white w-64 border-r border-vit-navy/40">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/10 flex flex-col gap-1 bg-vit-navy/90">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="bg-white text-vit-navy px-2 py-0.5 rounded-md font-extrabold text-sm">VITC</span>
          Event Portal
        </h1>
        <p className="text-[10px] text-white/60 tracking-wider font-semibold uppercase">Chennai Campus</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-vit-blue text-white shadow-md shadow-vit-blue/20 translate-x-1'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <link.icon className="w-5 h-5 flex-shrink-0" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Information & Theme Toggle Footer */}
      <div className="p-4 border-t border-white/10 bg-vit-navy/95 space-y-3 relative">
        <div className="flex items-center justify-between px-2">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-colors focus:outline-none"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <NotificationBell align="up" />
        </div>

        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
          <div className="w-9 h-9 rounded-full bg-vit-blue flex items-center justify-center font-bold text-sm text-white uppercase shadow-inner">
            {user.name.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-none text-white">{user.name}</p>
            <p className="text-[10px] text-white/50 truncate mt-1">
              {isAdmin ? 'System Admin' : user.clubName}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-650 hover:bg-red-700 active:bg-red-800 text-white border border-transparent rounded-xl text-sm font-medium hover:bg-white/5 hover:text-red-400 border-red-500/25 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between bg-vit-navy text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold tracking-tight text-sm">VITC Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-1.5 text-white/70 hover:text-white">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <NotificationBell />
        </div>
      </header>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:block h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex flex-col w-64 max-w-xs h-full bg-vit-navy animate-slide-right">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-white/60 hover:text-white rounded-lg focus:outline-none"
              aria-label="Close sidebar"
            >
              <X className="w-6 h-6" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
