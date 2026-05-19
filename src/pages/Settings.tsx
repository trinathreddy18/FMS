import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Settings as SettingsIcon, 
  Save, 
  MessageSquare, 
  Shield, 
  Globe, 
  Terminal,
  ShieldAlert,
  UserPlus,
  Workflow
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    whatsappVendor: 'GreenAPI',
    whatsappInstanceId: '',
    whatsappToken: '',
    whatsappWebhookUrl: '',
    enableNotifications: true,
    differentApiForMarketing: false
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'whatsapp');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error("Fetch settings error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'whatsapp'), settings);
      alert('System configuration updated successfully!');
    } catch (err) {
      console.error("Save settings error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const [qrData, setQrData] = useState<{qr: string | null, status: string, connected: boolean, phone: string | null}>({
    qr: null,
    status: 'close',
    connected: false,
    phone: null
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/qr');
        const data = await res.json();
        
        const statusRes = await fetch('/api/whatsapp/status');
        const statusData = await statusRes.json();
        
        setQrData({
          qr: data.qr,
          status: data.status,
          connected: statusData.connected,
          phone: statusData.phone
        });
      } catch (err) {
        // Silently skip if server is transiently unreachable
      }
    };

    const interval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accessing Secure Config...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">System Configuration</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">GLOBAL SETTINGS & SECURITY PROTOCOLS</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* WhatsApp QR Integration Panel */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                <MessageSquare size={16} className={cn(qrData.connected ? "text-emerald-400" : "text-amber-400")} /> 
                WhatsApp Web Link
              </h3>
              <div className={cn(
                "flex items-center gap-2 px-2 py-1 rounded border",
                qrData.connected ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
              )}>
                 <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", qrData.connected ? "bg-emerald-500" : "bg-amber-500")}></span>
                 <span className={cn("text-[10px] font-bold uppercase", qrData.connected ? "text-emerald-400" : "text-amber-400")}>
                   {qrData.connected ? 'Connected' : 'Action Required'}
                 </span>
              </div>
            </div>
            <div className="p-8 space-y-6 flex flex-col items-center">
              {!qrData.connected ? (
                <>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">Link Your Account</p>
                    <p className="text-xs text-slate-400 font-medium">Scan the QR code below via WhatsApp Settings {'>'} Linked Devices</p>
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-0 bg-blue-600/5 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-56 h-56 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-center relative bg-white shadow-xl overflow-hidden">
                      {qrData.qr ? (
                        <motion.img 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          src={qrData.qr} 
                          alt="WhatsApp QR" 
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-full pt-4 space-y-4">
                    <p className="text-[10px] text-center text-slate-400 font-medium italic">
                      This system uses a secure local browser instance to bridge your mobile device with our operational flows.
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-6">
                  <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
                      <MessageSquare size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-emerald-900 tracking-tight uppercase">Device Linked</h4>
                    <p className="text-xs text-emerald-600 font-bold font-mono mt-1">ID: +{qrData.phone}</p>
                    <div className="flex items-center gap-2 mt-4 px-3 py-1 bg-white/50 rounded-full border border-emerald-200">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">System Ready to Send</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="w-full py-3.5 bg-red-50 text-red-600 font-bold text-xs uppercase tracking-widest rounded-xl border border-red-100 hover:bg-red-100 transition-all active:scale-95"
                  >
                    Logout Device
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Data Sovereignty</p>
                  <p className="text-[10px] text-slate-400 font-medium">Auto-backup enabled every 24h</p>
                </div>
             </div>
             <button type="button" className="w-full py-2.5 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-white transition-colors">
               Initialize Recovery Data
             </button>
          </div>
        </div>

        {/* Access Control & RBAC Partition */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" /> Manage System Users & RBAC
                </h3>
                <button type="button" className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest flex items-center gap-1">
                  <UserPlus size={14} /> Invite Admin
                </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50">
                         <th className="px-8 py-5">System User</th>
                         <th className="px-8 py-5">Assigned Role</th>
                         <th className="px-8 py-5">Department</th>
                         <th className="px-8 py-5">Last Activity</th>
                         <th className="px-8 py-5 text-right pr-10">Control</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {[
                        { name: 'Trinath Reddy', role: 'System Admin', dept: 'Operations', last: 'Now', color: 'bg-blue-50 text-blue-600 border-blue-100' },
                        { name: 'Shubham Kumar', role: 'Production HOD', dept: 'Core Unit', last: '12m ago', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                        { name: 'Vivek Singh', role: 'Inventory Executive', dept: 'Logistics', last: '2h ago', color: 'bg-slate-50 text-slate-600 border-slate-200' },
                      ].map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                  {u.name.charAt(0)}
                                </div>
                                <span className="font-bold text-sm text-slate-800">{u.name}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border tracking-tight", u.color)}>
                                 {u.role}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-xs text-slate-500 font-medium uppercase tracking-tight">{u.dept}</td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {u.last}
                              </div>
                           </td>
                           <td className="px-8 py-6 text-right pr-10">
                              <button type="button" className="text-slate-300 hover:text-slate-600 transition-colors"><SettingsIcon size={16} /></button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-8 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Workflow size={120} />
             </div>
             <h4 className="text-lg font-bold tracking-tight mb-2 uppercase">Operational Audit V5.2</h4>
             <p className="text-slate-400 text-sm max-w-md leading-relaxed whitespace-pre-wrap">All flow movements and inventory logs are cryptographically hashed for 100% auditing accuracy in compliance with SME standard v5.2.</p>
             <div className="mt-8 flex gap-4">
                <button type="button" className="px-6 py-2.5 bg-blue-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95">Download PDF Log</button>
                <button type="button" className="px-6 py-2.5 bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all">Clear Logs</button>
             </div>
          </div>
        </div>
      </form>
    </div>
  );
}
