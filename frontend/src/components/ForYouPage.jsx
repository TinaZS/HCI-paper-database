import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import DisplayResults from "./DisplayResults";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export default function ForYouPage({ onSearch, session_name, showAll }) {
    const { token } = useAuth();
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [interactionCount, setInteractionCount] = useState(0);
    const [message, setMessage] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    async function fetchForYouPapers() {
        if (!token || !session_name) {
            setLoading(false);
            return;
        }

        if (!refreshing) setLoading(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/for-you?k=12`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        XSessionName: session_name,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setPapers(data.papers || []);
                setInteractionCount(data.session_interaction_count || 0);
                setMessage(data.message || "");
            } else {
                console.error("Failed to fetch For You papers");
                setPapers([]);
            }
        } catch (error) {
            console.error("Error fetching For You papers:", error);
            setPapers([]);
        }
        setLoading(false);
        setRefreshing(false);
    }

    useEffect(() => {
        fetchForYouPapers();
    }, [token, session_name]);

    async function handleRefresh() {
        setRefreshing(true);
        await fetchForYouPapers();
    }

    if (loading && !refreshing) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">Curating your feed</h3>
                        <p className="text-slate-500 text-sm">Analyzing your session interests...</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-12 rounded-[2.5rem] text-center shadow-2xl shadow-indigo-500/5 max-w-xl mx-auto"
                >
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-indigo-600 -rotate-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                        Unlock Your Personalized Feed
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed mb-8">
                        Sign in to discover papers tailored precisely to your research interests as you explore.
                    </p>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                    >
                        Sign In Now
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-6 py-12 z-10">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
            >
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                            Personalized
                        </span>
                        {interactionCount > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {interactionCount} papers tracked this session
                            </span>
                        )}
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                        For You
                    </h2>
                    <p className="text-slate-500 text-lg font-medium max-w-2xl">
                        {message || "Recommendations evolved from your current research journey."}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="group flex items-center gap-2.5 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-sm font-bold hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            className={`w-4 h-4 transition-transform duration-500 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                        </svg>
                        {refreshing ? "Refreshing..." : "Refresh Feed"}
                    </button>
                </div>
            </motion.div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {interactionCount === 0 || papers.length === 0 ? (
                    <motion.div
                        key="placeholder"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white/40 backdrop-blur-md border border-slate-200/50 p-16 rounded-[3rem] text-center shadow-xl max-w-2xl mx-auto mt-12 overflow-hidden relative"
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-50/50 blur-[100px] -z-10 rounded-full"></div>

                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-4">
                            Your research journey starts here
                        </h3>
                        <p className="text-slate-500 text-base mb-10 leading-relaxed max-w-md mx-auto">
                            As you interact with papers—reading abstracts, bookmarking, or citing—your "For You" feed will intelligently evolve to mirror your interests.
                        </p>
                        <Link
                            to="/"
                            className="inline-block bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 text-center"
                        >
                            Start Exploring Discovery
                        </Link>
                    </motion.div>
                ) : (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full"
                    >
                        <DisplayResults
                            results={papers}
                            onSearch={onSearch}
                            session_name={session_name}
                            showAll={showAll}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
