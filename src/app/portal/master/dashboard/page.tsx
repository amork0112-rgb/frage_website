"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CAMPUS_CONFIG } from "@/config/campus";
import { supabase } from "@/lib/supabase";

type RevenueItem = { month: string; campus?: string; amount: number };
type CostItem = { month: string; campus?: string; fixed: number; variable: number };
type SnapshotItem = { month: string; campus?: string; total: number; retained: number };
type ConsultationItem = { month: string; campus?: string; completed: number; registered: number };
type SurveyItem = { month: string; campus?: string; score: number };
type Thresholds = { retention_min?: number; conversion_target?: number };
type Status = "ok" | "warn" | "risk";

const ymStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthsBack = (n: number) => {
  const arr: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const c = new Date(d.getFullYear(), d.getMonth() - i, 1);
    arr.push(ymStr(c));
  }
  return arr;
};

export default function MasterDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const role = (user?.app_metadata as any)?.role ?? null;
        setAuthorized(role === "master_admin");
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [revenues, setRevenues] = useState<RevenueItem[]>([]);
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>({});
  const [campus, setCampus] = useState<string>("All");
  const [period, setPeriod] = useState<"month" | "quarter">("month");
  const last6 = monthsBack(6);
  const month = ymStr(new Date());
  const prev = ymStr(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));

  useEffect(() => {
    try {
      const rv = JSON.parse(localStorage.getItem("monthly_revenue") || "[]");
      const cs = JSON.parse(localStorage.getItem("monthly_costs") || "[]");
      const ss = JSON.parse(localStorage.getItem("student_monthly_snapshot") || "[]");
      const ct = JSON.parse(localStorage.getItem("consultations") || "[]");
      const sv = JSON.parse(localStorage.getItem("survey_responses") || "[]");
      const th = JSON.parse(localStorage.getItem("kpi_thresholds") || "{}");
      setRevenues(Array.isArray(rv) ? rv : []);
      setCosts(Array.isArray(cs) ? cs : []);
      setSnapshots(Array.isArray(ss) ? ss : []);
      setConsultations(Array.isArray(ct) ? ct : []);
      setSurveys(Array.isArray(sv) ? sv : []);
      setThresholds(typeof th === "object" && th ? th : {});
    } catch {
      setRevenues([]);
      setCosts([]);
      setSnapshots([]);
      setConsultations([]);
      setSurveys([]);
      setThresholds({});
    }
  }, []);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const filterCampus = useCallback(<T extends { campus?: string }>(arr: T[]) => (campus === "All" ? arr : arr.filter((a) => a.campus === campus)), [campus]);

  const profitMargin = useMemo(() => {
    const rv = filterCampus(revenues).filter((r) => r.month === month).map((r) => r.amount);
    const cs = filterCampus(costs).filter((c) => c.month === month).map((c) => (c.fixed || 0) + (c.variable || 0));
    const revenue = sum(rv);
    const totalCost = sum(cs);
    if (!revenue) return { value: 0, delta: 0, status: "risk" as Status };
    const value = ((revenue - totalCost) / revenue) * 100;
    const prevRv = filterCampus(revenues).filter((r) => r.month === prev).map((r) => r.amount);
    const prevCs = filterCampus(costs).filter((c) => c.month === prev).map((c) => (c.fixed || 0) + (c.variable || 0));
    const prevRevenue = sum(prevRv);
    const prevTotalCost = sum(prevCs);
    const prevVal = prevRevenue ? ((prevRevenue - prevTotalCost) / prevRevenue) * 100 : 0;
    const status: Status = value >= 20 ? "ok" : value >= 10 ? "warn" : "risk";
    return { value, delta: value - prevVal, status };
  }, [revenues, costs, month, prev, filterCampus]);

  const retentionRate = useMemo((): { value: number; delta: number; status: Status } => {
    const ss = filterCampus(snapshots).find((s) => s.month === month);
    const pv = filterCampus(snapshots).find((s) => s.month === prev);
    const value = ss && ss.total ? Math.round(((ss.retained || 0) / ss.total) * 100 * 10) / 10 : 0;
    const prevVal = pv && pv.total ? Math.round(((pv.retained || 0) / pv.total) * 100 * 10) / 10 : 0;
    const min = typeof thresholds.retention_min === "number" ? thresholds.retention_min : 93;
    const status: Status = value >= min ? "ok" : value >= min - 2 ? "warn" : "risk";
    return { value, delta: value - prevVal, status };
  }, [snapshots, thresholds, month, prev, filterCampus]);

  const conversionRate = useMemo((): { value: number; delta: number; status: Status } => {
    const ct = filterCampus(consultations).find((c) => c.month === month);
    const pv = filterCampus(consultations).find((c) => c.month === prev);
    const value = ct && ct.completed ? Math.round(((ct.registered || 0) / ct.completed) * 100 * 10) / 10 : 0;
    const prevVal = pv && pv.completed ? Math.round(((pv.registered || 0) / pv.completed) * 100 * 10) / 10 : 0;
    const target = typeof thresholds.conversion_target === "number" ? thresholds.conversion_target : 60;
    const status: Status = value >= target ? "ok" : value >= target - 5 ? "warn" : "risk";
    return { value, delta: value - prevVal, status };
  }, [consultations, thresholds, month, prev, filterCampus]);

  const npsScore = useMemo((): { value: number; delta: number; status: Status; breakdown: { p: number; n: number; d: number } } => {
    const list = filterCampus(surveys).filter((s) => s.month === month).map((s) => s.score);
    const pvList = filterCampus(surveys).filter((s) => s.month === prev).map((s) => s.score);
    const calc = (scores: number[]) => {
      if (!scores.length) return { score: 0, p: 0, n: 0, d: 0 };
      const p = scores.filter((v) => v >= 9).length;
      const d = scores.filter((v) => v <= 6).length;
      const n = scores.length - p - d;
      const total = scores.length;
      const score = Math.round((p / total) * 100 - (d / total) * 100);
      return { score, p: Math.round((p / total) * 100), n: Math.round((n / total) * 100), d: Math.round((d / total) * 100) };
    };
    const cur = calc(list);
    const prevCur = calc(pvList);
    const status: Status = cur.score >= 40 ? "ok" : cur.score >= 20 ? "warn" : "risk";
    return { value: cur.score, delta: cur.score - prevCur.score, status, breakdown: { p: cur.p, n: cur.n, d: cur.d } };
  }, [surveys, month, prev, filterCampus]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }
  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm">
          <h1 className="text-xl font-black text-slate-900 mb-2">접근 권한 없음</h1>
          <p className="text-slate-500 text-sm">Master Admin만 접근 가능합니다.</p>
        </div>
      </div>
    );
  }

  const badge = (status: Status): string =>
    status === "ok" ? "bg-green-100 text-green-700" : status === "warn" ? "bg-yellow-100 text-yellow-700" : "bg-rose-100 text-rose-700";

  const kpiSeries = (key: "profit" | "retention" | "conversion" | "nps") => {
    return last6.map((m) => {
      if (key === "profit") {
        const rv = filterCampus(revenues).filter((r) => r.month === m).map((r) => r.amount);
        const cs = filterCampus(costs).filter((c) => c.month === m).map((c) => (c.fixed || 0) + (c.variable || 0));
        const revenue = sum(rv);
        const totalCost = sum(cs);
        return revenue ? ((revenue - totalCost) / revenue) * 100 : 0;
      }
      if (key === "retention") {
        const ss = filterCampus(snapshots).find((s) => s.month === m);
        return ss && ss.total ? ((ss.retained || 0) / ss.total) * 100 : 0;
      }
      if (key === "conversion") {
        const ct = filterCampus(consultations).find((c) => c.month === m);
        return ct && ct.completed ? ((ct.registered || 0) / ct.completed) * 100 : 0;
      }
      const list = filterCampus(surveys).filter((s) => s.month === m).map((s) => s.score);
      if (!list.length) return 0;
      const p = list.filter((v) => v >= 9).length;
      const d = list.filter((v) => v <= 6).length;
      const total = list.length;
      return Math.round((p / total) * 100 - (d / total) * 100);
    });
  };

  const Line = ({ values }: { values: number[] }) => {
    const max = Math.max(1, ...values);
    const min = Math.min(0, ...values);
    const w = 360;
    const h = 80;
    const step = w / (values.length - 1 || 1);
    const norm = (v: number) => ((v - min) / (max - min || 1)) * (h - 10) + 5;
    const d = values.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - norm(v)}`).join(" ");
    return (
      <svg width={w} height={h} className="text-slate-400">
        <rect x={0} y={0} width={w} height={h} fill="none" className="stroke-slate-200" />
        <path d={d} className="stroke-slate-600" fill="none" strokeWidth={2} />
      </svg>
    );
  };

  const campuses = Object.keys(CAMPUS_CONFIG);
  const campusRow = (key: string) => {
    const rv = revenues.filter((r) => r.campus === key && r.month === month).map((r) => r.amount);
    const cs = costs.filter((c) => c.campus === key && c.month === month).map((c) => (c.fixed || 0) + (c.variable || 0));
    const revenue = sum(rv);
    const totalCost = sum(cs);
    const pm = revenue ? ((revenue - totalCost) / revenue) * 100 : 0;
    const ss = snapshots.find((s) => s.campus === key && s.month === month);
    const ret = ss && ss.total ? Math.round(((ss.retained || 0) / ss.total) * 1000) / 10 : 0;
    const ct = consultations.find((c) => c.campus === key && c.month === month);
    const conv = ct && ct.completed ? Math.round(((ct.registered || 0) / ct.completed) * 1000) / 10 : 0;
    const list = surveys.filter((s) => s.campus === key && s.month === month).map((s) => s.score);
    const p = list.filter((v) => v >= 9).length;
    const d = list.filter((v) => v <= 6).length;
    const total = list.length;
    const nps = total ? Math.round((p / total) * 100 - (d / total) * 100) : 0;
    const cls = (v: number, type: "pm" | "ret" | "conv" | "nps") => {
      const s: Status =
        type === "ret"
          ? v >= (thresholds.retention_min || 93) ? "ok" : v >= (thresholds.retention_min || 93) - 2 ? "warn" : "risk"
          : type === "conv"
          ? v >= (thresholds.conversion_target || 60) ? "ok" : v >= (thresholds.conversion_target || 60) - 5 ? "warn" : "risk"
          : type === "nps"
          ? v >= 40 ? "ok" : v >= 20 ? "warn" : "risk"
          : v >= 20 ? "ok" : v >= 10 ? "warn" : "risk";
      return badge(s);
    };
    return { pm, ret, conv, nps, cls };
  };

  const retentionAlert =
    last6.slice(-2).every((m) => {
      const ss = filterCampus(snapshots).find((s) => s.month === m);
      const v = ss && ss.total ? ((ss.retained || 0) / ss.total) * 100 : 100;
      const min = thresholds.retention_min || 93;
      return v < min;
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Executive Overview</div>
            <h1 className="text-2xl font-black text-slate-900">Executive KPI Overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
            </select>
            <select value={campus} onChange={(e) => setCampus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">
              <option value="All">All</option>
              {campuses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase">Profit Margin</div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-black text-slate-900">{Math.round(profitMargin.value * 10) / 10}%</div>
              <div className={`text-xs font-bold ${profitMargin.delta >= 0 ? "text-green-600" : "text-rose-600"}`}>
                {profitMargin.delta >= 0 ? `+${Math.round(profitMargin.delta * 10) / 10}%` : `${Math.round(profitMargin.delta * 10) / 10}%`}
              </div>
            </div>
            <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded ${badge(profitMargin.status)}`}>{profitMargin.status === "ok" ? "🟢 Healthy" : profitMargin.status === "warn" ? "🟡 Warning" : "🔴 Risk"}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase">Retention Rate</div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-black text-slate-900">{retentionRate.value}%</div>
              <div className={`text-xs font-bold ${retentionRate.delta >= 0 ? "text-green-600" : "text-rose-600"}`}>
                {retentionRate.delta >= 0 ? `+${Math.round(retentionRate.delta * 10) / 10}%` : `${Math.round(retentionRate.delta * 10) / 10}%`}
              </div>
            </div>
            <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded ${badge(retentionRate.status)}`}>{retentionRate.status === "ok" ? "🟢 Healthy" : retentionRate.status === "warn" ? "🟡 Warning" : "🔴 Risk"}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase">Consultation Conversion</div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-black text-slate-900">{conversionRate.value}%</div>
              <div className={`text-xs font-bold ${conversionRate.delta >= 0 ? "text-green-600" : "text-rose-600"}`}>
                {conversionRate.delta >= 0 ? `+${Math.round(conversionRate.delta * 10) / 10}%` : `${Math.round(conversionRate.delta * 10) / 10}%`}
              </div>
            </div>
            <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded ${badge(conversionRate.status)}`}>{conversionRate.status === "ok" ? "🟢 Healthy" : conversionRate.status === "warn" ? "🟡 Warning" : "🔴 Risk"}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase">NPS</div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-black text-slate-900">{npsScore.value >= 0 ? `+${npsScore.value}` : `${npsScore.value}`}</div>
              <div className={`text-xs font-bold ${npsScore.delta >= 0 ? "text-green-600" : "text-rose-600"}`}>
                {npsScore.delta >= 0 ? `+${npsScore.delta}` : `${npsScore.delta}`}
              </div>
            </div>
            <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded ${badge(npsScore.status)}`}>{npsScore.status === "ok" ? "🟢 Healthy" : npsScore.status === "warn" ? "🟡 Warning" : "🔴 Risk"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Profit Margin Trend</div>
            <Line values={kpiSeries("profit")} />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Retention Trend</div>
            <Line values={kpiSeries("retention")} />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Conversion Trend</div>
            <Line values={kpiSeries("conversion")} />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">NPS Trend</div>
            <Line values={kpiSeries("nps")} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
          <div className="text-xs font-bold text-slate-500 uppercase mb-3">Campus Comparison</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left p-2 font-bold">Campus</th>
                  <th className="text-left p-2 font-bold">Profit Margin</th>
                  <th className="text-left p-2 font-bold">Retention</th>
                  <th className="text-left p-2 font-bold">Conversion</th>
                  <th className="text-left p-2 font-bold">NPS</th>
                </tr>
              </thead>
              <tbody>
                {campuses.map((c) => {
                  const row = campusRow(c);
                  return (
                    <tr key={c} className="border-t border-slate-100">
                      <td className="p-2 font-bold text-slate-800">{c}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.cls(row.pm, "pm")}`}>{Math.round(row.pm * 10) / 10}%</span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.cls(row.ret, "ret")}`}>{row.ret}%</span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.cls(row.conv, "conv")}`}>{row.conv}%</span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.cls(row.nps, "nps")}`}>{row.nps >= 0 ? `+${row.nps}` : row.nps}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-500 uppercase">Retention & Churn</div>
              <div className="text-[11px] font-bold text-slate-400">Baseline 93%</div>
            </div>
            <Line values={kpiSeries("retention")} />
            {retentionAlert && (
              <div className="mt-3 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                Retention dropped below threshold for 2 consecutive months.
              </div>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-3">Conversion Funnel</div>
            <div className="space-y-2">
              {(() => {
                const ct = filterCampus(consultations).find((c) => c.month === month);
                const inquiries = (ct?.completed || 0) + Math.round((ct?.completed || 0) * 0.5);
                const consultationsCnt = ct?.completed || 0;
                const registrations = ct?.registered || 0;
                const total = Math.max(1, inquiries);
                const items = [
                  { label: "Inquiries", value: inquiries },
                  { label: "Consultations", value: consultationsCnt },
                  { label: "Registrations", value: registrations },
                ];
                return items.map((it, idx) => {
                  const pct = Math.round((it.value / total) * 100);
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-28 text-xs font-bold text-slate-500 uppercase">{it.label}</div>
                      <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                        <div className="h-full bg-slate-600" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-16 text-right text-xs font-bold text-slate-700">{pct}%</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">NPS Score</div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-black text-slate-900">{npsScore.value >= 0 ? `+${npsScore.value}` : `${npsScore.value}`}</div>
              <div className={`text-xs font-bold ${npsScore.delta >= 0 ? "text-green-600" : "text-rose-600"}`}>
                {npsScore.delta >= 0 ? `+${npsScore.delta}` : `${npsScore.delta}`}
              </div>
              <span className={`ml-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded ${badge(npsScore.status)}`}>{npsScore.status === "ok" ? "🟢 Healthy" : npsScore.status === "warn" ? "🟡 Warning" : "🔴 Risk"}</span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-24 text-xs font-bold text-slate-500 uppercase">Promoters</div>
                <div className="flex-1 h-4 bg-slate-100 rounded">
                  <div className="h-full bg-slate-700" style={{ width: `${npsScore.breakdown.p}%` }} />
                </div>
                <div className="w-12 text-right text-xs font-bold text-slate-700">{npsScore.breakdown.p}%</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 text-xs font-bold text-slate-500 uppercase">Neutral</div>
                <div className="flex-1 h-4 bg-slate-100 rounded">
                  <div className="h-full bg-slate-500" style={{ width: `${npsScore.breakdown.n}%` }} />
                </div>
                <div className="w-12 text-right text-xs font-bold text-slate-700">{npsScore.breakdown.n}%</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 text-xs font-bold text-slate-500 uppercase">Detractors</div>
                <div className="flex-1 h-4 bg-slate-100 rounded">
                  <div className="h-full bg-slate-400" style={{ width: `${npsScore.breakdown.d}%` }} />
                </div>
                <div className="w-12 text-right text-xs font-bold text-slate-700">{npsScore.breakdown.d}%</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Feedback Insights</div>
            <div className="text-sm text-slate-600">최근 설문 응답 기반 인사이트는 Survey 페이지에서 확인하세요.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
