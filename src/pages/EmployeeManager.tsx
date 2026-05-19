import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Search, 
  MoreVertical,
  Edit2,
  Mail,
  Phone,
  Briefcase,
  IdCard,
  X
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

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  whatsapp: string;
  department: string;
  createdAt: any;
}

export function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    whatsapp: '',
    department: 'Production'
  });

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      setEmployees(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        setEditingEmployee(null);
      } else {
        await addDoc(collection(db, 'employees'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setFormData({ employeeId: '', name: '', email: '', whatsapp: '', department: 'Production' });
      setIsAdding(false);
    } catch (err) {
      console.error("Error saving employee:", err);
      alert("Failed to save employee record.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      await deleteDoc(doc(db, 'employees', id));
    }
  };

  const startEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email || '',
      whatsapp: employee.whatsapp,
      department: employee.department
    });
    setIsAdding(true);
  };

  const filteredEmployees = employees.filter(emp => {
    const s = (search || '').toLowerCase();
    const name = (emp.name || '').toLowerCase();
    const eid = (emp.employeeId || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    return name.includes(s) || eid.includes(s) || dept.includes(s);
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Employee Master</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            DIRECTORY & PERSONNEL MANAGEMENT
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[10px]">
              {employees.length} RECORDED
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search directory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setEditingEmployee(null);
              setFormData({ employeeId: '', name: '', email: '', whatsapp: '', department: 'Production' });
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all shadow-md active:scale-95"
          >
            <UserPlus size={18} />
            Add Employee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Directory List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employee</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID & Dept</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {filteredEmployees.map((emp) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={emp.id} 
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Mail size={10} /> {emp.email || 'No email set'}
                              </p>
                              <p className="text-xs text-slate-500 capitalize">{emp.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
                              <IdCard size={12} className="text-slate-400" />
                              {emp.employeeId}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                              <Briefcase size={12} />
                              {emp.department}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                              <Phone size={12} />
                              +{emp.whatsapp}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 w-fit font-bold">
                              WHATSAPP READY
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEdit(emp)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(emp.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Users size={32} className="opacity-20" />
                          <p className="text-sm">No employees found in directory</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {isAdding ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {editingEmployee ? <Edit2 size={18} className="text-blue-500" /> : <UserPlus size={18} className="text-blue-500" />}
                    {editingEmployee ? 'Edit Employee' : 'New Employee Entry'}
                  </h3>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="text-slate-400 hover:text-slate-600 transform scale-120"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employee ID</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. EMP-001"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                    <input 
                      required
                      type="text"
                      placeholder="Enter employee name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="email"
                        placeholder="employee@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WhatsApp Number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">+</span>
                      <input 
                        required
                        type="tel"
                        placeholder="919876543210"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})}
                        className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 italic">Include country code without symbols (e.g., 91...)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                    <select 
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="Production">Production</option>
                      <option value="Quality Control">Quality Control</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Sales/CRM">Sales/CRM</option>
                      <option value="Administration">Administration</option>
                      <option value="Dispatch">Dispatch</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 mt-4"
                  >
                    {editingEmployee ? <Edit2 size={18} /> : <UserPlus size={18} />}
                    {editingEmployee ? 'Update Record' : 'Enroll Employee'}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-900 text-white rounded-xl p-8 space-y-6 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/40">
                    <Users size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Personnel Hub</h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                      Maintaining an accurate Employee Master list ensures seamless task assignments and instant WhatsApp notifications.
                    </p>
                  </div>
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      Direct Assignment Mode
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Auto-WhatsApp Sync
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      Departmental Routing
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
