"use client";

import type { ReactNode } from "react";
import TeacherHeader from "@/components/TeacherHeader";

export const dynamic = "force-dynamic";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TeacherHeader />
      <main>{children}</main>
    </>
  );
}
