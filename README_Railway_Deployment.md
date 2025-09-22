# Railway Deployment Guide - BigQuery Medical Analysis API

## 🚀 Quick Deployment Steps

### 1. **Login to Railway**
```bash
railway login
```
This will open a browser window for authentication.

### 2. **Initialize Railway Project**
```bash
railway init
```
Choose "Empty Project" and give it a name like "bigquery-medical-api"

### 3. **Set Environment Variables**
```bash
# Required environment variables
railway variables set GOOGLE_API_KEY="your-google-ai-api-key"
railway variables set PROJECT_ID="thinking-bonbon-471314-i4"
railway variables set LOCATION="US"
railway variables set DATASET_NAME="patients_vector_search_demo"
railway variables set TABLE_NAME="patients_with_embeddings"
railway variables set GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
railway variables set HOST="0.0.0.0"
railway variables set ENVIRONMENT="production"
```

### 4. **Deploy**
```bash
railway up
```

### 5. **Get Your Deployment URL**
```bash
railway domain
```

## 📁 **Deployment Files Created**

- ✅ `railway.json` - Railway configuration
- ✅ `Procfile` - Process definition
- ✅ `nixpacks.toml` - Build configuration
- ✅ `service-account-key.json` - Google Cloud credentials
- ✅ `deploy-railway.sh` - Automated deployment script
- ✅ `.gitignore` - Git ignore rules

## 🔧 **Alternative: Automated Deployment**

Run the automated script:
```bash
./deploy-railway.sh
```

## 📋 **Environment Variables Required**

| Variable | Value | Description |
|----------|--------|-------------|
| `GOOGLE_API_KEY` | Your Google AI API key | For Gemini AI analysis |
| `PROJECT_ID` | `thinking-bonbon-471314-i4` | BigQuery project |
| `LOCATION` | `US` | BigQuery location |
| `DATASET_NAME` | `patients_vector_search_demo` | Dataset name |
| `TABLE_NAME` | `patients_with_embeddings` | Table name |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./service-account-key.json` | Service account path |
| `HOST` | `0.0.0.0` | Server host |
| `ENVIRONMENT` | `production` | Environment type |

## 🌐 **API Endpoints (After Deployment)**

Your deployed API will have these endpoints:

- `GET /health` - Health check
- `POST /analyze-patient` - Patient analysis with AI
- `POST /vector-search` - Semantic patient search
- `POST /analyze-image` - Medical image analysis

## 🧪 **Testing Your Deployment**

Once deployed, test with:

```bash
# Replace YOUR_RAILWAY_URL with your actual Railway URL
curl https://YOUR_RAILWAY_URL.railway.app/health

# Test vector search
curl -X POST "https://YOUR_RAILWAY_URL.railway.app/vector-search" \
  -H "Content-Type: application/json" \
  -d '{"query": "patients with skin problems", "top_k": 3}'

# Test patient analysis
curl -X POST "https://YOUR_RAILWAY_URL.railway.app/analyze-patient" \
  -H "Content-Type: application/json" \
  -d '{"pid": 332, "query": "What are the main health conditions?"}'
```

## 🔍 **Monitoring & Logs**

```bash
# View deployment logs
railway logs

# Check service status
railway status

# Open Railway dashboard
railway open
```

## 🔒 **Security Notes**

1. **Service Account Key**: The `service-account-key.json` is included in deployment
2. **Environment Variables**: All sensitive data is stored as Railway environment variables
3. **API Access**: Your API will be publicly accessible via Railway URL

## 🚨 **Important Notes**

1. **BigQuery Costs**: Monitor your BigQuery usage as vector operations can be expensive
2. **Response Times**: First requests may be slow (~30-45 seconds) due to BigFrames initialization
3. **Service Account**: Ensure your service account has all required BigQuery permissions

## 📞 **Troubleshooting**

### Common Issues:

1. **Build Fails**: Check `requirements.txt` for version conflicts
2. **Service Account Error**: Verify the JSON key file is valid
3. **BigQuery Access**: Ensure service account has proper permissions
4. **Timeout Issues**: Increase Railway timeout settings

### Debug Commands:
```bash
railway logs --tail
railway shell
railway variables
```

## 🎉 **Success!**

Your BigQuery Medical Analysis API is now deployed on Railway with:
- ✅ Full BigFrames vector search
- ✅ AI-powered patient analysis  
- ✅ Service account authentication
- ✅ Production-ready configuration

**Your API is ready for production use!** 🚀
