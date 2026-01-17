"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TeacherHeader from "@/components/TeacherHeader";

export const dynamic = "force-dynamic";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/portal");
        return;
      }
      const role = (user.app_metadata as any)?.role ?? "parent";
      const teacherRoles = ["teacher", "master_teacher"];
      if (!teacherRoles.includes(role)) {
        router.replace("/portal");
        return;
      }
      setAuthorized(true);
    };
    checkUser();
  }, [router]);

  if (!authorized) return <div className="min-h-screen bg-white" />;

  return (
    <>
      <TeacherHeader />
      <main>{children}</main>
    </>
  );
}
