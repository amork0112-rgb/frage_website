"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

export default function EnableNotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      alert("이 브라우저는 알림을 지원하지 않습니다.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // 여기에 FCM 토큰 발급 로직 추가 가능
        // const token = await getToken(messaging, { vapidKey: '...' });
        // await saveTokenToServer(token);
        alert("알림이 허용되었습니다! 🎉");
      } else if (result === "denied") {
        alert("알림이 차단되었습니다. 설정에서 변경해주세요.");
      }
    } catch (error) {
      console.error("알림 권한 요청 중 오류 발생:", error);
      alert("알림 권한 요청에 실패했습니다.");
    }
  };

  if (!isSupported) return null;

  if (permission === "granted") {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-green-200 bg-green-50 text-green-600 cursor-not-allowed"
      >
        <Bell className="w-4 h-4" />
        알림이 켜져있어요
      </button>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-[#8f3fff] hover:bg-[#7a36db] text-white transition-colors"
    >
      <Bell className="w-4 h-4" />
      알림 켜기 (중요 공지 받기)
    </button>
  );
}
