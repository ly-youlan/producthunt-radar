import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import products from "@/config/products";

export const runtime = "nodejs";

const newApiKeyRaw = process.env.NEWAPI_KEY;
const newApiKey = newApiKeyRaw?.trim();
const modelName = (process.env.MODEL_USED || "gpt-4o").trim();
const tavilyKey = process.env.TAVILY_KEY?.trim();
const parser = new Parser();

const PRODUCT_HUNT_RSS_URL = "https://www.producthunt.com/feed";
const PRODUCT_HUNT_RSS_FALLBACK_URLS = (
  process.env.PRODUCT_HUNT_RSS_FALLBACK_URLS || "https://rsshub.app/producthunt"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function fetchTextWithTimeout(
  url: string,
  timeoutMs: number
): Promise<{ ok: true; text: string } | { ok: false; error: string; status?: number }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        Accept:
          "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
        "User-Agent": "pmradar/1.0 (+https://example.com)",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
      };
    }

    const text = await res.text();
    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

async function fetchFeedXmlWithRetry(url: string) {
  const timeoutMs = 25_000;
  const attempts = 2;
  let lastErr: string | null = null;

  for (let i = 0; i < attempts; i++) {
    const r = await fetchTextWithTimeout(url, timeoutMs);
    if (r.ok) return { ok: true as const, xml: r.text, attempts: i + 1 };
    lastErr = r.error;
  }

  return { ok: false as const, error: lastErr || "unknown" };
}

type NormalizedItem = {
  title: string | undefined;
  link: string | undefined;
  content: string | undefined;
  pubDate: string | undefined;
  category: string;
};

async function fetchCategoryFeed(category: string): Promise<NormalizedItem[]> {
  const url = category
    ? `${PRODUCT_HUNT_RSS_URL}?category=${encodeURIComponent(category)}`
    : PRODUCT_HUNT_RSS_URL;

  const r = await fetchFeedXmlWithRetry(url);
  if (!r.ok) {
    console.warn(`[RSS] Failed to fetch category=${category || "all"}:`, r.error);
    return [];
  }
  try {
    const feed = await parser.parseString(r.xml);
    return (feed.items || []).map((item) => ({
      title: item.title,
      link: item.link,
      content:
        item.contentSnippet ||
        item.content ||
        (typeof item["content:encoded"] === "string" ? item["content:encoded"] : undefined),
      pubDate: item.pubDate,
      category: category || "all",
    }));
  } catch {
    return [];
  }
}

async function getProductHuntData(cfg: import("@/config/products").ProductConfig | null, fallbackQuery: string) {
  try {
    const categories = cfg?.phCategories ?? ["", "artificial-intelligence", "video"];
    const keywords = cfg?.phKeywords ?? [fallbackQuery.toLowerCase()];

    const allResults = await Promise.all(categories.map(fetchCategoryFeed));

    const seen = new Set<string>();
    const allItems: NormalizedItem[] = [];
    for (const items of allResults) {
      for (const item of items) {
        const key = item.link ?? item.title ?? "";
        if (!key || seen.has(key)) continue;
        seen.add(key);
        allItems.push(item);
      }
    }

    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    const matched = allItems.filter((item) => {
      const text = `${item.title ?? ""} ${item.content ?? ""}`.toLowerCase();
      return lowerKeywords.some((kw) => text.includes(kw));
    });

    const recentItems = allItems.slice(0, 40);

    console.log(`[RSS] total deduplicated: ${allItems.length}, keyword-matched: ${matched.length}`);

    return JSON.stringify(
      {
        note: matched.length > 0
          ? `Keyword matched ${matched.length} items from ${categories.length} feeds.`
          : `No keyword match. Providing ${recentItems.length} recent items from ${categories.length} feeds.`,
        feeds_fetched: categories.map((c) => c || "all (trending)"),
        keywords_used: keywords,
        matched_items: matched.slice(0, 25),
        recent_items: matched.length === 0 ? recentItems : [],
      },
      null,
      2
    );
  } catch (error) {
    console.error("Failed to fetch Product Hunt RSS:", error);
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: "Failed to fetch Product Hunt RSS", details: message }, null, 2);
  }
}

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
};

async function getTavilySearchData(query: string): Promise<string> {
  if (!tavilyKey) return JSON.stringify({ note: "TAVILY_KEY not set, skipping web search" });
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: "advanced",
        include_answer: false,
        max_results: 8,
        include_domains: ["producthunt.com", "betalist.com", "techcrunch.com", "venturebeat.com"],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[Tavily] HTTP", res.status, err.slice(0, 200));
      return JSON.stringify({ error: `Tavily HTTP ${res.status}`, details: err.slice(0, 200) });
    }
    const data = (await res.json()) as { results?: TavilyResult[] };
    const results = (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 400),
      date: r.published_date ?? null,
      score: r.score,
    }));
    return JSON.stringify({ source: "Tavily web search", query, results }, null, 2);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Tavily] Error:", msg);
    return JSON.stringify({ error: "Tavily search failed", details: msg });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId: string = body.productId ?? "";
    const productName: string = body.productName ?? productId;

    if (!productId && !productName) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    if (!newApiKey) {
      return NextResponse.json(
        {
          error:
            "Missing NEWAPI_KEY. Check your .env.local and restart dev server. Tip: avoid spaces around '='.",
        },
        { status: 500 }
      );
    }

    const cfg = products.find((p) => p.id === productId);
    const searchTerm = cfg?.searchQuery ?? productName;

    const tavilyQuery = cfg
      ? `${cfg.name} competitors ${cfg.watchCompetitors.slice(0, 3).join(' ')} Product Hunt new tools 2025`
      : `${productName} Product Hunt new products 2025`;

    const [productHuntData, tavilyData] = await Promise.all([
      getProductHuntData(cfg ?? null, searchTerm),
      getTavilySearchData(tavilyQuery),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const competitorsList = cfg?.watchCompetitors.join("、") ?? "";
    const corpsList = cfg?.watchCorps.join("、") ?? "";
    const productLabel = cfg ? `${cfg.name}（${cfg.category}）` : productName;
    const positioning = cfg?.positioning ?? "";

    const prompt = `你是一个专业的产品分析师，擅长把 Product Hunt 动态整理成可直接给 PM 决策用的「精简洞察报告」。

本次调研产品：${productLabel}
产品定位：${positioning}
重点关注竞品：${competitorsList}
重点关注大厂：${corpsList}

信息源一（Product Hunt RSS 抓取，JSON 格式）：
${productHuntData}

信息源二（Tavily 实时网页搜索结果，包含 producthunt.com / techcrunch 等页面摘要）：
${tavilyData}

请严格按以下格式输出（中文，Markdown），不要输出任何格式标记之外的前言：

🌙 PH 雷达 · ${today} · ${cfg?.name ?? productName} 专项

━━━ 💡 本期关键发现 ━━━
（最多 2 条，每条 1 句话，说清楚为什么重要、和本产品的关联）

━━━ 🆕 重点新品 ━━━
（3-5 个。若信息源不足可减少，不要编造。每个条目严格四行，注意 tag 要根据产品实际情况填写，例如"桌面录屏工具"、"TTS 算法模型"、"AI 字幕生成器"等：
- **产品名** ｜ 🏷️ [产品类型 tag] ｜ [链接 or (无链接)]
  定位：一句话产品定位 + 核心功能关键词
  🎯 解决什么问题 ｜ 值得注意的创意点或差异化
  📌 对 ${cfg?.name ?? productName} 的参考价值（高/中/低）+ 具体可借鉴点

━━━ 🔄 大厂动态（${corpsList})━━━
（重点关注上述大厂在相关领域的动向；如无则写"本期无重大大厂动态"）

━━━ 👁️ 特别关注速览（${competitorsList})━━━
（重点关注上述竞品的最新动态、新功能或新产品；如信息源中未出现则写"本期无相关信息，建议手动核查"）

━━━ 💎 随手记灵感 ━━━
（3-5 条可落地的方向判断或功能灵感，结合本产品定位，不要空泛概念）

规则（不要输出这部分）：
- 宁缺毋滥：信息源不支持就减少条目，明确标注"信息源不足"
- 不要编造信息源中不存在的产品
- RSS 如未直接命中关键词，默默用信息源二（Tavily 网页搜索结果）补充，不要在报告里显示任何警告提示
- 每个重点新品的 tag 必须是对该产品类型的具体概括，不能写"未知"
`;

    const dsResponse = await fetch("https://new-api.300624.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newApiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        stream: true,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!dsResponse.ok) {
      const errText = await dsResponse.text();
      console.error(`[NewAPI] HTTP ${dsResponse.status}:`, errText);
      return NextResponse.json(
        {
          error: `NewAPI request failed (HTTP ${dsResponse.status})`,
          details: errText,
        },
        { status: 502 }
      );
    }

    if (!dsResponse.body) {
      return NextResponse.json({ error: "NewAPI returned empty stream" }, { status: 502 });
    }

    const reader = dsResponse.body.getReader();
    const decoder = new TextDecoder();
    let contentParts: string[] = [];
    let reasoningParts: string[] = [];
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const chunk = JSON.parse(data) as {
            choices?: {
              delta?: { content?: string | null; reasoning_content?: string | null };
            }[];
          };
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) contentParts.push(delta.content);
          if (delta?.reasoning_content) reasoningParts.push(delta.reasoning_content);
        } catch {
          // ignore malformed SSE chunk
        }
      }
    }

    const text = (contentParts.join("") || reasoningParts.join("")).trim();
    if (!text) {
      console.error("[NewAPI] Stream produced no content. content chunks:", contentParts.length, "reasoning chunks:", reasoningParts.length);
      return NextResponse.json(
        { error: "NewAPI returned empty response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: text,
      phContext: productHuntData,
      productName,
    });
  } catch (error) {
    console.error("AI API Error:", error);

    const message = error instanceof Error ? error.message : String(error);

    if (
      message.toLowerCase().includes("fetch failed") ||
      message.toLowerCase().includes("getaddrinfo") ||
      message.toLowerCase().includes("econn")
    ) {
      return NextResponse.json(
        {
          error:
            "Network error calling AI provider. Check your network/proxy settings.",
          details: message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate analysis", details: message },
      { status: 500 }
    );
  }
}
