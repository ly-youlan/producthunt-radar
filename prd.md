# PM Radar · 产品调研工具

## 产品定位
面向产品经理的行业竞品雷达工具，聚焦特定产品线，快速生成行业洞察报告。

## 当前版本：V1 — 预设产品调研

### 核心流程
1. **首页** — 进入即看到预设产品卡片，无需输入
2. **点击卡片** — 触发对应产品的预设搜索诉求
3. **搜索中** — 全屏 Digital Rain 动效 + 进度反馈
4. **出结果** — 呈现行业雷达分析报告（海报形式）

### 当前支持产品（V1 共 2 款）

#### DemoCreator
- **类型**：录屏 + 视频剪辑一体化工具
- **竞品参考**：Camtasia、Screen Studio、Loom
- **搜索关键词**：screen recording video editing demo creation tool

#### UniConverter
- **类型**：音视频多媒体工具集（转码/处理/AI增强）
- **竞品参考**：HandBrake、FFmpeg GUI、Shutter Encoder
- **搜索关键词**：multimedia video audio converter processing tool AI

### 信息源
- Product Hunt RSS 爬取（主源 + fallback）
- AI 分析：DeepSeek Chat（后续可替换）

### 网站设计
- 设计语言：简约高级，浅白色半透明圆角卡片，frosted glass 风格
- 背景：Aurora Veil shader（常驻）+ Digital Rain shader（搜索时激活）
- 参考方法论：https://impeccable.style/
- 配色参考：radiant-shaders.com

### 技术栈
- Next.js + Vercel 部署
- TailwindCSS
- WebGL shader（Aurora Veil）+ Canvas 2D（Digital Rain）

## 后续迭代方向（V2+）
- 支持更多预设产品（最终目标 3 款）
- 替换/扩展信息源 API
- 报告导出为图片/PDF
- 定时推送（周报模式）
