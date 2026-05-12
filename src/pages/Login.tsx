import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import Logo from '../components/ui/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('ইমেইল/পাসওয়ার্ড মেথডটি ফায়ারবেস কনসোলে চালু করা নেই। অনুগ্রহ করে এটি চালু করুন বা গুগল লগইন ব্যবহার করুন।');
      } else {
        setError('ইমেইল বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
        await setDoc(doc(db, 'users', user.uid), {
          fullName: user.displayName || 'নামহীন ইউজার',
          phoneNumber: user.phoneNumber || '',
          address: '',
          photoURL: user.photoURL || '',
          role: 'user',
          createdAt: Date.now()
        });
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('গুগল লগইন করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-slate-100"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Logo className="w-20 h-20" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">লগইন করুন</h1>
          <p className="text-slate-400 mt-2 font-medium">আপনার ডিজিটাল অ্যাকাউন্ট দিয়ে সাইন ইন করুন</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-center gap-3 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">ইমেইল ঠিকানা</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900"
                placeholder="আপনার ইমেইল দিন"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">পাসওয়ার্ড</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900"
                placeholder="আপনার পাসওয়ার্ড দিন"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'লগইন করুন'
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-[1px] bg-slate-200 flex-1"></div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">অথবা</span>
          <div className="h-[1px] bg-slate-200 flex-1"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-6 w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-md hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          গুগল দিয়ে লগইন করুন
        </button>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-slate-600 font-medium">
            নতুন ইউজার?{' '}
            <Link to="/register" className="text-emerald-700 font-bold hover:underline ml-1">
              নিবন্ধন করুন
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

