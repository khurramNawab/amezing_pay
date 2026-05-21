#!/bin/bash

# =================================================================
# Amezing Pay - Production Deployment Script (v3.0)
# Deploys: Backend + Web + Admin Frontend
# =================================================================

set -euo pipefail

REPO_ROOT=$(pwd)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_DIR="$REPO_ROOT/backups"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "🚀 Amezing Pay Production Deployment"
echo "Timestamp: $TIMESTAMP"
echo "=========================================="

# Function for error handling
error_exit() {
    echo "❌ ERROR: $1"
    echo "📋 Deployment failed at: $(date)"
    exit 1
}

# 1. Pull latest changes
echo ""
echo "📥 Step 1/7: Pulling latest code from Git..."
git pull origin main || error_exit "Git pull failed"

# 2. Build Frontend Applications
# NOTE: Use 'npm ci' (not --production) — Vite & React plugins are in devDependencies
echo ""
echo "🔨 Step 2/7: Building Web Frontend..."
cd "$REPO_ROOT/web"
npm ci || error_exit "Web npm ci failed"
npm run build || error_exit "Web build failed"
echo "✅ Web frontend built successfully"

echo ""
echo "🔨 Step 3/7: Building Admin Dashboard..."
cd "$REPO_ROOT/admin"
npm ci || error_exit "Admin npm ci failed"
npm run build || error_exit "Admin build failed"
echo "✅ Admin dashboard built successfully"

# 3. Deploy Backend (omit devDeps for production)
echo ""
echo "📦 Step 4/7: Installing Backend dependencies..."
cd "$REPO_ROOT/backend"
npm ci --omit=dev || error_exit "Backend npm ci failed"

# 4. Create backup of current logs
echo ""
echo "💾 Step 5/7: Creating backup..."
BACKUP_DIR="$REPO_ROOT/backups/logs_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$REPO_ROOT/backend/logs" "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Backup created at: $BACKUP_DIR"

# 5. Pre-restart health check
echo ""
echo "🔍 Step 6/7: Pre-restart health check..."
HEALTH=$(curl -sf http://localhost:4050/api/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || echo "UNAVAILABLE")
echo "Current backend status: $HEALTH"

# 6. Restart Backend with PM2
echo ""
echo "🔄 Step 7/7: Restarting Backend with PM2..."
cd "$REPO_ROOT/backend"
pm2 startOrRestart ecosystem.config.js --env production || error_exit "PM2 restart failed"
pm2 save || error_exit "PM2 save failed"

# 7. Post-restart health verification (wait for startup)
echo ""
echo "⏳ Waiting 5s for backend startup..."
sleep 5
NEW_HEALTH=$(curl -sf http://localhost:4050/api/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 || echo "FAILED")
echo "Post-restart status: $NEW_HEALTH"

if echo "$NEW_HEALTH" | grep -q "OK"; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  WARNING: Backend health check did not return OK."
    echo "   Check logs: pm2 logs amezing-pay --lines 50"
fi

echo ""
echo "📊 Current PM2 Status:"
pm2 status

echo ""
echo "=========================================="
echo "📋 Post-Deployment Checklist:"
echo "=========================================="
echo "1. ✓ Backend restarted (PM2)"
echo "2. ✓ Web frontend built"
echo "3. ✓ Admin dashboard built"
echo "4. ⚠️  Verify health: curl https://api.amezingpay.com/api/health"
echo "5. ⚠️  Check logs: pm2 logs amezing-pay"
echo "6. ⚠️  Confirm frontend URLs are accessible"
echo ""
echo "📝 Deployment log saved to: $LOG_FILE"
echo "🎉 Deployment Complete!"
