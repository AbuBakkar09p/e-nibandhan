import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { MapPin, Save, RefreshCw, AlertCircle, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

interface Village {
  id: string;
  wardNo: string;
  villageNameBn: string;
  villageNameEn: string;
  postOfficeBn: string;
  postOfficeEn: string;
  createdAt: number;
}

const VillageManagement = () => {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    wardNo: '1',
    villageNameBn: '',
    villageNameEn: '',
    postOfficeBn: '',
    postOfficeEn: ''
  });

  const wards = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  useEffect(() => {
    fetchVillages();
  }, []);

  const fetchVillages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'villages'), orderBy('wardNo'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data: Village[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Village);
      });
      setVillages(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'villages');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVillage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const villageId = `vill_${Date.now()}`;
      const newVillage = {
        ...formData,
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'villages', villageId), newVillage);
      setVillages(prev => [{ id: villageId, ...newVillage }, ...prev]);
      setIsModalOpen(false);
      setFormData({
        wardNo: '1',
        villageNameBn: '',
        villageNameEn: '',
        postOfficeBn: '',
        postOfficeEn: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'villages');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteDoc(doc(db, 'villages', id));
      setVillages(prev => prev.filter(v => v.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError('গ্রামটি মুছে ফেলা সম্ভব হয়নি। দয়া করে আবার চেষ্টা করুন।');
      // Still call handleFirestoreError for internal reporting
      try {
        handleFirestoreError(err, OperationType.DELETE, `villages/${id}`);
      } catch (e) {
        // Silent catch for the re-throw
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw size={48} className="text-emerald-500 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-50 border border-emerald-50">
            <MapPin size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">গ্রাম ব্যবস্থাপনা</h1>
            <p className="text-slate-500 text-sm font-medium">নিবন্ধন ফরমের জন্য ওয়ার্ড ভিত্তিক গ্রাম সেট করুন</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
        >
          <Plus size={20} />
          নতুন গ্রাম যোগ করুন
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-bold">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wards.map(ward => {
          const wardVillages = villages.filter(v => v.wardNo === ward);
          return (
            <div key={ward} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-widest">ওয়ার্ড - {ward}</span>
                <span className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded-full font-bold text-slate-400">
                  {wardVillages.length} টি গ্রাম
                </span>
              </div>
              <div className="p-4 space-y-3 min-h-[100px]">
                {wardVillages.length > 0 ? (
                  wardVillages.map(village => (
                    <div key={village.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 group relative">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{village.villageNameBn}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{village.villageNameEn}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {deleteConfirmId === village.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(village.id)}
                                disabled={deletingId === village.id}
                                className="text-[10px] px-2 py-0.5 bg-rose-500 text-white rounded font-bold hover:bg-rose-600 transition-colors flex items-center gap-1"
                              >
                                {deletingId === village.id ? <RefreshCw size={10} className="animate-spin" /> : 'হ্যাঁ'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded font-bold hover:bg-slate-300 transition-colors"
                              >
                                না
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(village.id)}
                              className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 mt-2">
                        <p className="text-[10px] font-bold text-slate-500">ডাকঘর: <span className="text-slate-700">{village.postOfficeBn}</span></p>
                        <p className="text-[9px] text-slate-400 font-medium">{village.postOfficeEn}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-6 text-slate-300">
                    <AlertCircle size={24} className="mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-300">কোনো গ্রাম নেই</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-[70] overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">নতুন গ্রাম যোগ করুন</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddVillage} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">ওয়ার্ড নম্বর</label>
                  <select
                    value={formData.wardNo}
                    onChange={(e) => setFormData({ ...formData, wardNo: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                  >
                    {wards.map(w => (
                      <option key={w} value={w}>{w} নং ওয়ার্ড</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">গ্রামের নাম (বাংলা)</label>
                    <input
                      required
                      value={formData.villageNameBn}
                      onChange={(e) => setFormData({ ...formData, villageNameBn: e.target.value })}
                      placeholder="রামপুর"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Village Name (EN)</label>
                    <input
                      required
                      value={formData.villageNameEn}
                      onChange={(e) => setFormData({ ...formData, villageNameEn: e.target.value })}
                      placeholder="Rampur"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">ডাকঘরের নাম (বাংলা)</label>
                    <input
                      required
                      value={formData.postOfficeBn}
                      onChange={(e) => setFormData({ ...formData, postOfficeBn: e.target.value })}
                      placeholder="রামপুর বাজার"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Post Office (EN)</label>
                    <input
                      required
                      value={formData.postOfficeEn}
                      onChange={(e) => setFormData({ ...formData, postOfficeEn: e.target.value })}
                      placeholder="Rampur Bazar"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {saving ? <RefreshCw size={24} className="animate-spin" /> : <>সেভ করুন</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VillageManagement;
