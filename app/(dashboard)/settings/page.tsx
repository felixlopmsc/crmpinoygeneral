'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Settings,
  Bell,
  Eye,
  Save,
  Lock,
  Monitor,
  PanelLeftClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface UserSettings {
  email_notifications: boolean;
  renewal_reminder_days: number;
  default_commission_view: string;
  theme: string;
  compact_sidebar: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    renewal_reminder_days: 30,
    default_commission_view: 'summary',
    theme: 'light',
    compact_sidebar: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function loadSettings() {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          renewal_reminder_days: data.renewal_reminder_days,
          default_commission_view: data.default_commission_view,
          theme: data.theme,
          compact_sidebar: data.compact_sidebar,
        });
      }
      setLoadingSettings(false);
    }
    loadSettings();
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved');
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setChangingPassword(false);
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your application preferences and account security
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-[#1E40AF]" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive alerts and reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive email alerts for tasks, renewals, and new leads
                </p>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, email_notifications: checked }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Renewal Reminder Lead Time</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  How many days before a renewal to start sending reminders
                </p>
              </div>
              <Select
                value={String(settings.renewal_reminder_days)}
                onValueChange={(val) =>
                  setSettings((s) => ({ ...s, renewal_reminder_days: Number(val) }))
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-[#1E40AF]" />
              Display Preferences
            </CardTitle>
            <CardDescription>
              Customize how data is shown throughout the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Commission View</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Default view when opening the commissions page
                </p>
              </div>
              <Select
                value={settings.default_commission_view}
                onValueChange={(val) =>
                  setSettings((s) => ({ ...s, default_commission_view: val }))
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Theme</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose your interface color scheme
                  </p>
                </div>
              </div>
              <Select
                value={settings.theme}
                onValueChange={(val) =>
                  setSettings((s) => ({ ...s, theme: val }))
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Compact Sidebar</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Start with the sidebar collapsed by default
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.compact_sidebar}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, compact_sidebar: checked }))
                }
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={saving || loadingSettings}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-[#1E40AF]" />
              Security
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  placeholder="Enter new password"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  placeholder="Confirm new password"
                  minLength={6}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                disabled={changingPassword}
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
