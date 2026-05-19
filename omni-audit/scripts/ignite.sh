#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
#  OMNI-NEXUS PRO — IGNITE BOOTSTRAP (Termux / Android)
#  Architecte Senior Next.js 15 — Souveraineté totale
# =============================================================================
set -euo pipefail

# ---------- Couleurs ----------
RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'; BLU='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLU}[IGNITE]${NC} $*"; }
ok()   { echo -e "${GRN}[ OK  ]${NC} $*"; }
warn() { echo -e "${YEL}[WARN ]${NC} $*"; }
err()  { echo -e "${RED}[FAIL ]${NC} $*"; exit 1; }

# ---------- Pré-requis Termux ----------
log "Mise à jour Termux + paquets de base"
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git openssh openssl-tool jq curl which
ok "Paquets installés"

# ---------- Node / pnpm ----------
if ! command -v pnpm >/dev/null 2>&1; then
  log "Installation pnpm"
  npm install -g pnpm
fi
ok "Node $(node -v) — pnpm $(pnpm -v)"

# ---------- Variables d'environnement ----------
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
  log "Génération $ENV_FILE (secrets locaux)"

  OMNI_SECRET_KEY="$(openssl rand -hex 64)"
  read -rsp "Mot de passe maître OMNI : " OMNI_PWD; echo
  OMNI_PASSWORD_HASH="$(node -e "
    const b=require('bcryptjs');
    process.stdout.write(b.hashSync(process.argv[1],12));
  " "$OMNI_PWD")"

  cat > "$ENV_FILE" <<EOF
# === OMNI-NEXUS PRO — secrets souverains ===
OMNI_SECRET_KEY=$OMNI_SECRET_KEY
OMNI_PASSWORD_HASH=$OMNI_PASSWORD_HASH
OMNI_USERNAME=admin

# Vercel KV (renseigner après vercel link)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# Cron protection
CRON_SECRET=$(openssl rand -hex 32)
EOF
  chmod 600 "$ENV_FILE"
  ok "$ENV_FILE généré et verrouillé (chmod 600)"
else
  warn "$ENV_FILE existe déjà — non écrasé"
fi

# ---------- Dépendances ----------
log "Installation dépendances projet"
pnpm install --frozen-lockfile || pnpm install
ok "Dépendances OK"

# ---------- Build de validation ----------
log "Build Next.js de validation"
pnpm build || err "Le build a échoué — corrige avant git push"
ok "Build réussi"

# ---------- Git ----------
if [ ! -d ".git" ]; then
  log "Initialisation Git"
  git init -b main
fi

git add -A
git commit -m "ignite: OMNI-NEXUS PRO bootstrap" || warn "Rien à committer"

cat <<EOF

${GRN}=========================================================
  OMNI-NEXUS PRO — IGNITION COMPLÈTE
=========================================================${NC}

  Prochaines étapes :
    1. git remote add origin git@github.com:<user>/omni-nexus-pro.git
    2. git push -u origin main
    3. vercel link  &&  vercel env pull
    4. vercel deploy --prod

  Login local :
    pnpm dev    →    http://localhost:3000/login
    user : admin
    pass : (celui saisi pendant ignite)

EOF
