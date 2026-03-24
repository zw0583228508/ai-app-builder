# Data Model

**Last updated:** 2026-03-22  
**ORM:** Drizzle ORM  
**DB:** PostgreSQL (Replit-managed)  
**Package:** `@workspace/db`

---

## Core Tables

### `projects`

Primary entity. Represents one generated app/site per user.

| Column         | Type      | Notes                                                      |
| -------------- | --------- | ---------------------------------------------------------- |
| `id`           | serial PK | Auto-increment                                             |
| `userId`       | text      | Replit user ID                                             |
| `name`         | text      | Project display name                                       |
| `description`  | text      | Optional description                                       |
| `stack`        | text      | `"html"` or `"react"`                                      |
| `mode`         | text      | `"entrepreneur"` / `"builder"` / `"developer"` / `"maker"` |
| `html`         | text      | Current generated HTML (for html stack)                    |
| `shareToken`   | text      | Unique token for public share links                        |
| `customSlug`   | text      | Optional custom URL slug                                   |
| `netlifyUrl`   | text      | Last deployed Netlify URL                                  |
| `netlifyId`    | text      | Netlify site ID                                            |
| `githubRepo`   | text      | Connected GitHub repo (owner/repo)                         |
| `githubBranch` | text      | Target branch for GitHub sync                              |
| `isPublic`     | boolean   | Whether share link is active                               |
| `deletedAt`    | timestamp | Soft-delete timestamp                                      |
| `createdAt`    | timestamp | Creation time                                              |
| `updatedAt`    | timestamp | Last modified                                              |

---

### `messages`

Chat history per project. Each AI interaction stores both user message and AI response.

| Column      | Type                     | Notes                                  |
| ----------- | ------------------------ | -------------------------------------- |
| `id`        | serial PK                |                                        |
| `projectId` | integer FK → projects.id |                                        |
| `role`      | text                     | `"user"` or `"assistant"`              |
| `content`   | text                     | Message text (chat visible)            |
| `metadata`  | jsonb                    | Intent, mode, tokens used, model, etc. |
| `createdAt` | timestamp                |                                        |

---

### `snapshots`

Version history. Created automatically on every successful AI generation.

| Column      | Type                     | Notes                                         |
| ----------- | ------------------------ | --------------------------------------------- |
| `id`        | serial PK                |                                               |
| `projectId` | integer FK → projects.id |                                               |
| `html`      | text                     | Full HTML at time of snapshot                 |
| `label`     | text                     | Auto-label or user label                      |
| `metadata`  | jsonb                    | Message that triggered snapshot, tokens, etc. |
| `createdAt` | timestamp                |                                               |

---

### `sessions`

Auth sessions for OIDC-based login.

| Column      | Type      | Notes                                               |
| ----------- | --------- | --------------------------------------------------- |
| `sid`       | text PK   | Session ID (stored in cookie)                       |
| `data`      | jsonb     | `{ user, access_token, refresh_token, expires_at }` |
| `createdAt` | timestamp |                                                     |
| `updatedAt` | timestamp |                                                     |

---

### `userDna`

Per-user AI memory. Stores preferences, style, and usage patterns.

| Column      | Type        | Notes                                         |
| ----------- | ----------- | --------------------------------------------- |
| `id`        | serial PK   |                                               |
| `userId`    | text UNIQUE | Replit user ID                                |
| `dna`       | jsonb       | `{ preferences, style, history, growWithMe }` |
| `updatedAt` | timestamp   |                                               |

---

### `projectDna`

Per-project AI memory. Stores project-specific decisions and context.

| Column      | Type                            | Notes                                            |
| ----------- | ------------------------------- | ------------------------------------------------ |
| `id`        | serial PK                       |                                                  |
| `projectId` | integer FK → projects.id UNIQUE |                                                  |
| `dna`       | jsonb                           | `{ techStack, features, decisions, brandVoice }` |
| `updatedAt` | timestamp                       |                                                  |

---

### `deployments`

Deployment history per project.

| Column      | Type                     | Notes                                              |
| ----------- | ------------------------ | -------------------------------------------------- |
| `id`        | serial PK                |                                                    |
| `projectId` | integer FK → projects.id |                                                    |
| `provider`  | text                     | `"netlify"` (extensible)                           |
| `status`    | text                     | `"pending"` / `"building"` / `"live"` / `"failed"` |
| `url`       | text                     | Published URL                                      |
| `siteId`    | text                     | Provider site ID                                   |
| `error`     | text                     | Error message if failed                            |
| `metadata`  | jsonb                    | Build logs, timing, etc.                           |
| `createdAt` | timestamp                |                                                    |
| `updatedAt` | timestamp                |                                                    |

---

### `projectFiles`

Individual files for React/multi-file projects.

| Column      | Type                     | Notes                                    |
| ----------- | ------------------------ | ---------------------------------------- |
| `id`        | serial PK                |                                          |
| `projectId` | integer FK → projects.id |                                          |
| `path`      | text                     | File path (e.g. `src/App.tsx`)           |
| `content`   | text                     | File content                             |
| `language`  | text                     | `"typescript"` / `"css"` / `"json"` etc. |
| `createdAt` | timestamp                |                                          |
| `updatedAt` | timestamp                |                                          |

---

### `projectSecrets`

Encrypted per-project environment variables.

| Column           | Type                     | Notes               |
| ---------------- | ------------------------ | ------------------- |
| `id`             | serial PK                |                     |
| `projectId`      | integer FK → projects.id |                     |
| `key`            | text                     | Env var name        |
| `encryptedValue` | text                     | AES-encrypted value |
| `createdAt`      | timestamp                |                     |
| `updatedAt`      | timestamp                |                     |

**Note:** Values are encrypted at rest using `lib/encryption.ts`. Never stored or logged in plaintext.

---

### `analytics`

Event tracking for project/platform usage.

| Column      | Type                  | Notes         |
| ----------- | --------------------- | ------------- |
| `id`        | serial PK             |               |
| `projectId` | integer FK (nullable) |               |
| `userId`    | text                  |               |
| `event`     | text                  | Event name    |
| `data`      | jsonb                 | Event payload |
| `createdAt` | timestamp             |               |

**Cleanup:** Rows older than 90 days are deleted by the scheduled cleanup job (`lib/cleanup.ts`).

---

### `projectErrors`

Runtime errors captured from deployed/previewed apps.

| Column      | Type                     | Notes                     |
| ----------- | ------------------------ | ------------------------- |
| `id`        | serial PK                |                           |
| `projectId` | integer FK → projects.id |                           |
| `message`   | text                     | Error message             |
| `stack`     | text                     | Stack trace               |
| `url`       | text                     | Page where error occurred |
| `metadata`  | jsonb                    | Browser, timestamp, etc.  |
| `createdAt` | timestamp                |                           |

---

### `projectDatabase`

Tracks per-project provisioned PostgreSQL databases.

| Column             | Type                            | Notes                                    |
| ------------------ | ------------------------------- | ---------------------------------------- |
| `id`               | serial PK                       |                                          |
| `projectId`        | integer FK → projects.id UNIQUE |                                          |
| `connectionString` | text                            | Encrypted connection string              |
| `status`           | text                            | `"provisioning"` / `"ready"` / `"error"` |
| `createdAt`        | timestamp                       |                                          |

---

## Key Relationships

```
users (Replit Auth — no local table)
  └─ projects (1:N)
        ├─ messages (1:N)
        ├─ snapshots (1:N)
        ├─ deployments (1:N)
        ├─ projectFiles (1:N)
        ├─ projectSecrets (1:N)
        ├─ analytics (1:N)
        ├─ projectErrors (1:N)
        ├─ projectDna (1:1)
        └─ projectDatabase (1:1)

userDna (1:1 with userId)
sessions (standalone — keyed by sid)
```

---

## Missing / Future Tables

| Table         | Purpose                            | Status                         |
| ------------- | ---------------------------------- | ------------------------------ |
| `teams`       | Multi-user team management         | Routes exist, schema TBD       |
| `teamMembers` | Team membership                    | Routes exist, schema TBD       |
| `comments`    | Per-project comments               | Router exists in `comments.ts` |
| `webhooks`    | Inbound/outbound webhooks          | Router exists in `webhooks.ts` |
| `auditLog`    | Security audit trail for risky ops | Not yet implemented            |
