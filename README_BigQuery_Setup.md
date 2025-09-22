# BigQuery Medical Analysis API - Setup Guide

## Overview
This API provides AI-powered analysis of patient data using Google Cloud BigQuery and BigFrames. It requires proper Google Cloud setup and authentication.

## Prerequisites

### 1. Python Environment
- Python 3.8 or higher
- pip package manager

### 2. Google Cloud Setup
- Google Cloud Project with billing enabled
- BigQuery API enabled
- Vertex AI API enabled (for Gemini)
- Service account with appropriate permissions OR gcloud CLI authentication

### 3. Required APIs
Enable these APIs in your Google Cloud Console:
```bash
gcloud services enable bigquery.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable bigquerystorage.googleapis.com
```

## Quick Setup

### 1. Install Dependencies
```bash
# Run the setup script
python setup.py

# OR manually install
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:
- `GOOGLE_API_KEY`: Your Google AI API key
- `PROJECT_ID`: Your Google Cloud Project ID

### 3. Set Up Authentication

#### Option A: Service Account (Recommended for production)
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Set the environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

#### Option B: gcloud CLI (Good for development)
```bash
gcloud auth application-default login
```

### 4. Verify BigQuery Data
Ensure your BigQuery dataset exists:
- Dataset: `patients_vector_search_demo`
- Table: `patients_with_embeddings_embeddings`

### 5. Start the Server
```bash
python main.py
```

### 6. Test the API
```bash
python test_bigquery_api.py
```

## Detailed Configuration

### Environment Variables (.env file)
```bash
# Required
GOOGLE_API_KEY=your-google-ai-api-key
PROJECT_ID=your-google-cloud-project-id

# Optional (with defaults)
LOCATION=US
DATASET_NAME=patients_vector_search_demo
TABLE_NAME=patients_with_embeddings
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
```

### Google Cloud Permissions
Your service account or user account needs these IAM roles:
- `BigQuery Data Editor`
- `BigQuery Job User`
- `Vertex AI User`
- `Storage Object Viewer` (if data is in Cloud Storage)

## BigQuery Data Structure

The API expects a BigQuery table with these columns:
```sql
-- Table: {PROJECT_ID}.patients_vector_search_demo.patients_with_embeddings_embeddings
PID                          INT64
FirstName                    STRING
LastName                     STRING
Age                          INT64
Gender                       STRING
Address                      STRING
FirstVisit                   STRING
Prescriptions                STRING
patient_description          STRING
ml_generate_embedding_result ARRAY<FLOAT64>
ml_generate_embedding_status STRING
```

## API Usage

### Endpoint: POST /analyze-patient
```bash
curl -X POST "http://localhost:8000/analyze-patient" \
  -H "Content-Type: application/json" \
  -d '{
    "pid": 332,
    "query": "What are the main health conditions for this patient?"
  }'
```

### Response Format
```json
{
  "analysis_date": "2024-01-15 14:30:45",
  "query": "What are the main health conditions for this patient?",
  "patient_data": {
    "pid": 332,
    "first_name": "Lata",
    "last_name": "Jain",
    "age": 68,
    "gender": "F",
    "address": "74, Bus Stand, Bangalore",
    "first_visit": "05/31/23 08:15:11",
    "prescriptions": "Complete prescription history...",
    "patient_description": "Rich patient description..."
  },
  "ai_analysis": "Comprehensive AI analysis...",
  "status": "success"
}
```

## Testing

### Run All Tests
```bash
python test_bigquery_api.py
```

### Individual Test Commands
```bash
# Test server health
curl http://localhost:8000/health

# Test with specific patient
curl -X POST "http://localhost:8000/analyze-patient" \
  -H "Content-Type: application/json" \
  -d '{"pid": 1, "query": "Show basic patient info"}'
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: Could not automatically determine credentials
```
**Solution:** Set up Google Cloud authentication (see step 3 above)

#### 2. BigQuery Permission Denied
```
Error: Access Denied: BigQuery BigQuery: Permission denied
```
**Solution:** Ensure your account has BigQuery permissions

#### 3. Table Not Found
```
Error: Not found: Table PROJECT_ID:DATASET.TABLE
```
**Solution:** Verify your BigQuery dataset and table exist

#### 4. API Key Issues
```
Error: GOOGLE_API_KEY environment variable is required
```
**Solution:** Set the GOOGLE_API_KEY in your .env file

#### 5. BigFrames Import Error
```
ImportError: No module named 'bigframes'
```
**Solution:** Install dependencies with `pip install -r requirements.txt`

### Debug Mode
Start the server with debug logging:
```bash
ENVIRONMENT=development python main.py
```

### Check BigQuery Connection
```python
from google.cloud import bigquery
client = bigquery.Client(project="your-project-id")
datasets = list(client.list_datasets())
print(f"Datasets: {[dataset.dataset_id for dataset in datasets]}")
```

## Performance Notes

- First BigQuery query may be slow (cold start)
- BigFrames operations are optimized for large datasets
- Consider using BigQuery slots for better performance
- Vector embeddings are cached in BigQuery for fast retrieval

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use service accounts** for production
3. **Restrict BigQuery access** to necessary datasets only
4. **Enable audit logging** in Google Cloud Console
5. **Use VPC networks** for additional security

## Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

### BigQuery Job Monitoring
Check BigQuery jobs in Google Cloud Console:
- Go to BigQuery → Job History
- Monitor query performance and costs

### API Monitoring
The API returns detailed error messages for debugging:
- Check server logs for detailed error information
- Use Google Cloud Logging for production monitoring

## Cost Optimization

1. **Use BigQuery slots** for predictable costs
2. **Optimize queries** to scan less data
3. **Cache results** when possible
4. **Monitor API usage** to avoid unexpected charges
5. **Set up billing alerts** in Google Cloud Console

## Support

For issues with:
- **BigQuery**: Check Google Cloud BigQuery documentation
- **BigFrames**: Check BigFrames GitHub repository
- **Vertex AI**: Check Vertex AI documentation
- **API**: Check the application logs and error messages
