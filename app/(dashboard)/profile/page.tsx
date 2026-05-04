'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatDate, formatPhone } from '@/lib/format';
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Award,
  Save,
  Camera,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getInitials } from '@/lib/format';

export default function ProfilePage() {
  const { user, session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiration, setLicenseExpiration] = useState('');
  const [stats, setStats] = useState({ clients: 0, policies: 0, deals: 0 });

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setLicenseNumber(user.license_number || '');
      setLicenseExpiration(user.license_expiration || '');
    }
  }, [user]);

  useEffect(() => {
    if (!session) return;
    async function loadStats() {
      const [clientsRes, policiesRes, dealsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('policies').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'Open'),
      ]);
      setStats({
        clients: clientsRes.count || 0,
        policies: policiesRes.count || 0,
        deals: dealsRes.count || 0,
      });
    }
    loadStats();
  }, [session]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        license_number: licenseNumber.trim(),
        license_expiration: licenseExpiration || null,
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
    }
    setSaving(false);
  };

  if (!user) return null;

  const roleBadgeColor: Record<string, string> = {
    Admin: 'bg-red-100 text-red-700 border-red-200',
    Agent: 'bg-blue-100 text-blue-700 border-blue-200',
    Viewer: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal information and license details
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <Avatar className="h-24 w-24">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />}
                  <AvatarFallback className="bg-[#1E40AF] text-2xl text-white">
                    {getInitials(user.full_name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error('Image must be under 2MB');
                        return;
                      }
                      const ext = file.name.split('.').pop();
                      const path = `avatars/${user.id}.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(path, file, { upsert: true });
                      if (uploadError) {
                        toast.error('Upload failed: ' + uploadError.message);
                        return;
                      }
                      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
                      const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
                      await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id);
                      toast.success('Avatar updated');
                      window.location.reload();
                    }}
                  />
                </label>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{user.full_name || 'No name set'}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="outline" className={`mt-2 ${roleBadgeColor[user.role] || ''}`}>
                {user.role}
              </Badge>

              <Separator className="my-5" />

              <div className="w-full space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatPhone(user.phone)}</span>
                  </div>
                )}
                {user.license_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{user.license_number}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Joined {formatDate(user.created_at.split('T')[0])}
                  </span>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid w-full grid-cols-3 gap-2">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-lg font-bold text-[#1E40AF]">{stats.clients}</p>
                  <p className="text-[11px] text-muted-foreground">Clients</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-lg font-bold text-[#1E40AF]">{stats.policies}</p>
                  <p className="text-[11px] text-muted-foreground">Policies</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-lg font-bold text-[#1E40AF]">{stats.deals}</p>
                  <p className="text-[11px] text-muted-foreground">Open Deals</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-[#1E40AF]" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={user.role}
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold mb-4">
                <Briefcase className="h-4 w-4 text-[#1E40AF]" />
                License Information
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. 0H12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseExpiration">License Expiration</Label>
                  <Input
                    id="licenseExpiration"
                    type="date"
                    value={licenseExpiration}
                    onChange={(e) => setLicenseExpiration(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
