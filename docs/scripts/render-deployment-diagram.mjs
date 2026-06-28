import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const requireFromFrontend = createRequire(path.join(repoRoot, 'frontend', 'package.json'));
const { chromium } = requireFromFrontend('playwright');

const outputDir = path.join(repoRoot, 'datn', 'Hinhve', 'Chuong4');
await fs.mkdir(outputDir, { recursive: true });

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 28px;
    background: #ffffff;
    color: #0f172a;
    font-family: Arial, "DejaVu Sans", sans-serif;
  }
  .diagram {
    width: 1500px;
    border: 2px solid #1f2937;
    padding: 26px;
    background: #ffffff;
  }
  .title {
    text-align: center;
    font-weight: 700;
    font-size: 30px;
    margin-bottom: 26px;
  }
  .grid {
    display: grid;
    grid-template-columns: 220px 220px 1fr;
    gap: 22px;
    align-items: center;
  }
  .box, .cloud, .node, .container, .db, .optional {
    border: 2px solid;
    border-radius: 16px;
    min-height: 86px;
    padding: 16px 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 1.25;
    font-size: 19px;
    position: relative;
  }
  .actor { border-color: #334155; background: #f8fafc; }
  .cloud { border-color: #64748b; background: #f1f5f9; border-radius: 32px; }
  .node {
    border-color: #1f4e79;
    background: #eef6ff;
    min-height: 640px;
    align-items: stretch;
    display: block;
  }
  .node-title {
    font-weight: 700;
    color: #1f4e79;
    margin-bottom: 14px;
    font-size: 21px;
  }
  .compose {
    border: 2px dashed #475569;
    border-radius: 18px;
    padding: 20px;
    height: 550px;
    background: #fbfdff;
    position: relative;
  }
  .compose-title {
    position: absolute;
    top: -17px;
    left: 24px;
    background: #ffffff;
    padding: 0 10px;
    font-weight: 700;
    color: #475569;
  }
  .services {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    margin-top: 18px;
  }
  .container { border-color: #c65d00; background: #fff7ed; min-height: 122px; }
  .db { border-color: #047857; background: #ecfdf5; min-height: 122px; }
  .optional { border-color: #9ca3af; background: #f9fafb; min-height: 122px; color: #374151; }
  .arrow {
    height: 3px;
    background: #334155;
    position: relative;
  }
  .arrow::after {
    content: "";
    position: absolute;
    right: -1px;
    top: -7px;
    border-left: 14px solid #334155;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
  }
  .label {
    font-size: 16px;
    color: #334155;
    margin-top: 10px;
    text-align: center;
  }
  .flows {
    margin-top: 22px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    font-size: 17px;
  }
  .flow {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 12px;
    padding: 12px;
    line-height: 1.35;
  }
  strong { color: #0f172a; }
</style>
</head>
<body>
<div class="diagram">
  <div class="title">Mô hình triển khai thử nghiệm tự host với ngrok và LiveKit</div>
  <div class="grid">
    <div>
      <div class="box actor"><strong>Người dùng thử nghiệm</strong><br/>10 users đồng thời</div>
      <div class="label">Trình duyệt / Desktop app</div>
    </div>
    <div>
      <div class="arrow"></div>
      <div class="label">HTTPS qua public URL</div>
    </div>
    <div class="node">
      <div class="node-title">Máy host cá nhân → Máy ảo Ubuntu Server<br/>2 vCPU, 4GB RAM, 40GB SSD</div>
      <div class="compose">
        <div class="compose-title">Docker Compose Network</div>
        <div class="services">
          <div class="container"><strong>frontend-nginx</strong><br/>React/Vite static<br/>public qua ngrok</div>
          <div class="container"><strong>backend</strong><br/>REST API<br/>WebSocket</div>
          <div class="db"><strong>mysql</strong><br/>Dữ liệu chính</div>
          <div class="db"><strong>redis</strong><br/>Cache<br/>trạng thái tạm</div>
          <div class="container"><strong>livekit</strong><br/>Voice/Livestream<br/>luôn bật</div>
          <div class="optional"><strong>livekit-egress</strong><br/>Recording/Transcoding<br/>tùy chọn</div>
        </div>
        <div class="flows">
          <div class="flow"><strong>Frontend → Backend:</strong> gọi <em>/api</em>, <em>/ws</em> thông qua reverse proxy hoặc tunnel.</div>
          <div class="flow"><strong>Backend → MySQL/Redis:</strong> lưu dữ liệu bền vững, cache và trạng thái realtime.</div>
          <div class="flow"><strong>Frontend/Backend → LiveKit:</strong> cấp token và kết nối WebRTC cho voice/livestream.</div>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
const box = await page.locator('.diagram').boundingBox();
await page.screenshot({
  path: path.join(outputDir, 'Trien-khai-tu-host-ngrok-livekit.png'),
  clip: { x: box.x, y: box.y, width: box.width, height: box.height },
});
await browser.close();
console.log('Rendered deployment diagram.');
