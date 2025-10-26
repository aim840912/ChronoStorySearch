# Claude Code 魔法關鍵字完整參考

本文檔詳細說明 Claude Code 中所有的魔法關鍵字（Magic Keywords）、特殊符號和快捷鍵。

## 📑 目錄

- [思考級別關鍵字](#思考級別關鍵字)
- [工作流程提示關鍵字](#工作流程提示關鍵字)
- [特殊符號前綴](#特殊符號前綴)
- [快捷鍵](#快捷鍵)
- [內建 Slash 指令](#內建-slash-指令)
- [魔法檔案](#魔法檔案)
- [CLI 魔法旗標](#cli-魔法旗標)

## 🧠 思考級別關鍵字

這些關鍵字會在 CLI 中**顯示為彩色**，觸發不同強度的推理模式。

### 基本思考（4,000 tokens）

```bash
# 單一關鍵字
> think 如何優化這個資料庫查詢

# 在句子中使用
> 請 think 一下這個架構的優缺點
```

**適用場景**：
- ✅ 常規問題解決
- ✅ 基礎邏輯推理
- ✅ 簡單的程式碼優化
- ✅ 一般性的建議

**Token 預算**：4,000 tokens

**效果**：啟用基礎的延伸思考，Claude 會更仔細地評估選項

---

### 中度思考（~10,000 tokens）

```bash
# 變體 1
> think hard 如何重構這個複雜的狀態管理邏輯

# 變體 2
> think harder 評估這三種資料庫方案的優劣

# 變體 3
> megathink 設計一個可擴展的通知系統
```

**適用場景**：
- ✅ 複雜的邏輯推理
- ✅ 多方案評估
- ✅ 中等難度的架構決策
- ✅ 性能優化策略

**Token 預算**：~10,000 tokens

**觸發關鍵字**：
- `think hard`
- `think harder`
- `megathink`

---

### 最大思考（31,999 tokens）

```bash
# 主要關鍵字
> ultrathink 設計一個高可用的分散式交易系統

# 其他變體
> think intensely 評估微服務 vs 單體架構
> think really hard 解決這個複雜的並發問題
> think super hard 優化整個系統的效能
> think very hard 設計資料庫 sharding 策略
> think longer 分析這個 legacy 系統的重構方案
> deep think 規劃這個大型功能的實作步驟
```

**適用場景**：
- ✅ 系統架構設計
- ✅ 重大技術決策
- ✅ 複雜效能優化
- ✅ 大型重構規劃
- ✅ 棘手 bug 深度分析
- ✅ 陌生且複雜的程式碼庫分析

**Token 預算**：31,999 tokens（最大值）

**觸發關鍵字**：
- `ultrathink` ⭐ 主要關鍵字
- `think intensely`
- `think longer`
- `think really hard`
- `think super hard`
- `think very hard`
- `deep think`

**重要提醒**：
- ⚠️ 消耗大量 tokens，請謹慎使用
- ⚠️ 保留給真正複雜的任務
- ⚠️ 簡單任務使用會浪費預算

---

### 思考級別比較表

| 關鍵字 | Token 預算 | 成本 | 適用複雜度 | 回應時間 |
|--------|-----------|------|-----------|---------|
| `think` | 4,000 | 低 | 簡單-中等 | 快 |
| `think hard` / `megathink` | 10,000 | 中 | 中等-複雜 | 中等 |
| `ultrathink` | 31,999 | 高 | 非常複雜 | 較慢 |

---

## 🔄 工作流程提示關鍵字

這些關鍵字引導 Claude 採用特定的工作流程模式。

### research

觸發深度研究模式，Claude 會進行**至少 5 次工具調用**。

```bash
> research 這個專案的認證實作模式

> research 現有的快取策略，然後提出改進建議
```

**效果**：
- 🔍 系統性搜尋程式碼庫
- 🔍 多角度分析問題
- 🔍 至少 5 次工具調用
- 🔍 提供詳細的發現報告

---

### deep dive

類似 `research`，但更強調**深度探索**。

```bash
> deep dive 分析這個 legacy 系統的資料流

> deep dive 探索效能瓶頸的根本原因
```

**效果**：
- 📊 至少 5 次工具調用
- 📊 深入的程式碼分析
- 📊 架構圖和資料流梳理
- 📊 識別模式和問題

---

### plan

觸發規劃模式，先制定計劃再執行。

```bash
> plan 實作即時聊天功能

> plan 如何重構這個模組以提高可測試性
```

**效果**：
- 📝 先規劃後執行
- 📝 分解任務步驟
- 📝 識別潛在風險
- 📝 提供實作路線圖

---

### explore

系統性地探索程式碼庫。

```bash
> explore 這個專案的架構結構

> explore 錯誤處理的實作模式
```

**效果**：
- 🗺️ 系統性搜尋
- 🗺️ 識別模式和慣例
- 🗺️ 繪製架構圖
- 🗺️ 提供概覽報告

---

### 組合使用範例

```bash
# 研究 + 深度思考
> research 現有的 API 實作，然後 ultrathink 最佳的重構方案

# 探索 + 規劃
> explore 認證系統的架構，然後 plan 如何增加 OAuth 支援

# 深度探索 + 高強度思考
> deep dive 效能問題，然後 think hard 提出優化策略
```

---

## 🔣 特殊符號前綴

在互動模式中，這些符號有特殊意義。

### `/` - Slash 指令

執行內建或自訂的 slash 指令。

```bash
> /help          # 顯示幫助
> /cost          # 查看 token 使用
> /clear         # 清除對話歷史

# 自訂指令（專案特定）
> /ultraplan 實作交易系統
> /deepdive 分析效能問題
> /safereview src/app/api/**/*.ts
```

**完整指令清單**：見 [內建 Slash 指令](#內建-slash-指令) 章節

---

### `!` - 直接執行 Bash

直接執行 shell 指令，不經過 Claude 處理。

```bash
> !ls -la
> !git status
> !npm run test

# 快速檢查
> !grep -r "TODO" src/
```

**優點**：
- ⚡ 即時執行
- ⚡ 不消耗 Claude tokens
- ⚡ 適合快速查詢

**注意**：
- ⚠️ 不會有 Claude 的解釋或建議
- ⚠️ 需要確保指令安全

---

### `#` - 新增到記憶檔案

將內容新增到 `CLAUDE.md` 記憶檔案。

```bash
# 新增專案規則
> #所有 API 必須使用 withAuthAndError 中間件

# 新增技術約束
> #資料庫查詢必須使用 Supabase Row Level Security

# 新增程式碼風格
> #禁止使用漸層和 emoji，改用 SVG 圖示
```

**效果**：
- 💾 永久儲存在 CLAUDE.md
- 💾 所有後續對話都會遵循
- 💾 可以提交到 git 與團隊共享

---

## ⌨️ 快捷鍵

### 模式切換

| 快捷鍵 | 功能 | 說明 |
|--------|------|------|
| `Shift+Tab` | 循環切換模式 | Plan Mode ↔ Edit Mode ↔ Auto-accept Mode |
| `Tab` | 切換 Thinking | 開啟/關閉 Extended Thinking |
| `Escape` | 中斷 Claude | 停止當前操作 |
| `Double Escape` | 歷史回溯 | 跳回歷史、編輯提示 |

**Plan Mode 說明**：
- 📖 唯讀模式，不會修改任何檔案
- 📖 適合規劃、審查、探索
- 📖 節省成本（避免昂貴的執行階段）
- 📖 再次按 `Shift+Tab` 退出

**Extended Thinking 說明**：
- 🧠 按 `Tab` 永久啟用
- 🧠 或使用魔法關鍵字臨時啟用
- 🧠 顯示為斜體灰色文字

---

### 輸入控制

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+C` | 取消當前輸入 |
| `Ctrl+D` | 退出 Claude Code 會話 |
| `Ctrl+L` | 清除螢幕 |
| `Ctrl+R` | 反向搜尋指令歷史 |
| `Ctrl+B` | 在背景執行指令 |

**背景執行範例**（`Ctrl+B`）：

```bash
# 啟動開發伺服器
> !npm run dev
# 按 Ctrl+B 讓它在背景執行

# 繼續其他工作
> 新增一個 API 路由

# 開發伺服器仍在背景運行
```

---

### 多行輸入

| 快捷鍵 | 平台 | 功能 |
|--------|------|------|
| `\` + `Enter` | 所有 | 換行（繼續輸入）|
| `Option+Enter` | macOS | 換行 |
| `Shift+Enter` | 所有 | 換行（需先執行 `/terminal-setup`）|

**範例**：

```bash
> 請幫我建立一個新的 API 路由： \
  - GET /api/items \
  - 使用 withAuthAndError 中間件 \
  - 返回分頁資料
```

---

### Vim 模式

啟用 Vim 風格的編輯（高級用戶）。

```bash
> /vim    # 啟用 Vim 模式

# 然後可以使用 Vim 指令
# h/j/k/l - 移動
# x - 刪除字符
# dd - 刪除行
# i - 插入模式
# Esc - 回到 Normal 模式
```

---

## 📁 內建 Slash 指令

### 常用指令

| 指令 | 功能 | 範例 |
|------|------|------|
| `/help` | 顯示幫助資訊 | `/help` |
| `/clear` | 清除對話歷史 | `/clear` |
| `/cost` | 顯示 token 使用統計 | `/cost` |
| `/status` | 顯示版本和連線狀態 | `/status` |
| `/usage` | 顯示使用限制和速率 | `/usage` |

---

### 專案管理

| 指令 | 功能 | 範例 |
|------|------|------|
| `/init` | 初始化專案（建立 CLAUDE.md）| `/init` |
| `/memory` | 編輯 CLAUDE.md 記憶檔案 | `/memory` |
| `/add-dir` | 新增額外工作目錄 | `/add-dir /path/to/dir` |
| `/config` | 開啟設定介面 | `/config` |
| `/permissions` | 查看/更新權限設定 | `/permissions` |

---

### 程式碼協作

| 指令 | 功能 | 範例 |
|------|------|------|
| `/review` | 請求程式碼審查 | `/review` |
| `/pr_comments` | 查看 PR 評論 | `/pr_comments` |
| `/rewind` | 回溯對話/程式碼狀態 | `/rewind` |

---

### 進階功能

| 指令 | 功能 | 範例 |
|------|------|------|
| `/model` | 選擇或更改 AI 模型 | `/model` |
| `/agents` | 管理自訂 AI 子代理 | `/agents` |
| `/mcp` | 管理 MCP 伺服器連線 | `/mcp` |
| `/sandbox` | 啟用沙盒化的 bash 執行 | `/sandbox` |
| `/compact` | 壓縮對話歷史 | `/compact` |

---

### 終端設定

| 指令 | 功能 | 範例 |
|------|------|------|
| `/vim` | 進入 Vim 模式 | `/vim` |
| `/terminal-setup` | 安裝按鍵綁定 | `/terminal-setup` |

---

### 系統維護

| 指令 | 功能 | 範例 |
|------|------|------|
| `/doctor` | 檢查安裝健康狀態 | `/doctor` |
| `/bug` | 向 Anthropic 回報錯誤 | `/bug` |
| `/login` | 登入帳戶 | `/login` |
| `/logout` | 登出帳戶 | `/logout` |

---

### 專案自訂指令

本專案提供的自訂指令（在 `.claude/commands/`）：

| 指令 | 功能 | Token 預算 |
|------|------|-----------|
| `/ultraplan` | Plan Mode + Ultrathink 組合規劃 | 31,999 |
| `/deepdive` | 深度探索程式碼庫 | 依需求 |
| `/safereview` | 安全程式碼審查（唯讀）| 依需求 |
| `/archdesign` | 系統架構設計 | 31,999 |

詳見：[自訂指令使用指南](./custom-commands-guide.md)

---

## 📄 魔法檔案

這些檔案會被 Claude Code 自動識別和載入。

### CLAUDE.md

**位置**：專案根目錄
**作用**：專案規則和上下文
**範圍**：當前專案
**可提交 git**：✅ 是（團隊共享）

```markdown
# 範例內容

## 專案規則

- 所有 API 必須使用 withAuthAndError 中間件
- 禁止使用漸層和 emoji
- 使用 apiLogger/dbLogger 而不是 console.log

## 技術堆疊

- Next.js 15 + TypeScript
- Supabase (PostgreSQL)
- Redis (Upstash)
```

**如何新增**：
```bash
# 方法 1：使用 # 前綴
> #新增規則到記憶

# 方法 2：編輯指令
> /memory

# 方法 3：初始化
> /init
```

---

### CLAUDE.local.md

**位置**：專案根目錄
**作用**：本機專案指示（私密）
**範圍**：當前專案
**可提交 git**：❌ 否（加入 .gitignore）

**用途**：
- 🔒 個人工作偏好
- 🔒 本機環境配置
- 🔒 私密的開發筆記

```markdown
# 範例內容

## 個人偏好

- 我習慣使用 vim 快捷鍵
- 提交訊息使用英文

## 本機設定

- 資料庫連線：localhost:5432
```

---

### ~/.claude/CLAUDE.md

**位置**：使用者家目錄
**作用**：全域設定
**範圍**：所有 Claude Code 會話
**可提交 git**：N/A

**用途**：
- 🌍 跨專案的通用規則
- 🌍 個人程式碼風格偏好
- 🌍 常用的工作流程

```markdown
# 範例內容

## 全域規則

- 提交訊息使用繁體中文
- 優先使用函數式程式設計
- 測試覆蓋率 > 80%
```

---

### .claude/commands/*.md

**位置**：`.claude/commands/` 目錄
**作用**：自訂 slash 指令
**範圍**：當前專案
**可提交 git**：✅ 是（團隊共享）

**檔案結構**：
```markdown
---
description: "指令描述"
---

# 指令內容

$ARGUMENTS 會被替換為使用者輸入的參數
```

**範例**：見 [自訂指令使用指南](./custom-commands-guide.md)

---

### .claude/settings.json

**位置**：`.claude/` 目錄
**作用**：工具白名單和權限
**範圍**：當前專案
**可提交 git**：✅ 是

```json
{
  "allowedTools": [
    "Read",
    "Write",
    "Bash(npm run:*)",
    "Bash(git:*)"
  ]
}
```

---

### .mcp.json

**位置**：專案根目錄
**作用**：MCP 工具配置
**範圍**：當前專案
**可提交 git**：✅ 是（可分享）

**用途**：配置 Model Context Protocol 伺服器

---

## 🚩 CLI 魔法旗標

啟動 Claude Code 時可用的特殊旗標。

### 基本用法

```bash
# 無頭模式（執行後退出）
claude -p "查詢專案統計"

# 指定模型
claude --model opus

# 繼續最近對話
claude -c

# 恢復特定會話
claude -r "<session-id>"
```

---

### 重要旗標

| 旗標 | 功能 | 範例 |
|------|------|------|
| `-p, --print` | 無頭模式（不進入互動）| `claude -p "分析程式碼"` |
| `--model` | 指定模型 | `claude --model sonnet` |
| `-c` | 繼續最近對話 | `claude -c` |
| `-r` | 恢復會話 | `claude -r "abc123"` |
| `--max-turns` | 限制代理回合數 | `claude --max-turns 5` |
| `--verbose` | 詳細日誌 | `claude --verbose` |

---

### 權限控制

| 旗標 | 功能 | 範例 |
|------|------|------|
| `--permission-mode` | 設定權限模式 | `claude --permission-mode auto` |
| `--allowedTools` | 預先核准工具 | `claude --allowedTools "Read,Write"` |
| `--disallowedTools` | 禁用工具 | `claude --disallowedTools "Bash"` |
| `--dangerously-skip-permissions` | 跳過權限（⚠️危險）| `claude --dangerously-skip-permissions` |

**⚠️ 警告**：`--dangerously-skip-permissions` 僅限容器環境使用！

---

### 輸出格式

| 旗標 | 功能 | 範例 |
|------|------|------|
| `--output-format` | 設定輸出格式 | `claude --output-format json` |
| `--input-format` | 設定輸入格式 | `claude --input-format stream-json` |

**格式選項**：
- `text` - 純文字（預設）
- `json` - JSON 格式
- `stream-json` - 串流 JSON

---

### 進階選項

| 旗標 | 功能 | 範例 |
|------|------|------|
| `--agents` | 定義自訂子代理 | `claude --agents '{"name":"reviewer",...}'` |
| `--add-dir` | 包含額外目錄 | `claude --add-dir /path/to/dir` |
| `--append-system-prompt` | 擴展系統提示 | `claude --append-system-prompt "額外規則"` |
| `--mcp-debug` | MCP 除錯模式 | `claude --mcp-debug` |

---

## 💡 使用建議

### 何時使用哪個思考級別？

```
任務複雜度評估
│
├─ 簡單（修改小bug、加註解）
│  └─ 不需要魔法關鍵字
│
├─ 中等（重構函數、優化查詢）
│  └─ think
│
├─ 複雜（多方案評估、效能優化）
│  └─ think hard / megathink
│
└─ 非常複雜（架構設計、技術選型）
   └─ ultrathink
```

---

### 成本優化策略

1. **階梯式思考**：從 `think` 開始，不滿意再升級
2. **Plan Mode 優先**：規劃階段使用 Plan Mode 節省執行成本
3. **清除上下文**：使用 `/clear` 減少不必要的 token
4. **壓縮對話**：使用 `/compact` 濃縮歷史記錄

---

### 組合使用範例

```bash
# 最安全的深度規劃
Shift+Tab                    # 進入 Plan Mode
> /ultraplan 設計交易系統    # 使用自訂指令 + ultrathink

# 快速探索 + 思考
> /deepdive 認證系統，然後 think hard 改進方案

# 背景任務 + 開發
> !npm run dev
Ctrl+B                       # 背景執行
> 開始實作新功能             # 繼續工作
```

---

### 常見錯誤

❌ **錯誤**：簡單任務使用 ultrathink
```bash
> ultrathink 修正這個 typo
```

✅ **正確**：直接描述
```bash
> 修正檔案中的 typo
```

---

❌ **錯誤**：複雜任務不使用 Plan Mode
```bash
> 直接重構整個認證系統
```

✅ **正確**：先規劃
```bash
Shift+Tab
> /ultraplan 重構認證系統
```

---

## 🔗 相關資源

- [工作流程總覽](./README.md)
- [自訂指令使用指南](./custom-commands-guide.md)
- [Claude Code 官方文檔](https://docs.claude.com/en/docs/claude-code)
- [專案開發規範](../../CLAUDE.md)

---

## 📝 更新日誌

- **2025-10-26** - 初始版本，包含所有已知的魔法關鍵字
- 定期更新以反映 Claude Code 的新功能

---

**提示**：將此文檔加入書籤，隨時查閱！也可以使用 `Ctrl+F` 快速搜尋特定關鍵字。
