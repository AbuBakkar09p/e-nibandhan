import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { toBengaliNumber } from '../lib/utils';
import { FileText, Clock, CheckCircle, XCircle, ChevronRight, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'applications', deleteId));
      setDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `applications/${deleteId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'applications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplications(apps);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'applications');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { icon: <Clock size={12} />, text: 'যাচাই চলছে', color: 'text-amber-700 bg-amber-100 border-transparent' };
      case 'processing': return { icon: <Clock size={12} />, text: 'প্রক্রিয়াধীন', color: 'text-blue-700 bg-blue-100 border-transparent' };
      case 'approved': return { icon: <CheckCircle size={12} />, text: 'সম্পন্ন', color: 'text-emerald-700 bg-emerald-100 border-transparent' };
      case 'rejected': return { icon: <XCircle size={12} />, text: 'প্রত্যাখ্যাত', color: 'text-rose-700 bg-rose-100 border-transparent' };
      default: return { icon: <Clock size={12} />, text: 'খসড়া', color: 'text-slate-600 bg-slate-100 border-transparent' };
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'new': return 'নতুন জন্ম নিবন্ধন';
      case 'correction': return 'সংশোধনী আবেদন';
      case 'death': return 'মৃত্যু নিবন্ধন আবেদন';
      default: return 'অন্যান্য';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-10">
      {/* Welcome Hero */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-emerald-700 border border-emerald-600 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-emerald-100 overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-emerald-200 text-xs font-bold uppercase tracking-[0.3em] mb-3">নাগরিক প্যানেল</p>
          <h1 className="text-3xl md:text-4xl font-bold">স্বাগতম, {profile?.fullName || 'ব্যবহারকারী'}</h1>
          <p className="text-emerald-100 mt-3 opacity-90 max-w-md leading-relaxed">
            আপনার ডিজিটাল নিবন্ধনের সকল তথ্যাদি এখান থেকে পরিচালনা করুন। বামদিকের সাইডবার থেকে সরাসরি নতুন আবেদন করতে পারবেন।
          </p>
          <div className="flex items-center gap-4 mt-8">
            <Link to="/profile" className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 backdrop-blur-sm">
              প্রোফাইল আপডেট
            </Link>
            <Link to="/apply/new" className="bg-white text-emerald-700 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95">
              নতুন আবেদন
            </Link>
          </div>
        </div>
        <div className="hidden md:block relative z-10">
          <div className="w-32 h-32 bg-emerald-500/20 rounded-full flex items-center justify-center border border-white/20 animate-pulse">
            <FileText size={48} className="text-emerald-100" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      </div>

      {/* Status Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="মোট আবেদন" 
          value={applications.length} 
          progress={100}
          progressColor="bg-blue-500" 
        />
        <StatCard 
          title="অপেক্ষমান" 
          value={applications.filter(a => a.status === 'pending' || a.status === 'processing').length} 
          progress={applications.length ? (applications.filter(a => a.status === 'pending' || a.status === 'processing').length / applications.length) * 100 : 0}
          progressColor="bg-amber-500" 
        />
        <StatCard 
          title="সফল আবেদন" 
          value={applications.filter(a => a.status === 'approved').length} 
          progress={applications.length ? (applications.filter(a => a.status === 'approved').length / applications.length) * 100 : 0}
          progressColor="bg-emerald-500" 
        />
        <StatCard 
          title="সফলতার হার" 
          value={applications.length ? Math.round((applications.filter(a => a.status === 'approved').length / applications.length) * 100) : 0} 
          unit="%"
          progress={applications.length ? (applications.filter(a => a.status === 'approved').length / applications.length) * 100 : 0}
          progressColor="bg-indigo-500" 
        />
      </div>

      {/* Type-based Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportCard 
          title="নতুন জন্ম নিবন্ধন প্রতিবেদন" 
          count={applications.filter(a => a.type === 'new').length} 
          link="/reports/new-birth" 
          color="bg-indigo-500"
          icon={<FileText size={24} />}
        />
        <ReportCard 
          title="তথ্য সংশোধন প্রতিবেদন" 
          count={applications.filter(a => a.type === 'correction').length} 
          link="/reports/correction" 
          color="bg-blue-500"
          icon={<Clock size={24} />}
        />
        <ReportCard 
          title="মৃত্যু নিবন্ধন প্রতিবেদন" 
          count={applications.filter(a => a.type === 'death').length} 
          link="/reports/death" 
          color="bg-rose-500"
          icon={<XCircle size={24} />}
        />
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="font-bold text-slate-900 uppercase tracking-tight text-sm">আবেদনের স্থিতি পরীক্ষা করুন</h3>
        </div>

        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />)}
            </div>
          ) : applications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-20 text-slate-400">
              <FileText size={48} className="opacity-20 mb-4" />
              <p className="text-lg italic font-medium">আপনার কোনো আবেদন পাওয়া যায়নি।</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">ট্র্যাকিং আইডি</th>
                  <th className="px-6 py-4">আবেদনের ধরন</th>
                  <th className="px-6 py-4">তারিখ</th>
                  <th className="px-6 py-4 text-center">অবস্থা</th>
                  <th className="px-6 py-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {applications.map((app) => {
                  const status = getStatusInfo(app.status);
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 uppercase tracking-tighter">#{toBengaliNumber(app.id.substring(0, 10))}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{getTypeName(app.type)}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(app.createdAt).toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${status.color}`}>
                          {status.icon}
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => navigate(`/apply/${app.type}?editId=${app.id}`)}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            title="সম্পাদনা করুন"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteId(app.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                            title="মুছুন"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
                  <Trash2 size={24} />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2 font-display">আবেদনটি কি মুছতে চান?</h4>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">এটি একটি স্থায়ী ব্যবস্থা এবং এটি আর ফিরে পাওয়া যাবে না। আপনি কি নিশ্চিত?</p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDeleteId(null)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    বাতিল
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95 disabled:scale-100 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : 'হ্যাঁ, মুছুন'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, progress, progressColor, unit = '' }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
    <p className="text-sm text-slate-500 font-semibold">{title}</p>
    <div className="flex items-baseline gap-1 mt-2">
      <p className="text-4xl font-bold text-slate-900">{toBengaliNumber(value.toString().padStart(2, '0'))}</p>
      {unit && <span className="text-lg font-bold text-slate-400">{unit}</span>}
    </div>
    <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full ${progressColor}`}
      />
    </div>
  </div>
);

const ReportCard = ({ title, count, link, color, icon }) => (
  <Link to={link} className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between overflow-hidden">
    <div className="relative z-10">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-slate-900">{toBengaliNumber(count.toString().padStart(2, '0'))}</p>
        <p className="text-xs font-bold text-slate-500">আবেদন</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-[10px] group-hover:gap-3 transition-all">
        সকল প্রতিবেদন দেখুন <ChevronRight size={12} />
      </div>
    </div>
    <div className={`w-14 h-14 rounded-2xl ${color.replace('bg-', 'bg-opacity-10 text-')} flex items-center justify-center relative z-10 transition-transform group-hover:scale-110`}>
      <div className={color.replace('bg-', 'text-')}>
        {icon}
      </div>
    </div>
    <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${color} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700`} />
  </Link>
);

export default Dashboard;
