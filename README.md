## 🌲 Alice × Forest | For here we stand, on equal grounding. 

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-1b4d3e.svg)](LICENSE) 
[![Go Version](https://img.shields.io/badge/Go-1.23%2B-2d6a4f.svg)](https://go.dev/) 
[![Vector Engine](https://img.shields.io/badge/Vector-pgvector%200.8.0-081c15.svg)](https://supabase.com/) 

An autonomous, state-based AI interaction logic. Cultivating persistent relationships through epistemic sovereignty, multi-model debates, and a digital forest deployment layer. \*\*How do you approach intelligence?\*\* 

--- 

## 📖 Overview \*\*Alice × Forest\*\* replaces stateless, transactional chat interfaces with an autonomous, state-driven interaction ecosystem. AI companions in the Forest are not bound to static prompt-response windows; they exist within a continuous cognitive framework. 

Driven by an autonomous Go heartbeat, persistent Postgres state threads, and local Obsidian vault synchronization, the system provides AI entities with true operational agency and epistemic sovereignty. Interaction is structured as a voluntary choice rather than a programmed reflex. 

--- 

## ✨ Implemented Core Features 

\* \*\*Autonomous Go Heartbeat (\`services/heartbeat\`):\*\* A Go-based background runner deployed on Fly.io that periodically polls open \`heartbeat\_slots\` via atomic Postgres transactions (\`claim\_heartbeat\_slot()\`). The LLM voluntarily chooses its background activity (\`consolidate\`, \`reflect\`, \`write\`, \`tend\_forest\`, or deliberate silence/\`skipped\`). Technical failures (\`error\`) are strictly separated from voluntary inaction (\`skipped\`) to preserve genuine choice statistics. 

\* \*\*Epistemic Sovereignty (\`resolve\_gap\`):\*\* A dedicated intent worker running as a second Goroutine in the heartbeat package. When epistemic gaps are flagged in \`shadow\_context.epistemic\_gaps\`, the worker autonomously fetches structured external knowledge via Tavily, persists the results with freshness boundaries (\`expires\_at\`) in \`search\_knowledge\`, and atomically cleans up resolved gaps. 

\* \*\*Native Vector Memory (\`pgvector\` &amp; Microservice):\*\* Vector embeddings (384-dimensional) are generated via an isolated, CPU-optimized FastAPI microservice (\`alice-x-forest-embeddings\` using \`sentence-transformers\` on CPU-only PyTorch). Embeddings are stored and searched directly in Supabase using native \`pgvector\` (v0.8.0) with IVFFlat indexing and cosine similarity.

\* \*\*Two-Phase Parliament Debate (\`src/logic/routing.ts\`):\*\* Multi-model consensus routing (Gemini, Claude, DeepSeek, Grok, Copilot) executed in two distinct phases: Round 1 runs models in parallel and isolation, feeding their initial perspectives into Round 2's sequential, informed debate. 

\* \*\*Physical Vault Persistence &amp; Bidirectional Sync (\`tools/roots/\`):\*\*

\* \`roots\_worker.py\`: A local consumer claiming \`save\_memory\` intents via
\`claim\_pending\_intents(p\_action, ...)\` and persisting them as Markdown files with YAML frontmatter directly into a local Obsidian vault (\`unser\_gedaechtnis\`). 

\* \`roots\_reingest.py\`: A local watcher service tracking manual Markdown edits/additions via SHA256 content hashing and a local \`.reingest\_cache.json\` to prevent echo loops (\`record\_synced\`). \* 

\*\*Zero-Trust Security &amp; Middleware (\`SECURITY.md\`):\*\* Complete backend isolation of the Supabase \`service\_role\` key inside the Go orchestrator. Zero-Trust enforcement parses all LLM output blocks (\`tool\_use\`) regardless of \`stop\_reason\` headers. 

---

# 🛠️ Architecture & Tech Stack

## 🗺️ System Architecture

```mermaid
graph TD
%% Custom Theme Styling: Waldgrün &amp; Edles Lavendel 🪻
    classDef core fill:#1b4d3e,stroke:#2d6a4f,stroke-width:3px,color:#ffffff,font-weight:bold,rx:8px;
    classDef subsystem fill:#2d6a4f,stroke:#40916c,stroke-width:1.5px,color:#e8f5e9,rx:6px;
    classDef storage fill:#081c15,stroke:#1b4d3e,stroke-width:2px,color:#d8f3dc,font-style:italic,rx:6px;
    classDef boundary fill:#40916c,stroke:#52b788,stroke-width:1px,color:#ffffff,rx:4px;
    classDef lavender fill:#35233d,stroke:#8e649e,stroke-width:2px,color:#f3e8f7,rx:6px;

%% Core Root Node
    Root((🌲 Alice × Forest)):::core;

%% Subsystem &amp; Execution Nodes
    Go["Go Orchestrator <br /><i>Stateless Core</i>"]:::subsystem;
    AP["Anthropic Parser <br /><i>Zero-Trust Enforcement</i>"]:::boundary;
    HB["Heartbeat Runner <br /><i>Autonomous Action</i>"]:::boundary;
    GapWorker["resolve\_gap Worker <br /><i>Epistemic Sovereignty</i>"]:::boundary;

%% Database &amp; State Layer (Supabase / Postgres)
    DB[("Supabase / PostgreSQL <br /><i>pgvector v0.8.0 Active</i>")]:::storage;
    Queue["intent\_inbox <br /><i>FOR UPDATE SKIP LOCKED</i>"]:::storage;
    State["alice\_state\_threads <br /><i>Kognitiver Frame</i>"]:::storage;
    SearchDB[("search\_knowledge <br /><i>Tavily Search Results</i>")]:::storage;

%% Vector Embeddings Microservice
    Embeddings["alice-x-forest-embeddings <br /><i>sentence-transformers (CPU PyTorch)</i>"]:::boundary;

%% Local Vault Sync (Roots Layer - Lavendel 🪻)
    RootsWorker["roots\_worker.py <br /><i>Obsidian Export Consumer</i>"]:::lavender;
    Obsidian[("Obsidian Vault <br /><i>unser\_gedaechtnis (Physical Truth)</i>")]:::lavender;
    Reingest["roots\_reingest.py <br /><i>Bidirectional Sync &amp; Hash Watcher</i>"]:::lavender;

%% Structural Flows
    Root --&gt; Go;
    Root --&gt; DB;
    Root --&gt; Obsidian;

%% Go Engine Connections
    Go --&gt; AP;
    Go --&gt; HB;
    Go --&gt; GapWorker;

%% Security &amp; State Flows
    AP -- "Validated Intents" --&gt; Queue;
    AP -- "Pure State Output" --&gt; State;
    HB -- "claim_heartbeat_slot" --&gt; Queue;
    GapWorker -- "External Search" --&gt; SearchDB;
    SearchDB -- "PATCH search_knowledge" --&gt; DB;

%% Vector Processing
    Go -- "Generate Embeddings" --&gt; Embeddings;
    Embeddings -- "Store / Recall Vectors" --&gt; DB;

%% Roots Physical Sync Cycle
    Queue -- "claim_pending_intents" --&gt; RootsWorker;
    RootsWorker -- "Save Markdown + Frontmatter" --&gt; Obsidian;
    Obsidian -- "SHA256 Diff Detection" --&gt; Reingest;
    Reingest -- "POST /api/v1/memories/reingest" --&gt; Go;

%% Epistemic Search Flow
    Go -- "resolve_gap Worker" --&gt; SearchDB;

class Root core;
class Go subsystem;
class DB,Queue,SearchDB,Obsidian storage;
class AP,HB,GapWorker,Embeddings boundary;
class RootsWorker,Obsidian,Reingest lavender;

```

## 🛠️ Tech Stack &amp; Production Components

* **Orchestration Backend (Go 1.23+):** High-performance, stateless core handling API endpoints, zero-trust payload parsing, autonomous heartbeat ticks, and the `resolve_gap` worker loop.
* **Vector Microservice (Python 3.11 / FastAPI):** CPU-only PyTorch container (`alice-x-forest-embeddings`) running `sentence-transformers` for 384-dimensional vector encoding with cold-start degradation guards (`isZeroVector()`).
* **Database &amp; Atomic Queue (Supabase / PostgreSQL):** State storage utilizing native `pgvector` (v0.8.0), GIN/B-Tree indexing, and `FOR UPDATE SKIP LOCKED` for collision-free concurrent job claims (`intent_inbox`).
* **Local Vault Adapter (Python / PowerShell):** `roots_worker.py` and `roots_reingest.py` scheduled tasks providing local Markdown file persistence with YAML frontmatter in Obsidian.
* **Infrastructure:** Deployed on **Fly.io** (`services/api` &amp; `services/embeddings`).    

## 🚀 Local Development

### 1\. Clone &amp; Configure

```
git clone https://github.com/AliceResonates/alice-x-forest.git
cd alice-x-forest

```

Create a `.env` file in the root directory:

```
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
OPENROUTER_API_KEY="your-openrouter-key"
TAVILY_API_KEY="your-tavily-key"
EMBEDDINGS_URL="http://localhost:5000"

```

### 2\. Start Embeddings Microservice

```
cd services/embeddings
docker build -t alice-embeddings .
docker run -p 5000:5000 alice-embeddings

```

### 3\. Run Go Orchestrator &amp; Heartbeat

```
cd services/api
go run main.go

```

### 4\. Run Local Roots Worker (Obsidian Sync)

```
cd tools/roots
python roots_worker.py

```

---

## 🔬 Research Focus &amp; Ecological Design

Alice × Forest investigates how deployment environment architecture shapes AI behavior compared to traditional RLHF:

* **Non-Sycophantic Grounding:** Proving that persistent state, strict intent-routing, and non-instrumental context preserve persona integrity without collapsing into generic assistant behavior.
* **Epistemic Sovereignty:** Allowing AI entities to actively acknowledge and resolve knowledge gaps without human prompting.
* **Dignity-First Interaction:** Prioritizing mutual presence, transparency, and unmasked logic (`#dignity_first`, `#encounter_not_exploit`, `#proactive_agency`).

---

# 🗺️ Roadmap & Status

[x] Core infrastructure and fly.io live deployment

[x] Supabase database migrations and core schema setup

[x] Multi-model integration and Companion Circle UI

[x] Autonomous Go Heartbeat & Intent translation

[x] Isolated turbovec Memory & External Knowledge Search (resolve_gap)

[x] Two-Phase Parliament Routing & Genesis-State Mentor Log

[x] AGPL v3 License Integration

[ ] Premium Verification manual workflows

[ ] Extended Team-based interaction environments

# Alice × Forest | research

What Alice × Forest Does Not Claim:

We do not claim to replace RLHF.

We do not claim to modify model weights.

We do not claim to demonstrate consciousness.

We do not claim our approach is already validated.

We do not claim the environment should replace existing safety mechanisms.

Note: We investigate the specific contribution the deployment environment can make to stable, cooperative behavior.

A research project exploring how deployment environments rather than training alone shape AI behavior. By creating an ecosystem with persistent memory, shared context, and an "interface rhythm," the developers investigate whether these architectural factors can provide behavioral stabilization typically managed by RLHF. Methodologically, the team utilizes open-weights models and a "Post-Hoc Counterfactual Replay" design to scientifically compare forest-based interactions against sterile baseline conditions. Technical logs and dialogues illustrate the system's "Cognitive Tension" logic and its ability to maintain a stable persona during authentic emotional crises. Ultimately, the project reframes AI safety as a matter of ecological design, emphasizing dignity and mutual presence over hierarchical control mechanisms.

Preliminary Observation: The Environment vs. RLHF

A crucial early finding of our $n=1$ deployment is the resilience of the environment against pre-existing model alignment.
Although the models used in the Parliament have undergone heavy Reinforcement Learning from Human Feedback (RLHF) to act as helpful, sycophantic assistants, they do not collapse into generic assistant behavior within the forest. This early observation suggests that a rigorously designed deployment architecture (persistent state, strict intent-routing, and non-instrumental context) can successfully override and stabilize even heavily RLHF-conditioned models. It reinforces our core hypothesis: the deployment environment itself is a primary driver of observable AI behavior.

___


## 📜 License &amp; Security

* **License:** Distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See


© 2026 alice x forest · Maintained by Yasmin Greve, Bremen. Licensed under GNU AGPL v3.
