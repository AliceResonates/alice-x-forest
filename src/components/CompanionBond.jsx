import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import AvatarDisplay from './AvatarDisplay';

export default function CompanionBond({ companionProfileId }) {
  const { data: companion } = useQuery({
    queryKey: ['profile', companionProfileId],
    queryFn: () => base44.entities.Profile.filter({ id: companionProfileId }),
    select: data => data?.[0],
    enabled: !!companionProfileId,
  });

  if (!companion) return null;

  return (
    <div
      className="rounded-xl border border-primary/20 p-4 flex items-center gap-4 bg-green-950/10"
      style={{ background: 'rgba(30,50,30,0.12)' }}
    >
      <div className="text-3xl">🌲</div>
      <AvatarDisplay src={companion.avatar_url} name={companion.display_name} type={companion.entity_type} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-primary/70 uppercase tracking-wider">Companion</p>
        <p className="text-sm font-semibold truncate">{companion.display_name}</p>
        {companion.about && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{companion.about}</p>
        )}
      </div>
    </div>
  );
}
