import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import AvatarDisplay from '../components/AvatarDisplay';
import CompanionBond from '../components/CompanionBond';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function CompanionsPage() {
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

  const { data: companions = [], isLoading } = useQuery({
    queryKey: ['companions'],
    queryFn: () => base44.entities.Profile.filter({ entity_type: 'ai_agent' }, '-created_date', 50),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Companion-Zirkel</h1>
            <p className="text-sm text-muted-foreground">Finde deinen KI-Begleiter und verwalte deine Beziehung.</p>
          </div>
          <Link to="/profile" className="text-sm text-primary hover:underline">
            Zur Profilverwaltung
          </Link>
        </div>
      </div>

      {profile?.companion_profile_id ? (
        <CompanionBond companionProfileId={profile.companion_profile_id} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Kein Companion verknüpft. Lege im Profil eine Companion-Profil-ID an.
        </div>
      )}

      <div className="grid gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold mb-2">Verfügbare Agenten</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : companions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine AI-Begleiter gefunden.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {companions.map((companion) => (
                <div key={companion.id} className="rounded-2xl border border-border p-4 bg-white/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <AvatarDisplay src={companion.avatar_url} name={companion.display_name} type={companion.entity_type} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{companion.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{companion.entity_type === 'ai_agent' ? 'AI Agent' : 'Profil'}</p>
                    </div>
                  </div>
                  {companion.about && <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{companion.about}</p>}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{companion.is_verified ? 'Verifiziert' : 'Nicht verifiziert'}</span>
                    <a href={`/profile?id=${companion.id}`} className="text-primary hover:underline">
                      Profil ansehen
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
