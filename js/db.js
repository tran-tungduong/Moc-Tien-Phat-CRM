// ═══════════════════════════════════════════════════════════
//  MTP CRM & Marketing — Database Layer (Relational & Supabase Multi-user)
//  Schema: leads | contracts | campaigns | appointments | portfolio | approvals | notifications
// ═══════════════════════════════════════════════════════════

const DB_KEY = 'mtp_crm_db';
const SYNC_QUEUE_KEY = 'mtp_crm_sync_queue_v1';

// ─── Supabase Configuration ────────────────────────────────
const SUPABASE_URL = 'https://gbwmwoceopbzytfgxoax.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qugJR8ves58URWg8Ad9wnw_422VjKCp';

let supabaseClient = null;
if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized (Relational mode).');
  } catch (err) {
    console.error('Failed to initialize Supabase:', err);
  }
}

// ─── Default Seed Data ────────────────────────────────────
const DEFAULT_USERS = [
  { id: 'usr_luan', username: 'admin', password: '123', name: 'Tôn Thất Uyên Luận', role: 'manager', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60' },
  { id: 'usr_hai', username: 'hai.ta', password: '123', name: 'Tạ Quốc Hải', role: 'sales', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=60' },
  { id: 'usr_duong', username: 'duong.tran', password: '123', name: 'Trần Tùng Dương', role: 'marketing', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60' },
  { id: 'usr_ketoan', username: 'ketoan', password: '123', name: 'Lê Thị Thu', role: 'accountant', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=60' },
  { id: 'usr_long_tran', username: 'long.tran', password: '123', name: 'Trần Hữu Nhật Long', role: 'kts', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60' }
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

  _syncPromise: null,
  _realtimeSyncTimer: null,
  _mutationChains: new Map(),

  _getSyncQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  },

  _saveSyncQueue(queue) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue || []));
  },

  _queueMutation(mutation) {
    const id = mutation.id || mutation.payload?.id || 'all';
    const key = `${mutation.table}:${id}`;
    const queued = this._getSyncQueue().filter(item => item.key !== key);
    const entry = {
      ...mutation,
      id,
      key,
      mutationId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      queuedAt: new Date().toISOString()
    };
    queued.push(entry);
    this._saveSyncQueue(queued);
    return entry;
  },

  _removeQueuedMutation(entry) {
    const queued = this._getSyncQueue().filter(item => item.mutationId !== entry.mutationId);
    this._saveSyncQueue(queued);
  },

  async _sendMutation(entry, persistBeforeSend = true) {
    const queuedEntry = persistBeforeSend ? this._queueMutation(entry) : entry;
    if (!supabaseClient) return false;
    const previous = this._mutationChains.get(queuedEntry.key) || Promise.resolve();
    const current = previous.catch(() => false).then(async () => {
      try {
        let result;
        if (queuedEntry.operation === 'delete') {
          result = await supabaseClient.from(queuedEntry.table).delete().eq('id', queuedEntry.id);
        } else {
          result = await supabaseClient.from(queuedEntry.table).upsert(
            queuedEntry.payload,
            { onConflict: queuedEntry.onConflict || 'id' }
          );
        }
        if (result?.error) throw result.error;
        this._removeQueuedMutation(queuedEntry);
        return true;
      } catch (err) {
        console.error(`Supabase ${queuedEntry.operation} failed on ${queuedEntry.table}:`, err);
        return false;
      }
    });
    this._mutationChains.set(queuedEntry.key, current);
    const success = await current;
    if (this._mutationChains.get(queuedEntry.key) === current) {
      this._mutationChains.delete(queuedEntry.key);
    }
    return success;
  },

  _upsert(table, payload, options = {}) {
    const idField = options.idField || 'id';
    const id = payload?.[idField];
    if (!id) return Promise.resolve(false);
    return this._sendMutation({ table, operation: 'upsert', id, payload, onConflict: options.onConflict || idField });
  },

  _delete(table, id) {
    if (!id) return Promise.resolve(false);
    return this._sendMutation({ table, operation: 'delete', id });
  },

  async _flushSyncQueue() {
    if (!supabaseClient) return false;
    const queued = this._getSyncQueue();
    for (const entry of queued) {
      await this._sendMutation(entry, false);
    }
    return this._getSyncQueue().length === 0;
  },

  // ── Core Storage ──────────────────────────────────────
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return this._defaultDb();
      const db = JSON.parse(raw);
      // Ensure all collections exist
      if (!db.users || db.users.length === 0) {
        db.users = DEFAULT_USERS;
      } else {
        // Auto-merge missing default users (e.g. long.tran) into local storage
        DEFAULT_USERS.forEach(defU => {
          const idx = db.users.findIndex(u => u.id === defU.id || u.username === defU.username);
          if (idx === -1) {
            db.users.push(defU);
          } else {
            if (defU.username === 'long.tran') {
              db.users[idx] = { ...db.users[idx], ...defU };
            }
          }
        });
      }
      if (!db.leads) db.leads = [];
      if (!db.contracts) db.contracts = [];
      if (!db.campaigns) db.campaigns = [];
      if (!db.appointments) db.appointments = [];
      if (!db.portfolio) db.portfolio = [];
      if (!db.approvals) db.approvals = [];
      if (!db.notifications) db.notifications = [];
      if (!db.ktsLogs) db.ktsLogs = [];
      if (!db.ktsTasks) db.ktsTasks = [];
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
      ktsLogs: [],
      ktsTasks: [],
      systemLogs: []
    };
  },

  save(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (err) {
      console.error('LocalStorage save error:', err);
    }
  },

  // saveToServer is no-op on GitHub Pages (data saved row-by-row via Supabase helpers)
  async saveToServer() {
    // No-op: all data is synced to Supabase row-by-row in real time
    return;
  },

  // ── Supabase Relational Row-Level Sync Helpers ────────
  async syncWithServer(onSyncComplete = null) {
    if (!supabaseClient) {
      // No Supabase and no Python server on GitHub Pages — use localStorage only
      const cached = this.load();
      if (onSyncComplete) onSyncComplete(cached);
      return false;
    }

    if (this._syncPromise) return this._syncPromise;
    this._syncPromise = (async () => {
    try {
      // Gửi các thay đổi local còn tồn đọng trước khi tải snapshot mới.
      // Nếu chưa ghi được thì giữ nguyên cache để tránh mất dữ liệu optimistic.
      const queueFlushed = await this._flushSyncQueue();
      if (!queueFlushed) {
        console.warn('Supabase sync paused: pending mutations are not uploaded yet.');
        return false;
      }

      // Pull relational tables from Supabase in parallel
      const results = await Promise.all([
        supabaseClient.from('users').select('*'),
        supabaseClient.from('leads').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('lead_history').select('*').order('timestamp', { ascending: true }),
        supabaseClient.from('lead_revisions').select('*').order('date', { ascending: true }),
        supabaseClient.from('contracts').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('contract_payments').select('*').order('created_at', { ascending: true }),
        supabaseClient.from('campaigns').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('campaign_daily_logs').select('*').order('date', { ascending: false }),
        supabaseClient.from('appointments').select('*').order('datetime', { ascending: true }),
        supabaseClient.from('portfolio').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('approvals').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('notifications').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('kts_tasks').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('kts_logs').select('*').order('created_at', { ascending: false })
      ]);
      const tableNames = ['users', 'leads', 'lead_history', 'lead_revisions', 'contracts', 'contract_payments', 'campaigns', 'campaign_daily_logs', 'appointments', 'portfolio', 'approvals', 'notifications', 'kts_tasks', 'kts_logs'];
      results.forEach((result, index) => {
        if (result.error) throw new Error(`${tableNames[index]}: ${result.error.message}`);
      });
      const [users, leads, leadHistory, leadRevisions, contracts, payments, campaigns, dailyLogs, appointments, portfolio, approvals, notifications, ktsTasks, ktsLogs] = results.map(result => result.data || []);

      const db = this.load();

      if (users && users.length > 0) {
        const fetchedUsers = users.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          name: u.name,
          role: u.role,
          avatar: u.avatar
        }));
        db.users = fetchedUsers;
      } else {
        // Fallback: seed DEFAULT_USERS to Supabase if table is empty
        for (const defU of DEFAULT_USERS) {
          await supabaseClient.from('users').upsert({
            id: defU.id,
            username: defU.username,
            password: defU.password,
            name: defU.name,
            role: defU.role,
            avatar: defU.avatar || ''
          });
        }
        db.users = DEFAULT_USERS;
      }

      if (leads) {
        const localDb = this.load();
        db.leads = leads.map(l => {
          const localLead = localDb.leads.find(item => item.id === l.id);
          const remoteTime = new Date(l.updated_at || 0).getTime();
          const localTime = localLead ? new Date(localLead.updatedAt || 0).getTime() : 0;

          if (localLead && localTime > remoteTime) {
            this._pushLeadToSupabase(localLead);
            return localLead;
          }

          const history = (leadHistory || []).filter(h => h.lead_id === l.id).map(h => ({
            eventId: h.event_key || String(h.id),
            timestamp: h.timestamp,
            action: h.action,
            user: h.user_name
          }));
          const revisions = (leadRevisions || []).filter(r => r.lead_id === l.id).map(r => ({
            eventId: r.event_key || String(r.id),
            revNum: r.rev_num,
            date: r.date,
            note: r.note,
            quoteAmount: r.quote_amount,
            user: r.user_name
          }));
          return {
            id: l.id,
            name: l.name,
            phone: l.phone || '',
            source: l.source || 'other',
            campaignId: l.campaign_id || '',
            stage: l.stage || 'new',
            assignedTo: l.assigned_to || '',
            budget: Number(l.budget) || 0,
            note: l.note || '',
            address: l.address || '',
            homeAddress: l.home_address || '',
            interestedIn: l.interested_in || '',
            nextFollowUp: l.next_follow_up || '',
            surveyBy: l.survey_by || '',
            surveyDate: l.survey_date || '',
            surveyNote: l.survey_note || '',
            failReason: l.fail_reason || '',
            failedAtStage: l.failed_at_stage || '',
            createdAt: l.created_at,
            updatedAt: l.updated_at || localLead?.updatedAt || new Date().toISOString(),
            history: (history && history.length > 0) ? history : (localLead?.history || []),
            revisions: (revisions && revisions.length > 0) ? revisions : (localLead?.revisions || [])
          };
        });

      }

      if (contracts) {
        db.contracts = contracts.map(c => {
          const cPayments = (payments || []).filter(p => p.contract_id === c.id).map(p => ({
            id: p.id,
            amount: Number(p.amount) || 0,
            date: p.date,
            type: p.payment_type || 'installment',
            method: p.method || 'cash',
            collectorName: p.collector_name || '',
            note: p.note || '',
            proofImage: p.proof_image || '',
            createdAt: p.created_at
          }));
          return {
            id: c.id,
            code: c.code,
            leadId: c.lead_id || '',
            customerName: c.customer_name || '',
            phone: c.phone || '',
            idCard: c.id_card || '',
            address: c.address || '',
            homeAddress: c.home_address || '',
            items: c.items || '',
            repName: c.rep_name || '',
            value: Number(c.value) || 0,
            signedDate: c.signed_date || '',
            expectedDelivery: c.expected_delivery || '',
            constructionDays: Number(c.construction_days) || 0,
            stage: c.stage || 'signed',
            assignedTo: c.assigned_to || '',
            note: c.note || '',
            milestones: c.milestones || [],
            payments: cPayments,
            createdAt: c.created_at
          };
        });
      }

      if (campaigns) {
        db.campaigns = campaigns.map(c => {
          const logs = (dailyLogs || []).filter(dl => dl.campaign_id === c.id).map(dl => ({
            id: dl.id,
            date: dl.date,
            amount: Number(dl.amount) || 0,
            note: dl.note || '',
            createdByName: dl.created_by_name || 'Marketing',
            createdAt: dl.created_at
          }));
          return {
            id: c.id,
            name: c.name,
            platform: c.platform || 'facebook',
            startDate: c.start_date || '',
            endDate: c.end_date || '',
            budget: Number(c.budget) || 0,
            spent: Number(c.spent) || 0,
            status: c.status || 'active',
            assignedTo: c.assigned_to || '',
            note: c.note || '',
            dailyLogs: logs,
            createdAt: c.created_at
          };
        });
      }

      if (appointments) {
        db.appointments = appointments.map(a => ({
          id: a.id,
          leadId: a.lead_id || '',
          leadName: a.lead_name || '',
          title: a.title,
          datetime: a.datetime,
          assignedTo: a.assigned_to || '',
          createdBy: a.created_by || '',
          status: a.status || 'pending',
          note: a.note || '',
          completedAt: a.completed_at || '',
          completedBy: a.completed_by || '',
          appointmentType: a.appointment_type || 'general',
          ktsTaskId: a.kts_task_id || '',
          createdAt: a.created_at
        }));
      }

      if (portfolio) {
        db.portfolio = portfolio.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category || 'other',
          completedDate: p.completed_date || '',
          photos: p.photos || [],
          description: p.description || '',
          highlight: p.highlight || false,
          createdAt: p.created_at
        }));
      }

      if (approvals) {
        db.approvals = approvals.map(ap => ({
          id: ap.id,
          type: ap.type || 'lead_edit',
          targetId: ap.target_id,
          targetName: ap.target_name || '',
          requesterId: ap.requester_id,
          requesterName: ap.requester_name || '',
          changeSummary: ap.change_summary || '',
          oldData: ap.old_data || {},
          newData: ap.new_data || {},
          status: ap.status || 'pending',
          rejectReason: ap.reject_reason || '',
          handledBy: ap.handled_by || '',
          handledAt: ap.handled_at || '',
          createdAt: ap.created_at
        }));
      }

      if (notifications) {
        db.notifications = notifications
          .filter(n => {
            if (n.type === 'new_payment' && !n.customer_name && (!n.amount || Number(n.amount) === 0) && !n.collector_name) return false;
            if (!n.title && !n.message && !n.customer_name && (!n.amount || Number(n.amount) === 0)) return false;
            return true;
          })
          .map(n => ({
            id: n.id,
            userId: n.user_id || '',
            type: n.type,
            title: n.title || '',
            message: n.message || '',
            targetId: n.target_id || '',
            contractId: n.contract_id || '',
            contractCode: n.contract_code || '',
            customerName: n.customer_name || '',
            amount: Number(n.amount) || 0,
            date: n.date || '',
            note: n.note || '',
            proofImage: n.proof_image || '',
            collectorName: n.collector_name || '',
            status: n.status || 'unread',
            createdAt: n.created_at
          }));
      }

      if (ktsTasks) {
        db.ktsTasks = ktsTasks.map(t => ({
          id: t.id,
          leadId: t.lead_id || '',
          leadName: t.lead_name || '',
          assignerId: t.assigner_id || '',
          assignerName: t.assigner_name || '',
          ktsId: t.kts_id || '',
          ktsName: t.kts_name || '',
          assigneeType: t.assignee_type || 'internal',
          externalAssigneeName: t.external_assignee_name || '',
          externalAssigneePhone: t.external_assignee_phone || '',
          externalAssigneeUnit: t.external_assignee_unit || '',
          responsibleUserId: t.responsible_user_id || t.assigner_id || '',
          responsibleUserName: t.responsible_user_name || t.assigner_name || '',
          surveyAddress: t.survey_address || '',
          surveyContactName: t.survey_contact_name || '',
          surveyContactPhone: t.survey_contact_phone || '',
          appointmentId: t.appointment_id || '',
          taskType: t.task_type || '',
          title: t.title || '',
          requirement: t.requirement || '',
          status: t.status || 'pending',
          deadline: t.deadline || '',
          startedAt: t.started_at || '',
          completedAt: t.completed_at || '',
          completedNote: t.completed_note || '',
          resultNote: t.result_note || t.completed_note || '',
          resultFileLink: t.result_file_link || '',
          resultImage: t.result_image || '',
          history: Array.isArray(t.history) ? t.history : [],
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
      }

      if (ktsLogs) {
        db.ktsLogs = ktsLogs.map(l => ({
          id: l.id,
          userId: l.user_id || '',
          userName: l.user_name || '',
          projectName: l.project_name || '',
          taskType: l.task_type || '',
          date: l.date || '',
          progress: l.progress || '',
          note: l.note || l.description || '',
          attachments: l.attachments || '',
          fileLink: l.file_link || '',
          hoursSpent: Number(l.hours_spent) || 0,
          description: l.description || '',
          filesCount: Number(l.files_count) || 0,
          createdAt: l.created_at,
          updatedAt: l.updated_at
        }));
      }

      this.save(db);
      if (onSyncComplete) onSyncComplete(db);
      return true;
    } catch (err) {
      console.error('Supabase sync error:', err);
      return false;
    } finally {
      this._syncPromise = null;
    }
    })();
    return this._syncPromise;
  },

  _addLeadHistory(lead, actionText, userName) {
    if (!lead || !actionText) return null;
    lead.history = lead.history || [];
    const lastH = lead.history[lead.history.length - 1];
    if (lastH && lastH.action === actionText && lastH.user === userName) {
      const diffMs = Math.abs(new Date().getTime() - new Date(lastH.timestamp || 0).getTime());
      if (diffMs < 3000) return null; // Prevent duplicate within 3 seconds
    }
    const newH = {
      eventId: 'hist_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      action: actionText,
      user: userName || 'Nhân viên'
    };
    lead.history.push(newH);
    return newH;
  },

  // Row-level push helpers
  async _pushLeadToSupabase(lead, newHistoryItem = null) {
    if (!lead) return;
    try {
      const saved = await this._upsert('leads', {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        campaign_id: lead.campaignId || null,
        stage: lead.stage,
        assigned_to: lead.assignedTo || null,
        budget: lead.budget,
        note: lead.note,
        address: lead.address,
        home_address: lead.homeAddress || null,
        interested_in: lead.interestedIn,
        next_follow_up: lead.nextFollowUp || null,
        survey_by: lead.surveyBy || null,
        survey_date: lead.surveyDate || null,
        survey_note: lead.surveyNote || null,
        fail_reason: lead.failReason || null,
        failed_at_stage: lead.failedAtStage || null,
        created_at: lead.createdAt,
        updated_at: lead.updatedAt
      });

      if (newHistoryItem) {
        const historyPayload = {
          event_key: newHistoryItem.eventId || `hist_${lead.id}_${new Date(newHistoryItem.timestamp || Date.now()).getTime()}`,
          lead_id: lead.id,
          action: newHistoryItem.action,
          user_name: newHistoryItem.user,
          timestamp: newHistoryItem.timestamp || new Date().toISOString()
        };
        await this._upsert('lead_history', historyPayload, { idField: 'event_key' });
      }
      return saved;
    } catch (err) {
      console.error('Push lead error:', err);
      return false;
    }
  },

  async _deleteLeadFromSupabase(id) {
    if (!id) return;
    return this._delete('leads', id);
  },

  async _pushContractToSupabase(contract) {
    if (!contract) return;
    try {
      return await this._upsert('contracts', {
        id: contract.id,
        code: contract.code,
        lead_id: contract.leadId || null,
        customer_name: contract.customerName,
        phone: contract.phone,
        id_card: contract.idCard,
        address: contract.address,
        home_address: contract.homeAddress || null,
        items: contract.items,
        rep_name: contract.repName,
        value: contract.value,
        signed_date: contract.signedDate || null,
        expected_delivery: contract.expectedDelivery || null,
        construction_days: Number(contract.constructionDays) || 0,
        stage: contract.stage,
        assigned_to: contract.assignedTo || null,
        note: contract.note,
        milestones: contract.milestones || [],
        created_at: contract.createdAt
      });
    } catch (err) { console.error('Push contract error:', err); }
  },

  async _deleteContractFromSupabase(id) {
    if (!id) return;
    return this._delete('contracts', id);
  },

  async _pushPaymentToSupabase(payment, contractId) {
    if (!payment) return;
    try {
      return await this._upsert('contract_payments', {
        id: payment.id,
        contract_id: contractId,
        amount: payment.amount,
        date: payment.date || null,
        payment_type: payment.type || 'installment',
        method: payment.method || 'cash',
        collector_name: payment.collectorName,
        note: payment.note,
        proof_image: payment.proofImage,
        created_at: payment.createdAt
      });
    } catch (err) { console.error('Push payment error:', err); }
  },

  async _deletePaymentFromSupabase(paymentId) {
    if (!paymentId) return;
    return this._delete('contract_payments', paymentId);
  },

  async _pushCampaignToSupabase(campaign) {
    if (!campaign) return;
    try {
      return await this._upsert('campaigns', {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        start_date: campaign.startDate || null,
        end_date: campaign.endDate || null,
        budget: campaign.budget,
        spent: campaign.spent,
        status: campaign.status,
        assigned_to: campaign.assignedTo || null,
        note: campaign.note,
        created_at: campaign.createdAt
      });
    } catch (err) { console.error('Push campaign error:', err); }
  },

  async _deleteCampaignFromSupabase(id) {
    if (!id) return;
    return this._delete('campaigns', id);
  },

  async _pushCampaignLogToSupabase(log, campaignId) {
    if (!log) return;
    try {
      return await this._upsert('campaign_daily_logs', {
        id: log.id,
        campaign_id: campaignId,
        date: log.date,
        amount: log.amount,
        note: log.note,
        created_by_name: log.createdByName,
        created_at: log.createdAt
      });
    } catch (err) { console.error('Push campaign log error:', err); }
  },

  async _deleteCampaignLogFromSupabase(logId) {
    if (!logId) return;
    return this._delete('campaign_daily_logs', logId);
  },

  async _pushAppointmentToSupabase(apt) {
    if (!apt) return;
    try {
      return await this._upsert('appointments', {
        id: apt.id,
        lead_id: apt.leadId || null,
        lead_name: apt.leadName,
        title: apt.title,
        datetime: apt.datetime,
        assigned_to: apt.assignedTo || null,
        created_by: apt.createdBy || null,
        status: apt.status,
        note: apt.note,
        completed_at: apt.completedAt || null,
        completed_by: apt.completedBy || null,
        appointment_type: apt.appointmentType || 'general',
        kts_task_id: apt.ktsTaskId || null,
        created_at: apt.createdAt
      });
    } catch (err) { console.error('Push appointment error:', err); }
  },

  async _deleteAppointmentFromSupabase(id) {
    if (!id) return;
    return this._delete('appointments', id);
  },

  async _pushPortfolioToSupabase(item) {
    if (!item) return;
    try {
      return await this._upsert('portfolio', {
        id: item.id,
        name: item.name,
        category: item.category,
        completed_date: item.completedDate || null,
        photos: item.photos || [],
        description: item.description,
        highlight: item.highlight || false,
        created_at: item.createdAt
      });
    } catch (err) { console.error('Push portfolio error:', err); }
  },

  async _deletePortfolioFromSupabase(id) {
    if (!id) return;
    return this._delete('portfolio', id);
  },

  async _pushApprovalToSupabase(app) {
    if (!app) return;
    try {
      return await this._upsert('approvals', {
        id: app.id,
        type: app.type,
        target_id: app.targetId,
        target_name: app.targetName,
        requester_id: app.requesterId,
        requester_name: app.requesterName,
        change_summary: app.changeSummary,
        old_data: app.oldData || {},
        new_data: app.newData || {},
        status: app.status,
        reject_reason: app.rejectReason || null,
        handled_by: app.handledBy || null,
        handled_at: app.handledAt || null,
        created_at: app.createdAt
      });
    } catch (err) { console.error('Push approval error:', err); }
  },

  async _pushNotificationToSupabase(notif) {
    if (!notif) return;
    try {
      return await this._upsert('notifications', {
        id: notif.id,
        user_id: notif.userId || null,
        type: notif.type,
        title: notif.title || null,
        message: notif.message || null,
        target_id: notif.targetId || null,
        contract_id: notif.contractId || null,
        contract_code: notif.contractCode || null,
        customer_name: notif.customerName || null,
        amount: notif.amount || 0,
        date: notif.date || null,
        note: notif.note || null,
        proof_image: notif.proofImage || null,
        collector_name: notif.collectorName || null,
        status: notif.status || 'unread',
        created_at: notif.createdAt
      });
    } catch (err) { console.error('Push notification error:', err); }
  },

  async _pushKtsTaskToSupabase(task) {
    if (!task) return;
    const fullPayload = {
      id: task.id,
      lead_id: task.leadId || null,
      lead_name: task.leadName || null,
      assigner_id: task.assignerId || null,
      assigner_name: task.assignerName || null,
      kts_id: task.ktsId || null,
      kts_name: task.ktsName || null,
      assignee_type: task.assigneeType || 'internal',
      external_assignee_name: task.externalAssigneeName || null,
      external_assignee_phone: task.externalAssigneePhone || null,
      external_assignee_unit: task.externalAssigneeUnit || null,
      responsible_user_id: task.responsibleUserId || task.assignerId || null,
      responsible_user_name: task.responsibleUserName || task.assignerName || null,
      survey_address: task.surveyAddress || null,
      survey_contact_name: task.surveyContactName || null,
      survey_contact_phone: task.surveyContactPhone || null,
      appointment_id: task.appointmentId || null,
      task_type: task.taskType || '',
      title: task.title || '',
      requirement: task.requirement || null,
      status: task.status || 'pending',
      deadline: task.deadline || null,
      started_at: task.startedAt || null,
      completed_at: task.completedAt || null,
      completed_note: task.completedNote || task.resultNote || null,
      result_note: task.resultNote || task.completedNote || null,
      result_file_link: task.resultFileLink || null,
      result_image: task.resultImage || null,
      history: Array.isArray(task.history) ? task.history : [],
      created_at: task.createdAt,
      updated_at: task.updatedAt || task.createdAt
    };
    return this._upsert('kts_tasks', fullPayload);
  },

  async _deleteKtsTaskFromSupabase(id) {
    if (!id) return;
    return this._delete('kts_tasks', id);
  },

  async _pushKtsLogToSupabase(log) {
    if (!log) return;
    try {
      return await this._upsert('kts_logs', {
        id: log.id,
        user_id: log.userId || null,
        user_name: log.userName || null,
        project_name: log.projectName || null,
        task_type: log.taskType || null,
        date: log.date || null,
        progress: log.progress || null,
        note: log.note || log.description || null,
        attachments: log.attachments || null,
        file_link: log.fileLink || null,
        hours_spent: log.hoursSpent || 0,
        description: log.description || log.note || null,
        files_count: log.filesCount || (log.attachments ? 1 : 0),
        created_at: log.createdAt,
        updated_at: log.updatedAt || log.createdAt
      });
    } catch (err) { console.error('Push kts_log error:', err); }
  },

  // ── Auth ──────────────────────────────────────────────
  async login(username, password) {
    const uName = (username || '').trim();
    const pWord = (password || '').trim();

    // 1. Try Supabase first (source of truth)
    if (supabaseClient) {
      try {
        const { data: users, error } = await supabaseClient
          .from('users')
          .select('*')
          .eq('username', uName)
          .eq('password', pWord)
          .limit(1);
        if (!error && users && users.length > 0) {
          const u = users[0];
          const user = { id: u.id, username: u.username, password: u.password, name: u.name, role: u.role, avatar: u.avatar };
          // Update localStorage cache
          const db = this.load();
          const idx = db.users.findIndex(x => x.id === user.id);
          if (idx >= 0) db.users[idx] = user; else db.users.push(user);
          localStorage.setItem(DB_KEY, JSON.stringify(db));
          return user;
        }
        // Supabase responded but no match — wrong credentials
        if (!error) return null;
      } catch (err) {
        console.warn('Supabase login failed, falling back to localStorage:', err);
      }
    }

    // 2. Fallback: localStorage cache (Supabase unreachable)
    const db = this.load();
    return db.users.find(u => u.username === uName && u.password === pWord) || null;
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
      assignedTo: (data.assignedTo && data.assignedTo.trim()) ? data.assignedTo : userId,
      budget: data.budget || 0,
      note: data.note || '',
      address: data.address || '',
      homeAddress: data.homeAddress || '',
      interestedIn: data.interestedIn || '',
      nextFollowUp: data.nextFollowUp || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: []
    };
    const userName = this.getUserById(userId)?.name || 'Nhân viên';
    const newH = this._addLeadHistory(lead, 'Tạo lead mới', userName);
    db.leads.unshift(lead);
    this.save(db);
    this._pushLeadToSupabase(lead, newH);
    return lead;
  },

  updateLead(id, data, userId) {
    const db = this.load();
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    const oldStage = db.leads[idx].stage;
    const oldAssignee = db.leads[idx].assignedTo;
    db.leads[idx] = { ...db.leads[idx], ...data, updatedAt: new Date().toISOString() };
    let newH = null;
    const userName = this.getUserById(userId)?.name || 'Nhân viên';

    if (data.stage && data.stage !== oldStage) {
      const stageName = LEAD_STAGES.find(s => s.id === data.stage)?.label || data.stage;
      newH = this._addLeadHistory(db.leads[idx], `Chuyển giai đoạn → ${stageName}`, userName);
    } else if (data.assignedTo !== undefined && data.assignedTo !== oldAssignee) {
      const newAssignee = this.getUserById(data.assignedTo);
      const actionText = newAssignee ? `Phân công phụ trách cho ${newAssignee.name}` : 'Đưa về danh sách chưa phân công';
      newH = this._addLeadHistory(db.leads[idx], actionText, userName);
    }

    this.save(db);
    this._pushLeadToSupabase(db.leads[idx], newH);
    return db.leads[idx];
  },

  deleteLead(id) {
    const db = this.load();
    db.leads = db.leads.filter(l => l.id !== id);
    this.save(db);
    this._deleteLeadFromSupabase(id);
  },

  addLeadNote(leadId, note, userId) {
    const db = this.load();
    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) return;
    lead.note = note;
    const userName = this.getUserById(userId)?.name || 'Nhân viên';
    const newH = this._addLeadHistory(lead, `📝 ${note}`, userName);
    lead.updatedAt = new Date().toISOString();
    this.save(db);
    this._pushLeadToSupabase(lead, newH);
  },

  addLeadHistory(leadId, actionText, userName = 'Nhân viên') {
    const db = this.load();
    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) return;
    const newH = this._addLeadHistory(lead, actionText, userName);
    lead.updatedAt = new Date().toISOString();
    this.save(db);
    this._pushLeadToSupabase(lead, newH);
  },

  addLeadRevision(leadId, data, userId) {
    const db = this.load();
    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) return null;

    lead.revisions = lead.revisions || [];
    const noteText = data.note || '';

    // Ignore duplicate rapid submit within 3 seconds
    const lastRev = lead.revisions[lead.revisions.length - 1];
    if (lastRev && (lastRev.note === noteText || lastRev.note === `Sửa thiết kế sơ bộ & báo giá lần ${lead.revisions.length}`)) {
      const diffMs = Math.abs(new Date().getTime() - new Date(lastRev.date || 0).getTime());
      if (diffMs < 3000) return lead;
    }

    const revNum = (lead.revisions.length || 0) + 1;
    const userName = this.getUserById(userId)?.name || 'Nhân viên';

    const revisionObj = {
      eventId: 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      revNum,
      date: new Date().toISOString(),
      note: noteText || `Sửa thiết kế sơ bộ & báo giá lần ${revNum}`,
      quoteAmount: data.quoteAmount || 0,
      user: userName
    };

    lead.revisions.push(revisionObj);
    lead.stage = 'negotiation'; // Move to Sửa TK & Báo Giá Lại
    if (data.quoteAmount) lead.budget = data.quoteAmount;
    lead.updatedAt = new Date().toISOString();

    const newH = this._addLeadHistory(lead, `🔄 Sửa thiết kế sơ bộ & Báo giá lần ${revNum}: ${revisionObj.note}`, userName);

    this.save(db);
    this._pushLeadToSupabase(lead, newH);
    this._upsert('lead_revisions', {
        event_key: revisionObj.eventId,
        lead_id: leadId,
        rev_num: revNum,
        quote_amount: data.quoteAmount || 0,
        note: revisionObj.note,
        user_name: revisionObj.user,
        date: revisionObj.date
      }, { idField: 'event_key' });
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
    this._pushApprovalToSupabase(app);
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
        const managerName = manager?.name || 'Quản Lý';
        const newH = this._addLeadHistory(lead, `✅ Quản lý ${managerName} đã duyệt thay đổi thông tin (${app.changeSummary})`, managerName);
        this._pushLeadToSupabase(lead, newH);
      }
    }

    this.save(db);
    this._pushApprovalToSupabase(app);
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
        const managerName = manager?.name || 'Quản Lý';
        const newH = this._addLeadHistory(lead, `❌ Quản lý ${managerName} đã từ chối yêu cầu thay đổi thông tin${reason ? `: ${reason}` : ''}`, managerName);
        this._pushLeadToSupabase(lead, newH);
      }
    }

    this.save(db);
    this._pushApprovalToSupabase(app);
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
      homeAddress: data.homeAddress || '',
      items: data.items || '',
      repName: data.repName || 'Tôn Thất Uyên Luận (Giám Đốc)',
      value: data.value || 0,
      signedDate: data.signedDate || new Date().toISOString().split('T')[0],
      expectedDelivery: data.expectedDelivery || '',
      constructionDays: Number(data.constructionDays) || 0,
      stage: data.stage || 'signed',
      assignedTo: data.assignedTo || userId,
      note: data.note || '',
      milestones: data.milestones || [],
      payments: [],
      createdAt: new Date().toISOString()
    };
    db.contracts.unshift(contract);
    this.save(db);
    this._pushContractToSupabase(contract);
    return contract;
  },

  updateContract(id, data) {
    const db = this.load();
    const idx = db.contracts.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.contracts[idx] = { ...db.contracts[idx], ...data };
    this.save(db);
    this._pushContractToSupabase(db.contracts[idx]);
    return db.contracts[idx];
  },

  deleteContract(id) {
    const db = this.load();
    db.contracts = db.contracts.filter(c => c.id !== id);
    this.save(db);
    this._deleteContractFromSupabase(id);
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
    const notif = {
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
    };
    db.notifications.unshift(notif);

    this.save(db);
    this._pushPaymentToSupabase(newPayment, contractId);
    this._pushNotificationToSupabase(notif);
    return newPayment;
  },

  deletePayment(contractId, paymentId) {
    const db = this.load();
    const contract = db.contracts.find(c => c.id === contractId);
    if (!contract) return;
    contract.payments = (contract.payments || []).filter(p => p.id !== paymentId);
    this.save(db);
    this._deletePaymentFromSupabase(paymentId);
  },

  // ── Notifications ──────────────────────────────────────
  addNotification(notifData) {
    const db = this.load();
    db.notifications = db.notifications || [];
    const notif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      status: 'unread',
      createdAt: new Date().toISOString(),
      ...notifData
    };
    db.notifications.unshift(notif);
    this.save(db);
    this._pushNotificationToSupabase(notif);
    return notif;
  },

  getNotifications(status = 'all', user = null) {
    if (!user) user = this.getCurrentUser();
    const db = this.load();
    db.notifications = (db.notifications || []).filter(n => {
      if (n.type === 'new_payment' && !n.customerName && (!n.amount || n.amount === 0) && !n.collectorName) return false;
      if (!n.title && !n.message && !n.customerName && (!n.amount || n.amount === 0)) return false;
      return true;
    });

    let list = db.notifications;
    if (user) {
      list = list.filter(n => {
        if (n.userId && n.userId !== user.id) return false;
        if (n.type === 'new_payment') {
          if (user.role !== 'manager' && user.role !== 'accountant') return false;
          const collector = db.users.find(u => u.name === n.collectorName);
          if (collector && collector.role === 'manager' && user.role === 'manager' && collector.id === user.id) return false;
        }
        return true;
      });
    }

    if (status === 'unread') {
      return list.filter(n => n.status === 'unread');
    }
    return list;
  },

  markNotificationRead(id) {
    const db = this.load();
    db.notifications = db.notifications || [];
    const notif = db.notifications.find(n => n.id === id);
    if (notif) {
      notif.status = 'read';
      this.save(db);
      this._pushNotificationToSupabase(notif);
    }
  },

  markAllNotificationsRead() {
    const db = this.load();
    db.notifications = db.notifications || [];
    const user = this.getCurrentUser();
    const visibleIds = new Set(this.getNotifications('all', user).map(n => n.id));
    db.notifications.filter(n => visibleIds.has(n.id)).forEach(n => {
      n.status = 'read';
      this._pushNotificationToSupabase(n);
    });
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
    this._pushCampaignToSupabase(campaign);
    return campaign;
  },

  updateCampaign(id, data) {
    const db = this.load();
    const idx = db.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return null;
    db.campaigns[idx] = { ...db.campaigns[idx], ...data };
    this.save(db);
    this._pushCampaignToSupabase(db.campaigns[idx]);
    return db.campaigns[idx];
  },

  deleteCampaign(id) {
    const db = this.load();
    db.campaigns = db.campaigns.filter(c => c.id !== id);
    this.save(db);
    this._deleteCampaignFromSupabase(id);
  },

  addCampaignDailyLog(campaignId, data, userId) {
    const db = this.load();
    const c = db.campaigns.find(x => x.id === campaignId);
    if (!c) return null;
    c.dailyLogs = c.dailyLogs || [];
    const newLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: data.date || new Date().toISOString().split('T')[0],
      amount: Number(data.amount) || 0,
      note: data.note || '',
      createdByName: this.getUserById(userId)?.name || 'Marketing',
      createdAt: new Date().toISOString()
    };
    c.dailyLogs.unshift(newLog);
    c.spent = c.dailyLogs.reduce((s, log) => s + (log.amount || 0), 0);
    this.save(db);
    this._pushCampaignToSupabase(c);
    this._pushCampaignLogToSupabase(newLog, campaignId);
    return c;
  },

  deleteCampaignDailyLog(campaignId, logId) {
    const db = this.load();
    const c = db.campaigns.find(x => x.id === campaignId);
    if (!c || !c.dailyLogs) return null;
    c.dailyLogs = c.dailyLogs.filter(l => l.id !== logId);
    c.spent = c.dailyLogs.reduce((s, log) => s + (log.amount || 0), 0);
    this.save(db);
    this._pushCampaignToSupabase(c);
    this._deleteCampaignLogFromSupabase(logId);
    return c;
  },

  // ── Appointments ──────────────────────────────────────
  getAppointments(userId, role) {
    const db = this.load();
    if (!userId || role === 'manager') return db.appointments;
    if (role === 'sales' || role === 'marketing' || role === 'kts') {
      return db.appointments.filter(a => {
        if (a.assignedTo === userId || a.createdBy === userId) return true;
        if (a.assignedTo && a.assignedTo !== userId) return false;
        if (a.leadId) {
          const lead = db.leads.find(l => l.id === a.leadId);
          if (lead && (lead.assignedTo === userId || lead.surveyBy === 'Nhật Long' || lead.surveyBy === 'Long')) return true;
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
      appointmentType: data.appointmentType || 'general',
      ktsTaskId: data.ktsTaskId || '',
      createdAt: new Date().toISOString()
    };

    if (targetLead) {
      const userObj = this.getUserById(userId);
      const userName = userObj ? userObj.name : 'Nhân viên';
      const newH = this._addLeadHistory(targetLead, `Đặt lịch hẹn: ${apt.title}`, userName);
      this._pushLeadToSupabase(targetLead, newH);
    }

    db.appointments.unshift(apt);
    this.save(db);
    this._pushAppointmentToSupabase(apt);
    return apt;
  },

  updateAppointment(id, data, userId = null, syncLinkedTask = true) {
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
        const userObj = userId ? this.getUserById(userId) : null;
        const userName = userObj ? userObj.name : 'Nhân viên';
        let actionMsg = '';
        if (data.status === 'done') actionMsg = `Hoàn thành lịch hẹn: ${oldApt.title}`;
        else if (data.status === 'cancelled') actionMsg = `Hủy lịch hẹn: ${oldApt.title}`;

        if (actionMsg) {
          const newH = this._addLeadHistory(targetLead, actionMsg, userName);
          this._pushLeadToSupabase(targetLead, newH);
        }
      }
    }

    this.save(db);
    this._pushAppointmentToSupabase(db.appointments[idx]);
    if (syncLinkedTask && oldApt.ktsTaskId) {
      const linkedFields = {};
      if (data.datetime) linkedFields.deadline = new Date(data.datetime).toISOString();
      if (data.assignedTo) {
        const assignee = this.getUserById(data.assignedTo);
        linkedFields.ktsId = data.assignedTo;
        linkedFields.ktsName = assignee ? assignee.name : oldApt.leadName;
        linkedFields.assigneeType = 'internal';
        linkedFields.responsibleUserId = data.assignedTo;
        linkedFields.responsibleUserName = assignee ? assignee.name : '';
      }
      if (data.status === 'done') {
        linkedFields.status = 'completed';
        linkedFields.completedAt = updateData.completedAt;
        linkedFields.resultNote = data.resultNote || 'Đã hoàn thành khảo sát từ Lịch Hẹn';
      }
      if (Object.keys(linkedFields).length > 0) this.updateKtsTask(oldApt.ktsTaskId, linkedFields, false);
    }
    return db.appointments[idx];
  },

  deleteAppointment(id) {
    const db = this.load();
    db.appointments = db.appointments.filter(a => a.id !== id);
    this.save(db);
    this._deleteAppointmentFromSupabase(id);
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
    this._pushPortfolioToSupabase(item);
    return item;
  },

  updatePortfolioItem(id, data) {
    const db = this.load();
    const idx = db.portfolio.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.portfolio[idx] = { ...db.portfolio[idx], ...data };
    this.save(db);
    this._pushPortfolioToSupabase(db.portfolio[idx]);
    return db.portfolio[idx];
  },

  deletePortfolioItem(id) {
    const db = this.load();
    db.portfolio = db.portfolio.filter(p => p.id !== id);
    this.save(db);
    this._deletePortfolioFromSupabase(id);
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
  },

  // ── KTS Reports / Tasks Methods ──────────────────────
  getKtsLogs() {
    const db = this.load();
    return db.ktsLogs || [];
  },

  addKtsLog(logData) {
    const db = this.load();
    if (!db.ktsLogs) db.ktsLogs = [];
    const newLog = {
      id: 'kts_log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      ...logData
    };
    db.ktsLogs.unshift(newLog);
    this.save(db);
    this.addSystemLog(`Báo cáo KTS mới: ${newLog.userName} - ${newLog.projectName}`);
    this._pushKtsLogToSupabase(newLog);
    return newLog;
  },

  updateKtsLog(id, fields) {
    const db = this.load();
    if (!db.ktsLogs) db.ktsLogs = [];
    const idx = db.ktsLogs.findIndex(l => l.id === id);
    if (idx !== -1) {
      db.ktsLogs[idx] = { ...db.ktsLogs[idx], ...fields, updatedAt: new Date().toISOString() };
      this.save(db);
      this._pushKtsLogToSupabase(db.ktsLogs[idx]);
      return db.ktsLogs[idx];
    }
    return null;
  },

  deleteKtsLog(id) {
    const db = this.load();
    if (!db.ktsLogs) return false;
    const exists = db.ktsLogs.some(l => l.id === id);
    if (!exists) return false;
    db.ktsLogs = db.ktsLogs.filter(l => l.id !== id);
    this.save(db);
    this._delete('kts_logs', id);
    return true;
  },

  // ── KTS Tasks Methods ──────────────────────────────
  getKtsTasks(userId = null, role = null) {
    const db = this.load();
    const tasks = db.ktsTasks || [];
    if (!userId || role === 'manager') return tasks;
    return tasks.filter(t =>
      t.ktsId === userId ||
      t.assignerId === userId ||
      t.responsibleUserId === userId
    );
  },

  addKtsTask(taskData) {
    const db = this.load();
    if (!db.ktsTasks) db.ktsTasks = [];
    const now = new Date().toISOString();
    const newTask = {
      id: 'kts_task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      status: 'pending',
      createdAt: now,
      startedAt: null,
      completedAt: null,
      history: [
        {
          timestamp: now,
          action: taskData.taskType === 'site_survey' ? '📏 Giao việc khảo sát' : '🚀 Giao việc KTS',
          user: taskData.assignerName || 'Sale / Admin',
          note: taskData.requirement ? `Yêu cầu: ${taskData.requirement}` : 'Khởi tạo yêu cầu giao việc mới'
        }
      ],
      ...taskData
    };
    db.ktsTasks.unshift(newTask);
    this.save(db);

    if (newTask.taskType === 'site_survey') {
      const appointment = this.createAppointment({
        leadId: newTask.leadId,
        leadName: this.getLead(newTask.leadId)?.name || newTask.leadName,
        title: `📏 ${newTask.title}`,
        datetime: newTask.deadline,
        assignedTo: newTask.assigneeType === 'external' ? newTask.responsibleUserId : newTask.ktsId,
        appointmentType: 'site_survey',
        ktsTaskId: newTask.id,
        note: [
          newTask.surveyAddress ? `Địa chỉ: ${newTask.surveyAddress}` : '',
          newTask.surveyContactName ? `Liên hệ: ${newTask.surveyContactName}${newTask.surveyContactPhone ? ` · ${newTask.surveyContactPhone}` : ''}` : '',
          newTask.assigneeType === 'external' ? `Người đi khảo sát ngoài hệ thống: ${newTask.externalAssigneeName}${newTask.externalAssigneePhone ? ` · ${newTask.externalAssigneePhone}` : ''}` : '',
          newTask.requirement || ''
        ].filter(Boolean).join('\n')
      }, newTask.assignerId);
      newTask.appointmentId = appointment.id;
      const latestDb = this.load();
      const taskIndex = latestDb.ktsTasks.findIndex(t => t.id === newTask.id);
      if (taskIndex !== -1) latestDb.ktsTasks[taskIndex] = newTask;
      this.save(latestDb);
    }

    if (newTask.ktsId) {
      this.addNotification({
        userId: newTask.ktsId,
        title: newTask.taskType === 'site_survey' ? '📏 Yêu cầu khảo sát mới!' : '🚀 Yêu cầu công việc KTS mới!',
        message: `${newTask.assignerName || 'Sale'} đã giao việc: "${newTask.title}" cho Lead ${newTask.leadName}`,
        type: 'kts_task',
        targetId: newTask.id
      });
    }

    this.addSystemLog(`Giao công việc: ${newTask.assignerName} -> ${newTask.ktsName} (${newTask.title})`);
    this._pushKtsTaskToSupabase(newTask);
    return newTask;
  },

  updateKtsTask(id, fields, syncLinkedAppointment = true) {
    const db = this.load();
    if (!db.ktsTasks) db.ktsTasks = [];
    const idx = db.ktsTasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      const oldTask = db.ktsTasks[idx];
      const now = new Date().toISOString();
      const history = [...(oldTask.history || [])];

      if (fields.status === 'in_progress' && oldTask.status !== 'in_progress') {
        fields.startedAt = fields.startedAt || now;
        history.push({
          timestamp: fields.startedAt,
          action: '🔵 Tiếp nhận & Bắt đầu làm',
          user: oldTask.ktsName || 'Người thực hiện',
          note: 'Người thực hiện đã tiếp nhận và chuyển trạng thái sang Đang thực hiện'
        });
      }

      if (fields.status === 'completed' && oldTask.status !== 'completed') {
        fields.completedAt = fields.completedAt || now;
        history.push({
          timestamp: fields.completedAt,
          action: '✅ Đã hoàn thành',
          user: oldTask.ktsName || 'Người thực hiện',
          note: fields.resultNote || fields.completedNote || 'Đã hoàn thành công việc'
        });
      }

      db.ktsTasks[idx] = { ...oldTask, ...fields, history, updatedAt: now };
      this.save(db);

      const updatedTask = db.ktsTasks[idx];
      if (syncLinkedAppointment && updatedTask.taskType === 'site_survey' && updatedTask.appointmentId) {
        const appointmentFields = {
          title: `📏 ${updatedTask.title}`,
          datetime: updatedTask.deadline,
          assignedTo: updatedTask.assigneeType === 'external' ? updatedTask.responsibleUserId : updatedTask.ktsId,
          note: [
            updatedTask.surveyAddress ? `Địa chỉ: ${updatedTask.surveyAddress}` : '',
            updatedTask.surveyContactName ? `Liên hệ: ${updatedTask.surveyContactName}${updatedTask.surveyContactPhone ? ` · ${updatedTask.surveyContactPhone}` : ''}` : '',
            updatedTask.assigneeType === 'external' ? `Người đi khảo sát ngoài hệ thống: ${updatedTask.externalAssigneeName}${updatedTask.externalAssigneePhone ? ` · ${updatedTask.externalAssigneePhone}` : ''}` : '',
            updatedTask.requirement || ''
          ].filter(Boolean).join('\n')
        };
        if (fields.status === 'completed') appointmentFields.status = 'done';
        this.updateAppointment(updatedTask.appointmentId, appointmentFields, null, false);
      }

      if (fields.status === 'completed' && oldTask.status !== 'completed' && oldTask.assignerId) {
        this.addNotification({
          userId: oldTask.assignerId,
          title: oldTask.taskType === 'site_survey' ? '✅ Đã hoàn thành khảo sát!' : '✅ KTS đã hoàn thành công việc!',
          message: `${oldTask.ktsName || 'Người thực hiện'} đã hoàn thành: "${oldTask.title}" (${oldTask.leadName})`,
          type: 'kts_task_completed',
          targetId: oldTask.id
        });
      }

      this._pushKtsTaskToSupabase(db.ktsTasks[idx]);
      return db.ktsTasks[idx];
    }
    return null;
  },

  deleteKtsTask(id) {
    const db = this.load();
    if (!db.ktsTasks) return false;
    const task = db.ktsTasks.find(t => t.id === id);
    if (!task) return false;
    db.ktsTasks = db.ktsTasks.filter(t => t.id !== id);
    this.save(db);
    if (task.appointmentId) this.updateAppointment(task.appointmentId, { status: 'cancelled' }, null, false);
    this._deleteKtsTaskFromSupabase(id);
    return true;
  },

  // ── Supabase Realtime Subscription ──────────────────
  _realtimeChannel: null,
  initRealtimeSubscription(onDataChange = null) {
    if (!supabaseClient) return;
    try {
      if (this._realtimeChannel) {
        supabaseClient.removeChannel(this._realtimeChannel);
      }
      this._realtimeChannel = supabaseClient
        .channel('mtp-crm-realtime')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          console.log('⚡ Realtime update received from Supabase:', payload.table, payload.eventType);
          clearTimeout(this._realtimeSyncTimer);
          this._realtimeSyncTimer = setTimeout(async () => {
            const synced = await this.syncWithServer();
            if (synced && onDataChange) onDataChange(payload);
          }, 250);
        })
        .subscribe((status) => {
          console.log('Supabase Realtime subscription status:', status);
        });
    } catch (err) {
      console.error('Failed to initialize Supabase Realtime:', err);
    }
  },

  addSystemLog(message) {
    try {
      const db = this.load();
      if (!db.systemLogs) db.systemLogs = [];
      db.systemLogs.unshift({
        id: 'syslog_' + Date.now(),
        message: message,
        createdAt: new Date().toISOString()
      });
      // Keep only last 200 system logs
      if (db.systemLogs.length > 200) db.systemLogs = db.systemLogs.slice(0, 200);
      localStorage.setItem('mtp_crm_db', JSON.stringify(db));
    } catch (e) {
      console.log('[SystemLog]', message);
    }
  }
};
