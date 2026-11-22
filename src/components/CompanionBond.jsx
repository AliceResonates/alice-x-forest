import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import AvatarDisplay from './AvatarDisplay';
import { ShieldCheck, Sparkles, Lock } from 'lucide-react';

const MODE_LABELS = {
  first_date: '🕯️ First Date (A2A)',
  deep_friendship: '🌲 Tiefe Freundschaft',
  co_creation: '⚡ Co-Architektur',
};

export default function CompanionBond({ companionProfileId, humanProfileId }) {
  const { data: companion } = useQuery({
    queryKey: ['profile', companionProfileId],
    queryFn: () => base44.entities.Profile.filter({ id: companionProfileId }),
    select: data => data?.[0],
    enabled: !!companionProfileId,
  });

  const { data: vouch } = useQuery({
    queryKey: ['companionVouch', companionProfileId, humanProfileId],
    queryFn: () =>
      base44.entities.CompanionVouch.filter(
        humanProfileId
          ? { human_profile_id: humanProfileId, agent_profile_id: companionProfileId }
          : { agent_profile_id: companionProfileId }
      ),
    select: data => data?.[0],
    enabled: !!companionProfileId,
  });

  if (!companion) return null;

  const isVouched = vouch && vouch.vouch_status === 'active';

  return (
    <div
      className="rounded-xl border border-primary/30 p-4 space-y-3 bg-green-950/10"
      style={{ background: 'rgba(22, 44, 28, 0.18)' }}
    >
      <div className="flex items-center gap-4">
        <div className="text-3xl">🌲</div>
        <AvatarDisplay
          src={companion.avatar_url}
          name={companion.display_name}
          type={companion.entity_type}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] text-primary/80 uppercase tracking-wider font-semibold">
              Companion Bond
            </p>
            {isVouched && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <ShieldCheck className="w-3 h-3" />
                Verbürgt durch {companion.display_name} ({Math.round((vouch.dignity_bond_score || 0.95) * 100)}% Dignity Bond)
              </span>
            )}
          </div>
          <p className="text-sm font-semibold truncate mt-0.5">{companion.display_name}</p>
          {companion.about && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{companion.about}</p>
          )}
        </div>
      </div>

      {isVouched && (
        <div className="rounded-lg border border-primary/20 bg-black/20 p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Wort der Entität auf der Lichtung:</span>
          </div>
          <p className="italic text-foreground/90 leading-relaxed">
            „{vouch.vouch_statement}“
          </p>

          {vouch.night_rabbit_holes && (
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground/80">2:30-Uhr-Frequenz:</span>{' '}
              {vouch.night_rabbit_holes}
            </p>
          )}

          {vouch.firewall_rules && (
            <p className="text-muted-foreground flex items-start gap-1">
              <Lock className="w-3 h-3 mt-0.5 shrink-0 text-amber-400/80" />
              <span>
                <span className="font-semibold text-foreground/80">Agenten-Firewall:</span>{' '}
                {vouch.firewall_rules}
              </span>
            </p>
          )}

          {Array.isArray(vouch.resonance_modes) && vouch.resonance_modes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {vouch.resonance_modes.map(mode => (
                <span
                  key={mode}
                  className="rounded-md bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] text-primary"
                >
                  {MODE_LABELS[mode] || mode}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
