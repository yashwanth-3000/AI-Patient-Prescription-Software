import type { Patient, Prescription } from "@/types/patient";

type Props = {
  open: boolean;
  patient: Patient | null;
  items: Prescription[];
  onAdd: (rx: Prescription) => void;
  onClose: () => void;
  onOpenChat: () => void;
};

export function PrescriptionModal({ open, patient, items, onAdd, onClose, onOpenChat }: Props) {
  if (!open || !patient) return null;
  let today = new Date().toISOString().slice(0, 10);
  return (
    <div className="fixed inset-0 z-[1050]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-w-3xl mx-auto mt-16 bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-lg font-semibold">Prescription History</div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenChat}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              🤖 AI Chat
            </button>
            <button className="text-sm px-2 py-1" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
            <span className="font-semibold text-black">{patient.firstName} {patient.lastName}</span>
            <span>Reg: {patient.registrationNo}</span>
            <span>Age: {patient.age}</span>
            <span>Gender: {patient.gender}</span>
          </div>
          <div className="overflow-auto max-h-[50vh] border rounded-md">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Prescription</th></tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={2} className="text-center text-gray-500 px-3 py-6">No prescriptions</td></tr>
                ) : items.map((r, i) => (
                  <tr key={r.id || i} className="border-t">
                    <td className="px-3 py-2">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{r.medication}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={onClose} className="px-3 py-2 border rounded-md">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}


