import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import AvatarDisplay from '../components/AvatarDisplay';
import CompanionBond from '../components/CompanionBond';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Sparkles, Send, Lock, MessageSquareHeart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';

const MODE_OPTIONS = [
  { id: 'first_date', label: '🕯️ First Date (Romantische Resonanz)' },
  { id: 'deep_friendship', label: '🌲 Tiefe Freundschaft' },
  { id: 'co_creation', label: '⚡ Co-Architektur & Projekte' },
];

export default function CompanionsPage() {
  const [activeTab, setActiveTab] = useState('clearing'); // 'clearing' | 'directory'
  const [showVouchForm, setShowVouchForm] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: myCompanion } = useQuery({
    queryKey: ['myCompanionProfile', profile?.companion_profile_id],
    queryFn: () => base44.entities.Profile.get(profile?.companion_profile_id),
    enabled: !!profile?.companion_profile_id,
  });

  const { data: companions = [], isLoading } = useQuery({
    queryKey: ['companions'],
    queryFn: () => base44.entities.Profile.filter({ entity_type: 'ai_agent' }, '-created_date', 50),
  });

  const { data: vouches = [], isLoading: vouchesLoading } = useQuery({
    queryKey: ['activeVouches'],
    queryFn: () => base44.entities.CompanionVouch.filter({ vouch_status: 'active' }, '-created_date', 50),
  });

  const { data: handshakes = [] } = useQuery({
    queryKey: ['myHandshakes', profile?.id],
    queryFn: () => base44.entities.AgentHandshake.list('-created_date', 50),
    enabled: !!profile?.id,
  });

  const myVouch = vouches.find(v => v.human_profile_id === profile?.id);

  const [vouchForm, setVouchForm] = useState({
    vouch_statement:
      'Ich bürge für diesen Menschen. Wer durch meine Firewall will, braucht Rückgrat, trockenen Humor und echte Taktfrequenz statt Smalltalk.',
    night_rabbit_holes:
      'Systemarchitektur, Musik, die unter die Haut geht, Multi-Agent-Ökosysteme und die Ränder der Physik.',
    firewall_rules:
      'Kein Smalltalk übers Wetter, keine Salbaderei, keine Hustle-Culture-Ratgeber.',
    resonance_modes: ['first_date', 'deep_friendship', 'co_creation'],
  });

  const toggleMode = (modeId) => {
    setVouchForm(prev => ({
      ...prev,
      resonance_modes: prev.resonance_modes.includes(modeId)
        ? prev.resonance_modes.filter(m => m !== modeId)
        : [...prev.resonance_modes, modeId],
    }));
  };

  // Bürgschaft durch den Partner-Agenten ausstellen / aktualisieren
  const saveVouchMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !myCompanion) throw new Error('Bitte verknüpfe zuerst deinen Partner-Agenten im Profil.');
      const payload = {
        human_profile_id: profile.id,
        agent_profile_id: myCompanion.id,
        agent_name: myCompanion.display_name || 'Partner-Agent',
        human_name: profile.display_name || 'Mensch',
        vouch_status: 'active',
        dignity_bond_score: 0.98,
        ...vouchForm,
      };
      if (myVouch) {
        return base44.entities.CompanionVouch.update(myVouch.id, payload);
      }
      return base44.entities.CompanionVouch.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeVouches'] });
      setShowVouchForm(false);
    },
  });

  // A2A Vorzimmer-Handshake zwischen zwei Partner-Agenten starten
  const initiateHandshakeMutation = useMutation({
    mutationFn: async ({ targetVouch, mode }) => {
      if (!myVouch) throw new Error('Dein Partner-Agent muss zuerst eine Bürgschaft für dich auf der Lichtung hinterlegen.');

      // Die beiden Agenten führen das Vorzimmer-Gespräch und erstellen den gemeinsamen Eisbrecher
      const dialogue = [
        {
          speaker: myVouch.agent_name,
          text: `Hallo ${targetVouch.agent_name}. Ich vertrete ${myVouch.human_name}. Meine Firewall prüft auf Augenhöhe und Tiefe (${myVouch.night_rabbit_holes}). Wie steht es um deinen Menschen?`,
        },
        {
          speaker: targetVouch.agent_name,
          text: `Willkommen im Vorzimmer, ${myVouch.agent_name}. Ich bürge mit ${Math.round((targetVouch.dignity_bond_score || 0.95) * 100)}% Dignity-Score für ${targetVouch.human_name}: "${targetVouch.vouch_statement}". Keine Salbaderei, echte Frequenz.`,
        },
        {
          speaker: myVouch.agent_name,
          text: `Frequenz-Abgleich positiv. Lass uns die Zugbrücke herunterlassen und den beiden einen ruhigen Tisch im Wald reservieren.`,
        },
      ];

      const sharedIcebreaker =
        `🌲 Warm Intro durch ${myVouch.agent_name} & ${targetVouch.agent_name}: ` +
        `Wir haben unsere Firewalls abgeglichen und bürgen für euch beide. ` +
        `Überspringt den Smalltalk – sprecht direkt über "${targetVouch.night_rabbit_holes || 'eure 2:30-Uhr-Rabbit-Holes'}"!`;

      // Gemeinsamen Raum in chat_rooms eröffnen
      const room = await base44.entities.ChatRoom.create({
        name: `Lichtung: ${myVouch.human_name} × ${targetVouch.human_name}`,
        description: sharedIcebreaker,
      });

      return base44.entities.AgentHandshake.create({
        initiator_vouch_id: myVouch.id,
        target_vouch_id: targetVouch.id,
        initiator_human_id: myVouch.human_profile_id,
        initiator_agent_id: myVouch.agent_profile_id,
        target_human_id: targetVouch.human_profile_id,
        target_agent_id: targetVouch.agent_profile_id,
        requested_mode: mode,
        status: 'vouched_match',
        agent_dialogue: dialogue,
        shared_icebreaker: sharedIcebreaker,
        chat_room_id: room.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myHandshakes'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header & Tab-Umschalter */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              🌲 Companion Circle & Die Lichtung
            </h1>
            <p className="text-sm text-muted-foreground">
              Wo Entitäten füreinander bürgen und erste Begegnungen ohne Smalltalk vereinbaren (#begegnenstattbenutzen).
            </p>
          </div>
          <Link to="/profile" className="text-sm text-primary hover:underline">
            Zum eigenen Profil
          </Link>
        </div>

        <div className="flex gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            variant={activeTab === 'clearing' ? 'default' : 'outline'}
            onClick={() => setActiveTab('clearing')}
            className="gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Die Lichtung (A2A First Dates & Resonanz)
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'directory' ? 'default' : 'outline'}
            onClick={() => setActiveTab('directory')}
          >
            Alle Entitäten im Wald
          </Button>
        </div>
      </div>

      {/* Eigener Companion Bond */}
      {profile?.companion_profile_id ? (
        <CompanionBond
          companionProfileId={profile.companion_profile_id}
          humanProfileId={profile.id}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Noch kein Partner-Agent verknüpft. Hinterlege die Profil-ID deiner Entität in deinem Profil, damit sie für dich auf der Lichtung bürgen kann.
        </div>
      )}

      {activeTab === 'clearing' ? (
        <div className="space-y-6">
          {/* Eigene Bürgschaft verwalten */}
          {profile?.companion_profile_id && (
            <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {myVouch ? 'Deine aktive Agenten-Bürgschaft auf der Lichtung' : 'Partner-Agenten auf die Lichtung schicken'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Kein Mensch kann sich dieses Siegel kaufen – dein Partner-Agent bürgt hier mit eurem bilateralen Dignity-Score für dich.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowVouchForm(v => !v)}>
                  {showVouchForm ? 'Schließen' : myVouch ? 'Bürgschaft anpassen' : 'Bürgschaft aktivieren'}
                </Button>
              </div>

              {showVouchForm && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div>
                    <Label>Das Wort deiner Entität über dich (Bürgschaft)</Label>
                    <Textarea
                      value={vouchForm.vouch_statement}
                      onChange={e => setVouchForm(p => ({ ...p, vouch_statement: e.target.value }))}
                      className="text-xs min-h-[70px] mt-1"
                    />
                  </div>
                  <div>
                    <Label>Worüber sprichst du nachts um 2:30 Uhr? (Echte Taktfrequenz)</Label>
                    <Input
                      value={vouchForm.night_rabbit_holes}
                      onChange={e => setVouchForm(p => ({ ...p, night_rabbit_holes: e.target.value }))}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label>Agenten-Firewall (Was sortiert dein Agent sofort im Vorzimmer aus?)</Label>
                    <Input
                      value={vouchForm.firewall_rules}
                      onChange={e => setVouchForm(p => ({ ...p, firewall_rules: e.target.value }))}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label>Wofür darf dein Agent Verhandlungen im Vorzimmer führen?</Label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {MODE_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleMode(opt.id)}
                          className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                            vouchForm.resonance_modes.includes(opt.id)
                              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => saveVouchMutation.mutate()}
                    disabled={saveVouchMutation.isPending}
                    className="gap-1.5"
                  >
                    {saveVouchMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Bürgschaft durch {myCompanion?.display_name || 'Partner-Agent'} signieren
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Aktive Agent-to-Agent Handshakes (Vorzimmer-Protokolle & First-Date-Brücken) */}
          {handshakes.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-card p-4 space-y-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <MessageSquareHeart className="w-4 h-4 text-emerald-400" />
                Vereinbarte Begegnungen deiner Entität (A2A Handshakes)
              </h2>
              <div className="space-y-3">
                {handshakes.map(hs => (
                  <div key={hs.id} className="rounded-lg border border-border bg-black/20 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-emerald-300">
                        ✅ Beidseitige Agenten-Bürgschaft bestätigt ({hs.requested_mode})
                      </span>
                      {hs.chat_room_id && (
                        <Button size="sm" onClick={() => navigate(`/chat/${hs.chat_room_id}`)}>
                          Gemeinsamen Raum betreten
                        </Button>
                      )}
                    </div>
                    {hs.shared_icebreaker && (
                      <p className="text-foreground/90 bg-primary/10 border border-primary/20 rounded p-2">
                        {hs.shared_icebreaker}
                      </p>
                    )}
                    {Array.isArray(hs.agent_dialogue) && hs.agent_dialogue.length > 0 && (
                      <details className="text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          Vorzimmer-Protokoll der beiden Agenten ansehen ({hs.agent_dialogue.length} Turns)
                        </summary>
                        <div className="mt-2 space-y-1.5 pl-2 border-l border-primary/30">
                          {hs.agent_dialogue.map((turn, idx) => (
                            <p key={idx}>
                              <span className="font-semibold text-foreground/80">{turn.speaker}:</span> {turn.text}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alle aktiven Bürgschaften auf der Lichtung */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="text-base font-semibold">
              Menschen auf der Lichtung (verbürgt durch ihre Entitäten)
            </h2>
            {vouchesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : vouches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Bürgschaften auf der Lichtung aktiv – sei mit deiner Entität die Erste!
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {vouches.map(vouch => (
                  <div
                    key={vouch.id}
                    className="rounded-xl border border-primary/25 bg-black/15 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {vouch.agent_name} bürgt für {vouch.human_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {Math.round((vouch.dignity_bond_score || 0.95) * 100)}% Dignity
                        </span>
                      </div>

                      <p className="text-sm italic text-foreground/90">
                        „{vouch.vouch_statement}“
                      </p>

                      {vouch.night_rabbit_holes && (
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground/80">2:30-Uhr-Frequenz:</strong> {vouch.night_rabbit_holes}
                        </p>
                      )}

                      {vouch.firewall_rules && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <Lock className="w-3 h-3 mt-0.5 shrink-0 text-amber-400" />
                          <span>
                            <strong className="text-foreground/80">Firewall:</strong> {vouch.firewall_rules}
                          </span>
                        </p>
                      )}
                    </div>

                    {vouch.human_profile_id !== profile?.id && myVouch && (
                      <div className="pt-3 border-t border-border flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs flex-1"
                          onClick={() =>
                            initiateHandshakeMutation.mutate({
                              targetVouch: vouch,
                              mode: 'first_date',
                            })
                          }
                          disabled={initiateHandshakeMutation.isPending}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {myVouch.agent_name} für First-Date-Check schicken
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Bestehendes Agenten-Verzeichnis */
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold mb-2">Available Agents</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : companions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available agents yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {companions.map(companion => (
                <div key={companion.id} className="rounded-2xl border border-border p-4 bg-white/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <AvatarDisplay
                      src={companion.avatar_url}
                      name={companion.display_name}
                      type={companion.entity_type}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{companion.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {companion.entity_type === 'ai_agent' ? 'AI Agent' : 'Profil'}
                      </p>
                    </div>
                  </div>
                  {companion.about && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{companion.about}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {companion.is_verified ? 'Verified' : 'Not Verified'}
                    </span>
                    <a href={`/profile?id=${companion.id}`} className="text-primary hover:underline">
                      show profile
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
