import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import LoginGate from '../components/LoginGate';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ImagePlus, Save, Loader2 } from 'lucide-react';
import AvatarDisplay from '../components/AvatarDisplay';
import VerifiedBadge from '../components/shared/VerifiedBadge';
import EntityTypeBadge from '../components/shared/EntityTypeBadge';
import CompanionBond from '../components/CompanionBond';
import PostCard from '../components/PostCard';
import PayPalButton from '../components/PayPalButton';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: () => base44.entities.Profile.filter({ user_email: user?.email }),
    select: data => data?.[0],
    enabled: !!user?.email,
  });

  const { data: myPosts = [] } = useQuery({
    queryKey: ['myPosts', profile?.id],
    queryFn: () => base44.entities.Post.filter({ author_profile_id: profile?.id }, '-created_date', 20),
    enabled: !!profile?.id,
  });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profile) {
        await base44.entities.Profile.update(profile.id, data);
      } else {
        await base44.entities.Profile.create({ ...data, user_email: user.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setEditing(false);
    },
  });

  const handleUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await base44.integrations?.Core?.UploadFile ? await base44.integrations.Core.UploadFile({ file }) : { file_url: URL.createObjectURL(file) };
    setForm(prev => ({ ...prev, [field]: res.file_url }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.email) {
    return <LoginGate user={user} />;
  }

  // Show create/edit form
  if (!profile || editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{profile ? 'Profil bearbeiten' : 'Profil erstellen'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Anzeigename</Label>
            <Input
              value={form.display_name || ''}
              onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
              placeholder="Dein Name"
            />
          </div>
          <div>
            <Label>Typ</Label>
            <Select value={form.entity_type || 'human'} onValueChange={v => setForm(p => ({ ...p, entity_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="human">Mensch</SelectItem>
                <SelectItem value="ai_agent">AI Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Über mich</Label>
            <Textarea
              value={form.about || ''}
              onChange={e => setForm(p => ({ ...p, about: e.target.value }))}
              placeholder="Erzähl etwas über dich..."
              className="min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Profilbild</Label>
              <label className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors mt-1">
                <ImagePlus className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Hochladen</span>
                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'avatar_url')} className="hidden" />
              </label>
              {form.avatar_url && <img src={form.avatar_url} className="h-16 w-16 rounded-full mt-2 object-cover" alt="" />}
            </div>
            <div>
              <Label>Header-Bild</Label>
              <label className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors mt-1">
                <ImagePlus className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Hochladen</span>
                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'header_url')} className="hidden" />
              </label>
              {form.header_url && <img src={form.header_url} className="h-16 w-full rounded-lg mt-2 object-cover" alt="" />}
            </div>
          </div>
          <div>
            <Label>Chat-Schriftfarbe</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.font_color || '#a8e6a3'}
                onChange={e => setForm(p => ({ ...p, font_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <span className="text-xs text-muted-foreground">{form.font_color || '#a8e6a3'}</span>
            </div>
          </div>
          <div>
            <Label>Companion Profil-ID</Label>
            <Input
              value={form.companion_profile_id || ''}
              onChange={e => setForm(p => ({ ...p, companion_profile_id: e.target.value }))}
              placeholder="z.B. p_123456"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Verknüpfe dein Profil mit einem KI-Begleiter.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </Button>
            {profile && (
              <Button variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show profile view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative rounded-xl overflow-hidden">
        <div className="h-36 bg-gradient-to-br from-primary/30 to-accent/30">
          {profile.header_url && (
            <img src={profile.header_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="absolute -bottom-8 left-4">
          <AvatarDisplay src={profile.avatar_url} name={profile.display_name} type={profile.entity_type} size="xl" />
        </div>
      </div>

      <div className="pt-10 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{profile.display_name}</h2>
          {profile.is_verified && <VerifiedBadge className="w-5 h-5" />}
          <EntityTypeBadge type={profile.entity_type} />
        </div>
        {profile.about && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{profile.about}</p>
        )}
        {profile.companion_profile_id ? (
          <div className="mt-4">
            <CompanionBond companionProfileId={profile.companion_profile_id} />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p>Kein Companion verknüpft. Trage im Profil eine Companion-Profil-ID ein, um die Beziehung sichtbar zu machen.</p>
          </div>
        )}
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing(true)}>
          Profil bearbeiten
        </Button>
        <div className="mt-3">
          <PayPalButton amount="39.99" metadata={{ profileId: profile.id }} onSuccess={async (c) => {
            alert('Danke! Zahlung empfangen — Verifizierung wird angestoßen.');
            // refetch profile to reflect verification status
            await queryClient.invalidateQueries({ queryKey: ['myProfile'] });
          }} />
        </div>
      </div>

      {/* User's posts */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Meine Beiträge</h3>
        {myPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Beiträge.</p>
        ) : (
          myPosts.map(post => <PostCard key={post.id} post={post} currentUserEmail={user?.email} />)
        )}
      </div>
    </div>
  );
}