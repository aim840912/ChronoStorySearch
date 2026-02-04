# Claude Code 十大生產力秘訣

> **來源**：Anthropic Claude Code 團隊內部最佳實踐
> **翻譯**：繁體中文版，技術術語保留英文

---

## 1. 大量平行作業

同時開啟 3–5 個 git worktree，每個各跑一個獨立的 Claude 工作階段。這是**最大的生產力提升**，也是團隊公認的第一名技巧。

實用小技巧：
- 為每個 worktree 命名，並設定 shell alias（如 `za`、`zb`、`zc`），一鍵切換
- 可以設一個專門的「分析用」worktree，只用來讀 log 和跑 BigQuery

---

## 2. 複雜任務一定先用 Plan Mode

每個複雜任務都從 Plan Mode 開始。**把心力投入在計畫上**，讓 Claude 能一次到位地完成實作。

團隊做法：
- 有人讓一個 Claude 寫計畫，再開第二個 Claude 以 Staff Engineer 的角度審查
- 一旦事情走歪，立刻切回 Plan Mode 重新規劃，**不要硬撐**
- Plan Mode 不只用在建構階段，也可以用在驗證步驟

---

## 3. 持續投資你的 CLAUDE.md

每次糾正 Claude 之後，結尾加一句：**「更新你的 CLAUDE.md，確保不再犯同樣的錯。」** Claude 非常擅長為自己撰寫規則。

要點：
- 隨著時間無情地編輯你的 CLAUDE.md，持續迭代，直到 Claude 的犯錯率明顯下降
- 有工程師讓 Claude 為每個任務/專案維護一個 notes 目錄，每次 PR 後更新，再把 CLAUDE.md 指向它

---

## 4. 建立自己的 Skill 並提交到 Git

如果一個操作你每天做超過一次，就把它變成 skill 或 command。跨專案重複使用。

團隊實例：
- 建立 `/techdebt` slash command，每次 session 結束時執行，找出並消除重複程式碼
- 建立一個 slash command，把近 7 天的 Slack、GDrive、Asana、GitHub 同步成一份 context dump
- 建立類似 analytics engineer 的 agent，自動撰寫 dbt model、review 程式碼、在 dev 環境測試

---

## 5. Claude 能自己修大多數 Bug

團隊的做法：
- 啟用 Slack MCP，直接把 Slack bug 討論串貼給 Claude，說一句「**fix**」，零 context 切換
- 直接說：「**去修好 CI 失敗的測試**」，不要 micromanage 具體怎麼做
- 把 Docker log 指向 Claude 來排查分散式系統問題——它在這方面出乎意料地強

---

## 6. 提升你的 Prompting 技巧

**a. 挑戰 Claude：**
說「嚴格審查這些變更，通不過你的測試就不准開 PR。」讓 Claude 擔任你的 reviewer。或者說「證明這個能用」，讓 Claude 比對 main branch 和 feature branch 之間的行為差異。

**b. 遇到普通修復後：**
說：「既然你現在已經了解全貌了，把這個丟掉，實作更優雅的方案。」

**c. 減少模糊空間：**
交接工作前先寫詳細的 spec，越具體，產出越好。

---

## 7. 終端機與環境設定

- 團隊推薦 **Ghostty** 終端機！同步渲染、24-bit 色彩、完整 Unicode 支援
- 使用 `/statusline` 自訂狀態列，隨時顯示 context 用量和當前 git branch
- 用顏色區分和命名每個終端 tab（也有人用 tmux），一個 tab 對應一個任務或 worktree
- **使用語音輸入**：說話速度是打字的 3 倍，prompt 也會因此更加詳細（macOS 按兩下 fn 鍵）

---

## 8. 善用 Subagent

- 在任何請求後面加上「**use subagents**」，讓 Claude 投入更多算力來解決問題
- 將個別任務分派給 subagent，保持主 agent 的 context window 乾淨且專注
- 透過 hook 將權限請求路由到 Opus 4.5，讓它代為決策

---

## 9. 用 Claude 做資料與分析

讓 Claude Code 用 `bq` CLI 即時拉取和分析指標。團隊在 codebase 中存了一個 BigQuery skill，所有人都直接在 Claude Code 裡跑 analytics 查詢。有人已經超過 6 個月沒手寫過一行 SQL。

這個方法適用於**任何有 CLI、MCP 或 API 的資料庫**。

---

## 10. 用 Claude 學習

**a. 啟用 Explanatory 或 Learning 輸出風格：**
在 `/config` 中啟用，讓 Claude 解釋每個變更背後的「為什麼」。

**b. 讓 Claude 產生視覺化 HTML 簡報：**
解釋不熟悉的程式碼，它做出來的投影片品質出乎意料地好。

**c. 用 ASCII 圖表理解架構：**
請 Claude 為新的 protocol 或 codebase 畫 ASCII 架構圖。

**d. 打造間隔重複學習 skill：**
你說明自己的理解，Claude 提問填補盲區，並儲存結果供日後複習。
