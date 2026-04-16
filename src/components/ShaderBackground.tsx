// @ts-nocheck
"use client";

import { useEffect, useRef } from "react";

function clampDevicePixelRatio() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function startAuroraVeil(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return () => {};

  const vertSrc = [
    "attribute vec2 a_pos;",
    "void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }",
  ].join("\n");

  const fragSrc = [
    "precision highp float;",
    "uniform float u_time;",
    "uniform vec2 u_res;",
    "uniform float u_auroraSpeed;",
    "uniform float u_auroraIntensity;",
    "uniform vec2 u_mouse;",
    "",
    "#define PI 3.14159265359",
    "#define NUM_BG_STARS 120",
    "",
    "float hash(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
    "}",
    "",
    "float hash1(float n) {",
    "  return fract(sin(n) * 43758.5453123);",
    "}",
    "",
    "float noise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float a = hash(i);",
    "  float b = hash(i + vec2(1.0, 0.0));",
    "  float c = hash(i + vec2(0.0, 1.0));",
    "  float d = hash(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
    "}",
    "",
    "float fbm(vec2 p, float t, int octaves) {",
    "  float val = 0.0;",
    "  float amp = 0.5;",
    "  float freq = 1.0;",
    "  for (int i = 0; i < 6; i++) {",
    "    if (i >= octaves) break;",
    "    val += amp * noise(p * freq + t * 0.1);",
    "    freq *= 2.1;",
    "    amp *= 0.48;",
    "    p += vec2(1.7, 9.2);",
    "  }",
    "  return val;",
    "}",
    "",
    "float auroraRibbon(vec2 uv, float t, float ribbonX, float ribbonWidth, float waveFreq, float waveAmp, float phase) {",
    "  float centerX = ribbonX + sin(t * 0.15 + phase) * 0.25;",
    "  float wave1 = sin(uv.y * waveFreq + t * 0.9 + phase) * waveAmp;",
    "  float wave2 = sin(uv.y * waveFreq * 2.3 + t * 1.3 + phase * 1.7) * waveAmp * 0.5;",
    "  float wave3 = sin(uv.y * waveFreq * 0.4 + t * 0.35 + phase * 0.6) * waveAmp * 1.2;",
    "  float wave4 = sin(uv.y * waveFreq * 3.7 + t * 1.8 + phase * 2.3) * waveAmp * 0.2;",
    "  float waveOffset = wave1 + wave2 + wave3 + wave4;",
    "  float dx = uv.x - (centerX + waveOffset);",
    "  float ribbon = exp(-dx * dx / (ribbonWidth * ribbonWidth));",
    "  float brightBand = 0.5 + 0.5 * sin(uv.y * 2.5 + t * 0.7 + phase * 2.0);",
    "  brightBand *= 0.5 + 0.5 * sin(uv.y * 5.0 - t * 0.9 + phase);",
    "  float shimmer = 0.7 + 0.3 * sin(t * 2.5 + phase * 3.0 + uv.y * 8.0);",
    "  shimmer *= 0.8 + 0.2 * sin(t * 1.7 + phase * 1.1 + uv.x * 6.0);",
    "  float verticalFade = smoothstep(-0.35, -0.05, uv.y) * smoothstep(0.75, 0.35, uv.y);",
    "  float detail = noise(vec2(uv.x * 6.0, uv.y * 10.0 + t * 0.5 + phase));",
    "  detail = 0.6 + 0.4 * detail;",
    "  return ribbon * brightBand * verticalFade * detail * shimmer;",
    "}",
    "",
    "float bgStars(vec2 uv, float t) {",
    "  float stars = 0.0;",
    "  for (int i = 0; i < NUM_BG_STARS; i++) {",
    "    float fi = float(i);",
    "    vec2 pos = vec2(",
    "      hash1(fi * 17.31 + 100.0) * 2.8 - 1.4,",
    "      hash1(fi * 11.97 + 200.0) * 1.4 - 0.3",
    "    );",
    "    float d = length(uv - pos);",
    "    float twinkleSpeed = 0.5 + hash1(fi * 3.3 + 300.0) * 2.0;",
    "    float twinkle = 0.3 + 0.7 * sin(t * twinkleSpeed + fi * 2.7);",
    "    twinkle = max(twinkle, 0.0);",
    "    twinkle *= twinkle;",
    "    float size = 0.0008 + hash1(fi * 5.5 + 400.0) * 0.002;",
    "    float brightness = 0.4 + hash1(fi * 7.7 + 500.0) * 0.6;",
    "    stars += smoothstep(size, 0.0, d) * twinkle * brightness;",
    "    if (brightness > 0.7) {",
    "      stars += smoothstep(size * 5.0, 0.0, d) * twinkle * 0.08;",
    "    }",
    "  }",
    "  return stars;",
    "}",
    "",
    "float hexDist(vec2 p) {",
    "  p = abs(p);",
    "  return max(p.x + p.y * 0.577350269, p.y * 1.154700538);",
    "}",
    "",
    "float crystalPattern(vec2 uv, float t) {",
    "  float scale = 12.0;",
    "  vec2 p = uv * scale;",
    "  vec2 r = vec2(1.0, 1.732);",
    "  vec2 h = r * 0.5;",
    "  vec2 a = mod(p, r) - h;",
    "  vec2 b = mod(p - h, r) - h;",
    "  vec2 gv = (dot(a, a) < dot(b, b)) ? a : b;",
    "  float hd = hexDist(gv);",
    "  float edge = smoothstep(0.45, 0.40, hd) - smoothstep(0.40, 0.35, hd);",
    "  float angle = atan(gv.y, gv.x);",
    "  float branch = abs(sin(angle * 3.0));",
    "  float branchLine = smoothstep(0.04, 0.0, abs(branch - 0.5) * hd);",
    "  branchLine *= smoothstep(0.0, 0.15, hd) * smoothstep(0.45, 0.25, hd);",
    "  float subBranch = abs(sin(angle * 6.0));",
    "  float subLine = smoothstep(0.03, 0.0, abs(subBranch - 0.5) * hd);",
    "  subLine *= smoothstep(0.1, 0.2, hd) * smoothstep(0.4, 0.3, hd);",
    "  float crystal = edge * 0.6 + branchLine * 0.4 + subLine * 0.2;",
    "  float shimmer = 0.7 + 0.3 * sin(t * 0.2 + hash(floor(p / r)) * 6.28);",
    "  crystal *= shimmer;",
    "  return crystal;",
    "}",
    "",
    "void main() {",
    "  vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);",
    "  if (u_mouse.x > 0.0) {",
    "    vec2 mNorm = (u_mouse - u_res * 0.5) / min(u_res.x, u_res.y);",
    "    uv += (mNorm - uv) * 0.25;",
    "  }",
    "  float t = u_time * u_auroraSpeed;",
    "  vec3 col = vec3(0.012, 0.010, 0.022);",
    "  col += vec3(0.012, 0.010, 0.018) * smoothstep(0.5, -0.3, uv.y);",
    "  float starField = bgStars(uv, u_time);",
    "  vec3 starColor = vec3(0.9, 0.88, 0.8);",
    "  col += starColor * starField;",
    "  float r1 = auroraRibbon(uv, t, 0.0, 0.22, 2.5, 0.28, 0.0);",
    "  vec3 r1color = mix(vec3(0.15, 0.95, 0.35), vec3(0.10, 0.75, 0.55), 0.5 + 0.5 * sin(uv.y * 3.5 + t * 0.3));",
    "  r1color = mix(r1color, vec3(0.55, 0.20, 0.80), smoothstep(0.25, 0.65, uv.y) * 0.4);",
    "  float r2 = auroraRibbon(uv, t * 0.9, 0.35, 0.18, 2.8, 0.24, 2.1);",
    "  vec3 r2color = mix(vec3(0.20, 0.90, 0.30), vec3(0.30, 0.80, 0.25), 0.5 + 0.5 * sin(uv.y * 4.0 - t * 0.4 + 1.0));",
    "  r2color = mix(r2color, vec3(0.65, 0.25, 0.75), smoothstep(0.3, 0.6, uv.y) * 0.35);",
    "  float r3 = auroraRibbon(uv, t * 0.75, -0.30, 0.16, 3.0, 0.22, 4.3);",
    "  vec3 r3color = mix(vec3(0.60, 0.15, 0.70), vec3(0.80, 0.20, 0.55), 0.5 + 0.5 * sin(uv.y * 5.0 + t * 0.2 + 2.0));",
    "  r3color = mix(r3color, vec3(0.20, 0.70, 0.40), smoothstep(0.1, -0.1, uv.y) * 0.3);",
    "  float r4 = auroraRibbon(uv, t * 0.6, 0.15, 0.30, 1.8, 0.35, 1.0);",
    "  vec3 r4color = mix(vec3(0.10, 0.65, 0.25), vec3(0.05, 0.50, 0.35), 0.5 + 0.5 * sin(uv.y * 2.0 + t * 0.15));",
    "  float r5 = auroraRibbon(uv, t * 1.1, -0.10, 0.10, 3.5, 0.18, 5.7);",
    "  vec3 r5color = mix(vec3(0.30, 1.0, 0.50), vec3(0.50, 0.30, 0.90), 0.5 + 0.5 * sin(uv.y * 6.0 + t * 0.5 + 3.0));",
    "  float r6 = auroraRibbon(uv, t * 0.65, 0.55, 0.14, 2.2, 0.20, 3.5);",
    "  vec3 r6color = mix(vec3(0.45, 0.10, 0.65), vec3(0.70, 0.15, 0.50), 0.5 + 0.5 * sin(uv.y * 3.0 - t * 0.3 + 1.5));",
    "  float r7 = auroraRibbon(uv, t * 0.5, -0.20, 0.35, 1.5, 0.30, 6.2);",
    "  vec3 r7color = mix(vec3(0.08, 0.55, 0.20), vec3(0.12, 0.45, 0.30), 0.5 + 0.5 * sin(uv.y * 2.5 + t * 0.1 + 4.0));",
    "  float i1 = r1 * 1.4 * u_auroraIntensity;",
    "  float i2 = r2 * 1.1 * u_auroraIntensity;",
    "  float i3 = r3 * 0.9 * u_auroraIntensity;",
    "  float i4 = r4 * 0.5 * u_auroraIntensity;",
    "  float i5 = r5 * 0.8 * u_auroraIntensity;",
    "  float i6 = r6 * 0.6 * u_auroraIntensity;",
    "  float i7 = r7 * 0.35 * u_auroraIntensity;",
    "  vec3 auroraLight = r1color * i1 + r2color * i2 + r3color * i3 + r4color * i4 + r5color * i5 + r6color * i6 + r7color * i7;",
    "  float pulse = 0.85 + 0.15 * sin(t * 0.8) * sin(t * 0.53 + 1.0);",
    "  auroraLight *= pulse;",
    "  float glowY = smoothstep(-0.3, 0.0, uv.y) * smoothstep(0.75, 0.25, uv.y);",
    "  float totalAurora = i1 + i2 + i3 + i4 + i5 + i6 + i7;",
    "  vec3 atmosphericGlow = mix(vec3(0.06, 0.15, 0.06), vec3(0.10, 0.05, 0.12), 0.5 + 0.5 * sin(t * 0.15)) * glowY * min(totalAurora, 2.5) * 0.4;",
    "  col += auroraLight + atmosphericGlow;",
    "  col -= starColor * starField * clamp(totalAurora * 0.5, 0.0, 1.0);",
    "  float groundLine = -0.35;",
    "  float groundFade = smoothstep(groundLine + 0.05, groundLine - 0.15, uv.y);",
    "  if (groundFade > 0.001) {",
    "    float perspY = max(0.001, groundLine - uv.y);",
    "    vec2 crystalUV = vec2(uv.x / (perspY * 2.0 + 0.5), 1.0 / (perspY * 3.0));",
    "    crystalUV.x += t * 0.02;",
    "    float crystal = crystalPattern(crystalUV, u_time);",
    "    vec3 iceColor = vec3(0.06, 0.08, 0.12);",
    "    vec3 iceCrystalColor = vec3(0.18, 0.22, 0.32);",
    "    vec3 iceSurface = mix(iceColor, iceCrystalColor, crystal * 0.5);",
    "    vec2 reflUV = vec2(uv.x, -uv.y - groundLine * 2.0);",
    "    float rr1 = auroraRibbon(reflUV, t, 0.0, 0.25, 2.5, 0.28, 0.0) * 0.3;",
    "    float rr2 = auroraRibbon(reflUV, t * 0.9, 0.35, 0.20, 2.8, 0.24, 2.1) * 0.2;",
    "    float rr3 = auroraRibbon(reflUV, t * 0.75, -0.30, 0.18, 3.0, 0.22, 4.3) * 0.15;",
    "    vec3 reflectionColor = r1color * rr1 + r2color * rr2 + r3color * rr3;",
    "    reflectionColor *= u_auroraIntensity * pulse;",
    "    float reflStrength = smoothstep(0.25, 0.0, perspY) * 0.6;",
    "    float sparkle = pow(crystal, 3.0) * reflStrength;",
    "    vec3 sparkleColor = vec3(0.9, 0.85, 0.7) * sparkle * 0.3;",
    "    iceSurface += reflectionColor * reflStrength + sparkleColor;",
    "    col = mix(col, iceSurface, groundFade);",
    "  }",
    "  float horizonDist = abs(uv.y - groundLine);",
    "  float horizonGlow = exp(-horizonDist * horizonDist / 0.003);",
    "  vec3 horizonColor = mix(vec3(0.10, 0.20, 0.08), vec3(0.12, 0.08, 0.18), 0.5 + 0.5 * sin(t * 0.2)) * min(totalAurora, 3.0) * 0.35 + vec3(0.02, 0.03, 0.04);",
    "  col += horizonColor * horizonGlow;",
    "  float dist = length(uv * vec2(0.7, 0.9));",
    "  float vignette = 1.0 - smoothstep(0.5, 1.5, dist);",
    "  col *= 0.7 + vignette * 0.3;",
    "  col = max(col, vec3(0.0));",
    "  col = pow(col, vec3(0.92, 0.95, 0.98));",
    "  gl_FragColor = vec4(col, 1.0);",
    "}",
  ].join("\n");

  function compile(type: number, src: string) {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Aurora shader compile error:", gl.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram();
  if (!prog) return () => {};
  const vs = compile(gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return () => {};
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Aurora program link error:", gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, "u_time");
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uAuroraSpeed = gl.getUniformLocation(prog, "u_auroraSpeed");
  const uAuroraIntensity = gl.getUniformLocation(prog, "u_auroraIntensity");
  const uMouse = gl.getUniformLocation(prog, "u_mouse");

  let mouseXVal = -1.0;
  let mouseYVal = -1.0;
  const auroraSpeedVal = 0.5;
  const auroraIntensityVal = 1.0;

  let dpr = clampDevicePixelRatio();
  let needsResize = true;
  let raf = 0;

  function resize() {
    needsResize = false;
    dpr = clampDevicePixelRatio();
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
  }

  function render(now: number) {
    if (needsResize) resize();
    gl.uniform1f(uTime, prefersReducedMotion() ? 0.0 : now * 0.001);
    gl.uniform1f(uAuroraSpeed, auroraSpeedVal);
    gl.uniform1f(uAuroraIntensity, auroraIntensityVal);
    gl.uniform2f(uMouse, mouseXVal, mouseYVal);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = window.requestAnimationFrame(render);
  }

  const onResize = () => {
    needsResize = true;
  };
  const onMouseMove = (e: MouseEvent) => {
    mouseXVal = e.clientX * dpr;
    mouseYVal = (canvas.clientHeight - e.clientY) * dpr;
  };
  const onMouseLeave = () => {
    mouseXVal = -1.0;
    mouseYVal = -1.0;
  };

  window.addEventListener("resize", onResize);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);
  resize();
  raf = window.requestAnimationFrame(render);

  return () => {
    window.removeEventListener("resize", onResize);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseleave", onMouseLeave);
    window.cancelAnimationFrame(raf);
    gl.useProgram(null);
  };
}

function startDigitalRain(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const prefersReduced = prefersReducedMotion();
  const FALL_SPEED = 0.45;
  const COLUMN_DENSITY = 0.7;

  const katakana =
    "\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD\u30BF\u30C1\u30C4\u30C6\u30C8\u30CA\u30CB\u30CC\u30CD\u30CE\u30CF\u30D2\u30D5\u30D8\u30DB\u30DE\u30DF\u30E0\u30E1\u30E2\u30E4\u30E6\u30E8\u30E9\u30EA\u30EB\u30EC\u30ED\u30EF\u30F2\u30F3";
  const numbers = "0123456789";
  const mathSymbols =
    "\u00D7\u00F7\u2206\u03A3\u03A0\u221A\u221E\u2248\u2260\u2264\u2265\u222B\u2202\u03B1\u03B2\u03B3\u03B8\u03C6\u03C8\u03C9";
  const allChars = katakana + numbers + mathSymbols;

  function randomChar() {
    return allChars[Math.floor(Math.random() * allChars.length)];
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  const FONT_SIZE = 16;
  let waterSurface = 0;

  type Column = {
    x: number;
    y: number;
    speed: number;
    length: number;
    chars: { char: string; cycleTimer: number; cycleRate: number }[];
    active: boolean;
    restartDelay: number;
    opacity: number;
    hitWater: boolean;
  };

  let columns: Column[] = [];

  function createColumn(index: number, scatter: boolean): Column {
    const trailLen = 12 + Math.floor(Math.random() * 20);
    const maxChars = trailLen + 5;
    const chars = Array.from({ length: maxChars }).map(() => ({
      char: randomChar(),
      cycleTimer: Math.random() * 3,
      cycleRate: 0.5 + Math.random() * 2,
    }));

    let startY = 0;
    if (scatter) {
      if (Math.random() < COLUMN_DENSITY) {
        startY =
          Math.random() * (waterSurface + trailLen * FONT_SIZE) -
          trailLen * FONT_SIZE * 0.3;
      } else {
        startY = -trailLen * FONT_SIZE - Math.random() * height * 0.5;
      }
    } else {
      startY = -trailLen * FONT_SIZE * Math.random() * 0.3;
    }

    return {
      x: index * FONT_SIZE,
      y: startY,
      speed: 1.2 + Math.random() * 2.5,
      length: trailLen,
      chars,
      active: scatter
        ? Math.random() < COLUMN_DENSITY + 0.2
        : Math.random() < COLUMN_DENSITY,
      restartDelay: 0,
      opacity: 0.6 + Math.random() * 0.4,
      hitWater: false,
    };
  }

  function initColumns() {
    waterSurface = height * 0.78;
    const colWidth = FONT_SIZE;
    const colCount = Math.floor(width / colWidth);
    const newColumns: Column[] = [];
    for (let i = 0; i < colCount; i++) {
      const existing = columns[i];
      if (existing) {
        existing.x = i * colWidth;
        newColumns.push(existing);
      } else {
        newColumns.push(createColumn(i, true));
      }
    }
    columns = newColumns;
  }

  function resize() {
    dpr = clampDevicePixelRatio();
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initColumns();
  }

  function updateColumns(dt: number) {
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (!col.active) {
        col.restartDelay -= dt;
        if (col.restartDelay <= 0) {
          if (Math.random() < COLUMN_DENSITY) {
            col.active = true;
            col.y = -col.length * FONT_SIZE * Math.random() * 0.3;
            col.speed = 1.2 + Math.random() * 2.5;
            col.length = 12 + Math.floor(Math.random() * 20);
            col.opacity = 0.6 + Math.random() * 0.4;
            col.hitWater = false;
            for (let c = 0; c < col.chars.length; c++) {
              col.chars[c].char = randomChar();
            }
          } else {
            col.restartDelay = 0.3 + Math.random() * 1.5;
          }
        }
        continue;
      }

      col.y += col.speed * FALL_SPEED * dt * 60;

      for (let j = 0; j < col.chars.length; j++) {
        col.chars[j].cycleTimer -= dt;
        if (col.chars[j].cycleTimer <= 0) {
          col.chars[j].char = randomChar();
          col.chars[j].cycleTimer = col.chars[j].cycleRate;
        }
      }

      const tailY = col.y - col.length * FONT_SIZE;
      if (tailY > waterSurface + 30) {
        col.active = false;
        col.restartDelay = 0.2 + Math.random() * 2;
      }
    }
  }

  function drawColumns() {
    ctx.font = `${FONT_SIZE}px "SF Mono", "Fira Code", "Cascadia Code", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (!col.active) continue;

      for (let j = 0; j < col.length; j++) {
        const charY = col.y - j * FONT_SIZE;
        if (charY > waterSurface) continue;
        if (charY < -FONT_SIZE) continue;

        const charIndex = j % col.chars.length;
        const trailFraction = j / col.length;

        let brightness = 0;
        if (j === 0) brightness = 1.0;
        else if (j === 1) brightness = 0.9;
        else if (j < 4) brightness = 0.75 - (j - 2) * 0.08;
        else brightness = Math.max(0, 0.6 * (1 - trailFraction));

        const distToWater = waterSurface - charY;
        if (distToWater < FONT_SIZE * 3) {
          brightness *= Math.max(0, distToWater / (FONT_SIZE * 3));
        }

        brightness *= col.opacity;
        if (brightness < 0.02) continue;

        let r: number;
        let g: number;
        let b: number;
        if (j === 0) {
          r = 255;
          g = 245;
          b = 220;
        } else if (j < 3) {
          r = 240;
          g = 200;
          b = 140;
        } else {
          r = 200;
          g = 149;
          b = 108;
        }

        ctx.fillStyle = `rgba(${r},${g},${b},${brightness})`;
        if (j === 0) {
          ctx.shadowColor = "rgba(255, 220, 160, 0.6)";
          ctx.shadowBlur = 8;
        }

        ctx.fillText(col.chars[charIndex].char, col.x + FONT_SIZE * 0.5, charY);

        if (j === 0) {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }
      }
    }
  }

  let lastTime = 0;
  let raf = 0;

  function render(timestamp: number) {
    if (!lastTime) lastTime = timestamp;
    let dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    if (prefersReduced) dt = 0;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "screen";
    updateColumns(dt);
    drawColumns();

    raf = window.requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize);
  resize();
  raf = window.requestAnimationFrame(render);

  return () => {
    window.removeEventListener("resize", resize);
    window.cancelAnimationFrame(raf);
  };
}

export default function ShaderBackground({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  const auroraRef = useRef<HTMLCanvasElement | null>(null);
  const rainRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!auroraRef.current) return;
    const stopAurora = startAuroraVeil(auroraRef.current);

    return () => {
      stopAurora();
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    if (!rainRef.current) return;

    const stopRain = startDigitalRain(rainRef.current);
    return () => {
      stopRain();
    };
  }, [active]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <canvas
        ref={auroraRef}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={rainRef}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
          mixBlendMode: "screen",
          opacity: active ? 0.85 : 0,
          transition: "opacity 600ms ease",
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}
