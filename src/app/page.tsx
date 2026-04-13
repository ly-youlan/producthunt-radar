"use client";

import { useState } from "react";
import InputForm from "@/components/InputForm";
import Report from "@/components/Report";
import ShaderBackground from "@/components/ShaderBackground";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [phContext, setPhContext] = useState<string>("");

  const handleAnalyze = async (productName: string) => {
    setQuery(productName);
    setLoading(true);
    setError("");
    setAnalysis("");
    setPhContext("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "分析失败");
      }

      const result = await response.json();
      setAnalysis(result.analysis);
      if (typeof result.phContext === "string") setPhContext(result.phContext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生未知错误");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError("");
    setAnalysis("");
    setPhContext("");
    setQuery("");
  };

  const hasResult = !!analysis;

  let readingTitles: string[] = [];
  try {
    const parsed = phContext ? JSON.parse(phContext) : null;
    const items = parsed?.items;
    if (Array.isArray(items)) {
      readingTitles = items
        .map((it: any) => (typeof it?.title === "string" ? it.title : null))
        .filter(Boolean)
        .slice(0, 6);
    }
  } catch {
    // ignore
  }

  return (
    <ShaderBackground active={loading}>
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-14">
        <div className="w-full max-w-2xl">
          <div
            className={`transition-all duration-500 ease-out ${
              loading || hasResult
                ? "opacity-0 -translate-y-2 scale-[0.99] pointer-events-none"
                : "opacity-100 translate-y-0 scale-100"
            }`}
          >
            <h1 className="text-[28px] font-semibold tracking-tight text-white/90">
              PM Radar
            </h1>
            <div className="mt-6 rounded-2xl border border-[color:rgba(200,149,108,0.35)] bg-[rgba(10,10,10,0.55)] backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.55)]">
              <div className="p-5">
                <InputForm onAnalyze={handleAnalyze} loading={loading} />
              </div>
            </div>
          </div>

          <div
            className={`mt-10 text-center transition-all duration-700 ease-out ${
              loading
                ? "opacity-100 translate-y-0"
                : analysis
                  ? "opacity-0 -translate-y-6 pointer-events-none"
                  : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <div className="text-xs tracking-wider text-white/40">Reading</div>
            <div className="mt-2 text-[22px] font-semibold tracking-tight text-[rgba(200,149,108,0.95)]">
              {query}
            </div>

            <div className="mx-auto mt-5 w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
              <div className="text-[11px] uppercase tracking-wider text-white/40">
                Product Hunt feed
              </div>
              <div className="mt-2 space-y-1.5">
                {readingTitles.length > 0 ? (
                  readingTitles.map((t, idx) => (
                    <div
                      key={idx}
                      className="truncate text-sm text-white/75"
                      title={t}
                    >
                      {t}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-white/55">
                    Fetching latest items…
                  </div>
                )}
              </div>
              <div className="mt-3 h-px w-full bg-white/10" />
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-white/45">Generating report…</div>
                <div className="h-1.5 w-1.5 rounded-full bg-[rgba(200,149,108,0.95)] shadow-[0_0_18px_rgba(200,149,108,0.45)]" />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 w-full max-w-2xl rounded-xl border border-[rgba(255,120,120,0.35)] bg-[rgba(40,10,10,0.35)] px-4 py-3 text-sm text-[rgba(255,200,200,0.9)]">
            {error}
          </div>
        )}

        {analysis && (
          <div className="w-full max-w-4xl transition-all duration-700 ease-out opacity-100 translate-y-0">
            <div className="mb-4 flex justify-end">
              <button
                onClick={reset}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/65 hover:bg-white/[0.05]"
              >
                New search
              </button>
            </div>
            <Report analysis={analysis} />
          </div>
        )}
      </main>
    </ShaderBackground>
  );
}
