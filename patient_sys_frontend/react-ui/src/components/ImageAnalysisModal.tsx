import { useState, useEffect } from "react";

type Props = {
  open: boolean;
  analysisResult: any;
  uploadedImage: string | null;
  onClose: () => void;
};

export function ImageAnalysisModal({ open, analysisResult, uploadedImage, onClose }: Props) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (open) {
      setShowAnimation(true);
    } else {
      setShowAnimation(false);
    }
  }, [open]);

  if (!open || !analysisResult) return null;

  return (
    <div className="fixed inset-0 z-[1070] bg-black bg-opacity-50">
      <div className={`absolute inset-4 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-w-6xl mx-auto mt-4 transition-all duration-500 ${
        showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 font-mono">
                📋 Prescription Analysis
              </h2>
            </div>
          </div>
          <button 
            className="text-gray-400 hover:text-gray-600 text-xl w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" 
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Side-by-side content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left side - Image */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 font-mono">📸 UPLOADED IMAGE</h3>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center bg-gray-50">
              {uploadedImage ? (
                <img 
                  src={uploadedImage} 
                  alt="Uploaded prescription" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-sm font-mono">Image preview not available</p>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Analysis */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 font-mono">🤖 AI ANALYSIS</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Analysis Date */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">📅</span>
                    <h4 className="text-xs font-semibold text-gray-700 font-mono">DATE</h4>
                  </div>
                  <p className="text-sm font-mono text-gray-900">
                    {analysisResult.analysis_date || 'N/A'}
                  </p>
                </div>

                {/* Patient ID */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">👤</span>
                    <h4 className="text-xs font-semibold text-blue-700 font-mono">PATIENT ID</h4>
                  </div>
                  <p className="text-lg font-mono text-blue-900 font-bold">
                    {analysisResult.patient_id || 'N/A'}
                  </p>
                </div>

                {/* Prescription Details */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">💊</span>
                    <h4 className="text-xs font-semibold text-green-700 font-mono">PRESCRIPTION</h4>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-green-100">
                    <p className="text-sm font-mono text-green-900 leading-relaxed">
                      {analysisResult.prescription || 'No prescription details found'}
                    </p>
                  </div>
                </div>

                {/* Additional Analysis */}
                {analysisResult.analysis && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">🔍</span>
                      <h4 className="text-xs font-semibold text-purple-700 font-mono">DETAILS</h4>
                    </div>
                    <div className="bg-white rounded-md p-3 border border-purple-100">
                      <p className="text-xs font-mono text-purple-900 leading-relaxed whitespace-pre-wrap">
                        {analysisResult.analysis}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-mono hover:bg-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
