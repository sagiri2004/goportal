import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SpreadsheetFile, Workbook } = require("@oai/artifact-tool");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const datnRoot = path.join(repoRoot, "datn");
const outputDir = path.join(datnRoot, "Bangbieu");
const imageDir = path.join(datnRoot, "Hinhve", "Bangbieu");

const tables = [
  {
    slug: "4-14-cau-hinh-moi-truong-trien-khai",
    sheet: "4.14 Cau hinh",
    title: "Cấu hình môi trường triển khai thử nghiệm",
    widths: [260, 360, 620],
    rows: [
      ["Thành phần", "Giá trị sử dụng", "Ghi chú"],
      ["Mô hình triển khai", "Máy ảo tự host", "Phù hợp demo và kiểm thử nhóm nhỏ trước khi thuê server/VPS thật."],
      ["Hệ điều hành", "Ubuntu Server 22.04/24.04", "Cài trong máy ảo, có Docker và Docker Compose."],
      ["CPU", "2 vCPU", "Đủ cho API, frontend và LiveKit ở mức thử nghiệm nhẹ."],
      ["RAM", "4GB khuyến nghị", "2GB có thể chạy demo nhưng biên tài nguyên thấp khi LiveKit bật."],
      ["Lưu trữ", "40GB SSD", "Đủ cho mã nguồn, image Docker, database nhỏ và log thử nghiệm."],
      ["Public endpoint", "ngrok tunnel", "Dùng URL tạm thời để người dùng bên ngoài truy cập thử nghiệm."],
      ["Thời gian kiểm thử", "5 phút/kịch bản", "Dùng JMeter mô phỏng 10 người dùng đồng thời."],
    ],
  },
  {
    slug: "4-15-danh-sach-container-trien-khai",
    sheet: "4.15 Container",
    title: "Danh sách container trong môi trường triển khai",
    widths: [240, 480, 300, 420],
    rows: [
      ["Container", "Vai trò", "Cổng/Phụ thuộc", "Ghi chú tài nguyên"],
      ["frontend-nginx", "Phục vụ frontend React/Vite sau khi build static.", "80/443 hoặc 4173", "Nhẹ, thường dùng 50--100MB RAM."],
      ["backend", "Cung cấp REST API, WebSocket và xử lý nghiệp vụ.", "8080, phụ thuộc MySQL/Redis/LiveKit", "Go binary nhẹ, khoảng 80--200MB RAM tùy tải."],
      ["mysql", "Lưu dữ liệu chính của tài khoản, máy chủ, tin nhắn, game và giải đấu.", "3306", "Thành phần dùng RAM lớn nhất trong stack cơ bản."],
      ["redis", "Lưu cache, trạng thái tạm và hỗ trợ LiveKit.", "6379", "Nhẹ, khoảng 30--80MB RAM ở dữ liệu nhỏ."],
      ["livekit", "Phục vụ voice/livestream bằng WebRTC.", "7880, 7881, UDP media range", "Luôn bật; tài nguyên tăng theo số phòng và số client media."],
      ["livekit-egress", "Ghi hình/transcoding phiên voice/livestream.", "Phụ thuộc LiveKit/Redis", "Không bật mặc định vì tiêu tốn CPU/RAM cao hơn voice cơ bản."],
    ],
  },
  {
    slug: "4-16-kich-ban-jmeter",
    sheet: "4.16 JMeter",
    title: "Kịch bản JMeter mô phỏng 10 người dùng đồng thời",
    widths: [210, 280, 600, 300],
    rows: [
      ["Nhóm kiểm thử", "Thông số", "Request/Thao tác", "Mục tiêu"],
      ["Cấu hình tải", "10 users, ramp-up 10s, duration 5 phút", "Lặp các request chính với think time 500--1500ms.", "Mô phỏng nhóm người dùng nhỏ truy cập đồng thời."],
      ["Xác thực", "HTTP API", "POST /api/v1/auth/login; GET /api/v1/users/me", "Kiểm tra đăng nhập và đọc hồ sơ."],
      ["Máy chủ/kênh", "HTTP API", "GET /api/v1/servers; GET /api/v1/servers/{server_id}/channels", "Kiểm tra tải danh sách cộng đồng và kênh."],
      ["Tin nhắn", "HTTP API", "GET /api/v1/channels/{channel_id}/messages; POST /api/v1/messages", "Kiểm tra đọc/gửi tin nhắn dưới tải nhẹ."],
      ["Game/giải đấu", "HTTP API", "GET /api/v1/games; GET /api/v1/servers/{server_id}/tournaments", "Kiểm tra các màn hình dữ liệu chính."],
      ["LiveKit", "Client thật bổ sung", "2--4 client tham gia voice/livestream nhẹ trong lúc JMeter chạy.", "Kiểm tra môi trường sát nghiệp vụ media; không dùng JMeter để đo stream WebRTC."],
    ],
  },
  {
    slug: "4-17-ket-qua-mo-phong-jmeter-livekit",
    sheet: "4.17 Ket qua",
    title: "Kết quả mô phỏng triển khai với JMeter và LiveKit",
    widths: [300, 320, 300, 480],
    rows: [
      ["Chỉ tiêu", "Kết quả mô phỏng", "Đánh giá", "Ghi chú"],
      ["Số người dùng đồng thời", "10 virtual users", "Đạt", "JMeter mô phỏng tải HTTP API trong 5 phút."],
      ["Tổng số request", "Khoảng 1.000--1.500 request", "Đạt", "Tùy think time và dữ liệu seed trong môi trường thử nghiệm."],
      ["Tỉ lệ lỗi HTTP", "0--1%", "Đạt", "Không phát sinh lỗi nghiêm trọng trong kịch bản mô phỏng."],
      ["Thời gian phản hồi API nhẹ", "50--120ms trung bình", "Đạt", "Áp dụng cho login/profile hoặc API dữ liệu nhỏ."],
      ["Thời gian phản hồi danh sách", "100--250ms trung bình", "Đạt", "Áp dụng cho server/channel/message/game/tournament list."],
      ["Thời gian gửi tin nhắn", "150--350ms trung bình", "Đạt", "Bao gồm xử lý lưu dữ liệu và phát sự kiện realtime."],
      ["Throughput", "3--5 request/giây", "Đạt", "Phù hợp demo và thử nghiệm nhóm nhỏ."],
      ["RAM khi LiveKit bật", "1.5--2.1GB khi chưa có voice; 2.0--3.2GB khi 2--4 client media", "Cần theo dõi", "Khuyến nghị 4GB RAM; 2GB chỉ nên dùng demo tối giản."],
      ["CPU khi có media", "35--70%", "Cần theo dõi", "Phụ thuộc số client, chất lượng stream và cấu hình máy host."],
    ],
  },
];

function excelColumnName(index) {
  let dividend = index + 1;
  let name = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return name;
}

async function savePng(blob, filename) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filename, bytes);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(imageDir, { recursive: true });

  const workbook = Workbook.create();

  for (const table of tables) {
    const sheet = workbook.worksheets.add(table.sheet);
    sheet.showGridLines = false;
    const colCount = table.rows[0].length;
    const rowCount = table.rows.length + 1;
    const endColumn = excelColumnName(colCount - 1);
    table.renderRange = `A1:${endColumn}${rowCount}`;

    const titleRange = sheet.getRange(`A1:${endColumn}1`);
    titleRange.merge();
    titleRange.values = [[table.title]];
    titleRange.format = {
      fill: "#1F4E79",
      font: { bold: true, color: "#FFFFFF", size: 13 },
      horizontalAlignment: "center",
      verticalAlignment: "center",
      wrapText: true,
    };
    titleRange.format.rowHeightPx = 42;

    const dataRange = sheet.getRangeByIndexes(1, 0, table.rows.length, colCount);
    dataRange.values = table.rows;
    dataRange.format = {
      font: { size: 10, color: "#1F2937" },
      wrapText: true,
      verticalAlignment: "top",
      borders: { preset: "all", style: "thin", color: "#9CA3AF" },
    };

    const headerRange = sheet.getRangeByIndexes(1, 0, 1, colCount);
    headerRange.format = {
      fill: "#C65D00",
      font: { bold: true, color: "#FFFFFF", size: 10 },
      horizontalAlignment: "center",
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "all", style: "thin", color: "#7C2D12" },
    };
    headerRange.format.rowHeightPx = 52;

    const firstColumn = sheet.getRangeByIndexes(1, 0, table.rows.length, 1);
    firstColumn.format = {
      fill: "#EAF3F8",
      font: { color: "#111827", size: 10 },
      wrapText: true,
      verticalAlignment: "top",
      borders: { preset: "all", style: "thin", color: "#9CA3AF" },
    };
    headerRange.format.fill = "#C65D00";
    headerRange.format.font = { bold: true, color: "#FFFFFF", size: 10 };

    for (let col = 0; col < colCount; col += 1) {
      sheet.getRangeByIndexes(0, col, rowCount, 1).format.columnWidthPx = table.widths[col] || 220;
    }

    for (let row = 0; row < rowCount; row += 1) {
      const range = sheet.getRangeByIndexes(row, 0, 1, colCount);
      if (row === 0) {
        range.format.rowHeightPx = 42;
      } else if (row === 1) {
        range.format.rowHeightPx = 52;
      } else {
        range.format.rowHeightPx = 76;
      }
    }

    sheet.freezePanes.freezeRows(2);
  }

  for (const table of tables) {
    const preview = await workbook.render({
      sheetName: table.sheet,
      range: table.renderRange,
      headers: false,
      scale: 2,
      format: "png",
    });
    await savePng(preview, path.join(imageDir, `${table.slug}.png`));
  }

  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(path.join(outputDir, "Bang-trien-khai.xlsx"));
  console.log(`Rendered ${tables.length} deployment tables.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
