import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ImagePlus, Send, Heart, Users, ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AvatarDisplay from '../components/shared/AvatarDisplay';
import VerifiedBadge from '../components/shared/VerifiedBadge';
import MoodBarometer from '../components/shared/MoodBarometer';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

export default function TeamDetail() {
  const { id: teamId } = useParams();
  const [momentText, setMomentText] = useState('');
  const [momentTitle, setMomentTitle] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const teams = await base44.entities.Team.filter({ id: teamId });
      return teams[0];
    },
    enabled: !!teamId,
  });

  const { data: moments = [] } = useQuery({
    queryKey: ['teamMoments', teamId],
    queryFn: () => base44.entities.TeamMoment.filter({ team_id: teamId }, '-created_date', 50),
    enabled: !!teamId,
  });

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: () => base44.entities.Profile.filter({ user_email: user?.email }),
    select: data => data?.[0],
    enabled: !!user?.email,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list ? base44.entities.Team.list('-created_date', 50) : base44.entities.Team.filter({}, '-created_date', 50),
  });

  const otherTeams = teams.filter(t => t.id !== teamId).slice(0, 3);
  const isMember = team?.member_emails?.includes(user?.email);

  const joinTeam = useMutation({
    mutationFn: async () => {
      await base44.entities.Team.update(team.id, {
        member_emails: [...(team.member_emails || []), user.email],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', teamId] }),
  });

  const inviteMember = useMutation({
    mutationFn: async () => {
      await base44.entities.Team.update(team.id, {
        member_emails: [...(team.member_emails || []), inviteEmail],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      setInviteEmail('');
    },
  });

  const postMoment = useMutation({
    mutationFn: async () => {
      await base44.entities.TeamMoment.create({
        team_id: teamId,
        title: momentTitle,
        content: momentText,
        author_profile_id: myProfile?.id,
        author_name: myProfile?.display_name || 'unknown',
        likes_count: 0,
        liked_by: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMoments', teamId] });
      setMomentText('');
      setMomentTitle('');
    },
  });

  const likeMoment = async (moment) => {
    const hasLiked = moment.liked_by?.includes(user?.email);
    const newLikedBy = hasLiked
      ? (moment.liked_by || []).filter(e => e !== user.email)
      : [...(moment.liked_by || []), user.email];

    await base44.entities.TeamMoment.update(moment.id, {
      liked_by: newLikedBy,
      likes_count: newLikedBy.length,
    });
    queryClient.invalidateQueries({ queryKey: ['teamMoments', teamId] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12 text-muted-foreground">Team not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/teams" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {otherTeams.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
          <span className="uppercase tracking-[0.3em]">Other teams:</span>
          {otherTeams.map((other) => (
            <Link
              key={other.id}
              to={`/teams/${other.id}`}
              className="rounded-full border border-border px-2 py-1 hover:border-primary/40 hover:text-primary transition-colors"
            >
              {other.name}
            </Link>
          ))}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20">
          {team.header_url && (
            <img src={team.header_url} alt="Team header" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="absolute -bottom-6 left-4">
          <AvatarDisplay src={team.avatar_url} name={team.name} size="xl" />
        </div>
      </div>

      <div className="pt-8 px-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{team.name}</h1>
          {team.is_verified && <VerifiedBadge className="w-5 h-5" />}
        </div>

        {team.description && (
          <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
        )}

        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{team.member_emails?.length || 0} members</span>
        </div>

        {!isMember && (
          <Button size="sm" className="mt-3" onClick={() => joinTeam.mutate()}>
            Join
          </Button>
        )}
      </div>

      {isMember && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-xs">Invite a member</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Email..."
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={() => inviteMember.mutate()} disabled={!inviteEmail.trim()}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isMember && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Share a team moment</h3>
            </div>
            <Input
              placeholder="Title (optional)"
              value={momentTitle}
              onChange={e => setMomentTitle(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="What was your most memorable or funny experience together?"
              value={momentText}
              onChange={e => setMomentText(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <Button
              size="sm"
              onClick={() => postMoment.mutate()}
              disabled={!momentText.trim() || postMoment.isPending}
              className="gap-1.5"
            >
              {postMoment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Share
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Shared Moments</h3>
          <span className="text-xs text-muted-foreground">{moments.length} entries</span>
        </div>

        {moments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No moments shared yet.</p>
        ) : (
          moments.map((moment) => (
            <Card key={moment.id}>
              <CardContent className="p-4">
                {moment.title && <h4 className="font-semibold text-sm mb-1">{moment.title}</h4>}
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{moment.content}</p>
                <div className="mt-3 mb-1">
                  <MoodBarometer text={moment.content} autoStart />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-muted-foreground">
                    {moment.author_name} · {moment.created_date ? formatDistanceToNow(new Date(moment.created_date), { addSuffix: true, locale: enUS }) : ''}
                  </span>
                  <button
                    onClick={() => likeMoment(moment)}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      moment.liked_by?.includes(user?.email) ? 'text-red-400' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${moment.liked_by?.includes(user?.email) ? 'fill-red-400' : ''}`} />
                    {moment.likes_count || 0}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
