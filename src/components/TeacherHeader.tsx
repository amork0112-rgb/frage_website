"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Video, FileText, LogOut, Menu, X, Users, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function TeacherHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const appRole = (data?.user?.app_metadata as any)?.role ?? null;
        setRole(appRole);
        const authUserId = data?.user?.id;
        if (authUserId) {
          const { data: rows } = await supabase
            .from("teachers")
            .select("id,name")
            .eq("id", authUserId)
            .limit(1);
          const teacher = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
          setTeacherId(teacher?.id ? String(teacher.id) : null);
          const fallback =
            (data?.user?.user_metadata as any)?.name ||
            String(data?.user?.email || "").split("@")[0] ||
            "";
          setTeacherName(teacher?.name ? String(teacher.name) : fallback);
        }
      } catch {}
    })();
  }, []);

  const isTeacher = !!role && ["teacher", "master_teacher", "교사"].some((k) => role!.toLowerCase().includes(k));
  if (!isTeacher) return null;

  const menuGroups: {
    name: string;
    href?: string;
    icon: any;
    children?: { name: string; href: string; icon: any }[];
  }[] = [
    { name: "Dashboard", href: "/teacher/home", icon: Home },
    {
      name: "Students",
      icon: Users,
      children: [
        { name: "New", href: "/teacher/new-students", icon: UserPlus },
        { name: "List", href: "/teacher/students", icon: Users },
      ],
    },
    {
      name: "Video",
      icon: Video,
      children: [
        { name: "HW", href: "/teacher/video", icon: Video },
        { name: "Manage", href: "/teacher/video-management", icon: Video },
      ],
    },
    { name: "Reports", href: "/teacher/reports", icon: FileText },
  ];

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-frage-navy rounded-lg flex items-center justify-center text-white font-black text-lg">T</div>
            <Link href="/teacher/home" className="text-xl font-bold text-slate-900 tracking-tight">
                FRAGE <span className="text-frage-blue">Teacher</span>
            </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-1">
          {menuGroups.map((group) => {
            const activeChild =
              group.children?.some((c) => pathname.startsWith(c.href)) ?? false;
            const isActive =
              (group.href ? pathname.startsWith(group.href) : false) || activeChild;
            if (group.children && group.children.length > 0) {
              return (
                <div
                  key={group.name}
                  className="relative"
                  onMouseEnter={() => setOpenGroup(group.name)}
                  onMouseLeave={() => setOpenGroup(null)}
                >
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-slate-100 text-frage-blue"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <group.icon className={`w-4 h-4 ${isActive ? "stroke-2" : "stroke-1.5"}`} />
                    {group.name}
                  </button>
                  <div
                    className={`absolute left-0 top-full min-w-[180px] rounded-xl border border-slate-200 bg-white shadow-lg ${
                      openGroup === group.name ? "block" : "hidden"
                    }`}
                  >
                    <div className="py-2">
                      {group.children.map((child) => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold ${
                              childActive
                                ? "text-frage-blue bg-slate-50"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <child.icon className="w-4 h-4" />
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={group.href}
                href={group.href!}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-slate-100 text-frage-blue"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <group.icon className={`w-4 h-4 ${isActive ? "stroke-2" : "stroke-1.5"}`} />
                {group.name}
              </Link>
            );
          })}
        </nav>

        {/* User / Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
           <div className="hidden md:flex items-center gap-3">
               <div className="text-right">
                   <p className="text-xs font-bold text-slate-900">{teacherId === "master_teacher" ? "Head Teacher" : teacherName || "Teacher"}</p>
                   <p className="text-[10px] text-slate-500">{teacherId === "master_teacher" ? "Head Teacher" : "Teacher"}</p>
               </div>
               <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                   <UserIcon />
               </div>
               <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
                   <LogOut className="w-5 h-5" />
               </button>
           </div>

           {/* Mobile Menu Button */}
           <button 
             className="md:hidden p-2 text-slate-600"
             onClick={() => setIsMenuOpen(!isMenuOpen)}
           >
             {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-lg">
          <div className="p-2 space-y-1">
            {menuGroups.map((group) => {
              const hasChildren = !!group.children && group.children.length > 0;
              const isActive =
                (group.href ? pathname.startsWith(group.href) : false) ||
                (group.children?.some((c) => pathname.startsWith(c.href)) ?? false);
              return (
                <div key={group.name} className="space-y-1">
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold ${
                      isActive ? "bg-slate-50 text-frage-blue" : "text-slate-600"
                    }`}
                  >
                    <group.icon className="w-5 h-5" />
                    {group.name}
                  </div>
                  {hasChildren && (
                    <div className="pl-10 space-y-1">
                      {group.children!.map((child) => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                              childActive ? "bg-slate-50 text-frage-blue" : "text-slate-600"
                            }`}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <child.icon className="w-4 h-4" />
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {!hasChildren && group.href && (
                    <Link
                      href={group.href}
                      className="sr-only"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {group.name}
                    </Link>
                  )}
                </div>
              );
            })}
            <div className="h-px bg-slate-100 my-2"></div>
            <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50"
            >
                <LogOut className="w-5 h-5" />
                Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function UserIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    )
}
