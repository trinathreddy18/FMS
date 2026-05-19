import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  CheckSquare, 
  Settings as SettingsIcon, 
  LogOut,
  Workflow,
  Menu,
  X,
  Bell,
  Users,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Layout() {
  const { logout, userProfile } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Flow Management', path: '/fms', icon: Workflow },
    { name: 'Flow Designer', path: '/fms/design', icon: LayoutGrid },
    { name: 'Inventory (IMS)', path: '/ims', icon: Package },
    { name: 'Ultimate Checklist', path: '/tasks', icon: CheckSquare },
    { name: 'Employee Master', path: '/employees', icon: Users },
    { name: 'System Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-blue-400">SME OS v5.2</h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Enterprise Suite</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg border",
                location.pathname === item.path 
                  ? "bg-blue-600/10 text-blue-400 border-blue-600/20" 
                  : "text-slate-300 border-transparent hover:bg-slate-800"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-colors",
                location.pathname === item.path ? "text-blue-400" : "text-slate-500"
              )} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm shadow-lg ring-4 ring-blue-500/10">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{userProfile?.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">{userProfile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-4 py-2 w-full text-left text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg"
          >
            <LogOut size={18} />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-500"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 border border-slate-200">
                MODULE: {navItems.find(i => i.path === location.pathname)?.name.split(' ')[0] || 'ADMIN'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="text-[10px] text-slate-500 uppercase flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Server Status: 100%
              </p>
            </div>
            <button className="relative p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors group">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white ring-4 ring-red-100 animate-pulse"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </motion.div>
        </main>

        <footer className="h-10 bg-slate-50 px-8 flex items-center justify-between border-t border-slate-200">
          <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">FMS Integrated with WhatsApp API v5.2</p>
          <p className="text-[9px] text-slate-400 font-mono">SESSION: {Math.random().toString(36).substring(7).toUpperCase()}</p>
        </footer>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-[#141414] text-white z-50 md:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-bold text-lg rounded-sm">M</div>
                  <span className="font-bold tracking-tight text-xl italic font-serif">MASTER SME</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 group rounded-sm",
                      location.pathname === item.path 
                        ? "bg-white text-black" 
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                  >
                    <item.icon size={20} />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
