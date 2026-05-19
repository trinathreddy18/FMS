import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Layout, 
  Settings2, 
  UserPlus, 
  Clock, 
  MessageSquare,
  ArrowRight,
  GripVertical,
  X,
  CheckCircle2,
  ListRestart,
  Workflow
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Field {
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';
  required: boolean;
  options?: string[];
}

interface Step {
  id: number;
  what: string;
  who: string; // assigned employee ID or placeholder
  how: string;
  tatHours: number;
}

interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  fields: Field[];
  steps: Step[];
  createdAt: any;
}

export function FlowDesigner() {
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isDesigning, setIsDesigning] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);

  const [flowData, setFlowData] = useState({
    name: '',
    description: '',
    fields: [] as Field[],
    steps: [] as Step[],
  });

  useEffect(() => {
    const q = query(collection(db, 'flowDefinitions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFlows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlowDefinition)));
    });

    const empUnsubscribe = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      empUnsubscribe();
    };
  }, []);

  const addField = () => {
    setFlowData({
      ...flowData,
      fields: [...flowData.fields, { label: '', type: 'text', required: true }]
    });
  };

  const removeField = (index: number) => {
    const newFields = [...flowData.fields];
    newFields.splice(index, 1);
    setFlowData({ ...flowData, fields: newFields });
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const newFields = [...flowData.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFlowData({ ...flowData, fields: newFields });
  };

  const addStep = () => {
    setFlowData({
      ...flowData,
      steps: [...flowData.steps, { id: flowData.steps.length + 1, what: '', who: '', how: '', tatHours: 4 }]
    });
  };

  const removeStep = (index: number) => {
    const newSteps = [...flowData.steps];
    newSteps.splice(index, 1);
    // Re-index
    const reindexed = newSteps.map((s, i) => ({ ...s, id: i + 1 }));
    setFlowData({ ...flowData, steps: reindexed });
  };

  const updateStep = (index: number, updates: Partial<Step>) => {
    const newSteps = [...flowData.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setFlowData({ ...flowData, steps: newSteps });
  };

  const handleSave = async () => {
    if (!flowData.name) return alert("Please enter flow name");
    if (flowData.fields.length === 0) return alert("Please add at least one field");
    if (flowData.steps.length === 0) return alert("Please add at least one workflow step");

    try {
      if (editingFlowId) {
        await updateDoc(doc(db, 'flowDefinitions', editingFlowId), {
          ...flowData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'flowDefinitions'), {
          ...flowData,
          createdAt: serverTimestamp()
        });
      }
      setIsDesigning(false);
      setEditingFlowId(null);
      setFlowData({ name: '', description: '', fields: [], steps: [] });
    } catch (err) {
      console.error(err);
      alert("Error saving flow definition");
    }
  };

  const editFlow = (flow: FlowDefinition) => {
    setEditingFlowId(flow.id);
    setFlowData({
      name: flow.name,
      description: flow.description,
      fields: flow.fields,
      steps: flow.steps,
    });
    setIsDesigning(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this flow definition? Existing data won't be deleted but new entries can't be created for it.")) {
      await deleteDoc(doc(db, 'flowDefinitions', id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Flow Designer</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            RUNTIME CONFIGURATION & WORKFLOW ENGINE
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[10px]">
              {flows.length} FLOW TYPES
            </span>
          </p>
        </div>
        {!isDesigning && (
          <button 
            onClick={() => {
              setEditingFlowId(null);
              setFlowData({ name: '', description: '', fields: [], steps: [] });
              setIsDesigning(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} />
            Create New Flow
          </button>
        )}
      </div>

      {isDesigning ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Form Designer */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Layout size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Data Form Design</h3>
                    <p className="text-xs text-slate-400">Configure entry fields & validations</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Flow Name</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Sales Order Process"
                      value={flowData.name}
                      onChange={e => setFlowData({...flowData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                    <input 
                      type="text"
                      placeholder="Short purpose of this flow"
                      value={flowData.description}
                      onChange={e => setFlowData({...flowData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry Fields</label>
                    <button 
                      onClick={addField}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Field
                    </button>
                  </div>

                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {flowData.fields.map((field, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl group"
                        >
                          <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-3">
                            <input 
                              placeholder="Field Label"
                              value={field.label}
                              onChange={e => updateField(idx, { label: e.target.value })}
                              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none transition-all"
                            />
                            <select 
                              value={field.type}
                              onChange={e => updateField(idx, { type: e.target.value as any })}
                              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-blue-500 outline-none transition-all"
                            >
                              <option value="text">Text Input</option>
                              <option value="number">Numeric</option>
                              <option value="date">Date Picker</option>
                              <option value="select">Dropdown</option>
                              <option value="radio">Radio Group</option>
                              <option value="checkbox">Checkbox (Yes/No)</option>
                              <option value="file">File Upload</option>
                            </select>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={e => updateField(idx, { required: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                REQUIRED
                              </label>
                            </div>
                            {(field.type === 'select' || field.type === 'radio') && (
                              <div className="col-span-full pt-2">
                                <input 
                                  placeholder="Options (comma separated): Red, Blue, Green"
                                  value={field.options?.join(', ') || ''}
                                  onChange={e => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] focus:border-blue-500 outline-none transition-all"
                                />
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => removeField(idx)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {flowData.fields.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                        <p className="text-xs text-slate-400 font-medium italic">No fields defined yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Designer */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 text-blue-400 rounded-xl flex items-center justify-center">
                    <Workflow size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Workflow Logic</h3>
                    <p className="text-xs text-slate-500">Define sequences, doers & TAT</p>
                  </div>
                </div>
                <button 
                  onClick={addStep}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-1"
                >
                  <Plus size={12} /> Add Step
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <AnimatePresence initial={false}>
                  {flowData.steps.map((step, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 shadow-inner group"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold font-mono">
                          {step.id}
                        </div>
                        <input 
                          placeholder="WHAT: Task description..."
                          value={step.what}
                          onChange={e => updateStep(idx, { what: e.target.value })}
                          className="flex-1 bg-transparent border-none text-sm font-bold text-white placeholder:text-slate-600 outline-none"
                        />
                        <button 
                          onClick={() => removeStep(idx)}
                          className="p-1 text-slate-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">WHO (Default Doer)</label>
                          <select 
                            value={step.who}
                            onChange={e => updateStep(idx, { who: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 focus:border-blue-500 outline-none transition-all cursor-pointer"
                          >
                            <option value="">-- Manual Selection --</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">HOW (Method)</label>
                          <input 
                            placeholder="e.g. Email & WhatsApp"
                            value={step.how}
                            onChange={e => updateStep(idx, { how: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 focus:border-blue-500 outline-none transition-all"
                          />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">WHEN (TAT Hours)</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range"
                              min="1"
                              max="168"
                              step="1"
                              value={step.tatHours}
                              onChange={e => updateStep(idx, { tatHours: parseInt(e.target.value) })}
                              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-xs font-mono font-bold text-blue-400 shrink-0 w-16 text-right">
                              {step.tatHours}h
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {flowData.steps.length === 0 && (
                  <div className="py-12 flex flex-col items-center gap-3 border-2 border-dashed border-slate-800 rounded-2xl">
                    <ListRestart size={24} className="text-slate-700" />
                    <p className="text-xs text-slate-600 font-medium italic">Define workflow steps to track progress</p>
                  </div>
                )}
              </div>

              <div className="mt-10 flex gap-4 relative z-10 pt-6 border-t border-slate-800">
                <button 
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                >
                  <Save size={16} />
                  Save Configuration
                </button>
                <button 
                  onClick={() => setIsDesigning(false)}
                  className="px-6 py-4 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {flows.map((flow) => (
              <motion.div 
                key={flow.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-125"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
                      <Workflow size={20} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => editFlow(flow)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Settings2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(flow.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1">{flow.name}</h3>
                  <p className="text-xs text-slate-500 mb-6 min-h-[32px] line-clamp-2">{flow.description || 'No description provided'}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Fields</p>
                      <p className="text-lg font-bold text-slate-900">{flow.fields.length}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Steps</p>
                      <p className="text-lg font-bold text-slate-900">{flow.steps.length}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workflow Preview</p>
                    <div className="flex flex-wrap gap-2">
                       {flow.steps.slice(0, 3).map((s, i) => (
                         <div key={i} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                           {s.id}. {(s.what || '').slice(0, 10)}...
                           {i < 2 && flow.steps.length > 1 && <ArrowRight size={10} className="text-slate-300" />}
                         </div>
                       ))}
                       {flow.steps.length > 3 && <span className="text-[10px] font-bold text-slate-400">+{flow.steps.length - 3} more</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {flows.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Workflow size={32} className="text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-bold">No Flow Definitions</h3>
              <p className="text-sm text-slate-500 mt-1">Start by designing your first runtime process flow.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
