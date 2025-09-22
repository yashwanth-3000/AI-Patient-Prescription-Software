import express from "express";
import path from "path";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import { fileURLToPath } from "url";
import { BigQuery } from "@google-cloud/bigquery";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Basic security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://bigquery-medical-api-v2-production.up.railway.app"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
// Enable CORS for API endpoints
app.use(cors({
  origin: ['http://localhost:3000', 'https://bigquery-medical-api-v2-production.up.railway.app'],
  credentials: true
}));
// Gzip/Brotli compression for faster loads
app.use(compression());
// Parse JSON bodies
app.use(express.json());

// BigQuery Configuration
const PROJECT_ID = process.env.PROJECT_ID;
const LOCATION = process.env.LOCATION || "US";
const DATASET_NAME = process.env.DATASET_NAME;
const TABLE_NAME = process.env.TABLE_NAME;
const EMBEDDING_TABLE_ID = `${PROJECT_ID}.${DATASET_NAME}.${TABLE_NAME}_embeddings`;

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "react-ui", "dist");

// API Routes
// Get all patients from BigQuery
app.get("/api/patients", async (req, res) => {
  try {
    const query = `
      SELECT 
        PID as registrationNo,
        FirstName as firstName,
        LastName as lastName,
        Age as age,
        Gender as gender,
        Address as address,
        FirstVisit as firstVisitDate,
        Prescriptions as prescriptions
      FROM \`${EMBEDDING_TABLE_ID}\`
      ORDER BY PID ASC
    `;
    
    const [rows] = await bigquery.query(query);
    
    // Transform data to match frontend expectations
    const patients = rows.map(row => ({
      registrationNo: row.registrationNo.toString(),
      firstName: row.firstName,
      lastName: row.lastName,
      age: parseInt(row.age),
      gender: row.gender,
      address: row.address,
      firstVisitDate: row.firstVisitDate,
      prescriptions: row.prescriptions
    }));
    
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients from BigQuery' });
  }
});

// Get patient by registration number
app.get("/api/patients/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;
    const query = `
      SELECT 
        PID as registrationNo,
        FirstName as firstName,
        LastName as lastName,
        Age as age,
        Gender as gender,
        Address as address,
        FirstVisit as firstVisitDate,
        Prescriptions as prescriptions
      FROM \`${EMBEDDING_TABLE_ID}\`
      WHERE PID = @regNo
    `;
    
    const [rows] = await bigquery.query({
      query,
      params: { regNo: parseInt(regNo) }
    });
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = {
      registrationNo: rows[0].registrationNo.toString(),
      firstName: rows[0].firstName,
      lastName: rows[0].lastName,
      age: parseInt(rows[0].age),
      gender: rows[0].gender,
      address: rows[0].address,
      firstVisitDate: rows[0].firstVisitDate,
      prescriptions: rows[0].prescriptions
    };
    
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient from BigQuery' });
  }
});

// Search patients by query
app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    
    const query = `
      SELECT 
        PID as registrationNo,
        FirstName as firstName,
        LastName as lastName,
        Age as age,
        Gender as gender,
        Address as address,
        FirstVisit as firstVisitDate,
        Prescriptions as prescriptions
      FROM \`${EMBEDDING_TABLE_ID}\`
      WHERE 
        LOWER(FirstName) LIKE LOWER(@searchTerm) OR
        LOWER(LastName) LIKE LOWER(@searchTerm) OR
        CAST(PID AS STRING) LIKE @searchTerm OR
        LOWER(Address) LIKE LOWER(@searchTerm)
      ORDER BY PID ASC
    `;
    
    const [rows] = await bigquery.query({
      query,
      params: { searchTerm: `%${q}%` }
    });
    
    const patients = rows.map(row => ({
      registrationNo: row.registrationNo.toString(),
      firstName: row.firstName,
      lastName: row.lastName,
      age: parseInt(row.age),
      gender: row.gender,
      address: row.address,
      firstVisitDate: row.firstVisitDate,
      prescriptions: row.prescriptions
    }));
    
    res.json(patients);
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({ error: 'Failed to search patients in BigQuery' });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    bigquery: {
      projectId: PROJECT_ID,
      dataset: DATASET_NAME,
      table: TABLE_NAME
    }
  });
});

// Serve static assets (force no-store to avoid stale caches while iterating)
app.use(
  express.static(publicDir, {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    }
  })
);

// Favicon (avoid 404 noise)
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

// Fallback to index.html for root
app.get(["/", "/index"], (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(publicDir, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Patient system UI available at http://localhost:${port}`);
});


