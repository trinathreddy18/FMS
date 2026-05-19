import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Download, 
  Plus, 
  ArrowUpRight, 
  AlertTriangle,
  ArrowRightLeft,
  Filter,
  TrendingUp,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface InventoryItem {
  id: string;
  name: string;
  gsm: string;
  size: string;
  available: number;
  threshold: number;
  category: string;
  sku: string;
  unit: string;
}

export function IMSManager() {
  const [activeTab, setActiveTab] = useState<'all' | 'low-stock' | 'movements'>('all');

  const mockInventory: InventoryItem[] = [
    { id: '1', sku: 'GP-TR-7', name: '2 CP Tray 7 Inc Plain Kraft', gsm: '315 GSM', size: '50x20', available: 1200, threshold: 500, category: 'Tray', unit: 'pcs' },
    { id: '2', sku: 'GP-CP-360', name: 'DW Paper Cups 360 ml', gsm: '290+265 GSM', size: 'Standard', available: 29000, threshold: 5000, category: 'Cup', unit: 'pcs' },
    { id: '3', sku: 'GP-BT-500', name: 'Boat Tray 500 ml Plain Kraft', gsm: '270 GSM', size: '500x7', available: 450, threshold: 1000, category: 'Tray', unit: 'pcs' },
    { id: '4', sku: 'GP-BX-BUR', name: 'Burger Box Plain Kraft', gsm: '290 GSM', size: '10x10', available: 0, threshold: 1000, category: 'Box', unit: 'pcs' },
  ];

  const filteredItems = activeTab === 'low-stock' 
    ? mockInventory.filter(i => i.available <= i.threshold)
    : mockInventory;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Inventory Module (IMS)</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">STOCK AUDIT & RESOURCE ALLOCATION</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-slate-700 px-6 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
            <Download size={16} /> Export Sheet
          </button>
          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95">
            <Plus size={16} /> Add Inventory
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total SKU In-Stock</p>
            <p className="text-2xl font-bold text-slate-900">30,650 Units</p>
          </div>
          <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recent Movements</p>
            <p className="text-2xl font-bold text-slate-900">1,452 Items</p>
          </div>
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
            <History size={20} />
          </div>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Alerts</p>
            <p className="text-2xl font-bold text-slate-900 underline decoration-red-200">08 Low Items</p>
          </div>
          <div className="bg-red-100 p-2 rounded-lg text-red-600">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 bg-slate-50/50">
          <div className="flex">
            {(['all', 'low-stock', 'movements'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all shrink-0",
                  activeTab === tab 
                    ? "border-blue-600 text-blue-600 bg-white" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3 relative min-w-[300px]">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search SKU / Item Name..." 
               className="w-full bg-white border border-slate-100 pl-10 pr-4 py-2 rounded-lg text-xs outline-none focus:border-blue-500 shadow-inner"
             />
             <button className="p-2 text-slate-400 hover:text-slate-600">
               <Filter size={14} />
             </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">SKU / Item Details</th>
                <th className="px-8 py-5 text-center">Available Qty</th>
                <th className="px-8 py-5">GSM / Specification</th>
                <th className="px-8 py-5 text-right w-32">Quick Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className={cn(
                      "w-3 h-3 rounded-full shadow-sm",
                      item.available === 0 ? "bg-slate-900" :
                      item.available <= item.threshold ? "bg-red-500 ring-4 ring-red-100 animate-pulse" : "bg-emerald-500"
                    )} />
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] font-bold text-slate-400 mb-1">{item.sku}</span>
                      <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{item.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">{item.category}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-lg font-black",
                        item.available <= item.threshold ? "text-red-500" : "text-slate-900"
                      )}>{item.available.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Threshold: {item.threshold}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{item.gsm}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Size: {item.size}</span>
                     </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg border border-transparent hover:border-blue-100 hover:bg-blue-50">
                        <ArrowUpRight size={18} />
                      </button>
                      <button className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-lg border border-transparent hover:border-indigo-100 hover:bg-indigo-50">
                        <ArrowRightLeft size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
