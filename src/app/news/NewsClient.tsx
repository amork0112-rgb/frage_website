"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PromotionRow = {
  // id removed as it doesn't exist in notice_promotions
  title: string;
  pinned: boolean;
  push_enabled: boolean;
  created_at: string;
  post_id: number;
  posts: {
    id: number;
    title: string;
    created_at: string;
  } | null;
};

export default function NewsClient() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function fetchPromotions() {
      try {
        const res = await fetch("/api/news", { cache: "no-store" });
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setPromotions(json.data);
        } else {
          console.error("Error fetching promotions:", json.error);
        }
      } catch (err) {
        console.error("Error fetching promotions:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPromotions();
  }, []);

  // Calculate pagination for Normal Items only
  const pinnedItems = useMemo(() => promotions.filter(p => p.pinned), [promotions]);
  const normalItems = useMemo(() => promotions.filter(p => !p.pinned), [promotions]);
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = normalItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(normalItems.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("ko-KR", {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
      }).replace(/\./g, '.');
  }

  return (
    <main className="min-h-screen bg-white pb-20">
      <section className="bg-frage-navy pt-24 pb-16 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">News & Notice</h1>
          <p className="mt-3 text-frage-sand/80">프라게의 주요 소식과 안내 사항을 빠르게 전해드립니다.</p>
        </div>
      </section>

      <section className="container mx-auto mt-12 px-6 max-w-5xl">
        {loading ? (
             <div className="text-center py-20 text-slate-400">Loading news...</div>
        ) : promotions.length === 0 ? (
             <div className="text-center py-20 text-slate-400">등록된 소식이 없습니다.</div>
        ) : (
            <>
                {/* Pinned Section */}
                {pinnedItems.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">📌</span>
                      <h2 className="text-lg font-bold text-slate-800">중요 공지</h2>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {pinnedItems.map((item) => (
                        <Link 
                          href={`/news/${item.post_id}`} 
                          key={item.post_id} 
                          className="group flex items-center justify-between px-6 py-4 hover:bg-slate-100 transition-colors cursor-pointer gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold bg-frage-navy text-white rounded">
                              공지
                            </span>
                            <span className="font-bold text-slate-900 truncate group-hover:text-frage-blue transition-colors">
                              {item.title || item.posts?.title}
                            </span>
                          </div>
                          <span className="flex-shrink-0 text-sm text-slate-500 font-medium">
                            {formatDate(item.posts?.created_at || item.created_at)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* General List Section */}
                <div className="space-y-2">
                {currentItems.map((item) => (
                    <Link 
                      href={`/news/${item.post_id}`} 
                      key={item.post_id} 
                      className="group flex items-center justify-between px-4 py-4 rounded-lg border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-600`}>
                          NEWS
                        </span>
                        <span className="font-bold text-slate-800 truncate group-hover:text-frage-blue transition-colors">
                          {item.title || item.posts?.title}
                        </span>
                      </div>
                      <span className="flex-shrink-0 text-sm text-slate-400">
                        {formatDate(item.posts?.created_at || item.created_at)}
                      </span>
                    </Link>
                ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-12 flex justify-center items-center gap-2">
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-slate-500 hover:text-frage-blue disabled:opacity-30 disabled:hover:text-slate-500 transition-colors font-medium"
                        >
                            &larr; Prev
                        </button>
                        
                        <div className="flex space-x-2 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                                <button
                                    key={number}
                                    onClick={() => handlePageChange(number)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                                        currentPage === number
                                            ? "bg-frage-blue text-white shadow-md scale-105"
                                            : "text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    {number}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-slate-500 hover:text-frage-blue disabled:opacity-30 disabled:hover:text-slate-500 transition-colors font-medium"
                        >
                            Next &rarr;
                        </button>
                    </div>
                )}
            </>
        )}
      </section>
    </main>
  );
}
