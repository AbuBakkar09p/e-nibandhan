import React, { useState, useRef, useEffect } from 'react';
import { Fingerprint, Search, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toBengaliNumber } from '../lib/utils';

const VerifyCertificate = () => {
  const [certificateId, setCertificateId] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [mathProblem, setMathProblem] = useState({ a: 0, b: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<'success' | 'not_found' | 'captcha_error' | null>(null);

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    setMathProblem({ a, b });
    setUserAnswer('');
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
    if (value.length <= 17) {
      setCertificateId(value);
      if (value.length === 17 && dayRef.current) {
        dayRef.current.focus();
      }
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 2) {
      const num = parseInt(value);
      if (value === '' || (num >= 0 && num <= 31)) {
        setBirthDay(value);
        if (value.length === 2 && monthRef.current) {
          monthRef.current.focus();
        }
      }
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 2) {
      const num = parseInt(value);
      if (value === '' || (num >= 0 && num <= 12)) {
        setBirthMonth(value);
        if (value.length === 2 && yearRef.current) {
          yearRef.current.focus();
        }
      }
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 4) {
      setBirthYear(value);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certificateId || !birthDay || !birthMonth || !birthYear || !userAnswer) return;

    if (parseInt(userAnswer) !== mathProblem.a + mathProblem.b) {
      setResult('captcha_error');
      generateCaptcha();
      return;
    }

    setIsVerifying(true);
    setResult(null);

    // Short delay to show the "Redirecting" state to the user
    setTimeout(() => {
      setIsVerifying(false);
      // Redirect to official government portal
      window.open('https://everify.bdris.gov.bd/', '_blank');
      setResult('success');
    }, 2000);
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Fingerprint size={40} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">সনদ যাচাই করুন</h1>
        <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
          আপনার জন্ম বা মৃত্যু নিবন্ধন সনদের সত্যতা যাচাই করতে ১৭ ডিজিটের সনদ নম্বর ও জন্মতারিখ প্রদান করুন।
        </p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 md:p-12">
          <form onSubmit={handleVerify} className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Certificate ID - Takes 5/12 of space on large screens */}
              <div className="lg:col-span-6 relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <Search size={22} />
                </div>
                <input
                  ref={idRef}
                  type="text"
                  required
                  value={certificateId}
                  onChange={handleIdChange}
                  placeholder="১৭ ডিজিটের সনদ নম্বর"
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-bold placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Birth Date Section - Day, Month, Year in one row */}
              <div className="lg:col-span-6 grid grid-cols-3 gap-2">
                <div className="relative group">
                  <input
                    ref={dayRef}
                    type="text"
                    inputMode="numeric"
                    required
                    value={birthDay}
                    onChange={handleDayChange}
                    placeholder="দিন"
                    className="w-full h-full text-center py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>

                <div className="relative group">
                  <input
                    ref={monthRef}
                    type="text"
                    inputMode="numeric"
                    required
                    value={birthMonth}
                    onChange={handleMonthChange}
                    placeholder="মাস"
                    className="w-full h-full text-center py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>

                <div className="relative group">
                  <input
                    ref={yearRef}
                    type="text"
                    inputMode="numeric"
                    required
                    value={birthYear}
                    onChange={handleYearChange}
                    placeholder="বছর"
                    className="w-full h-full text-center py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Math Captcha Section */}
              <div className="lg:col-span-12">
                <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col gap-1 ring-1 ring-slate-200 bg-white px-4 py-2 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">নিরাপত্তা কোড</span>
                    <span className="text-xl font-black text-slate-800">
                      {toBengaliNumber(mathProblem.a)} + {toBengaliNumber(mathProblem.b)} = ?
                    </span>
                  </div>
                  <div className="flex-1 w-full relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="যোগফলটি এখানে লিখুন"
                      className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl text-lg font-bold placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !certificateId || !birthDay || !birthMonth || !birthYear || !userAnswer}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {isVerifying ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  যাচাই হচ্ছে...
                </>
              ) : (
                <>
                  <ShieldCheck size={24} />
                  যাচাই করুন
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 font-medium">
              * সঠিক ফল পেতে ১৭ ডিজিটের নম্বর ও সঠিক জন্মতারিখ দিন।
            </p>
          </form>

          <AnimatePresence>
            {result === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 p-8 bg-blue-50 rounded-[2rem] border border-blue-100 flex flex-col md:flex-row items-center gap-8"
              >
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                  <ShieldCheck size={40} />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-blue-900 mb-2">অফিসিয়াল পোর্টালে পাঠানো হয়েছে</h3>
                  <p className="text-blue-700/80 font-medium leading-relaxed">
                    আপনার সনদটি যাচাই করার জন্য আমরা আপনাকে সরকারি <span className="font-bold text-blue-900">everify.bdris.gov.bd</span> পোর্টালে রিডাইরেক্ট করেছি। নতুন ট্যাবে আপনার তথ্যগুলো পুনরায় দিয়ে 'Search' করুন।
                  </p>
                </div>
              </motion.div>
            )}

            {result === 'captcha_error' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 p-8 bg-amber-50 rounded-[2rem] border border-amber-100 flex flex-col md:flex-row items-center gap-8"
              >
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                  <AlertCircle size={40} />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-amber-900 mb-2">সুরক্ষা কোড ভুল হয়েছে</h3>
                  <p className="text-amber-700/80 font-medium leading-relaxed">
                    আপনার দেওয়া নিরাপত্তা কোডটির উত্তর সঠিক হয়নি। অনুগ্রহ করে নতুন কোডটি সমাধান করে পুনরায় চেষ্টা করুন।
                  </p>
                </div>
              </motion.div>
            )}

            {result === 'not_found' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 p-8 bg-rose-50 rounded-[2rem] border border-rose-100 flex flex-col md:flex-row items-center gap-8"
              >
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                  <AlertCircle size={40} />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-rose-900 mb-2">কোনো তথ্য পাওয়া যায়নি</h3>
                  <p className="text-rose-700/80 font-medium leading-relaxed">
                    দুঃখিত, ওই নিবন্ধন নম্বর ও জন্মতারিখের বিপরীতে কোনো ডাটা পাওয়া যায়নি। অনুগ্রহ করে তথ্যগুলো পুনরায় চেক করুন।
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
