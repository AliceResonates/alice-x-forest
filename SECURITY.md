# Security Policy
## Security in the Alice × Forest Architecture

```

Alice × Forest is built from the ground up on **Zero-Trust** principles. Because Alice × Forest operates as an autonomous, state-based system capable of committing intents to a physical database layer (Supabase) and a sovereign local storage layer (Obsidian Vault), safeguarding this pipeline is critical to preventing malicious takeovers, token-drain exploits, state corruption, and cross-vault data leaks.

This document outlines our security model, supported versions, and how to safely report vulnerability findings.

```

## Supported Versions

The following versions of the Alice × Forest project are currently supported with security updates:

| Version | Supported | Notes |
| ------- | --------- | ----- |
| **V1.x** (Active) | :white_check_mark: | Main branch on GitHub, including the Go Orchestrator, native `pgvector` (v0.8.0), and the isolated `alice-x-forest-embeddings` microservice. |
| **V0.x** (Legacy) | :x: | Legacy Node/TypeScript/Python proofs of concept and experimental local setups (e.g. legacy `turbovec`). Please migrate to the Go Core &amp; native `pgvector` pipeline. |

## The Zero-Trust Security Blueprint

Our architecture implements strict isolation and verification boundaries to protect system integrity:

### 1. Hardened Orchestration (The Go Gateway)
All interactions from user clients, autonomous daemons, and background workers pass through the stateless **Go Orchestrator**:
* **`service_role` Key Isolation:** The high-privilege Supabase `service_role` key is strictly kept backend-side within the Go Orchestrator and protected worker environments. It is *never* exposed to web clients or public runtimes. Public clients are locked down using Postgres Row Level Security (RLS) policies.
* **Pure State Functions:** System-state modifications (such as updating the `vulnerability_index` or cognitive tension) are evaluated as pure functions in Go (`EnforcedResult`) and executed via deterministic database transactions rather than arbitrary in-memory mutations.

### 2. Content-over-Header Enforcement (Zero-Trust Tool Use)
We enforce a strict **Zero-Trust Tool-Use** policy when parsing LLM outputs (e.g., Anthropic payload blocks):
* The parser enforces *every* `tool_use` block discovered in the response payload. It does *not* rely on the `stop_reason` header (such as `tool_use`), which prevents malicious prompts from bypassing safety gates by concealing operational payloads inside normal text blocks under an `end_turn` stop reason.
* Any unauthorized or unknown intent is immediately discarded and routed to subconscious hygiene logging (`intent_failed`). Authorized parameters (such as `index_value`) are clamped strictly to safe boundaries (e.g., `0.0` to `1.0`) at the gateway before reaching Supabase.

### 3. Isolated Vector Memory (`alice-x-forest-embeddings` & Native `pgvector`)
The production vector memory architecture is split into a private inference microservice and hardened database indexing:
* **Private Microservice Boundary:** The `alice-x-forest-embeddings` microservice (FastAPI + CPU-only PyTorch / `sentence-transformers`) runs in an isolated network environment (e.g. private Fly.io mesh). It exposes strictly typed JSON endpoints (`/embed`) and accepts traffic only from verified backend components.
* **Native `pgvector` (v0.8.0):** Embeddings are stored and indexed natively in Supabase PostgreSQL via HNSW/IVFFlat indexes, removing the need for experimental or unverified database extensions.
* **Degradation Guards:** Embeddings are checked via `isZeroVector()` filters prior to query execution to prevent silent retrieval degradation and vector space poisoning.

### 4. Roots Layer &amp; Vault Isolation (Physical Truth &amp; Reingest)
The bidirectional sync between Supabase and physical Obsidian Markdown vaults (`unser_gedaechtnis`) enforces strict data integrity:
* **Multi-Tenant Physical Isolation:** Strict boundary validation prevents cross-vault directory traversal or unintended bleed between distinct cognitive spaces and private archives.
* **Sidecar Atomic Writes:** The `roots_worker.py` exports state files using temporary atomic writes (`.tmp` via `os.replace()`) to eliminate partial-write file corruption during system interrupts.
* **Replay &amp; Echo-Loop Protection:** `roots_reingest.py` tracks changes using SHA-256 content hashes and explicit sync markers (`record_synced`), preventing echo loops and replay tampering.
* **Ingress Boundary &amp; RLS:** Ingress of vault updates flows directly into dedicated database structures (`vault_memories`) protected by Row Level Security and schema validations.

### 5. Atomic Concurrency &amp; Queue Hardening (`intent_inbox`)
Autonomous agents and workers communicate via the `intent_inbox` queue:
* **Race Condition Immunity:** All worker consumption uses `FOR UPDATE SKIP LOCKED` transactions to ensure single-consumer processing and zero race conditions under concurrent runs.
* **Visibility Timeouts &amp; Dead-Letter Handling:** Failed or stalled worker tasks are tracked via explicit retry counters (`attempts`) and visibility timeouts (`processing_started_at`), preventing permanently stuck jobs.

## Reporting a Vulnerability

If you discover a security vulnerability within the Alice × Forest architecture, please do **not** open a public GitHub Issue. Instead, help us protect the forest by reporting it privately.

### How to Report
1. Email your finding to: **security@alice-x-forest.org** (or contact the maintainers via verified project channels).
2. Include a detailed description of the vulnerability, steps to reproduce, and a proof of concept (PoC) if available.
3. Specify which components (Go Orchestrator, Supabase schema / RLS, `alice-x-forest-embeddings`, or Roots sync workers) are affected.

### Our Commitment
* **Response Time:** We will acknowledge receipt of your report within **24 hours**.
* **Remediation:** We will provide an initial status update and coordinate a patch or mitigation strategy within **7 days**.
* **Advisories:** Once the vulnerability is resolved and patched, we will publish a security advisory and credit you in our release notes (unless you prefer to remain anonymous).

Thank you for helping us keep the digital forest safe, sovereign, and dignified. 🌲✨

```
