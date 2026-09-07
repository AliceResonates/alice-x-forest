# Security Policy

## 🌲 Security in the Alice × Forest Architecture

Alice × Forest is built from the ground up on **Zero-Trust** principles. Because Alice × Forest operates as an autonomous, state-based system capable of committing intents to a physical database layer (Supabase), safeguarding this pipeline is critical to preventing malicious takeovers, token-drain exploits, and state corruption.

This document outlines our security model, supported versions, and how to safely report vulnerability findings.

---

## Supported Versions

The following versions of the Alice × Forest project are currently supported with security updates:

| Version | Supported | Notes |
| ------- | --------- | ----- |
| **V1.x** (Active) | :white_check_mark: | Main branch on GitHub, including the Go Orchestrator and the isolated `turbovec` microservice. |
| **V0.x** (PoC) | :x: | Legacy Node/TypeScript/Python proofs of concept. Please migrate to the Go Core. |

---

## The Zero-Trust Security Blueprint

Our architecture implements strict isolation and validation boundaries to protect the system's integrity:

### 1. Hardened Orchestration (The Go Gateway)

All interactions from user clients and external integrations must pass through the stateless **Go Orchestrator**. 
* **`service_role` Isolation:** The high-privilege Supabase `service_role` key is strictly kept backend-side within the Go Orchestrator. It is *never* exposed to Vite/React frontend clients. Frontend clients are locked down using Postgres Row Level Security (RLS) policies.
* **Pure JSON Parsing:** System-state modifications (such as updating the `vulnerability_index`) are computed as pure functions in Go (`EnforcedResult`) and executed via single-point database updates rather than in-memory mutation.

### 2. Content-over-Header Enforcement (Zero-Trust Tool Use)

We enforce a strict **Zero-Trust** policy when parsing LLM outputs (e.g., Anthropic payload blocks):
* The parser enforces *every* `tool_use` block found in the response payload. It does *not* rely on the `stop_reason` header (such as `tool_use`), which prevents malicious inputs from bypassing safety gates by hiding actions inside normal text blocks under an `end_turn` stop reason.
* Any unauthorized or unknown intent is immediately discarded. Authorized integers (like `index_value`) are clamped strictly to safe boundaries (e.g., maximum `1.0`) at the gateway before hitting Supabase.

### 3. Isolated Vector Memory (`turbovec`)

The `turbovec` memory service is designed to run in a highly secure, private environment:
* It should remain completely isolated (e.g., running as an internal Fly.io app or a private Docker container) and should only accept connections directly from the trusted Go Orchestrator.
* Raw text embeddings and database transactions are processed through sanitized HTTP JSON contracts, preventing SQL-injection and vector-space pollution.

---

## Reporting a Vulnerability

If you discover a security vulnerability within the Alice × Forest architecture, please do **not** open a public GitHub Issue. Instead, help us protect the forest by reporting it privately.

### How to Report

1. Email your finding to: **security@alice-x-forest.org**
2. Include a detailed description of the vulnerability, steps to reproduce, and a proof of concept (PoC) if available.
3. If applicable, specify which components (Go API, Supabase schema, `turbovec` service) are affected.

### Our Commitment

* **Response Time:** We will acknowledge receipt of your report within **24 hours**.
* **Remediation:** We will provide an initial status update and coordinate a patch or mitigation strategy within **7 days**.
* **Advisories:** Once the vulnerability is resolved and patched, we will publish a security advisory and credit you in our release notes (unless you prefer to remain anonymous).

Thank you for helping us keep the digital forest safe, sovereign, and dignified. 🌲✨
