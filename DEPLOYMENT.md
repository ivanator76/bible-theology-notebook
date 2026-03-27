# 開發與部署指南

## 專案結構

```
bible-theology-notebook/
├── frontend/          React + Vite 前端
├── backend/           Node.js + Express + SQLite 後端
├── data/              SQLite 資料庫（本地開發用）
├── Dockerfile         多階段 build：先 build 前端，再打包成 production image
├── nginx.conf         Nginx 反向代理設定（port 3000 → API port 3001）
├── supervisord.conf   容器內同時管理 nginx + node 兩個 process
└── docker-compose.yml NAS 部署用
```

**NAS 上的路徑**
- 專案原始碼：`/volume1/docker/bible-notebook/bible-theology-notebook/`
- 資料庫持久化：`/volume1/docker/bible-notebook/data/`
- 對外 port：`3000`（http://192.168.50.8:3000）

---

## 在本機開發

### 第一次設定

```bash
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 啟動開發伺服器

```bash
# 終端機 1：啟動後端
cd backend && node src/server.js

# 終端機 2：啟動前端（hot reload）
cd frontend && npm run dev
```

前端：http://localhost:5173
後端：http://localhost:3001

---

## 請 Claude Code 幫忙修改程式

### 開始新的對話前

在 Claude Code 對話中，貼上這段說明讓 Claude 了解專案：

```
這是一個聖經神學筆記應用程式。
- 工作目錄：/Users/ivansu/bible-theology-notebook
- 前端：React + Vite，在 frontend/src/
- 後端：Node.js + Express + better-sqlite3，在 backend/src/
- 樣式：單一 CSS 檔案 frontend/src/styles/index.css，使用 CSS variables
- 元件風格：函數式 React，inline style 為主，少量 className
- 路由：前端 SPA 用 page state 切換，後端 REST API
- 主要頁面：Dashboard, NotesList, NoteEditor, NoteView, DoctrinePage, ThemeChainPage, ResourcesPage, TagManager
```

### 修改後驗證

每次修改完，在本機確認前端能正常 build：

```bash
cd frontend && npm run build
```

無錯誤才同步到 NAS。

---

## 部署更新到 NAS

### 步驟 1：從 Mac 同步到 NAS

```bash
rsync -av --exclude node_modules --exclude dist --exclude '.git' \
  /Users/ivansu/bible-theology-notebook/ \
  Ivan_Main@192.168.50.8:/volume1/docker/bible-notebook/bible-theology-notebook/
```

> **注意**：來源路徑結尾有 `/`，會同步目錄內容而非目錄本身。

### 步驟 2：SSH 進 NAS

```bash
ssh Ivan_Main@192.168.50.8
cd /volume1/docker/bible-notebook/bible-theology-notebook
```

### 步驟 3：Rebuild 並重啟容器

**不帶 AI 功能：**

```bash
sudo docker build -t bible-theology-notebook . && \
sudo docker rm -f bible-notebook && \
sudo docker run -d \
  --name bible-notebook \
  -p 3000:3000 \
  -v /volume1/docker/bible-notebook/data:/app/backend/data \
  --restart unless-stopped \
  bible-theology-notebook
```

**帶 AI 功能（支援 Anthropic / OpenAI / Google，設定任一即可）：**

```bash
sudo docker build -t bible-theology-notebook . && \
sudo docker rm -f bible-notebook && \
sudo docker run -d \
  --name bible-notebook \
  -p 3000:3000 \
  -v /volume1/docker/bible-notebook/data:/app/backend/data \
  -e ANTHROPIC_API_KEY=sk-ant-你的金鑰 \
  -e OPENAI_API_KEY=sk-你的OpenAI金鑰 \
  -e GOOGLE_API_KEY=你的Google金鑰 \
  --restart unless-stopped \
  bible-theology-notebook
```

> **提示**：三個 API Key 不需要全部設定，設定其中一個即可使用 AI 功能。也可以不在這裡設定，改到 App 介面的「設定 API Key」輸入（會儲存在掛載的 data 目錄中）。

### 步驟 4：確認正常運行

```bash
sudo docker logs bible-notebook
curl -s http://localhost:3000/api/health
```

應看到 `{"status":"ok"}`。

---

## 常用 Docker 指令

```bash
# 查看容器狀態
sudo docker ps

# 查看即時 log
sudo docker logs -f bible-notebook

# 進入容器除錯
sudo docker exec -it bible-notebook /bin/sh

# 停止容器
sudo docker stop bible-notebook

# 啟動已停止的容器
sudo docker start bible-notebook

# 查看資料庫大小
ls -lh /volume1/docker/bible-notebook/data/
```

---

## 注意事項

- **資料庫**掛載在 NAS 本機，rebuild image 不會遺失筆記資料。
- **不要**直接刪除 `/volume1/docker/bible-notebook/data/` 目錄。
- 若要備份，直接複製 `data/notebook.db` 即可，也可以在 App 介面使用「匯出備份」功能。
