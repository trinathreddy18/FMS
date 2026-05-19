import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export function Login() {
  const { user, login } = useAuth();
  
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <ShieldCheck size={400} strokeWidth={0.5} />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-[#141414] shadow-[20px_20px_0px_#141414] p-10 relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-[#141414] text-white flex items-center justify-center font-bold text-3xl italic serif font-serif mb-6">M</div>
          <h1 className="text-4xl font-serif italic text-[#141414] tracking-tight">Master SME</h1>
          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Operational Command Center</p>
        </div>

        <div className="space-y-6">
          <p className="text-sm text-gray-500 text-center px-4 italic serif leading-relaxed">
            Authorized access only. This system tracks real-time inventory, workflows, and task assignments for Enterprise units.
          </p>
          
          <button 
            onClick={login}
            className="w-full bg-[#141414] text-white py-5 rounded-sm flex items-center justify-center gap-3 font-mono font-bold uppercase tracking-[0.2em] transform transition-transform hover:scale-[1.02] active:scale-95 duration-200 shadow-lg"
          >
            Authenticate with Google
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center text-[8px] font-mono text-gray-300 uppercase tracking-widest">
           <span>Version 5.2 (LTSC)</span>
           <span>Status: Secure</span>
        </div>
      </motion.div>
      
      {/* Footer Meta */}
      <div className="mt-12 text-[10px] font-mono text-gray-400 uppercase tracking-[0.4em] text-center hidden md:block">
        Systems Design © 2026 / Precision Operational Control
      </div>
    </div>
  );
}
