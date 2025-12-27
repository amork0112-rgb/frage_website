import TeacherHeader from "@/components/TeacherHeader";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <TeacherHeader />
      {children}
    </div>
  );
}
