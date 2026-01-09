"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
 

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav: { href: string; label: string; icon: any }[] = [];
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="flex">
        <aside className="w-64 bg-slate-900 text-white min-h-screen sticky top-0">
          <div className="px-4 py-4 border-b border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase">Master Admin</div>
            <div className="text-lg font-black">Executive</div>
          </div>
          <nav className="p-2 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== "/portal/master/dashboard");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    active ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
