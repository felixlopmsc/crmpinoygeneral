'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  User,
  Users,
  FileText,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Pinoy General Insurance CRM',
    description: 'Let us help you get started with your insurance agency management platform.',
    icon: Sparkles,
  },
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Add your contact details and license information so your team knows who you are.',
    icon: User,
  },
  {
    id: 'overview',
    title: 'Explore Your Dashboard',
    description: 'Your dashboard gives you a bird\'s-eye view of clients, policies, renewals, and deals at a glance.',
    icon: LayoutDashboard,
  },
  {
    id: 'clients',
    title: 'Manage Your Clients',
    description: 'Add and organize your clients with detailed contact information, tags, and notes. Each client gets a 360-degree view of their policies and activity.',
    icon: Users,
  },
  {
    id: 'policies',
    title: 'Track Your Policies',
    description: 'Create and manage insurance policies with carrier details, premiums, commissions, and automatic renewal tracking.',
    icon: FileText,
  },
  {
    id: 'ready',
    title: 'You\'re All Set!',
    description: 'You\'re ready to start managing your insurance business. You can revisit this guide anytime from the help button in the top bar.',
    icon: Check,
  },
];

export default function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState({
    phone: '',
    licenseNumber: '',
  });
  const [saving, setSaving] = useState(false);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = async () => {
    if (step.id === 'profile' && user) {
      setSaving(true);
      const updates: Record<string, string> = {};
      if (profileData.phone.trim()) updates.phone = profileData.phone.trim();
      if (profileData.licenseNumber.trim()) updates.license_number = profileData.licenseNumber.trim();

      if (Object.keys(updates).length > 0) {
        await supabase.from('users').update(updates).eq('id', user.id);
      }

      await supabase
        .from('onboarding_progress')
        .update({ step_profile: true })
        .eq('user_id', user.id);
      setSaving(false);
    }

    if (step.id === 'overview' && user) {
      await supabase
        .from('onboarding_progress')
        .update({ step_explore_dashboard: true })
        .eq('user_id', user.id);
    }

    if (isLastStep) {
      await handleComplete();
      return;
    }

    setCurrentStep((s) => s + 1);
  };

  const handleComplete = async () => {
    if (!user) return;
    await supabase
      .from('onboarding_progress')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', user.id);
    toast.success('Onboarding complete! Welcome aboard.');
    onComplete();
    router.push('/dashboard');
  };

  const handleSkip = async () => {
    if (!user) return;
    await supabase
      .from('onboarding_progress')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', user.id);
    onComplete();
  };

  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="relative">
          <div className="bg-gradient-to-br from-[#2C3E6B] to-[#1B2A4A] px-6 pt-8 pb-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <StepIcon className="h-8 w-8 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl text-white">{step.title}</DialogTitle>
              <DialogDescription className="text-blue-200 mt-2">
                {step.description}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 -bottom-3 flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === currentStep ? 'w-6 bg-[#2C3E6B]' : i < currentStep ? 'w-1.5 bg-[#2C3E6B]/60' : 'w-1.5 bg-gray-300'
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pt-6 pb-5">
          {step.id === 'profile' && (
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="onb-phone">Phone Number (optional)</Label>
                <Input
                  id="onb-phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData((d) => ({ ...d, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-license">License Number (optional)</Label>
                <Input
                  id="onb-license"
                  value={profileData.licenseNumber}
                  onChange={(e) => setProfileData((d) => ({ ...d, licenseNumber: e.target.value }))}
                  placeholder="e.g. 0H12345"
                />
              </div>
            </div>
          )}

          {step.id === 'overview' && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Clients', desc: 'Contact management', color: 'bg-blue-50 text-blue-700' },
                { label: 'Policies', desc: 'Policy tracking', color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Renewals', desc: 'Auto reminders', color: 'bg-amber-50 text-amber-700' },
                { label: 'Pipeline', desc: 'Sales deals', color: 'bg-teal-50 text-teal-700' },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg p-3 ${item.color}`}>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs opacity-80">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {step.id === 'clients' && (
            <div className="rounded-lg border border-border p-4 mb-6 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#2C3E6B]/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#2C3E6B]" />
                </div>
                <div>
                  <p className="text-sm font-medium">Client 360 View</p>
                  <p className="text-xs text-muted-foreground">Policies, activities, claims, documents - all in one place</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Lead', 'Active', 'Inactive', 'Archived'].map((status) => (
                  <span key={status} className="inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {status}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step.id === 'policies' && (
            <div className="rounded-lg border border-border p-4 mb-6 space-y-3">
              <p className="text-sm font-medium">Supported Policy Types</p>
              <div className="flex flex-wrap gap-1.5">
                {['Auto', 'Home', 'Renters', 'Business', 'Life', 'Umbrella'].map((type) => (
                  <span key={type} className="inline-block rounded-md bg-[#2C3E6B]/10 px-2.5 py-1 text-xs font-medium text-[#2C3E6B]">
                    {type}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Track premiums, commissions, renewal dates, and carrier information for every policy.
              </p>
            </div>
          )}

          {step.id === 'ready' && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 mb-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-emerald-800">Welcome aboard, {user?.full_name?.split(' ')[0] || 'Agent'}!</p>
              <p className="text-xs text-emerald-700 mt-1">
                Start by adding your first client from the Clients page.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              {!isFirstStep && !isLastStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {isFirstStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Skip for now
                </Button>
              )}
            </div>

            <Button
              onClick={handleNext}
              disabled={saving}
              className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20 gap-2"
            >
              {saving ? 'Saving...' : isLastStep ? 'Get Started' : 'Continue'}
              {!isLastStep && !saving && <ChevronRight className="h-4 w-4" />}
              {isLastStep && !saving && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
