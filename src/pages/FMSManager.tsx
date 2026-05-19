import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  where,
  deleteDoc
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search,
  Filter,
  Workflow,
  User,
  X,
  FileText,
  Calendar,
  Hash,
  ListFilter,
  Package,
  Layers,
  ArrowRight,
  Trash2,
  Send
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface Step {
  id: number;
  what: string;
  how: string;
  who: string;
  whoId: string;
  planned: string;
  plannedAt: string;
  actual?: string;
  status: 'pending' | 'done' | 'delayed';
  tatHours: number;
  notified30m?: boolean;
  notified15m?: boolean;
  notified5m?: boolean;
  notifiedOverdue?: boolean;
  autoNotified?: boolean;
}

interface FMSEntry {
  id: string;
  flowId: string;
  flowName: string;
  data: Record<string, any>;
  steps: Step[];
  status: string;
  createdAt: any;
  updatedAt: any;
}

interface FlowDefinition {
  id: string;
  name: string;
  fields: any[];
  steps: any[];
}

export function FMSManager() {
  const { userProfile } = useAuth();
  const [entries, setEntries] = useState<FMSEntry[]>([]);
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
  
  const [completingStep, setCompletingStep] = useState<{entryId: string, steps: Step[], stepId: number} | null>(null);
  const [selectedDoer, setSelectedDoer] = useState('');

  // Add Form State
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    // Listen to Flow Entries
    const q = query(collection(db, 'fms'), orderBy('createdAt', 'desc'));
    const unsubscribeEntries = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FMSEntry)));
      setLoading(false);
    });

    // Listen to Flow Definitions
    const qf = query(collection(db, 'flowDefinitions'), orderBy('name', 'asc'));
    const unsubscribeFlows = onSnapshot(qf, (snapshot) => {
      setFlows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlowDefinition)));
    });

    // Listen to Employees
    const unsubscribeEmployees = onSnapshot(query(collection(db, 'employees'), orderBy('name', 'asc')), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeEntries();
      unsubscribeFlows();
      unsubscribeEmployees();
    };
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlow) return;

    try {
      // Calculate initial steps from definition
      const now = new Date();
      let lastTime = now.getTime();

      const calculatedSteps: Step[] = selectedFlow.steps.map(s => {
        const plannedTime = lastTime + (s.tatHours * 3600000);
        lastTime = plannedTime; // Cumulative TAT logic (sequential steps)
        
        // Find default employee name if whoId exists
        const emp = employees.find(e => e.id === s.who);
        
        return {
          id: s.id,
          what: s.what,
          how: s.how,
          who: emp ? emp.name : 'Unassigned',
          whoId: s.who || '',
          tatHours: s.tatHours,
          planned: new Date(plannedTime).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          plannedAt: new Date(plannedTime).toISOString(),
          status: 'pending'
        };
      });

      const docRef = await addDoc(collection(db, 'fms'), {
        flowId: selectedFlow.id,
        flowName: selectedFlow.name,
        data: formData,
        steps: calculatedSteps,
        status: 'Active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userProfile?.name || 'System'
      });

      // Auto-notify first step doer
      if (calculatedSteps.length > 0) {
        await triggerAutoNotification(docRef.id, calculatedSteps, 0, selectedFlow.name);
      }

      setShowAddForm(false);
      setFormData({});
      setSelectedFlow(null);
      alert('Flow initialized successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'fms');
    }
  };

  const handleUpdateStep = async () => {
    if (!completingStep || !selectedDoer) return;

    const { entryId, steps, stepId } = completingStep;
    const employee = employees.find(e => e.id === selectedDoer);
    
    try {
      const updatedSteps = steps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            status: 'done' as const,
            who: employee ? employee.name : selectedDoer,
            whoId: selectedDoer,
            actual: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          };
        }
        return step;
      });

      const allDone = updatedSteps.every(s => s.status === 'done');

      // Update Firebase
      await updateDoc(doc(db, 'fms', entryId), {
        steps: updatedSteps,
        status: allDone ? 'Completed' : 'Active',
        updatedAt: serverTimestamp()
      });
      
      // Auto-notify NEXT step doer if exists
      const nextIndex = steps.findIndex(s => s.id === stepId) + 1;
      if (!allDone && nextIndex < updatedSteps.length) {
        const entry = entries.find(e => e.id === entryId);
        await triggerAutoNotification(entryId, updatedSteps, nextIndex, entry?.flowName || 'Process');
      }

      setCompletingStep(null);
      setSelectedDoer('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `fms/${entryId}`);
    }
  };

  const deleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'fms', id));
    } catch (err: any) {
      console.error("Delete FMS entry error:", err);
      handleFirestoreError(err, OperationType.DELETE, `fms/${id}`);
    }
  };

  const deleteCompletedEntries = async () => {
    const completed = entries.filter(e => e.status === 'Completed');
    if (completed.length === 0) {
      alert('No completed flows to clear.');
      return;
    }
    if (window.confirm(`Delete all ${completed.length} completed flows?`)) {
      try {
        await Promise.all(completed.map(e => deleteDoc(doc(db, 'fms', e.id))));
      } catch (err: any) {
        console.error("Batch delete error:", err);
        alert('Some deletions failed: ' + (err.message || 'See console'));
      }
    }
  };

  const triggerAutoNotification = async (entryId: string, steps: Step[], stepIndex: number, flowName: string) => {
    const step = steps[stepIndex];
    if (!step.whoId) return;

    try {
      const emp = employees.find(e => e.id === step.whoId);
      if (!emp || !emp.whatsapp) return;

      const message = `*FMS STEP ASSIGNMENT*\n\n` +
                      `*PROCESS:* ${flowName}\n\n` +
                      `*TASK:* ${step.what}\n\n` +
                      `*METHOD:* ${step.how}\n\n` +
                      `*EXPECTED BY:* ${step.planned}\n\n` +
                      `_Please navigate to Flow Management to complete this step._`;

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emp.whatsapp, message })
      });

      if (res.ok) {
        const updatedSteps = [...steps];
        updatedSteps[stepIndex] = { ...step, autoNotified: true };
        await updateDoc(doc(db, 'fms', entryId), { steps: updatedSteps });
      }
    } catch (err) {
      console.error("Auto-notify error:", err);
    }
  };

  const notifyStep = async (step: Step, flowName: string, entryId?: string) => {
    if (!step.whoId) {
      alert('Error: No doer assigned to this step.');
      return;
    }

    try {
      // Find employee to get phone
      const emp = employees.find(e => e.id === step.whoId);
      if (!emp || !emp.whatsapp) {
        alert('Error: Doer phone number not found in master list.');
        return;
      }

      const message = `*FMS STEP REMINDER*\n\n` +
                      `*PROCESS:* ${flowName}\n\n` +
                      `*TASK:* ${step.what}\n\n` +
                      `*METHOD:* ${step.how}\n\n` +
                      `*EXPECTED BY:* ${step.planned}\n\n` +
                      `_Please complete this task within the designated TAT._`;

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: emp.whatsapp, 
          message
        })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (entryId) {
          const entry = entries.find(e => e.id === entryId);
          if (entry) {
            const updatedSteps = entry.steps.map(s => s.id === step.id ? { ...s, autoNotified: true } : s);
            await updateDoc(doc(db, 'fms', entryId), { steps: updatedSteps });
          }
        }
        alert('WhatsApp notification sent successfully!');
      } else {
        alert(`WhatsApp Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Manual notify error:", err);
      alert('Communication error with WhatsApp gateway.');
    }
  };

  const filteredEntries = entries.filter(entry => {
    const searchStr = (searchQuery || '').toLowerCase();
    const flowName = (entry.flowName || '').toLowerCase();
    const dataValues = entry.data ? Object.values(entry.data).filter(v => v != null).map(v => String(v)).join(' ').toLowerCase() : '';
    return (
      flowName.includes(searchStr) ||
      dataValues.includes(searchStr)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Flow Management</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            DYNAMIC PROCESS TRACKING & TAT COMPLIANCE
          </p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/fms/design"
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            <Workflow size={16} /> Designer
          </Link>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-slate-900/10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* Add Flow Entry Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm">Initialize Flow Process</h3>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Runtime Form Generation</p>
                </div>
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage 1: Select Flow Type</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner font-bold cursor-pointer"
                      value={selectedFlow?.id || ''}
                      onChange={(e) => {
                        const flow = flows.find(f => f.id === e.target.value);
                        setSelectedFlow(flow || null);
                        setFormData({});
                      }}
                    >
                      <option value="">-- Choose Process Template --</option>
                      {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>

                  {selectedFlow && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 pt-4 border-t border-slate-100"
                    >
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage 2: Process Data</label>
                      <form onSubmit={handleAddEntry} className="space-y-4">
                        {selectedFlow.fields.map((field, idx) => (
                          <div key={idx} className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {field.type === 'select' ? (
                              <select 
                                required={field.required}
                                onChange={e => setFormData({...formData, [field.label]: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                              >
                                <option value="">Select Option</option>
                                {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : field.type === 'radio' ? (
                               <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                                 {field.options?.map((opt: string) => (
                                   <label key={opt} className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                     <input 
                                       type="radio"
                                       name={field.label}
                                       value={opt}
                                       required={field.required}
                                       onChange={e => setFormData({...formData, [field.label]: e.target.value})}
                                       className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                     />
                                     {opt}
                                   </label>
                                 ))}
                               </div>
                            ) : field.type === 'checkbox' ? (
                               <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-inner cursor-pointer">
                                 <input 
                                   type="checkbox"
                                   required={field.required}
                                   onChange={e => setFormData({...formData, [field.label]: e.target.checked ? 'Yes' : 'No'})}
                                   className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                 />
                                 <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Confirm {field.label}</span>
                               </label>
                            ) : field.type === 'file' ? (
                               <input 
                                 required={field.required}
                                 type="file"
                                 onChange={e => {
                                   const file = e.target.files?.[0];
                                   if (file) {
                                     setFormData({...formData, [field.label]: file.name});
                                   }
                                 }}
                                 className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                               />
                            ) : (
                              <input 
                                required={field.required}
                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                onChange={e => setFormData({...formData, [field.label]: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                              />
                            )}
                          </div>
                        ))}

                        <div className="pt-6">
                           <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                             <div className="flex items-center gap-3">
                               <Layers className="text-blue-500" size={20} />
                               <div>
                                 <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Workflow Summary</p>
                                 <p className="text-xs text-blue-600 mt-0.5">This flow will trigger {selectedFlow.steps.length} sequential steps.</p>
                               </div>
                             </div>
                           </div>

                           <button 
                            type="submit" 
                            className="w-full bg-slate-900 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-[0.98]"
                           >
                            Launch Production Cycle
                           </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal */}
      <AnimatePresence>
        {completingStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest">Verify Completion</h3>
                <button onClick={() => setCompletingStep(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirm Responsible Associate</label>
                  <select 
                    value={selectedDoer}
                    onChange={(e) => setSelectedDoer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <button 
                  disabled={!selectedDoer}
                  onClick={handleUpdateStep}
                  className="w-full bg-blue-600 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Lock Step
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search entries, clients, identifiers..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-100 bg-slate-50/50 rounded-xl focus:bg-white focus:border-blue-500 outline-none text-sm transition-all"
          />
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={deleteCompletedEntries}
            className="px-4 py-2 bg-white border border-red-100 text-red-500 text-[10px] font-bold rounded-xl uppercase tracking-widest hover:bg-red-50 shadow-sm"
          >
            Clear Completed
          </button>
          <div className="flex items-center gap-2">
          <ListFilter size={14} className="text-slate-400" />
          <select className="bg-transparent text-[10px] font-bold text-slate-500 uppercase tracking-widest outline-none border-none cursor-pointer">
             <option>All Processes</option>
             {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>
    </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing Operational Data...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  <th className="px-6 py-5 w-12"></th>
                  <th className="px-6 py-5">Process</th>
                  <th className="px-6 py-5">Next Required Step</th>
                  <th className="px-6 py-5">Progress</th>
                  <th className="px-6 py-5 text-right pr-10">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEntries.map((entry) => {
                  const currentStep = entry.steps?.find(s => s.status !== 'done') || entry.steps?.[entry.steps.length - 1];
                  const progressPercent = entry.steps ? (entry.steps.filter(s => s.status === 'done').length / entry.steps.length) * 100 : 0;
                  
                  return (
                    <React.Fragment key={entry.id}>
                      <tr 
                        className={cn(
                          "hover:bg-slate-50/80 transition-all group cursor-pointer",
                          expandedRow === entry.id ? "bg-slate-50/80" : ""
                        )}
                        onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                      >
                        <td className="px-6 py-6 text-center">
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                            expandedRow === entry.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-300"
                          )}>
                            {expandedRow === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.1em] mb-1">{entry.flowName}</span>
                            <span className="font-bold text-slate-800 text-base leading-tight">
                              {entry.data ? Object.values(entry.data)[0] : 'No Data'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium mt-0.5 italic">
                              {entry.data ? Object.values(entry.data)[1] : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                           {currentStep ? (
                             <div className="flex items-center gap-3">
                               <div className={cn(
                                 "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                                 currentStep.status === 'done' ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-blue-50 text-blue-500 border-blue-100"
                               )}>
                                 {currentStep.status === 'done' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                               </div>
                               <div>
                                 <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{currentStep.what}</p>
                                 <p className="text-[10px] text-slate-400 font-mono mt-0.5">EST: {currentStep.planned}</p>
                               </div>
                             </div>
                           ) : (
                             <span className="text-xs font-bold text-slate-300 italic">No Steps</span>
                           )}
                        </td>
                        <td className="px-6 py-6">
                           <div className="flex items-center gap-3">
                              <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden min-w-[80px]">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPercent}%` }}
                                  className={cn(
                                    "h-full transition-all duration-700",
                                    progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                                  )}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 font-mono">{Math.round(progressPercent)}%</span>
                           </div>
                        </td>
                        <td className="px-6 py-6 text-right pr-10">
                           <div className="flex items-center justify-end gap-3">
                             <span className={cn(
                               "text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest border",
                               entry.status === 'Completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                             )}>
                               {entry.status}
                             </span>
                             <button 
                               onClick={(e) => deleteEntry(entry.id, e)}
                               className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                               title="Delete Entry"
                             >
                               <Trash2 size={18} />
                             </button>
                           </div>
                        </td>
                      </tr>

                      {/* Timeline Detail */}
                      <AnimatePresence>
                        {expandedRow === entry.id && (
                          <tr>
                            <td colSpan={5} className="bg-slate-50/50 p-10 border-t border-slate-100">
                               <div className="max-w-4xl mx-auto space-y-8">
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pb-8 border-b border-slate-200/60">
                                     {entry.data && Object.entries(entry.data).map(([key, val]) => (
                                       <div key={key} className="space-y-1">
                                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{key}</p>
                                         <p className="text-sm font-bold text-slate-700">{val}</p>
                                       </div>
                                     ))}
                                  </div>

                                  <div className="space-y-6 relative">
                                    <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200"></div>
                                    {entry.steps?.map((step, idx) => (
                                      <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-start gap-8 relative group/step"
                                      >
                                        <div className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center z-10 shadow-sm border-2 transition-all font-bold",
                                          step.status === 'done' ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-300"
                                        )}>
                                          {step.status === 'done' ? <CheckCircle2 size={16} /> : <span className="text-xs font-mono">{step.id}</span>}
                                        </div>
                                        <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 hover:border-l-blue-500">
                                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex-1">
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">TASK DESCRIPTION</p>
                                              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{step.what}</h4>
                                              <div className="flex flex-wrap items-center gap-4 mt-3">
                                                 <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded text-[10px] font-bold text-slate-500 border border-slate-100">
                                                   <Workflow size={10} /> {step.how}
                                                 </div>
                                                 {step.who && (
                                                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600">
                                                     <User size={10} /> {step.who}
                                                   </div>
                                                 )}
                                                 <div className="flex items-center gap-3">
                                                   <button 
                                                     onClick={() => notifyStep(step, entry.flowName, entry.id)}
                                                     className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 transition-all active:scale-95"
                                                     title="Send WhatsApp Notification"
                                                   >
                                                     <Send size={10} /> Notify Doer
                                                   </button>
                                                   {step.autoNotified && (
                                                     <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50/50 px-2 py-0.5 rounded-full">
                                                       <CheckCircle2 size={10} /> WhatsApp Sent
                                                     </span>
                                                   )}
                                                 </div>
                                              </div>
                                            </div>
                                            <div className="md:text-right shrink-0">
                                               {step.actual ? (
                                                  <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">ACTUAL COMPLETION</p>
                                                    <p className="text-xs font-mono font-medium text-slate-500">{step.actual}</p>
                                                  </div>
                                               ) : (
                                                  <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">PLANNED TAT</p>
                                                    <p className="text-xs font-mono font-medium text-slate-500">{step.planned}</p>
                                                  </div>
                                               )}
                                            </div>
                                          </div>

                                          {step.status !== 'done' && (
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                               <button 
                                                onClick={() => setCompletingStep({ entryId: entry.id, steps: entry.steps, stepId: step.id })}
                                                className="text-[10px] font-bold bg-slate-900 text-white px-5 py-2 rounded-lg uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
                                               >
                                                Verify Step
                                               </button>
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                               </div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}

                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <Workflow size={48} className="text-slate-100 mx-auto mb-4" />
                      <h4 className="text-slate-400 font-bold uppercase tracking-widest text-sm">Operation Hub Empty</h4>
                      <p className="text-xs text-slate-300 mt-1">Start a new dynamic flow instance to track lifecycle.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
