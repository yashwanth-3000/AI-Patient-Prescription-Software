#!/bin/bash
# Railway Deployment Script for BigQuery Medical Analysis API

set -e

echo "🚀 Railway Deployment Script"
echo "=" * 50

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    curl -fsSL https://railway.app/install.sh | sh
    echo "✅ Railway CLI installed"
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "⚠️ Not logged in to Railway"
    echo "💡 Please run: railway login"
    echo "   Then run this script again"
    exit 1
fi

echo "✅ Logged in to Railway"

# Initialize Railway project if not exists
if [ ! -f "railway.json" ]; then
    echo "❌ railway.json not found"
    exit 1
fi

echo "📦 Initializing Railway project..."
railway init

echo "🔧 Setting up environment variables..."

# Set environment variables (you'll need to update these)
railway variables set GOOGLE_API_KEY="$GOOGLE_API_KEY"
railway variables set PROJECT_ID="thinking-bonbon-471314-i4"
railway variables set LOCATION="US"
railway variables set DATASET_NAME="patients_vector_search_demo"
railway variables set TABLE_NAME="patients_with_embeddings"
railway variables set GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
railway variables set HOST="0.0.0.0"
railway variables set ENVIRONMENT="production"

echo "✅ Environment variables set"

echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Your API is now live on Railway"
echo "📝 Check deployment status: railway status"
echo "🔗 Get deployment URL: railway domain"
