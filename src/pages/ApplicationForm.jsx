import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, setDoc, doc, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { 
  Baby, FileEdit, Ghost, Send, ChevronLeft, 
  User, Calendar, MapPin, Search, AlertCircle, CheckCircle2,
  Users, RefreshCw, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_FORM_DATA = {
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
  relationship: '',
  applicantBrn: '',
  applicantDob: '',
  verifiedApplicantName: '',
  reason: '',
  dateOfDeath: '',
  deathCause: '',
  spouseBrn: '',
  spouseNid: '',
  spouseNameBn: '',
  spouseNameEn: '',
  placeOfDeathWard: '',
  placeOfDeathVillage: '',
  hasFatherBrn: 'yes',
  hasMotherBrn: 'yes',
};

const ApplicationForm = () => {
  const { type } = useParams();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [villageList, setVillageList] = useState([]);
  const [filteredVillages, setFilteredVillages] = useState([]);
  
  // Correction and Death search state
  const [isCorrectionSearched, setIsCorrectionSearched] = useState(false);
  const [isDeathSearched, setIsDeathSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchData, setSearchData] = useState({ brn: '', dob: '', day: '', month: '', year: '' });
  const [correctionSearchError, setCorrectionSearchError] = useState(false);
  
  const brnInputRef = useRef(null);
  const dayInputRef = useRef(null);
  const monthInputRef = useRef(null);
  const yearInputRef = useRef(null);
  const [formStep, setFormStep] = useState('form');
  const [otpCode, setOtpCode] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [currentUpload, setCurrentUpload] = useState({ type: '', fileName: '', file: null });
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  const [verification, setVerification] = useState({
    father: 'idle',
    mother: 'idle',
    applicant: 'idle',
    fatherData: { bn: '', en: '', status: '' },
    motherData: { bn: '', en: '', status: '' },
    applicantData: { bn: '', en: '', status: '' }
  });

  useEffect(() => {
    const filtered = villageList.filter(v => v.wardNo === formData.wardNo);
    setFilteredVillages(filtered);
  }, [formData.wardNo, villageList]);

  useEffect(() => {
    const vRef = (formData.fatherCertificateNo || '').trim().replace(/\s/g, '');
    const vDob = (formData.fatherDob || '').trim();
    
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
    const vRef = (formData.motherCertificateNo || '').trim().replace(/\s/g, '');
    const vDob = (formData.motherDob || '').trim();
    
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
    const vRef = (formData.applicantBrn || '').trim().replace(/\s/g, '');
    const vDob = (formData.applicantDob || '').trim();
    
    if (vRef.length === 17 && vDob.length >= 8) {
      if (verification.applicant === 'idle' || verification.applicant === 'error') {
        autoVerify('applicant');
      }
    } else if (vRef.length > 0 || vDob.length > 0) {
      if (verification.applicant !== 'verifying' && verification.applicant !== 'idle') {
        setVerification(prev => ({ ...prev, applicant: 'idle', applicantData: { bn: '', en: '', status: '' } }));
      }
    }
  }, [formData.applicantBrn, formData.applicantDob]);

  const autoVerify = async (parent) => {
    const certNo = parent === 'father'
      ? (formData.fatherCertificateNo || '')
      : parent === 'mother'
        ? (formData.motherCertificateNo || '')
        : (formData.applicantBrn || '');

    const dob = parent === 'father'
      ? (formData.fatherDob || '')
      : parent === 'mother'
        ? (formData.motherDob || '')
        : (formData.applicantDob || '');

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

      // Auto-populate formData names when verified
      if (parent === 'father') {
        setFormData(prev => ({ 
          ...prev, 
          fatherNameBn: result.data.name_bn,
          fatherNameEn: result.data.name_en
        }));
      } else if (parent === 'mother') {
        setFormData(prev => ({ 
          ...prev, 
          motherNameBn: result.data.name_bn,
          motherNameEn: result.data.name_en
        }));
      } else if (parent === 'applicant') {
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
    const fetchApplication = async () => {
      if (!editId || !user) return;
      
      setLoading(true);
      try {
        const docRef = doc(db, 'applications', editId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId === user.uid) {
            setFormData(prev => ({ ...DEFAULT_FORM_DATA, ...data.formData }));
            setAttachments(data.attachments || []);
            
            // Set search status based on type
            if (type === 'correction') setIsCorrectionSearched(true);
            if (type === 'death') setIsDeathSearched(true);
          } else {
            console.error('Unauthorized edit attempt');
            navigate('/dashboard');
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `applications/${editId}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchApplication();
  }, [editId, user, type]);

  useEffect(() => {
    const fetchVillages = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'villages'));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setVillageList(list);
      } catch (error) {
        console.error('Error fetching villages:', error);
      }
    };
    fetchVillages();
  }, []);

  const isBornAfter2012 = () => {
    if (!formData.dob) return false;
    const parts = formData.dob.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[2]);
    return year >= 2012;
  };

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

  const handleDateChange = (e, field, isSearch = false) => {
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

  const handleCorrectionSearch = async (e) => {
    e.preventDefault();
    
    const constructedDob = `${searchData.day.padStart(2, '0')}-${searchData.month.padStart(2, '0')}-${searchData.year}`;
    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    
    if (searchData.brn.length !== 17 || !dobRegex.test(constructedDob)) {
      setCorrectionSearchError(true);
      return;
    }

    setSearchLoading(true);
    setCorrectionSearchError(false);

    try {
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

  const handleDeathSearch = async (e) => {
    e.preventDefault();
    
    const constructedDob = `${searchData.day.padStart(2, '0')}-${searchData.month.padStart(2, '0')}-${searchData.year}`;
    const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
    
    if (searchData.brn.length !== 17 || !dobRegex.test(constructedDob)) {
      setCorrectionSearchError(true);
      return;
    }

    setSearchLoading(true);
    setCorrectionSearchError(false);

    try {
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

  const handleSubmit = async (e) => {
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
      const now = Date.now();
      const finalFormData = { ...formData };
      if (editId) {
        const appRef = doc(db, 'applications', editId);
        await updateDoc(appRef, {
          applicantName: type === 'death' ? formData.verifiedApplicantName : formData.applicantNameBn,
          formData: finalFormData,
          attachments: (type === 'correction' || type === 'new' || type === 'death') ? attachments : [],
          updatedAt: now,
        });
      } else {
        const appRef = collection(db, 'applications');
        await addDoc(appRef, {
          userId: user.uid,
          type: type,
          status: 'pending',
          applicantName: type === 'death' ? formData.verifiedApplicantName : formData.applicantNameBn,
          formData: finalFormData,
          attachments: (type === 'correction' || type === 'new' || type === 'death') ? attachments : [],
          createdAt: now,
          updatedAt: now,
        });
      }
      
      setSubmitted(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'applications');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'wardNo' || name === 'placeOfDeathWard') {
      const filtered = villageList.filter(v => v.wardNo === value);
      const firstVillage = filtered.length > 0 ? filtered[0].villageNameBn : '';
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        [name === 'wardNo' ? 'villageName' : 'placeOfDeathVillage']: firstVillage
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
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

  const removeAttachment = (id) => {
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

  /* PART 2 START */
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
                <label htmlFor="deathBirthCertNo" className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">জন্ম সনদ নং</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-rose-500 transition-colors">
                    <Ghost size={18} />
                  </div>
                  <input 
                    ref={brnInputRef}
                    id="deathBirthCertNo" 
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
                    className="h-12 w-28 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-orange-500 transition-all bg-white" 
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
              // Correction Application Form Section
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-3">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-800 tracking-tight">সংশোধিত তথ্যসমূহ দিন</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ব্যক্তির নাম (বাংলা) <span className="text-red-500">*</span></label>
                    <input name="applicantNameBn" required value={formData.applicantNameBn || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" type="text" placeholder="সঠিক নাম বাংলায় লিখুন" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ব্যক্তির নাম (ইংরেজি) <span className="text-red-500">*</span></label>
                    <input name="applicantNameEn" required value={formData.applicantNameEn || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20 uppercase" type="text" placeholder="CORRECT NAME IN ENGLISH" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">জন্ম তারিখ <span className="text-red-500">*</span></label>
                    <input name="dob" required value={formData.dob || ''} onChange={(e) => handleDateChange(e, 'dob')} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" type="text" placeholder="DD-MM-YYYY" maxLength={10} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">লিঙ্গ (ঐচ্ছিক)</label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                      {['male', 'female', 'others'].map((g) => (
                        <button 
                          key={g} type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                          className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${
                            (formData.gender || '') === g ? 'bg-white text-orange-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {g === 'male' ? 'পুরুষ' : g === 'female' ? 'নারী' : 'অন্যান্য'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">পিতা-মাতার কততম সন্তান <span className="text-red-500">*</span></label>
                    <input 
                      name="numberOfChildren" 
                      required 
                      min="1" 
                      max="20" 
                      value={formData.numberOfChildren || ''} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= 20) {
                          setFormData(prev => ({ ...prev, numberOfChildren: e.target.value }));
                        } else if (e.target.value === '') {
                          setFormData(prev => ({ ...prev, numberOfChildren: '' }));
                        }
                      }} 
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" 
                      type="number" 
                      placeholder="১-২০" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মোবাইল নম্বর <span className="text-red-500">*</span></label>
                    <input name="mobileNumber" required value={formData.mobileNumber || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20" type="text" placeholder="০১XXXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ওয়ার্ড নং <span className="text-red-500">*</span></label>
                    <select name="wardNo" required value={formData.wardNo || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20">
                      <option value="">ওয়ার্ড নির্বাচন করুন</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(w => <option key={w} value={w.toString()}>{w} নম্বর ওয়ার্ড</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">গ্রামের নাম <span className="text-red-500">*</span></label>
                    <select 
                      name="villageName" 
                      required 
                      value={formData.villageName || ''} 
                      onChange={handleChange}
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-orange-300 focus:ring-orange-500/20"
                    >
                      <option value="">গ্রাম নির্বাচন করুন</option>
                      {filteredVillages.map(v => (
                        <option key={v.id} value={v.villageNameBn}>{v.villageNameBn}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : type === 'death' ? (
              // Death Application Section
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-3">
                  <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-800 tracking-tight">মৃত্যু নিবন্ধনের তথ্যসমূহ দিন</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700">মৃত ব্যক্তির নাম: <span className="font-bold text-rose-600">{formData.applicantNameBn}</span></label>
                    <p className="text-[11px] text-gray-400">জন্ম সনদ অনুযায়ী নাম স্বয়ংক্রিয়ভাবে প্রদান করা হয়েছে।</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মৃত্যুর তারিখ <span className="text-red-500">*</span></label>
                    <input name="dateOfDeath" required value={formData.dateOfDeath || ''} onChange={(e) => handleDateChange(e, 'dateOfDeath')} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-rose-300 focus:ring-rose-500/20" type="text" placeholder="DD-MM-YYYY" maxLength={10} />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মৃত্যুর কারণ <span className="text-red-500">*</span></label>
                    <select name="deathCause" required value={formData.deathCause || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-rose-300 focus:ring-rose-500/20">
                      <option value="">নির্বাচন করুন</option>
                      <option value="old_age">বার্ধক্যজনিত</option>
                      <option value="disease">অসুস্থতা</option>
                      <option value="accident">দুর্ঘটনা</option>
                      <option value="others">অন্যান্য</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">আবেদনকারীর সাথে সম্পর্ক <span className="text-red-500">*</span></label>
                    <select name="relationship" required value={formData.relationship || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-rose-300 focus:ring-rose-500/20">
                      <option value="">নির্বাচন করুন</option>
                      <option value="self">নিজে</option>
                      <option value="father">পিতা</option>
                      <option value="mother">মাতা</option>
                      <option value="son">পুত্র</option>
                      <option value="daughter">কন্যা</option>
                      <option value="spouse">স্বামী/স্ত্রী</option>
                      <option value="others">অন্যান্য</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মোবাইল নম্বর <span className="text-red-500">*</span></label>
                    <input name="mobileNumber" required value={formData.mobileNumber || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-rose-300 focus:ring-rose-500/20" type="text" placeholder="০১XXXXXXXXX" />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মৃত্যু স্থানের ওয়ার্ড নং <span className="text-red-500">*</span></label>
                    <select name="placeOfDeathWard" required value={formData.placeOfDeathWard || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-rose-300 focus:ring-rose-500/20">
                      <option value="">ওয়ার্ড নির্বাচন করুন</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(w => <option key={w} value={w.toString()}>{w} নম্বর ওয়ার্ড</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মৃত্যু স্থানের গ্রাম <span className="text-red-500">*</span></label>
                    <select 
                      name="placeOfDeathVillage" 
                      required 
                      value={formData.placeOfDeathVillage || ''} 
                      onChange={handleChange}
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-rose-300 focus:ring-rose-500/20"
                    >
                      <option value="">গ্রাম নির্বাচন করুন</option>
                      {filteredVillages.map(v => (
                        <option key={v.id} value={v.villageNameBn}>{v.villageNameBn}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Applicant Verification (Internal) */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">আবেদনকারীর তথ্য যাচাই (Verification)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">জন্ম নিবন্ধন নম্বর</label>
                      <input 
                        name="applicantBrn" 
                        value={formData.applicantBrn || ''} 
                        onChange={(e) => setFormData(prev => ({ ...prev, applicantBrn: e.target.value.replace(/\D/g, '').slice(0, 17) }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800"
                        placeholder="১৭ ডিজিট"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">জন্ম তারিখ</label>
                      <input 
                        name="applicantDob" 
                        value={formData.applicantDob || ''} 
                        onChange={(e) => handleDateChange(e, 'applicantDob')}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800"
                        placeholder="DD-MM-YYYY"
                      />
                    </div>
                  </div>
                  {verification.applicant === 'verifying' && (
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-bold animate-pulse">
                      <Loader2 size={14} className="animate-spin" /> যাচাই করা হচ্ছে...
                    </div>
                  )}
                  {verification.applicant === 'verified' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2">
                       <CheckCircle size={14} /> যাচাই সম্পন্ন: {verification.applicantData.bn}
                    </div>
                  )}
                  {verification.applicant === 'error' && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                       <XCircle size={14} /> তথ্য পাওয়া যায়নি। সঠিক নম্বর ও তারিখ দিন।
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // New Birth Registration Section
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-3">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-800 tracking-tight">ব্যক্তিগত তথ্যাদি</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">নাম (বাংলা) <span className="text-red-500">*</span></label>
                    <input name="applicantNameBn" required value={formData.applicantNameBn || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-emerald-300 focus:ring-emerald-500/20" type="text" placeholder="পুরো নাম বাংলায়" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">নাম (ইংরেজি) <span className="text-red-500">*</span></label>
                    <input name="applicantNameEn" required value={formData.applicantNameEn || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-emerald-300 focus:ring-emerald-500/20 uppercase" type="text" placeholder="FULL NAME IN ENGLISH" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">জন্ম তারিখ <span className="text-red-500">*</span></label>
                    <input name="dob" required value={formData.dob || ''} onChange={(e) => handleDateChange(e, 'dob')} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-emerald-300 focus:ring-emerald-500/20" type="text" placeholder="DD-MM-YYYY" maxLength={10} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">লিঙ্গ <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                      {['male', 'female', 'others'].map((g) => (
                        <button 
                          key={g} type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                          className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${
                            formData.gender === g ? 'bg-white text-emerald-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {g === 'male' ? 'পুরুষ' : g === 'female' ? 'নারী' : 'অন্যান্য'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">পিতা-মাতার কততম সন্তান <span className="text-red-500">*</span></label>
                    <input name="numberOfChildren" required value={formData.numberOfChildren || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-emerald-300 focus:ring-emerald-500/20" type="number" min="1" max="20" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">মোবাইল নম্বর <span className="text-red-500">*</span></label>
                    <input name="mobileNumber" required value={formData.mobileNumber || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-emerald-300 focus:ring-emerald-500/20" type="text" placeholder="০১XXXXXXXXX" />
                  </div>
                </div>

                <div className="flex items-center gap-4 border-b border-gray-100 pb-3 pt-6">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-800 tracking-tight">পিতা-মাতার তথ্যাদি</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                  {/* Father's Info */}
                  <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-800 text-sm">পিতার তথ্য (Father)</h4>
                        {!isBornAfter2012() && (
                            <div className="flex bg-slate-200 p-0.5 rounded-lg">
                                <button 
                                    type="button" 
                                    onClick={() => setFormData(prev => ({ ...prev, hasFatherBrn: 'yes' }))}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.hasFatherBrn === 'yes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                >
                                    হ্যাঁ
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setFormData(prev => ({ ...prev, hasFatherBrn: 'no' }))}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.hasFatherBrn === 'no' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                >
                                    না
                                </button>
                            </div>
                        )}
                    </div>

                    {(formData.hasFatherBrn === 'yes' || isBornAfter2012()) ? (
                        <>
                            <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">জন্ম সনদ নম্বর {isBornAfter2012() && <span className="text-red-500">*</span>}</label>
                            <input name="fatherCertificateNo" required={isBornAfter2012()} value={formData.fatherCertificateNo || ''} onChange={handleChange} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold" type="text" maxLength={17} />
                            </div>
                            <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">জন্ম তারিখ {isBornAfter2012() && <span className="text-red-500">*</span>}</label>
                            <input name="fatherDob" required={isBornAfter2012()} value={formData.fatherDob || ''} onChange={(e) => handleDateChange(e, 'fatherDob')} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold" type="text" maxLength={10} placeholder="DD-MM-YYYY" />
                            </div>
                            {verification.father === 'verifying' && <p className="text-[10px] font-bold text-blue-600 animate-pulse">যাচাই করা হচ্ছে...</p>}
                            {verification.father === 'verified' && <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 p-2 rounded">ভেরিফাইড: {verification.fatherData.bn}</p>}
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">পিতার নাম (বাংলা) <span className="text-red-500">*</span></label>
                                <input name="fatherNameBn" required value={formData.fatherNameBn || ''} onChange={handleChange} className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold" placeholder="পিতার নাম বাংলায়" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">পিতার নাম (ইংরেজি) <span className="text-red-500">*</span></label>
                                <input name="fatherNameEn" required value={formData.fatherNameEn || ''} onChange={handleChange} className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold uppercase" placeholder="FATHER NAME IN ENGLISH" />
                            </div>
                        </div>
                    )}
                  </div>

                  {/* Mother's Info */}
                  <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="font-bold text-slate-800 text-sm">মাতার তথ্য (Mother)</h4>
                        {!isBornAfter2012() && (
                            <div className="flex bg-slate-200 p-0.5 rounded-lg">
                                <button 
                                    type="button" 
                                    onClick={() => setFormData(prev => ({ ...prev, hasMotherBrn: 'yes' }))}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.hasMotherBrn === 'yes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                >
                                    হ্যাঁ
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setFormData(prev => ({ ...prev, hasMotherBrn: 'no' }))}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.hasMotherBrn === 'no' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                >
                                    না
                                </button>
                            </div>
                        )}
                    </div>

                    {(formData.hasMotherBrn === 'yes' || isBornAfter2012()) ? (
                        <>
                            <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">জন্ম সনদ নম্বর {isBornAfter2012() && <span className="text-red-500">*</span>}</label>
                            <input name="motherCertificateNo" required={isBornAfter2012()} value={formData.motherCertificateNo || ''} onChange={handleChange} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold" type="text" maxLength={17} />
                            </div>
                            <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">জন্ম তারিখ {isBornAfter2012() && <span className="text-red-500">*</span>}</label>
                            <input name="motherDob" required={isBornAfter2012()} value={formData.motherDob || ''} onChange={(e) => handleDateChange(e, 'motherDob')} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold" type="text" maxLength={10} placeholder="DD-MM-YYYY" />
                            </div>
                            {verification.mother === 'verifying' && <p className="text-[10px] font-bold text-blue-600 animate-pulse">যাচাই করা হচ্ছে...</p>}
                            {verification.mother === 'verified' && <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 p-2 rounded">ভেরিফাইড: {verification.motherData.bn}</p>}
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">মাতার নাম (বাংলা) <span className="text-red-500">*</span></label>
                                <input name="motherNameBn" required value={formData.motherNameBn || ''} onChange={handleChange} className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold" placeholder="মাতার নাম বাংলায়" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">মাতার নাম (ইংরেজি) <span className="text-red-500">*</span></label>
                                <input name="motherNameEn" required value={formData.motherNameEn || ''} onChange={handleChange} className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold uppercase" placeholder="MOTHER NAME IN ENGLISH" />
                            </div>
                        </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 border-b border-gray-100 pb-3 pt-4">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-800 tracking-tight">ঠিকানা</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ওয়ার্ড নং <span className="text-red-500">*</span></label>
                    <select name="wardNo" required value={formData.wardNo || ''} onChange={handleChange} className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-emerald-300 focus:ring-emerald-500/20">
                      <option value="">ওয়ার্ড নির্বাচন করুন</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(w => <option key={w} value={w.toString()}>{w} নম্বর ওয়ার্ড</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">গ্রামের নাম <span className="text-red-500">*</span></label>
                    <select 
                      name="villageName" 
                      required 
                      value={formData.villageName || ''} 
                      onChange={handleChange}
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring bg-transparent text-gray-800 border-gray-300 focus:border-emerald-300 focus:ring-emerald-500/20"
                    >
                      <option value="">গ্রাম নির্বাচন করুন</option>
                      {filteredVillages.map(v => (
                        <option key={v.id} value={v.villageNameBn}>{v.villageNameBn}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Form Navigation Buttons */}
            <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-[11px] text-gray-400 font-bold italic">* চিহ্নিত ঘরগুলো অবশ্যই পূরণ করতে হবে</p>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 md:flex-none h-12 px-8 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 transition-all"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 md:flex-none h-12 px-10 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <>
                      {formStep === 'otp' ? 'আবেদন সম্পন্ন করুন' : (type === 'correction' || type === 'new' || type === 'death') && formStep === 'form' ? 'পরবর্তী ধাপে যান' : 'জমা দিন'}
                      <Send size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default ApplicationForm;
