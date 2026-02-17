"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, CheckCircle } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

declare global {
  interface Window {
    kakao: any;
  }
}

export default function PickupMapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [marker, setMarker] = useState<kakao.maps.Marker | null>(null);
  const [addressSearchKeyword, setAddressSearchKeyword] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedLat, setSelectedLat] = useState<string | null>(null);
  const [selectedLng, setSelectedLng] = useState<string | null>(null);
  const KAKAO_MAP_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!KAKAO_MAP_APP_KEY) {
      console.error("NEXT_PUBLIC_KAKAO_MAP_KEY is not defined.");
      return;
    }

    const kakaoMapScript = document.createElement("script");
    kakaoMapScript.src = `//dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${KAKAO_MAP_APP_KEY}&libraries=services`;
    kakaoMapScript.async = true;

    kakaoMapScript.onload = () => {
      window.kakao.maps.load(() => {
        console.log("✅ Kakao Map SDK Loaded on PickupMapPage");
        setKakaoReady(true);
      });
    };

    document.head.appendChild(kakaoMapScript);

    return () => {
      if (kakaoMapScript.parentNode) {
        kakaoMapScript.parentNode.removeChild(kakaoMapScript);
      }
    };
  }, [KAKAO_MAP_APP_KEY]);

  useEffect(() => {
    if (!kakaoReady || !KAKAO_MAP_APP_KEY) return;

    const container = document.getElementById("map");
    if (!container) return;

    const options = {
      center: new window.kakao.maps.LatLng(33.450701, 126.570667), // Default to Jeju Island
      level: 3,
    };
    const newMap = new window.kakao.maps.Map(container, options);
    setMap(newMap);

    const newMarker = new window.kakao.maps.Marker({
      position: options.center,
      draggable: true,
    });
    newMarker.setMap(newMap);
    setMarker(newMarker);

    window.kakao.maps.event.addListener(newMarker, "dragend", () => {
      const pos = newMarker.getPosition();
      updateAddressFromCoords(pos.getLat(), pos.getLng());
    });

    // Try to load initial coordinates from localStorage
    const storedLat = localStorage.getItem("temp_pickup_lat");
    const storedLng = localStorage.getItem("temp_pickup_lng");
    const storedAddr = localStorage.getItem("temp_pickup_address");

    if (storedLat && storedLng) {
      const initialPos = new window.kakao.maps.LatLng(
        parseFloat(storedLat),
        parseFloat(storedLng)
      );
      newMap.setCenter(initialPos);
      newMarker.setPosition(initialPos);
      setSelectedLat(storedLat);
      setSelectedLng(storedLng);
      setSelectedAddress(storedAddr || "주소 정보 없음");
    } else {
      // If no stored coords, get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentPos = new window.kakao.maps.LatLng(lat, lng);
          newMap.setCenter(currentPos);
          newMarker.setPosition(currentPos);
          updateAddressFromCoords(lat, lng);
        });
      }
    }

    setLoading(false);
  }, [kakaoReady, KAKAO_MAP_APP_KEY]);

  const updateAddressFromCoords = (lat: number, lng: number) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result: any[], status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setSelectedAddress(result[0].address.address_name);
        setSelectedLat(lat.toString());
        setSelectedLng(lng.toString());
      } else {
        setSelectedAddress("주소 정보를 찾을 수 없습니다.");
        setSelectedLat(lat.toString());
        setSelectedLng(lng.toString());
      }
    });
  };

  const handleAddressSearch = () => {
    if (!map || !addressSearchKeyword) return;
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(
      addressSearchKeyword,
      (data: kakao.maps.services.PlaceResult[], status: kakao.maps.services.Status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const place = data[0];
          const newPos = new window.kakao.maps.LatLng(
            parseFloat(place.y),
            parseFloat(place.x)
          );
          map.setCenter(newPos);
          marker?.setPosition(newPos);
          updateAddressFromCoords(parseFloat(place.y), parseFloat(place.x));
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          alert("검색 결과가 없습니다.");
        } else {
          alert("주소 검색 중 오류가 발생했습니다.");
        }
      }
    );
  };

  const handleSelectLocation = () => {
    if (selectedLat && selectedLng && selectedAddress) {
      localStorage.setItem("temp_pickup_lat", selectedLat);
      localStorage.setItem("temp_pickup_lng", selectedLng);
      localStorage.setItem("temp_pickup_address", selectedAddress);
      router.back();
    } else {
      alert("지도에서 위치를 선택해주세요.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <PortalHeader />
      <main className="flex-1 container mx-auto p-4 max-w-2xl flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">승차 위치 선택</h1>
          <div className="w-6 h-6" /> {/* Placeholder for alignment */}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-600">지도 로딩 중...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex space-x-2">
              <input
                type="text"
                placeholder="주소를 검색하세요"
                className="flex-1 p-2 border border-gray-300 rounded-md"
                value={addressSearchKeyword}
                onChange={(e) => setAddressSearchKeyword(e.target.value)}
              />
              <button
                onClick={handleAddressSearch}
                className="p-2 bg-frage-blue text-white rounded-md flex items-center justify-center"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
            <div id="map" className="flex-1 w-full h-[400px] rounded-lg shadow-md mb-4" />
            <div className="p-3 bg-white rounded-md shadow-sm mb-4">
              <p className="text-sm font-medium text-slate-700">선택된 위치:</p>
              <p className="text-lg font-bold text-frage-blue">{selectedAddress}</p>
              {selectedLat && selectedLng && (
                <p className="text-xs text-slate-500">
                  위도: {parseFloat(selectedLat).toFixed(6)}, 경도: {parseFloat(selectedLng).toFixed(6)}
                </p>
              )}
            </div>
            <button
              onClick={handleSelectLocation}
              className="w-full p-3 bg-frage-blue text-white font-bold rounded-md flex items-center justify-center space-x-2 disabled:opacity-50"
              disabled={!selectedLat || !selectedLng}
            >
              <CheckCircle className="w-5 h-5" />
              <span>이 위치 선택</span>
            </button>
          </>
        )}
      </main>
    </div>
  );
}
