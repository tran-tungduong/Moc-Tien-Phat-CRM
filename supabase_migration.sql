-- ════════════════════════════════════════════════════════════════
-- MTP CRM - MIGRATION SCRIPT (Chạy lên Supabase hiện có)
-- Chỉ thêm những gì còn thiếu, KHÔNG xóa data cũ
-- ════════════════════════════════════════════════════════════════

-- 1. Thêm cột mới vào bảng notifications (nếu chưa có)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_id TEXT;

-- 2. Tạo bảng kts_tasks (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.kts_tasks (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    lead_name TEXT,
    assigner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    assigner_name TEXT,
    kts_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    kts_name TEXT,
    task_type TEXT NOT NULL,
    title TEXT NOT NULL,
    requirement TEXT,
    status TEXT DEFAULT 'pending',
    deadline TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tạo bảng kts_logs (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.kts_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT,
    project_name TEXT,
    task_type TEXT,
    hours_spent NUMERIC(5,2) DEFAULT 0,
    description TEXT,
    files_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bật RLS cho bảng mới
ALTER TABLE public.kts_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kts_logs ENABLE ROW LEVEL SECURITY;

-- 5. Tạo policy cho bảng mới
CREATE POLICY IF NOT EXISTS "Allow anon all on kts_tasks" ON public.kts_tasks FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon all on kts_logs" ON public.kts_logs FOR ALL USING (true);

-- 6. Grant quyền truy cập
GRANT ALL ON public.kts_tasks TO anon, authenticated, service_role;
GRANT ALL ON public.kts_logs TO anon, authenticated, service_role;

-- 7. Thêm user Nhật Long (nếu chưa có)
INSERT INTO public.users (id, username, password, name, role, avatar)
VALUES (
  'usr_long_tran',
  'long.tran',
  '123',
  'Trần Hữu Nhật Long',
  'kts',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  avatar = EXCLUDED.avatar;

-- 8. Cập nhật user long.tran hiện có (nếu role đang sai)
UPDATE public.users SET role = 'kts', name = 'Trần Hữu Nhật Long',
  avatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60'
WHERE username = 'long.tran';

-- 9. Bật Realtime cho bảng mới
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kts_tasks, public.kts_logs;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
