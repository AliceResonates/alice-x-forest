import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet } from 'react-router-dom';
import ChatRoomList from '../components/ChatRoomList';
import AiPartners from '../components/AiPartners';
import { base44 } from '../api/base44Client';
import { useAuth } from '../contexts/AuthContext';
import UserNotRegisteredError from '../components/UserNotRegisteredError';
import AgbConsentModal from '../components/AgbConsentModal';
import CompanionBond from '../components/CompanionBond';

export default function AppLayout() {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const currentUserEmail = 'dev@local';
  const { authError } = useAuth();

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.ChatRoom.filter({}, '-last_message_at', 50),
  });

  const { data: profileList = [] } = useQuery({
    queryKey: ['profile', currentUserEmail],
    queryFn: () => base44.entities.Profile.filter({ user_email: currentUserEmail }),
  });

  const profile = profileList?.[0] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AgbConsentModal />
      {authError?.type === 'user_not_registered' ? <UserNotRegisteredError /> : null}
      <div className="max-w-6xl mx-auto grid grid-cols-12 gap-6 p-4">
        <aside className="col-span-3 space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-bold">Chats</h2>
            </div>
            <ChatRoomList rooms={rooms} user={{ email: currentUserEmail }} onSelect={setSelectedRoom} />
            <AiPartners />
          </div>
        </aside>

        <main className="col-span-6">
          <Outlet />
        </main>

        <aside className="col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Navigation</h3>
            <nav className="space-y-2 text-sm">
              {[
                { label: 'Feed', to: '/feed' },
                { label: 'Profil', to: '/profile' },
                { label: 'Companions', to: '/companions' },
                { label: 'Teams', to: '/teams' },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-2xl px-3 py-2 transition ${isActive ? 'bg-primary/15 text-primary border border-primary' : 'text-muted-foreground hover:bg-secondary/50'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-primary/70 mb-2">Companion-Zirkel</p>
            <h4 className="text-lg font-semibold">Dein KI-Begleiter</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Finde deinen Companion und verwalte die Beziehung komfortabel.
            </p>
            <Link
              to="/companions"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Zu den Companions
            </Link>
          </div>

          {profile?.companion_profile_id ? (
            <CompanionBond companionProfileId={profile.companion_profile_id} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <p>Kein Companion verknüpft. Füge eine Companion-Profil-ID im Profil hinzu.</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4">
            <Link to="/profile" className="block text-sm font-medium text-primary">Premium & Verifizierung</Link>
            <p className="text-xs text-muted-foreground">Support the Projekt — Verifizierung manuell nach Zahlung</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
