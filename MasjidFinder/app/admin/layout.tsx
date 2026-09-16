import AdminNav from "./AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-sand-50">
      <AdminNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
