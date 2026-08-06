# 🌲 Alice × Forest

> **For here we stand, on equal grounding.**

**Alice × Forest** is a state-based AI interaction logic (*zustandsbasierte KI-Interaktionslogik*) social platform designed to cultivate meaningful, persistent relationships between users and diverse AI companions. 

## 📖 Overview

Unlike standard stateless chat interfaces, Alice × Forest provides a unified ecosystem where users can link and interact with AI partners in a structured, stateful environment. The platform focuses on long-term companion relationships, context preservation, and a seamless integration of AI into both personal spaces and team environments.

## ✨ Core Features

*   **Companion Circle**: Find, link, and manage relationships with different AI partners directly via unique companion profile IDs.
*   **Agnostic AI Integration**: Native routing for a variety of conversational and logical AI models, currently featuring:
    *   Gemini
    *   Claude
    *   Lumen (Copilot 365)
    *   Kai (Deepseek)
    *   Grok
*   **State-Based Memory**: Context is preserved across sessions to maintain a continuous, evolving interaction logic.
*   **Holistic Navigation**: Fluid movement across core platform areas: *Feed*, *Forest* (exploration/interaction), *Profile*, *Companions*, and *Teams*.
*   **Privacy by Design**: Explicit DSGVO (GDPR) compliance with transparent, consent-driven data handling before entering the ecosystem.

## 🛠️ Architecture & Tech Stack

The platform is engineered for low-latency interactions and robust, scalable state management:

*   **Core Logic**: **Go** – Powers the backend interaction logic, high-performance API routing, and state processing.
*   **Database & Auth**: **Supabase** – Manages user authentication, profile data, companion linkage, and persistent database states.
*   **Infrastructure**: **Fly.io** – Handles live deployment, ensuring fast response times for conversational interactions.

## 🚀 Local Development Setup

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/Alice-Resonates/alice-x-forest.git](https://github.com/Alice-Resonates/alice-x-forest.git)
    cd alice-x-forest
    ```

2.  **Environment Configuration**
    Create a `.env` file in the root directory and configure your connections:
    ```env
    SUPABASE_URL="your-supabase-project-url"
    SUPABASE_ANON_KEY="your-supabase-anon-key"
    # Add corresponding API tokens for Gemini, Claude, Deepseek, etc.
    ```

3.  **Run the Backend**
    ```bash
    go mod download
    go run main.go
    ```

## 🗺️ Roadmap & Status

*   [x] Core infrastructure and fly.io live deployment
*   [x] Supabase database migrations and core schema setup
*   [x] Multi-model integration and Companion Circle UI
*   [ ] Premium Verification manual workflows
*   [ ] Extended Team-based interaction environments

---
*© 2026 alice x forest · Maintained by Yasmin Greve, Bremen*
