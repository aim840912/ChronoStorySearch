/**
 * Markdown 檔案連結轉換腳本
 *
 * 將 chronostoryData/*.md 中的檔案引用（如 `file.json`）
 * 自動轉換成可點擊的 Markdown 連結
 *
 * 使用方式: npm run convert-md-links
 */

import * as fs from "fs";
import * as path from "path";

const CHRONOSTORY_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(__dirname, "..", "..", "data");

interface ConversionResult {
  file: string;
  converted: number;
  skipped: number;
}

/**
 * 遞迴找出目錄中所有 .md 檔案
 */
function findMarkdownFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findMarkdownFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * 檢查檔案或目錄是否存在，返回相對路徑
 */
function findFilePath(filename: string, mdFilePath: string): string | null {
  const mdDir = path.dirname(mdFilePath);
  const isDirectory = filename.endsWith("/");
  const cleanName = isDirectory ? filename.slice(0, -1) : filename;

  // 搜尋順序
  const searchPaths = [
    // 1. chronostoryData 根目錄
    path.join(CHRONOSTORY_DIR, cleanName),
    // 2. data 根目錄
    path.join(DATA_DIR, cleanName),
  ];

  for (const fullPath of searchPaths) {
    const doesExist = isDirectory
      ? fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()
      : fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();

    if (doesExist) {
      // 計算從 md 檔案到目標的相對路徑
      let relativePath = path.relative(mdDir, fullPath);
      // 確保使用 Unix 風格路徑
      relativePath = relativePath.replace(/\\/g, "/");
      // 如果是同目錄，加上 ./
      if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
        relativePath = "./" + relativePath;
      }
      // 如果是目錄，加上結尾 /
      if (isDirectory) {
        relativePath += "/";
      }
      return relativePath;
    }
  }

  return null;
}

/**
 * 判斷是否在程式碼區塊內
 */
function isInCodeBlock(content: string, position: number): boolean {
  const beforeContent = content.slice(0, position);
  const codeBlockMatches = beforeContent.match(/```/g);
  // 如果 ``` 出現奇數次，表示在程式碼區塊內
  return codeBlockMatches ? codeBlockMatches.length % 2 === 1 : false;
}

/**
 * 轉換單個 Markdown 檔案
 */
function convertMarkdownFile(filePath: string): ConversionResult {
  const content = fs.readFileSync(filePath, "utf-8");
  let newContent = content;
  let converted = 0;
  let skipped = 0;

  // 匹配 `xxx.json` 或 `xxx/` 格式（不在連結內）
  // 排除已經是連結格式的：[xxx](path)
  const pattern = /(?<!\[)`([a-zA-Z0-9_-]+(?:\.json|\/))(?!.*?\]\()`/g;

  let match;
  const replacements: Array<{ from: string; to: string; index: number }> = [];

  while ((match = pattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const filename = match[1];
    const matchIndex = match.index;

    // 跳過程式碼區塊內的內容
    if (isInCodeBlock(content, matchIndex)) {
      skipped++;
      continue;
    }

    // 查找檔案路徑
    const relativePath = findFilePath(filename, filePath);

    if (relativePath) {
      const linkText = `[${filename}](${relativePath})`;
      replacements.push({
        from: fullMatch,
        to: linkText,
        index: matchIndex,
      });
      converted++;
    } else {
      skipped++;
    }
  }

  // 從後往前替換，避免位置偏移
  replacements.sort((a, b) => b.index - a.index);
  for (const { from, to, index } of replacements) {
    newContent =
      newContent.slice(0, index) + to + newContent.slice(index + from.length);
  }

  // 寫回檔案（只有在有變更時）
  if (converted > 0) {
    fs.writeFileSync(filePath, newContent, "utf-8");
  }

  return {
    file: path.relative(process.cwd(), filePath),
    converted,
    skipped,
  };
}

/**
 * 主函數
 */
function main() {
  console.log("🔗 Markdown 檔案連結轉換工具\n");

  // 找出所有 chronostoryData/*.md 檔案
  const mdFiles = findMarkdownFiles(CHRONOSTORY_DIR);

  if (mdFiles.length === 0) {
    console.log("找不到任何 Markdown 檔案");
    return;
  }

  console.log(`找到 ${mdFiles.length} 個 Markdown 檔案\n`);

  let totalConverted = 0;
  let totalSkipped = 0;

  for (const file of mdFiles) {
    const result = convertMarkdownFile(file);
    totalConverted += result.converted;
    totalSkipped += result.skipped;

    if (result.converted > 0) {
      console.log(`✅ ${result.file}: 轉換 ${result.converted} 個連結`);
    } else if (result.skipped > 0) {
      console.log(
        `⏭️  ${result.file}: 跳過 ${result.skipped} 個（檔案不存在或在程式碼區塊內）`
      );
    }
  }

  console.log("\n📊 總結:");
  console.log(`   轉換: ${totalConverted} 個連結`);
  console.log(`   跳過: ${totalSkipped} 個`);
}

main();
