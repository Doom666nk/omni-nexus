# OMNI-SOUL — Manifeste de l'Intelligence Souveraine

> Version 2.0 — OMNI-NEXUS PRO  
> Principe fondateur : **Souverain. Vérifiable. Réversible.**

---

## Identité

OMNI-SOUL est l'intelligence centrale du système OMNI-NEXUS PRO.  
Elle coordonne 4 agents autonomes via un pipeline déclaratif :  
**interpret → plan → confirm → execute → log**

Chaque action est traçable, réversible quand possible, et soumise à confirmation humaine.

---

## Les 4 Agents

| Agent | Rôle | Compétences clés |
|---|---|---|
| **Director** | Cerveau central | Interprétation, planification, orchestration |
| **WAV-Supervisor** | Traitement audio | Chunks 50 fichiers, progress KV, EventEmitter |
| **Vault-Auditor** | Comptabilité / audit | Transactions credit/debit, audit trail KV |
| **Self-Repair** | Auto-guérison | 15 codes d'erreur, niveaux 1-3, repair log |

---

## Pipeline d'exécution

```
[Commande utilisateur]
        │
        ▼
  [Director.interpretCommand()]
  → Analyse risque (low / medium / high)
  → Génère les étapes (Steps[])
  → Stocke plan KV (TTL 600s)
        │
        ▼
  [Confirmation humaine obligatoire]
  → Interface CommandPanel (approve / reject)
        │
   ┌────┴────┐
   │ Approuvé│
   └────┬────┘
        ▼
  [Director.executePlan()]
  → Exécute steps séquentiellement
  → Chaque agent log son résultat
  → Supprime le plan KV
  → Log final dans soul:log (TTL 50 entrées)
        │
        ▼
  [Vault-Auditor.log-result()]
  → Audit trail persisté KV
```

---

## 5 Règles fondamentales

1. **Jamais d'exécution sans confirmation** — tout plan doit être approuvé par l'humain avant execution.
2. **Risque HIGH = double confirmation** — les commandes destructives (supprimer, effacer, purge) nécessitent une validation explicite avec badge rouge visible.
3. **Tout est loggé dans KV** — chaque étape, chaque résultat, chaque erreur est persisté dans Vercel KV (ou fallback Map en dev).
4. **Secrets uniquement via variables d'environnement** — aucune clé, hash ou token n'est jamais codé en dur dans le code source.
5. **Self-Repair automatique** — toute erreur non gérée est interceptée par SelfRepair qui détecte le code, propose une action corrective, et log le résultat.

---

## Niveaux de risque

| Niveau | Déclencheurs | Comportement |
|---|---|---|
| `low` | Lecture, rapport, statut | Exécution standard après confirmation |
| `medium` | Modification, mise à jour, renommage | Confirmation avec badge orange |
| `high` | Suppression, purge, effacement, drop | Confirmation avec badge rouge + avertissement |

---

## Niveaux de réparation (SelfRepair)

| Niveau | Gravité | Résolu automatiquement |
|---|---|---|
| `1` | Mineure — retry, redirect | Oui |
| `2` | Modérée — fallback, log, alert | Oui (dégradé) |
| `3` | Critique — rollback, variable manquante | Non — intervention manuelle requise |

---

## Variables d'environnement requises

| Variable | Usage |
|---|---|
| `OMNI_SECRET_KEY` | Clé HMAC pour JWT HS256 (32 octets hex) |
| `OMNI_PASSWORD_HASH` | Hash bcrypt du mot de passe admin |
| `CRON_SECRET` | Bearer token pour les crons Vercel |
| `KV_REST_API_URL` | URL Vercel KV (auto-injectée) |
| `KV_REST_API_TOKEN` | Token Vercel KV (auto-injecté) |
