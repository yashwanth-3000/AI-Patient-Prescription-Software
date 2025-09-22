#!/bin/bash
# Deployment script for BigQuery Medical Analysis API

set -e  # Exit on error

echo "🚀 BigQuery Medical Analysis API - Deployment Script"
echo "=" * 60

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run setup first."
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Check environment variables
echo "🔍 Checking environment variables..."
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Verify required variables
if [ -z "$GOOGLE_API_KEY" ] || [ -z "$PROJECT_ID" ] || [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "❌ Missing required environment variables"
    echo "   Required: GOOGLE_API_KEY, PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS"
    exit 1
fi

# Check service account key file
if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "❌ Service account key file not found: $GOOGLE_APPLICATION_CREDENTIALS"
    exit 1
fi

echo "✅ Environment verified"

# Test BigQuery connection
echo "🔍 Testing BigQuery connection..."
python -c "
from google.cloud import bigquery
import os
try:
    client = bigquery.Client(project='$PROJECT_ID')
    result = client.query('SELECT 1 as test').to_dataframe()
    print('✅ BigQuery connection successful')
except Exception as e:
    print(f'❌ BigQuery connection failed: {e}')
    exit(1)
"

# Start the API server
echo "🚀 Starting API server..."
echo "📊 Project: $PROJECT_ID"
echo "🗃️ Dataset: ${DATASET_NAME:-patients_vector_search_demo}"
echo "🌐 Host: ${HOST:-0.0.0.0}:${PORT:-8000}"
echo "🔐 Authentication: Service Account"
echo ""
echo "🔗 API Endpoints:"
echo "   Health: http://${HOST:-localhost}:${PORT:-8000}/health"
echo "   Analysis: http://${HOST:-localhost}:${PORT:-8000}/analyze-patient"
echo ""
echo "⚠️  Press Ctrl+C to stop the server"
echo ""

# Start the server
python main.py
