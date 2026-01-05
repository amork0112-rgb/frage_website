"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Post = {
  id: number;
  title: string;
  category: string;
  created_at: string;
  content: string; // Using content as summary for now, or truncate it
};

export default function NewsPage() {
  const [newsItems, setNewsItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching news:", error);
      } else {
        setNewsItems(data || []);
      }
      setLoading(false);
    }

    fetchPosts();
  }, []);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = newsItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(newsItems.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCategoryStyle = (category: string) => {
      const lower = category.toLowerCase();
      if (lower.includes('notice')) return 'bg-red-50 text-red-600';
      if (lower.includes('event')) return 'bg-orange-50 text-orange-600';
      return 'bg-blue-50 text-blue-600';
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
      <section className="bg-slate-50 py-16 border-b border-slate-100">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-frage-navy md:text-4xl">News & Notice</h1>
          <p className="mt-3 text-slate-600">
            프라게 에듀의 새로운 소식을 전해드립니다.
          </p>
        </div>
      </section>

      <section className="container mx-auto mt-12 px-6 max-w-5xl">
        {loading ? (
             <div className="text-center py-20 text-slate-400">Loading news...</div>
        ) : newsItems.length === 0 ? (
             <div className="text-center py-20 text-slate-400">등록된 소식이 없습니다.</div>
        ) : (
            <>
                <div className="grid gap-6">
                {currentItems.map((item) => (
                    <Link href={`/news/${item.id}`} key={item.id} className="group flex flex-col md:flex-row gap-6 p-6 rounded-xl border border-slate-100 hover:border-frage-blue/30 transition-colors bg-white hover:shadow-sm cursor-pointer">
                    <div className="md:w-32 flex-shrink-0 flex flex-col justify-center">
                        <span className={`inline-block w-fit px-2 py-1 text-xs font-semibold rounded ${getCategoryStyle(item.category)}`}>
                        {item.category.toUpperCase()}
                        </span>
                        <span className="mt-2 text-sm text-slate-400">{formatDate(item.created_at)}</span>
                    </div>
                    <div className="flex-grow">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-frage-blue transition-colors">
                        {item.title}
                        </h3>
                        <p className="mt-2 text-slate-600 line-clamp-2">
                        {item.content}
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
