from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import tempfile
from datetime import datetime
from typing import Dict, Any, Optional
import json
import re
import warnings
import base64
from PIL import Image
import io
from dotenv import load_dotenv
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# Google AI imports
import google.generativeai as genai

# BigFrames imports for patient data analysis - REQUIRED
import bigframes.pandas as bpd
import bigframes
import bigframes.bigquery as bbq
from google.cloud import bigquery
from bigframes.ml.llm import TextEmbeddingGenerator, GeminiTextGenerator

# Initialize FastAPI app
app = FastAPI(
    title="Medical Image Analysis API",
    description="API for analyzing medical prescriptions using AI",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Configuration from environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required")

# BigQuery Configuration for patient data
PROJECT_ID = os.getenv("PROJECT_ID")
if not PROJECT_ID:
    raise ValueError("PROJECT_ID environment variable is required")

LOCATION = os.getenv("LOCATION", "US")
DATASET_NAME = os.getenv("DATASET_NAME", "patients_vector_search_demo")
TABLE_NAME = os.getenv("TABLE_NAME", "patients_with_embeddings")
FULL_TABLE_ID = f"{PROJECT_ID}.{DATASET_NAME}.{TABLE_NAME}"
EMBEDDING_TABLE_ID = f"{PROJECT_ID}.{DATASET_NAME}.{TABLE_NAME}_embeddings"

# Configure Gemini AI
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Gemini model
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Configure BigFrames - REQUIRED
bigframes.options.bigquery.project = PROJECT_ID
bigframes.options.bigquery.location = LOCATION

# Pydantic models for API requests
class PIDAnalysisRequest(BaseModel):
    pid: int
    query: str

class VectorSearchRequest(BaseModel):
    query: str
    top_k: int = 5

# JSON prompt for medical document analysis (from notebook)
JSON_PROMPT = """You are an expert-level AI assistant specializing in analyzing and extracting information from handwritten and printed homeopathic medical prescriptions. Your task is to meticulously analyze the provided image of a medical document and extract specific pieces of information.

Your output must be a single, valid JSON object and nothing else. Do not include any introductory text, explanations, markdown formatting, or code blocks. The JSON object should strictly adhere to the following structure and keys:

JSON
{
  "patient_id": "...",
  "prescription": "..."
}
Detailed Instructions for Extraction:

patient_id:

Locate the patient's unique identifier on the prescription. This is typically a numerical or alphanumeric code.

Extract this identifier exactly as it appears.

prescription:

This field should contain a single, comma-separated string of all prescribed remedies and their potencies, including both homeopathic and biochemic remedies.

Homeopathic Remedies:

Identify all prescribed homeopathic remedies and their potencies (e.g., 30, 200c, 1M). These are often abbreviated.

Interpret the abbreviations to their full remedy names. For example:

Arn -> Arnica

Bry -> Bryonia

Aco -> Aconitum Napellus

Ruta -> Ruta Graveolens

Phyto -> Phytolacca

Sulfo or Sul -> Sulphur

fp -> Ferrum Phosphoricum

NM -> Natrum Muriaticum

Chame -> Chamomilla

Pay close attention to remedies prescribed in combination, such as "Aco Bry 30", which should be interpreted as "Aconitum Napellus 30, Bryonia 30".

If you see "SL", it refers to "Sac Lac" (Sugar of Milk). Note its presence in the prescription string.

Biochemic Remedies:

Identify any biochemic remedies. These are often indicated by the word "mouth" or have potencies ending in 'x' (e.g., 6x, 12x).

Interpret the abbreviations for these remedies. For example:

mp6x -> Magnesia Phosphorica 6x

np6x -> Natrum Phosphoricum 6x

kp6x or KPCF6x -> Kali Phosphoricum 6x

Combine all remedies (homeopathic and biochemic) into a single, comma-separated string in the prescription field.

Example:

If the prescription shows:

Patient ID: 12345

Remedies: Arn 30, and next to the word "mouth" is mp6x.

Your output should be:


{
  "patient_id": "12345",
  "prescription": "Arnica 30, Magnesia Phosphorica 6x"
}
Now, analyze the provided medical document image and return only the JSON object with the extracted information.

"""

def save_temp_image(file_content: bytes, filename: str) -> str:
    """Save image to temporary file and return the path"""
    try:
        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, filename)
        
        # Save file content
        with open(temp_path, 'wb') as f:
            f.write(file_content)
        
        return temp_path
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save temporary image: {str(e)}")

def analyze_image_with_ai(image_content: bytes) -> Dict[str, Any]:
    """Analyze image using Gemini AI directly"""
    try:
        # Convert image content to PIL Image
        image = Image.open(io.BytesIO(image_content))
        
        # Use Gemini model to analyze the image
        response = model.generate_content([JSON_PROMPT, image])
        
        # Get the analysis result
        analysis_result = response.text
        
        # Parse the JSON response
        patient_id, prescription = parse_ai_response(analysis_result)
        
        return {
            "analysis_date": datetime.now().strftime("%Y-%m-%d"),
            "patient_id": patient_id,
            "prescription": prescription
        }
        
    except Exception as e:
        # Fallback response if AI analysis fails
        return {
            "analysis_date": datetime.now().strftime("%Y-%m-%d"),
            "patient_id": "Analysis failed",
            "prescription": f"Error occurred during analysis: {str(e)}"
        }

def parse_ai_response(analysis: str) -> tuple:
    """Parse AI response and extract patient_id and prescription"""
    try:
        # Clean the response - remove markdown code blocks if present
        cleaned_analysis = analysis.strip()
        
        # Remove ```json and ``` markers if present
        if cleaned_analysis.startswith("```json"):
            cleaned_analysis = cleaned_analysis[7:]
        if cleaned_analysis.startswith("```"):
            cleaned_analysis = cleaned_analysis[3:]
        if cleaned_analysis.endswith("```"):
            cleaned_analysis = cleaned_analysis[:-3]
        
        cleaned_analysis = cleaned_analysis.strip()
        
        # Try to parse the cleaned JSON response
        parsed_data = json.loads(cleaned_analysis)
        patient_id = parsed_data.get("patient_id", "Not found")
        prescription = parsed_data.get("prescription", "Not found")
        
        return patient_id, prescription
        
    except json.JSONDecodeError:
        # If JSON parsing fails, try regex extraction
        patient_id_match = re.search(r'"patient_id":\s*"([^"]*)"', analysis)
        patient_id = patient_id_match.group(1) if patient_id_match else "Not found"
        
        prescription_match = re.search(r'"prescription":\s*"([^"]*)"', analysis)
        prescription = prescription_match.group(1) if prescription_match else "Not found"
        
        return patient_id, prescription

def get_patient_by_pid(pid: int) -> Optional[Dict[str, Any]]:
    """Retrieve all patient details by PID from BigQuery"""
    try:
        # Read from embeddings table and filter by PID
        df_written = bpd.read_gbq(EMBEDDING_TABLE_ID)
        results = df_written[df_written["PID"] == pid]
        
        if len(results) == 0:
            return None
            
        # Convert to pandas for easier handling
        patient_data = results.to_pandas().iloc[0]
        
        return {
            "pid": int(patient_data['PID']),
            "first_name": patient_data['FirstName'],
            "last_name": patient_data['LastName'],
            "age": int(patient_data['Age']),
            "gender": patient_data['Gender'],
            "address": patient_data['Address'],
            "first_visit": patient_data['FirstVisit'],
            "prescriptions": patient_data['Prescriptions'],
            "patient_description": patient_data.get('patient_description', '')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving patient data: {str(e)}")

def analyze_patient_with_ai(patient_data: Dict[str, Any], query: str) -> str:
    """Perform AI analysis on patient data based on the query using BigFrames GeminiTextGenerator"""
    try:
        # Enhanced analysis prompt with homeopathic medicine knowledge
        analysis_prompt = f"""
        🏥 HOMEOPATHIC MEDICAL ANALYSIS

        Medical Query: "{query}"
        
        📋 PATIENT INFORMATION:
        - Patient ID: {patient_data['pid']}
        - Name: {patient_data['first_name']} {patient_data['last_name']}
        - Age: {patient_data['age']}, Gender: {patient_data['gender']}
        - Address: {patient_data['address']}
        - First Visit: {patient_data['first_visit']}
        - Full Prescriptions: {patient_data['prescriptions']}

        📋 PRESCRIPTION UNDERSTANDING:
        - "|--|" separates different prescription visits/dates
        - Common homeopathic abbreviations: 
          * arn=Arnica Montana, bry=Bryonia Alba, aco=Aconitum Napellus
          * ruta=Ruta Graveolens, phyto=Phytolacca, sulfo/sul=Sulphur
          * fp=Ferrum Phosphoricum, nm=Natrum Muriaticum, chame=Chamomilla
          * thy=Thyroidinum, lssl=Lycopodium, cp=Carcinosin, mp=Magnesia Phosphorica
          * np=Natrum Phosphoricum, kp=Kali Phosphoricum, sl=Sac Lac
          * nux=Nux Vomica, apis=Apis Mellifica, cf=Calcarea Fluorica
        - Potencies: 30, 200c, 6x, 1M indicate medicine strength/dilution levels
        - bid=twice daily, tid=three times daily, hd=high dilution

        🔍 MEDICINE-CONDITION MAPPING:
        - arn (Arnica) → trauma, bruises, muscle soreness, post-surgical healing
        - bry (Bryonia) → dry cough, headaches, joint pain, respiratory issues
        - thy (Thyroidinum) → thyroid disorders, metabolism issues
        - lssl (Lycopodium) → digestive issues, liver problems, bloating
        - cp (Carcinosin) → constitutional remedy for chronic conditions
        - mp (Magnesia Phos) → muscle cramps, neuralgic pain, spasms
        - nux (Nux Vomica) → digestive disorders, constipation, stress
        - sul (Sulphur) → skin conditions, chronic diseases, constitutional remedy

        📊 PROVIDE COMPREHENSIVE ANALYSIS:
        1. What homeopathic medicines were prescribed to this patient?
        2. What medical conditions do these medicines suggest?
        3. What is the treatment timeline and progression?
        4. Based on the query, what specific insights can you provide?
        5. What recommendations would you make for similar cases?
        6. Are there any patterns in the prescription history?

        Keep the analysis practical and focused on medical insights that would help a homeopathic practitioner understand this patient's case.
        """

        # Use BigFrames GeminiTextGenerator
        gemini = GeminiTextGenerator()
        prompt_df = bpd.DataFrame({"prompt": [analysis_prompt]})
        response = gemini.predict(prompt_df)
        analysis = response.to_pandas().iloc[0, 0]
        return analysis
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in AI analysis: {str(e)}")

def vector_search_patients(question: str, top_k: int = 5) -> Optional[Dict[str, Any]]:
    """
    Perform vector search on patient data using BigFrames
    Based on the ask_question function from the notebook
    """
    try:
        # Check if this is a PID query
        import re
        pid_match = re.search(r'(?:pid|patient)\s*(\d+)', question.lower())
        
        if pid_match:
            # Direct PID lookup from the embeddings table
            pid_number = int(pid_match.group(1))
            
            # Read from embeddings table and filter by PID
            df_written = bpd.read_gbq(EMBEDDING_TABLE_ID)
            results = df_written[df_written["PID"] == pid_number]
            
            if len(results) == 0:
                return {
                    "search_type": "pid_lookup",
                    "query": question,
                    "results": [],
                    "message": f"No patient found with PID {pid_number}"
                }
            
            # Convert to pandas for processing
            results_pd = results.to_pandas()
            patient = results_pd.iloc[0]
            
            return {
                "search_type": "pid_lookup",
                "query": question,
                "results": [{
                    "pid": int(patient['PID']),
                    "first_name": patient['FirstName'],
                    "last_name": patient['LastName'],
                    "age": int(patient['Age']),
                    "gender": patient['Gender'],
                    "address": patient['Address'],
                    "first_visit": patient['FirstVisit'],
                    "prescriptions": patient['Prescriptions'],
                    "similarity": 100.0  # Exact match
                }],
                "total_results": 1
            }
        
        else:
            # Semantic vector search using bigframes.bigquery.vector_search
            # Generate embedding for the search string
            text_model = TextEmbeddingGenerator(model_name="text-multilingual-embedding-002")
            search_df = bpd.DataFrame([question], columns=['search_string'])
            search_embedding = text_model.predict(search_df)
            
            # Perform vector search using bigframes
            vector_search_results = bbq.vector_search(
                base_table=EMBEDDING_TABLE_ID,
                column_to_search="ml_generate_embedding_result",
                query=search_embedding,
                distance_type="COSINE",
                query_column_to_search="ml_generate_embedding_result",
                top_k=top_k,
            )
            
            # Get results and convert to pandas for processing
            results = vector_search_results[["PID", "FirstName", "LastName", "Age", "Gender", "Address", "Prescriptions", "distance"]].sort_values("distance")
            results_pd = results.to_pandas()
            
            # Format results
            formatted_results = []
            for _, row in results_pd.iterrows():
                similarity_percent = round((1 - row['distance']) * 100, 1)
                formatted_results.append({
                    "pid": int(row['PID']),
                    "first_name": row['FirstName'],
                    "last_name": row['LastName'],
                    "age": int(row['Age']),
                    "gender": row['Gender'],
                    "address": row['Address'],
                    "prescriptions": row['Prescriptions'],
                    "similarity": similarity_percent,
                    "distance": float(row['distance'])
                })
            
            return {
                "search_type": "vector_search",
                "query": question,
                "results": formatted_results,
                "total_results": len(formatted_results)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search error: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Medical Image Analysis API",
        "version": "1.0.0",
        "description": "Upload medical prescription images for AI-powered analysis",
        "endpoints": {
            "/analyze-image": "POST - Upload and analyze medical prescription image",
            "/analyze-patient": "POST - Analyze patient by PID with AI-powered medical insights",
            "/vector-search": "POST - Semantic search for similar patients using natural language queries",
            "/patients": "GET - Get patients with pagination (limit, offset params)",
        "/patients/count": "GET - Get total patient count",
            "/patients/{pid}": "GET - Get specific patient by PID",
            "/search": "GET - Search patients by query"
        }
    }

@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze medical prescription image and extract patient information
    
    Returns JSON format with:
    - analysis_date: Date when analysis was performed
    - patient_id: Patient ID extracted from the prescription
    - prescription: Prescription details extracted from the image
    """
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Analyze image with AI directly
        analysis_result = analyze_image_with_ai(file_content)
        
        # Return JSON response
        return JSONResponse(content=analysis_result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/analyze-patient")
async def analyze_patient(request: PIDAnalysisRequest):
    """
    Analyze patient by PID with AI-powered medical insights
    
    Takes a patient ID and query, retrieves all patient details,
    and performs comprehensive AI analysis of their medical history.
    
    Returns JSON format with:
    - patient_data: All patient information from the database
    - ai_analysis: Comprehensive AI analysis based on the query
    - analysis_date: When the analysis was performed
    """
    
    try:
        # Get patient data by PID
        patient_data = get_patient_by_pid(request.pid)
        
        if patient_data is None:
            raise HTTPException(status_code=404, detail=f"Patient with PID {request.pid} not found")
        
        # Perform AI analysis
        ai_analysis = analyze_patient_with_ai(patient_data, request.query)
        
        # Prepare response
        response_data = {
            "analysis_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "query": request.query,
            "patient_data": patient_data,
            "ai_analysis": ai_analysis,
            "status": "success"
        }
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/vector-search")
async def vector_search(request: VectorSearchRequest):
    """
    Perform semantic vector search on patient data
    
    Takes a natural language query and finds similar patients using vector embeddings.
    Also supports direct PID lookups (e.g., "patient 123" or "PID 456").
    
    Returns JSON format with:
    - search_type: "vector_search" or "pid_lookup"
    - query: Original search query
    - results: List of matching patients with similarity scores
    - total_results: Number of results found
    """
    
    try:
        # Perform vector search using BigFrames
        search_results = vector_search_patients(request.query, request.top_k)
        
        if search_results is None:
            return JSONResponse(content={
                "search_type": "error",
                "query": request.query,
                "results": [],
                "total_results": 0,
                "message": "No results found"
            })
        
        # Add timestamp and status
        search_results["search_date"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        search_results["status"] = "success"
        
        return JSONResponse(content=search_results)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/patients")
async def get_all_patients(limit: int = 50, offset: int = 0):
    """
    Get patients from BigQuery with pagination
    
    Query parameters:
    - limit: Number of patients to return (default: 50, max: 100)
    - offset: Number of patients to skip (default: 0)
    
    Returns JSON array with patient information:
    - registrationNo: Patient ID (PID)
    - firstName, lastName: Patient name
    - age, gender: Demographics
    - address: Patient address
    - firstVisitDate: Date of first visit
    - prescriptions: Full prescription history
    """
    try:
        # Validate parameters
        limit = min(limit, 100)  # Cap at 100 to prevent timeout
        offset = max(offset, 0)  # Ensure non-negative
        
        # Use BigQuery SQL for efficient pagination
        query = f"""
        SELECT PID, FirstName, LastName, Age, Gender, Address, FirstVisit, Prescriptions
        FROM `{EMBEDDING_TABLE_ID}`
        ORDER BY PID
        LIMIT {limit} OFFSET {offset}
        """
        
        df = bpd.read_gbq_query(query)
        
        # Transform data to match frontend expectations
        patients_data = []
        for _, row in df.to_pandas().iterrows():
            patients_data.append({
                "registrationNo": str(row['PID']),
                "firstName": row['FirstName'],
                "lastName": row['LastName'],
                "age": int(row['Age']),
                "gender": row['Gender'],
                "address": row['Address'],
                "firstVisitDate": row['FirstVisit'],
                "prescriptions": row['Prescriptions']
            })
        
        return JSONResponse(content=patients_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch patients: {str(e)}")

@app.get("/patients/count")
async def get_patients_count():
    """
    Get total count of patients in BigQuery
    
    Returns JSON object with total count
    """
    try:
        query = f"""
        SELECT COUNT(*) as total_count
        FROM `{EMBEDDING_TABLE_ID}`
        """
        
        df = bpd.read_gbq_query(query)
        total_count = int(df.to_pandas().iloc[0]['total_count'])
        
        return JSONResponse(content={"total_count": total_count})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get patient count: {str(e)}")

@app.get("/patients/{pid}")
async def get_patient_by_pid_endpoint(pid: int):
    """
    Get specific patient by PID
    
    Returns JSON object with complete patient information
    """
    try:
        patient_data = get_patient_by_pid(pid)
        if patient_data is None:
            raise HTTPException(status_code=404, detail=f"Patient with PID {pid} not found")
        
        # Transform to match frontend format
        formatted_patient = {
            "registrationNo": str(patient_data['pid']),
            "firstName": patient_data['first_name'],
            "lastName": patient_data['last_name'],
            "age": patient_data['age'],
            "gender": patient_data['gender'],
            "address": patient_data['address'],
            "firstVisitDate": patient_data['first_visit'],
            "prescriptions": patient_data['prescriptions']
        }
        
        return JSONResponse(content=formatted_patient)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch patient: {str(e)}")

@app.get("/search")
async def search_patients_endpoint(q: str):
    """
    Search patients by query
    
    Query parameter:
    - q: Search term (name, PID, or address)
    
    Returns JSON array of matching patients
    """
    try:
        if not q.strip():
            raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
        
        df_written = bpd.read_gbq(EMBEDDING_TABLE_ID)
        df_pandas = df_written.to_pandas()
        
        # Search logic
        search_term = q.lower().strip()
        mask = (
            df_pandas['FirstName'].str.lower().str.contains(search_term, na=False) |
            df_pandas['LastName'].str.lower().str.contains(search_term, na=False) |
            df_pandas['PID'].astype(str).str.contains(search_term, na=False) |
            df_pandas['Address'].str.lower().str.contains(search_term, na=False)
        )
        
        results = df_pandas[mask]
        
        # Transform results
        patients_data = []
        for _, row in results.iterrows():
            patients_data.append({
                "registrationNo": str(row['PID']),
                "firstName": row['FirstName'],
                "lastName": row['LastName'],
                "age": int(row['Age']),
                "gender": row['Gender'],
                "address": row['Address'],
                "firstVisitDate": row['FirstVisit'],
                "prescriptions": row['Prescriptions']
            })
        
        return JSONResponse(content=patients_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search patients: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    
    # Get server configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    # Railway provides PORT environment variable
    port = int(os.getenv("PORT", "8000"))
    
    print(f"🚀 Starting BigQuery Medical Analysis API")
    print(f"📊 Project ID: {PROJECT_ID}")
    print(f"🗃️ Dataset: {DATASET_NAME}")
    print(f"🌐 Server: http://{host}:{port}")
    print(f"📋 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    uvicorn.run(app, host=host, port=port)
