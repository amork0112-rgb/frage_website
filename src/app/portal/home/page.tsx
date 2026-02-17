//app/portal/home/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  FileText,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  MessageSquare,
  Video,
  User,
  Bus,
  Car,
  Calendar,
  Sparkles,
  ArrowRight
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import { supabase } from "@/lib/supabase";

export default function ParentPortalHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [studentStatus, setStudentStatus] = useState<string | null>(null);
  type StudentProfile = {
    id: string;
    name: string;
    englishName: string;
    className: string;
    campus: string;
    profile_completed?: boolean;
    use_bus?: boolean | null;
    address?: string | null;
    latestReport?: {
      id: string;
      message: string;
      rate: number;
      date: string;
    } | null;
    pendingVideoCount?: number;
  };

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [needOnboarding, setNeedOnboarding] = useState(false);
  const [isNoParent, setIsNoParent] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [onboardingPickupMethod, setOnboardingPickupMethod] = useState<"bus" | "self" | "">("");
  const [onboardingDropoffMethod, setOnboardingDropoffMethod] = useState<"bus" | "self" | "">("");
  const [onboardingAddress, setOnboardingAddress] = useState("");
  const [onboardingDetailAddress, setOnboardingDetailAddress] = useState("");

  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  // Kakao Map related states for Pickup
  const [pickupMap, setPickupMap] = useState<kakao.maps.Map | null>(null);
  const [pickupMarker, setPickupMarker] = useState<kakao.maps.Marker | null>(null);
  const [pickupMapCenter, setPickupMapCenter] = useState<kakao.maps.LatLng | null>(null);
  const [onboardingPickupAddressSearch, setOnboardingPickupAddressSearch] = useState("");
  const [onboardingPickupSelectedAddress, setOnboardingPickupSelectedAddress] = useState("");
  const [onboardingPickupSelectedLat, setOnboardingPickupSelectedLat] = useState<string | null>(null);
  const [onboardingPickupSelectedLng, setOnboardingPickupSelectedLng] = useState<string | null>(null);

  // Kakao Map related states for Dropoff
  const [dropoffMap, setDropoffMap] = useState<kakao.maps.Map | null>(null);
  const [dropoffMarker, setDropoffMarker] = useState<kakao.maps.Marker | null>(null);
  const [dropoffMapCenter, setDropoffMapCenter] = useState<kakao.maps.LatLng | null>(null);
  const [onboardingDropoffAddressSearch, setOnboardingDropoffAddressSearch] = useState("");
  const [onboardingDropoffSelectedAddress, setOnboardingDropoffSelectedAddress] = useState("");
  const [onboardingDropoffSelectedLat, setOnboardingDropoffSelectedLat] = useState<string | null>(null);
  const [onboardingDropoffSelectedLng, setOnboardingDropoffSelectedLng] = useState<string | null>(null);
  
  // For Enrolled Students
  const [monthlyReports, setMonthlyReports] = useState<{ id: string; title: string; date: string; status: string; target_month: string; published_at: string }[]>([]);
  const [notifications, setNotifications] = useState<{ id?: string; message: string; date?: string; title?: string; isRead?: boolean; category?: string; createdAt?: string }[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  
  const handleContact = () => {
    // KakaoTalk Channel URL
    window.open("http://pf.kakao.com/_TxdXxnG/chat", "_blank");
  };

  const [readReportIds, setReadReportIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("read_reports");
    if (saved) {
      try {
        setReadReportIds(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const markReportAsRead = (id: string) => {
    if (!readReportIds.includes(id)) {
      const next = [...readReportIds, id];
      setReadReportIds(next);
      localStorage.setItem("read_reports", JSON.stringify(next));
    }
  };

  const [studentId, setStudentId] = useState<string | null>(null);

    useEffect(() => {
    // Load Daum Postcode script
    const postcodeScript = document.createElement("script");
    postcodeScript.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    postcodeScript.async = true;
    document.head.appendChild(postcodeScript);

    // Load Kakao Map script
    const KAKAO_MAP_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (KAKAO_MAP_APP_KEY) {
      const kakaoMapScript = document.createElement("script");
      kakaoMapScript.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_APP_KEY}&libraries=services`;
      kakaoMapScript.async = true;
      document.head.appendChild(kakaoMapScript);
    } else {
      console.error("NEXT_PUBLIC_KAKAO_MAP_KEY is not defined.");
    }

    return () => {
      document.head.removeChild(postcodeScript);
      if (KAKAO_MAP_APP_KEY) {
        const kakaoMapScript = document.querySelector(`script[src*="appkey=${KAKAO_MAP_APP_KEY}"]`);
        if (kakaoMapScript) {
          document.head.removeChild(kakaoMapScript);
        }
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          setAuthorized(false);
          setAuthChecked(true);
          router.replace("/portal");
          return;
        }
        const { data: parent } = await supabase
          .from("parents")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!parent) {
          setAuthorized(false);
          setAuthChecked(true);
          router.replace("/portal");
          return;
        }
        setAuthorized(true);
        setAuthChecked(true);
        setAuthUserId(user.id);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
          if (!authChecked || !authorized) {
            setLoading(false);
            return;
          }
          const res = await fetch("/api/portal/home", { cache: "no-store" });
        const payload = await res.json();

        if (payload.type === "no_parent") {
          setIsNoParent(true);
          setLoading(false);
          return;
        }

        setIsNoParent(false);
        const students = Array.isArray(payload?.students) ? payload.students : [];
        
        const first = students[0] || null;
        if (first) {
          setStudentProfile({
            ...first,
            name: first.name || "학생"
          });
          setStudentStatus(first.type || "enrolled");
        } else {
          setStudentStatus(null);
          setStudentProfile(null);
        }

        if (first && first.id) {
          setStudentId(String(first.id));
        }
        else {
          setStudentId(null);
        }

        // The following onboarding logic is moved to a separate useEffect
        // to ensure it runs only when studentProfile is fully set.
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, authorized, router]);

  useEffect(() => {
    if (!studentProfile) return;

    const profileCompleted = studentProfile.profile_completed === true;
    const useBus = typeof studentProfile.use_bus === "boolean"
      ? studentProfile.use_bus
      : null;
    const address = typeof studentProfile.address === "string"
      && studentProfile.address.trim().length > 0
        ? studentProfile.address
        : "";

    const need =
      profileCompleted !== true ||
      useBus === null ||
      (useBus === true && !address);

    setNeedOnboarding(need);
  }, [studentProfile]);

  // Kakao Map initialization for Pickup
  useEffect(() => {
    if (onboardingStep === 3 && onboardingPickupMethod === "bus" && window.kakao && !pickupMap) {
      const mapContainer = document.getElementById("pickupMap");
      if (mapContainer) {
        const initialLat = 37.5665; // Default Seoul latitude
        const initialLng = 126.9780; // Default Seoul longitude
        const mapOption = {
          center: new window.kakao.maps.LatLng(initialLat, initialLng),
          level: 3,
        };
        const map = new window.kakao.maps.Map(mapContainer, mapOption);
        setPickupMap(map);

        const marker = new window.kakao.maps.Marker({
          map: map,
          position: mapOption.center,
          draggable: true,
        });
        setPickupMarker(marker);

        // Set initial selected coordinates
        setOnboardingPickupSelectedLat(initialLat.toString());
        setOnboardingPickupSelectedLng(initialLng.toString());

        // Event listener for marker dragend
        window.kakao.maps.event.addListener(marker, "dragend", () => {
          const position = marker.getPosition();
          setOnboardingPickupSelectedLat(position.getLat().toString());
          setOnboardingPickupSelectedLng(position.getLng().toString());
          // Reverse geocoding to get address from coordinates (will implement later if needed)
        });
      }
    }
  }, [onboardingStep, onboardingPickupMethod, pickupMap]);

  // Kakao Map initialization for Dropoff
  useEffect(() => {
    if (onboardingStep === 4 && onboardingDropoffMethod === "bus" && window.kakao && !dropoffMap) {
      const mapContainer = document.getElementById("dropoffMap");
      if (mapContainer) {
        const initialLat = 37.5665; // Default Seoul latitude
        const initialLng = 126.9780; // Default Seoul longitude
        const mapOption = {
          center: new window.kakao.maps.LatLng(initialLat, initialLng),
          level: 3,
        };
        const map = new window.kakao.maps.Map(mapContainer, mapOption);
        setDropoffMap(map);

        const marker = new window.kakao.maps.Marker({
          map: map,
          position: mapOption.center,
          draggable: true,
        });
        setDropoffMarker(marker);

        // Set initial selected coordinates
        setOnboardingDropoffSelectedLat(initialLat.toString());
        setOnboardingDropoffSelectedLng(initialLng.toString());

        // Event listener for marker dragend
        window.kakao.maps.event.addListener(marker, "dragend", () => {
          const position = marker.getPosition();
          setOnboardingDropoffSelectedLat(position.getLat().toString());
          setOnboardingDropoffSelectedLng(position.getLng().toString());
          // Reverse geocoding to get address from coordinates (will implement later if needed)
        });
      }
    }
  }, [onboardingStep, onboardingDropoffMethod, dropoffMap]);

  const handleAddressSearch = () => {
    if (typeof window !== "undefined" && (window as any).daum) {
      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          let fullAddr = data.address;
          let extraAddr = "";

          if (data.addressType === "R") {
            if (data.bname !== "") {
              extraAddr += data.bname;
            }
            if (data.buildingName !== "") {
              extraAddr += extraAddr !== "" ? ", " + data.buildingName : data.buildingName;
            }
            fullAddr += extraAddr !== "" ? " (" + extraAddr + ")" : "";
          }

          setOnboardingAddress(fullAddr);
        },
      }).open();
    }
    else {
      alert("주소 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  // Function to perform address search for pickup
  const handlePickupSearch = () => {
    if (!window.kakao || !pickupMap || !onboardingPickupAddressSearch) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(onboardingPickupAddressSearch, (data: kakao.maps.services.PlaceResult[], status: kakao.maps.services.Status) => {
      if (status === (window.kakao.maps.services as any).Status.OK) {
        const firstPlace = data[0];
        const newLat = parseFloat(firstPlace.y);
        const newLng = parseFloat(firstPlace.x);
        const newPos = new window.kakao.maps.LatLng(newLat, newLng);

        pickupMap.setCenter(newPos);
        pickupMarker?.setPosition(newPos);
        setOnboardingPickupSelectedAddress(firstPlace.address_name);
        setOnboardingPickupSelectedLat(newLat.toString());
        setOnboardingPickupSelectedLng(newLng.toString());
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        alert("검색 결과가 없습니다.");
      } else if (status === window.kakao.maps.services.Status.ERROR) {
        alert("주소 검색 중 오류가 발생했습니다.");
      }
    });
  };

  // Function to perform address search for dropoff
  const handleDropoffSearch = () => {
    if (!window.kakao || !dropoffMap || !onboardingDropoffAddressSearch) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(onboardingDropoffAddressSearch, (data: kakao.maps.services.PlaceResult[], status: kakao.maps.services.Status) => {
      if (status === (window.kakao.maps.services as any).Status.OK) {
        const firstPlace = data[0];
        const newLat = parseFloat(firstPlace.y);
        const newLng = parseFloat(firstPlace.x);
        const newPos = new window.kakao.maps.LatLng(newLat, newLng);

        dropoffMap.setCenter(newPos);
        dropoffMarker?.setPosition(newPos);
        setOnboardingDropoffSelectedAddress(firstPlace.address_name);
        setOnboardingDropoffSelectedLat(newLat.toString());
        setOnboardingDropoffSelectedLng(newLng.toString());
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        alert("검색 결과가 없습니다.");
      } else if (status === window.kakao.maps.services.Status.ERROR) {
        alert("주소 검색 중 오류가 발생했습니다.");
      }
    });
  };

  // Fetch data for Students
  useEffect(() => {
    if (!studentId) return;
    
    let alive = true;
    const load = async () => {
      if (studentStatus === "enrolled") {
        try {
          const res = await fetch(`/api/portal/reports?studentId=${studentId}`);
          const data = await res.json();
          if (alive) {
            const items = (data?.items || []).map((r: any) => ({
              id: r.id,
              title: r.title,
              date: r.date,
              status: r.status,
              target_month: r.target_month || r.date,
              published_at: r.created_at || r.date
            }));
            setMonthlyReports(items);
          }
        } catch {}
        try {
          const res = await fetch(`/api/portal/notifications?studentId=${studentId}`);
          const data = await res.json();
          if (alive) {
            const list = (data?.items || []).map((n: any) => ({
              id: n.id,
              message: n.message,
              date: n.date,
              title: n.title || "알림",
              isRead: n.read_at != null,
              category: n.category || "General",
              createdAt: n.created_at || new Date().toISOString()
            }));
            setNotifications(list);
          }
        } catch {}
      }

      try {
        // 공지사항 (posts 테이블) 가져오기 - Every student should see this
        const { data: noticeData, error: noticeError } = await supabase
          .from("posts")
          .select("*")
          .eq("category", "notice")
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
          .limit(2);
        
        if (!noticeError && noticeData) {
          setNotices(noticeData);
        }
      } catch (err) {
        console.error("Notice fetch error:", err);
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [studentId, studentStatus]);

  const handleOnboardingSubmit = async () => {
    console.log("Submitting onboarding data...");
    setOnboardingSaving(true);
    setOnboardingError(null);

    try {
      const payload: {
        profile_completed: boolean;
      address?: string;
      detail_address?: string;
      pickup_method?: "bus" | "self";
      dropoff_method?: "bus" | "self";
      pickup_latitude?: string;
      pickup_longitude?: string;
      dropoff_latitude?: string;
      dropoff_longitude?: string;
    } = {
      profile_completed: true,
    };

    if (onboardingAddress) payload.address = onboardingAddress;
    if (onboardingDetailAddress) payload.detail_address = onboardingDetailAddress;
    if (onboardingPickupMethod) payload.pickup_method = onboardingPickupMethod;
    if (onboardingDropoffMethod) payload.dropoff_method = onboardingDropoffMethod;
    if (onboardingPickupMethod === "bus" && onboardingPickupSelectedLat) payload.pickup_latitude = onboardingPickupSelectedLat;
    if (onboardingPickupMethod === "bus" && onboardingPickupSelectedLng) payload.pickup_longitude = onboardingPickupSelectedLng;
    if (onboardingDropoffMethod === "bus" && onboardingDropoffSelectedLat) payload.dropoff_latitude = onboardingDropoffSelectedLat;
    if (onboardingDropoffMethod === "bus" && onboardingDropoffSelectedLng) payload.dropoff_longitude = onboardingDropoffSelectedLng;

      const res = await fetch(`/api/students/${studentId}/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "온보딩 정보 저장에 실패했습니다.");
      }

      router.refresh();
      setNeedOnboarding(false);
    } catch (error: any) {
      console.error("Onboarding submission error:", error);
      setOnboardingError(error.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setOnboardingSaving(false);
    }
  };

  if (!authChecked) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Loading...
      </div>
    );
  }

  if (isNoParent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700 p-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-orange-500 mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.174 3.355 1.945 3.355h13.71c1.771 0 2.816-1.855 1.945-3.355L13.105 7.144c-.866-1.5-3.032-1-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <h2 className="text-xl font-bold mb-2">학부모 정보가 없습니다.</h2>
        <p className="text-center mb-4">
          계정에 연결된 학부모 정보가 없습니다. <br />
          프라게 포털을 이용하시려면 학부모 등록을 진행해 주세요.
        </p>
        <Link href="/portal/onboarding/parent" className="px-6 py-3 bg-frage-blue text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
          학부모 등록하기
        </Link>
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p>학생 정보를 불러오는 중입니다. 잠시만 기다려주세요.</p>
      </div>
    );
  }

  const renderOnboardingModal = () => {
    if (!needOnboarding || !studentId) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 mx-4 relative">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  원활한 학습 안내를 위해{" "}
                  <br className="hidden sm:block" />
                  처음 한 번만 정보를 확인해 주세요.
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  입력하신 정보는 언제든지 수정할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                  {onboardingStep}
                </span>
                <span className="font-bold">
                  {onboardingStep === 1
                    ? "Step 1. 보호자 계정 연결"
                    : onboardingStep === 2
                    ? "Step 2. 주소 입력"
                    : onboardingStep === 3
                    ? "Step 3. 등원 방식"
                    : onboardingStep === 4
                    ? "Step 4. 하원 방식"
                    : "Step 5. 완료"}
                </span>
              </div>
              <span className="font-bold">
                {onboardingStep}/5
              </span>
            </div>
          </div>

          {onboardingError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {onboardingError}
            </div>
          )}

          {/* Step 1: Account Connection */}
          {onboardingStep === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    현재 로그인한 계정을 자녀 정보와 연결합니다.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    계정 연결 중입니다. 다음 버튼을 눌러 계속 진행해 주세요.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Address Input */}
          {onboardingStep === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-bold text-slate-700 mb-2">
                  자녀의 주소를 입력해 주세요.
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="address"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                    value={onboardingAddress}
                    readOnly
                    placeholder="주소 검색"
                  />
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 whitespace-nowrap"
                  >
                    주소 검색
                  </button>
                </div>
                {onboardingAddress && (
                  <input
                    type="text"
                    id="detailAddress"
                    className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                    value={onboardingDetailAddress}
                    onChange={(e) => setOnboardingDetailAddress(e.target.value)}
                    placeholder="상세 주소 입력 (예: 101동 101호)"
                  />
                )}
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(1)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={!onboardingAddress || !onboardingDetailAddress}
                  onClick={() => setOnboardingStep(3)}
                  className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Pickup Method */}
          {onboardingStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-700 mb-2">
                자녀의 등원 방식을 선택해 주세요.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardingPickupMethod("bus")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    onboardingPickupMethod === "bus"
                      ? "border-frage-blue bg-blue-50 text-frage-blue"
                      : "border-slate-100 bg-white text-slate-400"
                  }`}
                >
                  <Bus className="w-6 h-6" />
                  <span className="text-sm font-bold">학원 차량</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingPickupMethod("self")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    onboardingPickupMethod === "self"
                      ? "border-frage-blue bg-blue-50 text-frage-blue"
                      : "border-slate-100 bg-white text-slate-400"
                  }`}
                >
                  <Car className="w-6 h-6" />
                  <span className="text-sm font-bold">직접 등원</span>
                </button>
              </div>

              {onboardingPickupMethod === "bus" && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-bold text-slate-700 mb-2">
                    📍 지도에서 승차 위치를 선택해주세요
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                      placeholder="주소 검색"
                      value={onboardingPickupAddressSearch}
                      onChange={(e) => setOnboardingPickupAddressSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => { /* Implement search functionality here */ }}
                      className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700"
                    >
                      검색
                    </button>
                  </div>
                  {onboardingPickupSelectedAddress && (
                    <p className="text-sm text-slate-600">
                      선택된 주소: {onboardingPickupSelectedAddress} (Lat: {onboardingPickupSelectedLat}, Lng: {onboardingPickupSelectedLng})
                    </p>
                  )}
                  <div id="pickupMap" className="w-full h-64 rounded-lg"></div>
                  <button
                    type="button"
                    onClick={() => { /* Implement "여기에서 승차하기" logic here */ }}
                    disabled={!onboardingPickupSelectedLat || !onboardingPickupSelectedLng}
                    className="w-full px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    여기에서 승차하기
                  </button>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={
                    !onboardingPickupMethod ||
                    (onboardingPickupMethod === "bus" && (!onboardingPickupSelectedLat || !onboardingPickupSelectedLng))
                  }
                  onClick={() => setOnboardingStep(4)}
                  className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Dropoff Method */}
          {onboardingStep === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-700 mb-2">
                자녀의 하원 방식을 선택해 주세요.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardingDropoffMethod("bus")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    onboardingDropoffMethod === "bus"
                      ? "border-frage-blue bg-blue-50 text-frage-blue"
                      : "border-slate-100 bg-white text-slate-400"
                  }`}
                >
                  <Bus className="w-6 h-6" />
                  <span className="text-sm font-bold">학원 차량</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingDropoffMethod("self")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    onboardingDropoffMethod === "self"
                      ? "border-frage-blue bg-blue-50 text-frage-blue"
                      : "border-slate-100 bg-white text-slate-400"
                  }`}
                >
                  <Car className="w-6 h-6" />
                  <span className="text-sm font-bold">직접 하원</span>
                </button>
              </div>

              {onboardingDropoffMethod === "bus" && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-bold text-slate-700 mb-2">
                    📍 지도에서 하차 위치를 선택해주세요
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                      placeholder="주소 검색"
                      value={onboardingDropoffAddressSearch}
                      onChange={(e) => setOnboardingDropoffAddressSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => { /* Implement search functionality here */ }}
                      className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700"
                    >
                      검색
                    </button>
                  </div>
                  {onboardingDropoffSelectedAddress && (
                    <p className="text-sm text-slate-600">
                      선택된 주소: {onboardingDropoffSelectedAddress} (Lat: {onboardingDropoffSelectedLat}, Lng: {onboardingDropoffSelectedLng})
                    </p>
                  )}
                  <div id="dropoffMap" className="w-full h-64 rounded-lg"></div>
                  <button
                    type="button"
                    onClick={() => { /* Implement "여기에서 하차하기" logic here */ }}
                    disabled={!onboardingDropoffSelectedLat || !onboardingDropoffSelectedLng}
                    className="w-full px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    여기에서 하차하기
                  </button>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(3)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={
                    !onboardingDropoffMethod ||
                    (onboardingDropoffMethod === "bus" && (!onboardingDropoffSelectedLat || !onboardingDropoffSelectedLng))
                  }
                  onClick={() => setOnboardingStep(5)}
                  className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Completion */}
          {onboardingStep === 5 && (
            <div className="space-y-4 text-center">
              <Sparkles className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-lg font-bold text-slate-900">정보 확인 완료!</p>
              <p className="text-sm text-slate-600">모든 정보를 성공적으로 입력했습니다.</p>
              <p className="text-sm text-slate-600">프라게와 함께 즐거운 학습을 시작하세요!</p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(4)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={handleOnboardingSubmit}
                  disabled={onboardingSaving}
                  className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {onboardingSaving ? "저장 중..." : "프라게 시작하기"}
                </button>
              </div>
            </div>
          )}

          {/* FAQ Section, only shown when onboarding is needed */}
          {needOnboarding && (
            <details className="mt-4 text-sm text-gray-500 border-t border-slate-100 pt-4">
              <summary className="cursor-pointer font-medium select-none flex items-center gap-2 text-slate-600">
                <HelpCircle className="w-4 h-4" />
                자주 묻는 질문
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-slate-500 pl-6 list-disc">
                <li>아이디/비밀번호를 등록해주세요</li>
                <li>재원생의 경우 회원가입 없이 휴대폰 인증만 합니다.</li>
                <li>차량·학습 안내를 위한 정보로 처음 한 번만 입력합니다.</li>
              </ul>
            </details>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />

      {renderOnboardingModal()}

      <main className="px-4 md:px-6 py-6 max-w-6xl mx-auto space-y-8">
        
        {/* Top Section: Welcome & Quick Status */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                 <span className="text-frage-blue">{studentProfile?.name || "학생"}</span> 학부모님! 👋
              </h1>
              <p className="text-sm text-slate-500 font-medium">오늘도 즐거운 하루 보내세요.</p>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-8">
            
            {studentStatus === "applicant" && (
              <section className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-orange-600 shadow-sm">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">입학 절차 진행 중</h2>
                    <p className="text-sm text-slate-600 mt-0.5">현재 입학 상담 및 테스트 단계입니다.</p>
                  </div>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-sm text-slate-600">
                  <p>학원 방문 및 상담이 완료되면 정규반 배정 후 전체 메뉴를 이용하실 수 있습니다.</p>
                </div>
              </section>
            )}

            {/* Today's Dajim Report Card */}
            {studentStatus === "enrolled" && studentProfile?.latestReport && (
              <section 
                onClick={() => markReportAsRead(studentProfile.latestReport!.id)}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">✨ 오늘의 다짐 리포트</h2>
                    {!readReportIds.includes(studentProfile.latestReport.id) && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(studentProfile.latestReport.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-base font-bold text-slate-800">
                    <span>금일 다짐활동</span>
                    {studentProfile.latestReport.rate === 100 ? (
                      <span className="text-green-600">All completed 💚</span>
                    ) : (
                      <span className="text-orange-500">{studentProfile.latestReport.rate}% 완료</span>
                    )}
                  </div>
                  
                  {/* Word Test Info - Mock or Extract from message */}
                  <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                    Word Test 1/8 예정
                  </div>
                </div>

                <Link 
                  href={`/portal/daily/${studentProfile.latestReport.id}`}
                  className="flex items-center justify-center w-full py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  [전체 브리핑 보기]
                </Link>
              </section>
            )}

            {/* Video Homework Reminder */}
            {studentStatus === "enrolled" && (studentProfile?.pendingVideoCount || 0) > 0 && (
              <Link href="/portal/video">
                <section className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 text-white shadow-lg shadow-blue-200 flex items-center justify-between group hover:scale-[1.01] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">비디오 과제가 기다리고 있어요! 🎥</h3>
                      <p className="text-blue-100 text-xs mt-0.5">
                        {studentProfile?.name} 학생이 제출해야 할 과제가 {studentProfile?.pendingVideoCount}건 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </section>
              </Link>
            )}

            {/* 2. Notices Grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-frage-orange" />
                  공지사항
                </h2>
                <Link href="/portal/notices" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                  더보기
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notices.map((notice) => (
                  <Link key={notice.id} href={`/portal/notices/${notice.id}`}>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600`}>
                            공지
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-frage-blue transition-colors">
                          {notice.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                        <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300" />
                      </p>
                    </div>
                  </Link>
                ))}
                {notices.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">등록된 공지사항이 없습니다.</p>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Monthly Report Card */}
            {studentStatus === "enrolled" && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-white rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-frage-navy" />
                        월간 리포트
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">이번 달 학습 성취도를 확인하세요.</p>
                    </div>
                    <Link href="/portal/report" className="text-xs font-bold text-frage-blue bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                      전체보기
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {monthlyReports.length > 0 ? (
                      monthlyReports.slice(0, 2).map((report) => (
                        <Link key={report.id} href="/portal/report" className="block">
                          <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-100 transition-colors border border-slate-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-frage-navy shadow-sm border border-slate-100">
                                <span className="text-lg font-black">{new Date(report.target_month).getMonth() + 1}</span>
                                <span className="text-[10px] font-bold text-slate-400 ml-0.5">월</span>
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900">{report.title}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {new Date(report.published_at).toLocaleDateString("ko-KR")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  report.status === "published"
                                    ? "bg-frage-blue/10 text-frage-blue"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {report.status === "published" ? "발행됨" : "예정"}
                              </span>
                              <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400">등록된 월간 리포트가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

          </div>

          {/* Right Column (Quick Links) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Quick Links */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4">바로가기</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/portal/video" className="flex flex-col items-center p-4 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                  <Video className="w-6 h-6 mb-2" />
                  <span className="text-sm font-bold">비디오 숙제</span>
                </Link>
                <Link href="/portal/reports" className="flex flex-col items-center p-4 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                  <FileText className="w-6 h-6 mb-2" />
                  <span className="text-sm font-bold">월간 리포트</span>
                </Link>
                <Link href="/portal/profile" className="flex flex-col items-center p-4 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                  <User className="w-6 h-6 mb-2" />
                  <span className="text-sm font-bold">내 정보</span>
                </Link>
                <button onClick={handleContact} className="flex flex-col items-center p-4 rounded-xl bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors">
                  <MessageSquare className="w-6 h-6 mb-2" />
                  <span className="text-sm font-bold">문의하기</span>
                </button>
              </div>
            </section>

            {/* Campus Info */}
            {studentStatus === "enrolled" && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-4">캠퍼스 정보</h2>
                <div className="space-y-3 text-sm text-slate-700">
                  <p className="flex items-center gap-2"><User className="w-4 h-4" /> <span>{studentProfile?.campus || "본원"}</span></p>
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> <span>02-1234-5678</span></p>
                  <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> <span>서울시 강남구 테헤란로 123</span></p>
                </div>
              </section>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
