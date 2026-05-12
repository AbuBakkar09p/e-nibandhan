import { Link, useNavigate } from 'react-router-dom';
import { FileText, LogOut, User as UserIcon, Home, PlusCircle, LayoutDashboard, Fingerprint, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { motion } from 'motion/react';
import Logo from '../ui/Logo';

export const Navbar = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white text-slate-800 border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="w-full">
        <div className="flex h-16 items-center">
          {/* Logo Section - Aligned with Sidebar width on Desktop */}
          <div className={`${user ? 'lg:w-64 border-r border-slate-200' : 'lg:w-auto'} flex items-center px-6 h-full transition-all duration-300`}>
            <Link to={user ? "/dashboard" : "/login"}>
              <Logo className="w-10 h-10" showText={true} />
            </Link>
          </div>

          {/* Main Nav Content */}
          <div className="flex-1 flex justify-between items-center px-6 lg:px-8">
            <div className="flex items-center space-x-6">
              {/* Links removed as requested */}
            </div>

            <div className="flex items-center">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="h-8 w-[1px] bg-slate-100 mx-2 hidden sm:block"></div>
                  <Link to="/profile" className="flex items-center gap-3 text-right group">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{profile?.fullName}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">ভারপ্রাপ্ত কর্মকর্তা</span>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center text-emerald-700 overflow-hidden group-hover:border-emerald-400 transition-all shadow-sm">
                      {profile?.photoURL ? (
                        <img 
                          src={profile.photoURL} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <UserIcon size={20} />
                      )}
                    </div>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="ml-2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100"
                    title="লগ আউট"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link 
                    to="/login" 
                    className="text-sm font-bold text-slate-600 hover:text-emerald-700 px-4 py-2 transition-colors"
                  >
                    লগইন
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    নিবন্ধন করুন
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
