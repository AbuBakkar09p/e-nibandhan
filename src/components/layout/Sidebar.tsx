import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  PlusCircle, 
  FileEdit, 
  Ghost, 
  LayoutDashboard, 
  User, 
  Settings,
  Baby,
  ChevronDown,
  FileText,
  BarChart3,
  ClipboardList,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Sidebar = () => {
  const location = useLocation();
  const [isApplyOpen, setIsApplyOpen] = useState(location.pathname.startsWith('/apply'));
  const [isReportOpen, setIsReportOpen] = useState(location.pathname.startsWith('/reports'));
  const [isVillageOpen, setIsVillageOpen] = useState(location.pathname.startsWith('/admin/villages'));

  const menuItems = [
    {
      title: 'ড্যাশবোর্ড',
      icon: <LayoutDashboard size={20} />,
      path: '/dashboard',
    },
  ];

  const applyItems = [
    {
      title: 'নতুন জন্ম নিবন্ধন',
      icon: <Baby size={18} />,
      path: '/apply/new',
    },
    {
      title: 'তথ্য সংশোধন',
      icon: <FileEdit size={18} />,
      path: '/apply/correction',
    },
    {
      title: 'মৃত্যু নিবন্ধন',
      icon: <Ghost size={18} />,
      path: '/apply/death',
    },
  ];

  const reportItems = [
    {
      title: 'নতুন জন্ম নিবন্ধন প্রতিবেদন',
      icon: <ClipboardList size={18} />,
      path: '/reports/new-birth',
    },
    {
      title: 'তথ্য সংশোধন প্রতিবেদন',
      icon: <ClipboardList size={18} />,
      path: '/reports/correction',
    },
    {
      title: 'মৃত্যু নিবন্ধন প্রতিবেদন',
      icon: <ClipboardList size={18} />,
      path: '/reports/death',
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] sticky top-16 hidden lg:flex flex-col p-4">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-4 py-2">প্রধান মেনু</p>
        
        {/* Dashboard and Profile */}
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-700 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
              }`}
            >
              <span className={`transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`}>
                {item.icon}
              </span>
              <span className="text-sm">{item.title}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600" 
                />
              )}
            </Link>
          );
        })}

        {/* Applications Dropdown */}
        <div className="space-y-1 pt-1">
          <button
            onClick={() => setIsApplyOpen(!isApplyOpen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
              isApplyOpen 
                ? 'text-emerald-700 font-medium' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
            }`}
          >
            <span className={`transition-colors ${isApplyOpen ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`}>
              <FileText size={20} />
            </span>
            <span className="text-sm">আবেদন সমূহ</span>
            <motion.span
              animate={{ rotate: isApplyOpen ? 180 : 0 }}
              className="ml-auto text-slate-400"
            >
              <ChevronDown size={16} />
            </motion.span>
          </button>

          <AnimatePresence>
            {isApplyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1 pl-4"
              >
                {applyItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
                        isActive 
                          ? 'bg-emerald-50/50 text-emerald-700 font-bold' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
                      }`}
                    >
                      <span className={`transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-300 group-hover:text-emerald-500'}`}>
                        {item.icon}
                      </span>
                      <span className="text-xs">{item.title}</span>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reports Dropdown */}
        <div className="space-y-1 pt-1">
          <button
            onClick={() => setIsReportOpen(!isReportOpen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
              isReportOpen 
                ? 'text-emerald-700 font-medium' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
            }`}
          >
            <span className={`transition-colors ${isReportOpen ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`}>
              <BarChart3 size={20} />
            </span>
            <span className="text-sm">প্রতিবেদন</span>
            <motion.span
              animate={{ rotate: isReportOpen ? 180 : 0 }}
              className="ml-auto text-slate-400"
            >
              <ChevronDown size={16} />
            </motion.span>
          </button>

          <AnimatePresence>
            {isReportOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1 pl-4"
              >
                {reportItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
                        isActive 
                          ? 'bg-emerald-50/50 text-emerald-700 font-bold' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
                      }`}
                    >
                      <span className={`transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-300 group-hover:text-emerald-500'}`}>
                        {item.icon}
                      </span>
                      <span className="text-xs">{item.title}</span>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Village Management link */}
        <div className="pt-1">
          <Link
            to="/admin/villages"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
              location.pathname === '/admin/villages'
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
            }`}
          >
            <span className={`transition-colors ${location.pathname === '/admin/villages' ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`}>
              <MapPin size={20} />
            </span>
            <span className="text-sm">গ্রাম ব্যবস্থাপনা</span>
          </Link>
        </div>
      </div>

      <div className="mt-auto space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-4 py-2">সহায়তা প্রাঙ্গণ</p>
        <Link
          to="#"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-all"
        >
          <Settings size={20} className="text-slate-400" />
          <span className="text-sm">সেটিংস</span>
        </Link>
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-emerald-700 text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold opacity-80 uppercase tracking-widest">সহায়তা প্রয়োজন?</p>
          <p className="text-[10px] mt-1 text-emerald-100">আমাদের হেল্পলাইনে কল করুন ১৬২৬৩ নম্বরে</p>
        </div>
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-xl" />
      </div>
    </div>
  );
};

export default Sidebar;
