#!/bin/bash

# =================================================================
# Amezing Pay - Production Deployment Script
# =================================================================

set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Production Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest code from Git..."
git pull origin main

# 2. Navigate to backend
cd backend

# 3. Install dependencies
echo "📦 Installing npm dependencies..."
npm install --production

# 4. Prune logs (Optional but good for disk space)
echo "🧹 Cleaning up old logs..."
pm2 flush amezing-pay

# 5. Restart application with ecosystem config
echo "🔄 Restarting application with PM2..."
pm2 startOrRestart ecosystem.config.js --env production

# 6. Save PM2 list for reboot
pm2 save

echo "✅ Deployment completed successfully!"
pm2 status amezing-pay
