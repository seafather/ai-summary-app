# Supabase 數據庫導入指南

## 📋 導入步驟

### 方法一：使用 Supabase Dashboard (推薦)

#### 1️⃣ 登入並選擇專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案（或創建新專案）
3. 等待專案準備完成

#### 2️⃣ 打開 SQL Editor

1. 在左側菜單找到 **SQL Editor** (🗂️ 圖標)
2. 點擊 **New Query** 或 **+ New Query** 按鈕

#### 3️⃣ 複製並執行 SQL 腳本

1. 打開 `/database/supabase_setup.sql` 文件
2. **全選並複製** 所有內容 (Cmd+A, Cmd+C)
3. 貼到 Supabase SQL Editor 中
4. 點擊 **Run** 或按 **Cmd+Enter** 執行

#### 4️⃣ 驗證導入成功

執行成功後，你會看到：
- ✅ "Tables created successfully!" 訊息
- 📋 所有表格列表：
  - `users`
  - `documents`
  - `summaries`
  - `summary_view_history`
  - `api_usage_logs`

---

### 方法二：使用 Supabase CLI (進階)

#### 前置要求
```bash
# 安裝 Supabase CLI
brew install supabase/tap/supabase

# 或使用 npm
npm install -g supabase
```

#### 執行步驟

1. **登入 Supabase**
   ```bash
   supabase login
   ```

2. **連接到專案**
   ```bash
   supabase link --project-ref your-project-ref
   ```
   > 在 Supabase Dashboard > Settings > General 找到 Project Reference ID

3. **執行 SQL 腳本**
   ```bash
   supabase db push --include-all
   ```
   
   或直接執行 SQL 文件：
   ```bash
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
     -f database/supabase_setup.sql
   ```

---

## 🔍 驗證數據庫設置

在 Supabase SQL Editor 執行以下查詢來驗證：

### 1. 檢查所有表格
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. 檢查表格結構
```sql
-- 檢查 users 表
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

### 3. 檢查索引
```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 4. 檢查觸發器
```sql
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

### 5. 檢查 RLS 狀態
```sql
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 🎯 建立 Storage Bucket

除了數據庫表格，你還需要創建 Storage Bucket 來存儲文件：

### 在 Supabase Dashboard 創建 Bucket

1. 前往 **Storage** (左側菜單)
2. 點擊 **Create a new bucket**
3. 設置：
   - **Name**: `documents`
   - **Public bucket**: ❌ 不勾選 (保持私密)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: `application/pdf, text/plain`
4. 點擊 **Create bucket**

### 設置 Storage 政策

在 Storage > documents bucket > Policies 中添加：

```sql
-- 允許 service role 完全訪問
CREATE POLICY "Service role can do everything"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'documents');
```

---

## 📝 獲取連接資訊

導入完成後，需要獲取以下資訊來配置應用：

### 1. 在 Supabase Dashboard

前往 **Settings** > **API**，你會看到：

- **Project URL**: `https://xxxxx.supabase.co`
- **anon / public key**: `eyJhbGc...` (用於前端)
- **service_role key**: `eyJhbGc...` (用於後端，**保密！**)

### 2. 創建或更新 `.env.local`

在 `my-app` 目錄創建 `.env.local` 文件：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...你的anon-key...

# Service Role Key (僅用於後端 API)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...你的service-role-key...

# GitHub Models API Key (用於 AI 摘要)
GITHUB_TOKEN=ghp_...你的GitHub-token...
```

⚠️ **重要**：將 `.env.local` 加入 `.gitignore`，不要提交到 Git！

---

## 🧪 測試數據庫連接

### 創建測試腳本

創建 `my-app/scripts/test-db.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  // 測試 1: 檢查表格
  const { data: tables, error: tablesError } = await supabase
    .from('users')
    .select('count');
  
  if (tablesError) {
    console.error('❌ Connection failed:', tablesError);
    return;
  }
  
  console.log('✅ Connected to Supabase successfully!');
  
  // 測試 2: 創建測試用戶
  const testUserKey = `test-user-${Date.now()}`;
  const crypto = await import('crypto');
  const userKeyHash = crypto.createHash('sha256').update(testUserKey).digest('hex');
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      user_key: testUserKey,
      user_key_hash: userKeyHash,
      display_name: 'Test User'
    })
    .select()
    .single();
  
  if (userError) {
    console.error('❌ Failed to create test user:', userError);
    return;
  }
  
  console.log('✅ Test user created:', user.id);
  
  // 清理測試數據
  await supabase.from('users').delete().eq('id', user.id);
  console.log('✅ Test data cleaned up');
  
  console.log('\n🎉 All tests passed! Database is ready to use.');
}

testConnection();
```

### 執行測試

```bash
cd my-app
npx tsx scripts/test-db.ts
```

---

## 📊 查看數據庫使用情況

在 Supabase Dashboard 中：

1. **Table Editor** - 查看和編輯表格數據
2. **SQL Editor** - 執行自定義查詢
3. **Database** > **Roles** - 查看權限設置
4. **Database** > **Extensions** - 啟用額外功能（如 pg_stat_statements）
5. **Reports** - 查看使用統計

---

## 🔧 常見問題排解

### 問題 1: "relation already exists" 錯誤

**解決方法**：這表示表格已經存在。你可以：

1. 刪除現有表格（在 SQL Editor）：
   ```sql
   DROP TABLE IF EXISTS api_usage_logs CASCADE;
   DROP TABLE IF EXISTS summary_view_history CASCADE;
   DROP TABLE IF EXISTS summaries CASCADE;
   DROP TABLE IF EXISTS documents CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   ```

2. 然後重新執行 `supabase_setup.sql`

### 問題 2: RLS 阻止訪問

**檢查**：確保你使用的是 **service_role key**（不是 anon key）在後端 API 路由中。

```typescript
// ✅ 正確 - 使用 service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 服務端
);

// ❌ 錯誤 - 使用 anon key 會被 RLS 阻擋
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 問題 3: 觸發器沒有生效

**檢查觸發器狀態**：
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%updated_at%';
```

**重新創建觸發器**：
```sql
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 🚀 下一步

數據庫設置完成後：

1. ✅ 更新 `.env.local` 配置
2. ✅ 創建 Storage bucket
3. ✅ 測試數據庫連接
4. ✅ 開始開發應用功能

查看 `NEXT_STEPS.md` 了解應用開發的下一步驟。

---

## 📚 相關資源

- [Supabase 官方文檔](https://supabase.com/docs)
- [Supabase SQL Editor 指南](https://supabase.com/docs/guides/database/overview)
- [Row Level Security 指南](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage 指南](https://supabase.com/docs/guides/storage)
