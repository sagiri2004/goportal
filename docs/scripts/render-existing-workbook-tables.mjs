import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { FileBlob, SpreadsheetFile } = require("@oai/artifact-tool");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const datnRoot = path.join(repoRoot, "datn");
const imageDir = path.join(datnRoot, "Hinhve", "Bangbieu");

const workbooks = [
  {
    file: path.join(datnRoot, "Bangbieu", "Bang-bieu-do-an.xlsx"),
    tables: [
      ["Viet tat", "A1:C13", "danh-muc-viet-tat.png"],
      ["Thuat ngu", "A1:B10", "danh-muc-thuat-ngu.png"],
      ["4.1 Tournament", "A1:B17", "4-1-thiet-ke-lop-tournament.png"],
      ["4.2 Dialog", "A1:B10", "4-2-thiet-ke-lop-tournament-dialog.png"],
      ["4.3 Service", "A1:B11", "4-3-thiet-ke-lop-tournament-service.png"],
      ["4.4 Repository", "A1:B8", "4-4-thiet-ke-lop-tournament-repository.png"],
      ["4.5 Cum du lieu", "A1:C5", "4-5-tong-hop-cum-du-lieu.png"],
      ["4.6 Cong cu", "A1:D16", "4-6-danh-sach-cong-cu-thu-vien.png"],
      ["4.7 San pham", "A1:D7", "4-7-san-pham-dong-goi.png"],
      ["4.8 Ma nguon", "A1:C12", "4-8-thong-ke-ma-nguon.png"],
      ["4.9 Thu muc", "A1:D8", "4-9-thong-ke-thu-muc.png"],
      ["PL Usecase", "A1:D7", "phu-luc-danh-sach-usecase.png"],
      ["PL Truong du lieu", "A1:D13", "phu-luc-truong-du-lieu-usecase.png"],
    ],
  },
  {
    file: path.join(datnRoot, "Bangbieu", "Bang-kiem-thu.xlsx"),
    tables: [
      ["4.10 Xac thuc", "A1:E7", "4-10-kiem-thu-xac-thuc-ho-so.png"],
      ["4.11 Server kenh", "A1:E9", "4-11-kiem-thu-may-chu-kenh.png"],
      ["4.12 Tin nhan", "A1:E7", "4-12-kiem-thu-tin-nhan-realtime.png"],
      ["4.13 Tong hop", "A1:E6", "4-13-tong-hop-kiem-thu.png"],
    ],
  },
  {
    file: path.join(datnRoot, "Bangbieu", "Bang-trien-khai.xlsx"),
    tables: [
      ["4.14 Cau hinh", "A1:C9", "4-14-cau-hinh-moi-truong-trien-khai.png"],
      ["4.15 Container", "A1:D8", "4-15-danh-sach-container-trien-khai.png"],
      ["4.16 JMeter", "A1:D8", "4-16-kich-ban-jmeter.png"],
      ["4.17 Ket qua", "A1:D11", "4-17-ket-qua-mo-phong-jmeter-livekit.png"],
    ],
  },
];

async function savePng(blob, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const arrayBuffer = await blob.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

async function main() {
  let count = 0;
  for (const workbookInfo of workbooks) {
    const input = await FileBlob.load(workbookInfo.file);
    const workbook = await SpreadsheetFile.importXlsx(input);

    for (const [sheetName, range, imageName] of workbookInfo.tables) {
      const preview = await workbook.render({
        sheetName,
        range,
        headers: false,
        scale: 2,
        format: "png",
      });
      await savePng(preview, path.join(imageDir, imageName));
      count += 1;
      console.log(`Rendered ${imageName}`);
    }
  }
  console.log(`Rendered ${count} table images from existing workbooks.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
