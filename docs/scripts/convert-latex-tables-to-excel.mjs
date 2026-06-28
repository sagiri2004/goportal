import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SpreadsheetFile, Workbook } = require("@oai/artifact-tool");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const datnRoot = path.join(repoRoot, "datn");
const excelDir = path.join(datnRoot, "Bangbieu");
const imageDir = path.join(datnRoot, "Hinhve", "Bangbieu");

const targets = [
  {
    file: "datn/Chuong/0_5_Danh_muc_viet_tat.tex",
    kind: "static",
    slug: "danh-muc-viet-tat",
    sheet: "Viet tat",
    caption: "Danh mục từ viết tắt",
    floating: false,
    rows: [
      ["Từ viết tắt", "Tên đầy đủ", "Ý nghĩa"],
      ["API", "Application Programming Interface", "Giao diện lập trình ứng dụng"],
      ["REST", "Representational State Transfer", "Kiểu kiến trúc truyền trạng thái đại diện"],
      ["SDK", "Software Development Kit", "Bộ công cụ phát triển phần mềm"],
      ["RBAC", "Role-Based Access Control", "Kiểm soát truy cập dựa trên vai trò"],
      ["JWT", "JSON Web Token", "Chuẩn token dùng để truyền thông tin xác thực dạng JSON"],
      ["WebSocket", "WebSocket", "Giao thức giao tiếp hai chiều giữa máy khách và máy chủ"],
      ["WebRTC", "Web Real-Time Communication", "Công nghệ giao tiếp âm thanh, hình ảnh và dữ liệu thời gian thực trên trình duyệt"],
      ["HTML", "HyperText Markup Language", "Ngôn ngữ đánh dấu siêu văn bản"],
      ["CSS", "Cascading Style Sheets", "Ngôn ngữ định kiểu giao diện web"],
      ["SQL", "Structured Query Language", "Ngôn ngữ truy vấn có cấu trúc"],
      ["ORM", "Object-Relational Mapping", "Kỹ thuật ánh xạ đối tượng với bảng trong cơ sở dữ liệu quan hệ"],
    ],
  },
  {
    file: "datn/Chuong/0_6_Thuat_ngu.tex",
    kind: "static",
    slug: "danh-muc-thuat-ngu",
    sheet: "Thuat ngu",
    caption: "Danh mục thuật ngữ",
    floating: false,
    rows: [
      ["Thuật ngữ", "Diễn giải"],
      ["Máy chủ", "Không gian cộng đồng nơi người dùng tham gia, trao đổi, chơi game và tổ chức giải đấu."],
      ["Kênh", "Không gian con trong máy chủ, có thể dùng cho nhắn tin, thoại, livestream hoặc workspace trận đấu."],
      ["Vai trò", "Nhóm quyền được gán cho thành viên trong máy chủ hoặc trong phạm vi giải đấu."],
      ["Game marketplace", "Khu vực cho phép duyệt, chơi, đánh giá và đăng tải game cộng đồng."],
      ["Game SDK", "Bộ công cụ giúp game nhúng trong iframe giao tiếp với nền tảng qua host app."],
      ["Bracket", "Sơ đồ thi đấu biểu diễn các cặp đấu, vòng đấu và nhánh thắng/thua của giải đấu."],
      ["Match workspace", "Nhóm kênh riêng được tạo cho một trận đấu để phục vụ đội chơi, trọng tài, caster và khán giả."],
      ["Observer token", "Token truy cập hạn chế dùng cho vai trò quan sát, caster hoặc spectator trong một số luồng realtime/media."],
    ],
  },
  {
    file: "docs/chapter4-phan-tich-thiet-ke-trien-khai-danh-gia.tex",
    outputFile: "datn/Chuong/4_Ket_qua_thuc_nghiem.tex",
    kind: "table",
  },
  {
    file: "docs/chapter5-cac-giai-phap-va-dong-gop-noi-bat.tex",
    outputFile: "datn/Chuong/5_Giai_phap_dong_gop.tex",
    kind: "table",
  },
  {
    file: "datn/Chuong/Phu_luc_A.tex",
    kind: "static",
    slug: "phu-luc-danh-sach-usecase",
    sheet: "PL Usecase",
    caption: "Danh sách use case đặc tả tiêu biểu",
    label: "tab:appendix-usecase-list",
    rows: [
      ["Mã use case", "Tên use case", "Nhóm nghiệp vụ", "Lý do lựa chọn"],
      ["UC001", "Tham gia máy chủ", "Cộng đồng máy chủ", "Đại diện cho luồng gia nhập cộng đồng, gán vai trò và xét duyệt thành viên."],
      ["UC002", "Quản lý kênh và phân quyền", "Cộng đồng máy chủ", "Thể hiện rõ mô hình RBAC, kênh riêng tư và quyền ghi đè theo vai trò/người dùng."],
      ["UC003", "Đăng tải và kiểm duyệt game", "Game marketplace", "Đại diện cho luồng nhà phát triển tạo game, upload build và đưa game lên chợ game."],
      ["UC004", "Tổ chức giải đấu", "Giải đấu", "Bao quát vòng đời tạo giải, mở đăng ký, check-in, sinh bracket và quản lý đội."],
      ["UC005", "Vận hành trận đấu và xử lý kết quả", "Giải đấu", "Đại diện cho luồng workspace trận, báo cáo kết quả, khiếu nại và xác minh kết quả."],
    ],
  },
  {
    file: "datn/Chuong/Phu_luc_A.tex",
    kind: "static",
    slug: "phu-luc-truong-du-lieu-usecase",
    sheet: "PL Truong du lieu",
    caption: "Các trường dữ liệu tham khảo trong đặc tả use case",
    label: "tab:appendix-usecase-fields",
    rows: [
      ["Use case", "Trường dữ liệu", "Mô tả", "Điều kiện hợp lệ"],
      ["UC001", "server_id", "Định danh máy chủ người dùng muốn tham gia", "Máy chủ tồn tại và người dùng chưa là thành viên"],
      ["UC001", "note", "Ghi chú trong yêu cầu tham gia", "Có thể rỗng, được chuẩn hóa trước khi lưu"],
      ["UC002", "name", "Tên kênh", "Không rỗng, độ dài nằm trong giới hạn hệ thống"],
      ["UC002", "type", "Loại kênh", "Thuộc nhóm văn bản, thoại, danh mục hoặc livestream"],
      ["UC002", "allow_bits, deny_bits", "Bit quyền cho phép hoặc từ chối", "Là giá trị bitset hợp lệ của hệ thống phân quyền"],
      ["UC003", "slug", "Định danh thân thiện URL của game", "Duy nhất và được chuẩn hóa dạng kebab-case"],
      ["UC003", "file", "File build game", "Là file zip hợp lệ và chứa index.html"],
      ["UC004", "format", "Thể thức giải đấu", "Thuộc danh sách thể thức hệ thống hỗ trợ"],
      ["UC004", "participant_type", "Loại tham gia", "Cá nhân hoặc đội"],
      ["UC005", "winner_id", "Người chơi hoặc đội thắng trận", "Phải thuộc danh sách participant của trận đấu"],
      ["UC005", "score1, score2", "Điểm số hai bên", "Là số nguyên không âm"],
    ],
  },
];

const manualSlugs = new Map([
  ["tab:4-1-thiet-ke-lop-tournament", "4-1-thiet-ke-lop-tournament"],
  ["tab:4-2-thiet-ke-lop-tournament-dialog", "4-2-thiet-ke-lop-tournament-dialog"],
  ["tab:4-3-thiet-ke-lop-tournament-service", "4-3-thiet-ke-lop-tournament-service"],
  ["tab:4-4-thiet-ke-lop-tournament-repository", "4-4-thiet-ke-lop-tournament-repository"],
  ["tab:4-5-tong-hop-cum-du-lieu", "4-5-tong-hop-cum-du-lieu"],
  ["tab:4-6-danh-sach-cong-cu-thu-vien", "4-6-danh-sach-cong-cu-thu-vien"],
  ["tab:4-7-san-pham-dong-goi", "4-7-san-pham-dong-goi"],
  ["tab:4-8-thong-ke-ma-nguon", "4-8-thong-ke-ma-nguon"],
  ["tab:4-9-thong-ke-thu-muc", "4-9-thong-ke-thu-muc"],
  ["tab:5-1-tong-hop-dong-gop", "5-1-tong-hop-dong-gop"],
  ["tab:appendix-usecase-list", "phu-luc-danh-sach-usecase"],
  ["tab:appendix-usecase-fields", "phu-luc-truong-du-lieu-usecase"],
]);

const manualSheets = new Map([
  ["tab:4-1-thiet-ke-lop-tournament", "4.1 Tournament"],
  ["tab:4-2-thiet-ke-lop-tournament-dialog", "4.2 Dialog"],
  ["tab:4-3-thiet-ke-lop-tournament-service", "4.3 Service"],
  ["tab:4-4-thiet-ke-lop-tournament-repository", "4.4 Repository"],
  ["tab:4-5-tong-hop-cum-du-lieu", "4.5 Cum du lieu"],
  ["tab:4-6-danh-sach-cong-cu-thu-vien", "4.6 Cong cu"],
  ["tab:4-7-san-pham-dong-goi", "4.7 San pham"],
  ["tab:4-8-thong-ke-ma-nguon", "4.8 Ma nguon"],
  ["tab:4-9-thong-ke-thu-muc", "4.9 Thu muc"],
  ["tab:5-1-tong-hop-dong-gop", "5.1 Dong gop"],
  ["tab:appendix-usecase-list", "PL Usecase"],
  ["tab:appendix-usecase-fields", "PL Truong du lieu"],
]);

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function normalizeSheetName(value, usedNames) {
  let base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
  if (!base) base = "Bang";

  let name = base;
  let index = 2;
  while (usedNames.has(name)) {
    const suffix = ` ${index}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  usedNames.add(name);
  return name;
}

function extractCommand(block, command) {
  const index = block.indexOf(`\\${command}{`);
  if (index < 0) return "";
  let cursor = index + command.length + 2;
  let depth = 1;
  let result = "";
  while (cursor < block.length && depth > 0) {
    const char = block[cursor];
    if (char === "\\" && cursor + 1 < block.length) {
      result += char + block[cursor + 1];
      cursor += 2;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth > 0) result += char;
    cursor += 1;
  }
  return cleanLatex(result);
}

function splitTopLevel(input, separator) {
  const parts = [];
  let current = "";
  let depth = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "\\") {
      if (separator === "\\\\" && next === "\\" && depth === 0) {
        parts.push(current);
        current = "";
        index += 1;
        continue;
      }
      current += char;
      if (next) {
        current += next;
        index += 1;
      }
      continue;
    }

    if (char === "{" || char === "[") depth += 1;
    if ((char === "}" || char === "]") && depth > 0) depth -= 1;

    if (separator === "&" && char === "&" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current);
  return parts;
}

function replaceLatexCommands(value) {
  let next = value;
  const commands = [
    "textbf",
    "textit",
    "texttt",
    "emph",
    "url",
    "href",
    "gls",
    "Gls",
    "ref",
    "cite",
    "makecell",
  ];

  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (const command of commands) {
      const regex = new RegExp(`\\\\${command}(?:\\[[^\\]]*\\])?\\{([^{}]*)\\}`, "g");
      next = next.replace(regex, (_, content) => {
        changed = true;
        return content;
      });
    }
    if (!changed) break;
  }

  next = next.replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, "$2 ($1)");
  return next;
}

function cleanLatex(value) {
  return replaceLatexCommands(value)
    .replace(/%.*$/gm, "")
    .replace(/\\newline/g, "\n")
    .replace(/\\\\/g, "\n")
    .replace(/\\&/g, "&")
    .replace(/\\_/g, "_")
    .replace(/\\%/g, "%")
    .replace(/\\#/g, "#")
    .replace(/\\\$/g, "$")
    .replace(/~\/?/g, " ")
    .replace(/[{}]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function parseRows(rawBody) {
  const body = rawBody
    .replace(/\\toprule|\\midrule|\\bottomrule|\\hline/g, "")
    .replace(/\\endfirsthead|\\endhead|\\endfoot|\\endlastfoot/g, "")
    .replace(/\\caption\{[\s\S]*?\}/g, "")
    .replace(/\\label\{[^}]*\}/g, "")
    .replace(/\\centering|\\small|\\footnotesize|\\scriptsize/g, "")
    .replace(/\\renewcommand\{\\arraystretch\}\{[^}]*\}/g, "")
    .replace(/\\rowcolor\{[^}]*\}/g, "");

  const rows = splitTopLevel(body, "\\\\")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => splitTopLevel(row, "&").map(cleanLatex));

  const colCount = Math.max(...rows.map((row) => row.length), 1);
  return rows
    .map((row) => row.concat(Array(Math.max(0, colCount - row.length)).fill("")))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function skipBalancedGroup(text, start) {
  if (text[start] !== "{") return start;
  let depth = 0;
  let cursor = start;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === "\\" && cursor + 1 < text.length) {
      cursor += 2;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
    if (depth === 0) return cursor;
  }
  return cursor;
}

function extractEnvironmentBody(block, environment) {
  const begin = `\\begin{${environment}}`;
  const beginIndex = block.indexOf(begin);
  const endIndex = block.lastIndexOf(`\\end{${environment}}`);
  if (beginIndex < 0 || endIndex < 0 || endIndex <= beginIndex) return "";

  let cursor = beginIndex + begin.length;
  while (/\s/.test(block[cursor] || "")) cursor += 1;
  if (block[cursor] === "[") {
    while (cursor < block.length && block[cursor] !== "]") cursor += 1;
    cursor += 1;
  }
  while (/\s/.test(block[cursor] || "")) cursor += 1;
  if (block[cursor] === "{") cursor = skipBalancedGroup(block, cursor);

  return block.slice(cursor, endIndex);
}

function tableBody(block, kind) {
  if (kind === "table") {
    return extractEnvironmentBody(block, "tabular");
  }

  return extractEnvironmentBody(block, "longtable");
}

function collectTables(fileText, target) {
  if (target.kind === "static") {
    return [
      {
        file: target.file,
        outputFile: target.outputFile,
        kind: target.kind,
        block: "",
        caption: target.caption,
        label: target.label || "",
        slug: target.slug,
        sheet: target.sheet,
        rows: target.rows,
        floating: target.floating ?? true,
      },
    ];
  }

  const tables = [];
  const regex =
    target.kind === "table"
      ? /\\begin\{table\}(?:\[[^\]]*\])?[\s\S]*?\\end\{table\}/g
      : /\\begin\{longtable\}\{[^}]*\}[\s\S]*?\\end\{longtable\}/g;

  let match;
  while ((match = regex.exec(fileText)) !== null) {
    const block = match[0];
    const caption = target.caption || extractCommand(block, "caption") || "Bảng biểu";
    const label = extractCommand(block, "label");
    const slug = target.slug || manualSlugs.get(label) || slugify(label || caption);
    const sheet = target.sheet || manualSheets.get(label) || caption;
    const rows = parseRows(tableBody(block, target.kind));
    if (!rows.length) continue;

    tables.push({
      file: target.file,
      outputFile: target.outputFile,
      kind: target.kind,
      block,
      caption,
      label,
      slug,
      sheet,
      rows,
      floating: target.floating ?? true,
    });
  }

  return tables;
}

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

function latexImageBlock(table) {
  const imagePath = `Hinhve/Bangbieu/${table.slug}.png`;
  if (!table.floating) {
    return [
      "\\begin{center}",
      `    \\includegraphics[width=\\textwidth,height=0.82\\textheight,keepaspectratio]{${imagePath}}`,
      "\\end{center}",
    ].join("\n");
  }

  return [
    "\\begin{table}[H]",
    "    \\centering",
    `    \\includegraphics[width=\\textwidth,height=0.82\\textheight,keepaspectratio]{${imagePath}}`,
    `    \\caption{${table.caption}}`,
    table.label ? `    \\label{${table.label}}` : "",
    "\\end{table}",
  ]
    .filter(Boolean)
    .join("\n");
}

async function buildWorkbook(tables) {
  const workbook = Workbook.create();
  const usedSheetNames = new Set();

  for (const table of tables) {
    const sheetName = normalizeSheetName(table.sheet, usedSheetNames);
    table.sheetName = sheetName;
    const sheet = workbook.worksheets.add(sheetName);
    sheet.showGridLines = false;

    const rowCount = table.rows.length + 1;
    const colCount = table.rows[0].length;
    const endColumn = excelColumnName(colCount - 1);
    table.renderRange = `A1:${endColumn}${rowCount}`;

    const titleRange = sheet.getRange(`A1:${endColumn}1`);
    titleRange.merge();
    titleRange.values = [[table.caption]];
    titleRange.format = {
      fill: "#1F4E79",
      font: { bold: true, color: "#FFFFFF", size: 13 },
      horizontalAlignment: "center",
      verticalAlignment: "center",
      wrapText: true,
    };
    titleRange.format.rowHeightPx = 34;

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

    const firstCol = sheet.getRangeByIndexes(1, 0, table.rows.length, 1);
    firstCol.format = {
      fill: "#EAF3F8",
      font: { bold: false, color: "#111827", size: 10 },
      wrapText: true,
      verticalAlignment: "top",
      borders: { preset: "all", style: "thin", color: "#9CA3AF" },
    };
    headerRange.format.fill = "#C65D00";
    headerRange.format.font = { bold: true, color: "#FFFFFF", size: 10 };

    const widths = colCount <= 2 ? [180, 560] : colCount === 3 ? [120, 220, 520] : [90, 170, 220, 520, 180, 180];
    for (let col = 0; col < colCount; col += 1) {
      const columnRange = sheet.getRangeByIndexes(0, col, rowCount, 1);
      columnRange.format.columnWidthPx = widths[col] || 180;
    }

    for (let row = 0; row < rowCount; row += 1) {
      const range = sheet.getRangeByIndexes(row, 0, 1, colCount);
      if (row === 0) {
        range.format.rowHeightPx = 42;
      } else if (row === 1) {
        range.format.rowHeightPx = 52;
      } else {
        const maxLength = Math.max(...table.rows[row - 2].map((cell) => String(cell).length));
        const baseHeight = colCount >= 4 ? 70 : colCount === 3 ? 58 : 52;
        range.format.rowHeightPx = Math.min(124, Math.max(baseHeight, 32 + Math.ceil(maxLength / 42) * 16));
      }
    }

    sheet.freezePanes.freezeRows(2);
  }

  return workbook;
}

async function savePng(blob, filename) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filename, bytes);
}

async function main() {
  await fs.mkdir(excelDir, { recursive: true });
  await fs.mkdir(imageDir, { recursive: true });

  const fileCache = new Map();
  const tables = [];

  for (const target of targets) {
    const absolute = path.join(repoRoot, target.file);
    const text = target.kind === "static" ? "" : await fs.readFile(absolute, "utf8");
    fileCache.set(target.file, text);
    tables.push(...collectTables(text, target));
  }

  const workbook = await buildWorkbook(tables);

  for (const table of tables) {
    const imagePath = path.join(imageDir, `${table.slug}.png`);
    const preview = await workbook.render({
      sheetName: table.sheetName,
      range: table.renderRange,
      headers: false,
      scale: 2,
      format: "png",
    });
    await savePng(preview, imagePath);
  }

  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(path.join(excelDir, "Bang-bieu-do-an.xlsx"));

  const outputFiles = new Map();
  for (const table of tables) {
    if (!table.block) continue;
    const outputFile = table.outputFile || table.file;
    if (!outputFiles.has(outputFile)) {
      outputFiles.set(outputFile, await fs.readFile(path.join(repoRoot, outputFile), "utf8"));
    }
  }

  for (const [file, original] of outputFiles.entries()) {
    let next = original;
    for (const table of tables.filter((item) => (item.outputFile || item.file) === file && item.block)) {
      next = next.replace(table.block, latexImageBlock(table));
      next = next.replace(
        new RegExp(
          String.raw`\\begin\{table\}(?:\[[^\]]*\])?\s*\\centering\s*\\includegraphics\[[^\]]*\]\{Hinhve/Bangbieu/${table.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\.png\}\s*\\caption\{[\s\S]*?\}\s*\\label\{${(table.label || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\}\s*\\end\{table\}`,
          "m",
        ),
        latexImageBlock(table),
      );
    }
    if (next !== original) {
      await fs.writeFile(path.join(repoRoot, file), next, "utf8");
    }
  }

  await fs.writeFile(
    path.join(excelDir, "Bang-bieu-do-an.manifest.json"),
    JSON.stringify(
      tables.map((table) => ({
        file: table.file,
        sheet: table.sheetName,
        caption: table.caption,
        label: table.label,
        image: `Hinhve/Bangbieu/${table.slug}.png`,
      })),
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Converted ${tables.length} LaTeX tables.`);
  console.log(path.join(excelDir, "Bang-bieu-do-an.xlsx"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
