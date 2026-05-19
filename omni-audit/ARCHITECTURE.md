# OMNI-NEXUS PRO — Architecture

## 1. Flux de données

```
+----------------+       POST /api/soul         +-----------------+
|  COMMAND UI    |  ------------------------>   |  OMNI-SOUL      |
|  (CommandPanel)|       { cmd }                |  director.ts    |
+----------------+                              +--------+--------+
        ^                                                |
        | plan JSON                                      v
        |                                       classifyIntent()
        |                                       buildPlan()
        |                                                |
        |                                                v
        |                                       kv.set(plan:<uuid>, ex=300)
        |                                       pushBounded(soul:log, ...)
        |                                                |
        |     GET /api/soul/confirm?planId=...           |
        +-----------+                                    |
                    |                                    v
                    +----> executePlan() ----> dispatch(plan.intent)
                                  |                      |
                                  v                      |
                          kv.del(plan:<uuid>)            |
                                                         v
                                              +---------------------+
                                              |  finance: vault     |
                                              |  agent:   status    |
                                              |  file:    diff      |
                                              |  deploy:  hook      |
                                              |  system:  metrics   |
                                              +---------------------+
```

Cron jobs:

```
*/15 * * * *  /api/cron/health-check     -> kv.set(soul:health)
0 6 * * *     /api/cron/daily-report     -> kv.set(vault:daily:YYYY-MM-DD)
```

## 2. Endpoints

| Méthode | Chemin                          | Auth | Payload / Query           | Réponse                                    |
|---------|---------------------------------|------|---------------------------|--------------------------------------------|
| POST    | /api/auth/login                 | non  | `{ password }`            | `{ ok: true }` + cookie `omni-token`       |
| POST    | /api/auth/logout                | non  | —                         | `{ ok: true }`                             |
| GET     | /api/health                     | non  | —                         | `{ ok, kvOk, ts }`                         |
| POST    | /api/soul                       | oui  | `{ cmd }`                 | `{ ok, plan: ActionPlan }` (201)           |
| GET     | /api/soul/confirm               | oui  | `?planId=uuid`            | `{ ok, result, executionTimeMs }`          |
| GET     | /api/soul/status                | oui  | —                         | `{ ok, status: AgentsStatusMap }`          |
| GET     | /api/soul/log                   | oui  | —                         | `{ ok, log: DecisionLog[] }` (max 50)      |
| GET     | /api/soul/files                 | oui  | —                         | `{ ok, agents, dynamicLogic }`             |
| GET     | /api/vault                      | oui  | —                         | `{ balances, transactions, rates }`        |
| POST    | /api/vault                      | oui  | `{ agentId, currency, description }` | `{ transaction }`                |
| GET/POST| /api/dynamic                    | oui  | `{ cmd: 'create-module' }`| `{ module }` ou `{ modules }`              |
| GET     | /api/stream                     | oui  | —                         | `text/event-stream` SSE                    |
| GET     | /api/cron/daily-report          | bearer | `Authorization: Bearer $CRON_SECRET` | `{ ok }`                       |
| GET     | /api/cron/health-check          | bearer | idem                              | `{ status }`                       |

Tous les endpoints authentifiés:
- 401 si cookie `omni-token` absent ou invalide (jose JWT HS256)
- 429 si > 60 req/min (header `Retry-After`)
- Rate limiting: KV `ratelimit:<ip>` avec INCR + EXPIRE

## 3. Clés Vercel KV

| Clé                              | Type                   | Description                                |
|----------------------------------|------------------------|--------------------------------------------|
| `vault:balances`                 | `Record<Currency,number>` | Soldes courants                         |
| `vault:transactions`             | `Transaction[]`        | 50 dernières transactions (FIFO)           |
| `vault:rates`                    | `AgentRates`           | Taux par agent (override de DEFAULT_RATES) |
| `vault:daily:YYYY-MM-DD`         | `DailyReport`          | Agrégat quotidien                          |
| `vault:anomalies`                | `string[]` (lpush)     | Détections > 3x moyenne 30j                |
| `vault:events`                   | `string[]` (lpush)     | File événements financiers                 |
| `agents:status`                  | `AgentsStatusMap`      | active/suspended/error par agent           |
| `agents:logs:<agentId>`          | `LogEntry[]`           | 100 derniers logs par agent                |
| `soul:log`                       | `DecisionLog[]`        | 50 dernières décisions                     |
| `soul:health`                    | `HealthReport`         | Snapshot santé                             |
| `soul:critical-alerts`           | `string[]` (lpush)     | Alertes niveau 3                           |
| `soul:deferred`                  | `string[]` (lpush)     | Plans différés                             |
| `dynamic:modules`                | `DynamicModule[]`      | Modules dynamiques                         |
| `wav:progress`                   | `WavProgress`          | Avancement WAV en cours                    |
| `wav:last-report`                | `{completedAt,...}`    | Rapport du dernier traitement              |
| `plan:<uuid>`                    | `ActionPlan`           | Plan en attente, TTL 300s                  |
| `ratelimit:<ip>`                 | `number`               | Compteur IP, TTL 60s                       |

## 4. Variables d'environnement

Requises:
- `KV_REST_API_URL` — endpoint Vercel KV (auto via integration)
- `KV_REST_API_TOKEN` — token KV (auto)
- `OMNI_SECRET_KEY` — clé HMAC ≥ 32 chars pour signer les JWT
- `OMNI_PASSWORD_HASH` — hash bcrypt du mot de passe opérateur
- `CRON_SECRET` — secret bearer pour `/api/cron/*`

Optionnelles:
- `GITHUB_TOKEN` — token PAT pour commits automatiques (intent file/deploy)
- `EXTERNAL_PING_URL` — URL du serveur externe (PC) pour ping

## 5. Hiérarchie agents

`omni-soul → qa → architect → engineer` (voir `/agents/omni-soul/soul.md` §2)
