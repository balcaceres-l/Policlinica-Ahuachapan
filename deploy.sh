#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue — Policlínica Ahuachapaneca
# Frontend (Vite/React) + Backend (Laravel 12 / PHP) en CloudLinux con cPanel
# ==============================================================================
set -euo pipefail

# Colores para salida en consola
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[EXITO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Comprobar argumento obligatorio
if [ $# -lt 1 ] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "=============================================================================="
    echo "  Despliegue de Policlínica Ahuachapaneca a cPanel / CloudLinux"
    echo "=============================================================================="
    echo "Uso:"
    echo "  $0 <alias-ssh> [modo]"
    echo ""
    echo "Argumentos:"
    echo "  <alias-ssh>       Alias o host configurado en ~/.ssh/config (ej. policlinica)"
    echo "  [modo]            Opcional: --all (defecto) | --frontend-only | --backend-only"
    echo ""
    echo "Ejemplos:"
    echo "  $0 policlinica"
    echo "  $0 policlinica --frontend-only"
    echo "  $0 policlinica --backend-only"
    echo "=============================================================================="
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        exit 0
    fi
    exit 1
fi

SSH_ALIAS="$1"
MODE="${2:---all}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
BRIDGE_DIR="$ROOT_DIR/deploy/bridge"

REMOTE_FRONTEND_DIR="~/public_html/policlinica"
REMOTE_BACKEND_DIR="~/policlinica-backend"
REMOTE_BRIDGE_DIR="~/public_html/api-policlinica"

# Multiplexing SSH para evitar límites de conexiones simultáneas en cPanel/CSF
SSH_MUX=(-o ControlMaster=auto -o ControlPath=/tmp/ssh-deploy-%r@%h:%p -o ControlPersist=5m)

run_ssh() {
    ssh "${SSH_MUX[@]}" "$SSH_ALIAS" "$@"
}

run_scp() {
    scp "${SSH_MUX[@]}" "$@"
}

echo "=============================================================================="
log_info "Iniciando proceso de despliegue hacia: ${SSH_ALIAS}"
log_info "Modo seleccionado: ${MODE}"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 1. Verificaciones previas locales
# ------------------------------------------------------------------------------
if ! command -v scp &> /dev/null || ! command -v ssh &> /dev/null; then
    log_error "scp y ssh son necesarios en tu entorno local para ejecutar este script."
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. Despliegue del Frontend
# ------------------------------------------------------------------------------
deploy_frontend() {
    echo ""
    log_info "─── FASE 1: Preparación y compilación del Frontend ───"
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "No se encontró el directorio del frontend en $FRONTEND_DIR"
        exit 1
    fi

    # Verificar existencia de variables de entorno de producción
    if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
        log_warn "No se encontró $FRONTEND_DIR/.env.production. Creando por defecto..."
        echo "VITE_API_URL=https://api-policlinica.sistema09.latamname.com/api" > "$FRONTEND_DIR/.env.production"
    fi

    log_info "Ejecutando 'npm run build' en el frontend..."
    (cd "$FRONTEND_DIR" && npm run build)

    # Verificar que dist/ y dist/.htaccess existan
    if [ ! -d "$FRONTEND_DIR/dist" ]; then
        log_error "La carpeta $FRONTEND_DIR/dist no fue generada por el build."
        exit 1
    fi

    if [ ! -f "$FRONTEND_DIR/dist/.htaccess" ]; then
        log_warn "dist/.htaccess no existe. Copiando desde public/.htaccess..."
        cp "$FRONTEND_DIR/public/.htaccess" "$FRONTEND_DIR/dist/.htaccess"
    fi

    log_info "Empaquetando frontend (dist) en frontend-dist.tar.gz..."
    tar -czf "$ROOT_DIR/frontend-dist.tar.gz" -C "$FRONTEND_DIR/dist" .

    log_info "Asegurando directorio remoto ${REMOTE_FRONTEND_DIR}..."
    run_ssh "mkdir -p ${REMOTE_FRONTEND_DIR}"

    log_info "Subiendo frontend-dist.tar.gz mediante SCP..."
    run_scp "$ROOT_DIR/frontend-dist.tar.gz" "${SSH_ALIAS}:${REMOTE_FRONTEND_DIR}/"

    log_info "Extrayendo frontend en el servidor remoto..."
    run_ssh "cd ${REMOTE_FRONTEND_DIR} && tar -xzf frontend-dist.tar.gz && rm -f frontend-dist.tar.gz"

    rm -f "$ROOT_DIR/frontend-dist.tar.gz"
    log_success "Frontend desplegado con éxito en ${REMOTE_FRONTEND_DIR}."
}

# ------------------------------------------------------------------------------
# 3. Despliegue del Backend y Archivos Puente
# ------------------------------------------------------------------------------
deploy_backend() {
    echo ""
    log_info "─── FASE 2: Preparación y empaquetado del Backend ───"

    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "No se encontró el directorio del backend en $BACKEND_DIR"
        exit 1
    fi

    log_info "Instalando dependencias de producción en backend (composer --no-dev)..."
    (cd "$BACKEND_DIR" && composer install --no-dev --optimize-autoloader --no-interaction)

    log_info "Empaquetando backend en backend.tar.gz (excluyendo git, tests, logs, .env)..."
    tar --exclude='.git*' \
        --exclude='tests' \
        --exclude='node_modules' \
        --exclude='.phpunit.result.cache' \
        --exclude='storage/logs/*.log' \
        --exclude='storage/framework/cache/data/*' \
        --exclude='storage/framework/sessions/*' \
        --exclude='storage/framework/views/*' \
        --exclude='*.tar.gz' \
        --exclude='.env' \
        -czf "$ROOT_DIR/backend.tar.gz" -C "$BACKEND_DIR" .

    log_info "Asegurando directorio privado remoto ${REMOTE_BACKEND_DIR}..."
    run_ssh "mkdir -p ${REMOTE_BACKEND_DIR} ~/bin && ln -sf /usr/local/bin/ea-php82 ~/bin/php 2>/dev/null || true"

    log_info "Subiendo backend.tar.gz mediante SCP..."
    run_scp "$ROOT_DIR/backend.tar.gz" "${SSH_ALIAS}:${REMOTE_BACKEND_DIR}/"

    log_info "Extrayendo backend en ${REMOTE_BACKEND_DIR}..."
    run_ssh "cd ${REMOTE_BACKEND_DIR} && tar -xzf backend.tar.gz && rm -f backend.tar.gz && mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache && chmod -R 775 storage bootstrap/cache 2>/dev/null || true"

    rm -f "$ROOT_DIR/backend.tar.gz"
    log_success "Código del backend desplegado en ${REMOTE_BACKEND_DIR}."

    # Subir variables de entorno de producción (.env)
    if [ -f "$BACKEND_DIR/.env.production" ]; then
        log_info "Subiendo variables de entorno de producción (.env)..."
        run_scp "$BACKEND_DIR/.env.production" "${SSH_ALIAS}:${REMOTE_BACKEND_DIR}/.env"
        run_ssh "chmod 600 ${REMOTE_BACKEND_DIR}/.env"
        log_success "Archivo .env de producción configurado en ${REMOTE_BACKEND_DIR}/.env con permisos seguros."
    fi

    # Subir plantilla .env.production.example como referencia
    if [ -f "$BACKEND_DIR/.env.production.example" ]; then
        log_info "Subiendo plantilla de variables (.env.production.example)..."
        run_scp "$BACKEND_DIR/.env.production.example" "${SSH_ALIAS}:${REMOTE_BACKEND_DIR}/.env.production.example"
    fi

    echo ""
    log_info "─── FASE 3: Subida de archivos puente para cPanel ───"
    if [ ! -d "$BRIDGE_DIR" ]; then
        log_error "No se encontró el directorio puente en $BRIDGE_DIR"
        exit 1
    fi

    log_info "Asegurando directorio público del backend ${REMOTE_BRIDGE_DIR}..."
    run_ssh "mkdir -p ${REMOTE_BRIDGE_DIR}"

    log_info "Subiendo index.php y .htaccess puente a ${REMOTE_BRIDGE_DIR}..."
    run_scp "$BRIDGE_DIR/index.php" "$BRIDGE_DIR/.htaccess" "${SSH_ALIAS}:${REMOTE_BRIDGE_DIR}/"

    log_success "Archivos puente configurados en ${REMOTE_BRIDGE_DIR}."
}

# ------------------------------------------------------------------------------
# 4. Ejecución según el modo
# ------------------------------------------------------------------------------
case "$MODE" in
    --frontend-only)
        deploy_frontend
        ;;
    --backend-only)
        deploy_backend
        ;;
    --all)
        deploy_frontend
        deploy_backend
        ;;
    *)
        log_error "Modo desconocido: $MODE. Usa --all, --frontend-only o --backend-only."
        exit 1
        ;;
esac

echo ""
echo "=============================================================================="
log_success "¡Despliegue completado exitosamente!"
echo "=============================================================================="
