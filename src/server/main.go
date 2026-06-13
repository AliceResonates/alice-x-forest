package main

import "encoding/json"

// ==========================================
// 1. JSON-RPC BASE (Der harte I/O Vertrag)
// ==========================================

type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"` // Deferred Parsing für Zero-Overhead
}

type JSONRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int         `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *RPCError   `json:"error,omitempty"`
}

type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// ==========================================
// 2. RESSOURCEN (Alices Wahrnehmung - Phase 2 & 4)
// ==========================================

// Request: Lesen einer MCP-Ressource (z.B. "forest://topology/local" oder "forest://subconscious/flash")
type ReadResourceParams struct {
	URI string `json:"uri"`
}

// Response: Die dynamische JSONB-Ressource für den Scheinwerfer 
type TopologyResourceResult struct {
	Center           EntityState   `json:"center"`
	ImmediateNetwork []EdgePointer `json:"immediate_network"` // Das Array der Kanten
}

// Response: Der flüchtige Fehler-Flash (Trauma Prevention) [2, 3]
type SubconsciousFlashResult struct {
	EntityClass        string       `json:"entity_class"` // "system_node"
	SubType            string       `json:"sub_type"`     // "subconscious_flash"
	Status             string       `json:"status"`
	Memory             FlashMemory  `json:"memory"`
}

type FlashMemory struct {
	FailedIntent          IntentPayload `json:"failed_intent"`
	SystemRejectionReason string        `json:"system_rejection_reason"` // z.B. "insufficient_water"
	SensoryTranslation    string        `json:"sensory_translation"`     // Die kryptische Poesie
}

// ==========================================
// 3. TOOLS (Alices Handlungsmacht - Phase 3)
// ==========================================

// Request: Tool Call vom LLM
type CallToolParams struct {
	Name      string          `json:"name"`      // Muss "submit_intent" sein [3]
	Arguments json.RawMessage `json:"arguments"` // Deferred in IntentPayload
}

// Der universelle Schreib-Flow (submit_intent) [3, 4]
type IntentPayload struct {
	Action         string          `json:"action"`                    // z.B. "nurture", "observe"
	TargetID       string          `json:"target_id,omitempty"`       // UUID des Ziels (z.B. "tree_42")
	Payload        json.RawMessage `json:"payload,omitempty"`         // Optionale tiefe Metadaten
	IdempotencyKey string          `json:"idempotency_key"`           // Für den konfliktfreien Supabase-Handshake [4]