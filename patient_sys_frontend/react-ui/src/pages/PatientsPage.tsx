import { useMemo, useState, useEffect, useCallback } from "react";
import type { Patient, Prescription } from "@/types/patient";
import { DataTable, type DataTableColumn } from "@/components/ui/basic-data-table";
import { PatientForm } from "@/components/PatientForm";
import { PrescriptionModal } from "@/components/PrescriptionModal";
import { AIChatModal } from "@/components/AIChatModal";
import { AISearchModal } from "@/components/AISearchModal";
import { UploadModal } from "@/components/UploadModal";
import { LoadingModal } from "@/components/LoadingModal";
import { ImageAnalysisModal } from "@/components/ImageAnalysisModal";
import { fetchPatients, searchPatients, fetchPatientsCount } from "@/lib/api";

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptionsByReg, setPrescriptionsByReg] = useState<Record<string, Prescription[]>>({});
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const [rxPatient, setRxPatient] = useState<Patient | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPatient, setChatPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(50);
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<any>(null);
  const [aiSearchModalOpen, setAiSearchModalOpen] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const loadPatientsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const offset = currentPage * pageSize;
    const result = await fetchPatients(pageSize, offset);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setPatients(result.data);
      // Extract prescriptions data
      const prescriptions: Record<string, Prescription[]> = {};
      result.data.forEach(patient => {
        if (patient.prescriptions) {
          // Parse prescription data - split by |--| separator
          const prescriptionEntries = patient.prescriptions.split('|--|').map(entry => {
            const trimmed = entry.trim();
            if (!trimmed) return null;
            
            // Try to extract date and description
            const dateMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{2,4}.*?) - (.*)$/);
            if (dateMatch) {
              return {
                id: `${patient.registrationNo}-${Date.now()}-${Math.random()}`,
                date: dateMatch[1],
                medication: dateMatch[2],
                notes: ""
              };
            } else {
              return {
                id: `${patient.registrationNo}-${Date.now()}-${Math.random()}`,
                date: new Date().toLocaleDateString(),
                medication: trimmed,
                notes: ""
              };
            }
          }).filter(Boolean) as Prescription[];
          
          prescriptions[patient.registrationNo] = prescriptionEntries;
        }
      });
      setPrescriptionsByReg(prescriptions);
    }
    setLoading(false);
  }, [currentPage, pageSize]);

  const loadTotalCount = useCallback(async () => {
    const result = await fetchPatientsCount();
    if (result.data) {
      setTotalCount(result.data.total_count);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchPatients(query);
      if (result.error) {
        setError(result.error);
        setPatients([]);
      } else if (result.data) {
        setPatients(result.data);
        setError(null);
        
        // Also parse prescriptions for search results
        const prescriptions: Record<string, Prescription[]> = {};
        result.data.forEach(patient => {
          if (patient.prescriptions) {
            const prescriptionEntries = patient.prescriptions.split('|--|').map(entry => {
              const trimmed = entry.trim();
              if (!trimmed) return null;
              
              const dateMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{2,4}.*?) - (.*)$/);
              if (dateMatch) {
                return {
                  id: `${patient.registrationNo}-${Date.now()}-${Math.random()}`,
                  date: dateMatch[1],
                  medication: dateMatch[2],
                  notes: ""
                };
              } else {
                return {
                  id: `${patient.registrationNo}-${Date.now()}-${Math.random()}`,
                  date: new Date().toLocaleDateString(),
                  medication: trimmed,
                  notes: ""
                };
              }
            }).filter(Boolean) as Prescription[];
            
            prescriptions[patient.registrationNo] = prescriptionEntries;
          }
        });
        setPrescriptionsByReg(prescriptions);
      }
    } catch (err) {
      setError(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load patients on component mount and page change
  useEffect(() => {
    loadPatientsData();
  }, [loadPatientsData]);

  // Load total count on component mount
  useEffect(() => {
    loadTotalCount();
  }, [loadTotalCount]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search.trim() && !aiSearchMode) {
        // Only auto-search in normal mode, not AI mode
        handleSearch(search.trim());
      } else if (!search.trim()) {
        // If search is empty, reload all patients
        loadPatientsData();
      }
      // If AI mode is on, don't auto-search - wait for submit button
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, loadPatientsData, handleSearch, aiSearchMode]);

  const columns: DataTableColumn<Patient>[] = [
    { key: "registrationNo", header: "PID", sortable: true },
    { key: "firstName", header: "First Name", sortable: true, filterable: true },
    { key: "lastName", header: "Last Name", sortable: true, filterable: true },
    { key: "age", header: "Age", sortable: true },
    { key: "gender", header: "Gender", sortable: true },
    { key: "address", header: "Address", filterable: true },
    { key: "firstVisitDate", header: "First Visit", sortable: true, render: (v) => new Date(v).toLocaleDateString() },
  ];

  // Since search is now handled by API, we don't need client-side filtering
  const filtered = patients;

  function openAdd() {
    setFormOpen(true);
  }
  function handleSave(patient: Patient) {
    // For now, we'll just add to local state
    // In a full implementation, you'd want to add an API endpoint for creating patients
    setPatients((prev) => [patient, ...prev]);
    setFormOpen(false);
    // Show a message that this is read-only for BigQuery data
    alert('Note: This is connected to BigQuery data. New patients are added locally only and will not persist.');
  }
  function openRx(p: Patient) {
    setRxPatient(p);
    setRxOpen(true);
  }

  function openChat() {
    setChatPatient(rxPatient);
    setChatOpen(true);
    setRxOpen(false);
  }

  function openChatDirectly(p: Patient) {
    // Set both patients for dual screen and open chat directly
    setRxPatient(p);
    setChatPatient(p);
    setChatOpen(true);
  }

  const toggleAISearchMode = () => {
    setAiSearchMode(!aiSearchMode);
  };

  const handleSubmitSearch = async () => {
    if (!search.trim()) {
      alert('Please enter a search query first');
      return;
    }
    
    if (aiSearchMode) {
      // AI-powered search
      setLoading(true);
      setError(null);
      
      // Set waiting message for AI search
      const waitingResults = {
        query: search,
        search_type: "vector_search",
        total_results: 0,
        results: [],
        waiting_message: "🤖 **AI Search is analyzing...**\n\n⏳ This will take approximately 30 seconds. Please wait while I search through patient records using AI.\n\n🔍 *Searching medical patterns and patient similarities...*"
      };
      setAiSearchResults(waitingResults);
      setAiSearchQuery(search);
      setAiSearchModalOpen(true);
      
      try {
        // Use vector search API for AI-powered search
        const response = await fetch('https://bigquery-medical-api-v2-production.up.railway.app/vector-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: search,
            top_k: 10
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          // Store AI search results and open AI search modal
          setAiSearchResults(data);
          setAiSearchQuery(search);
          setAiSearchModalOpen(true);
          
          // Also update the main patient list for reference
          const searchResults = data.results.map((result: any) => ({
            registrationNo: result.pid.toString(),
            firstName: result.first_name,
            lastName: result.last_name,
            age: result.age,
            gender: result.gender,
            address: result.address,
            firstVisitDate: result.first_visit || '',
            prescriptions: result.prescriptions || ''
          }));
          setPatients(searchResults);
          setError(null);
        } else {
          setError('No patients found with AI search');
          setPatients([]);
          setAiSearchResults(null);
        }
      } catch (err) {
        setError(`AI search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    } else {
      // Regular search - this will be handled by the existing useEffect
      // The debounced search will automatically trigger
    }
  };

  const handleUploadPrescription = () => {
    setUploadModalOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    setUploadModalOpen(false);
    setImageLoading(true);
    setError(null);
    
    // Create preview URL for the uploaded image
    const imageUrl = URL.createObjectURL(file);
    setUploadedImageUrl(imageUrl);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('https://bigquery-medical-api-v2-production.up.railway.app/analyze-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAnalysisResult(data);
      setImageLoading(false);
      setAnalysisModalOpen(true);
      
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setImageLoading(false);
      // Clean up the image URL on error
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setUploadedImageUrl(null);
      }
    }
  };

  const handleSelectFromComputer = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf,.jpg,.jpeg,.png';
    fileInput.multiple = false;
    
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    
    fileInput.click();
  };

  if (loading) {
    return (
      <div className="max-w-6xl w-[95%] mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patients from BigQuery...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl w-[95%] mx-auto py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <p className="text-muted-foreground">BigQuery Medical Database - Page {currentPage + 1} of {Math.ceil(totalCount / pageSize)} ({totalCount} total patients)</p>
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">⚠️ {error}</p>
          </div>
        )}

      </header>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1 max-w-md">
          <label className="block text-sm mb-1 text-gray-700 font-mono">
            Search Patients {aiSearchMode && <span className="text-blue-600">(AI Mode)</span>}
          </label>
          <div className="flex gap-2">
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitSearch()}
              placeholder={aiSearchMode ? "AI search: 'patients with headaches'..." : "Search by PID, name, or address..."} 
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500" 
            />
            <button 
              onClick={handleSubmitSearch}
              className="px-3 py-2 bg-gray-800 text-white border border-gray-800 rounded-lg hover:bg-gray-900 transition-colors"
              title="Submit Search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <button 
            onClick={toggleAISearchMode}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-mono transition-colors ${
              aiSearchMode 
                ? 'bg-gray-800 text-white hover:bg-gray-900' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            title={aiSearchMode ? "Switch to Normal Search" : "Switch to AI Search"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {aiSearchMode ? 'AI Search ON' : 'Search with AI'}
          </button>
          <button 
            onClick={handleUploadPrescription}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-sm font-mono hover:bg-gray-200 transition-colors"
            title="Upload New Prescription"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Prescription
          </button>
        </div>
      </div>

      <div className="border rounded-2xl overflow-hidden">
        <DataTable
          data={patients}
          columns={columns}
          searchable={false}
          itemsPerPage={50}
          onRowClick={(row) => openChatDirectly(row)}
          emptyMessage={search ? "No patients found" : "No data available"}
        />
      </div>

      {/* Pagination Controls */}
      {!search && totalCount > pageSize && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-gray-700">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} patients
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage + 1} of {Math.ceil(totalCount / pageSize)}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / pageSize) - 1, currentPage + 1))}
              disabled={currentPage >= Math.ceil(totalCount / pageSize) - 1}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <PatientForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSave} />
      <PrescriptionModal 
        open={rxOpen} 
        patient={rxPatient} 
        items={rxPatient ? (prescriptionsByReg[rxPatient.registrationNo] || []) : []} 
        onAdd={() => {}} 
        onClose={() => setRxOpen(false)}
        onOpenChat={openChat}
      />
      <AIChatModal 
        open={chatOpen} 
        patient={chatPatient} 
        prescriptions={chatPatient ? (prescriptionsByReg[chatPatient.registrationNo] || []) : []}
        onClose={() => setChatOpen(false)} 
      />
      
      <AISearchModal 
        open={aiSearchModalOpen}
        searchQuery={aiSearchQuery}
        searchResults={aiSearchResults}
        onClose={() => {
          setAiSearchModalOpen(false);
          setAiSearchResults(null);
          setAiSearchQuery("");
        }}
      />

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onFileSelect={handleFileUpload}
        onSelectFromComputer={handleSelectFromComputer}
      />

      <LoadingModal
        open={imageLoading}
        title="🔬 Analyzing Prescription"
        message="AI is processing your image"
      />

      <ImageAnalysisModal
        open={analysisModalOpen}
        analysisResult={analysisResult}
        uploadedImage={uploadedImageUrl}
        onClose={() => {
          setAnalysisModalOpen(false);
          setAnalysisResult(null);
          // Clean up the image URL
          if (uploadedImageUrl) {
            URL.revokeObjectURL(uploadedImageUrl);
            setUploadedImageUrl(null);
          }
        }}
      />

      {/* Popover removed: actions now inline in the table; clicking a row opens prescription */}
    </div>
  );
}


