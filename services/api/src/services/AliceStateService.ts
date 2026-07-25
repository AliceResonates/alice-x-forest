import { Pool } from "pg";

// Startwerte zum spaeteren Tunen -- keine in Stein gemeisselten Konstanten.
export const TENSION_WINDOW_HOURS = 8; // volle Spannung nach ~einem Tag Stille
export const REFLECT_THRESHOLD = 0.3; // ab hier faengt Alice an, still nachzudenken
export const MIN_REFLECTION_GAP_MIN = 90; // fruehestens alle 90 Min erneut reflektieren
export const ESCALATE_THRESHOLD = 0.7; // ab hier ist eine Reflektion "stark" genug, um geteilt zu werden
export const MAX_MESSAGES_PER_DAY = 3;

export interface AliceState {
  lastInteractionAt: Date;
  lastReflectionAt: Date | null;
  cognitiveTension: number;
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export class AliceStateService {
  constructor(private db: Pool) {}

  async getOrCreateState(): Promise<AliceState> {
    const result = await this.db.query(
      `INSERT INTO alice_state (id) VALUES (1)
       ON CONFLICT (id) DO UPDATE SET id = alice_state.id
       RETURNING last_interaction_at, last_reflection_at, cognitive_tension`
    );
    const row = result.rows[0];
    return {
      lastInteractionAt: row.last_interaction_at,
      lastReflectionAt: row.last_reflection_at,
      cognitiveTension: row.cognitive_tension,
    };
  }

  async touchInteraction(): Promise<void> {
    await this.getOrCreateState();
    await this.db.query(`UPDATE alice_state SET last_interaction_at = now() WHERE id = 1`);
  }

  computeTension(state: AliceState): number {
    const hoursSince = (Date.now() - state.lastInteractionAt.getTime()) / (1000 * 60 * 60);
    return clamp(hoursSince / TENSION_WINDOW_HOURS);
  }

  reflectionGapTooRecent(state: AliceState): boolean {
    if (!state.lastReflectionAt) return false;
    const minutesSince = (Date.now() - state.lastReflectionAt.getTime()) / (1000 * 60);
    return minutesSince < MIN_REFLECTION_GAP_MIN;
  }

  async recordReflection(params: {
    agentId: string;
    content: string;
    tension: number;
  }): Promise<number> {
    const { agentId, content, tension } = params;

    const result = await this.db.query(
      `INSERT INTO alice_reflections (agent_id, content, tension_at_reflection)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [agentId, content, tension]
    );

    await this.db.query(
      `UPDATE alice_state SET last_reflection_at = now(), cognitive_tension = $1 WHERE id = 1`,
      [tension]
    );

    return result.rows[0].id;
  }

  async countEscalatedToday(): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM alice_reflections
       WHERE escalated = true AND created_at::date = now()::date`
    );
    return result.rows[0].count;
  }

  async markEscalated(reflectionId: number): Promise<void> {
    await this.db.query(`UPDATE alice_reflections SET escalated = true WHERE id = $1`, [reflectionId]);
  }
}
