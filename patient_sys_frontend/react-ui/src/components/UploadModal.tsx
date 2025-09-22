import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
  onSelectFromComputer: () => void;
};

// Sample images available in the imgs folder
const sampleImages = [
  { name: "IMG_0207.png", path: "/imgs/IMG_0207.png" },
  { name: "IMG_0209.png", path: "/imgs/IMG_0209.png" },
  { name: "IMG_0210.png", path: "/imgs/IMG_0210.png" },
  { name: "IMG_0211.png", path: "/imgs/IMG_0211.png" },
];

export function UploadModal({ open, onClose, onFileSelect, onSelectFromComputer }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!open) return null;

  const handleSampleImageSelect = async (imagePath: string) => {
    try {
      const response = await fetch(imagePath);
      const blob = await response.blob();
      const fileName = imagePath.split('/').pop() || 'sample-image.png';
      const file = new File([blob], fileName, { type: blob.type });
      onFileSelect(file);
    } catch (error) {
      console.error('Error loading sample image:', error);
      alert('Error loading sample image. Please try selecting from your computer instead.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] bg-black bg-opacity-50">
      <div className="absolute inset-4 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-w-4xl mx-auto mt-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-mono">📤</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 font-mono">Upload Prescription</h2>
              <p className="text-sm text-gray-600 font-mono">
                Choose from sample images or select from your computer
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Select from Computer Button */}
          <div className="mb-8">
            <h3 className="text-md font-semibold text-gray-800 font-mono mb-4">
              📁 Select from Your Computer
            </h3>
            <button
              onClick={() => {
                onSelectFromComputer();
                onClose();
              }}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm font-mono text-gray-600">
                  Click to browse files from your computer
                </span>
                <span className="text-xs font-mono text-gray-400">
                  Supports: PNG, JPG, JPEG, PDF
                </span>
              </div>
            </button>
          </div>

          {/* Sample Images Grid */}
          <div>
            <h3 className="text-md font-semibold text-gray-800 font-mono mb-4">
              📋 Sample Prescription Images
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sampleImages.map((image, index) => (
                <div
                  key={image.name}
                  className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedImage === image.path
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImage(image.path)}
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <img
                      src={image.path}
                      alt={`Sample prescription ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if image doesn't load
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden flex-col items-center justify-center text-gray-400">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-mono">Sample {index + 1}</span>
                    </div>
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-xs font-mono text-gray-600 truncate">
                      {image.name}
                    </p>
                  </div>
                  {selectedImage === image.path && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md text-sm font-mono hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedImage && handleSampleImageSelect(selectedImage)}
              disabled={!selectedImage}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-mono hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Upload Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
