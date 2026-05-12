import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, setDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ApplicationType, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { 
  Baby, FileEdit, Ghost, Send, ChevronLeft, 
  User, Calendar, MapPin, Search, AlertCircle, CheckCircle2,
  Users, RefreshCw, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Village {
  id: string;
  wardNo: string;
  villageNameBn: string;
  villageNameEn: string;
  postOfficeBn: string;
  postOfficeEn: string;
}

const ApplicationForm = () => {
  const { type } = useParams<{ type: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [villageList, setVillageList] = useState<Village[]>([]);
  const [filteredVillages, setFilteredVillages] = useState<Village[]>([]);
  
  // Correction and Death search state
  const [isCorrectionSearched, setIsCorrectionSearched] = useState(false);
  const [isDeathSearched, setIsDeathSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchData, setSearchData] = useState({ brn: '', dob: '', day: '', month: '', year: '' });
  const [correctionSearchError, setCorrectionSearchError] = useState(false);
  
  const brnInputRef = useRef<HTMLInputElement>(null);
  const dayInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);

  const [formStep, setFormStep] = useState<'form' | 'upload' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; type: string; typeLabel: string; fileName: string }[]>([]);
  const [currentUpload, setCurrentUpload] = useState({ type: '', fileName: '', file: null as File | null });
  const [formData, setFormData] = useState({
    applicantNameBn: '',
    applicantNameEn: '',
    dob: '',
    gender: '',
    numberOfChildren: '1',
    wardNo: '',
    villageName: '',
    fatherCertificateNo: '',
    fatherDob: '',
    fatherNameBn: '',
    fatherNameEn: '',
    motherCertificateNo: '',
    motherDob: '',
    motherNameBn: '',
    motherNameEn: '',
    mobileNumber: '',
    nidNumber: '',
    relationship: '', // New field for relationship
    applicantBrn: '', // New field
    applicantDob: '', // New field
    verifiedApplicantName: '', // New field
    reason: '', // for correction
    dateOfDeath: '', // for death
    deathCause: '', // for death
    spouseBrn: '', // for death
    spouseNid: '', // for death
    spouseNameBn: '', // for death
    spouseNameEn: '', // for death
    placeOfDeathWard: '', // for death
    placeOfDeathVillage: '', // for death
  });

  const [verification, setVerification] = useState({
    father: 'idle' as 'idle' | 'verifying' | 'verified' | 'error',
    mother: 'idle' as 'idle' | 'verifying' | 'verified' | 'error',
    applicant: 'idle' as 'idle' | 'verifying' | 'verified' | 'error',
    fatherData: { bn: '', en: '', status: '' },
    motherData: { bn: '', en: '', status: '' },
    applicantData: { bn: '', en: '', status: '' }
  });

  useEffect(() => {
    const filtered = villageList.filter(v => v.wardNo === formData.wardNo);
    setFilteredVillages(filtered);
  }, [formData.wardNo, villageList]);

  useEffect(() => {
    const vRef = formData.fatherCertificateNo.trim().replace(/\s/g, '');
    const vDob = formData.fatherDob.trim();
    
    if (vRef.length === 17 && vDob.length >= 8) {
      if (verification.father === 'idle' || verification.father === 'error') {
        autoVerify('father');
      }
    } else if (vRef.length > 0 || vDob.length > 0) {
      if (verification.father !== 'verifying' && verification.father !== 'idle') {
        setVerification(prev => ({ ...prev, father: 'idle', fatherData: { bn: '', en: '', status: '' } }));
      }
    }
  }, [formData.fatherCertificateNo, formData.fatherDob]);

  useEffect(() => {
    const vRef = formData.motherCertificateNo.trim().replace(/\s/g, '');
    const vDob = formData.motherDob.trim();
    
    if (vRef.length === 17 && vDob.length >= 8) {
      if (verification.mother === 'idle' || verification.mother === 'error') {
        autoVerify('mother');
      }
    } else if (vRef.length > 0 || vDob.length > 0) {
      if (verification.mother !== 'verifying' && verification.mother !== 'idle') {
        setVerification(prev => ({ ...prev, mother: 'idle', motherData: { bn: '', en: '', status: '' } }));
      }
    }
  }, [formData.motherCertificateNo, formData.motherDob]);

  useEffect(() => {
    const vRef = formData.applicantBrn.trim().replace(/\s/g, '');
    const vDob = formData.applicantDob.trim();
    
    if (vRef.length === 17 && vDob.length >= 8) {
      if (verification.applicant === 'idle' || verification.applicant === 'error') {
        autoVerify('applicant' as any);
      }
    } else if (vRef.length > 0 || vDob.length > 0) {
      if (verification.applicant !== 'verifying' && verification.applicant !== 'idle') {
        setVerification(prev => ({ ...prev, applicant: 'idle', applicantData: { bn: '', en: '', status: '' } }));
      }
    }
  }, [formData.applicantBrn, formData.applicantDob]);

  const autoVerify = async (parent: 'father' | 'mother' | 'applicant') => {
    const certNo = parent === 'father'
      ? formData.fatherCertificateNo
      : parent === 'mother'
        ? formData.motherCertificateNo
        : formData.applicantBrn;

    const dob = parent === 'father'
      ? formData.fatherDob
      : parent === 'mother'
        ? formData.motherDob
        : formData.applicantDob;

    const cleanCert = certNo.replace(/\s/g, '');

    if (cleanCert.length !== 17) {
      setVerification(prev => ({
        ...prev,
        [parent]: 'error'
      }));
      return;
    }

    const dobRegex = /^\d[0-9-]{7,9}$/;

    if (!dobRegex.test(dob)) {
      setVerification(prev => ({
        ...prev,
        [parent]: 'error'
      }));
      return;
    }

    setVerification(prev => ({
      ...prev,
      [parent]: 'verifying'
    }));

    try {
      const response = await fetch('/verify-parent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brn: cleanCert,
          dob: dob
        })
      });

      const result = await response.json();

      if (!result.success || !result.verified) {
        setVerification(prev => ({
          ...prev,
          [parent]: 'error'
        }));
        return;
      }

      setVerification(prev => ({
        ...prev,
        [parent]: 'verified',
        [`${parent}Data`]: {
          bn: result.data.name_bn,
          en: result.data.name_en,
          status: 'সক্রিয় (Active)'
        }
      }));

      if (parent === 'applicant') {
        setFormData(prev => ({ ...prev, verifiedApplicantName: result.data.name_bn }));
      }

    } catch (error) {
      console.error(error);
      setVerification(prev => ({
        ...prev,
        [parent]: 'error'
      }));
    }
  };

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'villages'));
        const list: Village[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Village);
        });
        setVillageList(list);
      } catch (error) {
        console.error('Error fetching villages:', error);
      }
    };
    fetchVillages();
  }, []);

  const getFormInfo = () => {
    switch (type) {
      case 'new': return { 
        title: 'নতুন জন্ম নিবন্ধন আবেদন', 
        icon: <Baby className="text-white" size={24} />,
        bg: 'bg-emerald-500'
      };
      case 'correction': return { 
        title: 'তথ্য সংশোধন আবেদন', 
        icon: <FileEdit className="text-white" size={24} />,
        bg: 'bg-orange-500'
      };
      case 'death': return { 
        title: 'মৃত্যু নিবন্ধন আবেদন', 
        icon: <Ghost className="text-white" size={24} />,
        bg: 'bg-rose-500'
      };
      default: return { 
        title: 'আবেদন ফর্ম', 
        icon: <Baby className="text-white" size={24} />,
        bg: 'bg-blue-500'
      };
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, isSearch: boolean = false) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (value.length > 2 && value.length <= 4) {
      value = `${value.slice(0, 2)}-${value.slice(2)}`;
    } else if (value.length > 4) {
      value = `${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4)}`;
    }
    
    if (isSearch) {
      setSearchData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCorrectionSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct DOB from separate fields
    const constructedDob = `${searchData.day.padStart(2, '0')}-${searchData.month.padStart(2, '0')}-${searchData.year}`;
    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    
    if (searchData.brn.length !== 17 || !dobRegex.test(constructedDob)) {
      setCorrectionSearchError(true);
      return;
    }

    setSearchLoading(true);
    setCorrectionSearchError(false);

    try {
      // Construction DOB from separate fields for the mock lookup
      const constructedDob = `${searchData.day.padStart(2, '0')}-${searchData.month.padStart(2, '0')}-${searchData.year}`;
      
      // Simulate API call delay
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          applicantNameBn: 'আব্দুল করিম',
          applicantNameEn: 'ABDUL KARIM',
          dob: constructedDob,
          gender: '',
          fatherNameBn: 'মৃত রহমত উল্লাহ',
          fatherNameEn: 'LATE ROHMOT ULLAH',
          motherNameBn: 'মোছাম্মৎ মরিয়ম বেগম',
          motherNameEn: 'MS MORIOM BEGUM',
          numberOfChildren: '৩',
          mobileNumber: '01700000000',
          wardNo: '৩'
        }));
        setIsCorrectionSearched(true);
        setSearchLoading(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      setCorrectionSearchError(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDeathSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct DOB from separate fields
    const constructedDob = `${searchData.day.padStart(2, '0')}-${searchData.month.padStart(2, '0')}-${searchData.year}`;
    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    
    if (searchData.brn.length !== 17 || !dobRegex.test(constructedDob)) {
      setCorrectionSearchError(true);
      return;
    }

    setSearchLoading(true);
    setCorrectionSearchError(false);

    try {
      // Construction DOB from separate fields for the mock lookup
      const constructedDob = `${searchData.day.padStart(2, '0')}-${searchData.month.padStart(2, '0')}-${searchData.year}`;
      
      // Simulate API call delay
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          applicantNameBn: 'মৃত মোশাররফ হোসেন',
          applicantNameEn: 'LATE MOSHARRAF HOSSAIN',
          dob: '১২-০৫-১৯৫০',
          gender: 'male',
          dateOfDeath: constructedDob,
          fatherNameBn: 'মৃত সামসুল হক',
          fatherNameEn: 'LATE SAMSUL HAQUE',
          motherNameBn: 'মৃত খুদিজা বিবি',
          motherNameEn: 'LATE KHUDIJA BIBI',
          numberOfChildren: '৪',
          mobileNumber: '01711111111',
          wardNo: '৫'
        }));
        setIsDeathSearched(true);
        setSearchLoading(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      setCorrectionSearchError(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if ((type === 'correction' || type === 'new' || type === 'death') && formStep === 'form') {
      if (type === 'death' && (!formData.relationship || verification.applicant !== 'verified')) {
        alert('আবেদনকারীর তথ্য সঠিকভাবে যাচাই করুন');
        return;
      }
      setFormStep('upload');
      window.scrollTo(0, 0);
      return;
    }

    if ((type === 'correction' || type === 'new' || type === 'death') && formStep === 'upload') {
      if (attachments.length === 0) {
        alert('কমপক্ষে একটি ফাইল আপলোড করুন');
        return;
      }
      setFormStep('otp');
      window.scrollTo(0, 0);
      return;
    }

    if ((type === 'correction' || type === 'new' || type === 'death') && formStep === 'otp' && otpCode.length !== 6) {
      alert('সঠিক ওটিপি প্রদান করুন');
      return;
    }
    
    setLoading(true);
    try {
      const appRef = collection(db, 'applications');
      const now = Date.now();
      
      await addDoc(appRef, {
        userId: user.uid,
        type: type as ApplicationType,
        status: 'pending',
        applicantName: type === 'death' ? formData.verifiedApplicantName : formData.applicantNameBn,
        formData: formData,
        attachments: (type === 'correction' || type === 'new' || type === 'death') ? attachments : [],
        createdAt: now,
        updatedAt: now,
      });
      
      setSubmitted(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'applications');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'wardNo') {
      const filtered = villageList.filter(v => v.wardNo === value);
      const firstVillage = filtered.length > 0 ? filtered[0].villageNameBn : '';
      
      setFormData(prev => ({
        ...prev,
        wardNo: value,
        villageName: firstVillage
      }));
    } else if (name === 'placeOfDeathWard') {
      const filtered = villageList.filter(v => v.wardNo === value);
      const firstVillage = filtered.length > 0 ? filtered[0].villageNameBn : '';
      
      setFormData(prev => ({
        ...prev,
        placeOfDeathWard: value,
        placeOfDeathVillage: firstVillage
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCurrentUpload(prev => ({ ...prev, fileName: file.name, file: file }));
    }
  };

  const addAttachment = () => {
    if (!currentUpload.type || !currentUpload.file) return;
    
    const typeLabel = attachmentOptions.find(opt => opt.value === currentUpload.type)?.label || '';
    
    const newAttachment = {
      id: Math.random().toString(36).substring(2, 9),
      type: currentUpload.type,
      typeLabel: typeLabel,
      fileName: currentUpload.fileName
    };
    
    setAttachments(prev => [...prev, newAttachment]);
    setCurrentUpload({ type: '', fileName: '', file: null });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const attachmentOptions = [
    { value: 'medical', label: 'চিকিৎসকের প্রত্যয়নপত্র / ইপিআই কার্ড' },
    { value: 'school', label: 'পিএসসি/জেএসসি/এসএসসি সনদ' },
    { value: 'nid_parent', label: 'পিতা/মাতার এনআইডি' },
    { value: 'land', label: 'খাজনা আদায়ের রসিদ / ট্যাক্স এর কপি' },
    { value: 'utility', label: 'বিদ্যুৎ/গ্যাস/পানির বিল' },
    { value: 'guardian_declaration', label: 'অভিভাবকের অঙ্গীকারনামা' },
    { value: 'others', label: 'অন্যান্য' }
  ];

  const formInfo = getFormInfo();

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-emerald-100">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">আবেদন সফল হয়েছে!</h2>
          <p className="text-slate-500 mb-10 text-sm leading-relaxed">আপনার আবেদনটি কর্তৃপক্ষের পর্যালোচনার জন্য জমা দেওয়া হয়েছে। ড্যাশবোর্ড থেকে আপনি আবেদনের স্থিতি পরীক্ষা করতে পারবেন।</p>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: "100%" }}
               transition={{ duration: 3 }}
               className="bg-emerald-500 h-full"
            />
          </div>
          <p className="text-[10px] uppercase font-bold text-slate-400 mt-4 tracking-widest">আপনাকে ড্যাশবোর্ড-এ ফিরে নিয়ে যাওয়া হচ্ছে</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between px-2">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-all font-bold text-[11px] uppercase tracking-widest group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          ফিরে যান
        </button>
      </div>

      {/* Correction Search Step */}
      {type === 'correction' && !isCorrectionSearched && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto mb-10"
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6 px-2 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Search size={20} />
              </div>
              জন্ম নিবন্ধন তথ্য খুঁজুন
            </h2>
            <hr className="border-gray-100 mb-8" />
            <form onSubmit={handleCorrectionSearch} className="space-y-6 px-2">
              <div>
                <label htmlFor="birthCertNo" className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">জন্ম সনদ নং</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
                    <FileEdit size={18} />
                  </div>
                  <input 
                    ref={brnInputRef}
                    id="birthCertNo" 
                    placeholder="১৭ ডিজিট জন্ম নিবন্ধন নম্বর" 
                    className="h-12 w-full rounded-xl border border-slate-200 pl-12 pr-5 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all bg-white" 
                    type="text" 
                    maxLength={17}
                    value={searchData.brn}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 17);
                      setSearchData({ ...searchData, brn: val });
                      if (val.length === 17) {
                        dayInputRef.current?.focus();
                      }
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">জন্ম তারিখ</label>
                <div className="flex gap-3 items-center">
                  <input 
                    ref={dayInputRef}
                    className="h-12 w-20 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all bg-white" 
                    placeholder="দিন" 
                    inputMode="numeric" 
                    maxLength={2}
                    value={searchData.day}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setSearchData({ ...searchData, day: val });
                      if (val.length === 2) {
                        monthInputRef.current?.focus();
                      }
                    }}
                    required
                  />
                  <span className="text-slate-300 font-bold text-xl">/</span>
                  <input 
                    ref={monthInputRef}
                    className="h-12 w-20 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all bg-white" 
                    placeholder="মাস" 
                    inputMode="numeric" 
                    maxLength={2}
                    value={searchData.month}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setSearchData({ ...searchData, month: val });
                      if (val.length === 2) {
                        yearInputRef.current?.focus();
                      }
                    }}
                    required
                  />
                  <span className="text-slate-300 font-bold text-xl">/</span>
                  <input 
                    ref={yearInputRef}
                    className="h-12 w-28 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all bg-white" 
                    placeholder="বছর" 
                    inputMode="numeric" 
                    maxLength={4}
                    value={searchData.year}
                    onChange={(e) => setSearchData({ ...searchData, year: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                </div>
              </div>

              {correctionSearchError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                    <AlertCircle size={16} />
                  </div>
                  তথ্য পাওয়া যায়নি। সঠিক জন্ম সনদ নম্বর ও জন্ম তারিখ দিন।
                </motion.div>
              )}

              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={searchLoading}
                  className="w-full h-14 bg-slate-900 group relative text-white rounded-2xl font-bold flex items-center justify-center gap-3 overflow-hidden shadow-2xl transition-all hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-400"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  {searchLoading ? (
                    <Loader2 className="animate-spin" size={22} />
                  ) : (
                    <>
                      <Search size={20} className="group-hover:scale-110 transition-transform" />
                      <span className="text-base font-display">অনুসন্ধান করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* Death Search Step */}
      {type === 'death' && !isDeathSearched && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto mb-10"
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6 px-2 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Search size={20} />
              </div>
              পূর্বে নিবন্ধিত জন্ম তথ্য খুঁজুন
            </h2>
            <p className="text-xs text-slate-500 mb-6 px-2">মৃত্যু নিবন্ধনের জন্য ব্যক্তির পূর্বের জন্ম নিবন্ধিত তথ্য আবশ্যক।</p>
            <hr className="border-gray-100 mb-8" />
            <form onSubmit={handleDeathSearch} className="space-y-6 px-2">
              <div>
                <label htmlFor="birthCertNo" className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">জন্ম সনদ নং</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-rose-500 transition-colors">
                    <Ghost size={18} />
                  </div>
                  <input 
                    ref={brnInputRef}
                    id="birthCertNo" 
                    placeholder="১৭ ডিজিট জন্ম নিবন্ধন নম্বর" 
                    className="h-12 w-full rounded-xl border border-slate-200 pl-12 pr-5 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all bg-white" 
                    type="text" 
                    maxLength={17}
                    value={searchData.brn}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 17);
                      setSearchData({ ...searchData, brn: val });
                      if (val.length === 17) {
                        dayInputRef.current?.focus();
                      }
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">জন্ম তারিখ</label>
                <div className="flex gap-3 items-center">
                  <input 
                    ref={dayInputRef}
                    className="h-12 w-20 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all bg-white" 
                    placeholder="দিন" 
                    inputMode="numeric" 
                    maxLength={2}
                    value={searchData.day}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setSearchData({ ...searchData, day: val });
                      if (val.length === 2) {
                        monthInputRef.current?.focus();
                      }
                    }}
                    required
                  />
                  <span className="text-slate-300 font-bold text-xl">/</span>
                  <input 
                    ref={monthInputRef}
                    className="h-12 w-20 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all bg-white" 
                    placeholder="মাস" 
                    inputMode="numeric" 
                    maxLength={2}
                    value={searchData.month}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setSearchData({ ...searchData, month: val });
                      if (val.length === 2) {
                        yearInputRef.current?.focus();
                      }
                    }}
                    required
                  />
                  <span className="text-slate-300 font-bold text-xl">/</span>
                  <input 
                    ref={yearInputRef}
                    className="h-12 w-28 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all bg-white" 
                    placeholder="বছর" 
                    inputMode="numeric" 
                    maxLength={4}
                    value={searchData.year}
                    onChange={(e) => setSearchData({ ...searchData, year: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                </div>
              </div>

              {correctionSearchError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                    <AlertCircle size={16} />
                  </div>
                  তথ্য পাওয়া যায়নি। সঠিক জন্ম সনদ নম্বর ও জন্ম তারিখ দিন।
                </motion.div>
              )}

              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={searchLoading}
                  className="w-full h-14 bg-slate-900 group relative text-white rounded-2xl font-bold flex items-center justify-center gap-3 overflow-hidden shadow-2xl transition-all hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-400"
                >
                  <div className="absolute inset-y-0 bg-gradient-to-r from-rose-500 to-rose-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  {searchLoading ? (
                    <Loader2 className="animate-spin" size={22} />
                  ) : (
                    <>
                      <Search size={20} className="group-hover:scale-110 transition-transform" />
                      <span className="text-base font-display">অনুসন্ধান করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* Main Form */}
      {(type === 'new' || (type === 'correction' && isCorrectionSearched) || (type === 'death' && isDeathSearched)) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="px-4 py-2 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {(type === 'correction' || type === 'new' || type === 'death') && formStep === 'upload' 
                  ? 'ফাইল আপলোড করুন' 
                  : (type === 'correction' || type === 'new' || type === 'death') && formStep === 'otp' 
                    ? 'মোবাইল নম্বর যাচাই (OTP)' 
                    : formInfo.title}
              </h2>
              {(type === 'correction' || type === 'new' || type === 'death') && (
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${formStep === 'form' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'}`}>১</div>
                <div className="w-6 h-0.5 bg-gray-200"></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${formStep === 'upload' ? 'bg-orange-500 text-white' : formStep === 'otp' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>২</div>
                <div className="w-6 h-0.5 bg-gray-200"></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${formStep === 'otp' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>৩</div>
              </div>
            )}
            </div>
            <hr className="mt-4 border-gray-200" />
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {(type === 'correction' || type === 'new' || type === 'death') && formStep === 'otp' ? (
              // OTP Verification Section
              <div className="py-10 space-y-8 max-w-md mx-auto text-center">
                <div className="bg-orange-50 w-20 h-20 rounded-3xl flex items-center justify-center text-orange-500 mx-auto border-2 border-orange-100 shadow-inner">
                  <CheckCircle size={36} />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gray-800 tracking-tight">মোবাইল নম্বর যাচাই করুন</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">আপনার মোবাইল নম্বর <span className="font-bold text-slate-800">{formData.mobileNumber}</span> এ একটি ৬ ডিজিটের ওটিপি কোড পাঠানো হয়েছে। কোডটি নিচে দিন।</p>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <input 
                      type="text" 
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-16 w-full rounded-2xl border-2 border-gray-200 text-center text-3xl font-bold tracking-[0.5em] focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-gray-800 bg-gray-50/50"
                      placeholder="000000"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <button 
                      type="button"
                      className="text-orange-600 text-xs font-bold hover:underline"
                    >
                      আবার কোড পাঠান (Resend Code)
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => setFormStep('upload')}
                      className="text-gray-400 text-[11px] font-bold hover:text-gray-600 flex items-center justify-center gap-1"
                    >
                      <ChevronLeft size={14} /> ফাইল আপলোডে ফিরে যান
                    </button>
                  </div>
                </div>
              </div>
            ) : (type === 'correction' || type === 'new' || type === 'death') && formStep === 'upload' ? (
              // Enhanced Dynamic File Upload Section
              <div className="py-6 space-y-10">
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-bold text-orange-800">প্রয়োজনীয় কাগজপত্র সংযুক্ত করুন</p>
                    <p className="text-[11px] text-orange-600 mt-1 leading-relaxed">আবেদনের স্বপক্ষে দালিলিক প্রমাণ আপলোড করা আবশ্যক। ফাইল অবশ্যই PDF, JPG অথবা PNG ফরম্যাটে হতে হবে এবং সর্বোচ্চ সাইজ ১ মেগাবাইট।</p>
                  </div>
                </div>

                {/* Upload Input Box */}
                <div className="max-w-xl mx-auto space-y-5 p-6 border-2 border-dashed border-orange-200 rounded-3xl bg-orange-50/20">
                  <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">ফাইলের ধরন নির্বাচন করুন</label>
                        <select 
                          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all"
                          value={currentUpload.type}
                          onChange={(e) => setCurrentUpload({ ...currentUpload, type: e.target.value })}
                        >
                          <option value="">নির্বাচন করুন</option>
                          {attachmentOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">ফাইল সিলেক্ট করুন</label>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept=".pdf,.jpg,.jpeg,.png"
                            id="file-upload-main"
                            className="hidden" 
                            onChange={handleFileChange}
                          />
                          <label 
                            htmlFor="file-upload-main"
                            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 flex items-center justify-between cursor-pointer group hover:bg-gray-50 transition-all pr-2"
                          >
                            <span className={`text-sm ${currentUpload.fileName ? 'text-gray-800 font-bold' : 'text-gray-400'}`}>
                              {currentUpload.fileName || 'ফাইল সিলেক্ট করুন'}
                            </span>
                            <div className="bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold group-hover:bg-orange-600 transition-colors uppercase tracking-wider">
                              Browse
                            </div>
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={addAttachment}
                        disabled={!currentUpload.type || !currentUpload.file}
                        className="w-full h-11 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:bg-gray-300 disabled:shadow-none"
                      >
                        <RefreshCw size={16} className={currentUpload.file ? "" : "opacity-50"} />
                        ফাইল যোগ করুন (Add File)
                      </button>
                  </div>
                </div>

                {/* Uploaded Files List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold text-gray-700">আপলোডকৃত ফাইলসমূহ ({attachments.length})</h3>
                    {attachments.length === 0 && <span className="text-[10px] text-rose-500 font-bold italic">* কমপক্ষে একটি ফাইল যোগ করা আবশ্যক</span>}
                  </div>
                  
                  <AnimatePresence mode="popLayout">
                    {attachments.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {attachments.map((file) => (
                          <motion.div 
                            key={file.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group hover:border-orange-200 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
                                <CheckCircle size={20} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter mb-0.5">{file.typeLabel}</p>
                                <p className="text-sm font-bold text-gray-800 tracking-tight">{file.fileName}</p>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeAttachment(file.id)}
                              className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
                            >
                              <XCircle size={18} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center border-2 border-dotted border-gray-100 rounded-3xl bg-gray-50/50">
                        <Users className="mx-auto text-gray-200 mb-2" size={32} />
                        <p className="text-xs text-gray-400 font-medium">কোনো ফাইল যোগ করা হয়নি</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => setFormStep('form')}
                    className="flex items-center gap-2 text-gray-500 font-bold text-xs hover:text-orange-600 transition-colors"
                  >
                    <ChevronLeft size={16} /> আগের ধাপে ফিরে যান
                  </button>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-gray-400 font-bold italic">ফাইল আপলোড করে পরবর্তী ধাপে যান</p>
                  </div>
                </div>
              </div>
            ) : type === 'correction' ? (
              // Correction Application Form Section - Directly showing person and parents info as requested
              <div className="space-y-10">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-3">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-800 tracking-tight">সংশোধিত তথ্যসমূহ দিন</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ব্যক্তির নাম (বাংলা) <span className="text-red-500">*</span></label>
                    <input name="applicantNameBn" required value={formData.applicantNameBn} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" type="text" placeholder="সঠিক নাম বাংলায় লিখুন" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ব্যক্তির নাম (ইংরেজি) <span className="text-red-500">*</span></label>
                    <input name="applicantNameEn" required value={formData.applicantNameEn} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20 uppercase" type="text" placeholder="CORRECT NAME IN ENGLISH" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">জন্ম তারিখ <span className="text-red-500">*</span></label>
                    <input name="dob" required value={formData.dob} onChange={(e) => handleDateChange(e, 'dob')} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" type="text" placeholder="DD-MM-YYYY" maxLength={10} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">লিঙ্গ (ঐচ্ছিক)</label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                      {['male', 'female', 'others'].map((g) => (
                        <button 
                          key={g} type="button" 
                          onClick={() => setFormData({ ...formData, gender: g })}
                          className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${
                            formData.gender === g ? 'bg-white text-orange-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {g === 'male' ? 'পুরুষ' : g === 'female' ? 'নারী' : 'অন্যান্য'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">পিতার নাম (বাংলা) <span className="text-red-500">*</span></label>
                    <input name="fatherNameBn" required value={formData.fatherNameBn} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" type="text" placeholder="পিতার সঠিক নাম বাংলায়" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">পিতার নাম (ইংরেজি) <span className="text-red-500">*</span></label>
                    <input name="fatherNameEn" required value={formData.fatherNameEn} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20 uppercase" type="text" placeholder="FATHER'S CORRECT NAME IN ENGLISH" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মাতার নাম (বাংলা) <span className="text-red-500">*</span></label>
                    <input name="motherNameBn" required value={formData.motherNameBn} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" type="text" placeholder="মাতার সঠিক নাম বাংলায়" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মাতার নাম (ইংরেজি) <span className="text-red-500">*</span></label>
                    <input name="motherNameEn" required value={formData.motherNameEn} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20 uppercase" type="text" placeholder="MOTHER'S CORRECT NAME IN ENGLISH" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">পিতা-মাতার কততম সন্তান <span className="text-red-500">*</span></label>
                    <input 
                      name="numberOfChildren" 
                      required 
                      min="1" 
                      max="20" 
                      value={formData.numberOfChildren} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= 20) {
                          setFormData({ ...formData, numberOfChildren: e.target.value });
                        } else if (e.target.value === '') {
                          setFormData({ ...formData, numberOfChildren: '' });
                        }
                      }} 
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" 
                      type="number" 
                      placeholder="১-২০" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মোবাইল নম্বর <span className="text-red-500">*</span></label>
                    <input name="mobileNumber" required value={formData.mobileNumber} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" type="text" placeholder="০১XXXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ওয়ার্ড নং <span className="text-red-500">*</span></label>
                    <select name="wardNo" required value={formData.wardNo} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20">
                      <option value="">ওয়ার্ড নির্বাচন করুন</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(w => <option key={w} value={w.toString()}>{w} নম্বর ওয়ার্ড</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">গ্রামের নাম <span className="text-red-500">*</span></label>
                    <select 
                      name="villageName" 
                      required 
                      value={formData.villageName} 
                      onChange={handleChange}
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20"
                    >
                      <option value="">গ্রাম নির্বাচন করুন</option>
                      {filteredVillages.map(v => (
                        <option key={v.villageNameBn} value={v.villageNameBn}>{v.villageNameBn}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : type === 'death' ? (
              // Death Application Form Section
              <div className="space-y-10">
                {/* 1. Death Details */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
                      <Ghost size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight font-display">মৃত্যু সংক্রান্ত তথ্য</h3>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">মৃত্যুর তারিখ <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Calendar size={16} />
                        </div>
                        <input 
                          name="dateOfDeath"
                          required
                          value={formData.dateOfDeath}
                          onChange={(e) => handleDateChange(e, 'dateOfDeath')}
                          placeholder="DD-MM-YYYY" 
                          className="h-11 w-full rounded-lg border appearance-none px-4 pl-10 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-rose-300 focus:ring-rose-500/20 font-bold" 
                          type="text" 
                          maxLength={10}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">মৃত্যুর কারণ <span className="text-rose-500">*</span></label>
                      <select 
                        name="deathCause"
                        required
                        value={formData.deathCause}
                        onChange={handleChange}
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-rose-300 focus:ring-rose-500/20"
                      >
                        <option value="">নির্বাচন করুন</option>
                        <option value="বার্ধক্যজনিত">বার্ধক্যজনিত (Old age)</option>
                        <option value="হার্ট অ্যাটাক">হার্ট অ্যাটাক (Heart attack)</option>
                        <option value="ব্রেইন স্ট্রোক">ব্রেইন স্ট্রোক (Brain stroke)</option>
                        <option value="ক্যান্সার">ক্যান্সার (Cancer)</option>
                        <option value="কিডনী রোগ">কিডনী রোগ (Kidney disease)</option>
                        <option value="যক্ষা">যক্ষা (Tuberculosis)</option>
                        <option value="হাঁপানি / শ্বাসকষ্ট">হাঁপানি / শ্বাসকষ্ট (Asthma)</option>
                        <option value="উচ্চ রক্তচাপ">উচ্চ রক্তচাপ (High blood pressure)</option>
                        <option value="ডায়াবেটিস">ডায়াবেটিস (Diabetes)</option>
                        <option value="লিভার সিরোসিস">লিভার সিরোসিস (Liver cirrhosis)</option>
                        <option value="সড়ক দুর্ঘটনা">সড়ক দুর্ঘটনা (Road accident)</option>
                        <option value="পানিতে ডুবে মৃত্যু">পানিতে ডুবে মৃত্যু (Drowning)</option>
                        <option value="বিদ্যুৎপৃষ্ট হয়ে মৃত্যু">বিদ্যুৎপৃষ্ট হয়ে মৃত্যু (Electrocution)</option>
                        <option value="বিষপান / আত্মহত্যা">বিষপান / আত্মহত্যা (Suicide/Poisoning)</option>
                        <option value="স্বাভাবিক মৃত্যু">স্বাভাবিক মৃত্যু (Normal death)</option>
                        <option value="কোভিড-১৯">কোভিড-১৯ (COVID-19)</option>
                        <option value="অন্যান্য">অন্যান্য (Other)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Spouse Info */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-sm">
                      <Users size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight font-display">স্বামী / স্ত্রীর তথ্য</h3>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">স্বামী/স্ত্রীর জন্ম নিবন্ধন নম্বর</label>
                      <input 
                        name="spouseBrn"
                        value={formData.spouseBrn}
                        onChange={handleChange}
                        placeholder="১৭ ডিজিট জন্ম নিবন্ধন নম্বর" 
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" 
                        type="text" 
                        maxLength={17}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">স্বামী/স্ত্রীর জাতীয় পরিচয়পত্র নম্বর</label>
                      <input 
                        name="spouseNid"
                        value={formData.spouseNid}
                        onChange={handleChange}
                        placeholder="ভোটার আইডি কার্ড নম্বর" 
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" 
                        type="text" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">স্বামী/স্ত্রীর নাম (বাংলায়) <span className="text-rose-500">*</span></label>
                      <input 
                        name="spouseNameBn"
                        required
                        value={formData.spouseNameBn}
                        onChange={handleChange}
                        placeholder="স্বামী বা স্ত্রীর নাম বাংলায়" 
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" 
                        type="text" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">স্বামী/স্ত্রীর নাম (ইংরেজিতে) <span className="text-rose-500">*</span></label>
                      <input 
                        name="spouseNameEn"
                        required
                        value={formData.spouseNameEn}
                        onChange={handleChange}
                        placeholder="SPOUSE NAME IN ENGLISH" 
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20 uppercase" 
                        type="text" 
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Place of Death */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                      <MapPin size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight font-display">মৃত্যুর স্থান</h3>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">ওয়ার্ড নির্বাচন করুন <span className="text-rose-500">*</span></label>
                      <select 
                        name="placeOfDeathWard"
                        required
                        value={formData.placeOfDeathWard}
                        onChange={handleChange}
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20"
                      >
                        <option value="">ওয়ার্ড নির্বাচন করুন</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
                          <option key={w} value={w.toString()}>{w} নম্বর ওয়ার্ড</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">গ্রাম নির্বাচন করুন <span className="text-rose-500">*</span></label>
                      <select 
                        name="placeOfDeathVillage"
                        required
                        disabled={!formData.placeOfDeathWard}
                        value={formData.placeOfDeathVillage}
                        onChange={handleChange}
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20 disabled:opacity-50"
                      >
                        <option value="">গ্রাম নির্বাচন করুন</option>
                        {villageList.filter(v => v.wardNo === formData.placeOfDeathWard).map(v => (
                          <option key={v.id} value={v.villageNameBn}>{v.villageNameBn}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Applicant Info */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
                      <User size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight font-display">আবেদনকারীর তথ্য</h3>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">আবেদনাধীন ব্যক্তির সহিত সম্পর্ক <span className="text-rose-500">*</span></label>
                      <select 
                        name="relationship"
                        required
                        value={formData.relationship}
                        onChange={handleChange}
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-indigo-300 focus:ring-indigo-500/20"
                      >
                        <option value="">সম্পর্ক নির্বাচন করুন</option>
                        <option value="father">পিতা</option>
                        <option value="mother">মাতা</option>
                        <option value="spouse">স্বামী/স্ত্রী</option>
                        <option value="son">পুত্র</option>
                        <option value="daughter">কন্যা</option>
                        <option value="other">অন্যান্য</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">মোবাইল নম্বর <span className="text-rose-500">*</span></label>
                      <input 
                        name="mobileNumber"
                        required
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder="০১XXXXXXXXX" 
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-indigo-300 focus:ring-indigo-500/20" 
                        type="text" 
                      />
                    </div>
                  </div>

                  {formData.relationship && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 font-bold">আবেদনকারীর জন্ম নিবন্ধন নম্বর <span className="text-rose-500">*</span></label>
                          <input 
                            name="applicantBrn"
                            required
                            value={formData.applicantBrn}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 17);
                              setFormData({ ...formData, applicantBrn: val });
                            }}
                            placeholder="১৭ ডিজিট জন্ম নিবন্ধন নম্বর" 
                            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-white text-gray-800 border-gray-300 focus:border-indigo-300 focus:ring-indigo-500/20" 
                            type="text" 
                            maxLength={17}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 font-bold">আবেদনকারীর জন্ম তারিখ <span className="text-rose-500">*</span></label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <Calendar size={16} />
                            </div>
                            <input 
                              name="applicantDob"
                              required
                              value={formData.applicantDob}
                              onChange={(e) => handleDateChange(e, 'applicantDob')}
                              placeholder="DD-MM-YYYY" 
                              className="h-11 w-full rounded-lg border appearance-none px-4 pl-10 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-white text-gray-800 border-gray-300 focus:border-indigo-300 focus:ring-indigo-500/20 font-bold" 
                              type="text" 
                              maxLength={10}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-white border border-indigo-100 rounded-xl space-y-4 shadow-inner">
                        <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                              <span className="text-[10px] font-bold text-indigo-500 tracking-wider">আবেদনকারী যাচাইকরণ (BDRIS)</span>
                            </div>
                          </div>
                          {verification.applicant === 'verifying' && <span className="flex items-center gap-1.5 text-indigo-500 text-[10px] font-bold bg-indigo-50 px-2 py-0.5 rounded-full"><Loader2 size={10} className="animate-spin" /> যাচাই করা হচ্ছে...</span>}
                          {verification.applicant === 'verified' && <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle size={10} /> আবেদনকারী নিবন্ধিত</span>}
                          {verification.applicant === 'error' && (
                            <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle size={10} /> তথ্য মেলেনি
                            </span>
                          )}
                          {verification.applicant === 'idle' && <span className="text-gray-300 text-[10px] font-bold italic">অপেক্ষা করুন...</span>}
                        </div>
                        
                        {verification.applicant === 'verified' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative overflow-hidden"
                          >
                            <div className="relative z-10">
                              <p className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                <CheckCircle size={10} /> বিডিআরআইএস যাচাইকৃত নাম
                              </p>
                              <p className="text-lg font-bold text-slate-800">{verification.applicantData.bn}</p>
                              <p className="text-xs font-bold text-slate-500 uppercase">{verification.applicantData.en}</p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              // Original Application Form (for New)
              <>
                {/* Section: Personal Info */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                      <User size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight font-display">ব্যক্তিগত তথ্যসমূহ</h3>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">নাম (বাংলা) <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input 
                          name="applicantNameBn"
                          required
                          value={formData.applicantNameBn}
                          onChange={handleChange}
                          placeholder="যেমন: মোহাম্মদ আব্দুল্লাহ" 
                          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                          type="text" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">নাম (ইংরেজী) <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input 
                          name="applicantNameEn"
                          required
                          value={formData.applicantNameEn}
                          onChange={handleChange}
                          placeholder="e.g. MOHAMMAD ABDULLAH" 
                          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                          type="text" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">জন্ম তারিখ <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Calendar size={16} />
                        </div>
                        <input 
                          name="dob"
                          required
                          type="text"
                          placeholder="দিন-মাস-বছর"
                          value={formData.dob}
                          onChange={(e) => handleDateChange(e, 'dob')}
                          maxLength={10}
                          className="h-11 w-full rounded-lg border appearance-none px-4 pl-10 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">লিঙ্গ <span className="text-rose-500">*</span></label>
                      <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                        {[
                          { id: 'male', label: 'পুরুষ' },
                          { id: 'female', label: 'নারী' },
                          { id: 'other', label: 'অন্যান্য' }
                        ].map((g) => (
                          <button 
                            key={g.id}
                            type="button" 
                            onClick={() => setFormData({ ...formData, gender: g.id })}
                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${
                              formData.gender === g.id 
                                ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">কততম সন্তান <span className="text-rose-500">*</span></label>
                      <input 
                        type="number"
                        min="1"
                        max="20"
                        placeholder="১-২০"
                        value={formData.numberOfChildren}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val >= 1 && val <= 20) {
                            setFormData({ ...formData, numberOfChildren: e.target.value });
                          } else if (e.target.value === '') {
                            setFormData({ ...formData, numberOfChildren: '' });
                          }
                        }}
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">মোবাইল নম্বর <span className="text-rose-500">*</span></label>
                      <input 
                        name="mobileNumber"
                        required
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder="০১XXXXXXXXX" 
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                        type="text" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 font-bold">এনআইডি (NID) নম্বর</label>
                      <input 
                        name="nidNumber"
                        value={formData.nidNumber}
                        onChange={handleChange}
                        placeholder="ভোটার আইডি কার্ড নম্বর (ঐচ্ছিক)" 
                        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                        type="text" 
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Address */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                      <MapPin size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight font-display">ঠিকানা (জন্মস্থান / স্থায়ী)</h3>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 font-bold">ওয়ার্ড নির্বাচন করুন <span className="text-rose-500">*</span></label>
                        <select 
                          name="wardNo"
                          required
                          value={formData.wardNo}
                          onChange={handleChange}
                          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20"
                        >
                          <option value="">ওয়ার্ড নির্বাচন করুন</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
                            <option key={w} value={w.toString()}>{w} নম্বর ওয়ার্ড</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 font-bold">গ্রাম নির্বাচন করুন <span className="text-rose-500">*</span></label>
                        <select 
                          name="villageName"
                          required
                          disabled={!formData.wardNo}
                          value={formData.villageName}
                          onChange={handleChange}
                          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20 disabled:opacity-50"
                        >
                          <option value="">গ্রাম নির্বাচন করুন</option>
                          {filteredVillages.map(v => (
                            <option key={v.id} value={v.villageNameBn}>{v.villageNameBn}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Parents Info */}
                <div className="space-y-6 pt-4">
                  <div className="border-b border-gray-300 pb-2 flex items-center">
                    <span className="inline-block bg-sky-400 w-1 h-5 rounded-full mr-2"></span>
                    <h3 className="text-black text-sm font-bold">পিতা মাতার তথ্য</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Father's Info */}
                    <div className="space-y-4 p-4 border border-gray-300 rounded-lg bg-gray-50/50 shadow-sm transition-all hover:shadow-md">
                      <h4 className="font-bold text-sky-700 border-b pb-1 mb-3 flex items-center text-sm">
                        <span className="bg-sky-100 p-1 rounded mr-2"></span> পিতার তথ্য
                      </h4>
                      
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700">
                          <span className="flex items-center">
                            <span>পিতার জন্ম নিবন্ধন নম্বর</span>
                          </span>
                        </label>
                        <div className="relative">
                          <input 
                            name="fatherCertificateNo"
                            value={formData.fatherCertificateNo}
                            onChange={handleChange}
                            placeholder="পিতার জন্ম নিবন্ধন নম্বর" 
                            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-white text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                            type="text" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700">
                          <span className="flex items-center">
                            <span>পিতার জন্ম তারিখ</span>
                          </span>
                        </label>
                        <div className="relative">
                          <input 
                            name="fatherDob"
                            value={formData.fatherDob}
                            onChange={(e) => handleDateChange(e, 'fatherDob')}
                            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-white text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                            type="text"
                            placeholder="DD-MM-YYYY (দিন-মাস-বছর)"
                            maxLength={10}
                          />
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl space-y-4 shadow-inner">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">BDRIS গেটওয়ে ইন্টিগ্রেশন</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[8px] text-slate-400">অফিসিয়াল ডাটাবেস এর সাথে সংযুক্ত</p>
                              <a 
                                href="https://everify.bdris.gov.bd/" 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[8px] text-blue-500 hover:underline flex items-center gap-0.5 font-bold"
                              >
                                <Search size={8} /> অফিসিয়াল যাচাই লিঙ্ক
                              </a>
                            </div>
                          </div>
                          {verification.father === 'verifying' && <span className="flex items-center gap-1.5 text-blue-500 text-[10px] font-bold bg-blue-50 px-2 py-0.5 rounded-full"><Loader2 size={10} className="animate-spin" /> ডাটা অনুসন্ধান চলছে...</span>}
                          {verification.father === 'verified' && <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle size={10} /> সনদ পাওয়া গেছে</span>}
                          {verification.father === 'error' && (
                            <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle size={10} /> ভুল তথ্য
                            </span>
                          )}
                          {verification.father === 'idle' && <span className="text-gray-300 text-[10px] font-bold italic">অপেক্ষা করুন...</span>}
                        </div>
                        
                        {verification.father === 'verified' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden"
                          >
                            <div className="absolute right-0 top-0 opacity-5 rotate-12 transform translate-x-2 -translate-y-2">
                              <CheckCircle size={64} />
                            </div>
                            <div className="relative z-10 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                                  <CheckCircle size={10} /> বিডিআরআইএস যাচাইকৃত তথ্য
                                </p>
                                <span className="text-[9px] px-2 py-0.5 bg-emerald-500 text-white rounded-full font-bold">
                                  {verification.fatherData.status}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-2">
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">নাম (বাংলা)</p>
                                  <p className="text-sm font-bold text-slate-800">{verification.fatherData.bn}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Name (English)</p>
                                  <p className="text-[11px] font-bold text-slate-600">{verification.fatherData.en}</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: verification.father === 'verified' ? '100%' : verification.father === 'verifying' ? '70%' : '0%' 
                            }}
                            className={`${verification.father === 'verified' ? 'bg-emerald-500' : 'bg-blue-500'} h-full transition-all duration-700 ease-in-out`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mother's Info */}
                    <div className="space-y-4 p-4 border border-gray-300 rounded-lg bg-gray-50/50 shadow-sm transition-all hover:shadow-md">
                      <h4 className="font-bold text-pink-700 border-b pb-1 mb-3 flex items-center text-sm">
                        <span className="bg-pink-100 p-1 rounded mr-2"></span> মাতার তথ্য
                      </h4>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700">
                          <span className="flex items-center">
                            <span>মাতার জন্ম নিবন্ধন নম্বর</span>
                          </span>
                        </label>
                        <div className="relative">
                          <input 
                            name="motherCertificateNo"
                            value={formData.motherCertificateNo}
                            onChange={handleChange}
                            placeholder="মাতার জন্ম নিবন্ধন নম্বর" 
                            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-white text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                            type="text" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700">
                          <span className="flex items-center">
                            <span>মাতার জন্ম তারিখ</span>
                          </span>
                        </label>
                        <div className="relative">
                          <input 
                            name="motherDob"
                            value={formData.motherDob}
                            onChange={(e) => handleDateChange(e, 'motherDob')}
                            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-white text-gray-800 border-gray-300 focus:border-blue-300 focus:ring-blue-500/20" 
                            type="text"
                            placeholder="DD-MM-YYYY (দিন-মাস-বছর)"
                            maxLength={10}
                          />
                        </div>
                      </div>

                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl space-y-4 shadow-inner">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">BDRIS গেটওয়ে ইন্টিগ্রেশন</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[8px] text-slate-400">অফিসিয়াল ডাটাবেস এর সাথে সংযুক্ত</p>
                        <a 
                          href="https://everify.bdris.gov.bd/" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[8px] text-blue-500 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          <Search size={8} /> অফিসিয়াল যাচাই লিঙ্ক
                        </a>
                      </div>
                    </div>
                    {verification.mother === 'verifying' && <span className="flex items-center gap-1.5 text-blue-500 text-[10px] font-bold bg-blue-50 px-2 py-0.5 rounded-full"><Loader2 size={10} className="animate-spin" /> ডাটা অনুসন্ধান চলছে...</span>}
                    {verification.mother === 'verified' && <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle size={10} /> সনদ পাওয়া গেছে</span>}
                    {verification.mother === 'error' && (
                      <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle size={10} /> ভুল তথ্য
                      </span>
                    )}
                    {verification.mother === 'idle' && <span className="text-gray-300 text-[10px] font-bold italic">অপেক্ষা করুন...</span>}
                  </div>

                  {verification.mother === 'verified' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden"
                    >
                      <div className="absolute right-0 top-0 opacity-5 rotate-12 transform translate-x-2 -translate-y-2">
                        <CheckCircle size={64} />
                      </div>
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle size={10} /> বিডিআরআইএস যাচাইকৃত তথ্য
                          </p>
                          <span className="text-[9px] px-2 py-0.5 bg-emerald-500 text-white rounded-full font-bold">
                            {verification.motherData.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">নাম (বাংলা)</p>
                            <p className="text-sm font-bold text-slate-800">{verification.motherData.bn}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Name (English)</p>
                            <p className="text-[11px] font-bold text-slate-600">{verification.motherData.en}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                   )}

                  <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: verification.mother === 'verified' ? '100%' : verification.mother === 'verifying' ? '70%' : '0%' 
                      }}
                      className={`${verification.mother === 'verified' ? 'bg-emerald-500' : 'bg-blue-500'} h-full transition-all duration-700 ease-in-out`}
                    />
                  </div>
                </div>
              </div>
            </div>
            </div>
          </>
        )}

        <div className="flex gap-3 justify-start pt-8">
            <button 
              type="submit" 
              disabled={loading || ((type === 'correction' || type === 'new' || type === 'death') && formStep === 'upload' && attachments.length === 0) || ((type === 'correction' || type === 'new' || type === 'death') && formStep === 'otp' && otpCode.length !== 6)}
              className={`inline-flex items-center justify-center gap-3 rounded-xl font-bold transition focus:outline-none px-10 py-3.5 text-sm shadow-xl active:scale-95 disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none cursor-pointer ${
                (type === 'correction' || type === 'new' || type === 'death') && formStep === 'otp' 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' 
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-100'
              }`}
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <>
                  <span>
                    {(type === 'correction' || type === 'new' || type === 'death') 
                      ? (formStep === 'form' ? 'পরবর্তী' : formStep === 'upload' ? 'পরবর্তী' : 'চূড়ান্ত জমা দিন') 
                      : 'আবেদন জমা দিন'}
                  </span>
                  <Send size={16} className={(type === 'correction' || type === 'new' || type === 'death') && formStep !== 'otp' ? 'rotate-0' : '-rotate-45'} />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
      )}
    </div>
  );
};

export default ApplicationForm;
