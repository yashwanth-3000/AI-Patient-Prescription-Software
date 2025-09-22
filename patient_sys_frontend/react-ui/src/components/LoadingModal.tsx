import { useState, useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
};

export function LoadingModal({ open, title, message }: Props) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!open) return;

    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    return () => {
      clearInterval(dotsInterval);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1080] bg-black bg-opacity-40">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-800"></div>
            <div>
              <p className="text-sm font-mono text-gray-800">{message}{dots}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
