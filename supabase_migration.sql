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
    assignee_type TEXT DEFAULT 'internal',
    external_assignee_name TEXT,
    external_assignee_phone TEXT,
    external_assignee_unit TEXT,
    responsible_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    responsible_user_name TEXT,
    survey_address TEXT,
    survey_contact_name TEXT,
    survey_contact_phone TEXT,
    task_type TEXT NOT NULL,
    title TEXT NOT NULL,
    requirement TEXT,
    status TEXT DEFAULT 'pending',
    deadline TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_note TEXT,
    result_note TEXT,
    result_file_link TEXT,
    result_image TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS completed_note TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS result_note TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS result_file_link TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS result_image TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS work_sessions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS assignee_type TEXT DEFAULT 'internal';
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS external_assignee_name TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS external_assignee_phone TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS external_assignee_unit TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS responsible_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS responsible_user_name TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS survey_address TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS survey_contact_name TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS survey_contact_phone TEXT;
ALTER TABLE public.kts_tasks ADD COLUMN IF NOT EXISTS appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_type TEXT DEFAULT 'general';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS kts_task_id TEXT;

-- Tạo lịch hẹn cho các task khảo sát cũ chưa có liên kết
INSERT INTO public.appointments (
  id, lead_id, lead_name, title, datetime, assigned_to, created_by,
  status, note, appointment_type, kts_task_id, completed_at, created_at
)
SELECT
  'apt_survey_' || t.id,
  t.lead_id,
  t.lead_name,
  t.title,
  t.deadline,
  CASE WHEN t.assignee_type = 'external' THEN t.responsible_user_id ELSE t.kts_id END,
  t.assigner_id,
  CASE WHEN t.status = 'completed' THEN 'done' ELSE 'pending' END,
  CONCAT_WS(E'\n',
    CASE WHEN t.survey_address IS NOT NULL THEN 'Địa chỉ: ' || t.survey_address END,
    CASE WHEN t.survey_contact_name IS NOT NULL THEN 'Liên hệ: ' || t.survey_contact_name || COALESCE(' · ' || t.survey_contact_phone, '') END,
    CASE WHEN t.assignee_type = 'external' THEN 'Người đi khảo sát ngoài hệ thống: ' || COALESCE(t.external_assignee_name, t.kts_name) END,
    t.requirement
  ),
  'site_survey',
  t.id,
  t.completed_at,
  t.created_at
FROM public.kts_tasks t
WHERE t.task_type = 'site_survey'
  AND t.appointment_id IS NULL
  AND t.deadline IS NOT NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.kts_tasks t
SET appointment_id = a.id
FROM public.appointments a
WHERE a.kts_task_id = t.id
  AND t.task_type = 'site_survey'
  AND t.appointment_id IS NULL;

UPDATE public.appointments
SET title = REGEXP_REPLACE(title, '^📏\s*', '')
WHERE appointment_type = 'site_survey'
  AND title LIKE '📏%';

-- 3. Tạo bảng kts_logs (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.kts_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT,
    project_name TEXT,
    task_type TEXT,
    date DATE,
    progress TEXT,
    note TEXT,
    attachments TEXT,
    file_link TEXT,
    hours_spent NUMERIC(5,2) DEFAULT 0,
    description TEXT,
    files_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3b. Chuẩn hóa các cột đang được ứng dụng sử dụng
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS style_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS construction_days INT DEFAULT 0;
ALTER TABLE public.contract_payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'installment';
ALTER TABLE public.lead_history ADD COLUMN IF NOT EXISTS event_key TEXT;
ALTER TABLE public.lead_revisions ADD COLUMN IF NOT EXISTS event_key TEXT;
ALTER TABLE public.kts_logs ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.kts_logs ADD COLUMN IF NOT EXISTS progress TEXT;
ALTER TABLE public.kts_logs ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.kts_logs ADD COLUMN IF NOT EXISTS attachments TEXT;
ALTER TABLE public.kts_logs ADD COLUMN IF NOT EXISTS file_link TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_history_event_key ON public.lead_history(event_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_revisions_event_key ON public.lead_revisions(event_key);
CREATE INDEX IF NOT EXISTS idx_kts_tasks_status_deadline ON public.kts_tasks(status, deadline);
CREATE INDEX IF NOT EXISTS idx_kts_tasks_kts ON public.kts_tasks(kts_id);
CREATE INDEX IF NOT EXISTS idx_kts_tasks_responsible ON public.kts_tasks(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_kts_tasks_appointment ON public.kts_tasks(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_kts_task ON public.appointments(kts_task_id);
CREATE INDEX IF NOT EXISTS idx_kts_logs_user_date ON public.kts_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications(user_id, status);

-- 4. Bật RLS cho bảng mới
ALTER TABLE public.kts_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kts_logs ENABLE ROW LEVEL SECURITY;

-- 5. Tạo policy cho bảng mới (dùng DO block vì PostgreSQL không hỗ trợ CREATE POLICY IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kts_tasks' AND policyname = 'Allow anon all on kts_tasks') THEN
    CREATE POLICY "Allow anon all on kts_tasks" ON public.kts_tasks FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kts_logs' AND policyname = 'Allow anon all on kts_logs') THEN
    CREATE POLICY "Allow anon all on kts_logs" ON public.kts_logs FOR ALL USING (true);
  END IF;
END $$;

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

-- 10. View trích xuất dữ liệu logic cho báo cáo / BI
CREATE OR REPLACE VIEW public.vw_lead_pipeline WITH (security_invoker = true) AS
SELECT l.id AS lead_id, l.name AS customer_name, l.phone, l.source, l.stage,
  l.budget, l.interested_in, l.address AS project_address, l.home_address,
  l.created_at, l.updated_at, u.id AS sales_id, u.name AS sales_name,
  c.id AS campaign_id, c.name AS campaign_name, c.platform AS campaign_platform,
  COUNT(DISTINCT h.id) AS activity_count, COUNT(DISTINCT r.id) AS revision_count,
  EXTRACT(DAY FROM NOW() - l.created_at)::INT AS age_days
FROM public.leads l
LEFT JOIN public.users u ON u.id = l.assigned_to
LEFT JOIN public.campaigns c ON c.id = l.campaign_id
LEFT JOIN public.lead_history h ON h.lead_id = l.id
LEFT JOIN public.lead_revisions r ON r.lead_id = l.id
GROUP BY l.id, u.id, u.name, c.id, c.name, c.platform;

CREATE OR REPLACE VIEW public.vw_contract_finance WITH (security_invoker = true) AS
SELECT c.id AS contract_id, c.code AS contract_code, c.customer_name,
  c.value AS contract_value, COALESCE(SUM(p.amount), 0) AS collected_amount,
  GREATEST(c.value - COALESCE(SUM(p.amount), 0), 0) AS remaining_amount,
  CASE WHEN COALESCE(SUM(p.amount), 0) <= 0 THEN 'unpaid'
       WHEN COALESCE(SUM(p.amount), 0) >= c.value THEN 'paid' ELSE 'partial' END AS payment_status,
  c.stage, c.signed_date, c.expected_delivery, c.construction_days,
  u.id AS sales_id, u.name AS sales_name, COUNT(p.id) AS payment_count,
  MAX(p.date) AS last_payment_date
FROM public.contracts c
LEFT JOIN public.contract_payments p ON p.contract_id = c.id
LEFT JOIN public.users u ON u.id = c.assigned_to
GROUP BY c.id, u.id, u.name;

CREATE OR REPLACE VIEW public.vw_campaign_performance WITH (security_invoker = true) AS
SELECT c.id AS campaign_id, c.name AS campaign_name, c.platform, c.status,
  c.start_date, c.end_date, c.budget,
  COALESCE(logs.actual_spent, c.spent, 0) AS actual_spent,
  COALESCE(leads.total_leads, 0) AS total_leads,
  COALESCE(leads.won_leads, 0) AS won_leads,
  ROUND(COALESCE(logs.actual_spent, c.spent, 0) / NULLIF(leads.total_leads, 0), 2) AS cost_per_lead,
  ROUND(100.0 * COALESCE(leads.won_leads, 0) / NULLIF(leads.total_leads, 0), 2) AS conversion_rate_percent
FROM public.campaigns c
LEFT JOIN (SELECT campaign_id, SUM(amount) AS actual_spent FROM public.campaign_daily_logs GROUP BY campaign_id) logs ON logs.campaign_id = c.id
LEFT JOIN (SELECT campaign_id, COUNT(*) AS total_leads, COUNT(*) FILTER (WHERE stage = 'won') AS won_leads FROM public.leads WHERE campaign_id IS NOT NULL GROUP BY campaign_id) leads ON leads.campaign_id = c.id;

CREATE OR REPLACE VIEW public.vw_kts_task_performance WITH (security_invoker = true) AS
SELECT t.id AS task_id, t.lead_id, t.lead_name, t.task_type, t.title, t.status,
  t.deadline, t.created_at AS assigned_at, t.started_at, t.completed_at,
  t.kts_id, t.kts_name, t.assigner_id, t.assigner_name,
  ROUND(EXTRACT(EPOCH FROM (COALESCE(t.completed_at, NOW()) - t.created_at)) / 3600.0, 2) AS elapsed_hours,
  CASE WHEN t.completed_at IS NOT NULL THEN t.completed_at > t.deadline ELSE NOW() > t.deadline END AS is_overdue,
  t.result_note, t.result_file_link,
  t.assignee_type, t.external_assignee_name,
  t.responsible_user_id, t.responsible_user_name, t.survey_address
FROM public.kts_tasks t;

GRANT SELECT ON public.vw_lead_pipeline, public.vw_contract_finance,
  public.vw_campaign_performance, public.vw_kts_task_performance
TO anon, authenticated, service_role;
