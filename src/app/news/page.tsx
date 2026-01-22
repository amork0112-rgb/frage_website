export const dynamic = "force-dynamic";
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PromotionRow = {
  id: number;
  title: string;
  pinned: boolean;
  push_enabled: boolean;
  created_at: string;
  posts: {
    id: number;
    title: string;
    content: string;
    created_at: string;
  } | null;
};

export default function NewsPage() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function fetchPromotions() {
      try {
        const res = await fetch("/api/news", { next: { revalidate: 0 } });
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

  // Calculate pagination
  const sorted = useMemo(() => promotions.slice(), [promotions]);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sorted.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCategoryStyle = () => 'bg-blue-50 text-blue-600';

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
                <div className="grid gap-6">
                {currentItems.map((item) => (
                    <Link href={`/news/${item.id}`} key={item.id} className="group flex flex-col md:flex-row gap-6 p-6 rounded-xl border border-slate-100 hover:border-frage-blue/30 transition-colors bg-white hover:shadow-sm cursor-pointer">
                    <div className="md:w-32 flex-shrink-0 flex flex-col justify-center">
                        <span className={`inline-block w-fit px-2 py-1 text-xs font-semibold rounded ${getCategoryStyle()}`}>
                        NEWS
                        </span>
                        <span className="mt-2 text-sm text-slate-400">{formatDate(item.posts?.created_at || item.created_at)}</span>
                    </div>
                    <div className="flex-grow">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-frage-blue transition-colors">
                        {item.title || item.posts?.title}
                        </h3>
                        <p className="mt-2 text-slate-600 line-clamp-2">
                        {item.posts?.content || ""}
                        </p>
                    </div>
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
