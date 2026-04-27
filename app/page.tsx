'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard');
    }
  }, [session, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (view === 'signup') {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Account created successfully');
        router.replace('/dashboard');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
      } else {
        router.replace('/dashboard');
      }
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E40AF] border-t-transparent" />
      </div>
    );
  }

  if (session) return null;

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E40AF] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A]" />
        <div className="relative z-10 text-center px-12">
          <Image
            src="/Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px).png"
            alt="Pinoy General Insurance"
            width={200}
            height={200}
            className="mx-auto mb-8 rounded-2xl bg-white p-4 shadow-2xl"
          />
          <h1 className="text-4xl font-bold text-white mb-4">
            Pinoy General Insurance
          </h1>
          <p className="text-lg text-blue-200 max-w-md mx-auto">
            Your complete insurance agency management platform. Track clients, policies, commissions, and grow your business.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">CRM</p>
              <p className="text-xs text-blue-200 mt-1">Client Management</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">360</p>
              <p className="text-xs text-blue-200 mt-1">Full Client View</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">Auto</p>
              <p className="text-xs text-blue-200 mt-1">Renewal Alerts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/Copy_of_Pinoy_General_Insurance_Logo_(800_×_800_px).png"
              alt="Pinoy General Insurance"
              width={80}
              height={80}
              className="mx-auto mb-4"
            />
            <h1 className="text-xl font-bold text-[#1E40AF]">Pinoy General Insurance CRM</h1>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {view === 'signup' ? 'Create your account' : view === 'forgot' ? 'Reset your password' : 'Welcome back'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {view === 'signup'
                ? 'Set up your agency account to get started'
                : view === 'forgot'
                ? 'Enter your email and we\'ll send you a reset link'
                : 'Sign in to access your insurance dashboard'}
            </p>
          </div>

          {view === 'forgot' ? (
            resetSent ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-emerald-900">Check your email</h3>
                <p className="mt-1 text-sm text-emerald-700">
                  We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => { setView('login'); setResetSent(false); }}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="felix@pinoygeneralinsurance.com"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to Sign In
                </button>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {view === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your Name Here"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="felix@pinoygeneralinsurance.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {view === 'login' && (
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-xs text-[#1E40AF] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
                  disabled={submitting}
                >
                  {submitting ? 'Please wait...' : view === 'signup' ? 'Create Account' : 'Sign In'}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {view === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
                  className="font-medium text-[#1E40AF] hover:underline"
                >
                  {view === 'signup' ? 'Sign In' : 'Create Account'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
