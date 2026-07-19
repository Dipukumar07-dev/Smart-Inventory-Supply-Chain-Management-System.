import React from 'react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { Package, LogIn, LogOut, Cpu } from 'lucide-react';

interface NavbarProps {
  user: FirebaseUser | null;
  loading: boolean;
}

export default function Navbar({ user, loading }: NavbarProps) {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Firebase authentication failed:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black/15 bg-[#FDFCFB]/90 backdrop-blur-md px-8 py-5">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center border border-black/15 bg-black text-white rounded-none">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl italic font-semibold tracking-tight text-[#1A1A1A]">
            FlowChain Supply & Co.
          </h1>
          <p className="font-sans text-[9px] text-[#1A1A1A]/60 uppercase tracking-[0.25em] font-bold">
            Logistics Intelligence & Supply Control
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {loading ? (
          <div className="h-4 w-28 animate-pulse bg-black/10" />
        ) : user ? (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="font-sans font-bold text-xs text-[#1A1A1A]">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-[#7C8363] font-bold tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7C8363] animate-pulse"></span>
                ACTIVE OPERATOR
              </span>
            </div>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Profile'}
                className="h-8 w-8 rounded-none border border-black/15"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center border border-black/15 bg-[#F2F1EE] font-sans font-bold text-xs text-[#1A1A1A]">
                {user.email?.[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 border border-black/15 bg-[#FDFCFB] px-3.5 py-1.5 font-sans font-bold text-[10px] text-[#1A1A1A] uppercase tracking-wider transition-colors hover:bg-black hover:text-[#FDFCFB]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[9px] text-amber-800 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5">
              <Cpu className="h-3 w-3" />
              DEMO MODE
            </span>
            <button
              onClick={handleLogin}
              className="flex items-center gap-1.5 bg-black px-4 py-1.5 font-sans font-bold text-[10px] text-white uppercase tracking-wider transition-colors hover:bg-black/80"
            >
              <LogIn className="h-3.5 w-3.5" />
              Authenticate
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

