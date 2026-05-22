import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Users, Loader2, ImagePlus, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import AvatarDisplay from '../components/shared/AvatarDisplay';
import VerifiedBadge from '../components/shared/VerifiedBadge';

export default function TeamsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', avatar_url: '' });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list ? base44.entities.Team.list('-created_date', 50) : base44.entities.Team.filter({}, '-created_date', 50),
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      await base44.entities.Team.create({
        ...form,
        member_emails: [user?.email].filter(Boolean),
        member_profile_ids: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreate(false);
      setForm({ name: '', description: '', avatar_url: '' });
    },
  });

  const handleUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, [field]: res.file_url }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Teams</h1>
          <p className="text-xs text-muted-foreground mt-1">Humans & AI — stronger together</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Create team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Team Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Forest Wanderers"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What makes your team special?"
                />
              </div>
              <div>
                <Label>Team Avatar</Label>
                <label className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors mt-1">
                  <ImagePlus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                  <input type="file" accept="image/*" onChange={e => handleUpload(e, 'avatar_url')} className="hidden" />
                </label>
                {form.avatar_url && (
                  <img src={form.avatar_url} className="h-16 w-16 rounded-full mt-2 object-cover" alt="Team avatar" />
                )}
              </div>
              <Button
                onClick={() => createTeam.mutate()}
                disabled={!form.name.trim() || createTeam.isPending}
                className="w-full"
              >
                {createTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No teams yet. Create the first one!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map(team => (
            <Link key={team.id} to={`/teams/${team.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <AvatarDisplay src={team.avatar_url} name={team.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{team.name}</span>
                      {team.is_verified && <VerifiedBadge />}
                    </div>
                    {team.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{team.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{team.member_emails?.length || 0} members</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
