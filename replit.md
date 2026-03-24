# Adaptive AI Platform — AI App Builder (בונה AI)

## Overview

The Adaptive AI Platform is an AI-powered web and app builder designed to enable users to generate complete web projects through conversational interaction with AI. It features an Adaptive AI System offering four distinct user modes (Entrepreneur, Builder, Developer, Maker) that dynamically adjust communication, system prompts, UI, and suggested ideas. The platform includes a Business Memory Layer to persist project DNA across sessions, supports multi-file projects, a Monaco editor, per-project database/storage, and deployment to services like Netlify/Vercel. Key capabilities include team collaboration, analytics, error and performance monitoring, live cursors, webhooks, and a public gallery for templates. The platform aims to be a versatile and intuitive tool for users of all technical backgrounds to efficiently realize their web projects.

## User Preferences

- **Entrepreneur Mode**: Expects business-oriented language, no technical jargon. Focuses on business advice and discovery questions related to market, audience, and goals.
- **Builder Mode**: Expects tech and product-oriented language, explanations of technical decisions, and alternative suggestions.
- **Developer Mode**: Prefers a peer-to-peer interaction style, focusing on production-grade code, security, and performance notes.
- **Maker Mode**: Prefers a playful interaction style, encouraging experimentation with creative technologies like Three.js, Canvas, WebGL, and WebAudio, and actively discourages monetization or scaling discussions.
- Users can switch modes automatically based on the first message or receive "Grow-With-Me" suggestions for mode upgrades mid-session.
- The AI should extract and save project DNA (business model, target audience, brand colors, creative vibe) after every AI response, and inject this DNA into future system prompts to maintain context.
- The AI should use `claude-haiku-4-5-20251001` for prompt enhancement and DNA extraction due to its speed and cost-efficiency.
- For heavy generation tasks, especially for the SaaS Generator, `claude-sonnet-4-5-20251001` should be used.
- All system prompts should adhere to shared output rules, including HTML output format, preservation rules, and premium design requirements.
- Planning and specification phases are disabled by default (`usePlanningPhase=false`, `useSpecGeneration=false`).

## System Architecture

### Monorepo Structure

The project is organized as a monorepo:
- `artifacts/api-server`: Express 5 + WebSocket API server.
- `artifacts/app-builder`: React + Vite frontend application.
- `lib/db`: Drizzle ORM with PostgreSQL schemas.
- `lib/api-zod`: Zod validators generated from OpenAPI spec.
- `lib/integrations-anthropic-ai`: Anthropic SDK wrapper.

### Core Technical Decisions

- **Authentication**: Cookie-based OIDC via Replit Auth.
- **Encryption**: AES-256-GCM for project secrets.
- **AI Models**: `claude-sonnet-4-5-20251001` for core generation, `claude-haiku-4-5-20251001` for prompt enhancement, DNA extraction, intent detection, and advanced AI tasks.
- **Streaming**: Server-Sent Events (SSE) with typed events.
- **Real-time**: WebSocket for collaborative presence (cursors, viewers).
- **Database**: PostgreSQL managed by Drizzle ORM, with isolated schemas per project.
- **AI System Prompts**: Dynamically selected based on user mode, integrations, project type, and stack, incorporating `user_dna` and `project_dna`.
- **UI/UX**: Dark theme with cyan accents, Rubik font for Hebrew (RTL), Plus Jakarta Sans/Inter for generated content. Maker mode features a distinct purple theme.
- **Multi-file Support**: Supports React/Next.js, Vue 3, Svelte, or Django stacks with specific multi-file manifest extraction.
- **Live Preview**: esbuild for live bundling of React/JSX projects.
- **Monitoring**: Integrated error monitoring and performance monitoring via Google PageSpeed Insights.
- **Collaboration**: Live cursors via WebSocket, team management with roles, and inline code comments.
- **Security**: Rate limiting, input sanitization, AES-256-GCM encrypted vault for secrets, HMAC-SHA256 signed webhooks, secure cookies, WebSocket collab membership checks, X-Content-Type-Options + X-Frame-Options headers, prompt injection detection, and server-side proxy for GitHub Gist.
- **Advanced AI Systems**: Includes Planner Agent, Deployment Brain, AI QA System, Cost Engine, SaaS Generator, and Runtime Control Plane.
- **Execution Engine**: Features an AI Tool Action System with Zod-validated tool actions, a Workspace Manager for per-project filesystems, and an Execution Orchestrator with a Plan → Act → Observe → Repair feedback loop. It includes a Real Runtime Manager for `child_process` management and a Sandbox Policy for secure command execution.

## External Dependencies

- **Anthropic**: `claude-sonnet-4-5` and `claude-haiku-4-5-20251001` for AI capabilities.
- **PostgreSQL**: Primary database, accessed via Drizzle ORM.
- **Replit App Storage (GCS)**: Object storage for project assets.
- **Netlify API**: For project deployment and custom domains.
- **Vercel API**: For project deployment.
- **Google PageSpeed Insights**: For performance monitoring and reporting.
- **GitHub**: For Gist export and project syncing.
- **Unsplash**: For generating images within content.
- **CDN Libraries**: A curated selection of over 50 popular frontend libraries (e.g., Tailwind, Bootstrap, Three.js, Chart.js) are available for injection into generated projects.