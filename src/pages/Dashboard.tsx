import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity, Package, CheckSquare, Workflow, TrendingUp, AlertTriangle, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Dashboard() {
  const [stats, setStats] = useState({
    activeTasks: 0,
    lowInventory: 0,
    openOrders: 0,
    completedToday: 0
  });

  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  const [waStatus, setWaStatus] = useState({ connected: false, phone: null });

  useEffect(() => {
    // WhatsApp Status
    const checkWaStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        setWaStatus({ connected: data.connected, phone: data.phone });
      } catch (err) {
        // Silently skip if server is transiently unreachable
      }
    };
    const interval = setInterval(checkWaStatus, 10000);
    checkWaStatus();

    // Recent Tasks
    const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setRecentTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Stats Listeners
    const unsubscribeAllTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const active = snapshot.docs.filter(d => d.data().status !== 'completed').length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = snapshot.docs.filter(d => {
        const data = d.data();
        return data.status === 'completed' && data.updatedAt?.toDate() >= today;
      }).length;

      setStats(prev => ({ ...prev, activeTasks: active, completedToday }));
    });

    const unsubscribeFMS = onSnapshot(collection(db, 'fms'), (snapshot) => {
      setStats(prev => ({ ...prev, openOrders: snapshot.size }));
    });

    const unsubscribeInv = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const low = snapshot.docs.filter(d => d.data().stock <= 100).length;
      setStats(prev => ({ ...prev, lowInventory: low }));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeAllTasks();
      unsubscribeFMS();
      unsubscribeInv();
    };
  }, []);

  const statsCards = [
    { title: 'Pending Tasks', value: stats.activeTasks, icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Low Stock Items', value: stats.lowInventory, icon: Package, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Open Flow Orders', value: stats.openOrders, icon: Workflow, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Completed Today', value: stats.completedToday, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">Real-time Operational Performance</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase tracking-tight flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System: Stable
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 group-hover:text-slate-500">{stat.title}</p>
                <p className="text-4xl font-black transition-colors duration-300 text-slate-900">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-xl transition-colors duration-300", stat.bg)}>
                <stat.icon size={24} className={stat.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Recent Tasks Table */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <CheckSquare size={16} className="text-blue-600" /> Priority Tasks
            </h3>
            <button className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest">Full Checklist →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-50">
                  <th className="px-6 py-4">Ref. Code</th>
                  <th className="px-6 py-4">Requirement Detail</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentTasks.length > 0 ? recentTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer text-sm">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{task.code}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{task.title}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {new Date(task.plannedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase border tracking-tight",
                        task.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-100' :
                        task.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                        'bg-blue-50 text-blue-600 border-blue-100'
                      )}>
                        {task.priority}
                      </span>
                    </td>
                  </tr>
                )) : (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group cursor-pointer text-sm">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-300">CHK-100{i}</td>
                      <td className="px-6 py-4 font-medium text-slate-400">Operational sequence verification unit-{i}</td>
                      <td className="px-6 py-4 text-slate-300">10 May</td>
                      <td className="px-6 py-4 text-center">
                         <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-slate-50 text-slate-300 rounded-lg">Pending</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Monitoring / Centerpiece */}
        <div className="xl:col-span-4 space-y-6">
          <div className={cn(
            "rounded-2xl border shadow-sm overflow-hidden transition-all duration-300",
            waStatus.connected ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
          )}>
            <div className={cn(
              "px-6 py-4 flex items-center justify-between",
              waStatus.connected ? "bg-emerald-600" : "bg-amber-600"
            )}>
              <h3 className="text-white font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                <MessageCircle size={16} /> 
                {waStatus.connected ? 'WhatsApp Linked' : 'WhatsApp Required'}
              </h3>
              {waStatus.connected && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded font-mono text-[10px] font-bold text-white uppercase">
                   Active
                </div>
              )}
            </div>
            <div className="p-6">
              {waStatus.connected ? (
                <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Identity</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+{waStatus.phone}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300 font-mono text-[10px] leading-relaxed text-slate-600">
                    *TASK ASSIGNMENT*\nWHAT: Sample task\nWHO: Shubham\nWHEN: 17 May
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                     <TrendingUp size={12} /> Gateway Ready for Operational Broadcasts
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5 text-center space-y-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">Messaging Gateway Offline</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Please link your device in Settings to enable automated WhatsApp notifications.</p>
                  </div>
                  <button onClick={() => window.location.href='/settings'} className="w-full py-2 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-amber-600/20">
                    Link Device Now
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h4 className="font-bold text-sm text-slate-700 uppercase tracking-tight mb-6 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" /> Operational Alerts
            </h4>
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Critical Inventory</p>
                <p className="text-xs font-semibold text-slate-700">Ripple Glass 150ml (Long) below 10% threshold.</p>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Flow Delay</p>
                <p className="text-xs font-semibold text-slate-700">Order #GP-1156 stalled in Stage 4 for 6+ hours.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

