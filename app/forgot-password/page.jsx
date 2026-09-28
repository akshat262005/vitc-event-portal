'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/client-api';
import { ArrowLeft, Mail, Lock, KeyRound, CheckCircle, Loader2, Sparkles } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useAuth();

  const [step, setStep] = useState(1); // Steps: 1 = Email, 2 = OTP, 3 = Reset Password, 4 = Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Countdown timer
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);

  // Restart/Start timer countdown
  const startTimer = () => {
    setResendTimer(60);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (step === 2) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  // Password requirements checks
  const passLength = newPassword.length >= 8;
  const passUpper = /[A-Z]/.test(newPassword);
  const passLower = /[a-z]/.test(newPassword);
  const passNum = /[0-9]/.test(newPassword);
  const passSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';

  const requirementsMetCount = [passLength, passUpper, passLower, passNum, passSpecial].filter(Boolean).length;
  
  const getPasswordStrength = () => {
    if (requirementsMetCount <= 2) return { text: 'Weak', color: 'text-red-500 bg-red-100 dark:bg-red-950/20' };
    if (requirementsMetCount <= 4) return { text: 'Moderate', color: 'text-amber-500 bg-amber-100 dark:bg-amber-950/20' };
    return { text: 'Strong', color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-950/20' };
  };

  // STEP 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password/request', { email: email.trim() });
      showToast('OTP sent successfully to your registered email.', 'success');
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to request OTP. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOTP = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/request', { email: email.trim() });
      showToast('New OTP sent successfully to your registered email.', 'success');
      startTimer();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password/verify', { email: email.trim(), otp: otp.trim() });
      showToast('OTP verified successfully!', 'success');
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (requirementsMetCount < 5) {
      showToast('Please satisfy all password complexity requirements.', 'error');
      return;
    }
    if (!passwordsMatch) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password/reset', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword
      });
      showToast('Password changed successfully.', 'success');
      setStep(4);
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Blurred background image of VIT Chennai */}
      <div 
        className="absolute inset-0 bg-cover bg-center select-none pointer-events-none transform scale-105"
        style={{ 
          backgroundImage: "url('/vitc_image.png')", 
          filter: "blur(8px) brightness(0.9)" 
        }} 
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-vit-navy/40 dark:bg-vit-neutral-955/70 mix-blend-multiply" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-md bg-white/90 dark:bg-vit-neutral-850/90 rounded-3xl border border-white/20 dark:border-vit-neutral-750/30 shadow-2xl p-8 backdrop-blur-lg transition-all duration-300">
        
        {/* Brand/Logo Header */}
        <div className="text-center mb-6">
          <img 
            src="/vit_logo_colored.png" 
            alt="VIT Chennai Logo" 
            className="mx-auto h-16 w-auto mb-4 object-contain filter drop-shadow-sm select-none pointer-events-none" 
          />
          <h2 className="text-xl font-extrabold text-vit-navy dark:text-white leading-tight">
            Reset Password
          </h2>
        </div>

        {/* STEP 1: Email Input Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-5 relative z-10 animate-fade-in">
            <p className="text-xs text-vit-neutral-500 dark:text-vit-neutral-400 font-medium leading-relaxed">
              Enter your registered email address. A One-Time Password (OTP) will be sent to your email.
            </p>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-vit-neutral-400 dark:text-vit-neutral-550">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter registered email"
                  className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-vit-neutral-900/70 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 rounded-xl focus:ring-2 focus:ring-vit-blue focus:border-transparent outline-none transition-all text-sm font-semibold text-vit-neutral-800 dark:text-white"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-vit-navy to-vit-blue shadow-vit-navy/20 hover:shadow-vit-blue/30 rounded-xl font-semibold shadow-lg text-sm text-white cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
              disabled={loading || !email.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-vit-neutral-500 dark:text-vit-neutral-400 hover:text-vit-navy dark:hover:text-white font-bold py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-5 relative z-10 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-vit-navy dark:text-white">Verify OTP</h3>
              <p className="text-xs text-vit-neutral-450 mt-1 font-medium">
                Sent to: <span className="text-vit-navy dark:text-white font-semibold">{email}</span>
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                OTP Code
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-vit-neutral-400 dark:text-vit-neutral-550">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-vit-neutral-900/70 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 rounded-xl focus:ring-2 focus:ring-vit-blue focus:border-transparent outline-none transition-all text-sm font-bold font-mono tracking-widest text-center text-vit-neutral-800 dark:text-white"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-vit-navy to-vit-blue shadow-vit-navy/20 hover:shadow-vit-blue/30 rounded-xl font-semibold shadow-lg text-sm text-white cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
                disabled={loading || otp.length < 6}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP'}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  canResend
                    ? 'border-vit-neutral-200 text-vit-blue hover:bg-vit-neutral-50 dark:border-vit-neutral-700 dark:text-vit-accent dark:hover:bg-vit-neutral-800 cursor-pointer'
                    : 'border-vit-neutral-200/50 text-vit-neutral-400 dark:border-vit-neutral-750/30 cursor-not-allowed'
                }`}
                disabled={!canResend || loading}
              >
                {canResend ? 'Resend OTP' : `Resend OTP in ${resendTimer} seconds`}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-vit-neutral-500 dark:text-vit-neutral-400 hover:text-vit-navy dark:hover:text-white font-bold py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Email Address</span>
            </button>
          </form>
        )}

        {/* STEP 3: Password Reset Form */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-5 relative z-10 animate-fade-in">
            <div>
              <h3 className="text-sm font-bold text-vit-navy dark:text-white">Choose New Password</h3>
              <p className="text-xs text-vit-neutral-450 mt-1">Set a secure, strong password for your workspace.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-vit-neutral-400 dark:text-vit-neutral-550">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-vit-neutral-900/70 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 rounded-xl focus:ring-2 focus:ring-vit-blue focus:border-transparent outline-none transition-all text-sm font-semibold text-vit-neutral-800 dark:text-white"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-vit-neutral-400 dark:text-vit-neutral-550">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-vit-neutral-900/70 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 rounded-xl focus:ring-2 focus:ring-vit-blue focus:border-transparent outline-none transition-all text-sm font-semibold text-vit-neutral-800 dark:text-white"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Password Strength indicator */}
            {newPassword && (
              <div className="p-3.5 rounded-2xl bg-vit-neutral-50/50 dark:bg-vit-neutral-900/40 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 space-y-2.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-vit-neutral-500 uppercase tracking-wider">Password Strength</span>
                  <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${getPasswordStrength().color}`}>
                    {getPasswordStrength().text}
                  </span>
                </div>
                
                {/* Requirements Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-semibold">
                  <div className={`flex items-center gap-1.5 ${passLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-vit-neutral-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>Min 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-vit-neutral-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-vit-neutral-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passNum ? 'text-emerald-600 dark:text-emerald-400' : 'text-vit-neutral-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>One number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-vit-neutral-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>One special character</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-vit-neutral-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-vit-navy to-vit-blue shadow-vit-navy/20 hover:shadow-vit-blue/30 rounded-xl font-semibold shadow-lg text-sm text-white cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
              disabled={loading || requirementsMetCount < 5 || !passwordsMatch}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
            </button>
          </form>
        )}

        {/* STEP 4: Success Message */}
        {step === 4 && (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
            <div>
              <h3 className="text-lg font-bold text-vit-navy dark:text-white">Password Changed!</h3>
              <p className="text-xs text-vit-neutral-500 dark:text-vit-neutral-450 mt-1 font-medium">
                Password changed successfully. You will be redirected to the Login page shortly.
              </p>
            </div>
            <div className="flex justify-center items-center gap-2 text-xs font-semibold text-vit-blue">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Redirecting...</span>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center mt-8 text-[10px] font-semibold text-vit-neutral-450 dark:text-vit-neutral-500 tracking-wide border-t border-vit-neutral-200/20 dark:border-vit-neutral-750/10 pt-4">
          VIT Chennai • Clubs & Chapters Coordination Hub
        </div>
      </div>
    </div>
  );
}
