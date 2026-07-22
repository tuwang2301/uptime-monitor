# User Preferences & Behavioral Rules for Antigravity

## Core Development Standards

1. **No Mock Data / No Fake In-Memory Stores**:
   - Always implement real persistent storage (e.g., SQLite, PostgreSQL, or disk persistence) from the start.
   - Do not leave placeholder API endpoints or hardcoded dummy arrays unless explicitly requested.

2. **Bespoke, High-End SaaS Design (Anti-AI Slop)**:
   - Build interfaces that look like modern commercial SaaS products (inspired by Linear, Vercel, Better Uptime, Datadog).
   - Use curated dark-mode palettes, SVG sparklines/trendlines, crisp typography, clean micro-interactions, and realistic status indicators.

3. **Complete Real-World Integrations**:
   - When integrating external services (e.g., Telegram Bot, Webhooks, OAuth), provide full UI settings, database persistence, and live connection test buttons out of the box.

4. **Workflow Execution**:
   - If the user requests a product build, deliver production-ready, fully wired code upfront while explaining the architectural decisions clearly.
