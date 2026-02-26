# 數據庫設置文件

這個目錄包含了所有 Supabase PostgreSQL 數據庫的設置文件。

## 📁 文件說明

### 1. `supabase_setup.sql`
**完整的數據庫設置腳本**

包含：
- ✅ 所有表格創建（users, documents, summaries 等）
- ✅ 索引優化
- ✅ 觸發器和函數
- ✅ Row Level Security (RLS) 策略
- ✅ 約束和驗證規則

**使用方式**：
在 Supabase Dashboard > SQL Editor 中執行這個文件的全部內容。

### 2. `IMPORT_GUIDE.md`
**超詳細的導入指南**

包含：
- 📝 Step-by-step 導入步驟
- 🧪 驗證和測試方法
- 🔧 常見問題排解
- 📚 環境變數配置說明
- 🎯 Storage bucket 設置

### 3. `../my-app/scripts/verify-setup.ts`
**快速驗證腳本**

檢查：
- ✅ 環境變數是否正確設置
- ✅ 數據庫連接是否成功
- ✅ 所有表格是否存在
- ✅ Storage bucket 是否創建

**執行**：
```bash
cd my-app
npx tsx scripts/verify-setup.ts
```

### 4. `../my-app/scripts/test-db.ts`
**完整測試腳本**

測試：
- ✅ CRUD 操作
- ✅ 觸發器功能
- ✅ 外鍵關係
- ✅ 緩存查詢
- ✅ 軟刪除
- ✅ 編輯追蹤

**執行**：
```bash
cd my-app
npx tsx scripts/test-db.ts
```

## 🚀 快速開始

### 步驟 1：執行 SQL 腳本

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 打開 **SQL Editor**
4. 複製 `supabase_setup.sql` 的全部內容
5. 貼上並執行

### 步驟 2：設置環境變數

在 `my-app/.env.local` 中添加：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

> 從 Supabase Dashboard > Settings > API 獲取這些值

### 步驟 3：創建 Storage Bucket

1. 前往 **Storage**
2. 創建名為 `documents` 的 bucket（私密）
3. 設置 50MB 文件大小限制

### 步驟 4：驗證設置

```bash
cd my-app
npx tsx scripts/verify-setup.ts
```

看到 ✅ 表示設置成功！

## 📊 數據庫架構

```
users (用戶)
  ├── documents (文檔)
  │     └── summaries (摘要)
  │           └── summary_view_history (查看歷史)
  └── api_usage_logs (API 使用記錄)
```

### 核心表格

- **users**: 用戶身份和偏好設置
- **documents**: 上傳的文件元數據
- **summaries**: AI 生成的摘要（帶緩存）
- **summary_view_history**: 分析用戶行為
- **api_usage_logs**: 追蹤 AI API 成本

## 🔐 安全特性

- ✅ Row Level Security (RLS) 啟用
- ✅ Service Role 隔離（後端專用）
- ✅ User Key 使用 SHA-256 哈希
- ✅ 軟刪除機制
- ✅ 參數化查詢防止 SQL 注入

## 🎯 重要功能

### 1. 智能緩存
自動檢測相同文檔 + 語言 + 風格的摘要，避免重複 API 調用。

```sql
-- 緩存查詢範例
SELECT * FROM summaries 
WHERE document_id = ? 
  AND language = 'English' 
  AND style = 'standard'
  AND is_active = true;
```

### 2. 自動時間戳
`updated_at` 自動更新（通過觸發器）。

### 3. 編輯追蹤
追蹤用戶編輯摘要的次數和時間。

### 4. 軟刪除
文件不會真正刪除，可以恢復。

## 📚 參考資料

- [database_schema.md](../requirement_Doc/database_schema.md) - 完整設計文檔
- [IMPORT_GUIDE.md](./IMPORT_GUIDE.md) - 詳細導入指南
- [Supabase 文檔](https://supabase.com/docs)

## 🆘 需要幫助？

1. 查看 `IMPORT_GUIDE.md` 中的常見問題
2. 執行 `verify-setup.ts` 診斷問題
3. 檢查 Supabase Dashboard 的日誌
