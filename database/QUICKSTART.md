# 🚀 Supabase 數據庫導入快速指南

> 快速設置你的 Supabase PostgreSQL 數據庫

## ⏱️ 5 分鐘快速開始

### 步驟 1：在 Supabase 執行 SQL 腳本

1. 登入 **[Supabase Dashboard](https://supabase.com/dashboard)**
2. 選擇你的專案（或創建新專案）
3. 點擊左側 **SQL Editor** 📝
4. 點擊 **New Query**
5. 打開 [`/database/supabase_setup.sql`](./supabase_setup.sql)
6. **複製全部內容** (Cmd+A, Cmd+C)
7. **貼到 SQL Editor** (Cmd+V)
8. 點擊 **Run** 或按 **Cmd+Enter** 執行

看到 "Tables created successfully!" 就成功了！ ✅

---

### 步驟 2：創建 Storage Bucket

1. 在 Supabase Dashboard 點擊 **Storage** 🗄️
2. 點擊 **New bucket**
3. 設置：
   - Name: `documents`
   - Public: ❌ 不勾選（保持私密）
   - File size limit: `50 MB`
   - Allowed MIME types: `application/pdf, text/plain`
4. 點擊 **Create bucket**

---

### 步驟 3：獲取 API 密鑰

1. 前往 **Settings > API** ⚙️
2. 複製以下三個值：
   - **Project URL**
   - **anon public key**
   - **service_role key** ⚠️

---

### 步驟 4：配置環境變數

在 `my-app` 目錄創建 `.env.local` 文件：

```bash
cd my-app
cp .env.local.example .env.local
```

打開 `.env.local` 並填入剛才複製的值：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
GITHUB_TOKEN=ghp_... # 從 https://github.com/settings/tokens 獲取
```

⚠️ **重要**：不要把 `.env.local` 提交到 Git！

---

### 步驟 5：安裝依賴並驗證

```bash
cd my-app

# 安裝依賴（包含 tsx）
npm install

# 驗證設置
npm run db:verify
```

看到 ✅ 就表示一切正常！

---

## 🧪 可選：運行完整測試

```bash
npm run db:test
```

這會測試：
- ✅ 所有表格操作
- ✅ 觸發器功能
- ✅ 外鍵關係
- ✅ 軟刪除
- ✅ 編輯追蹤

---

## ✅ 完成！現在可以：

```bash
npm run dev
```

打開 [http://localhost:3000](http://localhost:3000) 開始開發！

---

## 📊 數據庫結構一覽

```
users (用戶身份)
 ├─ documents (上傳的文件)
 │   └─ summaries (AI 生成的摘要)
 │       └─ summary_view_history (查看記錄)
 └─ api_usage_logs (API 成本追蹤)
```

**核心功能：**
- 🔐 用戶隔離（通過 user_key）
- 📁 文件元數據管理
- 🤖 AI 摘要緩存
- 📊 使用統計追蹤
- 🔄 自動時間戳
- 🗑️ 軟刪除

---

## 🆘 遇到問題？

### 問題 1：表格已存在錯誤

```sql
-- 在 SQL Editor 執行，然後重新運行 setup 腳本
DROP TABLE IF EXISTS api_usage_logs CASCADE;
DROP TABLE IF EXISTS summary_view_history CASCADE;
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### 問題 2：環境變數錯誤

```bash
# 檢查環境變數
npm run db:verify
```

顯示哪些變數缺失或錯誤。

### 問題 3：連接失敗

1. 確認 Supabase 專案正在運行
2. 檢查 Project URL 是否正確
3. 確認使用的是 **service_role** key（不是 anon key）

---

## 📚 詳細文檔

- 📖 [完整導入指南](./IMPORT_GUIDE.md) - 詳細步驟和說明
- 📋 [數據庫設計文檔](../requirement_Doc/database_schema.md) - 完整架構
- 🔍 [驗證腳本](../my-app/scripts/verify-setup.ts) - 診斷工具
- 🧪 [測試腳本](../my-app/scripts/test-db.ts) - 完整測試

---

## 🎯 NPM 腳本命令

```bash
npm run dev          # 啟動開發服務器
npm run db:verify    # 快速驗證數據庫設置
npm run db:test      # 運行完整數據庫測試
npm run build        # 構建生產版本
```

---

## 🔒 安全提醒

- ⚠️ **永遠不要**暴露 `service_role` key 到前端
- ⚠️ 在後端 API 路由中使用 `service_role` key
- ⚠️ 在前端使用 `anon` key
- ⚠️ 將 `.env.local` 加入 `.gitignore`
- ✅ 定期輪換 API 密鑰
- ✅ 使用環境變數管理敏感資訊

---

**🎉 恭喜！你的 Supabase 數據庫已準備就緒！**
