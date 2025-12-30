"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { MapPin, Bus, Users, Clock, AlertTriangle } from "lucide-react";

type Status = "재원" | "휴원" | "퇴원";

type Student = {
  id: string;
  childId?: string;
  name: string;
  englishName: string;
  birthDate: string;
  phone: string;
  className: string;
  campus: string;
  status: Status;
  parentName: string;
  parentAccountId: string;
  address: string;
  bus: string;
  departureTime: string;
};

type BusCar = {
  id: string;
  name: string;
  staff: string;
  timeSlot: string;
};

type Coord = { lat: number; lng: number };

export default function AdminTransportPage() {
  const [role, setRole] = useState<"admin" | "teacher">("admin");
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [timeFilter, setTimeFilter] = useState<string>("All");
  const [busFilter, setBusFilter] = useState<string>("All");
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [coords, setCoords] = useState<Record<string, Coord>>({});
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requests, setRequests] = useState<{ id: string; childId: string; childName: string; type: "bus_change"; note?: string; dateStart: string }[]>([]);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);
  const kakaoAppKey = (process.env.NEXT_PUBLIC_KAKAO_APP_KEY as string) || "";
  const [mode, setMode] = useState<"dropoff" | "pickup">("dropoff");
  const [arrivalTimes, setArrivalTimes] = useState<Record<string, string>>({});
  const [etas, setEtas] = useState<Record<string, number>>({});
  const [stopAddresses, setStopAddresses] = useState<Record<string, string>>({});
  const [busCars, setBusCars] = useState<BusCar[]>([]);
  const [newBusName, setNewBusName] = useState("");
  const [newBusStaff, setNewBusStaff] = useState("");
  const [newBusTime, setNewBusTime] = useState("");

  const [campusSites, setCampusSites] = useState<
    { id: string; name: "International" | "Andover" | "Platz" | "Atheneum"; label: string; addr: string; coord: Coord | null }[]
  >([
    { id: "camp_intl", name: "International", label: "국제관", addr: "대구 수성구 수성로54길 45", coord: null },
    { id: "camp_and", name: "Andover", label: "앤도버", addr: "대구 수성구 달구벌대로 2482", coord: null },
    { id: "camp_plt", name: "Platz", label: "플라츠", addr: "대구 수성구 범어천로 175", coord: null },
    { id: "camp_ath", name: "Atheneum", label: "아테네움관", addr: "대구 수성구 범어천로 167", coord: null },
  ]);

  useEffect(() => {
    try {
      const r = localStorage.getItem("admin_role");
      setRole(r === "teacher" ? "teacher" : "admin");
      const rawReq = localStorage.getItem("portal_requests");
      const list = rawReq ? JSON.parse(rawReq) : [];
      const busReqs = (Array.isArray(list) ? list : []).filter((x: any) => x.type === "bus_change");
      setRequests(busReqs);
      const rawArr = localStorage.getItem("admin_arrival_times");
      const map = rawArr ? JSON.parse(rawArr) : {};
      setArrivalTimes(map || {});
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/students?pageSize=400");
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setStudents(items);
      } catch {}
    };
    load();
    try {
      const raw = localStorage.getItem("admin_bus_cars");
      let list: BusCar[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list) || list.length === 0) {
        list = [
          { id: "b1", name: "1호차", staff: "김기사 / 박교사", timeSlot: "16:00" },
          { id: "b2", name: "2호차", staff: "이기사 / 최교사", timeSlot: "16:30" },
          { id: "b3", name: "3호차", staff: "박기사 / 장교사", timeSlot: "17:00" },
          { id: "b4", name: "4호차", staff: "정기사 / 윤교사", timeSlot: "17:30" },
          { id: "b5", name: "5호차", staff: "오기사 / 김교사", timeSlot: "18:00" },
          { id: "b6", name: "6호차", staff: "최기사 / 이교사", timeSlot: "18:30" },
        ];
        localStorage.setItem("admin_bus_cars", JSON.stringify(list));
      }
      setBusCars(list);
    } catch {
      setBusCars([]);
    }
  }, []);

  useEffect(() => {
    try {
      const key = "admin_transport_assignments";
      const raw = localStorage.getItem(key);
      const all = raw ? JSON.parse(raw) : {};
      const scopeKey = `${campusFilter}-${timeFilter}`;
      setAssignments(all[scopeKey] || {});
    } catch {
      setAssignments({});
    }
  }, [campusFilter, timeFilter]);

  const campusCenter = campusCenterFactory(campusSites);

  useEffect(() => {
    const next: Record<string, Coord> = {};
    students.forEach((s) => {
      const seed = hashString(`${s.address}-${s.campus}`);
      const center = campusCenter(s.campus);
      const lat = center.lat + ((seed % 1000) / 1000 - 0.5) * 0.08;
      const lng = center.lng + (((Math.floor(seed / 1000)) % 1000) / 1000 - 0.5) * 0.08;
      next[s.id] = { lat, lng };
    });
    setCoords(next);
  }, [students, campusSites]);

  const parseTime = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
    if (!m) return Number.MAX_SAFE_INTEGER;
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    return hh * 60 + mm;
  };

  const busCarsSorted: BusCar[] = useMemo(() => {
    return (busCars || []).slice().sort((a, b) => parseTime(a.timeSlot) - parseTime(b.timeSlot));
  }, [busCars]);

  const colorForBus = (busName: string) =>
    busName === "1호차"
      ? "bg-red-500"
      : busName === "2호차"
      ? "bg-blue-500"
      : busName === "3호차"
      ? "bg-green-500"
      : busName === "4호차"
      ? "bg-purple-500"
      : busName === "5호차"
      ? "bg-amber-500"
      : busName === "6호차"
      ? "bg-pink-500"
      : "bg-slate-400";

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => (campusFilter === "All" ? true : s.campus === campusFilter))
      .filter((s) => (timeFilter === "All" ? true : s.departureTime.startsWith(timeFilter) || s.departureTime === timeFilter));
  }, [students, campusFilter, timeFilter]);

  const assignedListFor = (busName: string) =>
    filteredStudents
      .filter((s) => (assignments[s.id] || s.bus) === busName)
      .slice()
      .sort((a, b) => {
        if (mode === "dropoff") {
          const ea = typeof etas[a.id] === "number" ? etas[a.id] : Number.MAX_SAFE_INTEGER;
          const eb = typeof etas[b.id] === "number" ? etas[b.id] : Number.MAX_SAFE_INTEGER;
          return ea - eb;
        }
        const ta = parseTime(arrivalTimes[a.id] || "08:30");
        const tb = parseTime(arrivalTimes[b.id] || "08:30");
        return ta - tb;
      });

  const hasBusChangeRequest = (s: Student) =>
    !!requests.find((r) => r.childId === s.childId || r.childName === s.name);

  const canEdit = role === "admin";

  const onDropToBus = (busName: string, e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    const id = e.dataTransfer.getData("student_id");
    if (!id) return;
    const next = { ...assignments, [id]: busName };
    setAssignments(next);
    setDirty(true);
  };

  const onDragStartStudent = (id: string, e: React.DragEvent) => {
    e.dataTransfer.setData("student_id", id);
  };

  const saveAll = () => {
    try {
      const key = "admin_transport_assignments";
      const raw = localStorage.getItem(key);
      const all = raw ? JSON.parse(raw) : {};
      const scopeKey = `${campusFilter}-${timeFilter}`;
      all[scopeKey] = assignments;
      localStorage.setItem(key, JSON.stringify(all));
      setDirty(false);
    } catch {}
  };
  const saveBusCars = (next: BusCar[]) => {
    setBusCars(next);
    try {
      localStorage.setItem("admin_bus_cars", JSON.stringify(next));
    } catch {}
  };
  const addBusCar = () => {
    if (!canEdit) return;
    const name = newBusName.trim();
    const staff = newBusStaff.trim();
    const timeSlot = newBusTime.trim();
    if (!name || !staff || !/^\d{1,2}:\d{2}$/.test(timeSlot)) return;
    const id = `b_${Date.now().toString(36)}`;
    const next = [...busCars, { id, name, staff, timeSlot }];
    saveBusCars(next);
    setNewBusName("");
    setNewBusStaff("");
    setNewBusTime("");
  };
  const updateBusCar = (id: string, patch: Partial<BusCar>) => {
    if (!canEdit) return;
    const next = busCars.map((b) => (b.id === id ? { ...b, ...patch } : b));
    saveBusCars(next);
  };
  const removeBusCar = (id: string) => {
    if (!canEdit) return;
    const next = busCars.filter((b) => b.id !== id);
    saveBusCars(next);
  };

  const mapBox = { minLat: 35.84, maxLat: 35.89, minLng: 128.59, maxLng: 128.66 };

  const toXY = (c: Coord, box: typeof mapBox, w: number, h: number) => {
    const x = ((c.lng - box.minLng) / (box.maxLng - box.minLng)) * w;
    const y = (1 - (c.lat - box.minLat) / (box.maxLat - box.minLat)) * h;
    return { x, y };
  };

  useEffect(() => {
    const cssHref = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    const exists = Array.from(document.styleSheets).some((s: any) => s.href === cssHref);
    if (!exists) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssHref;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const key = "campus_geocode_cache";
    const load = async () => {
      try {
        const raw = localStorage.getItem(key);
        const cache: Record<string, Coord> = raw ? JSON.parse(raw) : {};
        const next = [...campusSites];
        for (let i = 0; i < next.length; i++) {
          const addr = next[i].addr;
          const cached = cache[addr];
          if (cached) {
            next[i] = { ...next[i], coord: cached };
            continue;
          }
          const q = encodeURIComponent(addr);
          const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${q}`;
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          const arr = await res.json();
          if (Array.isArray(arr) && arr.length > 0) {
            const lat = parseFloat(arr[0].lat);
            const lon = parseFloat(arr[0].lon);
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              const c = { lat, lng: lon };
              cache[addr] = c;
              next[i] = { ...next[i], coord: c };
              localStorage.setItem(key, JSON.stringify(cache));
            }
          }
        }
        setCampusSites(next);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    if (!kakaoAppKey) return;
    const id = "kakao-maps-sdk";
    if (document.getElementById(id)) return;
    const src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoAppKey}&autoload=false&libraries=services`;
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => setKakaoReady(true);
    document.head.appendChild(s);
  }, [kakaoAppKey]);

  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    const centerLat = (mapBox.minLat + mapBox.maxLat) / 2;
    const centerLng = (mapBox.minLng + mapBox.maxLng) / 2;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([centerLat, centerLng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "",
      updateWhenIdle: true,
      keepBuffer: 3
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    mapInstRef.current = map;
    markersLayerRef.current = layer;
  }, [leafletReady, mapRef.current]);

  const busColorHex = (busName: string) =>
    busName === "1호차"
      ? "#ef4444"
      : busName === "2호차"
      ? "#3b82f6"
      : busName === "3호차"
      ? "#22c55e"
      : busName === "4호차"
      ? "#a855f7"
      : busName === "5호차"
      ? "#f59e0b"
      : busName === "6호차"
      ? "#ec4899"
      : "#94a3b8";

  useEffect(() => {
    const kakao = (window as any).kakao;
    if (kakaoReady && kakao && mapRef.current) {
      kakao.maps.load(() => {
        if (!mapInstRef.current) {
          const centerLat = (mapBox.minLat + mapBox.maxLat) / 2;
          const centerLng = (mapBox.minLng + mapBox.maxLng) / 2;
          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(centerLat, centerLng),
            level: 6,
          });
          mapInstRef.current = map;
        }
        const map = mapInstRef.current;
        const geocoder = new kakao.maps.services.Geocoder();
        const campusMarkers: any[] = [];
        const studentMarkers: any[] = [];
        campusMarkers.forEach(m => m.setMap(null));
        studentMarkers.forEach(m => m.setMap(null));
        campusSites.forEach(site => {
          if (!site.coord) return;
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(site.coord.lat, site.coord.lng),
          });
          marker.setMap(map);
          campusMarkers.push(marker);
        });
        const cacheKey = "kakao_geocode_students";
        const cacheRaw = localStorage.getItem(cacheKey);
        const cache: Record<string, Coord> = cacheRaw ? JSON.parse(cacheRaw) : {};
        const tasks: Promise<void>[] = [];
        filteredStudents.forEach(s => {
          const addr = s.address || "";
          const currBus = assignments[s.id] || s.bus || "";
          const isUnassigned = !currBus || currBus === "없음";
          const color = isUnassigned ? "#94a3b8" : busColorHex(currBus);
          const placeMarker = (c: Coord) => {
            const marker = new kakao.maps.CustomOverlay({
              position: new kakao.maps.LatLng(c.lat, c.lng),
              content: `<div style="background:${color};width:10px;height:10px;border-radius:9999px;border:1px solid #fff"></div>`,
              yAnchor: 0.5,
              xAnchor: 0.5,
            });
            marker.setMap(map);
            studentMarkers.push(marker);
          };
          const cached = cache[addr];
          if (cached) {
            placeMarker(cached);
          } else {
            tasks.push(
              new Promise((resolve) => {
                geocoder.addressSearch(addr, (result: any, status: any) => {
                  if (status === kakao.maps.services.Status.OK && result && result.length > 0) {
                    const lat = parseFloat(result[0].y);
                    const lng = parseFloat(result[0].x);
                    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                      const c = { lat, lng };
                      cache[addr] = c;
                      placeMarker(c);
                      localStorage.setItem(cacheKey, JSON.stringify(cache));
                    }
                  } else {
                    const c = coords[s.id];
                    if (c) placeMarker(c);
                  }
                  resolve();
                });
              })
            );
          }
        });
        Promise.all(tasks).then(() => {
          const stopMap: Record<string, Coord | null> = {};
          busCarsSorted.forEach(b => {
            const list = filteredStudents.filter(s => (assignments[s.id] || s.bus) === b.name);
            if (!list.length) {
              stopMap[b.name] = null;
              return;
            }
            const pts = list.map(s => {
              const addr = s.address || "";
              const c = cache[addr] || coords[s.id];
              return c;
            }).filter(Boolean) as Coord[];
            if (!pts.length) {
              stopMap[b.name] = null;
              return;
            }
            const lat = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
            const lng = pts.reduce((a, p) => a + p.lng, 0) / pts.length;
            stopMap[b.name] = { lat, lng };
          });
          const nextEtas: Record<string, number> = {};
          const nextStopsAddr: Record<string, string> = {};
          const addrCacheKey = "kakao_stop_addr_cache";
          const addrRaw = localStorage.getItem(addrCacheKey);
          const addrCache: Record<string, string> = addrRaw ? JSON.parse(addrRaw) : {};
          const addrTasks: Promise<void>[] = [];
          Object.entries(stopMap).forEach(([bus, c]) => {
            if (!c) return;
            const marker = new kakao.maps.Marker({
              position: new kakao.maps.LatLng(c.lat, c.lng),
            });
            marker.setMap(map);
            const speed = 25;
            const key = `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`;
            if (addrCache[key]) {
              nextStopsAddr[bus] = addrCache[key];
            } else {
              addrTasks.push(
                new Promise((resolve) => {
                  geocoder.coord2Address(c.lng, c.lat, (result: any, status: any) => {
                    if (status === kakao.maps.services.Status.OK && result && result.length > 0) {
                      const road = result[0].road_address?.address_name || result[0].address?.address_name || "";
                      nextStopsAddr[bus] = road;
                      addrCache[key] = road;
                      localStorage.setItem(addrCacheKey, JSON.stringify(addrCache));
                    } else {
                      nextStopsAddr[bus] = key;
                    }
                    resolve();
                  });
                })
              );
            }
            filteredStudents
              .filter(s => (assignments[s.id] || s.bus) === bus)
              .forEach(s => {
                const addr = s.address || "";
                const sc = cache[addr] || coords[s.id];
                if (!sc) return;
                const dKm = haversine(sc.lat, sc.lng, c.lat, c.lng);
                const min = Math.round((dKm / speed) * 60);
                nextEtas[s.id] = min;
              });
          });
          Promise.all(addrTasks).then(() => {
            setStopAddresses(nextStopsAddr);
            setEtas(nextEtas);
          });
        });
      });
      return;
    }
    const L = (window as any).L;
    if (!L || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();
    campusSites.forEach((site) => {
      if (!site.coord) return;
      L.circleMarker([site.coord.lat, site.coord.lng], {
        radius: 6,
        color: "#0f172a",
        weight: 2,
        fillColor: "#facc15",
        fillOpacity: 0.9
      }).addTo(layer);
    });
    filteredStudents.forEach((s) => {
      const c = coords[s.id];
      if (!c) return;
      const currBus = assignments[s.id] || s.bus || "";
      const isUnassigned = !currBus || currBus === "없음";
      const fill = isUnassigned ? "#94a3b8" : busColorHex(currBus);
      L.circleMarker([c.lat, c.lng], {
        radius: 5,
        color: "#ffffff",
        weight: 1.5,
        fillColor: fill,
        fillOpacity: 0.95
      })
        .addTo(layer)
        .on("click", () => setSelectedId(s.id));
    });
    const stopMap: Record<string, Coord | null> = {};
    busCarsSorted.forEach(b => {
      const list = filteredStudents.filter(s => (assignments[s.id] || s.bus) === b.name);
      if (!list.length) {
        stopMap[b.name] = null;
        return;
      }
      const pts = list.map(s => coords[s.id]).filter(Boolean) as Coord[];
      if (!pts.length) {
        stopMap[b.name] = null;
        return;
      }
      const lat = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
      const lng = pts.reduce((a, p) => a + p.lng, 0) / pts.length;
      stopMap[b.name] = { lat, lng };
    });
    const speed = 25;
    const nextEtas: Record<string, number> = {};
    const nextStopsAddr: Record<string, string> = {};
    const addrCacheKey = "nominatim_stop_addr_cache";
    let addrCache: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(addrCacheKey);
      addrCache = raw ? JSON.parse(raw) : {};
    } catch {}
    const addrTasks: Promise<void>[] = [];
    Object.entries(stopMap).forEach(([bus, c]) => {
      if (!c) return;
      const key = `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`;
      const assignList = filteredStudents.filter(s => (assignments[s.id] || s.bus) === bus);
      if (addrCache[key]) {
        nextStopsAddr[bus] = addrCache[key];
      } else {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.lat}&lon=${c.lng}&zoom=18&addressdetails=1`;
        addrTasks.push(
          fetch(url, { headers: { Accept: "application/json" } })
            .then(res => res.json())
            .then(j => {
              const name =
                j?.address?.road ||
                j?.display_name ||
                key;
              nextStopsAddr[bus] = name;
              addrCache[key] = name;
              try {
                localStorage.setItem(addrCacheKey, JSON.stringify(addrCache));
              } catch {}
            })
            .catch(() => {
              nextStopsAddr[bus] = key;
            })
        );
      }
      assignList.forEach(s => {
        const sc = coords[s.id];
        if (!sc) return;
        const dKm = haversine(sc.lat, sc.lng, c.lat, c.lng);
        nextEtas[s.id] = Math.round((dKm / speed) * 60);
      });
    });
    Promise.all(addrTasks).then(() => {
      setStopAddresses(nextStopsAddr);
      setEtas(nextEtas);
    });
  }, [filteredStudents, coords, assignments, leafletReady, campusSites, kakaoReady]);

  return (
    <main dir="ltr" style={{ writingMode: "horizontal-tb" }} className="mx-auto max-w-6xl px-4 py-8">
      {!kakaoAppKey && <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onLoad={() => setLeafletReady(true)} />}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Bus className="w-6 h-6 text-frage-yellow" />
          <h1 className="text-2xl font-black text-slate-900 whitespace-nowrap">차량 관리</h1>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">운영</span>
            <div className="flex gap-2">
              {[
                { k: "dropoff", label: "하원" },
                { k: "pickup", label: "등원" },
              ].map((o) => (
                <button
                  key={o.k}
                  onClick={() => setMode(o.k as any)}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-xs md:text-sm font-bold ${
                    mode === o.k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">캠퍼스</span>
            <div className="flex gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal md:flex-wrap -mx-1 px-1">
              {["All", "International", "Andover", "Platz", "Atheneum"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCampusFilter(c)}
                  className={`shrink-0 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-xs md:text-sm font-bold ${
                    campusFilter === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {c === "All" ? "전체" : c === "International" ? "국제관" : c === "Andover" ? "앤도버" : c === "Platz" ? "플라츠" : "아테네움관"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">시간대</span>
            <div className="flex gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal md:flex-wrap -mx-1 px-1">
              {["All", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`shrink-0 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-xs md:text-sm font-bold ${
                    timeFilter === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {t === "All" ? "전체" : t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-700 whitespace-nowrap">호차</span>
            <div className="flex gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-normal md:flex-wrap -mx-1 px-1">
              {["All", ...busCarsSorted.map((b) => b.name)].map((b) => (
                <button
                  key={b}
                  onClick={() => setBusFilter(b)}
                  className={`shrink-0 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border text-xs md:text-sm font-bold ${
                    busFilter === b ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
          <AlertTriangle className="w-4 h-4 text-slate-500" />
          열람 전용입니다. 권한이 있는 계정으로 로그인하세요.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">지도</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />미배정</div>
              {busCarsSorted.slice(0,3).map((b) => (
                <div key={b.id} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded-full ${colorForBus(b.name)} inline-block`} />
                  {b.name}
                </div>
              ))}
            </div>
          </div>
          <div ref={mapRef} className="relative h-[420px] md:h-[520px] bg-slate-100" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">호차</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <input
                  value={newBusName}
                  onChange={(e) => setNewBusName(e.target.value)}
                  placeholder="호차명(예: 7호차)"
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  value={newBusStaff}
                  onChange={(e) => setNewBusStaff(e.target.value)}
                  placeholder="담당자"
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  value={newBusTime}
                  onChange={(e) => setNewBusTime(e.target.value)}
                  placeholder="시간대(HH:MM)"
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
                <button onClick={addBusCar} className="px-2 py-1 rounded-lg bg-frage-navy text-white text-xs font-bold">추가</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
            {busCarsSorted
              .filter((b) => (busFilter === "All" ? true : b.name === busFilter))
              .map((b) => {
                const list = assignedListFor(b.name);
                return (
                  <div
                    key={b.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropToBus(b.name, e)}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm p-4"
                  >
                    <div className="flex flex-row items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${colorForBus(b.name)} text-white font-bold text-xs`}>{b.name.replace("호차","")}</span>
                        <div>
                          <div className="text-sm font-bold text-slate-900 text-left whitespace-normal break-words">{b.name}</div>
                          <div className="text-xs text-slate-500 text-left whitespace-normal break-words">{b.staff}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                        <Clock className="w-3 h-3" />
                        {b.timeSlot}
                        {canEdit && (
                          <div className="flex items-center gap-1 ml-2">
                            <input
                              defaultValue={b.name}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (!v) return;
                                updateBusCar(b.id, { name: v });
                              }}
                              className="px-2 py-1 rounded border border-slate-200 text-[11px]"
                            />
                            <input
                              defaultValue={b.staff}
                              onBlur={(e) => updateBusCar(b.id, { staff: e.target.value })}
                              className="px-2 py-1 rounded border border-slate-200 text-[11px]"
                            />
                            <input
                              defaultValue={b.timeSlot}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (!/^\d{1,2}:\d{2}$/.test(v)) return;
                                updateBusCar(b.id, { timeSlot: v });
                              }}
                              className="px-2 py-1 rounded border border-slate-200 text-[11px] w-20"
                            />
                            <button onClick={() => removeBusCar(b.id)} className="px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 text-[11px]">삭제</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {list.length === 0 && <div className="text-xs text-slate-500">배정된 원생 없음</div>}
                      {list.map((s) => (
                        <div
                          key={s.id}
                          draggable={canEdit}
                          onDragStart={(e) => onDragStartStudent(s.id, e)}
                          className="flex flex-row items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white"
                        >
                          <div>
                            <div className="text-sm font-bold text-slate-900 text-left whitespace-normal break-words">{s.name}</div>
                            <div className="text-xs text-slate-600 text-left whitespace-normal break-words">
                              {s.className} • {mode === "dropoff" ? (s.departureTime || "-") : (arrivalTimes[s.id] || "08:30")}
                            </div>
                            <div className="text-xs text-slate-500 text-left whitespace-normal break-words mt-0.5">
                              정류장: {stopAddresses[(assignments[s.id] || s.bus)] || "계산중"} • 예상 {typeof etas[s.id] === "number" ? `${etas[s.id]}분` : "-"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasBusChangeRequest(s) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                <AlertTriangle className="w-3 h-3" />
                                차량 요청
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {dirty && canEdit && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-slate-200 shadow-lg px-4 py-3 flex items-center gap-3 z-50">
          <span className="text-sm font-bold text-slate-700">변경 사항이 있습니다</span>
          <button
            onClick={saveAll}
            className="px-3 py-2 rounded-lg bg-frage-navy text-white text-sm font-bold"
          >
            저장
          </button>
        </div>
      )}
    </main>
  );
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function campusCenterFactory(sites: { name: string; coord: Coord | null }[]) {
  return (campus: string): Coord => {
    const f = sites.find((x) => x.name === campus && x.coord);
    if (f && f.coord) return f.coord;
    if (campus === "International") return { lat: 35.858, lng: 128.627 };
    if (campus === "Andover") return { lat: 35.864, lng: 128.603 };
    if (campus === "Platz") return { lat: 35.880, lng: 128.640 };
    if (campus === "Atheneum") return { lat: 35.872, lng: 128.615 };
    return { lat: 35.86, lng: 128.60 };
  };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
