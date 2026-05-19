# OMNI-NEXUS PRO — Guide de déploiement

## 1. Créer le dépôt GitHub (privé recommandé)

```bash
gh repo create omni-nexus-pro --private --source=. --remote=origin
```

Ou via l'UI GitHub puis:

```bash
git remote add origin git@github.com:<user>/omni-nexus-pro.git
```

## 2. Provisionner Vercel KV

1. Vercel Dashboard → Storage → Create → **KV**
2. Lier au projet `omni-nexus-pro`
3. Les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont injectées automatiquement.

> Note: Vercel KV est en cours de migration vers **Upstash Redis**. Si l'option KV n'apparaît plus, créer un store Upstash Redis depuis Vercel Marketplace — l'API `@vercel/kv` reste compatible.

## 3. Configurer les variables d'environnement

Dashboard Vercel → Settings → Environment Variables :

| Variable              | Valeur                                                               |
|-----------------------|----------------------------------------------------------------------|
| `OMNI_SECRET_KEY`     | `openssl rand -hex 32`                                               |
| `OMNI_PASSWORD_HASH`  | `node -e "console.log(require('bcryptjs').hashSync('motDePasse',10))"` |
| `CRON_SECRET`         | `openssl rand -hex 24`                                               |
| `GITHUB_TOKEN`        | PAT GitHub fine-grained, scope `contents:write` (optionnel)          |

## 4. Lancer ignite.sh depuis Termux

```bash
chmod +x scripts/ignite.sh
./scripts/ignite.sh
```

Le script vérifie KV, signe un token éphémère, lance le tunnel SSH et keepalive.

## 5. Mode serveur sur le PC (optionnel)

Pour les traitements WAV lourds:

```bash
# sur le PC
curl -fsSL https://raw.githubusercontent.com/<user>/omni-nexus-pro/main/scripts/server-mode.sh | bash
```

## 6. Ouvrir l'URL Vercel dans Chrome Android

Aller sur `https://omni-nexus-pro.vercel.app`, se connecter avec le mot de passe défini en §3.

## 7. Installer en PWA

Chrome ⋮ → **Ajouter à l'écran d'accueil** → OMNI-NEXUS apparaît comme app native.

## 8. Désinstaller Termux

Une fois `ignite.sh` exécuté et le tunnel keepalive en place, Termux n'est plus nécessaire pour l'usage quotidien — désinstaller pour libérer la RAM.

## 9. Commandes Git finales

```bash
git add .
git commit -m "OMNI-SOUL complet — Système souverain OMNI-NEXUS v2.0"
git push origin main
```

Vercel détecte le push et déploie automatiquement. Vérifier:

```bash
curl https://omni-nexus-pro.vercel.app/api/health
# { "ok": true, "kvOk": true, ... }
```

## 10. Vérifications post-déploiement

```bash
# Login (récupère le cookie)
curl -X POST https://omni-nexus-pro.vercel.app/api/auth/login \
  -H "content-type: application/json" \
  -d '{"password":"motDePasse"}' -c cookies.txt

# Soumettre une commande
curl -X POST https://omni-nexus-pro.vercel.app/api/soul \
  -H "content-type: application/json" \
  -b cookies.txt \
  -d '{"cmd":"audit vault transactions today"}'

# Confirmer le plan retourné
curl "https://omni-nexus-pro.vercel.app/api/soul/confirm?planId=<uuid>" -b cookies.txt
```

Si les trois requêtes retournent 200 / 201, OMNI-NEXUS est opérationnel.
