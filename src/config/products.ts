export type ProductConfig = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  positioning: string;
  category: string;
  searchQuery: string;
  phCategories: string[];
  phKeywords: string[];
  competitors: string[];
  watchCompetitors: string[];
  watchCorps: string[];
  accentColor: string;
  borderColor: string;
  tagColor: string;
};

const products: ProductConfig[] = [
  {
    id: "democreator",
    name: "DemoCreator",
    tagline: "录屏 · 剪辑 · 演示",
    description: "专业录屏与视频剪辑一体化工具",
    positioning:
      "面向教育培训、产品演示、远程办公场景的一体化录屏+视频剪辑工具，核心差异在于轻量上手、模板化输出和 AI 辅助剪辑。",
    category: "桌面录屏剪辑工具",
    searchQuery:
      "screen recorder video editor tutorial maker demo presentation AI clip",
    phCategories: ["video", "artificial-intelligence", ""],
    phKeywords: [
      "screen recorder", "video editor", "demo tool", "tutorial maker",
      "presentation", "screen capture", "clip", "record", "camtasia",
      "loom", "descript", "screen studio",
    ],
    competitors: ["Camtasia", "Screen Studio", "Loom", "Descript", "ScreenFlow"],
    watchCompetitors: ["Camtasia", "Screen Studio", "Loom", "Descript"],
    watchCorps: ["Adobe", "Microsoft", "Apple", "Google", "ByteDance", "Canva"],
    accentColor: "rgba(124, 176, 253, 0.18)",
    borderColor: "rgba(124, 176, 253, 0.28)",
    tagColor: "rgba(124, 176, 253, 0.85)",
  },
  {
    id: "uniconverter",
    name: "UniConverter",
    tagline: "音视频 · 转码 · 工具集",
    description: "全能多媒体处理工具集",
    positioning:
      "面向内容创作者和专业用户的全能多媒体工具集，覆盖格式转换、视频压缩、字幕生成、音频处理、AI 画质增强等场景。",
    category: "多媒体处理工具集",
    searchQuery:
      "multimedia video audio converter compressor subtitle AI enhance processing tool",
    phCategories: ["video", "artificial-intelligence", ""],
    phKeywords: [
      "video converter", "audio converter", "media converter", "subtitle",
      "compress", "transcode", "format converter", "video processing",
      "AI enhance", "upscale", "handbrake", "shutter encoder", "videoproc",
    ],
    competitors: [
      "HandBrake",
      "Shutter Encoder",
      "FFmpeg GUI",
      "Permute",
      "VideoProc",
    ],
    watchCompetitors: ["HandBrake", "Shutter Encoder", "VideoProc", "Permute"],
    watchCorps: ["Adobe", "Apple", "Google", "NVIDIA", "ByteDance", "Topaz Labs"],
    accentColor: "rgba(200, 149, 108, 0.18)",
    borderColor: "rgba(200, 149, 108, 0.28)",
    tagColor: "rgba(200, 149, 108, 0.90)",
  },
];

export default products;
