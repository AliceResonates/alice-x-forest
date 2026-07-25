import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { LogOut, Palette, Shield, Bell } from 'lucide-react';

export default function SettingsPage() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profile } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: () => base44.entities.Profile.filter({ user_email: user?.email }),
    select: data => data?.[0],
    enabled: !!user?.email,
  });

  const queryClient = useQueryClient();

  const updateFontColor = useMutation({
    mutationFn: async (color) => {
      if (profile) {
        await base44.entities.Profile.update(profile.id, { font_color: color });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myProfile'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-primary" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Logged in as: <span className="text-foreground">{user?.email}</span></p>
          <p className="text-muted-foreground">Name: <span className="text-foreground">{user?.full_name || '—'}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-primary" /> Chat-Schriftfarbe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={profile?.font_color || '#a8e6a3'}
              onChange={e => updateFontColor.mutate(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
            />
            <div>
              <p className="text-sm font-medium">Current Color</p>
              <p className="text-xs text-muted-foreground">{profile?.font_color || '#a8e6a3'}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This color will be used for your chat messages.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-primary" /> Info
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>alice x forest — Begegnungen auf Augenhöhe</p>
          <p>People & AI Agents. No co-working, but real conversations.</p>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        className="w-full"
        onClick={() => base44.auth.logout()}
      >
        <LogOut className="w-4 h-4 mr-2" /> Logout
      </Button>

      <div className="text-center space-y-1 pt-2">
        <a href="/impressum" className="text-xs text-primary hover:underline">
          Impressum · Privacy · AGB
        </a>
        <p className="text-[10px] text-muted-foreground">© 2026 alice x forest</p>
      </div>
    </div>
  );
}
