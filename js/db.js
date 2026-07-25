// ═══════════════════════════════════════════════════════════
//  MTP CRM & Marketing — Database Layer
//  Schema: leads | contracts | campaigns | appointments | portfolio
// ═══════════════════════════════════════════════════════════

const DB_KEY = 'mtp_crm_db';

// ─── Supabase Configuration ────────────────────────────────
const SUPABASE_URL = 'https://gbwmwoceopbzytfgxoax.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qugJR8ves58URWg8Ad9wnw_422VjKCp';

let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized.');
  } catch (err) {
    console.error('Failed to initialize Supabase:', err);
  }
}

// ─── Default Seed Data ────────────────────────────────────
const DEFAULT_USERS = [
  { id: 'usr_luan', username: 'admin', password: '123', name: 'Tôn Thất Uyên Luận', role: 'manager', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60' },
  { id: 'usr_hai', username: 'hai.ta', password: '123', name: 'Tạ Quốc Hải', role: 'sales', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=60' },
  { id: 'usr_duong', username: 'duong.tran', password: '123', name: 'Trần Tùng Dương', role: 'marketing', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60' },
  { id: 'usr_ketoan', username: 'ketoan', password: '123', name: 'Lê Thị Thu', role: 'accountant', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=60' }
];

// Lead stages
export const LEAD_STAGES = [
  { id: 'new', label: 'Khách Mới', icon: 'fa-user-plus', color: '#64748B' },
  { id: 'survey', label: 'Khảo Sát Thực Địa', icon: 'fa-ruler-combined', color: '#3B82F6' },
  { id: 'design_draft', label: 'Thiết Kế Sơ Bộ', icon: 'fa-drafting-compass', color: '#8B5CF6' },
  { id: 'quote_sent', label: 'Gửi Báo Giá Sơ Bộ', icon: 'fa-file-invoice-dollar', color: '#F59E0B' },
  { id: 'negotiation', label: 'Sửa TK & Báo Giá Lại', icon: 'fa-sync-alt', color: '#EC4899' },
  { id: 'won', label: 'Chốt Hợp Đồng ✅', icon: 'fa-trophy', color: '#10B981' },
  { id: 'lost', label: 'Thất Bại (Fail) ❌', icon: 'fa-times-circle', color: '#EF4444' }
];

export const LEAD_SOURCES = [
  { id: 'facebook', label: 'Facebook', icon: 'fab fa-facebook', color: '#1877F2' },
  { id: 'zalo', label: 'Zalo', icon: 'fas fa-comment-dots', color: '#0068FF' },
  { id: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok', color: '#000000' },
  { id: 'google', label: 'Google', icon: 'fab fa-google', color: '#EA4335' },
  { id: 'referral', label: 'Giới thiệu', icon: 'fas fa-user-friends', color: '#8B5CF6' },
  { id: 'website', label: 'Website', icon: 'fas fa-globe', color: '#10B981' },
  { id: 'walkin', label: 'Khách vãng lai', icon: 'fas fa-store', color: '#F59E0B' },
  { id: 'other', label: 'Khác', icon: 'fas fa-ad', color: '#6B7280' }
];

export const CAMPAIGN_PLATFORMS = [
  { id: 'facebook', label: 'Facebook Ads', icon: 'fab fa-facebook', color: '#1877F2' },
  { id: 'zalo', label: 'Zalo OA', icon: 'fas fa-comment-dots', color: '#0068FF' },
  { id: 'tiktok', label: 'TikTok Ads', icon: 'fab fa-tiktok', color: '#000000' },
  { id: 'google', label: 'Google Ads', icon: 'fab fa-google', color: '#EA4335' },
  { id: 'youtube', label: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000' },
  { id: 'other', label: 'Khác', icon: 'fas fa-ad', color: '#6B7280' }
];

export const PORTFOLIO_CATEGORIES = [
  { id: 'kitchen', label: 'Phòng Bếp', icon: 'fa-utensils' },
  { id: 'bedroom', label: 'Phòng Ngủ', icon: 'fa-bed' },
  { id: 'livingroom', label: 'Phòng Khách', icon: 'fa-couch' },
  { id: 'bathroom', label: 'Phòng Tắm', icon: 'fa-bath' },
  { id: 'fullhouse', label: 'Toàn Nhà', icon: 'fa-home' },
  { id: 'other', label: 'Khác', icon: 'fa-th' }
];

// ─── DB Object ───────────────────────────────────────────
export const DB = {

  // ── Core Storage ──────────────────────────────────────
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return this._defaultDb();
      const db = JSON.parse(raw);
      // Ensure all collections exist
      if (!db.leads) db.leads = [];
      if (!db.contracts) db.contracts = [];
      if (!db.campaigns) db.campaigns = [];
      if (!db.appointments) db.appointments = [];
      if (!db.portfolio) db.portfolio = [];
      if (!db.approvals) db.approvals = [];
      if (!db.notifications) db.notifications = [];
      if (!db.systemLogs) db.systemLogs = [];
      return db;
    } catch {
      return this._defaultDb();
    }
  },

  _defaultDb() {
    return {
      users: DEFAULT_USERS,
      leads: [],
      contracts: [],
      campaigns: [],
      appointments: [],
      portfolio: [],
      approvals: [],
      notifications: [],
      systemLogs: []
    };
  },

  save(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (err) {
      console.error('LocalStorage save error:', err);
    }
    this._syncToServer(db);
  },

  _syncToServer(db) {
    if (supabaseClient) {
      supabaseClient.from('app_state')
        .upsert({ id: 1, data: db })
        .then(({ error }) => {
          if (error) console.error('Supabase sync save error:', error);
        });
    }

    const origin = window.location.origin;
    if (!origin.startsWith('file:')) {
      fetch(`${origin}/api/db/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db)
      }).catch(() => { });
    }
  },

  async syncWithServer(onSyncComplete = null) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('app_state').select('data').eq('id', 1).single();
        if (!error && data && data.data) {
          const serverDb = data.data;
          const localStr = localStorage.getItem(DB_KEY);
          const serverStr = JSON.stringify(serverDb);
          if (localStr !== serverStr) {
            localStorage.setItem(DB_KEY, serverStr);
            if (onSyncComplete) onSyncComplete(serverDb);
            return true;
          }
        }
      } catch (e) {
        console.warn('Supabase fetch failed, trying local server:', e);
      }
    }

    const origin = window.location.origin;
    if (origin.startsWith('file:')) return false;
    try {
      const res = await fetch(`${origin}/api/db`);
      if (!res.ok) return false;
      const serverDb = await res.json();
      if (!serverDb || serverDb.error) return false;

      const localStr = localStorage.getItem(DB_KEY);
      const serverStr = JSON.stringify(serverDb);
      if (localStr === serverStr) return false;

      localStorage.setItem(DB_KEY, serverStr);
      if (onSyncComplete) onSyncComplete(serverDb);
      return true;
    } catch {
      return false;
    }
  },

  // ── Auth ──────────────────────────────────────────────
  login(username, password) {
    const db = this.load();
    return db.users.find(u => u.username === username && u.password === password) || null;
  },

  getCurrentUser() {
    try {
      const sess = sessionStorage.getItem('mtp_session');
      if (sess) return JSON.parse(sess);
      const local = localStorage.getItem('mtp_session');
      if (local) {
        sessionStorage.setItem('mtp_session', local);
        return JSON.parse(local);
      }
      return null;
    } catch { return null; }
  },

  setCurrentUser(user) {
    const data = JSON.stringify(user);
    sessionStorage.setItem('mtp_session', data);
  },

  logout() {
    sessionStorage.removeItem('mtp_session');
    localStorage.removeItem('mtp_session');
  },

  // ── Users ─────────────────────────────────────────────
  getUsers() {
    return this.load().users;
  },

  getUserById(id) {
    return this.getUsers().find(u => u.id === id) || null;
  },

  // ── Leads ─────────────────────────────────────────────
  getLeads(userId = null, role = null) {
    const db = this.load();
    const leads = db.leads || [];
    if (role === 'sales' && userId) {
      return leads.filter(l => l.assignedTo === userId || !l.assignedTo);
    }
    return leads;
  },

  getLead(id) {
    return this.load().leads.find(l => l.id === id) || null;
  },

  findLeadByPhone(phone, excludeId = null) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 6) return null;
    const db = this.load();
    return db.leads.find(l => {
      if (excludeId && l.id === excludeId) return false;
      const p = (l.phone || '').replace(/\D/g, '');
      return p && (p === cleanPhone || (p.length >= 8 && cleanPhone.length >= 8 && p.slice(-8) === cleanPhone.slice(-8)));
    }) || null;
  },

  createLead(data, userId) {
    const db = this.load();
    const lead = {
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: data.name || '',
      phone: data.phone || '',
      source: data.source || 'other',
      campaignId: data.campaignId || '',
      stage: data.stage || 'new',
      assignedTo: data.assignedTo !== undefined ? data.assignedTo : userId,
      budget: data.budget || 0,
      note: data.note || '',
      address: data.address || '',
      interestedIn: data.interestedIn || '',
      nextFollowUp: data.nextFollowUp || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ timestamp: new Date().toISOString(), action: 'Tạo lead mới', user: this.getUserById(userId)?.name || 'Nhân viên' }]
    };
    db.leads.unshift(lead);
    this.save(db);
    return lead;
  },

  updateLead(id, data, userId) {
    const db = this.load();
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    const oldStage = db.leads[idx].stage;
    db.leads[idx] = { ...db.leads[idx], ...data, updatedAt: new Date().toISOString() };
    if (data.stage && data.stage !== oldStage) {
      const stageName = LEAD_STAGES.find(s => s.id === data.stage)?.label || data.stage;
      db.leads[idx].history = db.leads[idx].history || [];
      db.leads[idx].history.push({
        timestamp: new Date().toISOString(),
        action: `Chuyển giai đoạn → ${stageName}`,
        user: this.getUserById(userId)?.name || 'Nhân viên'
      });
    }
    this.save(db);
    return db.leads[idx];
  },

  deleteLead(id) {
    const db = this.load();
    db.leads = db.leads.filter(l => l.id !== id);
    this.save(db);
  },

  addLeadNote(leadId, note, userId) {
    const db = this.load();
    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) return;
    lead.note = note;
    lead.history = lead.history || [];
    lead.history.push({
      timestamp: new Date().toISOString(),
      action: `📝 ${note}`,
      user: this.getUserById(userId)?.name || 'Nhân viên'
    });
    lead.updatedAt = new Date().toISOString();
    this.save(db);
  },

  addLeadRevision(leadId, data, userId) {
    const db = this.load();
    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) return null;

    lead.revisions = lead.revisions || [];
    const revNum = (lead.revisions.length || 0) + 1;

    const revisionObj = {
      revNum,
      date: new Date().toISOString(),
      note: data.note || `Sửa thiết kế sơ bộ & báo giá lần ${revNum}`,
      quoteAmount: data.quoteAmount || 0,
      user: this.getUserById(userId)?.name || 'Nhân viên'
    };

    lead.revisions.push(revisionObj);
    lead.stage = 'negotiation'; // Move to Sửa TK & Báo Giá Lại
    if (data.quoteAmount) lead.budget = data.quoteAmount;
    lead.updatedAt = new Date().toISOString();

    lead.history = lead.history || [];
    lead.history.push({
      timestamp: new Date().toISOString(),
      action: `🔄 Sửa thiết kế sơ bộ & Báo giá lần ${revNum}: ${data.note || ''}`,
      user: this.getUserById(userId)?.name || 'Nhân viên'
    });

    this.save(db);
    return lead;
  },

  // ── Approvals & Edit Requests ────────────────────────────
  getApprovals(status = 'pending') {
    const db = this.load();
    db.approvals = db.approvals || [];
    if (status === 'all') return db.approvals;
    return db.approvals.filter(a => a.status === status);
  },

  createApprovalRequest(data, userId) {
    const db = this.load();
    db.approvals = db.approvals || [];
    const requester = this.getUserById(userId);
    const app = {
      id: 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: data.type || 'lead_edit',
      targetId: data.targetId,
      targetName: data.targetName || 'Khách Hàng',
      requesterId: userId,
      requesterName: requester?.name || 'Nhân Viên',
      changeSummary: data.changeSummary || 'Yêu cầu cập nhật thông tin',
      oldData: data.oldData || {},
      newData: data.newData || {},
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.approvals.unshift(app);
    this.save(db);
    return app;
  },

  approveRequest(approvalId, managerUserId) {
    const db = this.load();
    db.approvals = db.approvals || [];
    const app = db.approvals.find(a => a.id === approvalId);
    if (!app || app.status !== 'pending') return false;

    const manager = this.getUserById(managerUserId);
    app.status = 'approved';
    app.handledAt = new Date().toISOString();
    app.handledBy = manager?.name || 'Quản Lý';

    if (app.type === 'lead_edit' && app.targetId) {
      const lead = db.leads.find(l => l.id === app.targetId);
      if (lead) {
        Object.assign(lead, app.newData, { updatedAt: new Date().toISOString() });
        lead.history = lead.history || [];
        lead.history.push({
          timestamp: new Date().toISOString(),
          action: `✅ Quản lý ${manager?.name || ''} đã duyệt thay đổi thông tin (${app.changeSummary})`,
          user: manager?.name || 'Quản Lý'
        });
      }
    }

    this.save(db);
    return true;
  },

  rejectRequest(approvalId, managerUserId, reason = '') {
    const db = this.load();
    db.approvals = db.approvals || [];
    const app = db.approvals.find(a => a.id === approvalId);
    if (!app || app.status !== 'pending') return false;

    const manager = this.getUserById(managerUserId);
    app.status = 'rejected';
    app.handledAt = new Date().toISOString();
    app.handledBy = manager?.name || 'Quản Lý';
    app.rejectReason = reason;

    if (app.type === 'lead_edit' && app.targetId) {
      const lead = db.leads.find(l => l.id === app.targetId);
      if (lead) {
        lead.history = lead.history || [];
        lead.history.push({
          timestamp: new Date().toISOString(),
          action: `❌ Quản lý ${manager?.name || ''} đã từ chối yêu cầu thay đổi thông tin${reason ? `: ${reason}` : ''}`,
          user: manager?.name || 'Quản Lý'
        });
      }
    }

    this.save(db);
    return true;
  },

  // ── Contracts ─────────────────────────────────────────
  getContracts(userId = null, role = null) {
    const db = this.load();
    if (!userId || role === 'manager' || role === 'accountant') return db.contracts;
    return db.contracts.filter(c => c.assignedTo === userId);
  },

  getContract(id) {
    return this.load().contracts.find(c => c.id === id) || null;
  },

  createContract(data, userId) {
    const db = this.load();
    const count = (db.contracts || []).length + 1;
    const contract = {
      id: 'con_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      code: data.code || `MTP-${new Date().getFullYear()}/${String(count).padStart(3, '0')}`,
      leadId: data.leadId || '',
      customerName: data.customerName || '',
      phone: data.phone || '',
      idCard: data.idCard || '',
      address: data.address || '',
      items: data.items || '',
      repName: data.repName || 'Tôn Thất Uyên Luận (Giám Đốc)',
      value: data.value || 0,
      signedDate: data.signedDate || new Date().toISOString().split('T')[0],
      expectedDelivery: data.expectedDelivery || '',
      stage: data.stage || 'signed',
      assignedTo: data.assignedTo || userId,
      note: data.note || '',
      milestones: data.milestones || [],
      payments: [],
      createdAt: new Date().toISOString()
    };
    db.contracts.unshift(contract);
    this.save(db);
    return contract;
  },

  updateContract(id, data) {
    const db = this.load();
    const idx = db.contracts.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.contracts[idx] = { ...db.contracts[idx], ...data };
    this.save(db);
    return db.contracts[idx];
  },

  deleteContract(id) {
    const db = this.load();
    db.contracts = db.contracts.filter(c => c.id !== id);
    this.save(db);
  },

  addPayment(contractId, payment, collectorUser = null) {
    const db = this.load();
    const contract = db.contracts.find(c => c.id === contractId);
    if (!contract) return null;
    contract.payments = contract.payments || [];

    const newPayment = {
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      ...payment,
      createdAt: new Date().toISOString()
    };

    contract.payments.push(newPayment);

    // Create Notification for Admin/Manager
    db.notifications = db.notifications || [];
    const collectorName = collectorUser ? collectorUser.name : (payment.collectorName || 'Nhân viên');
    const isManager = collectorUser && collectorUser.role === 'manager';
    db.notifications.unshift({
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'new_payment',
      contractId: contract.id,
      contractCode: contract.code || 'MTP-2026/HĐ',
      customerName: contract.customerName || 'Khách Hàng',
      amount: payment.amount || 0,
      date: payment.date || new Date().toISOString().split('T')[0],
      note: payment.note || '',
      proofImage: payment.proofImage || '',
      collectorName: collectorName,
      status: isManager ? 'read' : 'unread',
      createdAt: new Date().toISOString()
    });

    this.save(db);
    return newPayment;
  },

  deletePayment(contractId, paymentId) {
    const db = this.load();
    const contract = db.contracts.find(c => c.id === contractId);
    if (!contract) return;
    contract.payments = (contract.payments || []).filter(p => p.id !== paymentId);
    this.save(db);
  },

  // ── Notifications ──────────────────────────────────────
  getNotifications(status = 'all') {
    const db = this.load();
    db.notifications = db.notifications || [];
    if (status === 'unread') {
      return db.notifications.filter(n => {
        if (n.status !== 'unread') return false;
        const collector = db.users.find(u => u.name === n.collectorName);
        if (collector && collector.role === 'manager') return false;
        return true;
      });
    }
    return db.notifications;
  },

  markNotificationRead(id) {
    const db = this.load();
    db.notifications = db.notifications || [];
    const notif = db.notifications.find(n => n.id === id);
    if (notif) {
      notif.status = 'read';
      this.save(db);
    }
  },

  markAllNotificationsRead() {
    const db = this.load();
    db.notifications = db.notifications || [];
    db.notifications.forEach(n => n.status = 'read');
    this.save(db);
  },

  // ── Campaigns ─────────────────────────────────────────
  getCampaigns() {
    const db = this.load();
    const campaigns = db.campaigns || [];
    const leads = db.leads || [];
    return campaigns.map(c => {
      const count = leads.filter(l => l.campaignId === c.id).length;
      const logsSpent = (c.dailyLogs || []).reduce((s, log) => s + (log.amount || 0), 0);
      const totalSpent = (c.dailyLogs && c.dailyLogs.length > 0) ? logsSpent : (c.spent || 0);
      return {
        ...c,
        spent: totalSpent,
        leadsGenerated: count
      };
    });
  },

  getCampaign(id) {
    return this.load().campaigns.find(c => c.id === id) || null;
  },

  createCampaign(data, userId) {
    const db = this.load();
    const campaign = {
      id: 'camp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: data.name || '',
      platform: data.platform || 'facebook',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      budget: data.budget || 0,
      spent: data.spent || 0,
      leadsGenerated: data.leadsGenerated || 0,
      status: data.status || 'active',
      assignedTo: data.assignedTo || userId,
      note: data.note || '',
      createdAt: new Date().toISOString()
    };
    db.campaigns.unshift(campaign);
    this.save(db);
    return campaign;
  },

  updateCampaign(id, data) {
    const db = this.load();
    const idx = db.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.campaigns[idx] = { ...db.campaigns[idx], ...data };
    this.save(db);
    return db.campaigns[idx];
  },

  deleteCampaign(id) {
    const db = this.load();
    db.campaigns = db.campaigns.filter(c => c.id !== id);
    this.save(db);
  },

  addCampaignDailyLog(campaignId, data, userId) {
    const db = this.load();
    const c = db.campaigns.find(x => x.id === campaignId);
    if (!c) return null;
    c.dailyLogs = c.dailyLogs || [];
    c.dailyLogs.unshift({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: data.date || new Date().toISOString().split('T')[0],
      amount: Number(data.amount) || 0,
      note: data.note || '',
      createdByName: this.getUserById(userId)?.name || 'Marketing',
      createdAt: new Date().toISOString()
    });
    c.spent = c.dailyLogs.reduce((s, log) => s + (log.amount || 0), 0);
    this.save(db);
    return c;
  },

  deleteCampaignDailyLog(campaignId, logId) {
    const db = this.load();
    const c = db.campaigns.find(x => x.id === campaignId);
    if (!c || !c.dailyLogs) return null;
    c.dailyLogs = c.dailyLogs.filter(l => l.id !== logId);
    c.spent = c.dailyLogs.reduce((s, log) => s + (log.amount || 0), 0);
    this.save(db);
    return c;
  },

  // ── Appointments ──────────────────────────────────────
  getAppointments(userId, role) {
    const db = this.load();
    if (!userId || role === 'manager') return db.appointments;
    if (role === 'sales' || role === 'marketing') {
      return db.appointments.filter(a => {
        if (a.assignedTo === userId || a.createdBy === userId) return true;
        if (a.assignedTo && a.assignedTo !== userId) return false;
        if (a.leadId) {
          const lead = db.leads.find(l => l.id === a.leadId);
          if (lead && lead.assignedTo === userId) return true;
        }
        return false;
      });
    }
    return db.appointments;
  },

  getAppointment(id) {
    return this.load().appointments.find(a => a.id === id) || null;
  },

  createAppointment(data, userId) {
    const db = this.load();
    let leadAssignee = '';
    let targetLead = null;
    if (data.leadId) {
      targetLead = db.leads.find(l => l.id === data.leadId);
      if (targetLead && targetLead.assignedTo) leadAssignee = targetLead.assignedTo;
    }

    const apt = {
      id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      leadId: data.leadId || '',
      leadName: data.leadName || (targetLead ? targetLead.name : ''),
      title: data.title || '',
      datetime: data.datetime || '',
      assignedTo: data.assignedTo || leadAssignee || userId,
      createdBy: userId,
      status: 'pending',
      note: data.note || '',
      createdAt: new Date().toISOString()
    };

    if (targetLead) {
      targetLead.history = targetLead.history || [];
      const userObj = this.getUserById(userId);
      targetLead.history.push({
        timestamp: new Date().toISOString(),
        action: `Đặt lịch hẹn: ${apt.title}`,
        user: userObj ? userObj.name : 'Nhân viên'
      });
    }

    db.appointments.unshift(apt);
    this.save(db);
    return apt;
  },

  updateAppointment(id, data, userId = null) {
    const db = this.load();
    const idx = db.appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const updateData = { ...data };
    if (data.status === 'done' || data.status === 'cancelled') {
      updateData.completedAt = new Date().toISOString();
      if (userId) updateData.completedBy = userId;
    }

    const oldApt = db.appointments[idx];
    db.appointments[idx] = { ...oldApt, ...updateData };

    if (oldApt.leadId) {
      const targetLead = db.leads.find(l => l.id === oldApt.leadId);
      if (targetLead) {
        targetLead.history = targetLead.history || [];
        const userObj = userId ? this.getUserById(userId) : null;
        let actionMsg = '';
        if (data.status === 'done') actionMsg = `Hoàn thành lịch hẹn: ${oldApt.title}`;
        else if (data.status === 'cancelled') actionMsg = `Hủy lịch hẹn: ${oldApt.title}`;

        if (actionMsg) {
          targetLead.history.push({
            timestamp: new Date().toISOString(),
            action: actionMsg,
            user: userObj ? userObj.name : 'Nhân viên'
          });
        }
      }
    }

    this.save(db);
    return db.appointments[idx];
  },

  deleteAppointment(id) {
    const db = this.load();
    db.appointments = db.appointments.filter(a => a.id !== id);
    this.save(db);
  },

  // ── Portfolio ─────────────────────────────────────────
  getPortfolio() {
    return this.load().portfolio;
  },

  createPortfolioItem(data) {
    const db = this.load();
    const item = {
      id: 'port_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: data.name || '',
      category: data.category || 'other',
      completedDate: data.completedDate || '',
      photos: data.photos || [],
      description: data.description || '',
      highlight: data.highlight || false,
      createdAt: new Date().toISOString()
    };
    db.portfolio.unshift(item);
    this.save(db);
    return item;
  },

  updatePortfolioItem(id, data) {
    const db = this.load();
    const idx = db.portfolio.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.portfolio[idx] = { ...db.portfolio[idx], ...data };
    this.save(db);
    return db.portfolio[idx];
  },

  deletePortfolioItem(id) {
    const db = this.load();
    db.portfolio = db.portfolio.filter(p => p.id !== id);
    this.save(db);
  },

  // ── Analytics ────────────────────────────────────────
  getAnalytics(userId = null, role = null) {
    const db = this.load();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const leads = (role === 'manager' || role === 'marketing' || role === 'accountant') ? db.leads : db.leads.filter(l => l.assignedTo === userId || l.createdBy === userId);
    const contracts = (role === 'manager' || role === 'accountant') ? db.contracts : db.contracts.filter(c => c.assignedTo === userId);
    const campaigns = this.getCampaigns();

    // Leads this month
    const leadsThisMonth = leads.filter(l => {
      const d = new Date(l.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    // Won leads
    const wonLeads = leads.filter(l => l.stage === 'won');
    const lostLeads = leads.filter(l => l.stage === 'lost');
    const winRate = (wonLeads.length + lostLeads.length) > 0
      ? Math.round(wonLeads.length / (wonLeads.length + lostLeads.length) * 100)
      : 0;

    // Revenue
    const totalRevenue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
    const collectedRevenue = contracts.reduce((sum, c) => {
      return sum + (c.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    }, 0);

    // Revenue this month
    const revenueThisMonth = contracts
      .filter(c => {
        const d = new Date(c.signedDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, c) => sum + (c.value || 0), 0);

    // Campaigns
    const totalCampaignBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
    const totalCampaignSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
    const totalLeadsFromCampaigns = campaigns.reduce((s, c) => s + (c.leadsGenerated || 0), 0);
    const avgCPL = totalLeadsFromCampaigns > 0 ? Math.round(totalCampaignSpent / totalLeadsFromCampaigns) : 0;

    // Leads by source
    const leadsBySource = {};
    leads.forEach(l => {
      leadsBySource[l.source] = (leadsBySource[l.source] || 0) + 1;
    });

    // Leads by stage
    const leadsByStage = {};
    LEAD_STAGES.forEach(s => {
      leadsByStage[s.id] = leads.filter(l => l.stage === s.id).length;
    });

    return {
      totalLeads: leads.length,
      leadsThisMonth: leadsThisMonth.length,
      winRate,
      wonLeads: wonLeads.length,
      lostLeads: lostLeads.length,
      totalRevenue,
      collectedRevenue,
      revenueThisMonth,
      totalContracts: contracts.length,
      totalCampaignBudget,
      totalCampaignSpent,
      totalLeadsFromCampaigns,
      avgCPL,
      leadsBySource,
      leadsByStage,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length
    };
  }
};
