import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, LogOut, User as UserIcon, Home, PlusCircle, LayoutDashboard, Fingerprint, ShieldCheck, Wallet, Plus, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../ui/Logo';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { toBengaliNumber } from '../../lib/utils';
import { OperationType } from '../../types';
import { handleFirestoreError } from '../../lib/error-handler';

export const Navbar = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [amount, setAmount] = useState('');

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handleAddBalance = (e) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    
    setShowAddBalance(false);
    navigate(`/payment-gateway?amount=${amount}`);
    setAmount('');
  };

  return (
    <nav className="bg-white text-slate-800 border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="w-full">
        <div className="flex h-16 items-center">
          {/* Logo Section - Aligned with Sidebar width on Desktop */}
          <div className={`${user ? 'lg:w-64 border-r border-slate-200' : 'lg:w-auto'} flex items-center px-6 h-full transition-all duration-300`}>
            <Link to={user ? "/dashboard" : "/login"}>
              <Logo className="w-10 h-10" showText={true} />
            </Link>
          </div>

          {/* Main Nav Content */}
          <div className="flex-1 flex justify-between items-center px-6 lg:px-8">
            <div className="flex items-center space-x-6">
              {/* Links removed as requested */}
            </div>

            <div className="flex items-center">
              {user ? (
                <div className="flex items-center gap-4">
                  {/* Balance Display */}
                  <div className="hidden md:flex items-center gap-3 bg-emerald-50/50 border border-emerald-100/50 px-4 py-1.5 rounded-2xl group transition-all hover:bg-emerald-50 active:scale-95 cursor-pointer" onClick={() => setShowAddBalance(true)}>
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                      <Wallet size={16} />
                    </div>
                    <div className="flex flex-col items-start translate-y-[1px]">
                      <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider leading-none mb-0.5">ব্যালেন্স</span>
                      <span className="text-sm font-black text-emerald-700 leading-none">৳ {toBengaliNumber(profile?.balance || 0)}</span>
                    </div>
                    <div className="ml-3 px-3 py-1 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                      রিচার্জ করুন
                    </div>
                  </div>

                  <div className="h-8 w-[1px] bg-slate-100 mx-2 hidden sm:block"></div>
                  <Link to="/profile" className="flex items-center gap-3 text-right group">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{profile?.fullName}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">ভারপ্রাপ্ত কর্মকর্তা</span>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center text-emerald-700 overflow-hidden group-hover:border-emerald-400 transition-all shadow-sm">
                      {profile?.photoURL ? (
                        <img 
                          src={profile.photoURL} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <UserIcon size={20} />
                      )}
                    </div>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="ml-2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100"
                    title="লগ আউট"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link 
                    to="/login" 
                    className="text-sm font-bold text-slate-600 hover:text-emerald-700 px-4 py-2 transition-colors"
                  >
                    লগইন
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    নিবন্ধন করুন
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Balance Modal */}
      <AnimatePresence>
        {showAddBalance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 relative overflow-hidden"
            >
              {/* Background Accent */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-50 rounded-full opacity-50 blur-3xl"></div>
              
              <button 
                onClick={() => setShowAddBalance(false)}
                className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-inner ring-4 ring-emerald-50 ring-offset-0">
                  <Wallet size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-2 font-display tracking-tight">রিচার্জ করুন</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">আপনার অ্যাকাউন্টে কত টাকা রিচার্জ করতে চান?</p>
                
                <form onSubmit={handleAddBalance} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">টাকার পরিমাণ</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg group-focus-within:text-emerald-500 transition-colors">৳</div>
                      <input 
                        type="number" 
                        required
                        autoFocus
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-10 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-300 shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[100, 500, 1000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val.toString())}
                        className="py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95"
                      >
                        ৳ {toBengaliNumber(val)}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddBalance(false)}
                      className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
                    >
                      বাতিল
                    </button>
                    <button 
                      type="submit"
                      disabled={!amount}
                      className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                      <Plus size={20} />
                      <span>রিচার্জ করুন</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};
