import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  CheckSquare, 
  MessageCircle, 
  Plus, 
  Trash2, 
  Send,
  Calendar,
  User,
  AlertTriangle,
  Check,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export function TaskManager() {
  const { userProfile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [waStatus, setWaStatus] = useState<{connected: boolean, phone: string | null}>({ connected: false, phone: null });
  const [newTask, setNewTask] = useState({
    title: '',
    code: '',
    how: '',
    plannedDate: '',
    priority: 'medium',
    doerName: '',
    whatsapp: '',
    doerId: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore listening error:", error);
    });

    const employeesUnsubscribe = onSnapshot(query(collection(db, 'employees'), orderBy('name', 'asc')), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const checkWaStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        setWaStatus({ connected: data.connected, phone: data.phone });
      } catch (err) {
        // Silently fail
      }
    };
    checkWaStatus();
    const interval = setInterval(checkWaStatus, 10000);

    return () => {
      unsubscribeTasks();
      employeesUnsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setNewTask({
        ...newTask,
        doerId: employee.id,
        doerName: employee.name,
        whatsapp: employee.whatsapp
      });
    } else {
      setNewTask({
        ...newTask,
        doerId: '',
        doerName: '',
        whatsapp: ''
      });
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskCode = 'CHK' + Math.floor(100000 + Math.random() * 900000);
      const taskData = {
        ...newTask,
        plannedDate: new Date(newTask.plannedDate).toISOString(),
        code: taskCode,
        status: 'pending',
        assignedBy: userProfile?.name || 'Administrator',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        doerId: newTask.doerId || 'manual_entry'
      };
      
      const docRef = await addDoc(collection(db, 'tasks'), taskData);
      
      // Auto-notify via WhatsApp
      if (newTask.whatsapp) {
        await sendWhatsAppNotification({
          id: docRef.id,
          ...taskData,
          plannedDate: taskData.plannedDate // Ensure date is passed correctly for formatting
        });
      }

      setIsAdding(false);
      setNewTask({ title: '', code: '', how: '', plannedDate: '', priority: 'medium', doerName: '', whatsapp: '', doerId: '' });
    } catch (err) {
      console.error("Add task error:", err);
    }
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'tasks', id), {
        status: currentStatus === 'completed' ? 'pending' : 'completed',
        actualDate: currentStatus === 'completed' ? null : new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Update task error:", err);
    }
  };

  const sendWhatsAppNotification = async (task: any) => {
    if (!task.whatsapp) {
      alert('Error: No WhatsApp number provided for this task.');
      return;
    }

    try {
      const message = `*WHATSAPP TASK ASSIGNMENT (SMART CHECKLIST)*\n\n` +
                      `*WHAT:* ${task.title}\n\n` +
                      `*HOW:* ${task.how || 'N/A'}\n\n` +
                      `*WHO:* ${task.doerName}\n\n` +
                      `*WHEN:* ${new Date(task.plannedDate).toLocaleString('en-GB')}\n\n` +
                      `*TASK ID:* ${task.code}\n\n` +
                      `_Please acknowledge and mark as completed once done._`;
      
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: task.whatsapp, 
          message
        })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        await updateDoc(doc(db, 'tasks', task.id), { whatsappSent: true });
        // Tiny visual confirmation could be better than alert, but alert for now as requested
        alert('WhatsApp alert broadcasted successfully!');
      } else {
        alert(`WhatsApp Failed: ${data.error || 'Unknown error'}. Please check link in Settings.`);
      }
    } catch (err) {
      console.error("WhatsApp error:", err);
      alert('Communication error with WhatsApp gateway. Please try again or check Settings.');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err: any) {
      console.error("Delete task error:", err);
      alert('Delete failed: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Ultimate Checklist V5.2</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            TASK ASSIGNMENT & WHATSAPP INTEGRATION
            {waStatus.connected ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  CONNECTED: +{waStatus.phone}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  WA GATEWAY OFFLINE
                </span>
              )}
          </p>
        </div>
        <div className="flex gap-3">
           <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
             <MessageCircle size={14} /> WhatsApp Service: Active
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Task Intake Form */}
        <div className="xl:col-span-4 self-start">
          <form onSubmit={handleAddTask} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-8">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">Assign New Instruction</h3>
              <Plus size={18} className="text-blue-400" />
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WHAT has to be Done</label>
                <textarea 
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Task Requirement / Goal"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all resize-none h-20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HOW will it be Done</label>
                <textarea 
                  required
                  value={newTask.how}
                  onChange={e => setNewTask({...newTask, how: e.target.value})}
                  placeholder="Implementation Strategy / Procedure"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all resize-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WHEN will it be Done</label>
                  <input 
                    required
                    type="datetime-local"
                    value={newTask.plannedDate}
                    onChange={e => setNewTask({...newTask, plannedDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 cursor-pointer font-bold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WHO will do it (Select from Master)</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                    <User size={16} className="text-slate-400" />
                    <select 
                      value={newTask.doerId}
                      onChange={e => handleEmployeeSelect(e.target.value)}
                      className="bg-transparent text-sm w-full outline-none font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(!newTask.doerId && employees.length > 0) && (
                  <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle size={10} /> Please select an employee from the master list
                  </p>
                )}
                {employees.length === 0 && (
                  <Link to="/employees" className="text-[10px] text-blue-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
                    <Plus size={10} /> No employees found. Add to Master first.
                  </Link>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp No (Auto-filled)</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 opacity-70">
                    <MessageCircle size={16} className="text-slate-400" />
                    <input 
                      disabled
                      type="tel"
                      value={newTask.whatsapp}
                      placeholder="Select employee above"
                      className="bg-transparent text-sm w-full outline-none font-mono text-slate-700" 
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] mt-2"
              >
                Assign & Notify (WA)
              </button>
            </div>
          </form>
        </div>

        {/* Task List Partition */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex gap-2">
               <button className="px-5 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-xl uppercase tracking-widest shadow-md">Active Checklist</button>
               <button 
                 onClick={async () => {
                   const completedTasks = tasks.filter(t => t.status === 'completed');
                   if (completedTasks.length === 0) {
                     alert('No completed tasks to clear.');
                     return;
                   }
                   if (window.confirm(`Are you sure you want to delete all ${completedTasks.length} completed tasks?`)) {
                      try {
                        await Promise.all(completedTasks.map(t => deleteDoc(doc(db, 'tasks', t.id))));
                        alert('History cleared successfully!');
                      } catch (err: any) {
                        console.error("Clear completed error:", err);
                        alert('Clear failed: ' + (err.message || 'Unknown error'));
                      }
                   }
                 }}
                 className="px-5 py-2 bg-white text-red-500 text-[10px] font-bold rounded-xl uppercase tracking-widest border border-red-100 hover:bg-red-50"
               >
                 Clear Completed
               </button>
             </div>
             <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Filter tasks..." className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 shadow-sm" />
                </div>
             </div>
          </div>

          <div className="space-y-4">
            {tasks.map((task, i) => (
              <motion.div
                layout
                key={task.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "bg-white border p-6 rounded-2xl shadow-sm transition-all flex flex-col md:flex-row items-start gap-6 hover:shadow-md group relative overflow-hidden",
                  task.status === 'completed' ? "border-emerald-100 bg-emerald-50/20 opacity-80" : "border-slate-200"
                )}
              >
                {task.status === 'completed' && (
                   <div className="absolute top-0 right-0 p-3">
                      <CheckSquare size={100} className="text-emerald-500 opacity-5 -rotate-12 translate-x-10 -translate-y-10" />
                   </div>
                )}
                
                <button 
                  onClick={() => toggleTask(task.id, task.status)}
                  className={cn(
                    "w-8 h-8 rounded-xl border-2 shrink-0 flex items-center justify-center transition-all shadow-sm z-10",
                    task.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 hover:border-blue-500"
                  )}
                >
                  {task.status === 'completed' ? <Check size={18} /> : <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-blue-300" />}
                </button>

                <div className="flex-1 min-w-0 z-10">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="font-mono text-[10px] font-bold text-blue-600 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded border border-blue-100">#{task.code}</span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shadow-sm border",
                      task.priority === 'urgent' ? "bg-red-50 text-red-600 border-red-100" :
                      task.priority === 'high' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-slate-50 text-slate-500 border-slate-100"
                    )}>
                      {task.priority} Priority
                    </span>
                    {task.whatsappSent && (
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <MessageCircle size={10} /> WhatsApp Sent
                      </span>
                    )}
                  </div>
                  <h4 className={cn(
                    "text-lg font-bold text-slate-800 tracking-tight leading-snug",
                    task.status === 'completed' && "line-through text-slate-400"
                  )}>
                    <span className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-widest opacity-60">WHAT:</span>
                    {task.title}
                  </h4>
                  {task.how && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-60">HOW:</p>
                      <p className={cn(
                        "text-sm text-slate-600 font-medium",
                        task.status === 'completed' && "line-through opacity-50"
                      )}>{task.how}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-8 mt-6 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 font-bold text-sm shadow-inner group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        {task.doerName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WHO (Employee)</p>
                        <p className="text-sm font-bold text-slate-700">{task.doerName}</p>
                      </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={10}/> WHEN (Deadline)</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(task.plannedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col items-center justify-center gap-2 z-10 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 md:pl-6 md:border-l border-slate-50">
                  {task.status !== 'completed' && (
                    <button 
                      onClick={() => toggleTask(task.id, task.status)}
                      className="flex-1 md:flex-none p-3 text-white bg-emerald-600 border border-emerald-100 hover:bg-emerald-700 rounded-xl transition-all shadow-sm active:scale-95"
                      title="Complete Task"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => sendWhatsAppNotification(task)}
                    className="flex-1 md:flex-none p-3 text-emerald-600 bg-white border border-emerald-100 hover:bg-emerald-50 rounded-xl transition-all shadow-sm active:scale-95"
                    title="Send WhatsApp Reminder"
                  >
                    <Send size={18} />
                  </button>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="flex-1 md:flex-none p-3 text-red-500 bg-white border border-red-100 hover:bg-red-50 rounded-xl transition-all shadow-sm active:scale-95"
                    title="Delete Requirement"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
            
            {tasks.length === 0 && (
              <div className="py-20 text-center bg-white border border-slate-100 border-dashed rounded-2xl">
                 <div className="p-4 bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckSquare size={32} className="text-slate-300" />
                 </div>
                 <h5 className="font-bold text-slate-400 uppercase tracking-widest text-sm">Clear Horizon</h5>
                 <p className="text-xs text-slate-300 mt-2">All tasks completed or none assigned.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
