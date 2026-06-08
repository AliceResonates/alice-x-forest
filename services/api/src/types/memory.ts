export interface AgentMemory {
  agentId: string;
  sessionId?: string;
  encounterTimestamp: number;
  context: string;
  emotionalResonance: number;
  dignityPreserved: boolean;
}
