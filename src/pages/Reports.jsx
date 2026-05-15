import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { FileText, Clock, CheckCircle, XCircle, Search, Calendar, User, Phone, MapPin, X, Trash2, Edit2 } from 'lucide-react';
import { toBengaliNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const Reports = () => {
  const { type } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Map URL type to ApplicationType
  const typeMap = {
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
  }, [user, appType]);

  if (!appType) {
    return <Navigate to="/dashboard" />;
  }

  const getStatusInfo = (status) => {
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

  const filteredApps = applications.filter(app => {
    const matchesSearch = app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'pending') {
      return matchesSearch && (app.status === 'pending' || app.status === 'processing');
    }
    if (statusFilter === 'success') {
      return matchesSearch && app.status === 'approved';
    }
    return matchesSearch;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই আবেদনটি মুছে ফেলতে চান?')) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'applications', id));
      setSelectedApp(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `applications/${id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (app) => {
    navigate(`/apply/${app.type}?editId=${app.id}`);
  };

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
      </div>
      
      {/* Search and Tabs Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === 'pending' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            অপেক্ষমান (Pending)
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === 'success' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            সফল (Success)
          </button>
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
                            #{toBengaliNumber(app.id.substring(0, 10))}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            {new Date(app.createdAt).toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                          {app.formData?.mobileNumber && (
                            <span className="flex items-center gap-1.5">
                              <Phone size={14} className="text-slate-400" />
                              {toBengaliNumber(app.formData.mobileNumber)}
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

                    <div className="flex items-center gap-2 md:justify-end shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
                      <button 
                        onClick={() => setSelectedApp(app)}
                        className="h-10 px-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2 border border-emerald-100"
                        title="বিস্তারিত দেখুন"
                      >
                        বিস্তারিত
                      </button>
                      <button 
                        onClick={() => handleEdit(app)}
                        className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center border border-blue-100 shadow-sm"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(app.id)}
                        disabled={isDeleting}
                        className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center border border-rose-100 shadow-sm"
                        title="মুছুন"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      {/* Detailed Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">আবেদনের বিস্তারিত</h3>
                    <p className="text-[10px] font-mono text-slate-400">ID: {selectedApp.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                {selectedApp.type === 'new' ? (
                  // Specific fields for New Birth Registration
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-1 md:col-span-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আবেদনকারীর নাম বাংলা</p>
                      <p className="font-bold text-slate-800">{selectedApp.formData?.applicantNameBn || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 md:col-span-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আবেদনকারীর নাম ইংরেজি</p>
                      <p className="font-bold text-slate-800 uppercase">{selectedApp.formData?.applicantNameEn || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">জন্ম তারিখ</p>
                      <p className="font-bold text-slate-800">{toBengaliNumber(selectedApp.formData?.dob || 'N/A')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">লিঙ্গ</p>
                      <p className="font-bold text-slate-800">{selectedApp.formData?.gender === 'male' ? 'পুরুষ' : selectedApp.formData?.gender === 'female' ? 'নারী' : 'অন্যান্য'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">কততম সন্তান</p>
                      <p className="font-bold text-slate-800">{toBengaliNumber(selectedApp.formData?.numberOfChildren || '১')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">মোবাইল নং</p>
                      <p className="font-bold text-slate-800 font-mono">{toBengaliNumber(selectedApp.formData?.mobileNumber || 'N/A')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">পিতার নাম বাংলা</p>
                      <p className="font-bold text-slate-800">{selectedApp.formData?.fatherNameBn || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">পিতার নাম ইংরেজি</p>
                      <p className="font-bold text-slate-800 uppercase">{selectedApp.formData?.fatherNameEn || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">মাতার নাম বাংলা</p>
                      <p className="font-bold text-slate-800">{selectedApp.formData?.motherNameBn || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">মাতার নাম ইংরেজি</p>
                      <p className="font-bold text-slate-800 uppercase">{selectedApp.formData?.motherNameEn || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">গ্রাম/মহল্লা</p>
                      <p className="font-bold text-slate-800">{selectedApp.formData?.villageName || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ওয়ার্ড</p>
                      <p className="font-bold text-slate-800">{toBengaliNumber(selectedApp.formData?.wardNo || 'N/A')}</p>
                    </div>
                  </div>
                ) : (
                  // Default generic view for other application types
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আবেদনকারীর নাম</p>
                      <p className="font-bold text-slate-800">{selectedApp.applicantName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আবেদনের ধরন</p>
                      <p className="font-bold text-slate-800">{getPageTitle()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">মোবাইল নম্বর</p>
                      <p className="font-bold text-slate-800 font-mono">{toBengaliNumber(selectedApp.formData?.mobileNumber || 'N/A')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আবেদনের তারিখ</p>
                      <p className="font-bold text-slate-800">{new Date(selectedApp.createdAt).toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">বর্তমান অবস্থা</p>
                      <div className="pt-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusInfo(selectedApp.status).color}`}>
                          {getStatusInfo(selectedApp.status).icon}
                          {getStatusInfo(selectedApp.status).text}
                        </span>
                      </div>
                    </div>
                    {selectedApp.formData?.villageName && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">গ্রাম/মহল্লা</p>
                        <p className="font-bold text-slate-800">{selectedApp.formData.villageName}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Form Data for non-new or extra fields */}
                {selectedApp.type !== 'new' && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4 text-sm">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-emerald-500" />
                      অন্যান্য তথ্য
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedApp.formData || {}).map(([key, value]) => {
                        if (['mobileNumber', 'villageName', 'applicantNameBn', 'applicantNameEn'].includes(key)) return null;
                        if (!value || typeof value === 'object') return null;
                        
                        return (
                          <div key={key} className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{key}</p>
                            <p className="text-slate-700 font-medium">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center gap-3">
                <button 
                  onClick={() => handleEdit(selectedApp)}
                  className="w-full md:flex-1 h-11 px-6 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} /> সম্পাদনা করুন
                </button>
                <button 
                  onClick={() => handleDelete(selectedApp.id)}
                  disabled={isDeleting}
                  className="w-full md:flex-1 h-11 px-6 rounded-xl bg-white text-rose-600 border border-rose-200 shadow-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> {isDeleting ? 'মোছা হচ্ছে...' : 'মুছুন'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reports;
