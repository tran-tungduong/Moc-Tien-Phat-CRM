-- ════════════════════════════════════════════════════════════════════════
--  MỘC TIÊN PHÁT CRM & MARKETING - RELATIONAL POSTGRES DATABASE SCHEMA
--  Designed for Supabase, Multi-user Concurrency & Data Analytics (BI)
-- ════════════════════════════════════════════════════════════════════════

-- 1. Xóa các bảng cũ nếu tồn tại (Clean setup)
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
    interested_in TEXT,
    next_follow_up TIMESTAMP WITH TIME ZONE,
    survey_by TEXT,
    survey_date DATE,
    survey_note TEXT,
    fail_reason TEXT,
    failed_at_stage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Bảng LỊCH SỬ CHĂM SÓC LEAD (lead_history)
CREATE TABLE public.lead_history (
    id BIGSERIAL PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    user_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Bảng LỊCH SỬ SỬA THIẾT KẾ & BÁO GIÁ LẠI (lead_revisions)
CREATE TABLE public.lead_revisions (
    id BIGSERIAL PRIMARY KEY,
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
    items TEXT,
    rep_name TEXT,
    value NUMERIC(15,2) DEFAULT 0,
    signed_date DATE,
    expected_delivery DATE,
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

-- 13. Bảng THÔNG BÁO (notifications)
CREATE TABLE public.notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
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

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════
--  DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- ════════════════════════════════════════════════════════════════════════
INSERT INTO public.users (id, username, password, name, role, avatar) VALUES
('usr_luan', 'admin', '123', 'Tôn Thất Uyên Luận', 'manager', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60'),
('usr_hai', 'hai.ta', '123', 'Tạ Quốc Hải', 'sales', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=60'),
('usr_duong', 'duong.tran', '123', 'Trần Tùng Dương', 'marketing', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60'),
('usr_ketoan', 'ketoan', '123', 'Lê Thị Thu', 'accountant', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=60')
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
      public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

