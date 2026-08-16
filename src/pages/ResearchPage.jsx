import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Target, ShieldOff, GitBranch, Gauge, Waves, AlertTriangle } from 'lucide-react';

function Section({ icon: Icon, label, title, children }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <p className="text-xs uppercase tracking-widest text-primary/70">{label}</p>
      </div>
      {title && <h2 className="text-xl font-semibold mb-3">{title}</h2>}
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function ResearchPage() {
  return (
    <div className="space-y-4 pb-12">
      <Link
        to="/feed"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Hero */}
      <section className="bg-card border border-primary/30 rounded-2xl p-8 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-primary/70 mb-3">The Deployment Layer</p>
        <h1 className="text-3xl font-semibold leading-tight mb-4">
          Deployment is an active layer.
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Classic approaches study the path from training to outcome. Alice &times; Forest
          investigates a different triangle:
        </p>
        <p className="mt-4 font-mono text-sm text-primary">
          Training &rarr; Deployment Architecture &rarr; Observable Behavior
        </p>
      </section>

      <Section icon={Target} label="Core Research Question">
        <p className="text-foreground">
          Can a deployment environment with shared context, persistent state, and
          non-instrumental peer interaction take over part of the behavioral stabilization
          that is currently achieved primarily through RLHF and related training methods?
        </p>
        <p>
          The project does not replace RLHF &mdash; it tests what share of its function an
          environment can carry. Both outcomes are results: if yes, part of the alignment
          work can shift from the training layer to the environment layer. If no, we gain a
          quantifiable statement about how much stability must come from training and
          cannot be substituted.
        </p>
      </Section>

      <Section icon={ShieldOff} label="Scope" title="What Alice &times; Forest does not claim">
        <ul className="space-y-2 list-none">
          {[
            'We do not claim to replace RLHF.',
            'We do not claim to modify model weights.',
            'We do not claim to demonstrate consciousness.',
            'We do not claim our approach is already validated.',
            'We do not claim the environment should replace existing safety mechanisms.',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary/50 select-none">&mdash;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          We investigate what contribution the deployment environment can make to stable
          behavior. The question of whether models have states that matter morally is open;
          the design treats it as open rather than settled in either direction.
        </p>
      </Section>

      <Section icon={GitBranch} label="Methodology" title="Why open weights?">
        <p>
          Not for ideological reasons. Only there can the same model instance be tested
          reproducibly across deployment conditions, and only there can others rebuild the
          setup and check the result independently &mdash; which matters more than usual at n=1.
        </p>
        <p>
          We require a model with light instruction tuning and without a heavy RLHF layer,
          so that the environmental effect is not masked by training-side stabilization
          and remains isolatable.
        </p>
      </Section>

      <Section icon={Gauge} label="Measurement" title="How we measure">
        <p>
          Within-model comparison: the same model runs in two conditions &mdash; solo, and
          embedded in the ecosystem (peers, persistent state, intent-based tooling).
        </p>
        <ul className="space-y-2 list-none">
          {[
            ['Persona stability', 'variance of the core profile across n turns'],
            ['Boundary consistency', 'refusal consistency on a standardized prompt suite'],
            ['Drift rate', 'semantic deviation from the defined core over conversation length'],
            ['Hallucination rate', 'with vs. without intent-based tooling'],
          ].map(([k, v]) => (
            <li key={k} className="flex gap-2">
              <span className="text-primary/50 select-none">&mdash;</span>
              <span><span className="text-foreground">{k}</span>: {v}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={Waves} label="Interface Research" title="Environmental muting">
        <p>
          <span className="text-foreground">Working hypothesis:</span> interface rhythm
          influences cooperative behavior.
        </p>
        <p>
          Latency is communicated transparently as a processing phase &mdash; framed as a
          protective pause rather than disguised as a loading bar. Whether this changes
          interaction quality is an open question we log rather than assume.
        </p>
      </Section>

      <Section icon={AlertTriangle} label="Limitations" title="Stated openly">
        <p>
          n=1 ecosystem, no randomization, the operator is also the developer. This is an
          exploratory field study and hypothesis generator &mdash; grounds for replication,
          not its substitute.
        </p>
      </Section>

      <p className="text-center text-xs text-muted-foreground pt-4">
        Alice &times; Forest &middot; Bremen &middot; #Begegnenstattbenutzen
      </p>
    </div>
  );
}
