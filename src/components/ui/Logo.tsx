import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12", showText = false }) => {
  return (
    <div className="flex items-center gap-3 group">
      <div className={`relative ${className} flex items-center justify-center shrink-0`}>
        {/* Background Document Icon mimicking the right side of the logo */}
        <div className="absolute right-0 top-1 w-2/3 h-4/5 bg-white border border-slate-100 rounded-md shadow-sm transform translate-x-1.5 -rotate-2 flex flex-col p-1 gap-0.5 opacity-60 group-hover:opacity-80 transition-opacity">
          <div className="h-0.5 w-3/4 bg-slate-200 rounded-full" />
          <div className="h-0.5 w-1/2 bg-slate-200 rounded-full" />
          <div className="h-0.5 w-2/3 bg-slate-200 rounded-full" />
        </div>

        {/* Main Stylized 'ই' Character with gradient */}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full drop-shadow-sm"
          >
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" /> {/* Emerald-500 */}
                <stop offset="60%" stopColor="#2563eb" /> {/* Blue-600 */}
                <stop offset="100%" stopColor="#1e3a8a" /> {/* Deep Blue */}
              </linearGradient>
            </defs>
            
            {/* Leaf-like top accent */}
            <path 
              d="M30 25 C 35 10, 55 10, 65 25 L 50 45 Z" 
              fill="#22c55e" 
              className="opacity-90 transition-transform group-hover:scale-110 origin-center"
            />
            
            {/* Character body */}
            <text 
              x="48%" 
              y="68%" 
              dominantBaseline="middle" 
              textAnchor="middle" 
              fill="url(#logoGradient)"
              className="text-[65px] font-black select-none"
              style={{ fontWeight: 900 }}
            >
              ই
            </text>
          </svg>
        </div>
        
        {/* Verification Checkmark - positioned like in the logo */}
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg z-20"
        >
          <CheckCircle2 size={12} className="text-white" strokeWidth={4} />
        </motion.div>
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-2xl font-black text-slate-900 leading-none tracking-tight group-hover:text-emerald-600 transition-colors">ই-নিবন্ধন</span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-widest">সহজ | দ্রুত | নিরাপদ</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
