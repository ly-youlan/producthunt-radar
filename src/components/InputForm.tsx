"use client";

import { useEffect, useRef, useState } from "react";

interface InputFormProps {
  onAnalyze: (productName: string) => void;
  loading: boolean;
  initialValue?: string;
  autoRun?: boolean;
}

export default function InputForm({
  onAnalyze,
  loading,
  initialValue,
  autoRun,
}: InputFormProps) {
  const [productName, setProductName] = useState(initialValue ?? "");
  const [error, setError] = useState("");
  const autoRanRef = useRef(false);

  const handleAnalyzeClick = () => {
    if (!productName.trim()) {
      setError("请输入产品名称");
      return;
    }
    setError("");
    onAnalyze(productName);
  };

  useEffect(() => {
    if (!autoRun) return;
    if (autoRanRef.current) return;
    const v = (initialValue ?? "").trim();
    if (!v) return;

    autoRanRef.current = true;
    onAnalyze(v);
  }, [autoRun, initialValue, onAnalyze]);

  return (
    <div className="w-full">
      <div className="flex gap-3">
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAnalyzeClick()}
          placeholder="Product name"
          className="h-11 flex-1 rounded-xl border border-[rgba(200,149,108,0.28)] bg-[rgba(255,255,255,0.03)] px-4 text-[15px] text-white/90 placeholder:text-white/35 outline-none focus:border-[rgba(200,149,108,0.55)] focus:ring-2 focus:ring-[rgba(200,149,108,0.18)]"
        />
        <button
          onClick={handleAnalyzeClick}
          disabled={loading}
          className="h-11 shrink-0 rounded-xl border border-[rgba(200,149,108,0.35)] bg-[rgba(200,149,108,0.12)] px-4 text-[15px] font-medium text-[rgba(200,149,108,0.95)] transition hover:bg-[rgba(200,149,108,0.16)] disabled:opacity-50"
        >
          {loading ? "Searching" : "Go"}
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-[rgba(255,200,200,0.9)]">{error}</div>}
    </div>
  );
}
