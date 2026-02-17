"use client";
//app/portal/home/page.tsx
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
  const [kakaoReady, setKakaoReady] = useState(false);
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
      kakaoMapScript.src = `//dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${KAKAO_MAP_APP_KEY}&libraries=services`;
      kakaoMapScript.async = true;

      kakaoMapScript.onload = () => {
        window.kakao.maps.load(() => {
          console.log("✅ Kakao Map SDK Loaded");
          setKakaoReady(true);
        });
      };

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
    if (
      onboardingStep !== 3 ||
      onboardingPickupMethod !== "bus" ||
      !kakaoReady
    ) return;

    const timer = setTimeout(() => {

      if (!window.kakao?.maps) return;

      const container = document.getElementById("pickupMap");
      if (!container) return;

      window.kakao.maps.load(() => {

        const center = new window.kakao.maps.LatLng(35.8578, 128.6265);

        const map = new window.kakao.maps.Map(container, {
          center,
          level: 3
        });

        const marker = new window.kakao.maps.Marker({
          map,
          position: center,
          draggable: true
        });

        const geocoder = new window.kakao.maps.services.Geocoder();

        window.kakao.maps.event.addListener(marker, "dragend", () => {
          const pos = marker.getPosition();

          setOnboardingPickupSelectedLat(pos.getLat().toString());
          setOnboardingPickupSelectedLng(pos.getLng().toString());

          geocoder.coord2Address(
            pos.getLng(),
            pos.getLat(),
            (result, status) => {
              if (status === kakao.maps.services.Status.OK) {
                setOnboardingPickupSelectedAddress(
                  result[0].address.address_name
                );
              }
            }
          );
        });

        setPickupMap(map);
        setPickupMarker(marker);

        setTimeout(() => {
          map.relayout();
          map.setCenter(center);
        }, 200);

      });

    }, 300); // ⭐️ Modal 열린 후 생성

    return () => clearTimeout(timer);

  }, [onboardingStep, onboardingPickupMethod, kakaoReady]);

  // Kakao Map initialization for Dropoff
  useEffect(() => {
    if (
      onboardingStep !== 4 ||
      onboardingDropoffMethod !== "bus" ||
      !kakaoReady
    ) return;

    const timer = setTimeout(() => {

      if (!window.kakao?.maps) return;

      const container = document.getElementById("dropoffMap");
      if (!container) return;

      window.kakao.maps.load(() => {

        const center = new window.kakao.maps.LatLng(35.8578, 128.6265);

        const map = new window.kakao.maps.Map(container, {
          center,
          level: 3
        });

        const marker = new window.kakao.maps.Marker({
          map,
          position: center,
          draggable: true
        });

        const geocoder = new window.kakao.maps.services.Geocoder();

        window.kakao.maps.event.addListener(marker, "dragend", () => {
          const pos = marker.getPosition();

          setOnboardingDropoffSelectedLat(pos.getLat().toString());
          setOnboardingDropoffSelectedLng(pos.getLng().toString());

          geocoder.coord2Address(
            pos.getLng(),
            pos.getLat(),
            (result, status) => {
              if (status === kakao.maps.services.Status.OK) {
                setOnboardingDropoffSelectedAddress(
                  result[0].address.address_name
                );
              }
            }
          );
        });

        setDropoffMap(map);
        setDropoffMarker(marker);

        setTimeout(() => {
          map.relayout();
          map.setCenter(center);
        }, 200);

      });

    }, 300); // ⭐️ Modal 열린 후 생성

    return () => clearTimeout(timer);

  }, [onboardingStep, onboardingDropoffMethod, kakaoReady]);

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
    if(!window.kakao?.maps?.services){
      alert("지도를 불러오는 중입니다");
      return;
    }

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(onboardingPickupAddressSearch, (data: kakao.maps.services.PlaceResult[], status: kakao.maps.services.Status) => {
      if (status === window.kakao.maps.services.Status.OK) {
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
    if(!window.kakao?.maps?.services){
      alert("지도를 불러오는 중입니다");
      return;
    }

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(onboardingDropoffAddressSearch, (data: kakao.maps.services.PlaceResult[], status: kakao.maps.services.Status) => {
      if (status === window.kakao.maps.services.Status.OK) {
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
    return () => {
      alive = false;
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
        pickup_address?: string;
        dropoff_latitude?: string;
        dropoff_longitude?: string;
        dropoff_address?: string;
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
    if (onboardingPickupMethod === "bus" && onboardingDropoffSelectedLng) payload.dropoff_longitude = onboardingDropoffSelectedLng;
    if (onboardingPickupMethod === "bus" && onboardingPickupSelectedAddress) payload.pickup_address = onboardingPickupSelectedAddress;
    if (onboardingDropoffMethod === "bus" && onboardingDropoffSelectedAddress) payload.dropoff_address = onboardingDropoffSelectedAddress;

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
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md h-[85vh] flex flex-col mx-4 relative">
          {/* Header */}
          <div className="p-4 pb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  학생 정보가 부족합니다.
                </p>
                <p className="text-xs text-slate-600">
                  계속하려면 추가 정보를 입력해주세요.
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-frage-blue h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(onboardingStep / 5) * 100}%` }}
              ></div>
            </div>
            <p className="text-right text-sm font-medium text-slate-600 mt-1">
              {onboardingStep} / 5
            </p>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto space-y-4 px-4 py-2">
            {onboardingSaving && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl z-10">
                <div className="flex items-center text-frage-blue font-bold text-lg">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-frage-blue"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  저장 중...
                </div>
              </div>
            )}

            {onboardingError && (
              <div
                className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50"
                role="alert"
              >
                {onboardingError}
              </div>
            )}

            {/* Step 1: Basic Info Confirmation (Read-only) */}
            {onboardingStep === 1 && (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  1단계: 기본 정보 확인
                </h3>
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm text-slate-500">학생 이름</p>
                    <p className="text-lg font-bold text-slate-900">
                      {studentProfile.name} ({studentProfile.englishName})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">반 이름</p>
                    <p className="text-lg font-bold text-slate-900">
                      {studentProfile.className}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">캠퍼스</p>
                    <p className="text-lg font-bold text-slate-900">
                      {studentProfile.campus}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Address Input */}
            {onboardingStep === 2 && (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  2단계: 주소 입력
                </h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label
                      htmlFor="onboardingAddress"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      주소
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        id="onboardingAddress"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                        value={onboardingAddress}
                        readOnly
                        placeholder="주소 검색 버튼을 눌러주세요."
                      />
                      <button
                        type="button"
                        onClick={handleAddressSearch}
                        className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700"
                      >
                        주소 검색
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="onboardingDetailAddress"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      상세 주소
                    </label>
                    <input
                      type="text"
                      id="onboardingDetailAddress"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                      value={onboardingDetailAddress}
                      onChange={(e) => setOnboardingDetailAddress(e.target.value)}
                      placeholder="상세 주소를 입력해주세요."
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Pickup Method */}
            {onboardingStep === 3 && (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  3단계: 등원 방식 선택
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      등원 방식을 선택해주세요
                    </label>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setOnboardingPickupMethod("bus")}
                        className={`flex-1 px-4 py-3 rounded-lg border text-sm font-bold transition-colors ${
                          onboardingPickupMethod === "bus"
                            ? "bg-frage-blue text-white border-frage-blue"
                            : "bg-white text-slate-700 border-slate-300 hover:border-frage-blue hover:text-frage-blue"
                        }`}
                      >
                        <Bus className="inline-block w-5 h-5 mr-2" /> 학원차량
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardingPickupMethod("self")}
                        className={`flex-1 px-4 py-3 rounded-lg border text-sm font-bold transition-colors ${
                          onboardingPickupMethod === "self"
                            ? "bg-frage-blue text-white border-frage-blue"
                            : "bg-white text-slate-700 border-slate-300 hover:border-frage-blue hover:text-frage-blue"
                        }`}
                      >
                        <Car className="inline-block w-5 h-5 mr-2" /> 자가 등원
                      </button>
                    </div>
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
                          onClick={handlePickupSearch}
                          className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700"
                        >
                          검색
                        </button>
                      </div>
                      <div className="flex flex-col h-[300px] mt-3">
                        <div
                          id="pickupMap"
                          className="flex-1 rounded-lg border"
                        />
                      </div>
                      {onboardingPickupSelectedAddress && (
                        <p className="text-sm text-slate-600">
                          선택된 주소: {onboardingPickupSelectedAddress} (Lat: {onboardingPickupSelectedLat}, Lng: {onboardingPickupSelectedLng})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 4: Dropoff Method */}
            {onboardingStep === 4 && (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  4단계: 하원 방식 선택
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      하원 방식을 선택해주세요
                    </label>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setOnboardingDropoffMethod("bus")}
                        className={`flex-1 px-4 py-3 rounded-lg border text-sm font-bold transition-colors ${
                          onboardingDropoffMethod === "bus"
                            ? "bg-frage-blue text-white border-frage-blue"
                            : "bg-white text-slate-700 border-slate-300 hover:border-frage-blue hover:text-frage-blue"
                        }`}
                      >
                        <Bus className="inline-block w-5 h-5 mr-2" /> 학원차량
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardingDropoffMethod("self")}
                        className={`flex-1 px-4 py-3 rounded-lg border text-sm font-bold transition-colors ${
                          onboardingDropoffMethod === "self"
                            ? "bg-frage-blue text-white border-frage-blue"
                            : "bg-white text-slate-700 border-slate-300 hover:border-frage-blue hover:text-frage-blue"
                        }`}
                      >
                        <Car className="inline-block w-5 h-5 mr-2" /> 직접 픽업
                      </button>
                    </div>
                  </div>

                  {onboardingDropoffMethod === "bus" && (
                    <div className="space-y-2 pt-2">
                      <p className="text-sm font-bold text-slate-700 mb-2">
                        📍 지도에서 하원 위치를 선택해주세요
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
                          onClick={handleDropoffSearch}
                          className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700"
                        >
                          검색
                        </button>
                      </div>
                      <div className="flex flex-col h-[300px] mt-3">
                        <div
                          id="dropoffMap"
                          className="flex-1 rounded-lg border"
                        />
                      </div>
                      {onboardingDropoffSelectedAddress && (
                        <p className="text-sm text-slate-600">
                          선택된 주소: {onboardingDropoffSelectedAddress} (Lat: {onboardingDropoffSelectedLat}, Lng: {onboardingDropoffSelectedLng})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 5: Final Review and Submit */}
            {onboardingStep === 5 && (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  5단계: 최종 확인 및 제출
                </h3>
                <div className="space-y-3 mb-6 text-sm text-slate-700">
                  <p>
                    <span className="font-bold">학생 이름:</span> {studentProfile.name}
                  </p>
                  <p>
                    <span className="font-bold">주소:</span> {onboardingAddress} {onboardingDetailAddress}
                  </p>
                  <p>
                    <span className="font-bold">등원 방식:</span> {
                      onboardingPickupMethod === "bus"
                        ? `학원차량 (Lat: ${onboardingPickupSelectedLat}, Lng: ${onboardingPickupSelectedLng})`
                        : "직접 픽업"
                    }
                  </p>
                  <p>
                    <span className="font-bold">하원 방식:</span> {
                      onboardingDropoffMethod === "bus"
                        ? `학원차량 (Lat: ${onboardingDropoffSelectedLat}, Lng: ${onboardingDropoffSelectedLng})`
                        : "직접 픽업"
                    }
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Unified Footer for Navigation */}
          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            {onboardingStep > 1 && (
              <button
                type="button"
                onClick={() => setOnboardingStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4 | 5)}
                className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
              >
                이전
              </button>
            )}
            {onboardingStep < 5 && (
              <button
                type="button"
                onClick={() => setOnboardingStep((prev) => Math.min(5, prev + 1) as 1 | 2 | 3 | 4 | 5)}
                className="px-6 py-3 rounded-lg bg-frage-blue text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                disabled={
                  (onboardingStep === 2 && (!onboardingAddress || !onboardingDetailAddress)) ||
                  (onboardingStep === 3 && !onboardingPickupMethod) ||
                  (onboardingStep === 4 && !onboardingDropoffMethod) ||
                  (onboardingStep === 3 && onboardingPickupMethod === "bus" && (!onboardingPickupSelectedLat || !onboardingPickupSelectedLng)) ||
                  (onboardingStep === 4 && onboardingDropoffMethod === "bus" && (!onboardingDropoffSelectedLat || !onboardingDropoffSelectedLng))
                }
              >
                다음
              </button>
            )}
            {onboardingStep === 5 && (
              <button
                type="button"
                onClick={handleOnboardingSubmit}
                disabled={onboardingSaving}
                className="w-full px-6 py-3 rounded-lg bg-frage-blue text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                저장
              </button>
            )}
          </div>
        </div>
      </div>

    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">학부모 포털</h1>

        {studentStatus === "pending_onboarding" && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-bold">환영합니다!</span> 학생 정보 등록을 완료해주세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {studentStatus === "pending_approval" && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Sparkles className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <span className="font-bold">거의 다 됐어요!</span> 관리자 승인을 기다리고 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {studentStatus === "enrolled" && (
          <div className="space-y-8">
            {/* Notifications Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">새로운 알림</h2>
                <Link href="/portal/notifications" className="text-sm text-frage-blue hover:underline">
                  모두 보기 <ArrowRight className="inline-block w-4 h-4 ml-1" />
                </Link>
              </div>
              {
                notifications.length > 0 ? (
                  <ul className="bg-white rounded-xl shadow overflow-hidden divide-y divide-slate-200">
                    {notifications.slice(0, 3).map((notification) => (
                      <li key={notification.id} className="block hover:bg-slate-50">
                        <Link href={`/portal/notifications/${notification.id}`} className="flex items-center px-4 py-4 sm:px-6">
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                              <div>
                                <p className="text-sm font-medium text-frage-blue truncate">{notification.title}</p>
                                <p className="mt-2 flex items-center text-sm text-slate-500">
                                  <MessageSquare className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                                  <span className="truncate">{notification.message}</span>
                                </p>
                              </div>
                              <div className="hidden md:block">
                                <div>
                                  <p className="text-sm text-slate-900">
                                    {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString('ko-KR') : '날짜 없음'}
                                  </p>
                                  {/* <p className="mt-2 flex items-center text-sm text-slate-500">
                                    <CheckCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" />
                                    {notification.isRead ? '읽음' : '안 읽음'}
                                  </p> */}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-white rounded-xl shadow">
                    <p>새로운 알림이 없습니다.</p>
                  </div>
                )
              }
            </section>

            {/* Monthly Reports Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">월간 보고서</h2>
                <Link href="/portal/reports" className="text-sm text-frage-blue hover:underline">
                  모두 보기 <ArrowRight className="inline-block w-4 h-4 ml-1" />
                </Link>
              </div>
              {
                monthlyReports.length > 0 ? (
                  <ul className="bg-white rounded-xl shadow overflow-hidden divide-y divide-slate-200">
                    {monthlyReports.slice(0, 3).map((report) => (
                      <li key={report.id} className="block hover:bg-slate-50">
                        <Link href={`/portal/reports/${report.id}`} className="flex items-center px-4 py-4 sm:px-6">
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                              <div>
                                <p className="text-sm font-medium text-frage-blue truncate">{report.title}</p>
                                <p className="mt-2 flex items-center text-sm text-slate-500">
                                  <FileText className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                                  <span className="truncate">{report.date}</span>
                                </p>
                              </div>
                              <div className="hidden md:block">
                                <div>
                                  <p className="text-sm text-slate-900">{report.status === 'published' ? '게시됨' : '초안'}</p>
                                  <p className="mt-2 flex items-center text-sm text-slate-500">
                                    <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                                    {report.target_month}월
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-white rounded-xl shadow">
                    <p>아직 작성된 월간 보고서가 없습니다.</p>
                  </div>
                )
              }
            </section>

            {/* Video Homework Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">영상 숙제</h2>
                <Link href="/portal/video" className="text-sm text-frage-blue hover:underline">
                  모두 보기 <ArrowRight className="inline-block w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Video className="w-8 h-8 text-frage-blue" />
                  <div>
                    <p className="text-lg font-bold text-slate-900">미제출 영상 숙제</p>
                    <p className="text-sm text-slate-500">기한 내에 제출해주세요</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-600">{studentProfile.pendingVideoCount || 0}개</span>
              </div>
            </section>

            {/* Notices Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">공지사항</h2>
                <Link href="/portal/notices" className="text-sm text-frage-blue hover:underline">
                  모두 보기 <ArrowRight className="inline-block w-4 h-4 ml-1" />
                </Link>
              </div>
              {
                notices.length > 0 ? (
                  <ul className="bg-white rounded-xl shadow overflow-hidden divide-y divide-slate-200">
                    {notices.map((notice) => (
                      <li key={notice.id} className="block hover:bg-slate-50">
                        <Link href={`/portal/notices/${notice.id}`} className="flex items-center px-4 py-4 sm:px-6">
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                              <div>
                                <p className="text-sm font-medium text-frage-blue truncate">{notice.title}</p>
                                <p className="mt-2 flex items-center text-sm text-slate-500">
                                  <FileText className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                                  <span className="truncate">{new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-white rounded-xl shadow">
                    <p>등록된 공지사항이 없습니다.</p>
                  </div>
                )
              }
            </section>

            {/* Quick Links / Help Section */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">빠른 링크</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleContact}
                  className="flex items-center justify-center px-4 py-3 bg-white rounded-lg shadow text-frage-blue font-bold hover:bg-slate-50 transition-colors"
                >
                  <HelpCircle className="w-5 h-5 mr-2" /> 카카오톡 상담
                </button>
                {/* <Link
                  href="/portal/faq"
                  className="flex items-center justify-center px-4 py-3 bg-white rounded-lg shadow text-frage-blue font-bold hover:bg-slate-50 transition-colors"
                >
                  <HelpCircleIcon className="w-5 h-5 mr-2" /> 자주 묻는 질문
                </Link> */}
              </div>
            </section>
          </div>
        )}
      </main>
      {renderOnboardingModal()}
    </div>
  );
}
