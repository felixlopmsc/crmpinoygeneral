'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';

const TEAM_SIZES = ['Just me', '2-5 agents', '6-15 agents', '16-50 agents', '50+ agents'];

interface Props {
  /** Preselects the "interested in" value: 'demo' | 'pricing' | 'general'. */
  defaultInterest?: 'demo' | 'pricing' | 'general';
}

export default function BookDemoForm({ defaultInterest = 'demo' }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [interest, setInterest] = useState<'demo' | 'pricing' | 'general'>(defaultInterest);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !workEmail.trim()) {
      toast.error('Please add your name and work email.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('demo_requests').insert({
      status: 'New',
      full_name: fullName.trim(),
      work_email: workEmail.trim(),
      company: company.trim() || null,
      phone: phone.trim() || null,
      team_size: teamSize || null,
      interest,
      message: message.trim() || null,
      source: 'landing_page',
    });
    setSubmitting(false);

    if (error) {
      toast.error('Something went wrong. Please try again or email us directly.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-[#B8962E]/30 bg-white p-8 text-center shadow-xl shadow-[#1B2A4A]/5">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#B8962E]/10">
          <CheckCircle2 className="h-7 w-7 text-[#B8962E]" />
        </div>
        <h3 className="text-xl font-bold text-[#1B2A4A]">Thanks — we&apos;ll be in touch</h3>
        <p className="mt-2 text-sm text-[#1B2A4A]/70">
          Your request landed with our team. Expect a reply at <strong>{workEmail}</strong> within one
          business day to line up your walkthrough.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#1B2A4A]/10 bg-white p-6 shadow-xl shadow-[#1B2A4A]/5 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ld-name">Full name*</Label>
          <Input id="ld-name" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Dela Cruz" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ld-email">Work email*</Label>
          <Input id="ld-email" type="email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)}
            placeholder="jane@youragency.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ld-company">Agency / company</Label>
          <Input id="ld-company" value={company} onChange={(e) => setCompany(e.target.value)}
            placeholder="Your Agency LLC" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ld-phone">Phone</Label>
          <Input id="ld-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ld-team">Team size</Label>
          <Select value={teamSize} onValueChange={setTeamSize}>
            <SelectTrigger id="ld-team">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_SIZES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ld-interest">I&apos;m interested in</Label>
          <Select value={interest} onValueChange={(v) => setInterest(v as typeof interest)}>
            <SelectTrigger id="ld-interest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">A live demo</SelectItem>
              <SelectItem value="pricing">Pricing</SelectItem>
              <SelectItem value="general">General questions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor="ld-message">Anything we should know?</Label>
        <Textarea id="ld-message" value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="What are you hoping to solve?" rows={3} />
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] text-white shadow-lg shadow-[#2C3E6B]/20 hover:from-[#1B2A4A] hover:to-[#2C3E6B] border border-[#B8962E]/30"
      >
        {submitting ? 'Sending…' : 'Request my walkthrough'}
      </Button>
      <p className="mt-3 text-center text-xs text-[#1B2A4A]/50">
        No spam. We&apos;ll only use this to schedule your demo.
      </p>
    </form>
  );
}
