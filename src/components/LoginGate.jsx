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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardHeader>
        <CardTitle>Enter the Forest</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Check your inbox ({email}) – the link will log you in directly. 🌲
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              No password needed – you'll receive a login link via email.
            </p>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="your@email.com"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleLogin} disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Link
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
