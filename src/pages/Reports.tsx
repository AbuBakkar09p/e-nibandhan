import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Application, OperationType, ApplicationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { FileText, Clock, CheckCircle, XCircle, Search, Calendar, User, Phone, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Reports = () => {
  const { type } = useParams<{ type: string }>();
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Map URL type to ApplicationType
  const typeMap: Record<string, ApplicationType> = {
    'new-birth': 'new',
    'correction': 'correction',
    'death': 'death'
  };

  const appType = type ? typeMap[type] : null;

  useEffect(() => {
    if (!user || !appType) return;

    setLoading(true);
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', user.uid),
      where('type', '==', appType),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        setApplications(apps);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'applications');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, appType]);

  if (!appType) {
    return <Navigate to="/dashboard" />;
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { icon: <Clock size={12} />, text: 'যাচাই চলছে', color: 'text-amber-700 bg-amber-100 border-amber-200' };
      case 'processing': return { icon: <Clock size={12} />, text: 'প্রক্রিয়াধীন', color: 'text-blue-700 bg-blue-100 border-blue-200' };
      case 'approved': return { icon: <CheckCircle size={12} />, text: 'সম্পন্ন', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' };
      case 'rejected': return { icon: <XCircle size={12} />, text: 'প্রত্যাখ্যাত', color: 'text-rose-700 bg-rose-100 border-rose-200' };
      default: return { icon: <Clock size={12} />, text: 'খসড়া', color: 'text-slate-600 bg-slate-100 border-slate-200' };
    }
  };

  const getPageTitle = () => {
    switch (appType) {
      case 'new': return 'নতুন জন্ম নিবন্ধন প্রতিবেদন';
      case 'correction': return 'তথ্য সংশোধন প্রতিবেদন';
      case 'death': return 'মৃত্যু নিবন্ধন প্রতিবেদন';
      default: return 'প্রতিবেদন';
    }
  };

  const filteredApps = applications.filter(app => 
    app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-6 lg:py-10 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight font-display">
            {getPageTitle()}
          </h1>
          <p className="text-slate-500 mt-2 flex items-center gap-2">
            <FileText size={16} className="text-emerald-600" />
            আপনার করা সকল {getPageTitle()}ের তালিকা এখানে দেখতে পাবেন।
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="নাম বা ট্র্যাকিং আইডি দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText size={40} className="text-slate-200" />
            </div>
            <p className="text-lg font-bold">কোনো তথ্য পাওয়া যায়নি</p>
            <p className="text-sm mt-1">আপনি এখনো কোনো আবেদন করেননি অথবা আপনার সার্চের সাথে কোনো তথ্য মিলছে না।</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredApps.map((app, index) => {
                const status = getStatusInfo(app.status);
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 transition-all hover:shadow-md group flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 group-hover:bg-emerald-100 transition-colors">
                        <User size={24} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-lg">{app.applicantName}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${status.color}`}>
                            {status.icon}
                            {status.text}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1.5 font-mono uppercase bg-slate-100 px-2 py-0.5 rounded">
                            #{app.id.substring(0, 10)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            {new Date(app.createdAt).toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                          {app.formData?.mobileNumber && (
                            <span className="flex items-center gap-1.5">
                              <Phone size={14} className="text-slate-400" />
                              {app.formData.mobileNumber}
                            </span>
                          )}
                           {app.formData?.villageName && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} className="text-slate-400" />
                              {app.formData.villageName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:justify-end shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
                      <button className="flex-1 md:flex-none h-10 px-6 rounded-lg bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                        বিস্তারিত দেখুন
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
