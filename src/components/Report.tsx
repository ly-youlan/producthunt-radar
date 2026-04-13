"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportProps {
  analysis: string;
}

type ParsedReport = {
  headerTitle?: string;
  headerSub?: string;
  sections: Record<string, string>;
};

function parseReport(text: string): ParsedReport | null {
  const cleaned = text.trim();
  if (!cleaned) return null;

  const lines = cleaned.split(/\r?\n/);
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || "";

  let headerTitle: string | undefined;
  let headerSub: string | undefined;
  if (firstNonEmpty.includes("PH") || firstNonEmpty.includes("雷达")) {
    headerTitle = firstNonEmpty;
    const sub = lines.slice(lines.indexOf(firstNonEmpty) + 1).find((l) => l.trim());
    if (sub && !sub.includes("━━━")) headerSub = sub.trim();
  }

  const sections: Record<string, string> = {};
  const re = /━━━\s*([^━\n]+?)\s*━━━/g;
  const matches = Array.from(cleaned.matchAll(re));
  if (matches.length === 0) return null;

  for (let i = 0; i < matches.length; i++) {
    const title = (matches[i][1] || "").trim();
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
    const content = cleaned.slice(start, end).trim();
    sections[title] = content;
  }

  return { headerTitle, headerSub, sections };
}

function extractBullets(block: string) {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[-*]\s+/, ""));
}

type ProductItem = {
  nameLine: string;
  line2?: string;
  line3?: string;
};

function extractProducts(block: string): ProductItem[] {
  const lines = block.split(/\r?\n/);
  const items: ProductItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith("- ")) continue;
    const nameLine = l.replace(/^[-*]\s+/, "").trim();
    const line2 = lines[i + 1]?.trim();
    const line3 = lines[i + 2]?.trim();
    items.push({ nameLine, line2, line3 });
  }
  return items.slice(0, 10);
}

export default function Report({ analysis }: ReportProps) {
  if (!analysis) return null;

  const parsed = parseReport(analysis);
  if (!parsed) {
    return (
      <div className="mt-8 w-full max-w-4xl rounded-2xl border border-white/10 bg-[rgba(10,10,10,0.55)] p-6 backdrop-blur-md">
        <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-wrap leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
        </div>
      </div>
    );
  }

  const keySection =
    parsed.sections["💡 本周关键发现"] ||
    parsed.sections["本周关键发现"] ||
    parsed.sections["关键发现"] ||
    "";
  const productsSection =
    parsed.sections["🆕 重点新品"] ||
    parsed.sections["重点新品"] ||
    parsed.sections["新品"] ||
    "";
  const bigCoSection =
    parsed.sections["🔄 大厂动态速览"] || parsed.sections["大厂动态速览"] || "";
  const demoSection =
    parsed.sections["🎬 DemoCreate 专项"] ||
    parsed.sections["DemoCreate 专项"] ||
    parsed.sections["工具链专项"] ||
    "";
  const categorySection =
    parsed.sections["📊 分类速览"] || parsed.sections["分类速览"] || "";
  const ideasSection =
    parsed.sections["💎 随手记灵感"] || parsed.sections["随手记灵感"] || "";

  const findings = extractBullets(keySection).slice(0, 6);
  const products = extractProducts(productsSection);
  const ideas = extractBullets(ideasSection).slice(0, 12);

  return (
    <div className="mt-8 w-full max-w-4xl">
      <div className="rounded-3xl border border-white/10 bg-[rgba(10,10,10,0.55)] p-6 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.55)]">
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <span className="text-xl">🌙</span>
            <h2 className="text-[18px] font-semibold tracking-tight text-white/90">
              PH Radar
            </h2>
          </div>
          {parsed.headerTitle && (
            <div className="mt-1 text-xs text-white/45">{parsed.headerTitle}</div>
          )}
          {parsed.headerSub && (
            <div className="mt-1 text-xs text-white/40">{parsed.headerSub}</div>
          )}
        </div>

        <div className="mt-6 grid gap-5">
          <section>
            <div className="mb-3 text-xs font-semibold tracking-wider text-white/45">
              💡 本周关键发现
            </div>
            <div className="grid gap-2">
              {findings.length > 0 ? (
                findings.map((t, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80 leading-relaxed"
                  >
                    <div className="prose prose-invert max-w-none text-white/80 prose-p:my-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{t}</ReactMarkdown>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/55">
                  信息源不足，暂无关键发现。
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 text-xs font-semibold tracking-wider text-white/45">
              🆕 重点新品
            </div>
            <div className="grid gap-3">
              {products.length > 0 ? (
                products.map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="text-[15px] font-semibold text-white/90">
                      <div className="prose prose-invert max-w-none text-white/90 prose-p:my-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.nameLine}</ReactMarkdown>
                      </div>
                    </div>
                    {p.line2 && (
                      <div className="mt-2 text-sm text-white/70 leading-relaxed">
                        <div className="prose prose-invert max-w-none text-white/70 prose-p:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.line2}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {p.line3 && (
                      <div className="mt-2 text-sm text-[rgba(200,149,108,0.95)] leading-relaxed">
                        <div className="prose prose-invert max-w-none text-[rgba(200,149,108,0.95)] prose-p:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.line3}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
                  信息源不足，暂无重点新品。
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-3 text-xs font-semibold tracking-wider text-white/45">
                🔄 大厂动态速览
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                <div className="prose prose-invert max-w-none text-white/70 prose-p:my-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {bigCoSection || "本周无重大大厂动态"}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold tracking-wider text-white/45">
                📊 分类速览
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                <div className="prose prose-invert max-w-none text-white/70 prose-p:my-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {categorySection || "无重大新动态"}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 text-xs font-semibold tracking-wider text-[rgba(200,149,108,0.85)]">
              🎬 DemoCreate 专项
            </div>
            <div className="rounded-2xl border border-[rgba(200,149,108,0.25)] bg-[rgba(200,149,108,0.06)] p-4 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
              <div className="prose prose-invert max-w-none text-white/75 prose-p:my-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {demoSection || "本周无直接相关信息。"}
                </ReactMarkdown>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 text-xs font-semibold tracking-wider text-white/45">
              💎 随手记灵感
            </div>
            <div className="flex flex-wrap gap-2">
              {ideas.length > 0 ? (
                ideas.map((t, idx) => (
                  <span
                    key={idx}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
                  暂无
                </span>
              )}
            </div>
          </section>
        </div>
      </div>

      <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <summary className="cursor-pointer text-xs text-white/45">
          Raw markdown
        </summary>
        <div className="prose prose-invert mt-3 max-w-none text-white/85 whitespace-pre-wrap leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
        </div>
      </details>
    </div>
  );
}
