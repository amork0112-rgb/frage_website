"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LineChart, Users, Building2, Settings, DollarSign, ArrowLeftRight, ClipboardList, ThumbsUp } from "lucide-react";

export default function AdminMasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = [
    { href: "/admin/master/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/master/finance/revenue", label: "Finance • Revenue", icon: DollarSign },
    { href: "/admin/master/finance/cost", label: "Finance • Cost", icon: DollarSign },
    { href: "/admin/master/finance/profit", label: "Finance • Profit", icon: LineChart },
    { href: "/admin/master/students/retention", label: "Students • Retention", icon: Users },
    { href: "/admin/master/students/churn", label: "Students • Churn", icon: Users },
    { href: "/admin/master/students/lifecycle", label: "Students • Lifecycle", icon: ClipboardList },
    { href: "/admin/master/marketing/conversion", label: "Marketing • Conversion", icon: ArrowLeftRight },
    { href: "/admin/master/survey/nps", label: "Survey • NPS", icon: ThumbsUp },
    { href: "/admin/master/survey/feedback", label: "Survey • Feedback", icon: ClipboardList },
    { href: "/admin/master/campuses/compare", label: "Campuses • Compare", icon: Building2 },
    { href: "/admin/master/campuses/detail/International", label: "Campuses • Detail", icon: Building2 },
    { href: "/admin/master/settings/campus_config", label: "Settings • Campus", icon: Settings },
    { href: "/admin/master/settings/kpi_thresholds", label: "Settings • Thresholds", icon: Settings },
    { href: "/admin/master/settings/master_accounts", label: "Settings • Accounts", icon: Settings },
  ];
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
              const active = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== "/admin/master/dashboard");
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
