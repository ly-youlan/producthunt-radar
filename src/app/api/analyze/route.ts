import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";

export const runtime = "nodejs";

const deepseekApiKeyRaw = process.env.DEEPSEEK_API_KEY;
const deepseekApiKey = deepseekApiKeyRaw?.trim();
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

async function getProductHuntData(productName: string) {
  try {
    const sources = [PRODUCT_HUNT_RSS_URL, ...PRODUCT_HUNT_RSS_FALLBACK_URLS];

    let usedSource: string | null = null;
    let xml: string | null = null;
    const errors: Record<string, string> = {};

    for (const src of sources) {
      const r = await fetchFeedXmlWithRetry(src);
      if (r.ok) {
        usedSource = src;
        xml = r.xml;
        break;
      }
      errors[src] = r.error;
    }

    if (!xml || !usedSource) {
      throw new Error(
        `All Product Hunt RSS sources failed: ${JSON.stringify(errors)}`
      );
    }

    const feed = await parser.parseString(xml);

    const q = productName.trim().toLowerCase();
    const normalizedItems = (feed.items || []).map((item) => ({
      title: item.title,
      link: item.link,
      content:
        item.contentSnippet ||
        item.content ||
        (typeof item["content:encoded"] === "string" ? item["content:encoded"] : undefined),
      pubDate: item.pubDate,
    }));

    const relevantItems = normalizedItems
      .filter(
        (item) =>
          (!!q &&
            (item.title?.toLowerCase().includes(q) ||
              item.content?.toLowerCase().includes(q)))
      )
      .slice(0, 20);

    const recentItems = normalizedItems.slice(0, 30);

    if (relevantItems.length === 0) {
      return JSON.stringify(
        {
          note:
            "No direct keyword match in Product Hunt RSS. Providing latest items as context.",
          keyword: productName,
          source: usedSource,
          totalItems: normalizedItems.length,
          items: recentItems,
        },
        null,
        2
      );
    }

    return JSON.stringify(
      {
        note: "Keyword matched items.",
        keyword: productName,
        source: usedSource,
        totalItems: normalizedItems.length,
        matched: relevantItems.length,
        items: relevantItems,
      },
      null,
      2
    );
  } catch (error) {
    console.error("Failed to fetch or parse Product Hunt RSS feed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify(
      {
        error: "Failed to fetch Product Hunt RSS",
        details: message,
      },
      null,
      2
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productName } = await request.json();

    if (!productName) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!deepseekApiKey) {
      return NextResponse.json(
        {
          error:
            "Missing DEEPSEEK_API_KEY. Check your .env.local and restart dev server. Tip: avoid spaces around '='.",
        },
        { status: 500 }
      );
    }

    const productHuntData = await getProductHuntData(productName);

    const isDemoCreate = productName.trim().toLowerCase().includes("democreate");

    const prompt = `你是一个专业的产品分析师，擅长把 Product Hunt 动态整理成可直接给 PM 决策用的「精简洞察报告」。

现在用户关心的主题/关键词是："${productName}"。

信息源（Product Hunt RSS 抓取结果，可能为空或不完整；可能只有“latest items context”，也可能包含 error/details）：
${productHuntData}

请严格按以下格式输出（中文，Markdown），并尽量精炼：

\`\`\`
🌙 PH 雷达 · {YYYY-MM-DD} · 出海音视频工具专项

━━━ 💡 本周关键发现 ━━━
（最多 2 条，每条 1 句话：为什么重要 + 和音视频工具/PM决策的关联）

━━━ 🆕 重点新品 ━━━
（3-5 个。每个条目严格三行：）
- **产品名** | [链接]
  🎯 解决什么问题 | 值得注意的创意点
  📌 对 PM 的参考价值（高/中/低）/ 关联产品线（UniConverter / DemoCreate / AniEraser / 其它）

━━━ 🔄 大厂动态速览 ━━━
（一句话即可；如无则写“本周无重大大厂动态”）

━━━ 🎬 DemoCreate 专项 ━━━
（如果有直接相关新品：挑 1-2 个写同样三行格式；
如果没有：写“本周信号汇总”并给 3-4 条交互/内容趋势信号）

━━━ 📊 分类速览 ━━━
（按类别一行带过：格式转换/剪辑录屏/字幕配音/音频处理/图像去除修复；没有就写“无重大新动态”）

━━━ 💎 随手记灵感 ━━━
（3-5 条可落地的方向判断，不要空泛概念）
\`\`\`

规则：
- 宁缺毋滥：如果信息源不足以支持 3-5 个重点新品，允许少于 3 个，并明确“信息源不足”。
- 大厂产品（Google/Meta/Microsoft/Apple/Adobe/ByteDance 等）默认归为“例行更新”，不要单独占用“重点新品”条目。
- 重点新品必须包含可点击链接（如果信息源里缺 link，就写“(无链接)”）。
- 不要编造不存在于信息源中的产品；若只能基于 latest items context 做归纳，也请显式说明“本次为关键词未命中情况下的趋势归纳”。
${isDemoCreate ? "- 本次为 DemoCreate 专项：重点新品优先筛选‘录屏/剪辑/教学视频/演示视频制作/模板化视频生成/AI 剪辑’相关工具；如果不相关，宁可不列也不要硬凑。\n- 对每个重点新品，在 📌 行明确写出‘对 DemoCreate 的可借鉴点’，并尽量具体到功能/交互。" : ""}
`;

    const dsResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!dsResponse.ok) {
      const errText = await dsResponse.text();
      return NextResponse.json(
        {
          error: "DeepSeek API request failed",
          details: errText,
        },
        { status: 502 }
      );
    }

    const dsJson = (await dsResponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const text = dsJson.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "DeepSeek returned empty response" },
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
