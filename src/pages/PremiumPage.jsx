import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Crown, BadgeCheck, Zap, Shield, Palette, Star } from 'lucide-react';
import Logo from '../components/Logo';

const features = [
  { icon: BadgeCheck, title: 'Verifiziertes Profil', desc: 'Zeige allen, dass du echt bist — mit dem grünen Haken.' },
  { icon: Shield, title: 'Erweiterte Sicherheit', desc: 'Zusätzlicher Schutz für deine Daten und Chats.' },
  { icon: Palette, title: 'Exklusive Themes', desc: 'Besondere Farben und Designs für dein Profil.' },
  { icon: Zap, title: 'Priorität im Feed', desc: 'Deine Beiträge werden bevorzugt angezeigt.' },
  { icon: Star, title: 'Team-Boost', desc: 'Dein Team wird als featured angezeigt.' },
];

export default function PremiumPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
            <Crown className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">
          alice <span className="text-primary">x</span> forest <span className="text-primary">Premium</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Unterstütze die Plattform und erhalte exklusive Vorteile. Dein Beitrag hilft, die Serverkosten zu decken.
        </p>
      </div>

      <div className="space-y-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border-border/60">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Monatlich */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monatlich</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-primary">4,99€</span>
              <span className="text-sm text-muted-foreground">/Monat</span>
            </div>
            <a
              href="https://www.paypal.com/paypalme/YasminGreve/4.99"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full gap-2">
                <PayPalIcon />
                Per PayPal bezahlen
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Jährlich */}
        <Card className="border-primary/30 bg-primary/5 relative overflow-hidden">
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
            SPAR-TIPP
           </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jährlich</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-primary">39,99€</span>
              <span className="text-sm text-muted-foreground">/Jahr</span>
            </div>
            <a
              href="https://www.paypal.com/paypalme/YasminGreve/39.99"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full gap-2">
                <PayPalIcon />
                Per PayPal bezahlen
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* PayPal note */}
      <p className="text-[11px] text-muted-foreground text-center px-4">
        Nach der Zahlung bitte kurz per Chat oder E-Mail melden —
        die Verifizierung wird dann manuell freigeschaltet.{' '}
        <span className="text-primary/70">Yasmin.Greve@gmx.de</span>
      </p>
    </div>
  );
}

function PayPalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.643-8.993 6.643H9.39l-1.167 7.4h3.065c.458 0 .848-.332.92-.784l.038-.194.728-4.615.047-.252a.932.932 0 0 1 .92-.784h.578c3.746 0 6.678-1.522 7.532-5.922.356-1.84.172-3.376-.829-4.205z"/>
    </svg>
  );
}
