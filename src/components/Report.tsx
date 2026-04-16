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
  name: string;
  link?: string;
  tag?: string;
  line2?: string;
  line3?: string;
  line4?: string;
};

function extractProducts(block: string): ProductItem[] {
  const lines = block.split(/\r?\n/);
  const items: ProductItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l.startsWith("- ")) continue;
    const raw = l.replace(/^[-*]\s+/, "").trim();
    // Parse: **名称** ｜ 🏷️ [tag] ｜ [link] or **名称** ｜ [link]
    // Remove markdown bold
    const deBolded = raw.replace(/\*\*/g, "");
    const parts = deBolded.split(/[｜|]/).map((s) => s.trim());
    const name = parts[0] ?? deBolded;
    let tag: string | undefined;
    let link: string | undefined;
    for (const part of parts.slice(1)) {
      const mdLink = part.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
      if (mdLink) { link = mdLink[2]; continue; }
      if (part.startsWith("http")) { link = part; continue; }
      if (part === "(无链接)" || part === "无链接") continue;
      if (part && !tag) tag = part.replace(/^🏷️\s*/, "").replace(/^\[|\]$/g, "").trim();
    }
    const line2 = lines[i + 1]?.trim();
    const line3 = lines[i + 2]?.trim();
    const line4 = lines[i + 3]?.trim();
    items.push({ name, link, tag, line2, line3, line4 });
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

  const keySection = Object.entries(parsed.sections).find(([k]) =>
    k.includes("关键发现")
  )?.[1] ?? "";
  const productsSection = Object.entries(parsed.sections).find(([k]) =>
    k.includes("重点新品")
  )?.[1] ?? "";
  const bigCoSection = Object.entries(parsed.sections).find(([k]) =>
    k.includes("大厂动态")
  )?.[1] ?? "";
  const watchSection = Object.entries(parsed.sections).find(([k]) =>
    k.includes("特别关注")
  )?.[1] ?? "";
  const ideasSection = Object.entries(parsed.sections).find(([k]) =>
    k.includes("随手记")
  )?.[1] ?? "";

  const findings = extractBullets(keySection).slice(0, 6);
  const productItems = extractProducts(productsSection);
  const ideas = extractBullets(ideasSection).slice(0, 12);

  const bigCoEmpty = !bigCoSection || /无重大|无相关|暂无/.test(bigCoSection);
  const watchEmpty = !watchSection || /无相关|暂无|未出现|建议手动/.test(watchSection);

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
              {productItems.length > 0 ? (
                productItems.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    {p.tag && (
                      <span className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide"
                        style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {p.tag}
                      </span>
                    )}
                    <div className="text-[15px] font-semibold text-white/90 pr-20">
                      {p.link ? (
                        <a href={p.link} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                          {p.name}
                        </a>
                      ) : p.name}
                    </div>
                    {p.line2 && (
                      <div className="mt-2 text-sm text-white/60 leading-relaxed">
                        <div className="prose prose-invert max-w-none text-white/60 prose-p:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.line2}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {p.line3 && (
                      <div className="mt-1.5 text-sm text-white/70 leading-relaxed">
                        <div className="prose prose-invert max-w-none text-white/70 prose-p:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.line3}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {p.line4 && (
                      <div className="mt-1.5 text-sm text-[rgba(200,149,108,0.9)] leading-relaxed">
                        <div className="prose prose-invert max-w-none prose-p:my-0" style={{color:"rgba(200,149,108,0.9)"}}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.line4}</ReactMarkdown>
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

          {!bigCoEmpty && (
            <section>
              <div className="mb-3 text-xs font-semibold tracking-wider text-white/45">
                � 大厂动态
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 leading-relaxed">
                <div className="prose prose-invert max-w-none text-white/70 prose-p:my-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{bigCoSection}</ReactMarkdown>
                </div>
              </div>
            </section>
          )}

          {!watchEmpty && (
            <section>
              <div className="mb-3 text-xs font-semibold tracking-wider text-white/45">
                👁️ 特别关注速览
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 leading-relaxed">
                <div className="prose prose-invert max-w-none text-white/70 prose-p:my-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{watchSection}</ReactMarkdown>
                </div>
              </div>
            </section>
          )}

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
