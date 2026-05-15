import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { UserPlus, Mail, Lock, User, Phone, MapPin, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import Logo from '../components/ui/Logo';

import { handleFirestoreError } from '../lib/error-handler';
import { Application, OperationType } from '../types';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('পাসওয়ার্ড মিলছে না।');
    }
    
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      try {
        await setDoc(doc(db, 'users', user.uid), {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          photoURL: '',
          role: 'user',
          createdAt: Date.now(),
          balance: 0
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        throw err;
      }

      // Force a small delay to ensure Firestore write propagates before redirect
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে।');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('ইমেইল/পাসওয়ার্ড নিবন্ধনটি এই মূহুর্তে বন্ধ আছে। অনুগ্রহ করে নিচের "গুগল দিয়ে নিবন্ধন করুন" বাটনটি ব্যবহার করুন।');
      } else if (err.code === 'permission-denied') {
        setError('সার্ভার থেকে অনুমতি পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      } else {
        setError('নিবন্ধন করা সম্ভব হয়নি। অনুগ্রহ করে আপনার তথ্য চেক করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user profile exists, if not create a default one
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            fullName: user.displayName || 'নামহীন ইউজার',
            phoneNumber: user.phoneNumber || '',
            address: '',
            photoURL: user.photoURL || '',
            role: 'user',
            createdAt: Date.now(),
            balance: 0
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          throw err;
        }
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google register error:', err);
      setError('গুগল দিয়ে নিবন্ধন করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-10 border border-slate-100"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo className="w-20 h-20" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">অ্যাকাউন্ট তৈরি করুন</h1>
          <p className="text-slate-400 mt-2 font-medium">আপনার সঠিক তথ্য দিয়ে নিবন্ধন সম্পন্ন করুন</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-center gap-3 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">পূর্ণ নাম</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="fullName"
                type="text" 
                required
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="আপনার পূর্ণ নাম দিন"
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">ইমেইল ঠিকানা</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="email"
                type="email" 
                required
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="ইমেইল দিন"
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">মোবাইল নম্বর</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="phoneNumber"
                type="tel" 
                required
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="মোবাইল নম্বর দিন"
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">বর্তমান ঠিকানা</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="address"
                type="text" 
                required
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="বিস্তারিত ঠিকানা দিন"
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">পাসওয়ার্ড</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="password"
                type="password" 
                required
                autoComplete="new-password"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="পাসওয়ার্ড দিন"
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">পাসওয়ার্ড নিশ্চিত করুন</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="confirmPassword"
                type="password" 
                required
                autoComplete="new-password"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="পুনরায় পাসওয়ার্ড"
                onChange={handleChange}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-2 w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'নিবন্ধন সম্পন্ন করুন'
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="h-[1px] bg-slate-200 flex-1"></div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">অথবা</span>
          <div className="h-[1px] bg-slate-200 flex-1"></div>
        </div>

        <button 
          onClick={handleGoogleRegister}
          disabled={loading}
          className="mt-6 w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-md hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          গুগল দিয়ে নিবন্ধন করুন
        </button>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-slate-600">
            আগে থেকেই অ্যাকাউন্ট আছে?{' '}
            <Link to="/login" className="text-emerald-700 font-bold hover:underline">
              লগইন করুন
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
