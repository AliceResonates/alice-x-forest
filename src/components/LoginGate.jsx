// src/components/LoginGate.jsx
// Minimaler Magic-Link-Login. Umschließt Seiten, die einen User brauchen:
//   <LoginGate user={user}> ...Seiteninhalt... </LoginGate>
import React, { useState } from 'react';
import { base44 } from '../api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Loader2, Mail } from 'lucide-react';

export default function LoginGate({ user, children }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (user?.email) return children;

  const handleLogin = async () => {
    if (!email.includes('@')) return;
    setBusy(true);
    setError(null);
    try {
      await base44.auth.login(email);
      setSent(true);
    } catch (e) {
      setError(e.message || 'Login fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardHeader>
        <CardTitle>Den Wald betreten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Schau in dein Postfach ({email}) – der Link loggt dich direkt ein. 🌲
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Kein Passwort nötig – du bekommst einen Anmeldelink per E-Mail.
            </p>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="deine@mail.de"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleLogin} disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Link senden
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
