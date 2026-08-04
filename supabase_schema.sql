-- ════════════════════════════════════════════════════════════════════════
--  MỘC TIÊN PHÁT CRM & MARKETING - RELATIONAL POSTGRES DATABASE SCHEMA
--  Designed for Supabase, Multi-user Concurrency & Data Analytics (BI)
-- ════════════════════════════════════════════════════════════════════════

-- 1. Xóa các bảng cũ nếu tồn tại (Clean setup)
DROP TABLE IF EXISTS public.kts_logs CASCADE;
DROP TABLE IF EXISTS public.kts_tasks CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.approvals CASCADE;
DROP TABLE IF EXISTS public.portfolio CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.campaign_daily_logs CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.contract_payments CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.lead_revisions CASCADE;
DROP TABLE IF EXISTS public.lead_history CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.app_state CASCADE;

-- 2. Bảng NGUỜI DÙNG (users)
CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales', -- manager, sales, marketing, accountant
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng CHIẾN DỊCH MARKETING (campaigns)
CREATE TABLE public.campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'facebook', -- facebook, zalo, tiktok, google, youtube, other
    start_date DATE,
    end_date DATE,
    budget NUMERIC(15,2) DEFAULT 0,
    spent NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, paused, ended
    assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng NHẬT KÝ CHI TIÊU HÀNG NGÀY (campaign_daily_logs)
CREATE TABLE public.campaign_daily_logs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(15,2) DEFAULT 0,
    note TEXT,
    created_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Bảng KHÁCH HÀNG TIỀM NĂNG (leads)
CREATE TABLE public.leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    source TEXT DEFAULT 'other', -- facebook, zalo, tiktok, google, referral, website, walkin, other
    campaign_id TEXT REFERENCES public.campaigns(id) ON DELETE SET NULL,
    stage TEXT DEFAULT 'new', -- new, survey, design_draft, quote_sent, negotiation, won, lost
    assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    budget NUMERIC(15,2) DEFAULT 0,
    note TEXT,
    address TEXT,
    home_address TEXT,
    interested_in TEXT,
    next_follow_up TIMESTAMP WITH TIME ZONE,
    survey_by TEXT,
    survey_date DATE,
    survey_note TEXT,
    style_images JSONB DEFAULT '[]'::jsonb,
    fail_reason TEXT,
    failed_at_stage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Bảng LỊCH SỬ CHĂM SÓC LEAD (lead_history)
CREATE TABLE public.lead_history (
    id BIGSERIAL PRIMARY KEY,
    event_key TEXT UNIQUE,
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    user_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Bảng LỊCH SỬ SỬA THIẾT KẾ & BÁO GIÁ LẠI (lead_revisions)
CREATE TABLE public.lead_revisions (
    id BIGSERIAL PRIMARY KEY,
    event_key TEXT UNIQUE,
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    rev_num INT NOT NULL,
    quote_amount NUMERIC(15,2) DEFAULT 0,
    note TEXT,
    user_name TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Bảng HỢP ĐỒNG (contracts)
CREATE TABLE public.contracts (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT,
    id_card TEXT,
    address TEXT,
    home_address TEXT,
    items TEXT,
    rep_name TEXT,
    value NUMERIC(15,2) DEFAULT 0,
    signed_date DATE,
    expected_delivery DATE,
    construction_days INT DEFAULT 0,
    stage TEXT DEFAULT 'signed', -- signed, producing, delivering, installed, completed, cancelled
    assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    note TEXT,
    milestones JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Bảng CÁC ĐỢT THANH TOÁN (contract_payments)
CREATE TABLE public.contract_payments (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) DEFAULT 0,
    date DATE,
    payment_type TEXT DEFAULT 'installment', -- deposit, installment, final
    method TEXT DEFAULT 'cash', -- transfer, cash, card
    collector_name TEXT,
    note TEXT,
    proof_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Bảng LỊCH HẸN (appointments)
CREATE TABLE public.appointments (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
    lead_name TEXT,
    title TEXT NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending', -- pending, done, cancelled
    note TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by TEXT,
    appointment_type TEXT DEFAULT 'general', -- general, site_survey
    kts_task_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. BẢNG BỘ SƯU TẬP DỰ ÁN (portfolio)
CREATE TABLE public.portfolio (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    completed_date DATE,
    photos JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    highlight BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Bảng YÊU CẦU PHÊ DUYỆT (approvals)
CREATE TABLE public.approvals (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'lead_edit',
    target_id TEXT,
    target_name TEXT,
    requester_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    requester_name TEXT,
    change_summary TEXT,
    old_data JSONB DEFAULT '{}'::jsonb,
    new_data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    reject_reason TEXT,
    handled_by TEXT,
    handled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Bảng THÔNG BÁO (notifications) - General purpose user notifications
CREATE TABLE public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    message TEXT,
    target_id TEXT,
    -- Legacy contract payment notification fields
    contract_id TEXT,
    contract_code TEXT,
    customer_name TEXT,
    amount NUMERIC(15,2) DEFAULT 0,
    date DATE,
    note TEXT,
    proof_image TEXT,
    collector_name TEXT,
    status TEXT DEFAULT 'unread', -- unread, read
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Bảng CÔNG VIỆC GIAO CHO KTS (kts_tasks)
CREATE TABLE public.kts_tasks (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    lead_name TEXT,
    assigner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    assigner_name TEXT,
    kts_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    kts_name TEXT,
    assignee_type TEXT DEFAULT 'internal', -- internal, external
    external_assignee_name TEXT,
    external_assignee_phone TEXT,
    external_assignee_unit TEXT,
    responsible_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    responsible_user_name TEXT,
    survey_address TEXT,
    survey_contact_name TEXT,
    survey_contact_phone TEXT,
    appointment_id TEXT REFERENCES public.appointments(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL, -- site_survey, fast_support, technical_draw, cnc_export
    title TEXT NOT NULL,
    requirement TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed
    deadline TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_note TEXT,
    result_note TEXT,
    result_file_link TEXT,
    result_image TEXT,
    work_sessions JSONB DEFAULT '[]'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Bảng BÁO CÁO KTS (kts_logs)
CREATE TABLE public.kts_logs (
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

-- ════════════════════════════════════════════════════════════════════════
--  CHỈ MỤC (INDEXES) - TỐI ƯU TRUY VẤN & PHÂN TÍCH DỮ LIỆU (DATA ANALYTICS)
-- ════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX idx_leads_campaign ON public.leads(campaign_id);
CREATE INDEX idx_leads_created ON public.leads(created_at);

CREATE INDEX idx_contracts_assigned ON public.contracts(assigned_to);
CREATE INDEX idx_contracts_signed_date ON public.contracts(signed_date);
CREATE INDEX idx_payments_contract ON public.contract_payments(contract_id);
CREATE INDEX idx_payments_date ON public.contract_payments(date);

CREATE INDEX idx_campaign_logs_camp ON public.campaign_daily_logs(campaign_id);
CREATE INDEX idx_appointments_assigned ON public.appointments(assigned_to);
CREATE INDEX idx_appointments_kts_task ON public.appointments(kts_task_id);
CREATE INDEX idx_kts_tasks_status_deadline ON public.kts_tasks(status, deadline);
CREATE INDEX idx_kts_tasks_kts ON public.kts_tasks(kts_id);
CREATE INDEX idx_kts_tasks_responsible ON public.kts_tasks(responsible_user_id);
CREATE INDEX idx_kts_tasks_appointment ON public.kts_tasks(appointment_id);
CREATE INDEX idx_kts_logs_user_date ON public.kts_logs(user_id, date);
CREATE INDEX idx_notifications_user_status ON public.notifications(user_id, status);

-- ════════════════════════════════════════════════════════════════════════
--  PHÂN QUYỀN TRUY CẬP & BẬT ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kts_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kts_logs ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách (Policies) cho phép Client truy cập dữ liệu an toàn
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow anon all on leads" ON public.leads FOR ALL USING (true);
CREATE POLICY "Allow anon all on lead_history" ON public.lead_history FOR ALL USING (true);
CREATE POLICY "Allow anon all on lead_revisions" ON public.lead_revisions FOR ALL USING (true);
CREATE POLICY "Allow anon all on contracts" ON public.contracts FOR ALL USING (true);
CREATE POLICY "Allow anon all on contract_payments" ON public.contract_payments FOR ALL USING (true);
CREATE POLICY "Allow anon all on campaigns" ON public.campaigns FOR ALL USING (true);
CREATE POLICY "Allow anon all on campaign_daily_logs" ON public.campaign_daily_logs FOR ALL USING (true);
CREATE POLICY "Allow anon all on appointments" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Allow anon all on portfolio" ON public.portfolio FOR ALL USING (true);
CREATE POLICY "Allow anon all on approvals" ON public.approvals FOR ALL USING (true);
CREATE POLICY "Allow anon all on notifications" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Allow anon all on kts_tasks" ON public.kts_tasks FOR ALL USING (true);
CREATE POLICY "Allow anon all on kts_logs" ON public.kts_logs FOR ALL USING (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════
--  VIEW PHỤC VỤ TRÍCH XUẤT / BI (mỗi dòng có ý nghĩa nghiệp vụ rõ ràng)
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.vw_lead_pipeline WITH (security_invoker = true) AS
SELECT
    l.id AS lead_id,
    l.name AS customer_name,
    l.phone,
    l.source,
    l.stage,
    l.budget,
    l.interested_in,
    l.address AS project_address,
    l.home_address,
    l.created_at,
    l.updated_at,
    u.id AS sales_id,
    u.name AS sales_name,
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.platform AS campaign_platform,
    COUNT(DISTINCT h.id) AS activity_count,
    COUNT(DISTINCT r.id) AS revision_count,
    EXTRACT(DAY FROM NOW() - l.created_at)::INT AS age_days
FROM public.leads l
LEFT JOIN public.users u ON u.id = l.assigned_to
LEFT JOIN public.campaigns c ON c.id = l.campaign_id
LEFT JOIN public.lead_history h ON h.lead_id = l.id
LEFT JOIN public.lead_revisions r ON r.lead_id = l.id
GROUP BY l.id, u.id, u.name, c.id, c.name, c.platform;

CREATE OR REPLACE VIEW public.vw_contract_finance WITH (security_invoker = true) AS
SELECT
    c.id AS contract_id,
    c.code AS contract_code,
    c.customer_name,
    c.value AS contract_value,
    COALESCE(SUM(p.amount), 0) AS collected_amount,
    GREATEST(c.value - COALESCE(SUM(p.amount), 0), 0) AS remaining_amount,
    CASE
      WHEN COALESCE(SUM(p.amount), 0) <= 0 THEN 'unpaid'
      WHEN COALESCE(SUM(p.amount), 0) >= c.value THEN 'paid'
      ELSE 'partial'
    END AS payment_status,
    c.stage,
    c.signed_date,
    c.expected_delivery,
    c.construction_days,
    u.id AS sales_id,
    u.name AS sales_name,
    COUNT(p.id) AS payment_count,
    MAX(p.date) AS last_payment_date
FROM public.contracts c
LEFT JOIN public.contract_payments p ON p.contract_id = c.id
LEFT JOIN public.users u ON u.id = c.assigned_to
GROUP BY c.id, u.id, u.name;

CREATE OR REPLACE VIEW public.vw_campaign_performance WITH (security_invoker = true) AS
SELECT
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.platform,
    c.status,
    c.start_date,
    c.end_date,
    c.budget,
    COALESCE(logs.actual_spent, c.spent, 0) AS actual_spent,
    COALESCE(leads.total_leads, 0) AS total_leads,
    COALESCE(leads.won_leads, 0) AS won_leads,
    ROUND(COALESCE(logs.actual_spent, c.spent, 0) / NULLIF(leads.total_leads, 0), 2) AS cost_per_lead,
    ROUND(100.0 * COALESCE(leads.won_leads, 0) / NULLIF(leads.total_leads, 0), 2) AS conversion_rate_percent
FROM public.campaigns c
LEFT JOIN (
    SELECT campaign_id, SUM(amount) AS actual_spent
    FROM public.campaign_daily_logs GROUP BY campaign_id
) logs ON logs.campaign_id = c.id
LEFT JOIN (
    SELECT campaign_id, COUNT(*) AS total_leads, COUNT(*) FILTER (WHERE stage = 'won') AS won_leads
    FROM public.leads WHERE campaign_id IS NOT NULL GROUP BY campaign_id
) leads ON leads.campaign_id = c.id;

CREATE OR REPLACE VIEW public.vw_kts_task_performance WITH (security_invoker = true) AS
SELECT
    t.id AS task_id,
    t.lead_id,
    t.lead_name,
    t.task_type,
    t.title,
    t.status,
    t.deadline,
    t.created_at AS assigned_at,
    t.started_at,
    t.completed_at,
    t.kts_id,
    t.kts_name,
    t.assignee_type,
    t.external_assignee_name,
    t.responsible_user_id,
    t.responsible_user_name,
    t.survey_address,
    t.assigner_id,
    t.assigner_name,
    ROUND(EXTRACT(EPOCH FROM (COALESCE(t.completed_at, NOW()) - t.created_at)) / 3600.0, 2) AS elapsed_hours,
    CASE WHEN t.completed_at IS NOT NULL THEN t.completed_at > t.deadline ELSE NOW() > t.deadline END AS is_overdue,
    t.result_note,
    t.result_file_link
FROM public.kts_tasks t;

GRANT SELECT ON public.vw_lead_pipeline, public.vw_contract_finance,
  public.vw_campaign_performance, public.vw_kts_task_performance
TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════
--  DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- ════════════════════════════════════════════════════════════════════════
INSERT INTO public.users (id, username, password, name, role, avatar) VALUES
('usr_luan', 'admin', '123', 'Tôn Thất Uyên Luận', 'manager', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60'),
('usr_hai', 'hai.ta', '123', 'Tạ Quốc Hải', 'sales', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=60'),
('usr_duong', 'duong.tran', '123', 'Trần Tùng Dương', 'marketing', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60'),
('usr_ketoan', 'ketoan', '123', 'Lê Thị Thu', 'accountant', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=60'),
('usr_long_tran', 'long.tran', '123', 'Trần Hữu Nhật Long', 'kts', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════
--  BẬT SUPABASE REALTIME (LIVE WEBSOCKET UPDATES TỨC THÌ CHO TẤT CẢ MÁY)
-- ════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.leads, 
      public.contracts, 
      public.contract_payments, 
      public.campaigns, 
      public.campaign_daily_logs, 
      public.appointments, 
      public.portfolio, 
      public.approvals, 
      public.notifications,
      public.kts_tasks,
      public.kts_logs;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
