import { useState, useEffect, useRef } from "react";
import type { Patient, Prescription } from "@/types/patient";

type Props = {
  open: boolean;
  patient: Patient | null;
  prescriptions: Prescription[];
  onClose: () => void;
};

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// Function to format AI response text with proper styling
const formatAIResponse = (text: string) => {
  // Split text into lines and process each line
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
    // Bullet points with *
    else if (trimmedLine.startsWith('*   **') || trimmedLine.startsWith('*   ')) {
      const bulletText = trimmedLine.replace(/^\*   \*\*(.*?)\*\*:?/, '<strong>$1</strong>:');
      const cleanText = bulletText.replace(/^\*   /, '');
      formattedLines.push(
        <div key={index} className="ml-6 mb-2 flex items-start">
          <span className="text-gray-400 mr-3 mt-1 text-sm">•</span>
          <div className="flex-1 text-gray-700" dangerouslySetInnerHTML={{ __html: cleanText }} />
        </div>
      );
    }
    // Numbered lists or bullet points
    else if (/^\d+\./.test(trimmedLine) || trimmedLine.startsWith('• ')) {
      formattedLines.push(
        <div key={index} className="ml-4 mb-2 text-gray-700">
          {trimmedLine}
        </div>
      );
    }
    // Section headers (In summary, In conclusion, etc.)
    else if (trimmedLine.includes('**') && (trimmedLine.startsWith('In ') || trimmedLine.includes(':'))) {
      const formattedText = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formattedLines.push(
        <h4 key={index} className="text-base font-semibold text-gray-800 mt-4 mb-2" 
            dangerouslySetInnerHTML={{ __html: formattedText }} />
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
    // Italic text inline
    else if (trimmedLine.includes('*') && !trimmedLine.startsWith('*')) {
      const formattedText = trimmedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
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

export function AIChatModal({ open, patient, prescriptions, onClose }: Props) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(35); // Percentage width of left panel
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMessages([]);
      setQuery("");
    }
  }, [open]);

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
      setLeftWidth(Math.min(Math.max(newLeftWidth, 20), 80)); // Min 20%, Max 80%
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
  }, []); // Empty dependency array - only setup/cleanup once

  // NOW we can do conditional returns AFTER all hooks are called
  if (!open || !patient) {
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
    
    // Add waiting message
    const waitingMessage: ChatMessage = {
      id: (Date.now() + 0.5).toString(),
      type: 'ai',
      content: "🤖 **AI Medical Assistant is analyzing...**\n\n⏳ This will take approximately 30 seconds. Please wait while I process your query and analyze the patient data.\n\n🔍 *Analyzing patient history, prescriptions, and medical patterns...*",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, waitingMessage]);
    
    try {
      const response = await fetch("https://bigquery-medical-api-v2-production.up.railway.app/analyze-patient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pid: parseInt(patient.registrationNo),
          query: userMessage.content
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.ai_analysis || "No analysis available",
        timestamp: new Date()
      };

      // Remove waiting message and add the actual AI response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== waitingMessage.id);
        return [...filtered, aiMessage];
      });
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ Failed to get AI analysis: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      // Remove waiting message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== waitingMessage.id);
        return [...filtered, errorMessage];
      });
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
              <h2 className="text-lg font-semibold text-gray-900 font-mono">Medical Analysis</h2>
              <p className="text-sm text-gray-600 font-mono">
                {patient.firstName} {patient.lastName} • PID: {patient.registrationNo}
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
          {/* Left Panel - Prescriptions */}
          <div 
            className="bg-gray-50 border-r border-gray-200 flex flex-col"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 font-mono">PRESCRIPTION HISTORY</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {prescriptions.length > 0 ? (
                <div className="space-y-4">
                  {prescriptions.map((prescription, index) => (
                    <div key={prescription.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono text-gray-500">#{index + 1}</span>
                        <span className="text-xs font-mono text-gray-400">
                          {new Date(prescription.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-mono text-gray-500 block">MEDICATION:</span>
                          <span className="text-sm font-mono text-gray-900">{prescription.medication}</span>
                        </div>
                        {prescription.notes && (
                          <div>
                            <span className="text-xs font-mono text-gray-500 block">NOTES:</span>
                            <span className="text-sm font-mono text-gray-700">{prescription.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-sm font-mono">No prescriptions available</p>
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
              <h3 className="text-sm font-semibold text-gray-700 font-mono">AI MEDICAL ASSISTANT</h3>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-sm font-mono mb-4">Ask me about this patient's medical history</p>
                  <div className="text-xs font-mono text-gray-300 text-center max-w-xs">
                    <p className="mb-2">Example queries:</p>
                    <div className="space-y-1">
                      <div>• "What conditions were treated?"</div>
                      <div>• "Analyze prescription patterns"</div>
                      <div>• "What are the key insights?"</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                          message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
                        }`}>
                          {message.type === 'user' ? 'U' : 'AI'}
                        </div>
                        <span className="text-xs font-mono text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={`ml-8 p-4 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}>
                        {message.type === 'ai' ? (
                          formatAIResponse(message.content)
                        ) : (
                          <p className="text-sm text-gray-900 font-mono">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-mono">
                          AI
                        </div>
                        <span className="text-xs font-mono text-gray-500">Analyzing...</span>
                      </div>
                      <div className="ml-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                          <span className="text-sm font-mono text-gray-600">Processing medical data...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
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