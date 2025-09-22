import { useState, useEffect, useRef } from "react";
import type { Patient, Prescription } from "@/types/patient";

type Props = {
  open: boolean;
  searchQuery: string;
  searchResults: any;
  onClose: () => void;
};

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

// Function to format AI search results
const formatSearchResults = (results: any) => {
  if (!results) return "No results found.";
  
  // Handle waiting message
  if (results.waiting_message) {
    return results.waiting_message;
  }
  
  if (!results.results) return "No results found.";
  
  const { query, search_type, results: patients, total_results } = results;
  
  let formatted = `**AI Search Results**\n\n`;
  formatted += `**Query:** "${query}"\n`;
  formatted += `**Search Type:** ${search_type === 'vector_search' ? 'Semantic Vector Search' : 'Direct Patient Lookup'}\n`;
  formatted += `**Total Results:** ${total_results}\n\n`;
  
  if (patients && patients.length > 0) {
    formatted += `**Found Patients:**\n\n`;
    
    patients.forEach((patient: any, index: number) => {
      formatted += `**${index + 1}. ${patient.first_name} ${patient.last_name}** (PID: ${patient.pid})\n`;
      formatted += `   • Age: ${patient.age}, Gender: ${patient.gender}\n`;
      formatted += `   • Address: ${patient.address}\n`;
      if (patient.similarity !== undefined) {
        formatted += `   • Similarity: ${patient.similarity}%\n`;
      }
      if (patient.prescriptions) {
        formatted += `   • **Full Prescriptions:**\n`;
        const prescriptionEntries = patient.prescriptions.split('|--|');
        prescriptionEntries.forEach((entry: string, idx: number) => {
          const trimmed = entry.trim();
          if (trimmed) {
            formatted += `     **${idx + 1}.** ${trimmed}\n`;
          }
        });
      }
      formatted += `\n`;
    });
    
    formatted += `\n**Analysis Summary:**\n`;
    formatted += `Found ${total_results} patients matching your search criteria. `;
    if (search_type === 'vector_search') {
      formatted += `The results are ranked by semantic similarity to your query.`;
    } else {
      formatted += `This was a direct patient lookup.`;
    }
  }
  
  return formatted;
};

// Function to format AI response text with proper styling (reused from AIChatModal)
const formatAIResponse = (text: string) => {
  const lines = text.split('\n');
  const formattedLines: JSX.Element[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      formattedLines.push(<br key={index} />);
      return;
    }
    
    // Main headers (surrounded by **)
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      const headerText = trimmedLine.slice(2, -2);
      formattedLines.push(
        <h3 key={index} className="text-lg font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">
          {headerText}
        </h3>
      );
    }
    // Bullet points with •
    else if (trimmedLine.startsWith('   • ')) {
      const bulletText = trimmedLine.substring(5);
      formattedLines.push(
        <div key={index} className="ml-6 mb-2 flex items-start">
          <span className="text-gray-400 mr-3 mt-1 text-sm">•</span>
          <div className="flex-1 text-gray-700" dangerouslySetInnerHTML={{ __html: bulletText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      );
    }
    // Nested numbered prescriptions
    else if (trimmedLine.match(/^\s+\*\*\d+\.\*\*/)) {
      const prescriptionText = trimmedLine.replace(/^\s+\*\*(\d+)\.\*\*\s*/, '<strong>$1.</strong> ');
      formattedLines.push(
        <div key={index} className="ml-8 mb-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
          <div className="text-sm text-gray-800 font-mono" dangerouslySetInnerHTML={{ __html: prescriptionText }} />
        </div>
      );
    }
    // Bold text inline
    else if (trimmedLine.includes('**')) {
      const formattedText = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formattedLines.push(
        <p key={index} className="mb-2 text-gray-700 leading-relaxed" 
           dangerouslySetInnerHTML={{ __html: formattedText }} />
      );
    }
    // Regular paragraphs
    else {
      formattedLines.push(
        <p key={index} className="mb-2 text-gray-700 leading-relaxed">
          {trimmedLine}
        </p>
      );
    }
  });
  
  return <div className="space-y-1">{formattedLines}</div>;
};

export function AISearchModal({ open, searchQuery, searchResults, onClose }: Props) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(35);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Initialize with search results when modal opens
  useEffect(() => {
    if (open && searchResults) {
      const systemMessage: ChatMessage = {
        id: 'search-results',
        type: 'system',
        content: formatSearchResults(searchResults),
        timestamp: new Date()
      };
      setMessages([systemMessage]);
      setQuery("");
    } else if (open) {
      setMessages([]);
      setQuery("");
    }
  }, [open, searchResults]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle mouse events for resizing
  useEffect(() => {
    const handleMouseMoveEvent = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const containerWidth = window.innerWidth;
      const newLeftWidth = (e.clientX / containerWidth) * 100;
      setLeftWidth(Math.min(Math.max(newLeftWidth, 20), 80));
    };

    const handleMouseUpEvent = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', handleMouseMoveEvent);
    document.addEventListener('mouseup', handleMouseUpEvent);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveEvent);
      document.removeEventListener('mouseup', handleMouseUpEvent);
    };
  }, []);

  // NOW we can do conditional returns AFTER all hooks are called
  if (!open) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!query.trim() || loading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setQuery("");
    
    try {
      // For AI search results, we can ask follow-up questions about the search
      const response = await fetch("https://bigquery-medical-api-v2-production.up.railway.app/vector-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userMessage.content,
          top_k: 5
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: formatSearchResults(data),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ Failed to get AI search results: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-[1060] bg-black bg-opacity-50">
      <div className="absolute inset-4 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-mono">AI</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 font-mono">AI Search Results</h2>
              <p className="text-sm text-gray-600 font-mono">
                Query: "{searchQuery}"
              </p>
            </div>
          </div>
          <button 
            className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" 
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Dual Panel Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Search Results Summary */}
          <div 
            className="bg-gray-50 border-r border-gray-200 flex flex-col"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 font-mono">SEARCH SUMMARY</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {searchResults && searchResults.results ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="text-xs font-mono text-gray-500 mb-2">QUERY</div>
                    <div className="text-sm font-mono text-gray-900">{searchQuery}</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="text-xs font-mono text-gray-500 mb-2">RESULTS</div>
                    <div className="text-sm font-mono text-gray-900">
                      {searchResults.total_results} patients found
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="text-xs font-mono text-gray-500 mb-2">SEARCH TYPE</div>
                    <div className="text-sm font-mono text-gray-900">
                      {searchResults.search_type === 'vector_search' ? 'AI Semantic Search' : 'Direct Lookup'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-sm font-mono">No search results available</p>
                </div>
              )}
            </div>
          </div>

          {/* Resizer */}
          <div 
            className="w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors"
            onMouseDown={handleMouseDown}
          />

          {/* Right Panel - Chat */}
          <div 
            className="flex flex-col bg-white"
            style={{ width: `${100 - leftWidth}%` }}
          >
            <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 font-mono">AI SEARCH ANALYSIS</h3>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                        message.type === 'user' ? 'bg-blue-600 text-white' : 
                        message.type === 'system' ? 'bg-green-600 text-white' :
                        'bg-gray-800 text-white'
                      }`}>
                        {message.type === 'user' ? 'U' : message.type === 'system' ? 'S' : 'AI'}
                      </div>
                      <span className="text-xs font-mono text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`ml-8 p-4 rounded-lg ${
                      message.type === 'user' ? 'bg-blue-50 border border-blue-200' : 
                      message.type === 'system' ? 'bg-green-50 border border-green-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      {formatAIResponse(message.content)}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-mono">
                        AI
                      </div>
                      <span className="text-xs font-mono text-gray-500">Searching...</span>
                    </div>
                    <div className="ml-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                        <span className="text-sm font-mono text-gray-600">Processing search query...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder=""
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  disabled={loading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !query.trim()}
                  className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-mono hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
