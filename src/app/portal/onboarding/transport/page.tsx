"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";

declare global {
  interface Window {
    kakao: any;
  }
}

type Method = "shuttle" | "academy" | "self";

type TransportForm = {
  pickupMethod: Method;
  dropoffMethod: Method;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupAddress: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffAddress: string;
  defaultDropoffTime: string;
};

type MapTarget = "pickup" | "dropoff";

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export default function TransportOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TransportForm>({
    pickupMethod: "shuttle",
    dropoffMethod: "shuttle",
    pickupLat: null,
    pickupLng: null,
    pickupAddress: "",
    dropoffLat: null,
    dropoffLng: null,
    dropoffAddress: "",
    defaultDropoffTime: "18:00",
  });

  const [mapOpen, setMapOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<MapTarget>("pickup");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/home", { cache: "no-store" });
        const payload = await res.json();
        const students = Array.isArray(payload?.students) ? payload.students : [];
        if (!students.length) {
          setLoading(false);
          return;
        }
        const target =
          (studentId && students.find((s: any) => String(s.id) === String(studentId))) ||
          students[0];
        if (!target) {
          setLoading(false);
          return;
        }
        const pickupMethod: Method =
          target.pickup_method === "academy" || target.pickup_method === "self"
            ? target.pickup_method
            : "shuttle";
        const dropoffMethod: Method =
          target.dropoff_method === "academy" || target.dropoff_method === "self"
            ? target.dropoff_method
            : "shuttle";
        const defaultTime =
          typeof target.default_dropoff_time === "string" &&
          target.default_dropoff_time.length >= 5
            ? target.default_dropoff_time.slice(0, 5)
            : "18:00";
        setForm({
          pickupMethod,
          dropoffMethod,
          pickupLat: typeof target.pickup_lat === "number" ? target.pickup_lat : null,
          pickupLng: typeof target.pickup_lng === "number" ? target.pickup_lng : null,
          pickupAddress: target.pickup_address || "",
          dropoffLat: typeof target.dropoff_lat === "number" ? target.dropoff_lat : null,
          dropoffLng: typeof target.dropoff_lng === "number" ? target.dropoff_lng : null,
          dropoffAddress: target.dropoff_address || "",
          defaultDropoffTime: defaultTime,
        });
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  const canSubmit = useMemo(() => {
    if (!studentId) return false;
    if (!form.pickupMethod || !form.dropoffMethod) return false;
    if (form.defaultDropoffTime.trim().length === 0) return false;
    if (
      form.pickupMethod !== "self" &&
      (!form.pickupLat || !form.pickupLng || !form.pickupAddress.trim())
    ) {
      return false;
    }
    if (
      form.dropoffMethod !== "self" &&
      (!form.dropoffLat || !form.dropoffLng || !form.dropoffAddress.trim())
    ) {
      return false;
    }
    return true;
  }, [form, studentId]);

  const openMap = (target: MapTarget) => {
    setMapTarget(target);
    setMapOpen(true);
  };

  const handleMapSelect = (lat: number, lng: number, address: string) => {
    setForm((prev) =>
      mapTarget === "pickup"
        ? {
            ...prev,
            pickupLat: lat,
            pickupLng: lng,
            pickupAddress: address,
          }
        : {
            ...prev,
            dropoffLat: lat,
            dropoffLng: lng,
            dropoffAddress: address,
          }
    );
    setMapOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/transport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          pickup_method: form.pickupMethod,
          pickup_lat: form.pickupLat,
          pickup_lng: form.pickupLng,
          pickup_address: form.pickupAddress.trim(),
          dropoff_method: form.dropoffMethod,
          dropoff_lat: form.dropoffLat,
          dropoff_lng: form.dropoffLng,
          dropoff_address: form.dropoffAddress.trim(),
          default_dropoff_time: form.defaultDropoffTime,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) {
        setError("정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setSaving(false);
        return;
      }
      router.replace("/portal/home");
    } catch {
      setError("정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10 flex items-center justify-center">
        <div className="text-sm text-slate-500">로딩 중입니다...</div>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10 flex items-center justify-center">
        <div className="text-sm text-slate-500">학생 정보를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      <main className="px-4 py-6 max-w-xl mx-auto space-y-6">
        <section className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">등·하원 위치 설정</h1>
          <p className="text-sm text-slate-600">
            지도에서 픽업 및 하원 위치를 선택해 주세요. 차량 배정과 안전한 이동을 위해
            사용됩니다.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">등원 방법</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, pickupMethod: "shuttle" }))}
                  className={`px-3 py-2 rounded-xl border text-sm font-bold ${
                    form.pickupMethod === "shuttle"
                      ? "bg-frage-blue text-white border-frage-blue"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  셔틀버스
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, pickupMethod: "academy" }))}
                  className={`px-3 py-2 rounded-xl border text-sm font-bold ${
                    form.pickupMethod === "academy"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  타학원 셔틀
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, pickupMethod: "self" }))}
                  className={`px-3 py-2 rounded-xl border text-sm font-bold ${
                    form.pickupMethod === "self"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  자가등원
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">픽업 위치</div>
                <button
                  type="button"
                  onClick={() => openMap("pickup")}
                  disabled={form.pickupMethod === "self"}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                    form.pickupMethod === "self"
                      ? "border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed"
                      : "border-frage-blue text-frage-blue bg-white"
                  }`}
                >
                  지도에서 위치 선택
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 min-h-[42px] flex items-center">
                {form.pickupMethod === "self"
                  ? "자가등원 선택 시 픽업 위치는 입력하지 않아도 됩니다."
                  : form.pickupAddress
                  ? form.pickupAddress
                  : "지도에서 픽업 위치를 선택해 주세요."}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-bold text-slate-900">하원 방법</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, dropoffMethod: "shuttle" }))}
                  className={`px-3 py-2 rounded-xl border text-sm font-bold ${
                    form.dropoffMethod === "shuttle"
                      ? "bg-frage-blue text-white border-frage-blue"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  셔틀버스
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, dropoffMethod: "academy" }))}
                  className={`px-3 py-2 rounded-xl border text-sm font-bold ${
                    form.dropoffMethod === "academy"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  타학원 셔틀
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, dropoffMethod: "self" }))}
                  className={`px-3 py-2 rounded-xl border text-sm font-bold ${
                    form.dropoffMethod === "self"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  자가하원
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">드롭 위치</div>
                <button
                  type="button"
                  onClick={() => openMap("dropoff")}
                  disabled={form.dropoffMethod === "self"}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                    form.dropoffMethod === "self"
                      ? "border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed"
                      : "border-frage-blue text-frage-blue bg-white"
                  }`}
                >
                  지도에서 위치 선택
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 min-h-[42px] flex items-center">
                {form.dropoffMethod === "self"
                  ? "자가하원 선택 시 드롭 위치는 입력하지 않아도 됩니다."
                  : form.dropoffAddress
                  ? form.dropoffAddress
                  : "지도에서 하원 위치를 선택해 주세요."}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">기본 하원 시간</div>
              <input
                type="time"
                value={form.defaultDropoffTime}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, defaultDropoffTime: e.target.value }))
                }
                className="text-frage-navy font-bold bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200 text-sm"
              />
            </div>
          </section>

          {error && (
            <p className="text-xs text-red-500">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="w-full px-5 py-3 bg-frage-navy text-white rounded-xl font-bold hover:bg-frage-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "저장 중..." : "정보 저장하고 포털 홈으로 이동"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => router.replace("/portal/home")}
              className="w-full px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              나중에 설정하기
            </button>
          </div>
        </form>
      </main>

      {mapOpen && (
        <MapModal
          target={mapTarget}
          initialLat={
            mapTarget === "pickup" ? form.pickupLat ?? form.dropoffLat : form.dropoffLat ?? form.pickupLat
          }
          initialLng={
            mapTarget === "pickup" ? form.pickupLng ?? form.dropoffLng : form.dropoffLng ?? form.pickupLng
          }
          onClose={() => setMapOpen(false)}
          onSelect={handleMapSelect}
        />
      )}
    </div>
  );
}

type MapModalProps = {
  target: MapTarget;
  initialLat: number | null;
  initialLng: number | null;
  onSelect: (lat: number, lng: number, address: string) => void;
  onClose: () => void;
};

function MapModal({ target, initialLat, initialLng, onSelect, onClose }: MapModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(initialLat);
  const [currentLng, setCurrentLng] = useState<number | null>(initialLng);
  const [currentAddress, setCurrentAddress] = useState<string>("");

  useEffect(() => {
    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        if (typeof window === "undefined") {
          reject();
          return;
        }
        if (window.kakao && window.kakao.maps) {
          resolve();
          return;
        }
        if (!KAKAO_MAP_KEY) {
          reject();
          return;
        }
        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-kakao-map="true"]'
        );
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject());
          return;
        }
        const script = document.createElement("script");
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services&autoload=false`;
        script.async = true;
        script.defer = true;
        script.dataset.kakaoMap = "true";
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });

    ensureScript()
      .then(() => {
        if (!window.kakao || !window.kakao.maps) {
          return;
        }
        window.kakao.maps.load(() => {
          if (!containerRef.current) return;
          const centerLat = initialLat ?? 35.857;
          const centerLng = initialLng ?? 128.626;
          const center = new window.kakao.maps.LatLng(centerLat, centerLng);
          const options = {
            center,
            level: 3,
          };
          const map = new window.kakao.maps.Map(containerRef.current, options);
          const geocoder = new window.kakao.maps.services.Geocoder();

          const updateCenter = () => {
            const c = map.getCenter();
            const lat = c.getLat();
            const lng = c.getLng();
            setCurrentLat(lat);
            setCurrentLng(lng);
            geocoder.coord2Address(
              lng,
              lat,
              (result: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK && result[0]?.address) {
                  setCurrentAddress(result[0].address.address_name);
                }
              }
            );
          };

          updateCenter();
          window.kakao.maps.event.addListener(map, "center_changed", updateCenter);
          setReady(true);
        });
      })
      .catch(() => {
        setReady(false);
      });
  }, [initialLat, initialLng]);

  const handleConfirm = useCallback(() => {
    if (!currentLat || !currentLng || !currentAddress) return;
    onSelect(currentLat, currentLng, currentAddress);
  }, [currentLat, currentLng, currentAddress, onSelect]);

  const title = target === "pickup" ? "픽업 위치 설정" : "하원 위치 설정";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch justify-center">
      <div className="relative bg-white w-full h-full max-w-md mx-auto flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 relative">
          <div ref={containerRef} className="w-full h-full" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-red-500 bg-red-500/80 shadow-lg -translate-y-4" />
          </div>
        </div>
        <div className="border-t border-slate-200 p-4 space-y-2 bg-white">
          <div className="text-xs text-slate-600 min-h-[32px]">
            {ready
              ? currentAddress || "지도를 움직여 위치를 선택해 주세요."
              : "지도를 불러오는 중입니다..."}
          </div>
          <button
            type="button"
            disabled={!ready || !currentLat || !currentLng || !currentAddress}
            onClick={handleConfirm}
            className="w-full px-4 py-3 rounded-xl bg-frage-navy text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이 위치로 설정
          </button>
        </div>
      </div>
    </div>
  );
}

