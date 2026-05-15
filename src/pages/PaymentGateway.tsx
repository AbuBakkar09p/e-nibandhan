import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { toBengaliNumber } from '../lib/utils';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { ShieldCheck, ArrowLeft, CheckCircle2, Loader2, CreditCard, Building2, Smartphone } from 'lucide-react';

const PaymentGateway = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const amount = searchParams.get('amount') || '0';
  const [step, setStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const paymentMethods = [
    { id: 'bkash', name: 'বিকাশ', logo: 'https://www.logo.wine/a/logo/BKash/BKash-bKash-Logo.wine.svg', color: 'bg-pink-600' },
    { id: 'nagad', name: 'নগদ', logo: 'https://brandlogovector.com/wp-content/uploads/2021/11/Nagad-Logo-Vector.png', color: 'bg-orange-600' },
    { id: 'rocket', name: 'রকেট', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/82/Dutch-Bangla_Bank_Logo.svg/1200px-Dutch-Bangla_Bank_Logo.svg.png', color: 'bg-purple-700' }
  ];

  const handlePayment = async () => {
    if (!user || !amount || parseFloat(amount) <= 0) return;
    
    setStep('processing');
    
    // Simulate payment processing delay
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(parseFloat(amount))
        });
        setStep('success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        alert('পেমেন্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
        setStep('selection');
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold text-sm"
        >
          <ArrowLeft size={18} /> ফিরে যান
        </button>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black mb-2 tracking-tight">নিরাপদ পেমেন্ট গেটওয়ে</h1>
                <p className="text-slate-400 font-medium">আপনার পেমেন্ট সম্পন্ন করতে নিচের যেকোনো একটি মাধ্যম বেছে নিন।</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-widest block mb-1">মোট পরিমাণ</span>
                <span className="text-3xl font-black">৳ {toBengaliNumber(amount)}</span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 'selection' && (
                <motion.div
                  key="selection"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`relative p-6 rounded-2xl flex flex-col items-center gap-4 transition-all border-2 ${
                          selectedMethod === method.id 
                            ? 'border-blue-500 bg-blue-50/50' 
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shadow-sm flex items-center justify-center p-2">
                          <img src={method.logo} alt={method.name} className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-slate-800">{method.name}</span>
                        {selectedMethod === method.id && (
                          <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ShieldCheck size={14} />
                      </div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-800 mb-1">নিরাপদ লেনদেন</p>
                        <p className="text-slate-500">আপনার লেনদেনটি এনক্রিপশন প্রযুক্তির মাধ্যমে সুরক্ষিত। আমরা কোনো কার্ড তথ্য সংরক্ষণ করি না।</p>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!selectedMethod}
                    onClick={handlePayment}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:scale-100 active:scale-95"
                  >
                    পেমেন্ট করুন
                  </button>
                </motion.div>
              )}

              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 flex flex-col items-center text-center space-y-6"
                >
                  <div className="relative">
                    <Loader2 size={80} className="text-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Smartphone size={32} className="text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900">পেমেন্ট প্রসেসিং হচ্ছে...</h2>
                    <p className="text-slate-500 font-medium">দয়া করে ব্যাক বাটনে চাপ দেবেন না অথবা পেজটি রিফ্রেশ করবেন না।</p>
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 flex flex-col items-center text-center space-y-8"
                >
                  <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-50">
                    <CheckCircle2 size={56} />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">পেমেন্ট সফল হয়েছে!</h2>
                    <p className="text-lg text-slate-500 font-medium">৳ {toBengaliNumber(amount)} আপনার ব্যালেন্সে যোগ করা হয়েছে।</p>
                  </div>
                  
                  <div className="w-full max-w-sm bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold">ট্রানজেকশন আইডি:</span>
                      <span className="text-slate-800 font-black font-mono">PAY-{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-bold">পেমেন্ট মেথড:</span>
                      <span className="text-slate-800 font-black">{paymentMethods.find(m => m.id === selectedMethod)?.name}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                  >
                    ড্যাশবোর্ডে ফিরে যান
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
