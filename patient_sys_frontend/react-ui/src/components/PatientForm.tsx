import { useEffect, useState } from "react";
import type { Patient } from "@/types/patient";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (patient: Patient) => void;
};

export function PatientForm({ open, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<Patient>({
    registrationNo: "",
    firstName: "",
    lastName: "",
    age: 0,
    gender: "Female",
    address: "",
    firstVisitDate: ""
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setValues({ registrationNo: "", firstName: "", lastName: "", age: 0, gender: "Female", address: "", firstVisitDate: "" });
      setTouched({});
    }
  }, [open]);

  if (!open) return null;

  const set = (key: keyof Patient, v: any) => setValues((s) => ({ ...s, [key]: v }));
  const mark = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const invalid = (cond: boolean) => (cond ? "border-red-400" : "");

  const ageNum = Number(values.age);
  const errors = {
    registrationNo: !values.registrationNo,
    firstName: !values.firstName,
    lastName: !values.lastName,
    age: !Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120,
    gender: !values.gender,
    address: !values.address,
    firstVisitDate: !values.firstVisitDate
  };
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="fixed inset-0 z-[1050]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-w-3xl mx-auto mt-16 bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-lg font-semibold">Add New Patient</div>
          <button className="text-sm px-2 py-1" onClick={onClose}>×</button>
        </div>
        <form
          className="p-4 grid grid-cols-12 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched({ registrationNo: true, firstName: true, lastName: true, age: true, gender: true, address: true, firstVisitDate: true });
            if (hasErrors) return;
            onSubmit({ ...values, age: ageNum });
          }}
        >
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm mb-1">Registration No</label>
            <input value={values.registrationNo} onBlur={() => mark("registrationNo")} onChange={(e) => set("registrationNo", e.target.value)} className={`w-full border rounded-md px-3 py-2 ${touched.registrationNo && invalid(errors.registrationNo)}`} />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm mb-1">First Name</label>
            <input value={values.firstName} onBlur={() => mark("firstName")} onChange={(e) => set("firstName", e.target.value)} className={`w-full border rounded-md px-3 py-2 ${touched.firstName && invalid(errors.firstName)}`} />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm mb-1">Last Name</label>
            <input value={values.lastName} onBlur={() => mark("lastName")} onChange={(e) => set("lastName", e.target.value)} className={`w-full border rounded-md px-3 py-2 ${touched.lastName && invalid(errors.lastName)}`} />
          </div>

          <div className="col-span-12 md:col-span-3">
            <label className="block text-sm mb-1">Age</label>
            <input type="number" value={values.age} onBlur={() => mark("age")} onChange={(e) => set("age", Number(e.target.value))} className={`w-full border rounded-md px-3 py-2 ${touched.age && invalid(errors.age)}`} />
          </div>
          <div className="col-span-12 md:col-span-3">
            <label className="block text-sm mb-1">Gender</label>
            <select value={values.gender} onBlur={() => mark("gender")} onChange={(e) => set("gender", e.target.value)} className={`w-full border rounded-md px-3 py-2 ${touched.gender && invalid(errors.gender)}`}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="col-span-12 md:col-span-6">
            <label className="block text-sm mb-1">Address</label>
            <input value={values.address} onBlur={() => mark("address")} onChange={(e) => set("address", e.target.value)} className={`w-full border rounded-md px-3 py-2 ${touched.address && invalid(errors.address)}`} />
          </div>

          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm mb-1">First Visit Date</label>
            <input type="date" value={values.firstVisitDate} onBlur={() => mark("firstVisitDate")} onChange={(e) => set("firstVisitDate", e.target.value)} className={`w-full border rounded-md px-3 py-2 ${touched.firstVisitDate && invalid(errors.firstVisitDate)}`} />
          </div>

          <div className="col-span-12 flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 border rounded-md">Cancel</button>
            <button type="submit" className="px-3 py-2 border rounded-md bg-black text-white">Save Patient</button>
          </div>
        </form>
      </div>
    </div>
  );
}


