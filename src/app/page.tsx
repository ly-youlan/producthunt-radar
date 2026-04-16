"use client";

import { useState, useEffect, useRef } from "react";
import Report from "@/components/Report";
import ShaderBackground from "@/components/ShaderBackground";
import PRODUCTS from "@/config/products";

type Phase = "home" | "loading" | "result";

const PROGRESS_STEPS = [
  "正在连接 Product Hunt RSS…",
  "读取最新产品动态…",
  "Tavily 实时搜索相关页面…",
  "匹配行业关键词与竞品信息…",
  "正在生成洞察报告…",
  "整理关键发现…",
  "报告即将完成…",
];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("home");
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");
  const [activeProduct, setActiveProduct] = useState<(typeof PRODUCTS)[0] | null>(null);
  const [phContext, setPhContext] = useState<string>("");
  const [progressStep, setProgressStep] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "loading") {
      setProgressStep(0);
      progressRef.current = setInterval(() => {
        setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
      }, 3500);
    } else {
      if (progressRef.current) clearInterval(progressRef.current);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [phase]);

  const handleCardClick = async (product: (typeof PRODUCTS)[0]) => {
    setActiveProduct(product);
    setPhase("loading");
    setError("");
    setAnalysis("");
    setPhContext("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "分析失败");
      }

      const result = await response.json();
      setAnalysis(result.analysis);
      if (typeof result.phContext === "string") setPhContext(result.phContext);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生未知错误");
      setPhase("result");
    }
  };

  const reset = () => {
    setPhase("home");
    setError("");
    setAnalysis("");
    setPhContext("");
    setActiveProduct(null);
  };

  const downloadReport = () => {
    if (!analysis) return;
    const today = new Date().toISOString().slice(0, 10);
    const productName = activeProduct?.name ?? "report";
    const lines = analysis.split("\n");
    const htmlLines = lines.map((line) => {
      line = line
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      if (line.startsWith("━")) return `<hr class="sep"><h3>${line.replace(/━+/g, "").trim()}</h3>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      if (line.trim() === "") return "<br>";
      return `<p>${line}</p>`;
    });
    const html = `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><title>PH Radar · ${productName} · ${today}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0d0f;color:#e8e8e8;max-width:780px;margin:40px auto;padding:32px;line-height:1.7;}
  h3{color:#aac4f7;font-size:13px;letter-spacing:.12em;text-transform:uppercase;margin:24px 0 10px;}
  hr.sep{border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0 0;}
  p{margin:4px 0;font-size:15px;color:rgba(255,255,255,0.82);}
  li{margin:6px 0 6px 20px;font-size:14px;color:rgba(255,255,255,0.75);}
  a{color:#7cb0fd;}
  strong{color:#fff;}
  br{display:block;height:4px;}
</style></head>
<body>${htmlLines.join("\n")}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ph-radar-${productName.toLowerCase()}-${today}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ShaderBackground active={phase === "loading"}>
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-14">

        {/* ── Home: product cards ── */}
        <div
          className={`w-full max-w-3xl transition-all duration-500 ease-out ${
            phase === "home"
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-4 scale-[0.98] pointer-events-none absolute"
          }`}
        >
          <div className="text-center mb-12">
            <p className="text-[11px] tracking-[0.25em] uppercase text-white/30 mb-3">
              PM Radar
            </p>
            <h1 className="text-[32px] font-light tracking-tight text-white/85">
              选择产品，开始调研
            </h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PRODUCTS.map((product) => (
              <button
                key={product.id}
                onClick={() => handleCardClick(product)}
                className="group text-left rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.025] hover:-translate-y-1 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)`,
                  border: `1px solid ${product.borderColor}`,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow: `0 4px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)`,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="rounded-xl px-2.5 py-1 text-[10px] tracking-widest uppercase font-medium"
                    style={{
                      background: product.accentColor,
                      color: product.tagColor,
                      border: `1px solid ${product.borderColor}`,
                    }}
                  >
                    调研
                  </div>
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs"
                    style={{ color: product.tagColor }}
                  >
                    点击开始 →
                  </div>
                </div>

                <h2 className="text-[22px] font-medium tracking-tight text-white/90 mb-1">
                  {product.name}
                </h2>
                <p
                  className="text-[12px] tracking-wider mb-4"
                  style={{ color: product.tagColor }}
                >
                  {product.tagline}
                </p>
                <p className="text-sm text-white/50 mb-5 leading-relaxed">
                  {product.description}
                </p>

                <div className="border-t border-white/[0.06] pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">
                    竞品参考
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.watchCompetitors.map((c) => (
                      <span
                        key={c}
                        className="rounded-full px-2.5 py-0.5 text-[11px] text-white/55"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading: digital rain overlay ── */}
        <div
          className={`text-center transition-all duration-500 ease-out ${
            phase === "loading"
              ? "opacity-100 translate-y-0"
              : "opacity-0 pointer-events-none absolute"
          }`}
        >
          {activeProduct && (
            <>
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/30 mb-3">
                Scanning
              </p>
              <p
                className="text-[28px] font-light tracking-tight mb-8"
                style={{ color: activeProduct.tagColor }}
              >
                {activeProduct.name}
              </p>
              <div
                className="mx-auto rounded-2xl px-6 py-5 max-w-xs text-left"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <p className="text-[10px] uppercase tracking-widest text-white/25 mb-4">
                  后台进度
                </p>
                <div className="space-y-2.5">
                  {PROGRESS_STEPS.map((step, i) => {
                    const done = i < progressStep;
                    const active = i === progressStep;
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <span
                          className="shrink-0 h-1.5 w-1.5 rounded-full transition-all duration-500"
                          style={{
                            background: done
                              ? activeProduct.tagColor
                              : active
                              ? activeProduct.tagColor
                              : "rgba(255,255,255,0.15)",
                            opacity: done ? 0.6 : active ? 1 : 0.3,
                            boxShadow: active
                              ? `0 0 8px ${activeProduct.tagColor}`
                              : "none",
                          }}
                        />
                        <p
                          className="text-sm transition-all duration-500 truncate"
                          style={{
                            color: active
                              ? "rgba(255,255,255,0.85)"
                              : done
                              ? "rgba(255,255,255,0.35)"
                              : "rgba(255,255,255,0.2)",
                          }}
                        >
                          {step}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Result: poster ── */}
        <div
          className={`w-full max-w-4xl transition-all duration-700 ease-out ${
            phase === "result"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6 pointer-events-none absolute"
          }`}
        >
          {phase === "result" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {activeProduct && (
                    <span
                      className="text-sm font-medium"
                      style={{ color: activeProduct.tagColor }}
                    >
                      {activeProduct.name}
                    </span>
                  )}
                  <span className="text-white/25 text-xs">· 行业雷达报告</span>
                </div>
                <div className="flex items-center gap-2">
                  {!error && analysis && (
                    <button
                      onClick={downloadReport}
                      className="rounded-full px-4 py-1.5 text-xs transition-colors"
                      style={{
                        background: activeProduct ? activeProduct.accentColor : "rgba(255,255,255,0.06)",
                        border: `1px solid ${activeProduct ? activeProduct.borderColor : "rgba(255,255,255,0.1)"}`,
                        color: activeProduct ? activeProduct.tagColor : "rgba(255,255,255,0.6)",
                      }}
                    >
                      ↓ 下载报告
                    </button>
                  )}
                  <button
                    onClick={reset}
                    className="rounded-full px-4 py-1.5 text-xs text-white/50 hover:text-white/75 transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    ← 返回
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  className="rounded-2xl px-5 py-4 text-sm"
                  style={{
                    background: "rgba(255,80,80,0.08)",
                    border: "1px solid rgba(255,100,100,0.2)",
                    color: "rgba(255,180,180,0.9)",
                  }}
                >
                  {error}
                </div>
              ) : (
                <Report analysis={analysis} />
              )}
            </>
          )}
        </div>
      </main>
    </ShaderBackground>
  );
}
