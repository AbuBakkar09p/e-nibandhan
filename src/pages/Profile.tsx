import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { User, Phone, MapPin, Save, AlertCircle, CheckCircle, Camera, Upload } from 'lucide-react';
import { motion } from 'motion/react';

import { handleFirestoreError } from '../lib/error-handler';
import { OperationType } from '../types';

const Profile = () => {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    photoURL: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        address: profile.address || '',
        photoURL: profile.photoURL || ''
      });
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for Base64 in Firestore
      setError('ছবির সাইজ ১ মেগাবাইটের কম হতে হবে।');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        updatedAt: Date.now()
      });
      setSuccess('প্রোফাইল সফলভাবে আপডেট করা হয়েছে।');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      setError('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
      >
        <div className="bg-emerald-700 px-8 py-10 text-white relative">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold">আমার প্রোফাইল</h1>
            <p className="text-emerald-100 mt-2 opacity-90">আপনার ব্যক্তিগত তথ্য সংশোধন ও আপডেট করুন</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
        </div>

        <div className="p-8 md:p-12">
          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-center gap-3 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 flex items-center gap-3 text-sm">
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white bg-slate-100 flex items-center justify-center text-slate-400 shadow-xl group-hover:border-emerald-100 transition-all relative">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">আপলোড হচ্ছে</span>
                    </div>
                  ) : formData.photoURL ? (
                    <img 
                      src={formData.photoURL} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={64} />
                  )}
                  
                  <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera size={24} className="text-white mb-1" />
                    <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">পরিবর্তন করুন</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                
                {formData.photoURL && (
                   <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, photoURL: '' }))}
                    className="absolute -top-1 -right-1 w-8 h-8 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-all"
                  >
                    <AlertCircle size={16} />
                  </button>
                )}
              </div>
              <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">প্রোফাইল ছবি পরিবর্তন করতে এখানে ক্লিক করুন</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                  <User size={14} className="text-emerald-600" />
                  পূর্ণ নাম
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 font-medium"
                  placeholder="আপনার পূর্ণ নাম দিন"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Phone size={14} className="text-emerald-600" />
                  মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 font-medium"
                  placeholder="আপনার সচল মোবাইল নম্বর দিন"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                <MapPin size={14} className="text-emerald-600" />
                বর্তমান ঠিকানা
              </label>
              <textarea
                name="address"
                required
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-900 font-medium resize-none"
                placeholder="আপনার পূর্ণ বর্তমান ঠিকানা দিন"
              />
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={20} />
                    তথ্যাদি সংরক্ষণ করুন
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
              <User size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">অ্যাকাউন্ট ইমেইল</p>
              <p className="text-sm font-bold text-slate-600">{user?.email}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest md:text-right">আইডি: {user?.uid}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
