import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { User, Phone, MapPin, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

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
      console.error(err);
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
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-50 bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner group-hover:border-emerald-200 transition-all">
                  {formData.photoURL ? (
                    <img 
                      src={formData.photoURL} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setFormData(prev => ({ ...prev, photoURL: '' }))}
                    />
                  ) : (
                    <User size={64} />
                  )}
                </div>
                <div className="absolute -bottom-2 translate-y-1/2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                  প্রিভিউ
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                <User size={14} className="text-emerald-600" />
                প্রোফাইল ছবির লিংক (URL)
              </label>
              <input
                type="url"
                name="photoURL"
                value={formData.photoURL}
                onChange={handleChange}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm text-slate-600"
                placeholder="https://example.com/photo.jpg"
              />
              <p className="text-[10px] text-slate-400 px-1">গুগল বা অন্য কোনো অনলাইন ছবির লিংক এখানে দিন</p>
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
