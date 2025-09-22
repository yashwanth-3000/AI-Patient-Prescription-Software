import { DataTable } from "@/components/ui/basic-data-table";

const DemoOne = () => {
  const data = [
    { id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "User", status: "Inactive" },
    { id: 4, name: "Alice Brown", email: "alice@example.com", role: "Moderator" },
    { id: 5, name: "Charlie Wilson", email: "charlie@example.com", role: "User" }
  ];

  const columns = [
    { key: "id" as const, header: "ID", sortable: true },
    { key: "name" as const, header: "Name", sortable: true, filterable: true },
    { key: "email" as const, header: "Email", sortable: true, filterable: true },
    { key: "role" as const, header: "Role", sortable: true, filterable: true }
  ];

  return (
    <div className="max-w-6xl w-[95%] mx-auto">
      <DataTable data={data} columns={columns} searchable itemsPerPage={10} />
    </div>
  );
};

export { DemoOne };


