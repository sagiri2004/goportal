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
    slug: "4-10-kiem-thu-xac-thuc-ho-so",
    sheet: "4.10 Xac thuc",
    title: "Kết quả kiểm thử chức năng xác thực và hồ sơ người dùng",
    rows: [
      ["Mã", "Kịch bản kiểm thử", "Kết quả mong đợi", "Kết quả thực tế", "Kết luận"],
      ["TC-AUTH-01", "Đăng ký tài khoản mới với dữ liệu hợp lệ.", "Hệ thống tạo tài khoản và trả về mã 201.", "Trả về 201, tài khoản được tạo.", "Đạt"],
      ["TC-AUTH-02", "Đăng nhập bằng tài khoản vừa tạo.", "Hệ thống xác thực thành công và trả JWT.", "Trả về 200, nhận được JWT.", "Đạt"],
      ["TC-AUTH-03", "Lấy thông tin người dùng hiện tại với JWT hợp lệ.", "Hệ thống trả thông tin hồ sơ người dùng.", "Trả về 200, dữ liệu người dùng đúng.", "Đạt"],
      ["TC-AUTH-04", "Cập nhật tên người dùng hiện tại.", "Hệ thống lưu thay đổi và trả hồ sơ mới.", "Trả về 200, tên người dùng được cập nhật.", "Đạt"],
      ["TC-AUTH-05", "Gọi API hồ sơ không kèm token.", "Hệ thống từ chối với mã 401.", "Trả về 401 với lỗi thiếu thông tin xác thực.", "Đạt"],
    ],
  },
  {
    slug: "4-11-kiem-thu-may-chu-kenh",
    sheet: "4.11 Server kenh",
    title: "Kết quả kiểm thử chức năng máy chủ và kênh",
    rows: [
      ["Mã", "Kịch bản kiểm thử", "Kết quả mong đợi", "Kết quả thực tế", "Kết luận"],
      ["TC-SRV-01", "Người dùng đã đăng nhập tạo máy chủ mới.", "Máy chủ được tạo và người tạo trở thành chủ sở hữu.", "Trả về 201, máy chủ được tạo.", "Đạt"],
      ["TC-SRV-02", "Chủ máy chủ xem danh sách thành viên.", "Hệ thống trả danh sách thành viên của máy chủ.", "Trả về 200, danh sách hợp lệ.", "Đạt"],
      ["TC-SRV-03", "Chủ máy chủ tạo kênh văn bản hợp lệ.", "Kênh được tạo trong đúng máy chủ.", "Trả về 201, kênh được tạo.", "Đạt"],
      ["TC-SRV-04", "Lấy chi tiết kênh bằng mã kênh hợp lệ.", "Hệ thống trả thông tin kênh.", "Trả về 200, thông tin kênh đúng.", "Đạt"],
      ["TC-SRV-05", "Cập nhật vị trí hiển thị của kênh.", "Thứ tự kênh được cập nhật.", "Trả về 200, vị trí được lưu.", "Đạt"],
      ["TC-SRV-06", "Tạo kênh với loại kênh không hợp lệ.", "Hệ thống từ chối với lỗi kiểm tra dữ liệu.", "Trả về 400 với mã CHANNEL_TYPE_INVALID.", "Đạt"],
      ["TC-SRV-07", "Người dùng không thuộc máy chủ xem danh sách thành viên.", "Hệ thống từ chối do không phải thành viên.", "Trả về 403 với mã NOT_SERVER_MEMBER.", "Đạt"],
    ],
  },
  {
    slug: "4-12-kiem-thu-tin-nhan-realtime",
    sheet: "4.12 Tin nhan",
    title: "Kết quả kiểm thử chức năng nhắn tin và đồng bộ thời gian thực",
    rows: [
      ["Mã", "Kịch bản kiểm thử", "Kết quả mong đợi", "Kết quả thực tế", "Kết luận"],
      ["TC-MSG-01", "Hai người dùng trong cùng máy chủ kết nối WebSocket.", "Mỗi client nhận sự kiện CONNECTED.", "Hai kết nối đều mở và nhận CONNECTED.", "Đạt"],
      ["TC-MSG-02", "Người dùng thứ nhất gửi tin nhắn trong kênh.", "API tạo tin nhắn và phát sự kiện realtime.", "Trả về 201, cả hai client nhận POPUP.", "Đạt"],
      ["TC-MSG-03", "Người dùng thứ hai gửi tin nhắn trong cùng kênh.", "API tạo tin nhắn và phát sự kiện realtime.", "Trả về 201, cả hai client nhận POPUP.", "Đạt"],
      ["TC-MSG-04", "Người dùng thứ hai lấy danh sách tin nhắn của kênh.", "Hệ thống trả danh sách tin nhắn mới nhất.", "Trả về 200, dữ liệu tin nhắn được lấy.", "Đạt"],
      ["TC-MSG-05", "Người dùng thứ hai thả phản ứng vào tin nhắn.", "Phản ứng được ghi nhận cho tin nhắn.", "Trả về 200, phản ứng được thêm.", "Đạt"],
    ],
  },
  {
    slug: "4-13-tong-hop-kiem-thu",
    sheet: "4.13 Tong hop",
    title: "Tổng hợp kết quả kiểm thử",
    rows: [
      ["Nhóm chức năng", "Số test case", "Đạt", "Không đạt", "Tỉ lệ đạt"],
      ["Xác thực và hồ sơ người dùng", 5, 5, 0, "100%"],
      ["Máy chủ và kênh", 7, 7, 0, "100%"],
      ["Nhắn tin và đồng bộ thời gian thực", 5, 5, 0, "100%"],
      ["Tổng cộng", 17, 17, 0, "100%"],
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

    const widths = colCount === 5 ? [120, 430, 350, 320, 110] : [320, 150, 120, 120, 140];
    for (let col = 0; col < colCount; col += 1) {
      sheet.getRangeByIndexes(0, col, rowCount, 1).format.columnWidthPx = widths[col] || 180;
    }

    for (let row = 0; row < rowCount; row += 1) {
      const range = sheet.getRangeByIndexes(row, 0, 1, colCount);
      if (row === 0) {
        range.format.rowHeightPx = 42;
      } else if (row === 1) {
        range.format.rowHeightPx = 52;
      } else {
        range.format.rowHeightPx = colCount === 5 ? 86 : 54;
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
  await xlsx.save(path.join(outputDir, "Bang-kiem-thu.xlsx"));
  console.log(`Rendered ${tables.length} test tables.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
