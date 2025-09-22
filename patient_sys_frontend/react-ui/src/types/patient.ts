export type Patient = {
  registrationNo: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: "Female" | "Male" | "Other" | "F" | "M";
  address: string;
  firstVisitDate: string; // ISO date
  prescriptions?: string; // Raw prescription data from BigQuery
};

export type Prescription = {
  id: string;
  date: string;
  medication: string;
  notes: string;
};
