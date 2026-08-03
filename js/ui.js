import { DB, LEAD_STAGES, LEAD_SOURCES, CAMPAIGN_PLATFORMS, PORTFOLIO_CATEGORIES } from './db.js';
import { Toast, Modal } from './components.js';

// ─── Lightbox ─────────────────────────────────────────────
window.showPhotoLightbox = (url) => {
  const lb = document.createElement('div');
  lb.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;opacity:0;transition:opacity 0.2s;';
  lb.innerHTML = `<div style="position:relative;max-width:92%;max-height:92%;"><img src="${url}" style="max-width:100%;max-height:90vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.8);"><button style="position:absolute;top:-38px;right:0;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:50%;width:30px;height:30px;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`;
  document.body.appendChild(lb);
  setTimeout(() => lb.style.opacity = '1', 20);
  const close = () => { lb.style.opacity = '0'; lb.addEventListener('transitionend', () => lb.remove()); };
  lb.addEventListener('click', close);
};

// ─── Helpers ──────────────────────────────────────────────
const fmt = {
  currency(n) {
    if (n === null || n === undefined || isNaN(n)) return '0 ₫';
    return Number(n).toLocaleString('vi-VN') + ' ₫';
  },
  date(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  datetime(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(str) {
    if (!str) return '';
    const diff = Date.now() - new Date(str).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    return Math.floor(hrs / 24) + ' ngày trước';
  }
};

const roleLabel = (role) => ({ manager: 'Quản Lý', sales: 'Sale', marketing: 'Marketing', accountant: 'Kế Toán', kts: 'KTS / Kỹ Thuật' }[role] || role);
const roleIcon = (role) => ({ manager: '💼', sales: '🤝', marketing: '📣', accountant: '💰', kts: '📐' }[role] || '👤');

const getCountdownInfo = (datetimeStr) => {
  if (!datetimeStr) return { label: '—', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)', border: 'var(--border-color)', icon: '📅' };
  const now = new Date();
  const target = new Date(datetimeStr);
  const diffMs = target - now;

  if (diffMs <= 0) {
    return {
      label: 'ĐÃ QUÀ HẠN',
      shortLabel: 'Đã qua',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.15)',
      border: 'rgba(239,68,68,0.4)',
      icon: '⛔'
    };
  }

  const totalHours = diffMs / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.floor(totalHours % 24);
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days === 0) {
    return {
      label: `HÔM NAY · Còn ${hours}h ${mins}p`,
      color: '#EF4444',
      bg: 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(239,68,68,0.15))',
      border: 'rgba(239,68,68,0.6)',
      icon: '🔴'
    };
  } else if (days === 1) {
    return {
      label: `NGÀY MAI · Còn ${hours}h ${mins}p`,
      color: '#F59E0B',
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(245,158,11,0.15))',
      border: 'rgba(245,158,11,0.6)',
      icon: '🟡'
    };
  } else {
    return {
      label: `Còn ${days} ngày ${hours}h`,
      color: '#10B981',
      bg: 'rgba(16,185,129,0.16)',
      border: 'rgba(16,185,129,0.4)',
      icon: '🟢'
    };
  }
};

const compressImage = (file, maxDimension = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// ─── UI Object ────────────────────────────────────────────
export const UI = {

  getApp() { return document.getElementById('app'); },

  confirmDelete(title, message, onConfirm) {
    const html = `
      <div style="display:flex; flex-direction:column; gap:14px; text-align:center; padding:10px 0;">
        <div style="font-size:2.5rem; color:#EF4444;">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div style="font-size:1rem; font-weight:800; color:var(--text-primary);">
          ${title || 'Xác Nhận Xóa Dữ Liệu?'}
        </div>
        <div style="font-size:0.8rem; color:var(--text-secondary); background:rgba(239,68,68,0.08); border-radius:10px; padding:12px; border:1px solid rgba(239,68,68,0.25);">
          ${message || 'Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa không?'}
        </div>
        <div style="display:flex; gap:10px; margin-top:6px;">
          <button id="btn-cancel-delete-modal" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-secondary); padding:10px; border-radius:8px; font-weight:600; cursor:pointer;">Hủy Bỏ</button>
          <button id="btn-confirm-delete-modal" style="flex:1; background:#EF4444; color:#fff; border:none; padding:10px; border-radius:8px; font-weight:700; cursor:pointer;"><i class="fas fa-trash-alt"></i> Đồng Ý Xóa</button>
        </div>
      </div>
    `;

    const modal = Modal.create('Xác Nhận Xóa', html);

    document.getElementById('btn-cancel-delete-modal')?.addEventListener('click', () => {
      modal.close();
    });

    document.getElementById('btn-confirm-delete-modal')?.addEventListener('click', () => {
      modal.close();
      onConfirm();
    });
  },

  // ─── Chuyển số thành chữ (Vietnamese) ───────────────────
  _numberToWords(n) {
    if (!n || isNaN(n)) return 'không đồng';
    n = Math.round(n);
    if (n === 0) return 'không đồng';
    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
    const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
    const readHundred = (num) => {
      let str = '';
      const h = Math.floor(num / 100);
      const r = num % 100;
      if (h > 0) str += ones[h] + ' trăm';
      if (r === 0) return str;
      if (r < 10) { str += (h > 0 ? ' linh ' : '') + ones[r]; }
      else if (r < 20) { str += (str ? ' ' : '') + teens[r - 10]; }
      else {
        const t = Math.floor(r / 10), o = r % 10;
        str += (str ? ' ' : '') + tens[t];
        if (o === 5) str += ' lăm';
        else if (o > 0) str += ' ' + ones[o];
      }
      return str.trim();
    };
    const tỷ = Math.floor(n / 1000000000);
    const triệu = Math.floor((n % 1000000000) / 1000000);
    const nghìn = Math.floor((n % 1000000) / 1000);
    const đơnVị = n % 1000;
    let result = '';
    if (tỷ > 0) result += readHundred(tỷ) + ' tỷ';
    if (triệu > 0) result += (result ? ' ' : '') + readHundred(triệu) + ' triệu';
    if (nghìn > 0) result += (result ? ' ' : '') + readHundred(nghìn) + ' nghìn';
    if (đơnVị > 0) result += (result ? ' ' : '') + readHundred(đơnVị);
    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1);
    return result + ' đồng';
  },

  exportContractToWord(c) {
    if (!c) return;
    const code = c.code || 'MTP-2026/HĐ';
    const customer = c.customerName || 'Khách Hàng';
    const phone = c.phone || '.......................';
    const homeAddress = c.homeAddress || c.address || '.......................';
    const siteAddress = c.address || c.homeAddress || '.......................';
    const rawValue = Number(c.value) || 0;
    const repName = c.repName || 'Tôn Thất Uyên Luận';

    // Compute construction duration
    let constructionDays = c.constructionDays || 0;
    if (!constructionDays && c.signedDate && c.expectedDelivery) {
      const d1 = new Date(c.signedDate);
      const d2 = new Date(c.expectedDelivery);
      constructionDays = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    }
    const daysLabel = constructionDays > 0 ? `${constructionDays} ngày` : '...... ngày';

    // Parse signed date
    const sd = c.signedDate ? new Date(c.signedDate) : new Date();
    const signedDay = sd.getDate();
    const signedMonth = sd.getMonth() + 1;
    const signedYear = sd.getFullYear();

    const deliveryDate = c.expectedDelivery ? fmt.date(c.expectedDelivery) : '..................';

    // Build milestone text per the real template style
    let milestoneText = '';
    if (c.milestones && c.milestones.length > 0) {
      const m1 = c.milestones[0] || { pct: 50 };
      const m2 = c.milestones[1] || { pct: 30 };
      const m3 = c.milestones[2] || { pct: 20 };
      const amt1 = Math.round(rawValue * (m1.pct || 50) / 100).toLocaleString('vi-VN');
      const amt2 = Math.round(rawValue * (m2.pct || 30) / 100).toLocaleString('vi-VN');
      const amt3 = Math.round(rawValue * (m3.pct || 20) / 100).toLocaleString('vi-VN');

      milestoneText = `
        <p class="p-list">- <strong>Giai đoạn 1:</strong> Trong vòng 3 ngày kể từ ngày ký hợp đồng, bên A tạm ứng cho bên B <strong>${m1.pct}%</strong> giá trị hợp đồng tương ứng với số tiền: <strong>${amt1} VNĐ</strong>. Số tiền này được xem như là khoản thanh toán đợt 1 của bên A;</p>
        <p class="p-list">- <strong>Giai đoạn 2:</strong> Bên A thanh toán <strong>${m2.pct}%</strong> tương ứng với số tiền tương ứng <strong>${amt2} VNĐ</strong> giá trị hợp đồng cho bên B sau khi bên B đem hàng lên tại công trình;</p>
        <p class="p-list">- <strong>Giai đoạn 3:</strong> Bên A thanh toán <strong>${m3.pct}%</strong> giá trị hợp đồng còn lại với số tiền tương ứng <strong>${amt3} VNĐ</strong> cho bên B sau khi bên B hoàn tất thủ tục bàn giao cho bên A</p>`;
    } else {
      const d1 = Math.round(rawValue * 0.5).toLocaleString('vi-VN');
      const d2 = Math.round(rawValue * 0.3).toLocaleString('vi-VN');
      const d3 = (rawValue - Math.round(rawValue * 0.5) - Math.round(rawValue * 0.3)).toLocaleString('vi-VN');
      milestoneText = `
        <p class="p-list">- <strong>Giai đoạn 1:</strong> Trong vòng 3 ngày kể từ ngày ký hợp đồng, bên A tạm ứng cho bên B <strong>50%</strong> giá trị hợp đồng tương ứng với số tiền: <strong>${d1} VNĐ</strong>. Số tiền này được xem như là khoản thanh toán đợt 1 của bên A;</p>
        <p class="p-list">- <strong>Giai đoạn 2:</strong> Bên A thanh toán <strong>30%</strong> tương ứng với số tiền tương ứng <strong>${d2} VNĐ</strong> giá trị hợp đồng cho bên B sau khi bên B đem hàng lên tại công trình;</p>
        <p class="p-list">- <strong>Giai đoạn 3:</strong> Bên A thanh toán <strong>20%</strong> giá trị hợp đồng còn lại với số tiền tương ứng <strong>${d3} VNĐ</strong> cho bên B sau khi bên B hoàn tất thủ tục bàn giao cho bên A</p>`;
    }

    const valueWords = this._numberToWords(rawValue);
    const valueFormatted = rawValue.toLocaleString('vi-VN');

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Hợp Đồng Thi Công Nội Thất - ${customer}</title>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <style>
          /* ── Word Page Setup: A4, Portrait ── */
          @page Section1 {
            size: 8.27in 11.69in;
            margin-top:    1.0in;
            margin-bottom: 0.75in;
            margin-left:   1.0in;
            margin-right:  1.0in;
            mso-header-margin: 0.5in;
            mso-footer-margin: 0.5in;
            mso-paper-source: 0;
          }
          div.Section1 { page: Section1; }

          /* ── Typography & Paragraph Spacing (Exact Word Settings) ── */
          body {
            font-family: "Times New Roman", Times, serif;
            font-size: 13pt;
            line-height: 1.0;
            color: #000;
            margin: 0;
          }
          p {
            margin-top: 7.5pt;
            margin-bottom: 7.5pt;
            text-align: justify;
            line-height: 1.0;
            mso-para-margin-top: 7.5pt;
            mso-para-margin-bottom: 7.5pt;
          }
          .p-list {
            margin-top: 7.5pt;
            margin-bottom: 7.5pt;
            margin-left: 36pt;
            text-indent: -18pt;
            text-align: justify;
            line-height: 1.0;
            mso-para-margin-top: 7.5pt;
            mso-para-margin-bottom: 7.5pt;
          }
          .can-cu {
            font-style: italic;
            text-indent: 1cm;
            margin-top: 0pt;
            margin-bottom: 0pt;
            text-align: justify;
            line-height: 1.2;
            mso-para-margin-top: 0pt;
            mso-para-margin-bottom: 0pt;
          }
          .sig-table {
            width: 100%;
            margin-top: 36pt;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
      <div class="Section1">
        <p style="text-align:center; font-weight:bold; font-size:16pt; margin:0; mso-para-margin-top:0pt; mso-para-margin-bottom:0pt; mso-space-before:0pt; mso-space-after:0pt; line-height:1.0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
        <p style="text-align:center; font-weight:bold; font-size:16pt; margin:0; mso-para-margin-top:0pt; mso-para-margin-bottom:0pt; mso-space-before:0pt; mso-space-after:0pt; line-height:1.0;">Độc lập – Tự do – Hạnh phúc</p>
        <p style="margin:0; mso-para-margin-top:0pt; mso-para-margin-bottom:0pt; mso-space-before:0pt; mso-space-after:0pt; font-size:11pt; line-height:1.0;">&nbsp;</p>
        <p style="margin:0; mso-para-margin-top:0pt; mso-para-margin-bottom:0pt; mso-space-before:0pt; mso-space-after:0pt; font-size:11pt; line-height:1.0;">&nbsp;</p>

        <h1 style="text-align:center; font-size:16pt; font-weight:bold; text-transform:uppercase; margin:0; mso-para-margin-top:0pt; mso-para-margin-bottom:0pt; mso-space-before:0pt; mso-space-after:0pt; line-height:1.0;">HỢP ĐỒNG THI CÔNG NỘI THẤT</h1>
        <p style="text-align:center; font-size:13pt; margin-top:0; margin-bottom:12pt; mso-para-margin-top:0pt; mso-para-margin-bottom:12pt; line-height:1.0;">Số: ${code}</p>

        <p class="can-cu">Căn cứ Bộ luật dân sự năm 2015 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam thông qua ngày 24/11/2015 có hiệu lực ngày 01/01/2017.</p>
        <p class="can-cu">Căn cứ Luật thương mại năm 2005 được Quốc hội nước Cộng hòa xã hội chủ nghĩa Việt Nam thông qua ngày 14/6/2005 có hiệu lực ngày 01/01/2006.</p>
        <p class="can-cu">Căn cứ vào nhu cầu và năng lực của hai bên.</p>

        <p>Hôm nay, ngày… tháng ... năm 2026 tại Huế, chúng tôi ký tên dưới đây gồm có:</p>

        <p style="font-weight:bold;">Bên A: Chủ đầu tư (hoặc đại diện của Chủ đầu tư)</p>
        <p>Họ và tên: <strong>${customer}</strong></p>
        <p>Địa chỉ: <strong>${homeAddress}</strong></p>
        <p>Điện thoại: <strong>${phone}</strong></p>

        <p style="font-weight:bold;">Bên B: Đơn vị thi công nội thất</p>
        <p>Tên tổ chức: Xưởng nội thất Mộc Tiên Phát</p>
        <p>Đại diện: Ông Tôn Thất Uyên Luận</p>
        <p>Địa chỉ trụ sở: Lô D122, khu đô thị Phú Mỹ Thượng, đường tỉnh lộ 10, phường Mỹ Thượng, Thành phố Huế</p>
        <p>Điện thoại: 08.866.5252</p>
        <p>Tài khoản ngân hàng:</p>
        <p style="margin-left:20px;">Chủ tài khoản: Tôn Thất Uyên Luận</p>
        <p style="margin-left:20px;">STK: 190 3555 0975 024 - Ngân hàng Techcombank</p>

        <p style="font-weight:bold;">Hai bên thống nhất ký kết hợp đồng thi công nội thất tại công trình:</p>
        <p>Địa chỉ: <strong>${siteAddress}</strong></p>

        <p style="font-weight:bold;">Điều 1. Nội dung và khối lượng công việc cần đề cập trong mẫu hợp đồng thi công</p>
        <p class="p-list">1. Bên A giao cho Bên B thầu thi công toàn bộ sản phẩm nội thất theo đúng bản vẽ kiến trúc, nội thất đã được hai bên thống nhất và ký xác nhận trên Zalo</p>
        <p class="p-list">2. Bên B sử dụng toàn bộ vật tư, chất liệu, mã số màu theo đúng thông số kỹ thuật, chủng loại, số lượng thể hiện trong phụ lục đã được hai bên thống nhất và ký xác nhận kèm theo hợp đồng này.</p>

        <p style="font-weight:bold;">Điều 2. Thời hạn thi công</p>
        <p style="font-weight:bold;">2.1. Thời hạn thi công</p>
        <p>Thời hạn thi công <strong style="color:red; font-weight:bold;">${daysLabel}</strong>, tính từ ngày chốt bản vẽ thiết kế, nhận được tiền tạm ứng đợt 1 và được bên A bàn giao mặt bằng thi công.</p>
        <p style="font-weight:bold;">2.2. Gia hạn thời gian hoàn thành</p>
        <p>Bên B được phép gia hạn thời gian hoàn thành nếu có một trong những lý do sau đây:</p>
        <p class="p-list">1. Có sự thay đổi phạm vi công việc, thiết kế, biện pháp thi công theo yêu cầu của Chủ đầu tư làm ảnh hưởng thực đến tiến độ hiện hợp đồng.</p>
        <p class="p-list">2. Sự chậm trễ, trở ngại trên công trường do Chủ đầu tư, nhân lực của Chủ đầu tư hay các nhà thầu khác của Chủ đầu tư gây ra.</p>
        <p class="p-list">3. Do ảnh hưởng của các trường hợp bất khả kháng như: động đất, bão, lũ, lụt, lốc, sóng thần, lỡ đất, hoạt động núi lửa, chiến tranh, dịch bệnh.</p>

        <p style="font-weight:bold;">Điều 3. Giá trị hợp đồng thi công</p>
        <p>Tổng giá trị hợp đồng: <strong>${valueFormatted} VNĐ</strong></p>
        <p>Viết bằng chữ: <strong>${valueWords}.</strong></p>
        <p>Đơn giá chưa bao gồm thuế VAT</p>

        <p style="font-weight:bold;">Điều 4. Cách thức thanh toán hợp đồng thi công nội thất theo từng giai đoạn (tiền mặt hoặc chuyển khoản)</p>
        ${milestoneText}

        <p style="font-weight:bold;">Điều 5. Trách nhiệm Bên A</p>
        <p class="p-list">1. Bàn giao mặt bằng, hỗ trợ xin phép và đi lại trong công trình.</p>
        <p class="p-list">2. Cung cấp bảng vẽ thiết kế để bên B sản xuất theo đúng tiến độ.</p>
        <p class="p-list">3. Chuẩn bị đầy đủ kinh phí và thanh toán đúng thời hạn cho Bên B cho từng đợt. Nếu chậm thanh toán, Bên A sẽ bị tính lãi suất theo ngân hàng quy định. Nếu bên A tiếp tục chậm thanh toán bên A sẽ được chính quyền địa phương triệu tập về tội lừa đảo chiếm dụng tài sản</p>

        <p style="font-weight:bold;">Điều 6. Trách nhiệm Bên B</p>
        <p class="p-list">1. Sản xuất và thi công nội thất đúng với nội dung và khối lượng công việc quy định tại Điều 1.</p>
        <p class="p-list">2. Hoàn thành các hạng mục công trình đúng thời hạn hợp đồng, đảm bảo an toàn, bảo vệ môi trường và phòng chống cháy nổ.</p>

        <p style="font-weight:bold;">Điều 7. Bảo hành dự án thị công nội thất</p>
        <p>Sau khi nhận được biên bản nghiệm thu công trình, hạng mục công trình để đưa vào sử dụng, Bên B phải:</p>
        <p class="p-list">1. Thực hiện bảo hành công trình trong thời gian 12 tháng.</p>
        <p class="p-list">2. Bên B chịu trách nhiệm phải sửa chữa mọi sai xót do lỗi kỹ thuật, khiếm khuyết do lỗi thi công nội thất bằng chi phí của Bên B.</p>

        <p style="font-weight:bold;">Điều 8. Điều khoản chung của mẫu hợp đồng thi công nội thất</p>
        <p class="p-list">1. Màu sắc trong bản vẽ gần với màu thực tế khi thi công trong mức kỹ thuật in hiện đại cho phép.</p>
        <p class="p-list">2. Hàng đã đặt thi công không được phép trả lại.</p>
        <p class="p-list">3. Công trình chỉ được phép đưa vào sử dụng sau khi hai bên cùng ký vào biên bản nghiệm thu.</p>
        <p class="p-list">4. Hợp đồng này có giá trị từ ngày ký đến ngày thanh lý hợp đồng.</p>
        <p class="p-list">5. Hai bên cam kết thực hiện đúng các điều khoản của hợp đồng, bên nào vi phạm sẽ phải chịu trách nhiệm theo đúng qui định của pháp luật về hợp đồng kinh tế.</p>
        <p class="p-list">6. Trong quá trình thực hiện nếu có phát sinh tăng hoặc giảm thì hai bên chủ động thương lượng giải quyết, khi cần sẽ lập phụ lục hợp đồng hoặc biên bản bổ sung hợp đồng.</p>
        <p class="p-list">7. Hợp đồng này được lập thành 02 (hai) bản có giá trị như nhau, mỗi bên giữ 01 (một) bản.</p>

        <p style="text-align:right; font-style:italic; margin-top:16pt;">Huế, ngày …. tháng … năm 2026</p>

        <table class="sig-table">
          <tr>
            <td style="text-align:center; vertical-align:top;">
              <strong>ĐẠI DIỆN BÊN A</strong><br>
              <em>(Ký, ghi rõ họ tên)</em><br><br><br><br><br>
              <strong style="color:white;">Tôn Thất Uyên Luận</strong>
            </td>
            <td style="text-align:center;">
              <strong>ĐẠI DIỆN BÊN B</strong><br>
              <em>(Ký, ghi rõ họ tên)</em><br><br><br><br><br>
              <strong>Tôn Thất Uyên Luận</strong>
            </td>
          </tr>
        </table>
      </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hop_Dong_MTP_${code.replace(/\//g, '-')}_${customer.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },



  // ══════════════════════════════════════════════════════
  //  1. LOGIN
  // ══════════════════════════════════════════════════════
  renderLogin(onSuccess) {
    const app = this.getApp();
    app.innerHTML = `
      <div class="login-container">
        <div class="login-bg" style="background:linear-gradient(180deg,rgba(15,15,17,0.5) 0%,#0F0F11 100%),url('bg.jpg') center/cover no-repeat,url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat;"></div>
        <div class="login-card" style="position:relative;">
          <button class="header-btn" id="login-theme-toggle" style="position:absolute;top:16px;right:16px;z-index:10;border:1px solid var(--border-color);" title="Chuyển chế độ Sáng/Tối"><i class="fas fa-moon"></i></button>
          <div class="login-header">
            <div class="login-logo" style="background:none;box-shadow:none;width:auto;height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
              <img src="logo.jpg" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" style="height:100%;max-width:180px;object-fit:contain;border-radius:14px;">
              <div style="width:64px;height:64px;background:linear-gradient(135deg,var(--primary),#8E714B);border-radius:18px;display:none;align-items:center;justify-content:center;color:var(--bg-primary);font-size:1.75rem;box-shadow:var(--shadow-primary);"><i class="fas fa-handshake"></i></div>
            </div>
            <h2 class="login-title">Mộc Tiên Phát</h2>
            <p class="login-subtitle">CRM & Marketing System</p>
          </div>
          <form id="login-form">
            <div class="form-group">
              <label class="form-label">Tên đăng nhập</label>
              <div class="input-wrapper">
                <input type="text" id="login-username" class="form-input" required autocomplete="username">
                <i class="fas fa-user input-icon"></i>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Mật khẩu</label>
              <div class="input-wrapper">
                <input type="password" id="login-password" class="form-input" required autocomplete="current-password">
                <i class="fas fa-lock input-icon"></i>
              </div>
            </div>
            <div class="login-options">
              <label class="remember-me"><input type="checkbox" id="login-remember" checked> Ghi nhớ đăng nhập</label>
            </div>
            <button type="submit" class="btn-primary" id="login-submit-btn"><span>Đăng Nhập</span><i class="fas fa-arrow-right"></i></button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('login-theme-toggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('mtp_theme', next);
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const remember = document.getElementById('login-remember').checked;

      // Show loading state
      const btn = document.getElementById('login-submit-btn');
      const origHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';

      try {
        const user = await DB.login(username, password);
        if (user) {
          DB.setCurrentUser(user, remember);
          Toast.success(`Chào mừng, ${user.name}! ${roleIcon(user.role)}`);
          onSuccess();
        } else {
          Toast.error('Tên đăng nhập hoặc mật khẩu không đúng.');
          btn.disabled = false;
          btn.innerHTML = origHTML;
        }
      } catch (err) {
        Toast.error('Lỗi kết nối. Vui lòng thử lại.');
        btn.disabled = false;
        btn.innerHTML = origHTML;
      }
    });
  },

  // ══════════════════════════════════════════════════════
  //  2. SHELL
  // ══════════════════════════════════════════════════════
  renderShell(user, onLogout) {
    const app = this.getApp();
    const navItems = this._getNavItems(user);

    app.innerHTML = `
      <div id="app-shell-container" class="app-shell">
        <!-- Header -->
        <div class="app-header" id="app-header">
          <div class="header-left" style="display:flex; align-items:center; gap:8px;">
            <img src="logo.jpg" onerror="this.style.display='none'" style="height:34px; border-radius:8px; object-fit:contain; border:1px solid var(--border-color); background:#fff;">
            <span class="header-brand" style="font-size:1.05rem; font-weight:800; color:var(--primary); letter-spacing:0.5px;">MỘC TIÊN PHÁT</span>
          </div>
          <div class="header-right">
            <button class="header-btn" id="btn-notif" title="Thông báo khoản thu" style="position:relative;">
              <i class="fas fa-bell"></i>
              <span id="notif-badge" style="position:absolute; top:-3px; right:-3px; background:#EF4444; color:#fff; font-size:0.6rem; font-weight:800; border-radius:50%; min-width:16px; height:16px; display:${(DB.getNotifications('unread') || []).length > 0 ? 'flex' : 'none'}; align-items:center; justify-content:center; padding:0 3px;">${(DB.getNotifications('unread') || []).length}</span>
            </button>
            <button class="header-btn" id="btn-sync" title="Đồng bộ dữ liệu"><i class="fas fa-sync-alt"></i></button>
            <button class="header-btn" id="btn-theme" title="Đổi giao diện"><i class="fas fa-adjust"></i></button>
            <div class="user-avatar-wrap" id="btn-user-menu">
              <img src="${user.avatar}" onerror="this.src=''" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);">
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="app-body" id="app-body-content"></div>

        <!-- Bottom Nav -->
        <nav class="bottom-nav" id="bottom-nav">
          ${navItems.map(item => `
            <button class="nav-item" id="nav-${item.id}" data-nav="${item.id}" title="${item.label}">
              <i class="fas ${item.icon}"></i>
              <span>${item.label}</span>
            </button>
          `).join('')}
        </nav>
      </div>
    `;

    // Theme toggle
    document.getElementById('btn-theme').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('mtp_theme', next);
    });

    // Sync button
    document.getElementById('btn-sync').addEventListener('click', async () => {
      const btn = document.getElementById('btn-sync');
      btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
      const changed = await DB.syncWithServer();
      btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
      Toast[changed ? 'success' : 'info'](changed ? 'Dữ liệu đã được đồng bộ!' : 'Dữ liệu đã cập nhật.');
      if (changed) this.refreshDashboard(user);
    });

    // Notification listener
    document.getElementById('btn-notif')?.addEventListener('click', () => {
      this.openNotificationsModal(user);
    });

    // User menu
    document.getElementById('btn-user-menu').addEventListener('click', () => {
      this._showUserMenu(user, onLogout);
    });

    // Bottom nav
    document.getElementById('bottom-nav').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-nav]');
      if (!btn) return;
      const navId = btn.getAttribute('data-nav');
      this._navigate(navId, user);
    });
  },

  _getNavItems(user) {
    const all = [
      { id: 'dashboard', label: 'Tổng Quan', icon: 'fa-home', roles: ['manager', 'sales', 'marketing', 'accountant', 'kts'] },
      { id: 'kts_tasks', label: 'Công Việc KTS', icon: 'fa-tasks', roles: ['manager', 'kts', 'sales'] },
      { id: 'kts_reports', label: 'Báo Cáo KTS', icon: 'fa-drafting-compass', roles: ['kts'] },
      { id: 'appointments', label: 'Lịch Hẹn', icon: 'fa-calendar-alt', roles: ['manager', 'sales', 'marketing', 'accountant', 'kts'] },
      { id: 'leads', label: 'Leads', icon: 'fa-user-friends', roles: ['manager', 'sales', 'marketing', 'accountant'] },
      { id: 'contracts', label: 'Hợp Đồng', icon: 'fa-file-contract', roles: ['manager', 'sales', 'accountant'] },
      { id: 'campaigns', label: 'Chiến Dịch', icon: 'fa-bullhorn', roles: ['manager', 'marketing'] },
      { id: 'portfolio', label: 'Portfolio', icon: 'fa-images', roles: ['manager', 'sales', 'marketing', 'accountant'] },
      { id: 'kpi', label: 'KPI', icon: 'fa-chart-bar', roles: ['manager', 'sales', 'marketing', 'accountant'] },
    ];
    return all.filter(item => item.roles.includes(user.role));
  },

  _navigate(navId, user) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${navId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Render the correct view
    switch (navId) {
      case 'dashboard': this.renderDashboard(user); break;
      case 'kts_tasks': this.renderKtsTasks(user); break;
      case 'kts_reports': this.renderKtsReports(user); break;
      case 'appointments': this.renderAppointments(user); break;
      case 'leads': this.renderLeads(user); break;
      case 'contracts': this.renderContracts(user); break;
      case 'campaigns': this.renderCampaigns(user); break;
      case 'portfolio': this.renderPortfolio(user); break;
      case 'kpi': this.renderKPI(user); break;
    }
  },

  _showUserMenu(user, onLogout) {
    const html = `
      <div style="text-align:center; padding:8px 0 16px;">
        <img src="${user.avatar}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);margin-bottom:10px;" onerror="this.style.display='none'">
        <div style="font-weight:700; font-size:1rem; color:var(--text-primary);">${user.name}</div>
        <div style="font-size:0.75rem; color:var(--primary); margin-top:2px;">${roleLabel(user.role)} ${roleIcon(user.role)}</div>
      </div>
      <div style="border-top:1px solid var(--border-color); padding-top:12px; display:flex; flex-direction:column; gap:8px;">
        <button id="menu-logout-btn" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:var(--status-rejected); border-radius:10px; padding:10px 16px; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
          <i class="fas fa-sign-out-alt"></i> Đăng Xuất
        </button>
      </div>
    `;
    const modal = Modal.create(`Tài Khoản`, html);
    document.getElementById('menu-logout-btn').addEventListener('click', () => {
      DB.logout();
      modal.close();
      Toast.info('Đã đăng xuất.');
      onLogout();
    });
  },

  refreshDashboard(user) {
    const activeNav = document.querySelector('.nav-item.active');
    if (!activeNav || activeNav.getAttribute('data-nav') === 'dashboard') {
      this.renderDashboard(user);
    }
  },

  _getBody() { return document.getElementById('app-body-content'); },

  // ══════════════════════════════════════════════════════
  //  3. DASHBOARD
  // ══════════════════════════════════════════════════════
  renderDashboard(user) {
    this._setActiveNav('dashboard');
    const body = this._getBody();
    const analytics = DB.getAnalytics(user.id, user.role);
    const appointments = DB.getAppointments(user.id, user.role);
    const pendingApprovals = DB.getApprovals('pending');
    const unreadPaymentNotifs = (DB.getNotifications('unread') || []).filter(n => n.type === 'new_payment');
    const now = new Date();

    // Upcoming appointments (next 7 days)
    const upcoming = appointments
      .filter(a => a.status === 'pending' && new Date(a.datetime) >= now)
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .slice(0, 4);

    body.innerHTML = `
      <div class="page-content fade-in">
        <div class="welcome-section">
          <div class="welcome-user">Xin chào, ${user.name} ${roleIcon(user.role)}</div>
          <div class="welcome-date">${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>

        <!-- PROMINENT NEW PAYMENT NOTIFICATIONS BANNER (FOR ADMIN / ACCOUNTANT) -->
        ${((user.role === 'manager' || user.role === 'accountant') && unreadPaymentNotifs.length > 0) ? `
          <div class="payment-alert-card" style="background:linear-gradient(135deg, rgba(16,185,129,0.18), rgba(59,130,246,0.12)); border:1.5px solid rgba(16,185,129,0.5); border-radius:14px; padding:14px 16px; margin-bottom:18px; box-shadow:0 8px 24px rgba(16,185,129,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
              <div style="font-size:0.9rem; font-weight:800; color:#10B981; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-money-bill-wave" style="font-size:1.1rem; color:#10B981;"></i>
                <span>CÓ ${unreadPaymentNotifs.length} KHOẢN THU MỚI TỪ NHÂN VIÊN CẦN XÁC NHẬN</span>
              </div>
              <button id="btn-read-all-pay-notifs" style="font-size:0.72rem; font-weight:700; background:rgba(16,185,129,0.25); color:#10B981; padding:5px 12px; border-radius:8px; border:1px solid rgba(16,185,129,0.4); cursor:pointer;"><i class="fas fa-check-double"></i> Đánh dấu đã xem tất cả</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${unreadPaymentNotifs.map(n => `
                <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                  <div style="flex:1;">
                    <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">
                      💵 <strong style="color:#3B82F6;">${n.collectorName}</strong> vừa thu <strong style="color:#10B981; font-size:0.95rem;">${fmt.currency(n.amount)}</strong>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
                      Khách hàng: <strong>${n.customerName}</strong> (Mã HĐ: <span style="font-family:monospace; color:var(--primary);">${n.contractCode}</span>) · ${fmt.timeAgo(n.createdAt)}
                    </div>
                    ${n.note ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Ghi chú: ${n.note}</div>` : ''}
                    ${n.proofImage ? `
                      <div style="margin-top:6px; display:flex; align-items:center; gap:6px;">
                        <img src="${n.proofImage}" style="width:48px; height:48px; border-radius:6px; object-fit:cover; border:1px solid #10B981; cursor:zoom-in;" onclick="event.stopPropagation();showPhotoLightbox('${n.proofImage}')" title="Bấm để xem ảnh kiểm chứng">
                        <span style="font-size:0.72rem; color:#10B981; font-weight:600; cursor:pointer;" onclick="event.stopPropagation();showPhotoLightbox('${n.proofImage}')"><i class="fas fa-image"></i> Xem ảnh kiểm chứng</span>
                      </div>
                    ` : ''}
                  </div>
                  <button class="btn-mark-pay-read" data-id="${n.id}" style="background:#10B981; color:#fff; border:none; padding:7px 14px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="fas fa-check"></i> Xác Nhận</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- PROMINENT EDIT APPROVAL REQUESTS BANNER (TOP PRIORITY) -->
        ${pendingApprovals.length > 0 ? `
          <div class="approval-alert-card" style="background:linear-gradient(135deg, rgba(245,158,11,0.18), rgba(197,168,128,0.12)); border:1.5px solid rgba(245,158,11,0.5); border-radius:14px; padding:14px 16px; margin-bottom:18px; box-shadow:0 8px 24px rgba(245,158,11,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="font-size:0.9rem; font-weight:800; color:#F59E0B; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-exclamation-triangle" style="font-size:1.1rem; color:#F59E0B;"></i>
                <span>CÓ ${pendingApprovals.length} YÊU CẦU DUYỆT THAY ĐỔI THÔNG TIN CẦN XỬ LÝ</span>
              </div>
              <span style="font-size:0.7rem; font-weight:700; background:rgba(245,158,11,0.2); color:#F59E0B; padding:3px 9px; border-radius:6px; border:1px solid rgba(245,158,11,0.4);">🔥 Cần Xử Lý Trước</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${pendingApprovals.map(app => `
                <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                  <div>
                    <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary);">
                      👤 <strong style="color:#3B82F6;">${app.requesterName}</strong> yêu cầu sửa thông tin: <strong style="color:var(--primary);">${app.targetName}</strong>
                    </div>
                    <div style="font-size:0.72rem; color:var(--text-muted); margin-top:3px;">
                      Nội dung: <strong>${app.changeSummary}</strong> · ${fmt.timeAgo(app.createdAt)}
                    </div>
                  </div>
                  ${user.role === 'manager' ? `
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                      <button class="btn-detail-req" data-id="${app.id}" style="background:rgba(59,130,246,0.18); color:#3B82F6; border:1px solid rgba(59,130,246,0.4); padding:7px 12px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="fas fa-search"></i> Xem Chi Tiết</button>
                      <button class="btn-approve-req" data-id="${app.id}" style="background:#10B981; color:#fff; border:none; padding:7px 14px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="fas fa-check"></i> Duyệt Ngay</button>
                      <button class="btn-reject-req" data-id="${app.id}" style="background:rgba(239,68,68,0.2); color:#EF4444; border:1px solid rgba(239,68,68,0.4); padding:7px 12px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="fas fa-times"></i> Từ Chối</button>
                    </div>
                  ` : `
                    <span style="font-size:0.72rem; color:#F59E0B; font-weight:700; background:rgba(245,158,11,0.15); padding:4px 8px; border-radius:6px;"><i class="fas fa-clock"></i> Đang chờ Quản Lý duyệt</span>
                  `}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- UNASSIGNED LEADS ALERT FOR ADMIN -->
        ${(user.role === 'manager' && (DB.getLeads().filter(l => !l.assignedTo).length > 0)) ? `
          <div style="background:rgba(59,130,246,0.12); border:1.5px solid rgba(59,130,246,0.4); border-radius:14px; padding:12px 16px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="font-size:0.85rem; font-weight:700; color:#3B82F6; display:flex; align-items:center; gap:8px;">
              <i class="fas fa-user-clock" style="font-size:1.1rem;"></i>
              <span>CÓ ${DB.getLeads().filter(l => !l.assignedTo).length} KHÁCH HÀNG MỚI ĐANG CHỜ ADMIN PHÂN CÔNG SALE</span>
            </div>
            <button id="btn-goto-unassigned-leads" style="background:#3B82F6; color:#fff; border:none; padding:7px 14px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer;">Phân Công Ngay ➔</button>
          </div>
        ` : ''}

        <!-- KPI Cards (Click to view interactive chart modals) -->
        <div class="kpi-grid">
          ${user.role === 'accountant' ? `
            <div class="kpi-card" style="border-color:rgba(16,185,129,0.4);">
              <div class="kpi-icon" style="background:rgba(16,185,129,0.15);color:#10B981;"><i class="fas fa-wallet"></i></div>
              <div class="kpi-body">
                <div class="kpi-val" style="color:#10B981;">${fmt.currency(analytics.collectedRevenue)}</div>
                <div class="kpi-label">Tổng Thu Thực Tế</div>
                <div class="kpi-sub">Đã thu qua quỹ & ngân hàng</div>
              </div>
            </div>

            <div class="kpi-card" style="border-color:rgba(245,158,11,0.4);">
              <div class="kpi-icon" style="background:rgba(245,158,11,0.15);color:#F59E0B;"><i class="fas fa-hand-holding-usd"></i></div>
              <div class="kpi-body">
                <div class="kpi-val" style="color:#F59E0B;">${fmt.currency(Math.max(0, analytics.totalRevenue - analytics.collectedRevenue))}</div>
                <div class="kpi-label">Tổng Công Nợ Phải Thu</div>
                <div class="kpi-sub">${analytics.totalContracts} hợp đồng đã ký kết</div>
              </div>
            </div>

            <div class="kpi-card" style="border-color:rgba(59,130,246,0.4); grid-column:span 2;">
              <div class="kpi-icon" style="background:rgba(59,130,246,0.15);color:#3B82F6;"><i class="fas fa-receipt"></i></div>
              <div class="kpi-body">
                <div class="kpi-val" style="color:#3B82F6;">${unreadPaymentNotifs.length}</div>
                <div class="kpi-label">Khoản Thu Chờ Xác Nhận</div>
                <div class="kpi-sub">Phiếu thu từ Sale nộp kèm bill</div>
              </div>
            </div>
          ` : user.role === 'marketing' ? `
            <div class="kpi-card" id="kpi-total-leads" style="border-color:rgba(197,168,128,0.4); cursor:pointer;" title="Bấm để xem biểu đồ chi tiết tổng leads">
              <div class="kpi-icon" style="background:rgba(197,168,128,0.15);color:var(--primary);"><i class="fas fa-user-friends"></i></div>
              <div class="kpi-body">
                <div class="kpi-val">${analytics.totalLeads}</div>
                <div class="kpi-label">Tổng Leads MKT <i class="fas fa-chart-pie" style="font-size:0.65rem; color:var(--primary); margin-left:4px;"></i></div>
                <div class="kpi-sub">+${analytics.leadsThisMonth} tháng này</div>
              </div>
            </div>

            <div class="kpi-card" style="border-color:rgba(245,158,11,0.4);">
              <div class="kpi-icon" style="background:rgba(245,158,11,0.15);color:#F59E0B;"><i class="fas fa-coins"></i></div>
              <div class="kpi-body">
                <div class="kpi-val" style="color:#F59E0B;">${fmt.currency(analytics.totalCampaignSpent)}</div>
                <div class="kpi-label">Chi Phí Quảng Cáo (Spent)</div>
                <div class="kpi-sub">CPL: ${analytics.totalLeadsFromCampaigns > 0 ? fmt.currency(analytics.avgCPL) : '—'} / Lead</div>
              </div>
            </div>

            <div class="kpi-card" id="kpi-win-rate" style="border-color:rgba(16,185,129,0.4); grid-column:span 2; cursor:pointer;" title="Bấm để xem biểu đồ chi tiết tỷ lệ chốt">
              <div class="kpi-icon" style="background:rgba(16,185,129,0.15);color:#10B981;"><i class="fas fa-trophy"></i></div>
              <div class="kpi-body">
                <div class="kpi-val" style="color:#10B981;">${analytics.winRate}%</div>
                <div class="kpi-label">Tỷ Lệ Chốt Hợp Đồng <i class="fas fa-chart-bar" style="font-size:0.65rem; color:#10B981; margin-left:4px;"></i></div>
                <div class="kpi-sub">${analytics.wonLeads} chốt / ${analytics.wonLeads + analytics.lostLeads} kết thúc</div>
              </div>
            </div>
          ` : user.role === 'kts' ? `
            ${(() => {
              const kTasks = DB.getKtsTasks(user.id, user.role);
              const fastPending = kTasks.filter(t => t.taskType === 'fast_support' && t.status !== 'completed').length;
              const techPending = kTasks.filter(t => t.taskType === 'technical_draw' && t.status !== 'completed').length;
              const cncPending = kTasks.filter(t => t.taskType === 'cnc_export' && t.status !== 'completed').length;

              return `
                <div class="kpi-card" style="border-color:rgba(139,92,246,0.4); cursor:pointer;" onclick="UI.openKtsTaskCategoryModal('fast_support')">
                  <div class="kpi-icon" style="background:rgba(139,92,246,0.15);color:#8B5CF6;"><i class="fas fa-bolt"></i></div>
                  <div class="kpi-body">
                    <div class="kpi-val" style="color:#8B5CF6;">${fastPending}</div>
                    <div class="kpi-label">⚡ Vẽ Phản Ứng Nhanh</div>
                    <div class="kpi-sub">Số task còn lại cần vẽ hỗ trợ Sale</div>
                  </div>
                </div>

                <div class="kpi-card" style="border-color:rgba(59,130,246,0.4); cursor:pointer;" onclick="UI.openKtsTaskCategoryModal('technical_draw')">
                  <div class="kpi-icon" style="background:rgba(59,130,246,0.15);color:#3B82F6;"><i class="fas fa-ruler-combined"></i></div>
                  <div class="kpi-body">
                    <div class="kpi-val" style="color:#3B82F6;">${techPending}</div>
                    <div class="kpi-label">📐 Kết Cấu Chi Tiết</div>
                    <div class="kpi-sub">Số task còn lại cần bóc tách</div>
                  </div>
                </div>

                <div class="kpi-card" style="border-color:rgba(16,185,129,0.4); cursor:pointer;" onclick="UI.openKtsTaskCategoryModal('cnc_export')">
                  <div class="kpi-icon" style="background:rgba(16,185,129,0.15);color:#10B981;"><i class="fas fa-microchip"></i></div>
                  <div class="kpi-body">
                    <div class="kpi-val" style="color:#10B981;">${cncPending}</div>
                    <div class="kpi-label">🖨️ Xuất File CNC</div>
                    <div class="kpi-sub">Số task còn lại chờ nest & xuất file</div>
                  </div>
                </div>
              `;
            })()}
          ` : `
            <div class="kpi-card" id="kpi-total-leads" style="border-color:rgba(197,168,128,0.4); cursor:pointer;" title="Bấm để xem biểu đồ chi tiết tổng leads">
              <div class="kpi-icon" style="background:rgba(197,168,128,0.15);color:var(--primary);"><i class="fas fa-user-friends"></i></div>
              <div class="kpi-body">
                <div class="kpi-val">${analytics.totalLeads}</div>
                <div class="kpi-label">Tổng Leads <i class="fas fa-chart-pie" style="font-size:0.65rem; color:var(--primary); margin-left:4px;"></i></div>
                <div class="kpi-sub">+${analytics.leadsThisMonth} tháng này</div>
              </div>
            </div>

            <div class="kpi-card" id="kpi-win-rate" style="border-color:rgba(16,185,129,0.4); cursor:pointer;" title="Bấm để xem biểu đồ chi tiết tỷ lệ chốt">
              <div class="kpi-icon" style="background:rgba(16,185,129,0.15);color:#10B981;"><i class="fas fa-trophy"></i></div>
              <div class="kpi-body">
                <div class="kpi-val" style="color:#10B981;">${analytics.winRate}%</div>
                <div class="kpi-label">Tỷ Lệ Chốt <i class="fas fa-chart-bar" style="font-size:0.65rem; color:#10B981; margin-left:4px;"></i></div>
                <div class="kpi-sub">${analytics.wonLeads} chốt / ${analytics.wonLeads + analytics.lostLeads} kết thúc</div>
              </div>
            </div>

            <div class="kpi-card" id="kpi-revenue" style="border-color:rgba(59,130,246,0.4); grid-column:span 2; cursor:pointer;" title="Bấm để xem biểu đồ chi tiết doanh thu">
              <div class="kpi-icon" style="background:rgba(59,130,246,0.15);color:#3B82F6;"><i class="fas fa-file-contract"></i></div>
              <div class="kpi-body">
                <div class="kpi-val" style="color:#3B82F6;">${fmt.currency(analytics.revenueThisMonth)}</div>
                <div class="kpi-label">Doanh Thu Tháng Này <i class="fas fa-chart-line" style="font-size:0.65rem; color:#3B82F6; margin-left:4px;"></i></div>
                <div class="kpi-sub">${analytics.totalContracts} hợp đồng tổng cộng</div>
              </div>
            </div>
          `}
        </div>

        <!-- Grid for Pipeline & Appointments / Source Breakdown on PC -->
        <div class="dashboard-grid">
          ${user.role === 'marketing' ? `
            <!-- Lead Source Distribution Mini -->
            <div class="section-card" style="margin-bottom:0;">
              <div class="section-header">
                <i class="fas fa-chart-pie" style="color:var(--primary);"></i>
                <span>Phân Bổ Leads Theo Kênh Ads</span>
                <button class="btn-link" id="dash-go-leads">Xem tất cả →</button>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                ${LEAD_SOURCES.map(src => {
                  const count = analytics.leadsBySource[src.id] || 0;
                  const pct = analytics.totalLeads > 0 ? Math.round(count / analytics.totalLeads * 100) : 0;
                  return `
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:26px; height:26px; border-radius:7px; background:${src.color || 'var(--primary)'}18; border:1px solid ${src.color || 'var(--primary)'}33; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="${src.icon || 'fas fa-ad'}" style="font-size:0.75rem; color:${src.color || 'var(--primary)'};"></i>
                      </div>
                      <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:3px;">
                          <span style="color:var(--text-secondary); font-weight:600;">${src.label}</span>
                          <span style="color:${src.color || 'var(--primary)'}; font-weight:700;">${count} leads (${pct}%)</span>
                        </div>
                        <div style="height:4px; background:rgba(0,0,0,0.06); border-radius:2px; overflow:hidden;">
                          <div style="height:4px; width:${pct}%; background:${src.color || 'var(--primary)'}; border-radius:2px;"></div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Marketing Active Campaigns Tracker -->
            <div class="section-card" style="margin-bottom:0;">
              <div class="section-header">
                <i class="fas fa-bullhorn" style="color:var(--primary);"></i>
                <span>Chiến Dịch Ads Đang Bật</span>
                <button class="btn-link" id="dash-go-campaigns">Quản lý →</button>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                ${(DB.getCampaigns() || []).length === 0 ? `<div class="empty-state"><i class="fas fa-bullhorn"></i><p>Chưa có chiến dịch Ads nào.</p></div>` :
                  (DB.getCampaigns() || []).map(c => `
                    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; font-size:0.78rem;">
                      <div>
                        <strong style="color:var(--text-primary);">${c.name}</strong>
                        <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">Kênh: <strong style="color:#3B82F6;">${c.platform.toUpperCase()}</strong> · N.Sách: ${fmt.currency(c.budget)}</div>
                      </div>
                      <div style="text-align:right;">
                        <strong style="color:#10B981; font-size:0.85rem;">${c.leadsGenerated || 0} leads</strong>
                        <div style="font-size:0.68rem; color:#F59E0B; margin-top:2px;">Đã chi: ${fmt.currency(c.spent)}</div>
                      </div>
                    </div>
                  `).join('')
                }
              </div>
            </div>
          ` : user.role === 'kts' ? `
            <!-- KTS Active Tasks Card (Replaces Pipeline Leads for KTS) -->
            <div class="section-card" style="margin-bottom:0;">
              <div class="section-header">
                <i class="fas fa-tasks" style="color:#8B5CF6;"></i>
                <span>Các Công Việc Được Giao Cần Làm</span>
                <button class="btn-link" id="dash-go-kts-tasks">Xem tất cả →</button>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                ${(() => {
                  const activeKtsTasks = DB.getKtsTasks(user.id, user.role).filter(t => t.status !== 'completed');
                  if (activeKtsTasks.length === 0) {
                    return `<div class="empty-state" style="padding:20px; text-align:center;"><i class="fas fa-clipboard-check" style="font-size:2rem; color:var(--text-muted);"></i><p style="margin-top:6px; font-size:0.8rem; color:var(--text-secondary);">Hiện không có công việc nào cần xử lý.</p></div>`;
                  }
                  const getCountdown = (deadlineStr) => {
                    if (!deadlineStr) return { label: 'Chưa đặt hạn', color: '#64748B' };
                    const diffMs = new Date(deadlineStr).getTime() - new Date().getTime();
                    if (diffMs <= 0) return { label: '⛔ QUÁ HẠN', color: '#EF4444' };
                    const mins = Math.floor(diffMs / (1000 * 60));
                    const hours = Math.floor(mins / 60);
                    const days = Math.floor(hours / 24);
                    if (days === 0) return { label: `🔥 Còn ${hours}h ${mins % 60}p`, color: '#F59E0B' };
                    if (days === 1) return { label: `🟡 Còn 1d ${hours % 24}h`, color: '#3B82F6' };
                    return { label: `🟢 Còn ${days}d ${hours % 24}h`, color: '#10B981' };
                  };

                  return activeKtsTasks.slice(0, 5).map(t => {
                    const cd = getCountdown(t.deadline);
                    return `
                      <div class="list-item" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:10px; padding:10px 12px; border-left:4px solid ${cd.color}; cursor:pointer;" onclick="UI.openKtsTaskCategoryModal('${t.taskType}', DB.getCurrentUser())">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                          <div>
                            <strong style="color:var(--text-primary); font-size:0.85rem;">${t.title}</strong>
                            <div style="font-size:0.72rem; color:var(--primary); font-weight:700; margin-top:2px;">
                              <i class="fas fa-building"></i> ${t.leadName}
                            </div>
                            <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">
                              Giao bởi: ${t.assignerName || 'Sale'}
                            </div>
                          </div>
                          <div style="font-size:0.7rem; font-weight:800; color:${cd.color}; background:${cd.color}15; border:1px solid ${cd.color}35; padding:4px 8px; border-radius:6px; flex-shrink:0;">
                            ${cd.label}
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('');
                })()}
              </div>
            </div>
          ` : `
            <!-- Lead Pipeline Mini for Sales & Admin -->
            <div class="section-card" style="margin-bottom:0;">
              <div class="section-header">
                <i class="fas fa-filter" style="color:var(--primary);"></i>
                <span>Pipeline Leads</span>
                <button class="btn-link" id="dash-go-leads">Xem tất cả →</button>
              </div>
              <div style="display:flex; flex-direction:column; gap:7px; margin-top:10px;">
                ${LEAD_STAGES.filter(s => s.id !== 'lost').map(s => {
                  const count = analytics.leadsByStage[s.id] || 0;
                  const pct = analytics.totalLeads > 0 ? Math.round(count / analytics.totalLeads * 100) : 0;
                  return `
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:22px; height:22px; border-radius:6px; background:${s.color}22; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fas ${s.icon}" style="font-size:0.6rem; color:${s.color};"></i>
                      </div>
                      <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; font-size:0.72rem; margin-bottom:3px;">
                          <span style="color:var(--text-secondary);">${s.label}</span>
                          <span style="color:${s.color}; font-weight:700;">${count}</span>
                        </div>
                        <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                          <div style="height:4px; width:${pct}%; background:${s.color}; border-radius:2px;"></div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `}

          <!-- Upcoming Appointments -->
          <div class="section-card" style="margin-bottom:0;">
            <div class="section-header">
              <i class="fas fa-calendar-alt" style="color:var(--primary);"></i>
              <span>Lịch Hẹn Sắp Tới</span>
              <button class="btn-link" id="dash-go-apt">Xem tất cả →</button>
            </div>
            ${upcoming.length === 0 ? `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>Không có lịch hẹn sắp tới.</p></div>` :
        upcoming.map(a => {
          const cd = getCountdownInfo(a.datetime);
          const aptOwner = DB.getUserById(a.assignedTo);
          return `
                  <div class="list-item dash-apt-item" data-id="${a.id}" style="margin-top:8px; display:flex; justify-content:space-between; align-items:center; gap:8px; border-left:4px solid ${cd.color}; padding:11px 14px; background:var(--bg-secondary); border-radius:12px; cursor:pointer;" title="Bấm để xem chi tiết & ghi chú lịch hẹn">
                    <div style="flex:1; min-width:0;">
                      <!-- PROMINENT BIG BOLD CUSTOMER NAME -->
                      <div style="font-size:0.98rem; font-weight:800; color:var(--primary); display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                        <i class="fas fa-user-circle" style="font-size:0.95rem;"></i> ${a.leadName || 'Khách Hàng'}
                      </div>
                      <div style="font-size:0.82rem; font-weight:600; color:var(--text-primary);">${a.title}</div>
                      <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        ${aptOwner ? `<span><i class="fas fa-user-tie"></i> Sale: <strong style="color:var(--text-secondary);">${aptOwner.name}</strong></span>` : ''}
                        <span><i class="fas fa-clock"></i> ${fmt.datetime(a.datetime)}</span>
                      </div>
                    </div>
                    <!-- EYE-CATCHING PROMINENT COUNTDOWN BADGE -->
                    <div style="background:${cd.bg}; border:1.5px solid ${cd.border}; color:${cd.color}; padding:6px 12px; border-radius:10px; text-align:center; flex-shrink:0; font-weight:800; font-size:0.78rem; box-shadow:0 3px 10px ${cd.color}25; text-transform:uppercase; letter-spacing:0.3px;">
                      <div style="font-size:0.85rem; display:inline-block; margin-right:4px;">${cd.icon}</div>${cd.label}
                    </div>
                  </div>
                `;
        }).join('')
      }
          </div>
        </div>
      </div>
    `;

    // Approve / Reject / Detail Event Handlers
    body.querySelectorAll('.btn-detail-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const req = DB.getApprovals().find(a => a.id === id);
        if (req) this.openApprovalDetailModal(req, user);
      });
    });

    body.querySelectorAll('.btn-approve-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        DB.approveRequest(id, user.id);
        Toast.success('Đã duyệt thay đổi thông tin!');
        this.renderDashboard(user);
      });
    });

    body.querySelectorAll('.btn-reject-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        DB.rejectRequest(id, user.id, 'Chưa đủ điều kiện duyệt');
        Toast.success('Đã từ chối yêu cầu.');
        this.renderDashboard(user);
      });
    });

    document.getElementById('dash-go-leads')?.addEventListener('click', () => this._navigate('leads', user));
    document.getElementById('dash-go-apt')?.addEventListener('click', () => this._navigate('appointments', user));
    document.getElementById('dash-go-campaigns')?.addEventListener('click', () => this._navigate('campaigns', user));
    document.getElementById('btn-goto-unassigned-leads')?.addEventListener('click', () => this.renderLeads(user, 'all', 'unassigned'));

    // Dashboard appointment card click listener
    body.querySelectorAll('.dash-apt-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        this.openAppointmentDrawer(id, user, () => this.renderDashboard(user));
      });
    });

    // Payment Notifications handlers on Dashboard
    body.querySelectorAll('.btn-mark-pay-read').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        DB.markNotificationRead(id);
        Toast.success('Đã xác nhận khoản thu.');
        this.renderDashboard(user);
        this.refreshHeaderNotif(user);
      });
    });

    document.getElementById('btn-read-all-pay-notifs')?.addEventListener('click', () => {
      DB.markAllNotificationsRead();
      Toast.success('Đã đánh dấu tất cả khoản thu là đã xem.');
      this.renderDashboard(user);
      this.refreshHeaderNotif(user);
    });

    // KPI Cards Chart Modals Click Listeners
    document.getElementById('kpi-total-leads')?.addEventListener('click', () => this.openTotalLeadsChartModal(user));
    document.getElementById('kpi-win-rate')?.addEventListener('click', () => this.openWinRateChartModal(user));
    document.getElementById('kpi-revenue')?.addEventListener('click', () => this.openRevenueChartModal(user));
  },

  openTotalLeadsChartModal(user) {
    const leads = DB.getLeads(user.id, user.role);
    const total = leads.length;
    
    // Group by source
    const bySource = LEAD_SOURCES.map(s => {
      const cnt = leads.filter(l => l.source === s.id).length;
      const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
      return { label: s.label, icon: s.icon, count: cnt, pct };
    }).sort((a, b) => b.count - a.count);

    // Group by assignee
    const users = DB.getUsers();
    const byAssignee = users.map(u => {
      const cnt = leads.filter(l => l.assignedTo === u.id).length;
      const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
      return { name: u.name, role: u.role, count: cnt, pct };
    }).filter(x => x.count > 0).sort((a, b) => b.count - a.count);

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(197,168,128,0.08); border:1px solid rgba(197,168,128,0.3); border-radius:12px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Tổng Số Khách Hàng (Leads)</div>
            <div style="font-size:1.6rem; font-weight:800; color:var(--primary);">${total} Leads</div>
          </div>
          <div style="font-size:2rem; color:var(--primary); opacity:0.4;"><i class="fas fa-user-friends"></i></div>
        </div>

        <!-- Biểu đồ Nguồn Khách -->
        <div>
          <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
            📊 Phân Bổ Theo Nguồn Khách Hàng (Channel Breakdown)
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
            ${bySource.map(s => `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                  <span><i class="fab ${s.icon}" style="color:var(--primary); width:16px;"></i> <strong>${s.label}</strong></span>
                  <span style="font-weight:700; color:var(--primary);">${s.count} lead (${s.pct}%)</span>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                  <div style="height:100%; width:${s.pct}%; background:linear-gradient(90deg, var(--primary), #E6CA9E); border-radius:4px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Phân bổ theo Sale -->
        <div>
          <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
            👤 Phân Bổ Leads Theo Nhân Sự Phụ Trách
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
            ${byAssignee.length === 0 ? `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">Chưa có phân công</div>` :
              byAssignee.map(a => `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                    <span><strong>${a.name}</strong> <span style="font-size:0.65rem; color:var(--text-muted);">(${roleLabel(a.role)})</span></span>
                    <span style="font-weight:700; color:#3B82F6;">${a.count} lead (${a.pct}%)</span>
                  </div>
                  <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${a.pct}%; background:linear-gradient(90deg, #3B82F6, #60A5FA); border-radius:4px;"></div>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    `;

    Modal.create('Biểu Đồ & Phân Tích Tổng Leads', html);
  },

  openWinRateChartModal(user) {
    const leads = DB.getLeads(user.id, user.role);
    const won = leads.filter(l => l.stage === 'won');
    const lost = leads.filter(l => l.stage === 'lost');
    const totalEnded = won.length + lost.length;
    const winRate = totalEnded > 0 ? Math.round((won.length / totalEnded) * 100) : 0;

    const failReasons = {};
    lost.forEach(l => {
      const r = l.failReason || 'Khác / Chưa ghi rõ';
      failReasons[r] = (failReasons[r] || 0) + 1;
    });

    const sortedReasons = Object.entries(failReasons)
      .map(([reason, count]) => ({ reason, count, pct: lost.length > 0 ? Math.round((count / lost.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); border-radius:12px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Tỷ Lệ Chốt Hợp Đồng Thành Công</div>
            <div style="font-size:1.6rem; font-weight:800; color:#10B981;">${winRate}%</div>
            <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">Chốt: ${won.length} | Thất bại: ${lost.length} | Tổng kết thúc: ${totalEnded}</div>
          </div>
          <div style="font-size:2rem; color:#10B981; opacity:0.4;"><i class="fas fa-trophy"></i></div>
        </div>

        <!-- Thanh Tỷ Lệ Chốt vs Thất Bại -->
        <div>
          <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
            ⚖️ Tỷ Lệ Chốt vs Thất Bại (Win / Loss Ratio)
          </div>
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
            <div style="height:14px; background:rgba(239,68,68,0.2); border-radius:7px; overflow:hidden; display:flex;">
              <div style="height:100%; width:${winRate}%; background:linear-gradient(90deg, #10B981, #34D399);"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; margin-top:6px; font-weight:700;">
              <span style="color:#10B981;">🏆 Thành công: ${won.length} deal (${winRate}%)</span>
              <span style="color:#EF4444;">❌ Thất bại: ${lost.length} deal (${totalEnded > 0 ? 100 - winRate : 0}%)</span>
            </div>
          </div>
        </div>

        <!-- Biểu đồ Lý do Thất Bại -->
        <div>
          <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
            ❌ Top Lý Do Thất Bại (Fail Reasons Analysis)
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
            ${sortedReasons.length === 0 ? `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">Chưa có deal nào thất bại 🎉</div>` :
              sortedReasons.map(r => `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                    <span style="color:var(--text-secondary);"><i class="fas fa-exclamation-circle" style="color:#EF4444;"></i> <strong>${r.reason}</strong></span>
                    <span style="font-weight:700; color:#EF4444;">${r.count} lượt (${r.pct}%)</span>
                  </div>
                  <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${r.pct}%; background:linear-gradient(90deg, #EF4444, #F87171); border-radius:4px;"></div>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    `;

    Modal.create('Biểu Đồ Chi Tiết Tỷ Lệ Chốt & Lý Do Fail', html);
  },

  openRevenueChartModal(user) {
    const contracts = DB.getContracts(user.id, user.role);
    const totalVal = contracts.reduce((s, c) => s + (c.value || 0), 0);
    
    let totalCollected = 0;
    contracts.forEach(c => {
      (c.payments || []).forEach(p => { totalCollected += (p.amount || 0); });
    });
    const debt = Math.max(0, totalVal - totalCollected);
    const collectedPct = totalVal > 0 ? Math.round((totalCollected / totalVal) * 100) : 0;

    const users = DB.getUsers();
    const bySale = users.map(u => {
      const uContracts = contracts.filter(c => c.assignedTo === u.id);
      const val = uContracts.reduce((s, c) => s + (c.value || 0), 0);
      return { name: u.name, role: u.role, value: val, count: uContracts.length };
    }).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.3); border-radius:12px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Tổng Giá Trị Hợp Đồng</div>
            <div style="font-size:1.5rem; font-weight:800; color:#3B82F6;">${fmt.currency(totalVal)}</div>
            <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">Tổng ${contracts.length} hợp đồng đã ký kết</div>
          </div>
          <div style="font-size:2rem; color:#3B82F6; opacity:0.4;"><i class="fas fa-file-invoice-dollar"></i></div>
        </div>

        <!-- Tiến Độ Thu Tiền vs Công Nợ -->
        <div>
          <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
            💰 Tiến Độ Thu Tiền Đợt Thanh Toán (Cashflow Status)
          </div>
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
            <div style="height:12px; background:rgba(245,158,11,0.2); border-radius:6px; overflow:hidden; display:flex;">
              <div style="height:100%; width:${collectedPct}%; background:linear-gradient(90deg, #10B981, #34D399);"></div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px; font-size:0.72rem;">
              <div style="background:rgba(16,185,129,0.08); padding:8px; border-radius:8px; border:1px solid rgba(16,185,129,0.25);">
                <span style="color:var(--text-muted); display:block;">Đã thu thực tế:</span>
                <strong style="color:#10B981; font-size:0.85rem;">${fmt.currency(totalCollected)}</strong> (${collectedPct}%)
              </div>
              <div style="background:rgba(245,158,11,0.08); padding:8px; border-radius:8px; border:1px solid rgba(245,158,11,0.25);">
                <span style="color:var(--text-muted); display:block;">Còn phải thu (Công nợ):</span>
                <strong style="color:#F59E0B; font-size:0.85rem;">${fmt.currency(debt)}</strong> (${totalVal > 0 ? 100 - collectedPct : 0}%)
              </div>
            </div>
          </div>
        </div>

        ${user.role === 'manager' ? `
        <!-- Biểu đồ Doanh Thu Theo Sale -->
        <div>
          <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
            🏆 Bảng Xếp Hạng Doanh Thu Theo Nhân Sự (Top Performers)
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
            ${bySale.length === 0 ? `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">Chưa có hợp đồng nào phát sinh doanh thu</div>` :
              bySale.map(s => {
                const sPct = totalVal > 0 ? Math.round((s.value / totalVal) * 100) : 0;
                return `
                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                      <span>🥇 <strong>${s.name}</strong> <span style="font-size:0.65rem; color:var(--text-muted);">(${s.count} HĐ)</span></span>
                      <span style="font-weight:700; color:#10B981;">${fmt.currency(s.value)} (${sPct}%)</span>
                    </div>
                    <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                      <div style="height:100%; width:${sPct}%; background:linear-gradient(90deg, #10B981, #34D399); border-radius:4px;"></div>
                    </div>
                  </div>
                `;
              }).join('')
            }
          </div>
        </div>
        ` : ''}
      </div>
    `;

    Modal.create('Biểu Đồ Chi Tiết Doanh Thu & Thu Tiền', html);
  },

  openNotificationsModal(user = null) {
    if (!user) user = DB.getCurrentUser();
    const notifs = DB.getNotifications('all', user);
    const unread = notifs.filter(n => n.status === 'unread');

    const html = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; color:var(--text-muted);">Có ${unread.length} thông báo chưa đọc</span>
          ${unread.length > 0 ? `<button id="notif-modal-read-all" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10B981; font-size:0.72rem; font-weight:700; padding:4px 10px; border-radius:6px; cursor:pointer;"><i class="fas fa-check-double"></i> Đã đọc tất cả</button>` : ''}
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; max-height:60vh; overflow-y:auto; padding-right:4px;">
          ${notifs.length === 0 ? `<div class="empty-state" style="padding:20px; text-align:center;"><i class="fas fa-bell-slash" style="font-size:2rem; color:var(--text-muted);"></i><p style="margin-top:6px; font-size:0.8rem; color:var(--text-secondary);">Chưa có thông báo nào.</p></div>` :
            notifs.map(n => {
              const isPayment = n.type === 'new_payment' || (n.amount > 0 && n.customerName);
              const icon = isPayment ? '💰' : (n.type.includes('completed') ? '✅' : '🚀');
              const titleText = isPayment 
                ? `<span style="color:#3B82F6;">${n.collectorName || 'Nhân viên'}</span> vừa thu <span style="color:#10B981; font-weight:800;">${fmt.currency(n.amount)}</span>`
                : (n.title || 'Thông báo mới');
              const subText = isPayment
                ? `Khách hàng: <strong>${n.customerName || 'Khách hàng'}</strong> (Mã HĐ: <span style="font-family:monospace; color:var(--primary);">${n.contractCode || 'N/A'}</span>)`
                : (n.message || '');

              return `
                <div style="background:${n.status === 'unread' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)'}; border:1px solid ${n.status === 'unread' ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}; border-radius:10px; padding:10px 12px; font-size:0.8rem;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div style="flex:1;">
                      <div style="font-weight:700; color:var(--text-primary);">
                        ${icon} ${titleText}
                      </div>
                      ${subText ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px;">${subText}</div>` : ''}
                      <div style="font-size:0.68rem; color:var(--text-muted); margin-top:3px;">
                        <i class="fas fa-clock"></i> ${fmt.timeAgo(n.createdAt)}
                      </div>
                      ${n.note ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">Ghi chú: ${n.note}</div>` : ''}
                      ${n.proofImage ? `
                        <div style="margin-top:6px; display:flex; align-items:center; gap:6px;">
                          <img src="${n.proofImage}" style="width:48px; height:48px; border-radius:6px; object-fit:cover; border:1px solid #10B981; cursor:zoom-in;" onclick="event.stopPropagation();showPhotoLightbox('${n.proofImage}')" title="Bấm để xem ảnh kiểm chứng">
                          <span style="font-size:0.7rem; color:#10B981; font-weight:600; cursor:pointer;" onclick="event.stopPropagation();showPhotoLightbox('${n.proofImage}')"><i class="fas fa-image"></i> Xem ảnh kiểm chứng</span>
                        </div>
                      ` : ''}
                    </div>
                    ${n.status === 'unread' ? `<button class="notif-item-read-btn" data-id="${n.id}" style="background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.4); color:#10B981; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer;"><i class="fas fa-check"></i> Đã đọc</button>` : ''}
                  </div>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>
    `;

    const modal = Modal.create('🔔 Trung Tâm Thông Báo', html);

    document.getElementById('notif-modal-read-all')?.addEventListener('click', () => {
      DB.markAllNotificationsRead();
      Toast.success('Đã đánh dấu tất cả thông báo là đã đọc.');
      modal.close();
      this.refreshHeaderNotif(user);
    });

    modal.element.querySelectorAll('.notif-item-read-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        DB.markNotificationRead(id);
        modal.close();
        this.openNotificationsModal(user);
        this.refreshHeaderNotif(user);
      });
    });
  },

  refreshHeaderNotif(user) {
    const unread = DB.getNotifications('unread');
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (unread.length > 0) {
      badge.style.display = 'flex';
      badge.textContent = unread.length;
    } else {
      badge.style.display = 'none';
    }
  },

  openApprovalDetailModal(app, user) {
    const oldD = app.oldData || {};
    const newD = app.newData || {};
    
    const fields = [
      { key: 'name', label: 'Tên Khách Hàng / Zalo' },
      { key: 'phone', label: 'Số Điện Thoại' },
      { key: 'source', label: 'Nguồn Khách', fmt: (val) => LEAD_SOURCES.find(s => s.id === val)?.label || val },
      { key: 'stage', label: 'Giai Đoạn CRM', fmt: (val) => LEAD_STAGES.find(s => s.id === val)?.label || val },
      { key: 'interestedIn', label: 'Hạng Mục Quan Tâm' },
      { key: 'address', label: 'Địa Chỉ' },
      { key: 'assignedTo', label: 'Sale Phụ Trách', fmt: (val) => DB.getUserById(val)?.name || val },
      { key: 'assignedDesigner', label: 'KTS Đo Đạc', fmt: (val) => DB.getUserById(val)?.name || val },
      { key: 'note', label: 'Ghi Chú Yêu Cầu' }
    ];

    const diffRows = fields.map(f => {
      const oldVal = f.fmt ? f.fmt(oldD[f.key]) : (oldD[f.key] || '—');
      const newVal = f.fmt ? f.fmt(newD[f.key]) : (newD[f.key] || '—');
      const isChanged = oldVal !== newVal;
      return {
        label: f.label,
        oldVal,
        newVal,
        isChanged
      };
    }).filter(r => r.isChanged || r.label === 'Tên Khách Hàng / Zalo');

    const html = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:10px; font-size:0.78rem; color:#F59E0B;">
          <i class="fas fa-user-edit"></i> Người gửi yêu cầu: <strong style="color:var(--text-primary);">${app.requesterName}</strong> (${fmt.timeAgo(app.createdAt)})
        </div>

        <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:2px;">
          📊 Bảng So Sánh Thay Đổi Chi Tiết (Trước vs Sau):
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; max-height:60vh; overflow-y:auto; scrollbar-width:none; padding-right:4px;">
          ${diffRows.map(r => `
            <div style="background:${r.isChanged ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)'}; border:1px solid ${r.isChanged ? 'rgba(245,158,11,0.35)' : 'var(--border-color)'}; border-radius:10px; padding:10px 12px;">
              <div style="font-size:0.75rem; font-weight:700; color:${r.isChanged ? '#F59E0B' : 'var(--text-muted)'}; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                <span>${r.label}</span>
                ${r.isChanged ? '<span style="font-size:0.62rem; background:rgba(245,158,11,0.2); color:#F59E0B; padding:2px 6px; border-radius:4px;">⚡ Đã Sửa</span>' : ''}
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.75rem;">
                <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); padding:8px; border-radius:6px; color:var(--text-secondary);">
                  <span style="font-size:0.64rem; color:#EF4444; font-weight:700; display:block; margin-bottom:2px;">Dữ Liệu Cũ:</span>
                  <span style="text-decoration:line-through; opacity:0.85;">${r.oldVal}</span>
                </div>
                <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); padding:8px; border-radius:6px; color:#10B981; font-weight:700;">
                  <span style="font-size:0.64rem; color:#10B981; font-weight:700; display:block; margin-bottom:2px;">Yêu Cầu Sửa Thành:</span>
                  ${r.newVal}
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display:flex; gap:10px; margin-top:8px;">
          <button id="modal-btn-reject-req" style="flex:1; background:rgba(239,68,68,0.15); color:#EF4444; border:1px solid rgba(239,68,68,0.4); padding:10px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer;">
            <i class="fas fa-times"></i> Từ Chối Yêu Cầu
          </button>
          <button id="modal-btn-approve-req" style="flex:1; background:#10B981; color:#fff; border:none; padding:10px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer;">
            <i class="fas fa-check"></i> Duyệt Thay Đổi Ngay
          </button>
        </div>
      </div>
    `;

    const modal = Modal.create(`Chi Tiết Duyệt Sửa - ${app.targetName}`, html);

    document.getElementById('modal-btn-approve-req')?.addEventListener('click', () => {
      DB.approveRequest(app.id, user.id);
      Toast.success('Đã duyệt thay đổi thông tin!');
      modal.close();
      this.renderDashboard(user);
    });

    document.getElementById('modal-btn-reject-req')?.addEventListener('click', () => {
      DB.rejectRequest(app.id, user.id, 'Chưa đủ điều kiện duyệt');
      Toast.success('Đã từ chối yêu cầu.');
      modal.close();
      this.renderDashboard(user);
    });
  },

  // ══════════════════════════════════════════════════════
  //  4. LEADS CRM
  // ══════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════
  //  4. LEADS CRM
  // ══════════════════════════════════════════════════════
  renderLeads(user, filterStage = 'all', filterAssignee = (user.role === 'sales' ? 'my_leads' : 'all')) {
    this._setActiveNav('leads');
    const body = this._getBody();
    const leads = DB.getLeads(user.id, user.role);
    const assignableUsers = DB.getUsers().filter(u => u.role === 'sales' || u.role === 'manager' || u.role === 'marketing');

    // 1. Filter by Assignee
    let filtered = leads;
    if (user.role === 'sales') {
      if (filterAssignee === 'unassigned') {
        filtered = leads.filter(l => !l.assignedTo);
      } else {
        filtered = leads.filter(l => l.assignedTo === user.id);
      }
    } else {
      if (filterAssignee === 'my_leads') {
        filtered = filtered.filter(l => l.assignedTo === user.id);
      } else if (filterAssignee === 'unassigned') {
        filtered = filtered.filter(l => !l.assignedTo);
      } else if (filterAssignee !== 'all') {
        filtered = filtered.filter(l => l.assignedTo === filterAssignee);
      }
    }

    // 2. Filter by Stage
    if (filterStage !== 'all') {
      filtered = filtered.filter(l => l.stage === filterStage);
    }

    body.innerHTML = `
      <div class="page-content fade-in">
        <div class="page-title-row" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <h2 class="page-title" style="margin:0;"><i class="fas fa-user-friends"></i> Leads CRM</h2>
          <button class="btn-primary btn-sm" id="btn-new-lead" style="white-space:nowrap; padding:7px 12px; font-size:0.75rem; flex-shrink:0;"><i class="fas fa-plus"></i> Thêm Khách Mới</button>
        </div>

        <!-- Salesperson Filter Row -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:12px; padding:10px 12px; margin-bottom:12px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <label style="font-size:0.78rem; font-weight:700; color:var(--primary);"><i class="fas fa-user-check"></i> Phạm Vi Xem Khách Hàng:</label>
            <span style="font-size:0.7rem; color:var(--text-muted);">Hiển thị: <strong style="color:var(--primary);">${filtered.length}</strong> khách</span>
          </div>
          <select id="leads-assignee-filter" class="form-select" style="font-size:0.78rem; font-weight:700; border-color:var(--primary); padding:8px 10px; width:100%; border-radius:8px;">
            ${user.role === 'sales' ? `
              <option value="my_leads" ${filterAssignee === 'my_leads' ? 'selected' : ''}>⭐ Leads Của Tôi (${leads.filter(l => l.assignedTo === user.id).length})</option>
              <option value="unassigned" ${filterAssignee === 'unassigned' ? 'selected' : ''}>❓ Leads Chưa Ai Nhận (${leads.filter(l => !l.assignedTo).length})</option>
            ` : `
              <option value="all" ${filterAssignee === 'all' ? 'selected' : ''}>🌐 Tất Cả Khách Hàng (${leads.length})</option>
              <option value="my_leads" ${filterAssignee === 'my_leads' ? 'selected' : ''}>⭐ Leads Của Tôi (${user.name.split(' ').pop()}) (${leads.filter(l => l.assignedTo === user.id).length})</option>
              <option value="unassigned" ${filterAssignee === 'unassigned' ? 'selected' : ''}>❓ Leads Chưa Ai Nhận (${leads.filter(l => !l.assignedTo).length})</option>
              <optgroup label="Từng Nhân Sự Sale">
                ${assignableUsers.map(u => `<option value="${u.id}" ${filterAssignee === u.id ? 'selected' : ''}>👤 ${u.name} (${roleLabel(u.role)}) (${leads.filter(l => l.assignedTo === u.id).length})</option>`).join('')}
              </optgroup>
            `}
          </select>
        </div>

        <!-- Stage Filter Tabs -->
        <div class="stage-filter-bar">
          <button class="stage-filter-btn ${filterStage === 'all' ? 'active' : ''}" data-stage="all">Tất Cả (${leads.length})</button>
          ${LEAD_STAGES.map(s => {
      const count = leads.filter(l => l.stage === s.id).length;
      return `<button class="stage-filter-btn ${filterStage === s.id ? 'active' : ''}" data-stage="${s.id}" style="${filterStage === s.id ? `background:${s.color}22;border-color:${s.color}55;color:${s.color};` : ''}">${s.label} (${count})</button>`;
    }).join('')}
        </div>

        <!-- Leads List -->
        <div id="leads-list" style="display:flex; flex-direction:column; gap:10px; margin-top:4px;">
          ${filtered.length === 0 ? `<div class="empty-state"><i class="fas fa-user-slash"></i><p>Chưa có lead nào thuộc bộ lọc này.</p></div>` :
        filtered.map(l => this._buildLeadCard(l, user)).join('')
      }
        </div>
      </div>
    `;

    // Salesperson filter listener
    document.getElementById('leads-assignee-filter')?.addEventListener('change', (e) => {
      this.renderLeads(user, filterStage, e.target.value);
    });

    // Stage filter listener
    body.querySelectorAll('.stage-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => this.renderLeads(user, btn.getAttribute('data-stage'), filterAssignee));
    });

    // New lead
    document.getElementById('btn-new-lead')?.addEventListener('click', () => this.openLeadForm(null, user, () => this.renderLeads(user, filterStage, filterAssignee)));

    // Event delegation for lead list (cards, claim, edit & delete buttons)
    const listContainer = body.querySelector('#leads-list');
    if (listContainer) {
      listContainer.addEventListener('click', (e) => {
        const claimBtn = e.target.closest('.lead-btn-claim');
        if (claimBtn) {
          e.stopPropagation();
          const id = claimBtn.getAttribute('data-id');
          DB.updateLead(id, { assignedTo: user.id }, user.id);
          Toast.success('Đã nhận phụ trách khách hàng này!');
          this.renderLeads(user, filterStage, filterAssignee);
          return;
        }

        const deleteBtn = e.target.closest('.lead-btn-delete');
        if (deleteBtn) {
          e.stopPropagation();
          const id = deleteBtn.getAttribute('data-id');
          const l = DB.getLead(id);
          this.confirmDelete('Xóa Khách Hàng', `Bạn có chắc chắn muốn xóa khách hàng "${l?.name || 'này'}" khỏi hệ thống?`, () => {
            DB.deleteLead(id);
            Toast.success('Đã xóa khách hàng.');
            this.renderLeads(user, filterStage, filterAssignee);
          });
          return;
        }

        const editBtn = e.target.closest('.lead-btn-edit');
        if (editBtn) {
          e.stopPropagation();
          const id = editBtn.getAttribute('data-id');
          this.openLeadForm(id, user, () => this.renderLeads(user, filterStage, filterAssignee));
          return;
        }

        const card = e.target.closest('.lead-card');
        if (card) {
          this.openLeadDrawer(card.getAttribute('data-id'), user);
        }
      });
    }
  },

  _buildLeadCard(l, user) {
    const stage = LEAD_STAGES.find(s => s.id === l.stage) || LEAD_STAGES[0];
    const source = LEAD_SOURCES.find(s => s.id === l.source);
    const assignee = DB.getUserById(l.assignedTo);
    const revCount = (l.revisions || []).length;
    const isMine = l.assignedTo === user.id;
    const canEditLead = user.role === 'manager' || (l.assignedTo && l.assignedTo === user.id);
    const canDeleteLead = user.role === 'manager';
    const camp = l.campaignId ? DB.getCampaign(l.campaignId) : null;

    return `
      <div class="lead-card" data-id="${l.id}" style="border-left:3px solid ${stage.color};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.92rem; font-weight:700; color:var(--text-primary); margin-bottom:3px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span>${l.name}</span>
              ${isMine ? `<span style="font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:5px; background:rgba(197,168,128,0.18); color:var(--primary); border:1px solid rgba(197,168,128,0.4);"><i class="fas fa-star"></i> Của Tôi</span>` : ''}
              ${revCount > 0 ? `<span style="font-size:0.62rem; font-weight:700; padding:2px 6px; border-radius:6px; background:rgba(236,72,153,0.15); color:#EC4899; border:1px solid rgba(236,72,153,0.3);"><i class="fas fa-sync-alt"></i> Sơ Bộ Lần ${revCount + 1}</span>` : ''}
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); display:flex; gap:8px; flex-wrap:wrap;">
              ${l.phone ? `<span><i class="fas fa-phone-alt"></i> ${l.phone}</span>` : ''}
              ${source ? `<span><i class="${source.icon}"></i> ${source.label}</span>` : ''}
              ${camp ? `<span style="color:#3B82F6; font-weight:600;"><i class="fas fa-bullhorn"></i> ${camp.name}</span>` : ''}
            </div>
          </div>
          <span style="font-size:0.64rem; font-weight:700; padding:3px 8px; border-radius:6px; background:${stage.color}22; color:${stage.color}; border:1px solid ${stage.color}44; white-space:nowrap; flex-shrink:0;">
            <i class="fas ${stage.icon}"></i> ${stage.label}
          </span>
        </div>
        ${l.interestedIn ? `<div style="font-size:0.72rem; color:var(--text-secondary); margin-top:6px;"><i class="fas fa-cube" style="color:var(--primary);"></i> ${l.interestedIn}</div>` : ''}
        ${(l.surveyBy && l.stage === 'survey') ? `<div style="font-size:0.72rem; color:#8B5CF6; font-weight:700; margin-top:4px;"><i class="fas fa-ruler-combined"></i> Người đi đo: ${l.surveyBy}</div>` : ''}
        ${l.stage === 'lost' ? `<div style="font-size:0.72rem; color:#EF4444; margin-top:4px; font-weight:600;"><i class="fas fa-exclamation-triangle"></i> Fail: ${l.failReason || 'Khách hủy deal'}</div>` : ''}
        ${l.note ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;"><i class="fas fa-sticky-note" style="color:var(--primary); font-size:0.68rem;"></i> ${l.note}</div>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; gap:6px;">
          <!-- PROMINENT SALE BADGE & TIME -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="font-size:0.78rem; font-weight:800; background:rgba(59,130,246,0.14); color:#3B82F6; border:1px solid rgba(59,130,246,0.35); padding:3px 9px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;">
              <i class="fas fa-user-tie" style="font-size:0.75rem;"></i>
              <span>Sale: <strong>${assignee ? assignee.name : 'Chưa phân công'}</strong></span>
            </div>
            <span style="font-size:0.68rem; color:var(--text-muted);"><i class="fas fa-clock"></i> ${fmt.timeAgo(l.createdAt)}</span>
          </div>
          <div style="display:flex; gap:6px;">
            ${canEditLead ? `<button class="lead-action-btn lead-btn-edit" data-id="${l.id}" title="Sửa thông tin (Cần Admin duyệt)" style="background:rgba(255,255,255,0.05);border:1px solid var(--border-color);color:var(--primary);cursor:pointer;padding:6px 10px;border-radius:8px;font-size:0.8rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-edit"></i></button>` : ''}
            ${canDeleteLead ? `<button class="lead-action-btn lead-btn-delete" data-id="${l.id}" title="Xóa (Dành cho Admin)" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#EF4444;cursor:pointer;padding:6px 10px;border-radius:8px;font-size:0.8rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-trash-alt"></i></button>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  openLeadDrawer(leadId, user) {
    const lead = DB.getLead(leadId);
    if (!lead) return;
    const stage = LEAD_STAGES.find(s => s.id === lead.stage) || LEAD_STAGES[0];
    const source = LEAD_SOURCES.find(s => s.id === lead.source);
    const assignee = DB.getUserById(lead.assignedTo);
    const assignableUsers = DB.getUsers().filter(u => u.role === 'sales' || u.role === 'manager' || u.role === 'marketing');
    const nextRevNum = (lead.revisions || []).length + 1;
    const isAdmin = user.role === 'manager';
    const canEditLead = isAdmin || (lead.assignedTo && lead.assignedTo === user.id);
    const canDeleteLead = isAdmin;

    const html = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        ${lead.stage === 'lost' ? `
          <div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); border-radius:10px; padding:10px; color:#EF4444; font-size:0.78rem;">
            <strong><i class="fas fa-times-circle"></i> Khách Hàng Thất Bại (Fail Deal)</strong>
            ${lead.failedAtStage ? `<div style="margin-top:2px;">• Hủy ở bước: <strong>${LEAD_STAGES.find(s => s.id === lead.failedAtStage)?.label || lead.failedAtStage}</strong></div>` : ''}
            ${lead.failReason ? `<div style="margin-top:2px;">• Lý do: <strong>${lead.failReason}</strong></div>` : ''}
          </div>
        ` : ''}

        <!-- Quick Assignee Handover Bar (Admin Only Control) -->
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);"><i class="fas fa-user-shield"></i> Sale Phụ Trách:</label>
          ${isAdmin ? `
            <select id="drawer-assignee-select" class="form-select" style="width:auto; font-size:0.75rem; font-weight:700; padding:4px 8px; border-color:var(--primary); border-radius:8px;">
              <option value="">-- Chưa Phân Công Sale --</option>
              ${assignableUsers.map(u => `<option value="${u.id}" ${lead.assignedTo === u.id ? 'selected' : ''}>👤 ${u.name} (${roleLabel(u.role)})</option>`).join('')}
            </select>
          ` : `
            <div style="font-size:0.78rem; font-weight:700; color:var(--primary); background:rgba(197,168,128,0.12); padding:4px 10px; border-radius:8px; border:1px solid rgba(197,168,128,0.3);">
              👤 ${assignee ? assignee.name : 'Chưa phân công Sale'}
            </div>
          `}
        </div>

        <!-- Survey Info Banner Prominently Displayed -->
        ${(lead.surveyBy || lead.stage === 'survey') ? `
          <div style="background:rgba(139,92,246,0.08); border:1.5px solid rgba(139,92,246,0.35); border-radius:10px; padding:10px; color:#8B5CF6;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:0.78rem;"><i class="fas fa-ruler-combined"></i> THÔNG TIN ĐO ĐẠC THỰC ĐỊA</strong>
              ${canEditLead ? `<button id="btn-edit-survey-info" style="background:none; border:none; color:#8B5CF6; font-size:0.75rem; font-weight:700; cursor:pointer; text-decoration:underline;">[Sửa người đi đo]</button>` : ''}
            </div>
            <div style="font-size:0.88rem; font-weight:700; color:var(--text-primary); margin-top:4px;">
              📐 Người đi đo: <span style="color:#8B5CF6;">${lead.surveyBy || 'Chưa nhập tên người đo'}</span>
              ${lead.surveyDate ? `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;"> (${lead.surveyDate})</span>` : ''}
            </div>
            ${lead.surveyNote ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px;">• Ghi chú hiện trạng: ${lead.surveyNote}</div>` : ''}
          </div>
        ` : ''}

        <!-- Info -->
        <div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:14px; border:1px solid var(--border-color);">
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <span style="font-size:0.72rem; padding:3px 9px; border-radius:6px; background:${stage.color}22; color:${stage.color}; border:1px solid ${stage.color}44;"><i class="fas ${stage.icon}"></i> ${stage.label}</span>
            ${source ? `<span style="font-size:0.72rem; padding:3px 9px; border-radius:6px; background:rgba(255,255,255,0.05); color:var(--text-secondary); border:1px solid var(--border-color);"><i class="${source.icon}"></i> ${source.label}</span>` : ''}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.78rem;">
            ${lead.phone ? `<div><span style="color:var(--text-muted);">SĐT</span><br><strong>${lead.phone}</strong></div>` : ''}
            ${assignee ? `<div><span style="color:var(--text-muted);">Phụ trách</span><br><strong>${assignee.name}</strong></div>` : ''}
            ${lead.address ? `<div style="grid-column:span 2;"><span style="color:var(--text-muted);">Địa chỉ</span><br><strong>${lead.address}</strong></div>` : ''}
            ${lead.interestedIn ? `<div style="grid-column:span 2;"><span style="color:var(--text-muted);">Quan tâm</span><br><strong>${lead.interestedIn}</strong></div>` : ''}
          </div>
          ${lead.note ? `<div style="margin-top:10px; font-size:0.78rem; color:var(--text-secondary); background:rgba(255,255,255,0.03); border-radius:8px; padding:8px; border:1px solid var(--border-color);"><i class="fas fa-sticky-note" style="color:var(--primary);"></i> ${lead.note}</div>` : ''}
        </div>

        <!-- Design Revisions Loop Timeline -->
        ${(lead.revisions && lead.revisions.length > 0) ? `
          <div style="background:rgba(236,72,153,0.06); border:1px solid rgba(236,72,153,0.25); border-radius:10px; padding:10px;">
            <div style="font-size:0.72rem; font-weight:700; color:#EC4899; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:8px;">
              <i class="fas fa-sync-alt"></i> Lịch Sử Chỉnh Sửa Thiết Kế Sơ Bộ (${lead.revisions.length} lần)
            </div>
            ${lead.revisions.map(r => `
              <div style="font-size:0.75rem; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="color:#EC4899;">Thiết Kế Sơ Bộ Lần ${r.revNum}</strong>
                  <span style="font-size:0.68rem; color:var(--text-muted);">${fmt.date(r.date)}</span>
                </div>
                <div style="color:var(--text-secondary); font-size:0.72rem; margin-top:3px;">${r.note}</div>
                ${r.quoteAmount ? `<div style="color:#10B981; font-weight:700; font-size:0.72rem; margin-top:2px;">Báo giá lại: ${fmt.currency(r.quoteAmount)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Rollback Design Revision Button (Owner/Admin Only, only when stage = negotiation) -->
        ${(canEditLead && lead.stage === 'negotiation') ? `
          <button id="drawer-add-revision-btn" style="background:rgba(236,72,153,0.12); border:1px solid rgba(236,72,153,0.35); color:#EC4899; border-radius:10px; padding:10px; font-size:0.8rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="fas fa-sync-alt"></i> Ghi Nhận Sửa Thiết Kế & Báo Giá Lại (Lần ${nextRevNum})
          </button>
        ` : ''}

        <!-- Quick Stage Change (Owner/Admin Only) -->
        <div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.4px;">Giai Đoạn CRM</div>
          ${canEditLead ? `
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${LEAD_STAGES.map(s => {
      const isActive = s.id === lead.stage;
      return `
                  <button class="drawer-stage-btn" data-stage="${s.id}" style="
                    padding:7px 11px;
                    border-radius:10px;
                    cursor:pointer;
                    font-size:0.75rem;
                    font-weight:${isActive ? '700' : '500'};
                    border:1px solid ${isActive ? s.color : 'var(--border-color)'};
                    background:${isActive ? s.color + '25' : 'rgba(255,255,255,0.03)'};
                    color:${isActive ? s.color : 'var(--text-secondary)'};
                    display:inline-flex;
                    align-items:center;
                    gap:6px;
                    box-shadow:${isActive ? `0 0 10px ${s.color}33` : 'none'};
                    transition:all 0.18s;
                  ">
                    <i class="fas ${s.icon}" style="color:${s.color}; font-size:0.75rem;"></i>
                    <span>${s.label}</span>
                  </button>
                `;
    }).join('')}
            </div>
          ` : `
            <div style="font-size:0.75rem; color:var(--text-muted); background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color); display:flex; align-items:center; gap:6px;">
              <i class="fas fa-lock" style="color:var(--primary);"></i>
              <span>Chế độ chỉ xem · Hiện tại: <strong>${stage.label}</strong> (Chỉ người phụ trách mới được đổi giai đoạn)</span>
            </div>
          `}
        </div>

        <!-- Action Row (Placed ABOVE History for Quick Access & Only Shows 'Lên Hợp Đồng' when Stage is Chốt Hợp Đồng) -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; padding-bottom:12px; border-bottom:1px solid var(--border-color);">
          ${canEditLead ? `
            <button id="drawer-create-apt-btn" style="flex:1.2; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.4); color:#3B82F6; border-radius:10px; padding:9px 10px; font-size:0.8rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
              <i class="fas fa-calendar-plus"></i> Đặt Lịch Hẹn
            </button>
            ${lead.stage === 'won' ? `
              <button id="drawer-create-contract-btn" style="flex:1.2; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#10B981; border-radius:10px; padding:9px 10px; font-size:0.8rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                <i class="fas fa-file-signature"></i> Lên Hợp Đồng
              </button>
            ` : ''}
            <button id="drawer-assign-kts-btn" style="flex:1; background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.4); color:#8B5CF6; border-radius:10px; padding:9px 10px; font-size:0.8rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
              <i class="fas fa-drafting-compass"></i> Giao Việc KTS
            </button>
            <button id="drawer-edit-lead-btn" style="flex:1; background:rgba(197,168,128,0.12); border:1px solid rgba(197,168,128,0.3); color:var(--primary); border-radius:10px; padding:9px 10px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
              <i class="fas fa-edit"></i> Sửa (Duyệt)
            </button>
          ` : `
            <div style="font-size:0.75rem; color:var(--text-muted); width:100%; text-align:center; padding:4px 0;">
              <i class="fas fa-lock"></i> Đang ở chế độ Chỉ Xem khách hàng này
            </div>
          `}
          ${canDeleteLead ? `
            <button id="drawer-delete-lead-btn" style="flex:1; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#EF4444; border-radius:10px; padding:9px 10px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
              <i class="fas fa-trash-alt"></i> Xóa
            </button>
          ` : ''}
        </div>

        <!-- History Timeline -->
        <div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.4px;">Lịch Sử Hoạt Động</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${(lead.history || []).slice().reverse().map((h) => {
              const text = h.action || '';
              const isApt = text.includes('Đặt lịch') || text.includes('Lịch hẹn') || text.includes('lịch hẹn');

              if (isApt) {
                const isDone = text.includes('Hoàn thành') || text.includes('Xong');
                const isCancel = text.includes('Hủy');
                const aptColor = isDone ? '#10B981' : (isCancel ? '#EF4444' : '#3B82F6');
                const aptIcon = isDone ? 'fa-calendar-check' : (isCancel ? 'fa-calendar-times' : 'fa-calendar-alt');
                const aptBg = isDone ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.08))' : (isCancel ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(59,130,246,0.08))' : 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.12))');
                const badgeLabel = isDone ? '✓ ĐÃ XONG LỊCH HẸN' : (isCancel ? '✗ ĐÃ HỦY LỊCH HẸN' : '📅 HOẠT ĐỘNG LỊCH HẸN');

                return `
                  <div style="display:flex; align-items:center; gap:10px; padding:9px 12px; background:${aptBg}; border:1.5px solid ${aptColor}60; border-radius:10px; box-shadow:0 3px 12px ${aptColor}15; margin:3px 0;">
                    <div style="width:28px; height:28px; border-radius:8px; background:${aptColor}25; border:1.5px solid ${aptColor}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <i class="fas ${aptIcon}" style="font-size:0.75rem; color:${aptColor};"></i>
                    </div>
                    <div style="flex:1; min-width:0;">
                      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                        <span style="font-size:0.62rem; font-weight:800; color:${aptColor}; background:${aptColor}20; padding:2px 6px; border-radius:4px; border:1px solid ${aptColor}40;">${badgeLabel}</span>
                        <span style="font-size:0.62rem; color:var(--text-muted);">${fmt.timeAgo(h.timestamp)}</span>
                      </div>
                      <div style="font-size:0.78rem; font-weight:700; color:var(--text-primary); margin-top:3px;">${h.action}</div>
                      <div style="font-size:0.64rem; color:var(--text-muted); margin-top:1px;"><i class="fas fa-user-edit"></i> ${h.user} · ${fmt.datetime(h.timestamp)}</div>
                    </div>
                  </div>
                `;
              }

              let color = 'var(--primary)';
              let icon = 'fa-history';
              let bg = 'rgba(197,168,128,0.1)';

              const matchedStage = LEAD_STAGES.find(s => text.includes(s.label));
              if (matchedStage) {
                color = matchedStage.color;
                icon = matchedStage.icon;
                bg = matchedStage.color + '18';
              } else if (text.includes('Hợp đồng')) {
                color = '#10B981'; icon = 'fa-file-signature'; bg = 'rgba(16,185,129,0.12)';
              } else if (text.includes('Sửa thiết kế') || text.includes('Báo giá lại')) {
                color = '#EC4899'; icon = 'fa-sync-alt'; bg = 'rgba(236,72,153,0.12)';
              } else if (text.includes('Sửa') || text.includes('Cập nhật') || text.includes('Duyệt')) {
                color = 'var(--primary)'; icon = 'fa-edit'; bg = 'rgba(197,168,128,0.12)';
              } else if (text.includes('Xóa') || text.includes('Hủy') || text.includes('Từ chối')) {
                color = '#EF4444'; icon = 'fa-trash-alt'; bg = 'rgba(239,68,68,0.12)';
              } else if (text.includes('Tạo') || text.includes('Thêm')) {
                color = '#64748B'; icon = 'fa-plus-circle'; bg = 'rgba(100,116,139,0.12)';
              }

              return `
                <div style="display:flex; align-items:center; gap:10px; padding:7px 10px; background:${bg}; border:1px solid ${color}35; border-radius:8px;">
                  <div style="width:24px; height:24px; border-radius:50%; background:${color}22; border:1.5px solid ${color}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="fas ${icon}" style="font-size:0.65rem; color:${color};"></i>
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-size:0.75rem; font-weight:600; color:var(--text-primary);">${h.action}</div>
                    <div style="font-size:0.64rem; color:var(--text-muted); margin-top:1px;">${h.user} · ${fmt.timeAgo(h.timestamp)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    const modal = Modal.create(lead.name, html);

    // Quick Handover listener (Admin only)
    if (isAdmin) {
      document.getElementById('drawer-assignee-select')?.addEventListener('change', (e) => {
        const newAssigneeId = e.target.value;
        const newAssignee = DB.getUserById(newAssigneeId);
        DB.updateLead(leadId, { assignedTo: newAssigneeId }, user.id);
        Toast.success(newAssignee ? `Đã phân công lead cho ${newAssignee.name}!` : 'Đã đưa lead về chưa phân công.');
        modal.close();
        this.renderLeads(user);
      });
    }

    // Assign KTS button
    document.getElementById('drawer-assign-kts-btn')?.addEventListener('click', () => {
      modal.close();
      this.openAssignKtsTaskForm(lead, user, () => this.renderLeads(user));
    });

    // Rollback / Revision button
    document.getElementById('drawer-add-revision-btn')?.addEventListener('click', () => {
      modal.close();
      this.openRevisionModal(lead, user, () => this.renderLeads(user));
    });

    // Create appointment from lead
    document.getElementById('drawer-create-apt-btn')?.addEventListener('click', () => {
      modal.close();
      this.openAppointmentForm(null, user, () => this.renderLeads(user), lead);
    });

    // Create contract from lead
    document.getElementById('drawer-create-contract-btn')?.addEventListener('click', () => {
      modal.close();
      this.openContractForm(null, user, () => this.renderLeads(user), lead);
    });

    // Edit lead
    document.getElementById('drawer-edit-lead-btn')?.addEventListener('click', () => {
      modal.close();
      this.openLeadForm(leadId, user, () => this.renderLeads(user));
    });

    // Delete lead
    document.getElementById('drawer-delete-lead-btn')?.addEventListener('click', () => {
      this.confirmDelete('Xóa Khách Hàng', `Bạn có chắc chắn muốn xóa khách hàng "${lead.name}" khỏi hệ thống?`, () => {
        DB.deleteLead(leadId);
        Toast.success('Đã xóa khách hàng.');
        modal.close();
        this.renderLeads(user);
      });
    });

    // Edit survey info listener
    document.getElementById('btn-edit-survey-info')?.addEventListener('click', () => {
      modal.close();
      this.openSurveyInfoModal(lead, user, () => this.renderLeads(user));
    });

    // Stage change with Confirmation Modal to prevent accidental clicks
    modal.element.querySelectorAll('.drawer-stage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetStage = btn.getAttribute('data-stage');
        if (targetStage === lead.stage) return; // Same stage, ignore

        const targetStageObj = LEAD_STAGES.find(s => s.id === targetStage);
        const currentStageObj = LEAD_STAGES.find(s => s.id === lead.stage);

        if (targetStage === 'lost') {
          modal.close();
          this.openFailReasonModal(lead, user, () => this.renderLeads(user));
          return;
        }

        if (targetStage === 'survey') {
          modal.close();
          this.openSurveyInfoModal(lead, user, () => this.renderLeads(user));
          return;
        }

        // Confirmation Modal for all other stage changes
        const confirmHtml = `
          <div style="display:flex; flex-direction:column; gap:12px; text-align:center; padding:10px 0;">
            <div style="font-size:2.2rem; color:${targetStageObj?.color || 'var(--primary)'};">
              <i class="fas ${targetStageObj?.icon || 'fa-exchange-alt'}"></i>
            </div>
            <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary);">
              Xác Nhận Chuyển Giai Đoạn CRM?
            </div>
            <div style="font-size:0.78rem; color:var(--text-secondary); background:rgba(255,255,255,0.03); border-radius:10px; padding:10px; border:1px solid var(--border-color);">
              Chuyển khách hàng <strong style="color:var(--text-primary);">${lead.name}</strong> từ:<br>
              <span style="color:${currentStageObj?.color || 'var(--text-muted)'}; font-weight:700;">${currentStageObj?.label}</span>
              <i class="fas fa-arrow-right" style="margin:0 6px; font-size:0.7rem;"></i>
              <span style="color:${targetStageObj?.color || 'var(--primary)'}; font-weight:700;">${targetStageObj?.label}</span>
            </div>
            <div style="display:flex; gap:10px; margin-top:6px;">
              <button id="btn-cancel-stage-change" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-secondary); padding:9px; border-radius:8px; font-weight:600; cursor:pointer;">Hủy Bỏ</button>
              <button id="btn-confirm-stage-change" style="flex:1; background:${targetStageObj?.color || 'var(--primary)'}; color:#fff; border:none; padding:9px; border-radius:8px; font-weight:700; cursor:pointer;">Xác Nhận Chuyển</button>
            </div>
          </div>
        `;

        const confirmModal = Modal.create('Xác Nhận Chuyển Bước', confirmHtml);

        document.getElementById('btn-cancel-stage-change')?.addEventListener('click', () => {
          confirmModal.close();
        });

        document.getElementById('btn-confirm-stage-change')?.addEventListener('click', (e) => {
          const btn = e.currentTarget;
          if (btn.disabled) return;
          btn.disabled = true;
          DB.updateLead(leadId, { stage: targetStage }, user.id);
          Toast.success(`Đã chuyển giai đoạn sang ${targetStageObj?.label}`);
          confirmModal.close();
          modal.close();
          this.renderLeads(user);
          this.openLeadDrawer(leadId, user);
        });
      });
    });
  },

  openSurveyInfoModal(lead, user, onDone) {
    const html = `
      <form id="survey-info-form" style="display:flex; flex-direction:column; gap:12px;">
        <div style="background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.3); border-radius:10px; padding:10px; font-size:0.78rem; color:#8B5CF6;">
          <i class="fas fa-ruler-combined"></i> Nhập nhân sự / KTS đi khảo sát đo đạc thực địa công trình
        </div>
        <div>
          <label class="form-label">Người / KTS Đi Đo Đạc *</label>
          <input type="text" id="si-surveyor" class="form-input" placeholder="Ví dụ: KTS Hoàng Long, Team TK A, KTS Huy..." value="${lead.surveyBy || ''}" required>
        </div>
        <div>
          <label class="form-label">Thời Gian Đo Đạc (Không bắt buộc)</label>
          <input type="text" id="si-date" class="form-input" placeholder="Ví dụ: 14:30 - Ngày 25/07" value="${lead.surveyDate || ''}">
        </div>
        <div>
          <label class="form-label">Ghi Chú Công Trình / Kích Thước Hiện Trạng</label>
          <textarea id="si-note" class="form-textarea" placeholder="Nhập ghi chú hiện trạng căn hộ..." style="height:60px;">${lead.surveyNote || ''}</textarea>
        </div>
        <button type="submit" class="btn-primary" style="background:#8B5CF6; border-color:#8B5CF6;"><i class="fas fa-save"></i> Lưu Thông Tin Đo Đạc & Cập Nhật Giai Đoạn</button>
      </form>
    `;

    const modal = Modal.create(`Khảo Sát Thực Địa - ${lead.name}`, html);

    document.getElementById('survey-info-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const surveyBy = document.getElementById('si-surveyor').value.trim();
      const surveyDate = document.getElementById('si-date').value.trim();
      const surveyNote = document.getElementById('si-note').value.trim();

      DB.updateLead(lead.id, {
        stage: 'survey',
        surveyBy,
        surveyDate,
        surveyNote
      }, user.id);

      Toast.success('Đã lưu thông tin đo đạc thực địa!');
      modal.close();
      if (onDone) onDone();
      this.openLeadDrawer(lead.id, user);
    });
  },

  openRevisionModal(lead, user, onDone) {
    const nextRevNum = (lead.revisions || []).length + 1;
    const html = `
      <form id="revision-form" style="display:flex; flex-direction:column; gap:12px;">
        <div style="background:rgba(236,72,153,0.08); border:1px solid rgba(236,72,153,0.3); border-radius:10px; padding:10px; font-size:0.78rem; color:#EC4899;">
          <i class="fas fa-sync-alt"></i> Cập nhật Sửa Thiết Kế Sơ Bộ & Báo Giá Lại <strong>Lần ${nextRevNum}</strong>
        </div>
        <div>
          <label class="form-label">Nội dung chỉnh sửa từ khách hàng *</label>
          <textarea id="rf-note" class="form-textarea" placeholder="Ví dụ: Khách muốn đổi tủ bếp sang chất liệu MDF An Cường, bỏ bớt bộ sofa để giảm giá thành..." style="height:80px;"></textarea>
        </div>
        <div>
          <label class="form-label">Báo Giá Sơ Bộ Mới (VNĐ - Nếu có)</label>
          <input type="text" inputmode="numeric" id="rf-quote" class="form-input" placeholder="Ví dụ: 120.000.000">
          <div id="rf-quote-hint" style="font-size:0.72rem; color:var(--primary); margin-top:4px; font-weight:600; min-height:16px;"></div>
        </div>
        <div style="display:flex; gap:10px; margin-top:4px;">
          <button type="button" id="btn-cancel-revision" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-secondary); padding:9px; border-radius:8px; font-weight:600; cursor:pointer;">Hủy Bỏ</button>
          <button type="submit" id="btn-submit-revision" class="btn-primary" style="flex:1.2; background:#EC4899; border-color:#EC4899; font-weight:700;"><i class="fas fa-save"></i> Lưu Sửa Thiết Kế Lần ${nextRevNum}</button>
        </div>
      </form>
    `;
    const modal = Modal.create(`Sửa Thiết Kế Lần ${nextRevNum} - ${lead.name}`, html);
    const quoteInput = document.getElementById('rf-quote');
    const quoteHint = document.getElementById('rf-quote-hint');

    quoteInput?.addEventListener('input', () => {
      const raw = quoteInput.value.replace(/\D/g, '');
      if (!raw) { quoteInput.value = ''; if (quoteHint) quoteHint.textContent = ''; return; }
      const num = parseInt(raw, 10);
      quoteInput.value = num.toLocaleString('vi-VN');
      if (quoteHint) quoteHint.textContent = `✨ ${num.toLocaleString('vi-VN')} VNĐ`;
    });

    document.getElementById('btn-cancel-revision')?.addEventListener('click', () => {
      modal.close();
    });

    document.getElementById('revision-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const submitBtn = document.getElementById('btn-submit-revision');
        if (submitBtn && submitBtn.disabled) return;
        if (submitBtn) submitBtn.disabled = true;

        const noteVal = document.getElementById('rf-note')?.value?.trim() || `Sửa thiết kế sơ bộ & báo giá lần ${nextRevNum}`;
        const rawQuote = parseInt((quoteInput?.value || '').replace(/\D/g, ''), 10) || 0;

        DB.addLeadRevision(lead.id, {
          note: noteVal,
          quoteAmount: rawQuote
        }, user.id);

        Toast.success(`Đã lưu thành công sửa thiết kế Lần ${nextRevNum}!`);
        modal.close();
        if (onDone) onDone();
        UI.renderLeads(user);
      } catch (err) {
        console.error('Submit revision error:', err);
        Toast.error('Có lỗi xảy ra khi lưu: ' + (err.message || err));
        const submitBtn = document.getElementById('btn-submit-revision');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  },

  openFailReasonModal(lead, user, onDone) {
    const prevStageObj = LEAD_STAGES.find(s => s.id === lead.stage);
    const html = `
      <form id="fail-reason-form" style="display:flex; flex-direction:column; gap:12px;">
        <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:10px; font-size:0.78rem; color:#EF4444;">
          <i class="fas fa-exclamation-circle"></i> Ghi nhận Fail Deal ở giai đoạn: <strong>${prevStageObj?.label || lead.stage}</strong>
        </div>
        <div>
          <label class="form-label">Gợi ý lý do thất bại nhanh:</label>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
            <button type="button" class="fail-preset-btn" data-reason="Vượt ngân sách dự kiến của khách" style="padding:5px 9px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-secondary); font-size:0.72rem; cursor:pointer;">Vượt ngân sách</button>
            <button type="button" class="fail-preset-btn" data-reason="Khách chọn đơn vị thiết kế/thi công khác" style="padding:5px 9px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-secondary); font-size:0.72rem; cursor:pointer;">Chọn bên khác</button>
            <button type="button" class="fail-preset-btn" data-reason="Khách tạm hoãn thi công làm nhà" style="padding:5px 9px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-secondary); font-size:0.72rem; cursor:pointer;">Hoãn thi công</button>
            <button type="button" class="fail-preset-btn" data-reason="Phản hồi chậm / Thu hồi dự án" style="padding:5px 9px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-secondary); font-size:0.72rem; cursor:pointer;">Phản hồi chậm</button>
            <button type="button" class="fail-preset-btn" data-reason="Không duyệt được phương án thiết kế sơ bộ" style="padding:5px 9px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-secondary); font-size:0.72rem; cursor:pointer;">Không duyệt thiết kế</button>
          </div>
        </div>
        <div>
          <label class="form-label">Lý do thất bại chi tiết *</label>
          <textarea id="fr-reason" class="form-textarea" placeholder="Nhập nguyên nhân hủy deal..." required style="height:70px;"></textarea>
        </div>
        <button type="submit" class="btn-primary" style="background:#EF4444; border-color:#EF4444;">Lưu Lý Do & Xác Nhận Fail</button>
      </form>
    `;
    const modal = Modal.create(`Lý Do Thất Bại - ${lead.name}`, html);
    const textarea = document.getElementById('fr-reason');

    modal.element.querySelectorAll('.fail-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (textarea) textarea.value = btn.getAttribute('data-reason');
      });
    });

    document.getElementById('fail-reason-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const reason = textarea.value.trim();
      DB.updateLead(lead.id, {
        stage: 'lost',
        failReason: reason,
        failedAtStage: lead.stage
      }, user.id);
      Toast.success('Đã cập nhật trạng thái thất bại.');
      modal.close();
      if (onDone) onDone();
      this.openLeadDrawer(lead.id, user);
    });
  },

  openLeadForm(leadId, user, onSave) {
    const lead = leadId ? DB.getLead(leadId) : null;
    const isEdit = !!lead;

    if (isEdit) {
      const canEdit = user.role === 'manager' || (lead.assignedTo && lead.assignedTo === user.id);
      if (!canEdit) {
        Toast.error('Chỉ người phụ trách chính hoặc Admin mới có quyền chỉnh sửa khách hàng này!');
        return;
      }
    }

    const assignableUsers = DB.getUsers().filter(u => u.role === 'sales' || u.role === 'manager' || u.role === 'marketing');
    const defaultAssignee = lead?.assignedTo || (user.role === 'sales' ? user.id : '');
    const activeCampaigns = DB.getCampaigns();

    const html = `
      <form id="lead-form" style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div style="grid-column:span 2;">
            <label class="form-label">Tên Khách Hàng / Zalo *</label>
            <input type="text" id="lf-name" class="form-input" value="${lead?.name || ''}" required>
          </div>
          <div>
            <label class="form-label">Số Điện Thoại</label>
            <input type="tel" id="lf-phone" class="form-input" value="${lead?.phone || ''}">
          </div>
          <div>
            <label class="form-label">Nguồn Khách</label>
            <select id="lf-source" class="form-select">
              ${LEAD_SOURCES.map(s => `<option value="${s.id}" ${lead?.source === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>
          <div style="grid-column:span 2;">
            <label class="form-label" style="color:var(--primary); font-weight:700;"><i class="fas fa-bullhorn"></i> Nguồn Chiến Dịch Ads (Nếu từ Quảng Cáo)</label>
            <select id="lf-campaign" class="form-select" style="border-color:rgba(197,168,128,0.4);">
              <option value="">-- Không chọn / Khách tự tìm đến --</option>
              ${activeCampaigns.map(c => `<option value="${c.id}" ${lead?.campaignId === c.id ? 'selected' : ''}>📣 ${c.name} (${c.platform.toUpperCase()})</option>`).join('')}
            </select>
          </div>
          <div style="grid-column:${user.role === 'manager' ? 'span 1' : 'span 2'};">
            <label class="form-label">Giai Đoạn</label>
            <select id="lf-stage" class="form-select">
              ${LEAD_STAGES.map(s => `<option value="${s.id}" ${lead?.stage === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>
          ${user.role === 'manager' ? `
            <div>
              <label class="form-label">Giao Sale Phụ Trách</label>
              <select id="lf-assignee" class="form-select">
                <option value="">-- Chưa Phân Công --</option>
                ${assignableUsers.map(u => `<option value="${u.id}" ${defaultAssignee === u.id ? 'selected' : ''}>${u.name} (${roleLabel(u.role)})</option>`).join('')}
              </select>
            </div>
          ` : `<input type="hidden" id="lf-assignee" value="${defaultAssignee}">`}
          <div style="grid-column:span 2;">
            <label class="form-label">Quan Tâm Đến (Hạng mục)</label>
            <input type="text" id="lf-interested" class="form-input" value="${lead?.interestedIn || ''}">
          </div>
          <div>
            <label class="form-label">Địa Chỉ Khách Hàng (Nơi cư trú)</label>
            <input type="text" id="lf-home-address" class="form-input" value="${lead?.homeAddress || ''}" placeholder="Số nhà, tên đường, phường/xã...">
          </div>
          <div>
            <label class="form-label">Địa Chỉ Công Trình Thi Công</label>
            <input type="text" id="lf-address" class="form-input" value="${lead?.address || ''}" placeholder="Để trống nếu chưa có">
          </div>
          <div id="lf-fail-reason-wrap" style="grid-column:span 2; display:${lead?.stage === 'lost' ? 'block' : 'none'}; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.25); padding:10px; border-radius:10px;">
            <label class="form-label" style="color:#EF4444; font-weight:700;"><i class="fas fa-exclamation-triangle"></i> Lý Do Thất Bại (Fail Deal)</label>
            <input type="text" id="lf-fail-reason" class="form-input" value="${lead?.failReason || ''}" placeholder="Ví dụ: Vượt ngân sách dự kiến của khách" style="border-color:rgba(239,68,68,0.4);">
          </div>
          <div style="grid-column:span 2;">
            <label class="form-label">Ghi Chú Nhanh / Yêu Cầu Thiết Kế</label>
            <textarea id="lf-note" class="form-textarea" style="height:70px;">${lead?.note || ''}</textarea>
          </div>
        </div>
        <button type="submit" class="btn-primary">${isEdit ? 'Lưu Thay Đổi' : 'Thêm Lead Mới'}</button>
      </form>
    `;

    const modal = Modal.create(isEdit ? 'Chỉnh Sửa Lead' : 'Thêm Lead Mới', html);

    document.getElementById('lf-stage')?.addEventListener('change', (e) => {
      const wrap = document.getElementById('lf-fail-reason-wrap');
      if (wrap) wrap.style.display = e.target.value === 'lost' ? 'block' : 'none';
    });

    document.getElementById('lf-campaign')?.addEventListener('change', (e) => {
      const campId = e.target.value;
      if (campId) {
        const camp = DB.getCampaign(campId);
        if (camp && camp.platform) {
          const srcSelect = document.getElementById('lf-source');
          if (srcSelect) srcSelect.value = camp.platform;
        }
      }
    });

    document.getElementById('lead-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const phoneVal = document.getElementById('lf-phone').value.trim();

      // Check Duplicate Phone Number across all leads
      if (phoneVal) {
        const existingLead = DB.findLeadByPhone(phoneVal, isEdit ? leadId : null);
        if (existingLead) {
          const owner = DB.getUserById(existingLead.assignedTo);
          const ownerName = owner ? owner.name : 'Chưa phân công';
          Toast.error(`🔴 Số điện thoại (${phoneVal}) trùng với khách "${existingLead.name}" do Sale [${ownerName}] phụ trách!`);
          return;
        }
      }

      const stageVal = document.getElementById('lf-stage').value;
      const data = {
        name: document.getElementById('lf-name').value,
        phone: phoneVal,
        source: document.getElementById('lf-source').value,
        campaignId: document.getElementById('lf-campaign')?.value || '',
        stage: stageVal,
        interestedIn: document.getElementById('lf-interested').value,
        homeAddress: document.getElementById('lf-home-address').value,
        address: document.getElementById('lf-address').value,
        assignedTo: document.getElementById('lf-assignee').value,
        note: document.getElementById('lf-note').value,
        failReason: stageVal === 'lost' ? (document.getElementById('lf-fail-reason')?.value || '') : ''
      };
      if (isEdit) {
        if (user.role === 'sales') {
          DB.createApprovalRequest({
            type: 'lead_edit',
            targetId: leadId,
            targetName: data.name,
            changeSummary: `Cập nhật thông tin khách hàng (${data.name})`,
            oldData: lead,
            newData: data
          }, user.id);
          Toast.success('Đã gửi yêu cầu sửa thông tin tới Quản lý để duyệt!');
        } else {
          DB.updateLead(leadId, data, user.id);
          Toast.success('Đã cập nhật thông tin lead.');
        }
      } else {
        DB.createLead(data, user.id);
        Toast.success('Đã thêm lead mới.');
      }
      modal.close();
      if (onSave) onSave();
    });
  },

  // ══════════════════════════════════════════════════════
  //  5. CONTRACTS
  // ══════════════════════════════════════════════════════
  renderContracts(user, filterStage = 'all') {
    this._setActiveNav('contracts');
    const body = this._getBody();
    const allContracts = DB.getContracts(user.id, user.role);
    const canEdit = user.role === 'sales' || user.role === 'manager';

    const stages = [
      { id: 'all', label: 'Tất Cả' },
      { id: 'signed', label: 'Đã Ký', color: '#3B82F6' },
      { id: 'in_production', label: 'Đang SX', color: '#F59E0B' },
      { id: 'delivered', label: 'Đã Bàn Giao', color: '#10B981' },
      { id: 'warranty', label: 'Bảo Hành', color: '#8B5CF6' }
    ];

    const contracts = filterStage === 'all' ? allContracts : allContracts.filter(c => (c.stage || 'signed') === filterStage);

    const totalValue = allContracts.reduce((s, c) => s + (c.value || 0), 0);
    const totalCollected = allContracts.reduce((s, c) => s + (c.payments || []).reduce((ps, p) => ps + (p.amount || 0), 0), 0);
    const totalDebt = totalValue - totalCollected;

    body.innerHTML = `
      <div class="page-content fade-in">
        <div class="page-title-row">
          <h2 class="page-title"><i class="fas fa-file-contract"></i> Hợp Đồng</h2>
          ${canEdit ? `<button class="btn-primary btn-sm" id="btn-new-contract"><i class="fas fa-plus"></i> Thêm Hợp Đồng</button>` : ''}
        </div>

        <!-- Summary -->
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:12px;">
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">Tổng Giá Trị</div>
            <div style="font-size:0.9rem; font-weight:800; color:var(--primary);">${fmt.currency(totalValue)}</div>
          </div>
          <div style="background:var(--bg-secondary); border:1px solid rgba(16,185,129,0.3); border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">Đã Thu</div>
            <div style="font-size:0.9rem; font-weight:800; color:#10B981;">${fmt.currency(totalCollected)}</div>
          </div>
          <div style="background:var(--bg-secondary); border:1px solid rgba(239,68,68,0.3); border-radius:12px; padding:10px; text-align:center;">
            <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">Còn Nợ</div>
            <div style="font-size:0.9rem; font-weight:800; color:#EF4444;">${fmt.currency(totalDebt)}</div>
          </div>
        </div>

        <!-- Stage Filter Pills -->
        <div id="contract-stage-filters" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:12px;">
          ${stages.map(s => {
            const count = s.id === 'all' ? allContracts.length : allContracts.filter(c => (c.stage || 'signed') === s.id).length;
            const isActive = filterStage === s.id;
            const color = s.color || 'var(--primary)';
            return `
              <button class="contract-filter-btn ${isActive ? 'active' : ''}" data-stage="${s.id}" style="padding:6px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; white-space:nowrap; cursor:pointer; border:1px solid ${isActive ? color : 'var(--border-color)'}; background:${isActive ? `${color}22` : 'var(--bg-secondary)'}; color:${isActive ? color : 'var(--text-secondary)'};">
                ${s.label} (${count})
              </button>
            `;
          }).join('')}
        </div>

        <!-- List -->
        <div id="contracts-list" style="display:flex; flex-direction:column; gap:10px;">
          ${contracts.length === 0 ? `<div class="empty-state"><i class="fas fa-file-contract"></i><p>Chưa có hợp đồng nào${filterStage !== 'all' ? ' ở trạng thái này' : ''}.</p></div>` :
        contracts.map(c => this._buildContractCard(c, user, canEdit)).join('')
      }
        </div>
      </div>
    `;

    if (canEdit) {
      document.getElementById('btn-new-contract')?.addEventListener('click', () => this.openContractForm(null, user, () => this.renderContracts(user, filterStage)));
    }

    // Stage filter button listeners
    body.querySelectorAll('#contract-stage-filters .contract-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const stg = btn.getAttribute('data-stage');
        this.renderContracts(user, stg);
      });
    });

    // Event delegation for contract list (cards, edit, word, print & delete buttons)
    const listContainer = body.querySelector('#contracts-list');
    if (listContainer) {
      listContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.contract-btn-delete');
        if (deleteBtn) {
          e.stopPropagation();
          const id = deleteBtn.getAttribute('data-id');
          const c = DB.getContract(id);
          this.confirmDelete('Xóa Hợp Đồng', `Bạn có chắc chắn muốn xóa hợp đồng "${c?.code || 'này'}" của khách "${c?.customerName || ''}"?`, () => {
            DB.deleteContract(id);
            Toast.success('Đã xóa hợp đồng.');
            this.renderContracts(user);
          });
          return;
        }

        const editBtn = e.target.closest('.contract-btn-edit');
        if (editBtn) {
          e.stopPropagation();
          const id = editBtn.getAttribute('data-id');
          this.openContractForm(id, user, () => this.renderContracts(user));
          return;
        }

        const wordBtn = e.target.closest('.contract-btn-word');
        if (wordBtn) {
          e.stopPropagation();
          const id = wordBtn.getAttribute('data-id');
          const c = DB.getContract(id);
          if (c) {
            this.exportContractToWord(c);
            Toast.success('Đã tải xuống File Word (.doc)');
          }
          return;
        }



        const card = e.target.closest('.contract-card');
        if (card) {
          this.openContractDrawer(card.getAttribute('data-id'), user);
        }
      });
    }
  },

  _buildContractCard(c, user, canEdit) {
    const paid = (c.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const debt = (c.value || 0) - paid;
    const pct = c.value > 0 ? Math.round(paid / c.value * 100) : 0;
    const stageLabels = { signed: 'Đã Ký', in_production: 'Đang SX', delivered: 'Đã Bàn Giao', warranty: 'Bảo Hành' };
    const stageColors = { signed: '#3B82F6', in_production: '#F59E0B', delivered: '#10B981', warranty: '#8B5CF6' };
    const stageColor = stageColors[c.stage] || 'var(--primary)';
    return `
      <div class="contract-card" data-id="${c.id}" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-left:3px solid ${stageColor}; border-radius:16px; padding:14px 16px; cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px;">
          <div>
            <div style="font-size:0.75rem; font-weight:700; color:var(--primary); font-family:monospace;">${c.code || 'MTP-2026/HĐ'}</div>
            <div style="font-size:0.92rem; font-weight:700; color:var(--text-primary); margin-top:2px;">${c.customerName}</div>
            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${c.phone || ''} ${c.signedDate ? `· Ký: ${fmt.date(c.signedDate)}` : ''}</div>
          </div>
          <span style="font-size:0.65rem; font-weight:700; padding:3px 8px; border-radius:6px; background:${stageColor}22; color:${stageColor}; border:1px solid ${stageColor}44; white-space:nowrap;">${stageLabels[c.stage] || c.stage}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.78rem;">
          <span style="color:var(--primary); font-weight:700;">${fmt.currency(c.value)}</span>
          <span style="color:${debt > 0 ? '#EF4444' : '#10B981'}; font-weight:600;">Còn: ${fmt.currency(debt)}</span>
        </div>
        <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-bottom:8px;">
          <div style="height:5px; width:${pct}%; background:${pct >= 100 ? '#10B981' : 'var(--primary)'}; border-radius:3px;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.68rem; color:var(--text-muted);">Thu ${pct}% · ${(c.payments || []).length} đợt</span>
          <div style="display:flex; gap:5px;">
            <button class="contract-action-btn contract-btn-word" data-id="${c.id}" title="Xuất File Word (.doc)" style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#10B981;cursor:pointer;padding:5px 8px;border-radius:7px;font-size:0.75rem;display:flex;align-items:center;gap:4px;font-weight:600;"><i class="fas fa-file-word"></i> Word</button>
            ${canEdit ? `
              <button class="contract-action-btn contract-btn-edit" data-id="${c.id}" title="Sửa" style="background:rgba(255,255,255,0.05);border:1px solid var(--border-color);color:var(--primary);cursor:pointer;padding:5px 8px;border-radius:7px;font-size:0.75rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-edit"></i></button>
              <button class="contract-action-btn contract-btn-delete" data-id="${c.id}" title="Xóa" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#EF4444;cursor:pointer;padding:5px 8px;border-radius:7px;font-size:0.75rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-trash-alt"></i></button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  openContractDrawer(contractId, user) {
    const c = DB.getContract(contractId);
    if (!c) return;
    const paid = (c.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const debt = (c.value || 0) - paid;
    const canEdit = user.role !== 'marketing';

    const stageLabels = { signed: 'Đã Ký', in_production: 'Đang SX', delivered: 'Đã Bàn Giao', warranty: 'Bảo Hành' };
    const stageColors = { signed: '#3B82F6', in_production: '#F59E0B', delivered: '#10B981', warranty: '#8B5CF6' };
    const stageColor = stageColors[c.stage] || 'var(--primary)';

    const html = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="background:rgba(197,168,128,0.08); border:1px solid rgba(197,168,128,0.25); border-radius:12px; padding:12px; font-size:0.8rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; color:var(--primary); font-size:0.88rem;"><i class="fas fa-file-signature"></i> Mã HĐ: ${c.code || 'MTP-2026/HĐ'}</span>
            <span style="font-size:0.7rem; color:var(--text-muted);">Ký ngày: ${fmt.date(c.signedDate)}</span>
          </div>

          <!-- Quick Stage Switcher Dropdown -->
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:8px; border:1px solid var(--border-color);">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted);"><i class="fas fa-tasks"></i> Trạng Thái HĐ:</span>
            ${canEdit ? `
              <select id="drawer-contract-stage-select" class="form-select" style="padding:4px 10px; font-size:0.78rem; font-weight:700; width:auto; border-color:${stageColor}; color:${stageColor}; background:var(--bg-secondary);">
                <option value="signed" ${c.stage === 'signed' ? 'selected' : ''}>🔵 Đã Ký</option>
                <option value="in_production" ${c.stage === 'in_production' ? 'selected' : ''}>🟠 Đang SX</option>
                <option value="delivered" ${c.stage === 'delivered' ? 'selected' : ''}>🟢 Đã Bàn Giao</option>
                <option value="warranty" ${c.stage === 'warranty' ? 'selected' : ''}>🟣 Bảo Hành</option>
              </select>
            ` : `<span style="font-weight:700; color:${stageColor}">${stageLabels[c.stage] || c.stage}</span>`}
          </div>

          ${c.homeAddress ? `<div style="color:var(--text-muted); font-size:0.72rem; margin-top:6px;">🏠 Địa chỉ nhà: ${c.homeAddress}</div>` : ''}
        </div>

        <!-- Document Export Row -->
        <div>
          <button id="drawer-word-contract-btn" style="width:100%; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); color:#10B981; border-radius:10px; padding:10px; font-size:0.82rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
            <i class="fas fa-file-word" style="font-size:1rem;"></i> Xuất File Word (.doc)
          </button>
        </div>

        <div class="info-grid">
          <div><span style="color:var(--text-muted); font-size:0.7rem;">Giá trị HĐ</span><div style="font-weight:700; color:var(--primary);">${fmt.currency(c.value)}</div></div>
          <div><span style="color:var(--text-muted); font-size:0.7rem;">Đã thu</span><div style="font-weight:700; color:#10B981;">${fmt.currency(paid)}</div></div>
          <div><span style="color:var(--text-muted); font-size:0.7rem;">Còn lại</span><div style="font-weight:700; color:#EF4444;">${fmt.currency(debt)}</div></div>
          ${c.expectedDelivery ? `<div><span style="color:var(--text-muted); font-size:0.7rem;">Bàn giao dự kiến</span><div style="font-weight:600;">${fmt.date(c.expectedDelivery)}</div></div>` : ''}
          ${c.address ? `<div style="grid-column:span 2;"><span style="color:var(--text-muted); font-size:0.7rem;">Địa chỉ</span><div>${c.address}</div></div>` : ''}
        </div>

        ${(c.milestones && c.milestones.length > 0) ? `
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:10px; padding:10px;">
            <div style="font-size:0.72rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px;"><i class="fas fa-calendar-check"></i> Dự Tính Tiến Độ Thu Tiền</div>
            ${c.milestones.map(m => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                <div>
                  <strong style="color:var(--text-primary);">${m.name}</strong> (${m.pct}%)
                  ${m.note ? `<div style="color:var(--text-muted); font-size:0.68rem;">${m.note}</div>` : ''}
                </div>
                <div style="text-align:right;">
                  <strong style="color:var(--primary);">${fmt.currency(Math.round((c.value * m.pct) / 100))}</strong>
                  ${m.expectedDate ? `<div style="font-size:0.68rem; color:var(--text-muted);">Dự kiến: ${fmt.date(m.expectedDate)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Payment History -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px;">Tiến Độ Thu Thực Tế</span>
            ${canEdit ? `<button id="btn-add-payment" class="btn-primary btn-sm"><i class="fas fa-plus"></i> Thu tiền</button>` : ''}
          </div>
          ${(c.payments || []).length === 0 ? `<div class="empty-state" style="padding:16px;"><i class="fas fa-money-bill-wave"></i><p>Chưa có khoản thu thực tế nào.</p></div>` :
        (c.payments || []).map(p => `
              <div class="list-item" style="margin-bottom:6px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <div style="flex:1;">
                  <div style="font-size:0.8rem; font-weight:700; color:#10B981;">${fmt.currency(p.amount)}</div>
                  <div style="font-size:0.68rem; color:var(--text-muted);">${p.type === 'deposit' ? 'Đặt cọc' : p.type === 'installment' ? 'Thanh toán đợt' : 'Thanh lý'} · ${fmt.date(p.date)}</div>
                  ${p.note ? `<div style="font-size:0.68rem; color:var(--text-secondary); margin-top:2px;">${p.note}</div>` : ''}
                  ${p.proofImage ? `
                    <div style="margin-top:6px; display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.25); padding:4px 8px; border-radius:6px; width:max-content; border:1px solid rgba(255,255,255,0.06);">
                      <img src="${p.proofImage}" style="width:36px; height:36px; border-radius:4px; object-fit:cover; border:1px solid var(--primary); cursor:zoom-in;" onclick="event.stopPropagation();showPhotoLightbox('${p.proofImage}')" title="Bấm để xem ảnh kiểm chứng">
                      <span style="font-size:0.68rem; color:var(--primary); font-weight:600; cursor:pointer;" onclick="event.stopPropagation();showPhotoLightbox('${p.proofImage}')"><i class="fas fa-image"></i> Ảnh kiểm chứng</span>
                    </div>
                  ` : ''}
                </div>
                ${canEdit ? `<button class="pay-delete-btn" data-pay="${p.id}" style="background:none;border:none;color:var(--status-rejected);cursor:pointer;padding:4px;"><i class="fas fa-times"></i></button>` : ''}
              </div>
            `).join('')
      }
        </div>
        ${c.note ? `<div style="font-size:0.78rem; color:var(--text-secondary); background:rgba(255,255,255,0.03); border-radius:8px; padding:8px; border:1px solid var(--border-color);"><i class="fas fa-sticky-note" style="color:var(--primary);"></i> ${c.note}</div>` : ''}

        ${canEdit ? `
          <!-- Action Row (Edit / Delete) -->
          <div style="display:flex; gap:10px; margin-top:6px; border-top:1px solid var(--border-color); padding-top:12px;">
            <button id="drawer-edit-contract-btn" style="flex:1; background:rgba(197,168,128,0.12); border:1px solid rgba(197,168,128,0.3); color:var(--primary); border-radius:10px; padding:9px 12px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
              <i class="fas fa-edit"></i> Chỉnh Sửa HĐ
            </button>
            <button id="drawer-delete-contract-btn" style="flex:1; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#EF4444; border-radius:10px; padding:9px 12px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
              <i class="fas fa-trash-alt"></i> Xóa Hợp Đồng
            </button>
          </div>
        ` : ''}
      </div>
    `;

    const modal = Modal.create(c.customerName, html);

    // Export Word listener
    document.getElementById('drawer-word-contract-btn')?.addEventListener('click', () => {
      this.exportContractToWord(c);
      Toast.success('Đã tải xuống Hợp Đồng dạng Word (.doc)');
    });

    // Quick Stage Switcher Listener
    document.getElementById('drawer-contract-stage-select')?.addEventListener('change', (e) => {
      const newStage = e.target.value;
      DB.updateContract(contractId, { stage: newStage });
      Toast.success(`Đã đổi trạng thái HĐ sang: ${stageLabels[newStage] || newStage}`);
      this.renderContracts(user);
      modal.close();
      this.openContractDrawer(contractId, user);
    });



    if (canEdit) {
      document.getElementById('drawer-edit-contract-btn')?.addEventListener('click', () => {
        modal.close();
        this.openContractForm(contractId, user, () => this.renderContracts(user));
      });
      document.getElementById('drawer-delete-contract-btn')?.addEventListener('click', () => {
        this.confirmDelete('Xóa Hợp Đồng', `Bạn có chắc chắn muốn xóa hợp đồng "${c?.code || 'này'}"?`, () => {
          DB.deleteContract(contractId);
          Toast.success('Đã xóa hợp đồng.');
          modal.close();
          this.renderContracts(user);
        });
      });
      document.getElementById('btn-add-payment')?.addEventListener('click', () => {
        this.openPaymentForm(contractId, user, () => { modal.close(); this.openContractDrawer(contractId, user); });
      });
      modal.element.querySelectorAll('.pay-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.confirmDelete('Xóa Đợt Thanh Toán', 'Bạn có chắc chắn muốn xóa đợt thanh toán này?', () => {
            DB.deletePayment(contractId, btn.getAttribute('data-pay'));
            Toast.success('Đã xóa đợt thanh toán.');
            modal.close();
            this.openContractDrawer(contractId, user);
          });
        });
      });
    }
  },

  openPaymentForm(contractId, user, onSave) {
    const contract = DB.getContract(contractId);
    const paid = (contract?.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const debt = Math.max(0, (contract?.value || 0) - paid);
    const val30 = Math.round((contract?.value || 0) * 0.3);
    const val50 = Math.round((contract?.value || 0) * 0.5);

    const html = `
      <form id="payment-form" style="display:flex; flex-direction:column; gap:12px;">
        <div style="background:rgba(255,255,255,0.03); border-radius:10px; padding:10px; border:1px solid var(--border-color); font-size:0.78rem;">
          <div style="color:var(--text-muted);">Khách hàng: <strong style="color:var(--text-primary);">${contract?.customerName || ''}</strong></div>
          <div style="display:flex; justify-content:space-between; margin-top:4px;">
            <span>Tổng HĐ: <strong>${fmt.currency(contract?.value || 0)}</strong></span>
            <span>Còn nợ: <strong style="color:#EF4444;">${fmt.currency(debt)}</strong></span>
          </div>
        </div>

        <div>
          <label class="form-label">Gợi ý số tiền thu nhanh:</label>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
            ${val30 > 0 ? `<button type="button" class="pay-preset-btn" data-amount="${val30}" data-type="deposit" data-note="Đặt cọc Đợt 1 (30%)" style="padding:5px 9px; border-radius:6px; background:rgba(197,168,128,0.12); border:1px solid rgba(197,168,128,0.3); color:var(--primary); font-size:0.72rem; font-weight:600; cursor:pointer;">30% (${fmt.currency(val30)})</button>` : ''}
            ${val50 > 0 ? `<button type="button" class="pay-preset-btn" data-amount="${val50}" data-type="installment" data-note="Thanh toán Đợt 2 (50%)" style="padding:5px 9px; border-radius:6px; background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.3); color:#3B82F6; font-size:0.72rem; font-weight:600; cursor:pointer;">50% (${fmt.currency(val50)})</button>` : ''}
            ${debt > 0 ? `<button type="button" class="pay-preset-btn" data-amount="${debt}" data-type="final" data-note="Thanh lý & Nghiệm thu" style="padding:5px 9px; border-radius:6px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#10B981; font-size:0.72rem; font-weight:700; cursor:pointer;">Thu hết nợ (${fmt.currency(debt)})</button>` : ''}
          </div>
        </div>

        <div>
          <label class="form-label">Loại khoản thu *</label>
          <select id="pay-type" class="form-select">
            <option value="deposit">Đặt cọc (Đợt 1)</option>
            <option value="installment">Thanh toán đợt (Đợt 2,3...)</option>
            <option value="final">Thanh lý / Quyết toán</option>
          </select>
        </div>
        <div>
          <label class="form-label">Số tiền (VNĐ) *</label>
          <input type="text" inputmode="numeric" id="pay-amount" class="form-input" placeholder="Gõ số (Ví dụ: 100.000.000)" required>
          <div id="pay-amount-hint" style="font-size:0.72rem; color:var(--primary); margin-top:4px; font-weight:600; min-height:16px;"></div>
        </div>
        <div>
          <label class="form-label">Ngày thu *</label>
          <input type="date" id="pay-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div>
          <label class="form-label">Ghi chú / Tên đợt</label>
          <input type="text" id="pay-note" class="form-input" placeholder="Ví dụ: Đợt 1 - Cọc ký hợp đồng">
        </div>
        <div>
          <label class="form-label" style="display:flex; align-items:center; gap:6px; color:var(--primary); font-weight:700;">
            <i class="fas fa-camera"></i> Hình Ảnh Kiểm Chứng (Bill / Giấy nộp tiền)
          </label>
          <input type="file" id="pay-proof-file" accept="image/*" class="form-input" style="padding:7px 10px; font-size:0.8rem;">
          <div id="pay-proof-preview" style="display:none; margin-top:8px; position:relative; width:max-content;">
            <img id="pay-proof-img" src="" style="max-height:100px; border-radius:8px; border:1px solid var(--primary); object-fit:cover; display:block;">
            <button type="button" id="pay-proof-remove" style="position:absolute; top:-6px; right:-6px; background:#EF4444; color:#fff; border:none; border-radius:50%; width:22px; height:22px; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.3);">&times;</button>
          </div>
        </div>
        <button type="submit" class="btn-primary" style="padding:12px; font-size:0.92rem; font-weight:700;"><i class="fas fa-paper-plane"></i> Lưu Khoản Thu & Gửi Thông Báo Admin</button>
      </form>
    `;

    const modal = Modal.create('Thêm Khoản Thu Theo Đợt', html);

    const payInput = document.getElementById('pay-amount');
    const payHint = document.getElementById('pay-amount-hint');

    let proofBase64 = '';
    const proofFileInput = document.getElementById('pay-proof-file');
    const proofPreviewDiv = document.getElementById('pay-proof-preview');
    const proofImg = document.getElementById('pay-proof-img');
    const proofRemoveBtn = document.getElementById('pay-proof-remove');

    proofFileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          if (proofPreviewDiv) proofPreviewDiv.style.display = 'block';
          if (proofImg) proofImg.style.opacity = '0.5';
          proofBase64 = await compressImage(file, 800, 0.7);
          if (proofImg) {
            proofImg.src = proofBase64;
            proofImg.style.opacity = '1';
          }
        } catch (err) {
          console.error('Image processing error:', err);
          Toast.error('Không thể xử lý ảnh này. Vui lòng chọn ảnh khác!');
        }
      }
    });

    proofRemoveBtn?.addEventListener('click', () => {
      proofBase64 = '';
      if (proofFileInput) proofFileInput.value = '';
      if (proofPreviewDiv) proofPreviewDiv.style.display = 'none';
      if (proofImg) proofImg.src = '';
    });

    const formatMoney = (input, hint) => {
      const raw = input.value.replace(/\D/g, '');
      if (!raw) {
        input.value = '';
        if (hint) hint.textContent = '';
        return;
      }
      const num = parseInt(raw, 10);
      input.value = num.toLocaleString('vi-VN');
      if (hint) hint.textContent = `✨ ${num.toLocaleString('vi-VN')} VNĐ`;
    };

    payInput?.addEventListener('input', () => formatMoney(payInput, payHint));

    // Preset button click listeners
    modal.element.querySelectorAll('.pay-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = btn.getAttribute('data-amount');
        const type = btn.getAttribute('data-type');
        const note = btn.getAttribute('data-note');
        if (amt) {
          payInput.value = parseInt(amt, 10).toLocaleString('vi-VN');
          formatMoney(payInput, payHint);
        }
        if (type) document.getElementById('pay-type').value = type;
        if (note) document.getElementById('pay-note').value = note;
      });
    });

    document.getElementById('payment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const rawAmount = parseInt(payInput.value.replace(/\D/g, ''), 10) || 0;
      if (rawAmount <= 0) {
        Toast.error('Vui lòng nhập số tiền thu hợp lệ!');
        payInput.focus();
        return;
      }
      try {
        DB.addPayment(contractId, {
          amount: rawAmount,
          date: document.getElementById('pay-date').value,
          type: document.getElementById('pay-type').value,
          note: document.getElementById('pay-note').value || 'Thu tiền đợt',
          proofImage: proofBase64
        }, user);
        Toast.success('Đã lưu khoản thu & gửi thông báo khoản thu mới đến Admin!');
        modal.close();
        if (onSave) onSave();
      } catch (err) {
        console.error('Save payment error:', err);
        Toast.error('Lỗi khi lưu khoản thu. Vui lòng thử lại!');
      }
    });
  },

  openContractForm(contractId, user, onSave, prefilledLead = null) {
    const c = contractId ? DB.getContract(contractId) : null;
    const isEdit = !!c;
    const allLeads = DB.getLeads(user.id, user.role);

    const initialCustomer = c?.customerName || prefilledLead?.name || '';
    const initialPhone = c?.phone || prefilledLead?.phone || '';
    const initialHomeAddress = c?.homeAddress || prefilledLead?.homeAddress || '';
    const initialAddress = c?.address || prefilledLead?.address || '';
    const initialValueFormatted = c?.value ? Number(c.value).toLocaleString('vi-VN') : '';
    const autoCode = c?.code || `MTP-${new Date().getFullYear()}/${String(DB.getContracts().length + 1).padStart(3, '0')}`;

    const defaultMilestones = (c?.milestones && c.milestones.length > 0) ? c.milestones : [
      { name: 'Đợt 1 (Tạm ứng ký HĐ)', pct: 30, expectedDate: c?.signedDate || new Date().toISOString().split('T')[0], note: 'Đặt cọc 30% khi ký HĐ' },
      { name: 'Đợt 2 (Thi công & Vận chuyển)', pct: 50, expectedDate: '', note: 'Thanh toán 50% khi giao hàng' },
      { name: 'Đợt 3 (Nghiệm thu bàn giao)', pct: 20, expectedDate: c?.expectedDelivery || '', note: 'Thanh lý 20% khi nghiệm thu' }
    ];

    const html = `
      <form id="contract-form" style="display:flex; flex-direction:column; gap:16px;">
        ${!isEdit ? `
          <!-- Section: Lead Selection -->
          <div style="background:rgba(197,168,128,0.06); border:1px solid rgba(197,168,128,0.25); border-radius:12px; padding:12px;">
            <label class="form-label" style="color:var(--primary); font-weight:700; font-size:0.85rem; margin-bottom:6px;">
              <i class="fas fa-trophy"></i> 1. Chọn Khách Hàng Từ CRM <span style="font-size:0.72rem; color:#10B981; font-weight:600;">(Lead đã Chốt HĐ ✅)</span>
            </label>
            <select id="cf-lead-select" class="form-select" style="border-color:var(--primary);">
              <option value="">-- Bấm để chọn khách hàng --</option>
              ${allLeads.filter(l => l.stage === 'won').map(l => `<option value="${l.id}" ${prefilledLead?.id === l.id ? 'selected' : ''}>${l.name} (${l.phone || 'Không sđt'})</option>`).join('')}
            </select>
            ${allLeads.filter(l => l.stage === 'won').length === 0 ? `<div style="font-size:0.72rem; color:#F59E0B; margin-top:4px;"><i class="fas fa-exclamation-triangle"></i> Chưa có khách hàng nào ở trạng thái Chốt Hợp Đồng.</div>` : ''}
          </div>
        ` : ''}

        <!-- Section 1: Customer Details (Bên A) -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-user-check"></i> Thông Tin Khách Hàng (Bên A)
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label class="form-label">Tên Khách Hàng (Họ & Tên) *</label>
              <input type="text" id="cf-customer" class="form-input" value="${initialCustomer}" placeholder="Ví dụ: Nguyễn Văn A" required>
            </div>
            <div>
              <label class="form-label">Số Điện Thoại *</label>
              <input type="tel" id="cf-phone" class="form-input" value="${initialPhone}" placeholder="Ví dụ: 0905xxxxxx">
            </div>
          </div>
          <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label class="form-label">Địa Chỉ Khách Hàng (Nơi cư trú)</label>
              <input type="text" id="cf-home-address" class="form-input" value="${initialHomeAddress}" placeholder="Số nhà, tên đường, phường/xã...">
            </div>
            <div>
              <label class="form-label">Địa Chỉ Công Trình Thi Công *</label>
              <input type="text" id="cf-address" class="form-input" value="${initialAddress}" placeholder="Để trống nếu trùng địa chỉ khách">
            </div>
          </div>
        </div>

        <!-- Section 2: Contract Details & Value -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-file-invoice-dollar"></i> Giá Trị Hợp Đồng
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <div>
              <label class="form-label">Mã Hợp Đồng *</label>
              <input type="text" id="cf-code" class="form-input" value="${autoCode}" required style="font-family:monospace; font-weight:700;">
            </div>
            <div>
              <label class="form-label">Tổng Giá Trị Hợp Đồng (VNĐ) *</label>
              <input type="text" inputmode="numeric" id="cf-value" class="form-input" value="${initialValueFormatted}" placeholder="Ví dụ: 254.221.800" required style="font-weight:700; color:var(--primary);">
            </div>
          </div>
          <div id="cf-value-hint" style="font-size:0.75rem; color:var(--primary); background:rgba(197,168,128,0.1); border-radius:8px; padding:6px 10px; font-weight:600; min-height:18px; display:none;"></div>
        </div>

        <!-- Section 3: Payment Milestones Plan Builder -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <label class="form-label" style="margin:0; color:var(--primary); font-weight:700; font-size:0.82rem;">
                <i class="fas fa-list-ol"></i> Tiến Độ Thanh Toán Theo Giai Đoạn
              </label>
              <span id="milestone-total-badge" style="font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:6px;"></span>
            </div>
            <button type="button" id="btn-add-milestone" style="background:rgba(197,168,128,0.15); border:1px solid rgba(197,168,128,0.4); color:var(--primary); padding:4px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;">
              <i class="fas fa-plus"></i> Thêm Đợt
            </button>
          </div>
          <div id="milestones-list-container" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>

        ${!isEdit ? `
          <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); border-radius:10px; padding:10px;">
            <label class="form-label" style="color:#10B981; font-weight:700;"><i class="fas fa-money-bill-wave"></i> Tiền Cọc Thu Ngay (Nếu đã nhận tiền đợt 1 khi ký HĐ)</label>
            <input type="text" inputmode="numeric" id="cf-initial-deposit" class="form-input" placeholder="Ví dụ: 50.000.000 (Để trống nếu chưa thu)" style="border-color:rgba(16,185,129,0.4);">
            <div id="cf-deposit-hint" style="font-size:0.72rem; color:#10B981; margin-top:4px; font-weight:600; min-height:16px;"></div>
          </div>
        ` : ''}

        <!-- Section 4: Timeline & Status -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-calendar-alt"></i> Thời Gian & Trạng Thái Hợp Đồng
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
            <div>
              <label class="form-label">Ngày Ký *</label>
              <input type="date" id="cf-signed" class="form-input" value="${c?.signedDate || new Date().toISOString().split('T')[0]}" required>
            </div>
            <div>
              <label class="form-label">Bàn Giao Dự Kiến</label>
              <input type="date" id="cf-delivery" class="form-input" value="${c?.expectedDelivery || ''}">
            </div>
            <div>
              <label class="form-label">⏱️ Số Ngày Thi Công</label>
              <div id="cf-duration-display" style="height:38px; display:flex; align-items:center; justify-content:center; background:rgba(197,168,128,0.1); border:1px solid rgba(197,168,128,0.3); border-radius:8px; font-weight:700; font-size:1rem; color:var(--primary); letter-spacing:0.5px;">-- ngày</div>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label class="form-label">Trạng Thái HĐ</label>
              <select id="cf-stage" class="form-select">
                <option value="signed" ${c?.stage === 'signed' ? 'selected' : ''}>Đã Ký</option>
                <option value="in_production" ${c?.stage === 'in_production' ? 'selected' : ''}>Đang SX</option>
                <option value="delivered" ${c?.stage === 'delivered' ? 'selected' : ''}>Đã Bàn Giao</option>
                <option value="warranty" ${c?.stage === 'warranty' ? 'selected' : ''}>Bảo Hành</option>
              </select>
            </div>
            <div>
              <label class="form-label">Đại Diện Bên B (Mộc Tiên Phát)</label>
              <input type="text" id="cf-repname" class="form-input" value="${c?.repName || 'Tôn Thất Uyên Luận'}">
            </div>
          </div>
        </div>

        <div>
          <label class="form-label">Ghi Chú Đơn Hàng / Thi Công</label>
          <textarea id="cf-note" class="form-textarea" style="height:50px;">${c?.note || ''}</textarea>
        </div>
        <button type="submit" class="btn-primary" style="padding:12px; font-size:0.95rem; font-weight:700;"><i class="fas fa-file-word"></i> ${isEdit ? 'Lưu Thay Đổi Hợp Đồng' : 'Tạo Hợp Đồng & Xuất File Word'}</button>
      </form>
    `;

    const modal = Modal.create(isEdit ? 'Chỉnh Sửa Hợp Đồng' : 'Thêm Hợp Đồng Mới Mộc Tiên Phát', html);

    const valInput = document.getElementById('cf-value');
    const valHint = document.getElementById('cf-value-hint');
    const depInput = document.getElementById('cf-initial-deposit');
    const depHint = document.getElementById('cf-deposit-hint');

    // Milestones Builder Logic
    let milestoneItems = [...defaultMilestones];

    const syncMilestonesFromDOM = () => {
      const rows = modal.element.querySelectorAll('.milestone-row');
      if (rows.length === 0) return;
      milestoneItems = Array.from(rows).map(row => ({
        name: row.querySelector('.ms-name')?.value || '',
        pct: parseInt(row.querySelector('.ms-pct')?.value, 10) || 0,
        expectedDate: row.querySelector('.ms-date')?.value || '',
        note: row.querySelector('.ms-note')?.value || ''
      }));
    };

    const rebalanceMilestones = (changedIdx, newPct) => {
      syncMilestonesFromDOM();
      milestoneItems[changedIdx].pct = newPct;

      let used = 0;
      for (let i = 0; i <= changedIdx; i++) {
        used += milestoneItems[i].pct;
      }

      let remaining = Math.max(0, 100 - used);
      const remainingRows = milestoneItems.length - 1 - changedIdx;

      if (remainingRows > 0) {
        if (remainingRows === 1) {
          milestoneItems[changedIdx + 1].pct = remaining;
        } else {
          let stepShare = Math.floor(remaining / remainingRows / 5) * 5;
          for (let j = changedIdx + 1; j < milestoneItems.length - 1; j++) {
            milestoneItems[j].pct = stepShare;
            remaining -= stepShare;
          }
          milestoneItems[milestoneItems.length - 1].pct = Math.max(0, remaining);
        }
      }
    };

    const updateMilestonesTotalBadge = () => {
      const badge = document.getElementById('milestone-total-badge');
      if (!badge) return;
      const sum = milestoneItems.reduce((s, m) => s + (parseInt(m.pct, 10) || 0), 0);
      if (sum === 100) {
        badge.style.background = 'rgba(16,185,129,0.15)';
        badge.style.color = '#10B981';
        badge.style.border = '1px solid rgba(16,185,129,0.3)';
        badge.textContent = 'Tổng: 100% ✅';
      } else {
        badge.style.background = 'rgba(239,68,68,0.15)';
        badge.style.color = '#EF4444';
        badge.style.border = '1px solid rgba(239,68,68,0.3)';
        badge.textContent = `Tổng: ${sum}% ⚠️ ${sum < 100 ? `(Thiếu ${100 - sum}%)` : `(Dư ${sum - 100}%)`}`;
      }
    };

    const renderMilestonesBuilder = () => {
      const container = document.getElementById('milestones-list-container');
      if (!container) return;

      const pctOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 5); // 5, 10, 15... 100

      container.innerHTML = milestoneItems.map((m, idx) => `
        <div class="milestone-row" data-idx="${idx}" style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); border-radius:8px; padding:8px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <input type="text" class="form-input ms-name" value="${m.name}" placeholder="Tên đợt (ví dụ: Đợt 1)" style="flex:2; font-weight:700; font-size:0.78rem;">
            <div style="display:flex; align-items:center; gap:4px;">
              <select class="form-select ms-pct" data-idx="${idx}" style="width:78px; font-size:0.82rem; font-weight:700; color:var(--primary); text-align:center; padding:4px 4px;">
                ${pctOptions.map(p => `<option value="${p}" ${m.pct === p ? 'selected' : ''}>${p}%</option>`).join('')}
              </select>
            </div>
            <button type="button" class="ms-del-btn" data-idx="${idx}" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#EF4444; border-radius:6px; padding:4px 8px; font-size:0.7rem; cursor:pointer;" title="Xóa đợt"><i class="fas fa-trash-alt"></i></button>
          </div>
          <div style="display:flex; gap:6px;">
            <input type="date" class="form-input ms-date" value="${m.expectedDate || ''}" style="flex:1; font-size:0.75rem;">
            <input type="text" class="form-input ms-note" value="${m.note || ''}" placeholder="Ghi chú đợt (ví dụ: Cọc khi ký HĐ)" style="flex:2; font-size:0.75rem;">
          </div>
        </div>
      `).join('');

      // Add change listeners for dropdowns
      container.querySelectorAll('.ms-pct').forEach(select => {
        select.addEventListener('change', (e) => {
          const idx = parseInt(e.target.getAttribute('data-idx'), 10);
          const newPct = parseInt(e.target.value, 10);
          rebalanceMilestones(idx, newPct);
          renderMilestonesBuilder();
        });
      });

      // Add delete listeners
      container.querySelectorAll('.ms-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          syncMilestonesFromDOM();
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          milestoneItems.splice(idx, 1);
          renderMilestonesBuilder();
        });
      });

      updateMilestonesTotalBadge();
    };

    renderMilestonesBuilder();

    document.getElementById('btn-add-milestone')?.addEventListener('click', () => {
      syncMilestonesFromDOM();
      const nextNum = milestoneItems.length + 1;
      const currentSum = milestoneItems.reduce((s, m) => s + (parseInt(m.pct, 10) || 0), 0);
      const remain = Math.max(5, 100 - currentSum);
      milestoneItems.push({
        name: `Đợt ${nextNum}`,
        pct: Math.min(remain, 20),
        expectedDate: '',
        note: ''
      });
      renderMilestonesBuilder();
    });

    const formatValueMoney = () => {
      if (!valInput) return;
      const raw = valInput.value.replace(/\D/g, '');
      if (!raw) {
        valInput.value = '';
        if (valHint) { valHint.style.display = 'none'; valHint.innerHTML = ''; }
        return;
      }
      const num = parseInt(raw, 10);
      valInput.value = num.toLocaleString('vi-VN');
      if (valHint) {
        valHint.style.display = 'block';
        valHint.innerHTML = `<div>✨ <strong>${num.toLocaleString('vi-VN')} VNĐ</strong></div><div style="margin-top:2px; font-style:italic;">✍️ Bằng chữ: ${this._numberToWords(num)}</div>`;
      }
    };

    const formatDepositMoney = () => {
      if (!depInput) return;
      const raw = depInput.value.replace(/\D/g, '');
      if (!raw) {
        depInput.value = '';
        if (depHint) depHint.textContent = '';
        return;
      }
      const num = parseInt(raw, 10);
      depInput.value = num.toLocaleString('vi-VN');
      if (depHint) depHint.textContent = `✨ Đã thu cọc: ${num.toLocaleString('vi-VN')} VNĐ`;
    };

    valInput?.addEventListener('input', formatValueMoney);
    depInput?.addEventListener('input', formatDepositMoney);
    if (valInput?.value) formatValueMoney();

    // Live duration calculator
    const updateDurationDisplay = () => {
      const signedVal = document.getElementById('cf-signed')?.value;
      const deliveryVal = document.getElementById('cf-delivery')?.value;
      const display = document.getElementById('cf-duration-display');
      if (!display) return;
      if (signedVal && deliveryVal) {
        const d1 = new Date(signedVal);
        const d2 = new Date(deliveryVal);
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          display.textContent = `${diffDays} ngày`;
          display.style.color = diffDays <= 35 ? 'var(--primary)' : '#EF4444';
        } else {
          display.textContent = '⚠️ Ngày không hợp lệ';
          display.style.color = '#EF4444';
        }
      } else {
        display.textContent = '-- ngày';
        display.style.color = 'var(--primary)';
      }
    };

    document.getElementById('cf-signed')?.addEventListener('change', updateDurationDisplay);
    document.getElementById('cf-delivery')?.addEventListener('change', updateDurationDisplay);
    updateDurationDisplay();

    // Auto-fill from lead select
    document.getElementById('cf-lead-select')?.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const targetLead = allLeads.find(l => l.id === selectedId);
      if (targetLead) {
        document.getElementById('cf-customer').value = targetLead.name || '';
        document.getElementById('cf-phone').value = targetLead.phone || '';
        document.getElementById('cf-home-address').value = targetLead.homeAddress || '';
        document.getElementById('cf-address').value = targetLead.address || '';
      }
    });

    document.getElementById('contract-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const selectedLeadId = document.getElementById('cf-lead-select')?.value || prefilledLead?.id || null;
      const rawValue = parseInt(valInput.value.replace(/\D/g, ''), 10) || 0;
      const initialDeposit = depInput ? (parseInt(depInput.value.replace(/\D/g, ''), 10) || 0) : 0;

      // Extract custom payment milestones from builder
      const finalMilestones = [];
      modal.element.querySelectorAll('.milestone-row').forEach(row => {
        const name = row.querySelector('.ms-name')?.value || 'Đợt';
        const pct = parseInt(row.querySelector('.ms-pct')?.value) || 0;
        const expectedDate = row.querySelector('.ms-date')?.value || '';
        const note = row.querySelector('.ms-note')?.value || '';
        const amount = Math.round((rawValue * pct) / 100);
        finalMilestones.push({ name, pct, amount, expectedDate, note });
      });

      const signedDateVal = document.getElementById('cf-signed').value;
      const deliveryDateVal = document.getElementById('cf-delivery').value;
      let constructionDays = 0;
      if (signedDateVal && deliveryDateVal) {
        const d1 = new Date(signedDateVal);
        const d2 = new Date(deliveryDateVal);
        constructionDays = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
      }

      const data = {
        code: document.getElementById('cf-code').value,
        customerName: document.getElementById('cf-customer').value,
        phone: document.getElementById('cf-phone').value,
        homeAddress: document.getElementById('cf-home-address').value,
        address: document.getElementById('cf-address').value,
        repName: document.getElementById('cf-repname').value,
        value: rawValue,
        signedDate: signedDateVal,
        expectedDelivery: deliveryDateVal,
        constructionDays,
        stage: document.getElementById('cf-stage').value,
        note: document.getElementById('cf-note').value,
        milestones: finalMilestones,
        leadId: selectedLeadId
      };
      if (isEdit) {
        DB.updateContract(contractId, data);
        Toast.success('Đã cập nhật hợp đồng.');
      } else {
        const createdContract = DB.createContract(data, user.id);
        if (initialDeposit > 0 && createdContract) {
          DB.addPayment(createdContract.id, {
            amount: initialDeposit,
            date: data.signedDate || new Date().toISOString().split('T')[0],
            type: 'deposit',
            note: 'Cọc Đợt 1 (Khi ký HĐ)'
          });
        }
        if (selectedLeadId) {
          DB.updateLead(selectedLeadId, { stage: 'won' }, user.id);
        }
        Toast.success('Đã tạo hợp đồng mới!');
      }
      modal.close();
      if (onSave) onSave();
    });
  },

  // ══════════════════════════════════════════════════════
  //  6. CAMPAIGNS
  // ══════════════════════════════════════════════════════
  renderCampaigns(user) {
    this._setActiveNav('campaigns');
    const body = this._getBody();
    const campaigns = DB.getCampaigns();
    const canEdit = user.role === 'marketing' || user.role === 'manager';

    const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
    const totalLeads = campaigns.reduce((s, c) => s + (c.leadsGenerated || 0), 0);
    const avgCPL = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;

    body.innerHTML = `
      <div class="page-content fade-in">
        <div class="page-title-row">
          <h2 class="page-title"><i class="fas fa-bullhorn"></i> Chiến Dịch</h2>
          ${canEdit ? `<button class="btn-primary btn-sm" id="btn-new-campaign"><i class="fas fa-plus"></i> Thêm</button>` : ''}
        </div>

        <!-- Summary Row -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:10px;">
            <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:3px;">Ngân Sách / Chi</div>
            <div style="font-size:0.82rem; font-weight:700; color:var(--primary);">${fmt.currency(totalBudget)}</div>
            <div style="font-size:0.72rem; color:#EF4444; margin-top:2px;">Chi: ${fmt.currency(totalSpent)}</div>
          </div>
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:10px;">
            <div style="font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:3px;">Leads / CPL</div>
            <div style="font-size:0.82rem; font-weight:700; color:#10B981;">${totalLeads} leads</div>
            <div style="font-size:0.72rem; color:var(--primary); margin-top:2px;">CPL: ${fmt.currency(avgCPL)}</div>
          </div>
        </div>

        <!-- CPL by Platform -->
        ${campaigns.length > 0 ? `
        <div class="section-card" style="margin-bottom:14px;">
          <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:10px;">CPL Theo Kênh</div>
          ${CAMPAIGN_PLATFORMS.map(platform => {
      const platCamps = campaigns.filter(c => c.platform === platform.id);
      if (platCamps.length === 0) return '';
      const platSpent = platCamps.reduce((s, c) => s + (c.spent || 0), 0);
      const platLeads = platCamps.reduce((s, c) => s + (c.leadsGenerated || 0), 0);
      const platCPL = platLeads > 0 ? Math.round(platSpent / platLeads) : 0;
      return `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div style="width:26px; height:26px; border-radius:7px; background:${platform.color}22; border:1px solid ${platform.color}44; display:flex; align-items:center; justify-content:center;">
                    <i class="fab ${platform.icon}" style="font-size:0.75rem; color:${platform.color};"></i>
                  </div>
                  <span style="font-size:0.78rem; color:var(--text-secondary);">${platform.label}</span>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:0.75rem; font-weight:700; color:${platform.color};">${platLeads} leads</div>
                  <div style="font-size:0.65rem; color:var(--text-muted);">CPL: ${fmt.currency(platCPL)}</div>
                </div>
              </div>
            `;
    }).join('')}
        </div>
        ` : ''}

        <!-- Campaign List -->
        <div id="campaigns-list" style="display:flex; flex-direction:column; gap:10px;">
          ${campaigns.length === 0 ? `<div class="empty-state"><i class="fas fa-bullhorn"></i><p>Chưa có chiến dịch nào.</p></div>` :
        campaigns.map(c => this._buildCampaignCard(c, canEdit)).join('')
      }
        </div>
      </div>
    `;

    if (canEdit) {
      document.getElementById('btn-new-campaign')?.addEventListener('click', () => this.openCampaignForm(null, user, () => this.renderCampaigns(user)));
    }
    
    // Campaign Card Click Listener (Open Detail Drawer)
    body.querySelectorAll('.campaign-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.campaign-btn-edit') || e.target.closest('.campaign-btn-delete')) return;
        const id = card.getAttribute('data-id');
        this.openCampaignDrawer(id, user, () => this.renderCampaigns(user));
      });
    });

    body.querySelectorAll('.campaign-btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openCampaignForm(btn.getAttribute('data-id'), user, () => this.renderCampaigns(user));
      });
    });
    body.querySelectorAll('.campaign-btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const c = DB.getCampaigns().find(x => x.id === id);
        this.confirmDelete('Xóa Chiến Dịch', `Bạn có chắc chắn muốn xóa chiến dịch "${c?.name || 'này'}"?`, () => {
          DB.deleteCampaign(id);
          Toast.success('Đã xóa chiến dịch.');
          this.renderCampaigns(user);
        });
      });
    });
  },

  _buildCampaignCard(c, canEdit) {
    const platform = CAMPAIGN_PLATFORMS.find(p => p.id === c.platform) || CAMPAIGN_PLATFORMS[0];
    const spentPct = c.budget > 0 ? Math.min(100, Math.round(c.spent / c.budget * 100)) : 0;
    const cpl = c.leadsGenerated > 0 ? Math.round(c.spent / c.leadsGenerated) : 0;
    const statusColors = { active: '#10B981', paused: '#F59E0B', completed: '#6B7280' };
    const statusLabels = { active: 'Đang chạy', paused: 'Tạm dừng', completed: 'Kết thúc' };
    return `
      <div class="campaign-card" data-id="${c.id}" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-left:4px solid ${platform.color}; border-radius:16px; padding:14px 16px; cursor:pointer; transition:all 0.2s;" title="Bấm để xem chi tiết & cập nhật chi tiêu Ads">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.92rem; font-weight:800; color:var(--text-primary); margin-bottom:2px;">${c.name}</div>
            <div style="display:flex; align-items:center; gap:6px;">
              <i class="fab ${platform.icon}" style="color:${platform.color}; font-size:0.75rem;"></i>
              <span style="font-size:0.72rem; color:var(--text-muted);">${platform.label} · ${c.startDate || '—'}</span>
            </div>
          </div>
          <span style="font-size:0.65rem; font-weight:700; padding:3px 8px; border-radius:6px; background:${statusColors[c.status]}22; color:${statusColors[c.status]}; border:1px solid ${statusColors[c.status]}44; white-space:nowrap;">${statusLabels[c.status]}</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:8px; font-size:0.72rem; text-align:center;">
          <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:6px;"><div style="color:var(--text-muted);">Ngân sách</div><div style="font-weight:700; color:var(--primary);">${fmt.currency(c.budget)}</div></div>
          <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:6px;"><div style="color:var(--text-muted);">Đã chi</div><div style="font-weight:700; color:#EF4444;">${fmt.currency(c.spent)}</div></div>
          <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:5px;"><div style="color:var(--text-muted);">Leads</div><div style="font-weight:700; color:#10B981;">${c.leadsGenerated}</div></div>
        </div>
        <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; margin-bottom:8px;">
          <div style="height:4px; width:${spentPct}%; background:${spentPct >= 90 ? '#EF4444' : platform.color}; border-radius:2px;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:var(--text-muted);">
          <span>CPL: <strong style="color:var(--primary);">${fmt.currency(cpl)}</strong> · Chi ${spentPct}% ngân sách</span>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn-link" style="font-weight:700; font-size:0.75rem; color:#3B82F6;">Chi tiết →</button>
            ${canEdit ? `
              <div style="display:flex; gap:4px;">
                <button class="campaign-btn-edit" data-id="${c.id}" style="background:none;border:none;color:var(--primary);cursor:pointer;padding:3px 6px;" title="Sửa chiến dịch"><i class="fas fa-edit"></i></button>
                <button class="campaign-btn-delete" data-id="${c.id}" style="background:none;border:none;color:var(--status-rejected);cursor:pointer;padding:3px 6px;" title="Xóa"><i class="fas fa-trash-alt"></i></button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  openCampaignForm(campaignId, user, onSave) {
    const c = campaignId ? DB.getCampaign(campaignId) : null;
    const isEdit = !!c;
    const initialBudget = c?.budget ? Number(c.budget).toLocaleString('vi-VN') : '';
    const initialSpent = c?.spent ? Number(c.spent).toLocaleString('vi-VN') : '';

    const html = `
      <form id="campaign-form" style="display:flex; flex-direction:column; gap:12px;">
        <div><label class="form-label">Tên Chiến Dịch *</label><input type="text" id="cf2-name" class="form-input" value="${c?.name || ''}" required></div>
        <div><label class="form-label">Kênh Chạy *</label><select id="cf2-platform" class="form-select">${CAMPAIGN_PLATFORMS.map(p => `<option value="${p.id}" ${c?.platform === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}</select></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div><label class="form-label">Ngày Bắt Đầu</label><input type="date" id="cf2-start" class="form-input" value="${c?.startDate || ''}"></div>
          <div><label class="form-label">Ngày Kết Thúc</label><input type="date" id="cf2-end" class="form-input" value="${c?.endDate || ''}"></div>
          <div><label class="form-label">Ngân Sách (VNĐ)</label><input type="text" inputmode="numeric" id="cf2-budget" class="form-input" value="${initialBudget}" placeholder="Ví dụ: 20.000.000"></div>
          <div><label class="form-label">Đã Chi (VNĐ)</label><input type="text" inputmode="numeric" id="cf2-spent" class="form-input" value="${initialSpent}" placeholder="Ví dụ: 15.000.000"></div>
          <div><label class="form-label">Trạng Thái</label><select id="cf2-status" class="form-select"><option value="active" ${c?.status === 'active' ? 'selected' : ''}>Đang chạy</option><option value="paused" ${c?.status === 'paused' ? 'selected' : ''}>Tạm dừng</option><option value="completed" ${c?.status === 'completed' ? 'selected' : ''}>Kết thúc</option></select></div>
          <div style="grid-column:span 2; background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.3); border-radius:10px; padding:10px; font-size:0.75rem; color:#3B82F6;">
            <i class="fas fa-magic"></i> <strong>Số Leads Tự Động Thống Kê:</strong> <strong style="font-size:0.9rem; color:#10B981;">${c?.leadsGenerated || 0} Leads</strong>
            <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">(Số Leads được hệ thống đếm tự động khi bạn thêm khách hàng mới và gắn với chiến dịch này)</div>
          </div>
        </div>
        <div><label class="form-label">Ghi Chú</label><textarea id="cf2-note" class="form-textarea" style="height:60px;">${c?.note || ''}</textarea></div>
        <button type="submit" class="btn-primary">${isEdit ? 'Lưu Thay Đổi' : 'Tạo Chiến Dịch'}</button>
      </form>
    `;
    const modal = Modal.create(isEdit ? 'Chỉnh Sửa Chiến Dịch' : 'Thêm Chiến Dịch', html);

    const bInput = document.getElementById('cf2-budget');
    const sInput = document.getElementById('cf2-spent');
    const formatInput = (input) => {
      if (!input) return;
      const raw = input.value.replace(/\D/g, '');
      input.value = raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '';
    };
    bInput?.addEventListener('input', () => formatInput(bInput));
    sInput?.addEventListener('input', () => formatInput(sInput));

    document.getElementById('campaign-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('cf2-name').value,
        platform: document.getElementById('cf2-platform').value,
        startDate: document.getElementById('cf2-start').value,
        endDate: document.getElementById('cf2-end').value,
        budget: parseInt(bInput.value.replace(/\D/g, ''), 10) || 0,
        spent: parseInt(sInput.value.replace(/\D/g, ''), 10) || 0,
        status: document.getElementById('cf2-status').value,
        note: document.getElementById('cf2-note').value
      };
      if (isEdit) { DB.updateCampaign(campaignId, data); Toast.success('Đã cập nhật.'); }
      else { DB.createCampaign(data, user.id); Toast.success('Đã tạo chiến dịch.'); }
      modal.close();
      if (onSave) onSave();
    });
  },

  openCampaignDrawer(campaignId, user, onSave) {
    const c = DB.getCampaigns().find(x => x.id === campaignId) || DB.getCampaign(campaignId);
    if (!c) return;
    const platform = CAMPAIGN_PLATFORMS.find(p => p.id === c.platform) || CAMPAIGN_PLATFORMS[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const logs = c.dailyLogs || [];
    const totalLogsSpent = logs.reduce((s, l) => s + (l.amount || 0), 0);
    const totalSpent = (logs && logs.length > 0) ? totalLogsSpent : (c.spent || 0);

    const linkedLeads = (DB.getLeads() || []).filter(l => l.campaignId === c.id);
    const leadsCount = linkedLeads.length;
    const cpl = leadsCount > 0 ? Math.round(totalSpent / leadsCount) : 0;
    const canEdit = user.role === 'marketing' || user.role === 'manager';

    const html = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <!-- Header Card -->
        <div style="background:rgba(255,255,255,0.03); border:1.5px solid ${platform.color}55; border-left:5px solid ${platform.color}; border-radius:14px; padding:14px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div>
              <div style="font-size:1.05rem; font-weight:800; color:var(--text-primary);">${c.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px; display:flex; align-items:center; gap:6px;">
                <i class="fab ${platform.icon}" style="color:${platform.color}; font-size:0.8rem;"></i>
                <span>${platform.label} · Tạo ngày: ${fmt.date(c.startDate || c.createdAt)}</span>
              </div>
            </div>
            <span style="font-size:0.68rem; font-weight:700; padding:4px 9px; border-radius:6px; background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">
              ${c.status === 'active' ? '● Đang chạy' : c.status === 'paused' ? '❚❚ Tạm dừng' : '✓ Kết thúc'}
            </span>
          </div>

          <!-- 4 Stat Boxes -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px;">
            <div style="background:rgba(255,255,255,0.03); border-radius:10px; padding:8px 10px; border:1px solid var(--border-color);">
              <div style="font-size:0.65rem; color:var(--text-muted);">Ngân sách dự kiến</div>
              <div style="font-weight:800; font-size:0.88rem; color:var(--primary);">${fmt.currency(c.budget)}</div>
            </div>
            <div style="background:rgba(239,68,68,0.06); border-radius:10px; padding:8px 10px; border:1px solid rgba(239,68,68,0.25);">
              <div style="font-size:0.65rem; color:#EF4444; font-weight:600;">Tổng chi thực tế (Spent)</div>
              <div style="font-weight:800; font-size:0.88rem; color:#EF4444;">${fmt.currency(totalSpent)}</div>
            </div>
            <div style="background:rgba(16,185,129,0.06); border-radius:10px; padding:8px 10px; border:1px solid rgba(16,185,129,0.25);">
              <div style="font-size:0.65rem; color:#10B981; font-weight:600;">Số Leads Tự Động Thống Kê</div>
              <div style="font-weight:800; font-size:0.88rem; color:#10B981;">${leadsCount} Leads</div>
            </div>
            <div style="background:rgba(59,130,246,0.06); border-radius:10px; padding:8px 10px; border:1px solid rgba(59,130,246,0.25);">
              <div style="font-size:0.65rem; color:#3B82F6; font-weight:600;">Chi Phí / Lead (CPL)</div>
              <div style="font-weight:800; font-size:0.88rem; color:#3B82F6;">${fmt.currency(cpl)}</div>
            </div>
          </div>
        </div>

        <!-- Section 1: Daily Spend Logger -->
        ${canEdit ? `
          <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:12px;">
            <div style="font-size:0.82rem; font-weight:800; color:#F59E0B; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-coins"></i> CẬP NHẬT CHI TIÊU ADS HÀNG NGÀY
            </div>
            <form id="cdriver-spend-form" style="display:flex; flex-direction:column; gap:8px;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div>
                  <label class="form-label" style="font-size:0.68rem;">Ngày Chi Tiêu</label>
                  <input type="date" id="cds-date" class="form-input" value="${todayStr}" style="font-size:0.75rem; padding:6px 8px;" required>
                </div>
                <div>
                  <label class="form-label" style="font-size:0.68rem;">Số Tiền Chi Hôm Nay (VNĐ) *</label>
                  <input type="text" inputmode="numeric" id="cds-amount" class="form-input" placeholder="Ví dụ: 500.000" style="font-size:0.75rem; padding:6px 8px;" required>
                </div>
              </div>
              <div>
                <label class="form-label" style="font-size:0.68rem;">Ghi Chú Nhanh</label>
                <input type="text" id="cds-note" class="form-input" placeholder="Ví dụ: Tiêu Ads hôm nay" style="font-size:0.75rem; padding:6px 8px;">
              </div>
              <button type="submit" style="background:#F59E0B; color:#fff; border:none; padding:8px 12px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:2px;">
                <i class="fas fa-plus-circle"></i> + Lưu Khoản Chi Tiêu Này
              </button>
            </form>

            ${logs.length > 0 ? `
              <div style="margin-top:10px; border-top:1px solid rgba(245,158,11,0.2); padding-top:8px;">
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary); margin-bottom:6px;">Lịch Sử Chi Tiêu Ads (${logs.length} lượt ghi):</div>
                <div style="display:flex; flex-direction:column; gap:5px; max-height:160px; overflow-y:auto;">
                  ${logs.map(log => `
                    <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                      <div>
                        📅 <strong style="color:#F59E0B;">${fmt.date(log.date)}</strong> — <strong style="color:#EF4444;">${fmt.currency(log.amount)}</strong>
                        ${log.note ? `<div style="font-size:0.65rem; color:var(--text-muted);">${log.note}</div>` : ''}
                      </div>
                      <button class="btn-del-log" data-id="${log.id}" style="background:none; border:none; color:#EF4444; cursor:pointer; padding:3px;" title="Xóa"><i class="fas fa-trash-alt"></i></button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Section 2: Linked Leads List -->
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:12px;">
          <div style="font-size:0.82rem; font-weight:700; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <span>👥 Danh Sách Leads Từ Chiến Dịch Này (${linkedLeads.length})</span>
            <span style="font-size:0.68rem; color:#10B981; font-weight:700;">Tự Động Đếm</span>
          </div>
          ${linkedLeads.length === 0 ? `
            <div class="empty-state" style="padding:14px;">
              <i class="fas fa-user-plus"></i>
              <p style="font-size:0.75rem;">Chưa có Lead nào gắn với chiến dịch này.<br>Hãy chọn chiến dịch này ở ô Nguồn Quảng Cáo khi tạo Khách Hàng Mới.</p>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">
              ${linkedLeads.map(l => {
                const stg = LEAD_STAGES.find(s => s.id === l.stage) || LEAD_STAGES[0];
                const assignee = DB.getUserById(l.assignedTo);
                return `
                  <div class="drawer-lead-item" data-id="${l.id}" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-left:3px solid ${stg.color}; border-radius:8px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" title="Bấm để xem chi tiết khách hàng">
                    <div>
                      <strong style="font-size:0.8rem; color:var(--text-primary);">${l.name}</strong>
                      <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">
                        📞 ${l.phone || 'Chưa có SĐT'} ${assignee ? `· 👔 Sale: ${assignee.name}` : ''} · ${fmt.timeAgo(l.createdAt)}
                      </div>
                    </div>
                    <span style="font-size:0.62rem; font-weight:700; padding:2px 6px; border-radius:4px; background:${stg.color}22; color:${stg.color}; border:1px solid ${stg.color}44;">${stg.label}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    const modal = Modal.create(`Chi Tiết Chiến Dịch - ${c.name}`, html);

    const amountInput = document.getElementById('cds-amount');
    amountInput?.addEventListener('input', () => {
      const raw = amountInput.value.replace(/\D/g, '');
      amountInput.value = raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '';
    });

    document.getElementById('cdriver-spend-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawAmt = amountInput.value.replace(/\D/g, '');
      const amount = parseInt(rawAmt, 10) || 0;
      if (amount <= 0) {
        Toast.error('Vui lòng nhập số tiền chi tiêu hợp lệ!');
        return;
      }
      DB.addCampaignDailyLog(campaignId, {
        date: document.getElementById('cds-date').value,
        amount,
        note: document.getElementById('cds-note').value
      }, user.id);

      Toast.success(`Đã lưu chi tiêu ${fmt.currency(amount)}!`);
      modal.close();
      if (onSave) onSave();
      this.openCampaignDrawer(campaignId, user, onSave);
    });

    modal.getContainer()?.querySelectorAll('.btn-del-log').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const logId = btn.getAttribute('data-id');
        DB.deleteCampaignDailyLog(campaignId, logId);
        Toast.success('Đã xóa lượt ghi chi tiêu.');
        modal.close();
        if (onSave) onSave();
        this.openCampaignDrawer(campaignId, user, onSave);
      });
    });

    modal.getContainer()?.querySelectorAll('.drawer-lead-item').forEach(item => {
      item.addEventListener('click', () => {
        const leadId = item.getAttribute('data-id');
        modal.close();
        this.openLeadDrawer(leadId, user);
      });
    });
  },

  // ══════════════════════════════════════════════════════
  //  7. APPOINTMENTS
  // ══════════════════════════════════════════════════════
  renderAppointments(user, filterStaffId = 'all') {
    this._setActiveNav('appointments');
    const body = this._getBody();
    const allUserAppointments = DB.getAppointments(user.id, user.role);

    let appointments = allUserAppointments;
    if (user.role === 'manager' && filterStaffId !== 'all') {
      appointments = allUserAppointments.filter(a => a.assignedTo === filterStaffId || a.createdBy === filterStaffId);
    }

    const now = new Date();

    const pending = appointments.filter(a => a.status === 'pending').sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    const done = appointments.filter(a => a.status !== 'pending').sort((a, b) => new Date(b.datetime) - new Date(a.datetime)).slice(0, 20);

    body.innerHTML = `
      <div class="page-content fade-in">
        <div class="page-title-row">
          <h2 class="page-title"><i class="fas fa-calendar-alt"></i> Lịch Hẹn</h2>
          <button class="btn-primary btn-sm" id="btn-new-apt"><i class="fas fa-plus"></i> Thêm Lịch Hẹn</button>
        </div>

        ${user.role === 'manager' ? `
          <!-- Staff Filter Dropdown for Admin -->
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:10px 14px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="font-size:0.8rem; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:6px;">
              <i class="fas fa-filter"></i> Lọc Lịch Hẹn Theo Nhân Viên:
            </div>
            <select id="apt-staff-filter" class="form-select" style="width:auto; min-width:200px; padding:6px 12px; font-size:0.8rem; font-weight:700; border-color:var(--primary);">
              <option value="all" ${filterStaffId === 'all' ? 'selected' : ''}>👥 Tất Cả Nhân Sự (${allUserAppointments.length})</option>
              ${DB.getUsers().map(u => {
                const cnt = allUserAppointments.filter(a => a.assignedTo === u.id || a.createdBy === u.id).length;
                return `<option value="${u.id}" ${filterStaffId === u.id ? 'selected' : ''}>👤 ${u.name} (${roleLabel(u.role)}) — ${cnt} lịch hẹn</option>`;
              }).join('')}
            </select>
          </div>
        ` : ''}

        <!-- Pending Section -->
        <div class="section-card">
          <div class="section-header"><i class="fas fa-bell" style="color:var(--primary);"></i><span>Sắp Tới (${pending.length})</span></div>
          ${pending.length === 0 ? `<div class="empty-state" style="padding:16px;"><i class="fas fa-calendar-check"></i><p>Không có lịch hẹn sắp tới${filterStaffId !== 'all' ? ' của nhân viên này' : ''}.</p></div>` :
        pending.map(a => {
          const cd = getCountdownInfo(a.datetime);
          const aptOwner = DB.getUserById(a.assignedTo || a.createdBy);
          return `
                <div class="list-item apt-item" data-id="${a.id}" style="margin-top:8px; border-left:4px solid ${cd.color}; padding:11px 14px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <div style="flex:1; min-width:0;">
                    <!-- PROMINENT BIG BOLD CUSTOMER NAME -->
                    <div style="font-size:0.98rem; font-weight:800; color:var(--primary); display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                      <i class="fas fa-user-circle" style="font-size:0.95rem;"></i> ${a.leadName || 'Khách Hàng'}
                    </div>
                    <div style="font-size:0.82rem; font-weight:600; color:var(--text-primary);">${a.title}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px; display:flex; gap:8px; flex-wrap:wrap;">
                      ${aptOwner ? `<span><i class="fas fa-user-tie"></i> Sale phụ trách: <strong style="color:var(--text-secondary);">${aptOwner.name}</strong></span>` : ''}
                      <span><i class="fas fa-clock"></i> ${fmt.datetime(a.datetime)}</span>
                    </div>
                    ${a.note ? `<div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">${a.note}</div>` : ''}
                  </div>
                  <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; flex-shrink:0;">
                    <div style="background:${cd.bg}; border:1.5px solid ${cd.border}; color:${cd.color}; padding:5px 10px; border-radius:8px; text-align:center; font-weight:800; font-size:0.75rem; white-space:nowrap; box-shadow:0 2px 8px ${cd.color}22;">
                      ${cd.icon} ${cd.label}
                    </div>
                    <div style="display:flex; gap:4px;">
                      <button class="apt-done-btn" data-id="${a.id}" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#10B981; font-size:0.7rem; font-weight:700; padding:4px 9px; border-radius:6px; cursor:pointer; white-space:nowrap;"><i class="fas fa-check"></i> Xong</button>
                      <button class="apt-delete-btn" data-id="${a.id}" style="background:none; border:none; color:var(--status-rejected); font-size:0.75rem; cursor:pointer; padding:3px 5px;"><i class="fas fa-times"></i></button>
                    </div>
                  </div>
                </div>
              `;
        }).join('')
      }
        </div>

        <!-- History Section -->
        ${done.length > 0 ? `
        <div class="section-card">
          <div class="section-header"><i class="fas fa-history" style="color:var(--text-muted);"></i><span style="color:var(--text-muted);">Lịch Sử Hoàn Thành / Hủy (${done.length})</span></div>
          ${done.map(a => {
            const completedUser = a.completedBy ? DB.getUserById(a.completedBy) : null;
            const aptOwner = DB.getUserById(a.assignedTo || a.createdBy);
            return `
              <div class="list-item" style="margin-top:6px; opacity:0.88; background:rgba(255,255,255,0.02);">
                <div style="flex:1; min-width:0;">
                  <div style="font-size:0.78rem; font-weight:600; color:var(--text-secondary); text-decoration:${a.status === 'done' ? 'line-through' : 'none'};">${a.title}</div>
                  <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">
                    📅 Thời gian hẹn: ${fmt.datetime(a.datetime)} ${a.leadName ? `· 👤 Khách: ${a.leadName}` : ''} ${aptOwner ? `· 💼 Sale: ${aptOwner.name}` : ''}
                  </div>
                  ${a.completedAt ? `
                    <div style="font-size:0.65rem; color:${a.status === 'done' ? '#10B981' : '#EF4444'}; margin-top:3px; font-weight:600;">
                      <i class="fas ${a.status === 'done' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${a.status === 'done' ? 'Thao tác Xong' : 'Thao tác Hủy'} lúc: <strong>${fmt.datetime(a.completedAt)}</strong> (${fmt.timeAgo(a.completedAt)}) ${completedUser ? `bởi ${completedUser.name}` : ''}
                    </div>
                  ` : ''}
                </div>
                <span style="font-size:0.62rem; padding:3px 7px; border-radius:5px; background:${a.status === 'done' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${a.status === 'done' ? '#10B981' : '#EF4444'}; border:1px solid ${a.status === 'done' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; white-space:nowrap;">${a.status === 'done' ? '✓ Đã Hoàn Thành' : '✗ Đã Hủy'}</span>
              </div>
            `;
          }).join('')}
        </div>
        ` : ''}
      </div>
    `;

    document.getElementById('btn-new-apt')?.addEventListener('click', () => this.openAppointmentForm(null, user, () => this.renderAppointments(user, filterStaffId)));
    
    // Staff filter listener for Admin
    document.getElementById('apt-staff-filter')?.addEventListener('change', (e) => {
      this.renderAppointments(user, e.target.value);
    });

    body.querySelectorAll('.apt-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.apt-done-btn') || e.target.closest('.apt-delete-btn')) return;
        const id = item.getAttribute('data-id');
        this.openAppointmentDrawer(id, user, () => this.renderAppointments(user, filterStaffId));
      });
    });

    body.querySelectorAll('.apt-done-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        DB.updateAppointment(id, { status: 'done' }, user.id);
        Toast.success('Đánh dấu hoàn thành!');
        this.renderAppointments(user, filterStaffId);
      });
    });
    body.querySelectorAll('.apt-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.confirmDelete('Hủy / Xóa Lịch Hẹn', 'Bạn có chắc chắn muốn xóa/hủy lịch hẹn này không?', () => {
          DB.updateAppointment(id, { status: 'cancelled' }, user.id);
          Toast.success('Đã hủy lịch hẹn.');
          this.renderAppointments(user, filterStaffId);
        });
      });
    });
  },

  openAppointmentDrawer(aptId, user, onUpdate) {
    const apt = DB.getAppointment(aptId);
    if (!apt) return;
    const cd = getCountdownInfo(apt.datetime);
    const aptOwner = DB.getUserById(apt.assignedTo || apt.createdBy);
    const lead = apt.leadId ? DB.getLead(apt.leadId) : null;
    const completedUser = apt.completedBy ? DB.getUserById(apt.completedBy) : null;
    const canEdit = user.role === 'manager' || apt.assignedTo === user.id || apt.createdBy === user.id;

    const html = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <!-- Header Card with Countdown -->
        <div style="background:rgba(197,168,128,0.08); border:1px solid rgba(197,168,128,0.25); border-radius:12px; padding:14px;">
          <div style="font-size:1.05rem; font-weight:800; color:var(--primary); display:flex; align-items:center; gap:8px;">
            <i class="fas fa-user-circle" style="font-size:1.1rem;"></i> ${apt.leadName || (lead ? lead.name : 'Khách Hàng')}
          </div>
          <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary); margin-top:4px;">
            📌 ${apt.title}
          </div>
          <div style="margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
            <div style="font-size:0.75rem; color:var(--text-muted);">
              <i class="fas fa-clock" style="color:var(--primary);"></i> ${fmt.datetime(apt.datetime)}
            </div>
            <div style="background:${cd.bg}; border:1.5px solid ${cd.border}; color:${cd.color}; padding:4px 10px; border-radius:8px; font-weight:800; font-size:0.75rem;">
              ${cd.icon} ${cd.label}
            </div>
          </div>
        </div>

        <!-- Detail Grid -->
        <div class="info-grid">
          <div>
            <span style="color:var(--text-muted); font-size:0.7rem;">Sale phụ trách</span>
            <div style="font-weight:700; color:var(--text-primary);">${aptOwner ? aptOwner.name : 'Chưa giao'}</div>
          </div>
          <div>
            <span style="color:var(--text-muted); font-size:0.7rem;">Trạng Thái</span>
            <div style="font-weight:700; color:${apt.status === 'done' ? '#10B981' : apt.status === 'cancelled' ? '#EF4444' : '#F59E0B'};">
              ${apt.status === 'done' ? '✓ Đã Hoàn Thành' : apt.status === 'cancelled' ? '✗ Đã Hủy' : '⏳ Chưa Diễn Ra'}
            </div>
          </div>
          ${lead ? `
            <div style="grid-column:span 2; background:rgba(0,0,0,0.18); padding:8px 10px; border-radius:8px; border:1px solid var(--border-color);">
              <span style="color:var(--text-muted); font-size:0.7rem;">Thông tin Khách Hàng (Lead)</span>
              <div style="font-weight:600; font-size:0.78rem; display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:2px;">
                <span>📞 ${lead.phone || 'Chưa có SĐT'} ${lead.address ? `· 📍 ${lead.address}` : ''}</span>
                <button id="btn-goto-lead" style="background:rgba(197,168,128,0.15); border:1px solid rgba(197,168,128,0.3); color:var(--primary); font-size:0.7rem; font-weight:600; padding:3px 8px; border-radius:6px; cursor:pointer; flex-shrink:0;"><i class="fas fa-external-link-alt"></i> Xem Lead</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Note Section -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--primary); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <i class="fas fa-sticky-note"></i> Ghi Chú Lịch Hẹn:
          </div>
          <div style="font-size:0.84rem; color:var(--text-primary); line-height:1.5; white-space:pre-wrap;">${apt.note ? apt.note : '<em style="color:var(--text-muted); font-size:0.78rem;">(Không có ghi chú nào cho lịch hẹn này)</em>'}</div>
        </div>

        ${apt.completedAt ? `
          <div style="font-size:0.7rem; color:${apt.status === 'done' ? '#10B981' : '#EF4444'}; background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:8px;">
            <i class="fas ${apt.status === 'done' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${apt.status === 'done' ? 'Đã hoàn thành' : 'Đã hủy'} lúc: <strong>${fmt.datetime(apt.completedAt)}</strong> (${fmt.timeAgo(apt.completedAt)}) ${completedUser ? `bởi ${completedUser.name}` : ''}
          </div>
        ` : ''}

        ${canEdit ? `
          <!-- Actions Row -->
          <div style="display:flex; gap:8px; margin-top:6px; border-top:1px solid var(--border-color); padding-top:12px;">
            ${apt.status === 'pending' ? `
              <button id="drawer-apt-done-btn" class="btn-primary" style="flex:1; background:#10B981; border-color:#10B981; font-size:0.8rem;"><i class="fas fa-check"></i> Đánh Dấu Hoàn Thành</button>
            ` : ''}
            <button id="drawer-apt-edit-btn" style="flex:1; background:rgba(197,168,128,0.12); border:1px solid rgba(197,168,128,0.3); color:var(--primary); border-radius:10px; padding:9px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;"><i class="fas fa-edit"></i> Sửa Lịch Hẹn</button>
            <button id="drawer-apt-delete-btn" style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#EF4444; border-radius:10px; padding:9px 12px; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Hủy / Xóa"><i class="fas fa-trash-alt"></i></button>
          </div>
        ` : ''}
      </div>
    `;

    const modal = Modal.create(`Chi Tiết Lịch Hẹn`, html);

    document.getElementById('btn-goto-lead')?.addEventListener('click', () => {
      modal.close();
      if (lead) this.openLeadDrawer(lead.id, user);
    });

    if (canEdit) {
      document.getElementById('drawer-apt-done-btn')?.addEventListener('click', () => {
        DB.updateAppointment(aptId, { status: 'done' }, user.id);
        Toast.success('Đã đánh dấu hoàn thành!');
        modal.close();
        if (onUpdate) onUpdate();
      });

      document.getElementById('drawer-apt-edit-btn')?.addEventListener('click', () => {
        modal.close();
        this.openAppointmentForm(aptId, user, onUpdate);
      });

      document.getElementById('drawer-apt-delete-btn')?.addEventListener('click', () => {
        this.confirmDelete('Hủy Lịch Hẹn', 'Bạn có chắc chắn muốn hủy lịch hẹn này?', () => {
          DB.updateAppointment(aptId, { status: 'cancelled' }, user.id);
          Toast.success('Đã hủy lịch hẹn.');
          modal.close();
          if (onUpdate) onUpdate();
        });
      });
    }
  },

  openAppointmentForm(aptId, user, onSave, prefilledLead = null) {
    const apt = aptId ? DB.getAppointment(aptId) : null;
    const leads = DB.getLeads(user.id, user.role).filter(l => l.stage !== 'lost');
    if (prefilledLead && !leads.some(l => l.id === prefilledLead.id)) {
      leads.unshift(prefilledLead);
    }

    const defaultTitle = apt?.title || (prefilledLead ? `Gặp tư vấn: ${prefilledLead.name}` : '');
    const selectedLeadId = apt?.leadId || prefilledLead?.id || '';

    const html = `
      <form id="apt-form" style="display:flex; flex-direction:column; gap:12px;">
        <div><label class="form-label">Tiêu Đề Lịch Hẹn *</label><input type="text" id="af-title" class="form-input" value="${defaultTitle}" placeholder="Ví dụ: Gặp trực tiếp ký hợp đồng" required></div>
        <div>
          <label class="form-label">Khách Hàng (Lead)</label>
          <select id="af-lead" class="form-select">
            <option value="">-- Không gắn với lead nào --</option>
            ${leads.map(l => {
              const isWon = l.stage === 'won';
              return `<option value="${l.id}" data-name="${l.name}" ${selectedLeadId === l.id ? 'selected' : ''}>${l.name} (${l.phone || '—'})${isWon ? ' [Chốt Hợp Đồng ✅]' : ''}</option>`;
            }).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Ngày & Giờ Hẹn *</label>
          <input type="datetime-local" id="af-datetime" class="form-input" value="${apt?.datetime?.slice(0, 16) || ''}" required>
          <div id="af-countdown" style="margin-top:8px; border-radius:10px; padding:10px 14px; display:none; align-items:center; gap:10px; font-weight:700; font-size:0.92rem; transition:all 0.3s;">
            <span id="af-countdown-icon" style="font-size:1.2rem;"></span>
            <span id="af-countdown-text"></span>
          </div>
        </div>
        <div><label class="form-label">Ghi Chú Chi Tiết</label><textarea id="af-note" class="form-textarea" style="height:60px;" placeholder="Ví dụ: Mang theo mẫu chất liệu bọc da">${apt?.note || ''}</textarea></div>
        <button type="submit" class="btn-primary">${apt ? 'Lưu Thay Đổi' : 'Tạo Lịch Hẹn'}</button>
      </form>
    `;

    const modal = Modal.create(apt ? 'Chỉnh Sửa Lịch Hẹn' : 'Đặt Lịch Hẹn Mới', html);

    // Live countdown logic
    const updateCountdown = () => {
      const val = document.getElementById('af-datetime')?.value;
      const box = document.getElementById('af-countdown');
      const icon = document.getElementById('af-countdown-icon');
      const text = document.getElementById('af-countdown-text');
      if (!box || !icon || !text || !val) { if (box) box.style.display = 'none'; return; }

      const now = new Date();
      const target = new Date(val);
      const diffMs = target - now;

      if (diffMs <= 0) {
        box.style.display = 'flex';
        box.style.background = 'rgba(239,68,68,0.15)';
        box.style.border = '1px solid rgba(239,68,68,0.4)';
        box.style.color = '#EF4444';
        icon.textContent = '⛔';
        text.textContent = 'Lịch hẹn đã qua!';
        return;
      }

      const totalHours = diffMs / (1000 * 60 * 60);
      const days = Math.floor(totalHours / 24);
      const hours = Math.floor(totalHours % 24);
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let label = '';
      if (days === 0) label = `Còn ${hours} giờ ${mins} phút`;
      else if (days === 1) label = `Ngày mai — còn ${hours} giờ ${mins} phút`;
      else label = `Còn ${days} ngày ${hours} giờ`;

      box.style.display = 'flex';

      if (days === 0) {
        // Hôm nay — ĐỎ
        box.style.background = 'rgba(239,68,68,0.15)';
        box.style.border = '1px solid rgba(239,68,68,0.5)';
        box.style.color = '#EF4444';
        icon.textContent = '🔴';
      } else if (days === 1) {
        // Ngày mai — VÀNG
        box.style.background = 'rgba(245,158,11,0.15)';
        box.style.border = '1px solid rgba(245,158,11,0.5)';
        box.style.color = '#F59E0B';
        icon.textContent = '🟡';
      } else {
        // Còn xa — XANH
        box.style.background = 'rgba(16,185,129,0.12)';
        box.style.border = '1px solid rgba(16,185,129,0.4)';
        box.style.color = '#10B981';
        icon.textContent = '🟢';
      }
      text.textContent = label;
    };

    document.getElementById('af-datetime')?.addEventListener('input', updateCountdown);
    updateCountdown(); // init if editing existing

    document.getElementById('apt-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const leadSel = document.getElementById('af-lead');
      const leadOpt = leadSel.options[leadSel.selectedIndex];
      const targetLeadId = leadSel.value;
      const data = {
        title: document.getElementById('af-title').value,
        leadId: targetLeadId,
        leadName: leadOpt && targetLeadId ? leadOpt.getAttribute('data-name') : '',
        datetime: document.getElementById('af-datetime').value,
        note: document.getElementById('af-note').value,
        assignedTo: user.id
      };
      if (apt) {
        DB.updateAppointment(aptId, data);
        Toast.success('Đã cập nhật lịch hẹn.');
      } else {
        DB.createAppointment(data, user.id);
        if (targetLeadId) {
          const lead = DB.getLead(targetLeadId);
          if (lead) {
            lead.history = lead.history || [];
            lead.history.push({
              timestamp: new Date().toISOString(),
              action: `📅 Đặt lịch hẹn: ${data.title} (${fmt.datetime(data.datetime)})`,
              user: user.name
            });
            DB.save(DB.load());
          }
        }
        Toast.success('Đã tạo lịch hẹn mới!');
      }
      modal.close();
      if (onSave) onSave();
    });
  },

  // ══════════════════════════════════════════════════════
  //  8. PORTFOLIO
  // ══════════════════════════════════════════════════════
  renderPortfolio(user) {
    this._setActiveNav('portfolio');
    const body = this._getBody();
    const portfolio = DB.getPortfolio();
    const canEdit = user.role === 'marketing' || user.role === 'manager';
    const [filterCat, setFilterCat] = ['all', null];
    let currentFilter = 'all';

    const render = (cat) => {
      currentFilter = cat;
      const filtered = cat === 'all' ? portfolio : portfolio.filter(p => p.category === cat);
      const listEl = document.getElementById('portfolio-grid');
      if (!listEl) return;
      listEl.innerHTML = filtered.length === 0 ? `<div class="empty-state" style="grid-column:span 2;"><i class="fas fa-images"></i><p>Chưa có công trình nào${cat !== 'all' ? ' trong danh mục này' : ''}.</p></div>` :
        filtered.map(p => {
          const cat2 = PORTFOLIO_CATEGORIES.find(c => c.id === p.category);
          return `
            <div class="portfolio-item" data-id="${p.id}">
              ${p.photos && p.photos[0] ? `<div style="height:120px; overflow:hidden; border-radius:10px; margin-bottom:8px; background:rgba(255,255,255,0.03);"><img src="${p.photos[0]}" style="width:100%;height:100%;object-fit:cover;cursor:zoom-in;" onclick="event.stopPropagation();showPhotoLightbox('${p.photos[0]}')"></div>` : `<div style="height:80px; border-radius:10px; background:rgba(255,255,255,0.03); display:flex;align-items:center;justify-content:center;margin-bottom:8px;"><i class="fas fa-image" style="font-size:1.5rem;color:var(--text-muted);opacity:0.4;"></i></div>`}
              <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:3px;">${p.name}</div>
              <div style="font-size:0.65rem; color:var(--text-muted);">${cat2 ? cat2.label : ''} ${p.completedDate ? `· ${p.completedDate}` : ''}</div>
              ${p.highlight ? `<span style="font-size:0.6rem; margin-top:4px; display:inline-block; padding:2px 6px; border-radius:4px; background:rgba(197,168,128,0.12); color:var(--primary); border:1px solid rgba(197,168,128,0.25);">★ Nổi bật</span>` : ''}
              ${canEdit ? `
                <div style="display:flex; gap:4px; margin-top:6px;">
                  <button class="port-edit-btn" data-id="${p.id}" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:0.75rem;padding:2px 5px;"><i class="fas fa-edit"></i></button>
                  <button class="port-delete-btn" data-id="${p.id}" style="background:none;border:none;color:var(--status-rejected);cursor:pointer;font-size:0.75rem;padding:2px 5px;"><i class="fas fa-trash-alt"></i></button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

      if (canEdit) {
        listEl.querySelectorAll('.port-edit-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); this.openPortfolioForm(btn.getAttribute('data-id'), () => render(currentFilter)); }));
        listEl.querySelectorAll('.port-delete-btn').forEach(btn => btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const p = DB.getPortfolio().find(x => x.id === id);
          this.confirmDelete('Xóa Công Trình Portfolio', `Bạn có chắc chắn muốn xóa công trình "${p?.name || 'này'}"?`, () => {
            DB.deletePortfolioItem(id);
            Toast.success('Đã xóa công trình.');
            render(currentFilter);
          });
        }));
      }
    };

    body.innerHTML = `
      <div class="page-content fade-in">
        <div class="page-title-row">
          <h2 class="page-title"><i class="fas fa-images"></i> Portfolio</h2>
          ${canEdit ? `<button class="btn-primary btn-sm" id="btn-new-portfolio"><i class="fas fa-plus"></i> Thêm</button>` : ''}
        </div>
        <div class="stage-filter-bar" style="margin-bottom:12px;">
          <button class="stage-filter-btn active" data-cat="all">Tất Cả (${portfolio.length})</button>
          ${PORTFOLIO_CATEGORIES.map(c => { const cnt = portfolio.filter(p => p.category === c.id).length; return cnt > 0 ? `<button class="stage-filter-btn" data-cat="${c.id}"><i class="fas ${c.icon}"></i> ${c.label} (${cnt})</button>` : ''; }).join('')}
        </div>
        <div id="portfolio-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;"></div>
      </div>
    `;

    render('all');

    body.querySelectorAll('.stage-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        body.querySelectorAll('.stage-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render(btn.getAttribute('data-cat'));
      });
    });
    if (canEdit) document.getElementById('btn-new-portfolio')?.addEventListener('click', () => this.openPortfolioForm(null, () => { this.renderPortfolio(user); }));
  },

  openPortfolioForm(itemId, onSave) {
    const item = itemId ? DB.getPortfolio().find(p => p.id === itemId) : null;
    const isEdit = !!item;
    const html = `
      <form id="port-form" style="display:flex; flex-direction:column; gap:12px;">
        <div><label class="form-label">Tên Công Trình *</label><input type="text" id="pf-name" class="form-input" value="${item?.name || ''}" required></div>
        <div><label class="form-label">Danh Mục</label><select id="pf-cat" class="form-select">${PORTFOLIO_CATEGORIES.map(c => `<option value="${c.id}" ${item?.category === c.id ? 'selected' : ''}><i class="fas ${c.icon}"></i> ${c.label}</option>`).join('')}</select></div>
        <div><label class="form-label">Tháng/Năm Hoàn Thành</label><input type="month" id="pf-date" class="form-input" value="${item?.completedDate || ''}"></div>
        <div>
          <label class="form-label">Link Ảnh (mỗi link 1 dòng)</label>
          <textarea id="pf-photos" class="form-textarea" style="height:80px;">${(item?.photos || []).join('\n')}</textarea>
        </div>
        <div><label class="form-label">Mô Tả</label><textarea id="pf-desc" class="form-textarea" style="height:60px;">${item?.description || ''}</textarea></div>
        <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; cursor:pointer;"><input type="checkbox" id="pf-highlight" ${item?.highlight ? 'checked' : ''} style="accent-color:var(--primary);"> Đánh dấu Nổi Bật ★</label>
        <button type="submit" class="btn-primary">${isEdit ? 'Lưu Thay Đổi' : 'Thêm Công Trình'}</button>
      </form>
    `;
    const modal = Modal.create(isEdit ? 'Chỉnh Sửa Công Trình' : 'Thêm Công Trình Portfolio', html);
    document.getElementById('port-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const photos = document.getElementById('pf-photos').value.split('\n').map(s => s.trim()).filter(Boolean);
      const data = {
        name: document.getElementById('pf-name').value,
        category: document.getElementById('pf-cat').value,
        completedDate: document.getElementById('pf-date').value,
        photos,
        description: document.getElementById('pf-desc').value,
        highlight: document.getElementById('pf-highlight').checked
      };
      if (isEdit) { DB.updatePortfolioItem(itemId, data); Toast.success('Đã cập nhật.'); }
      else { DB.createPortfolioItem(data); Toast.success('Đã thêm công trình.'); }
      modal.close();
      if (onSave) onSave();
    });
  },

  // ══════════════════════════════════════════════════════
  //  9. KPI REPORT
  // ══════════════════════════════════════════════════════
  renderKPI(user) {
    this._setActiveNav('kpi');
    const body = this._getBody();
    const analytics = DB.getAnalytics(user.id, user.role);
    const leads = DB.getLeads(user.id, user.role);
    const campaigns = DB.getCampaigns();

    // Source breakdown
    const sourceData = LEAD_SOURCES.map(s => ({
      ...s,
      count: leads.filter(l => l.source === s.id).length
    })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

    const maxSourceCount = Math.max(...sourceData.map(s => s.count), 1);

    body.innerHTML = `
      <div class="page-content fade-in">
        <div class="page-title-row">
          <h2 class="page-title"><i class="fas fa-chart-bar"></i> Báo Cáo KPI</h2>
        </div>

        <!-- Main KPI -->
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-icon" style="background:rgba(197,168,128,0.15);color:var(--primary);"><i class="fas fa-user-friends"></i></div><div class="kpi-body"><div class="kpi-val">${analytics.totalLeads}</div><div class="kpi-label">Tổng Leads</div><div class="kpi-sub">+${analytics.leadsThisMonth} tháng này</div></div></div>
          <div class="kpi-card"><div class="kpi-icon" style="background:rgba(16,185,129,0.15);color:#10B981;"><i class="fas fa-trophy"></i></div><div class="kpi-body"><div class="kpi-val" style="color:#10B981;">${analytics.winRate}%</div><div class="kpi-label">Tỷ Lệ Chốt</div><div class="kpi-sub">${analytics.wonLeads}W / ${analytics.lostLeads}L</div></div></div>
          <div class="kpi-card"><div class="kpi-icon" style="background:rgba(59,130,246,0.15);color:#3B82F6;"><i class="fas fa-money-bill-wave"></i></div><div class="kpi-body"><div class="kpi-val" style="font-size:1.1rem; color:#3B82F6;">${fmt.currency(analytics.revenueThisMonth)}</div><div class="kpi-label">Doanh Thu Tháng</div><div class="kpi-sub">Tổng: ${fmt.currency(analytics.totalRevenue)}</div></div></div>
          <div class="kpi-card"><div class="kpi-icon" style="background:rgba(245,158,11,0.15);color:#F59E0B;"><i class="fas fa-ad"></i></div><div class="kpi-body"><div class="kpi-val" style="color:#F59E0B;">${fmt.currency(analytics.avgCPL)}</div><div class="kpi-label">CPL Trung Bình</div><div class="kpi-sub">${analytics.activeCampaigns} chiến dịch active</div></div></div>
        </div>

        <!-- Pipeline -->
        <div class="section-card">
          <div class="section-header"><i class="fas fa-filter" style="color:var(--primary);"></i><span>Phân Bổ Leads Theo Giai Đoạn</span></div>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
            ${LEAD_STAGES.map(s => {
      const count = analytics.leadsByStage[s.id] || 0;
      const pct = analytics.totalLeads > 0 ? Math.round(count / analytics.totalLeads * 100) : 0;
      return `
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:10px; height:10px; border-radius:50%; background:${s.color}; flex-shrink:0;"></div>
                  <span style="font-size:0.75rem; color:var(--text-secondary); width:110px; flex-shrink:0;">${s.label}</span>
                  <div style="flex:1; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
                    <div style="height:8px; width:${pct}%; background:${s.color}; border-radius:4px;"></div>
                  </div>
                  <span style="font-size:0.72rem; font-weight:700; color:${s.color}; width:36px; text-align:right;">${count}</span>
                </div>
              `;
    }).join('')}
          </div>
        </div>

        <!-- Source Analysis -->
        ${sourceData.length > 0 ? `
        <div class="section-card">
          <div class="section-header"><i class="fas fa-chart-pie" style="color:var(--primary);"></i><span>Nguồn Leads Hiệu Quả Nhất</span></div>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
            ${sourceData.map(s => {
      const pct = Math.round(s.count / maxSourceCount * 100);
      const winCount = leads.filter(l => l.source === s.id && l.stage === 'won').length;
      const srcWinRate = s.count > 0 ? Math.round(winCount / s.count * 100) : 0;
      return `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.74rem; margin-bottom:4px;">
                    <span style="color:var(--text-secondary);"><i class="fas ${s.icon}" style="color:var(--primary); margin-right:5px;"></i>${s.label}</span>
                    <span style="color:var(--primary); font-weight:700;">${s.count} leads · Chốt ${srcWinRate}%</span>
                  </div>
                  <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                    <div style="height:6px; width:${pct}%; background:linear-gradient(90deg, var(--primary), #C5A880); border-radius:3px;"></div>
                  </div>
                </div>
              `;
    }).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Marketing ROI -->
        ${campaigns.length > 0 ? `
        <div class="section-card">
          <div class="section-header"><i class="fas fa-bullhorn" style="color:var(--primary);"></i><span>Hiệu Quả Marketing</span></div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:10px; text-align:center;">
            <div style="background:rgba(255,255,255,0.03); border-radius:10px; padding:10px; border:1px solid var(--border-color);">
              <div style="font-size:0.62rem; color:var(--text-muted); margin-bottom:4px;">Tổng Chi</div>
              <div style="font-size:0.85rem; font-weight:700; color:#EF4444;">${fmt.currency(analytics.totalCampaignSpent)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); border-radius:10px; padding:10px; border:1px solid var(--border-color);">
              <div style="font-size:0.62rem; color:var(--text-muted); margin-bottom:4px;">Leads từ MKT</div>
              <div style="font-size:0.85rem; font-weight:700; color:#10B981;">${analytics.totalLeadsFromCampaigns}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); border-radius:10px; padding:10px; border:1px solid var(--border-color);">
              <div style="font-size:0.62rem; color:var(--text-muted); margin-bottom:4px;">CPL Trung Bình</div>
              <div style="font-size:0.85rem; font-weight:700; color:var(--primary);">${fmt.currency(analytics.avgCPL)}</div>
            </div>
          </div>
        </div>
        ` : ''}

      </div>
    `;
  },

  // ══════════════════════════════════════════════════════
  //  10. BÁO CÁO KTS & KỸ THUẬT (Nhật Long)
  // ══════════════════════════════════════════════════════
  renderKtsReports(user, filterTaskType = 'all', searchQuery = '') {
    this._setActiveNav('kts_reports');
    const body = this._getBody();
    const allLogs = DB.getKtsLogs();

    // Stats
    const totalLogs = allLogs.length;
    const fastSupportCount = allLogs.filter(l => l.taskType === 'fast_support').length;
    const techDrawCount = allLogs.filter(l => l.taskType === 'technical_draw').length;
    const cncCount = allLogs.filter(l => l.taskType === 'cnc_export').length;

    // Filter logs
    let filteredLogs = allLogs;
    if (filterTaskType !== 'all') {
      filteredLogs = filteredLogs.filter(l => l.taskType === filterTaskType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredLogs = filteredLogs.filter(l => 
        (l.projectName && l.projectName.toLowerCase().includes(q)) ||
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.note && l.note.toLowerCase().includes(q))
      );
    }

    const taskTypeMap = {
      fast_support: { label: '⚡ Vẽ phản ứng nhanh (Hỗ trợ Sale)', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', icon: '⚡' },
      technical_draw: { label: '📐 Vẽ kết cấu chi tiết', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', icon: '📐' },
      cnc_export: { label: '🖨️ Ra file CNC', color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: '🖨️' },
      other: { label: '🛠️ Khác / Phát sinh', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: '🛠️' }
    };

    body.innerHTML = `
      <div class="page-content fade-in">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
          <div>
            <h1 class="page-title"><i class="fas fa-drafting-compass" style="color:var(--primary); margin-right:8px;"></i>Báo Cáo Công Việc KTS</h1>
            <p class="page-subtitle">Quản lý nhật ký bản vẽ hỗ trợ Sale, kết cấu chi tiết và file CNC</p>
          </div>
          <button id="btn-create-kts-report" class="btn-primary" style="padding:10px 18px; font-weight:700; border-radius:10px; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-plus-circle"></i> Báo Cáo Công Việc Mới
          </button>
        </div>

        <!-- Stat Cards -->
        <div class="kpi-grid" style="margin-bottom:20px;">
          <div class="kpi-card">
            <div class="kpi-icon" style="background:rgba(197,168,128,0.15); color:var(--primary);"><i class="fas fa-clipboard-list"></i></div>
            <div class="kpi-body">
              <div class="kpi-val">${totalLogs}</div>
              <div class="kpi-label">Tổng Báo Cáo KTS</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:rgba(139,92,246,0.15); color:#8B5CF6;"><i class="fas fa-bolt"></i></div>
            <div class="kpi-body">
              <div class="kpi-val" style="color:#8B5CF6;">${fastSupportCount}</div>
              <div class="kpi-label">⚡ Vẽ Phản Ứng Nhanh (Sale)</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:rgba(59,130,246,0.15); color:#3B82F6;"><i class="fas fa-ruler-combined"></i></div>
            <div class="kpi-body">
              <div class="kpi-val" style="color:#3B82F6;">${techDrawCount}</div>
              <div class="kpi-label">📐 Vẽ Kết Cấu Chi Tiết</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:rgba(16,185,129,0.15); color:#10B981;"><i class="fas fa-microchip"></i></div>
            <div class="kpi-body">
              <div class="kpi-val" style="color:#10B981;">${cncCount}</div>
              <div class="kpi-label">🖨️ Ra File CNC</div>
            </div>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="section-card" style="margin-bottom:20px; padding:14px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="filter-tab-btn ${filterTaskType === 'all' ? 'active' : ''}" data-type="all">Tất Cả (${totalLogs})</button>
              <button class="filter-tab-btn ${filterTaskType === 'fast_support' ? 'active' : ''}" data-type="fast_support">⚡ Hỗ Trợ Sale (${fastSupportCount})</button>
              <button class="filter-tab-btn ${filterTaskType === 'technical_draw' ? 'active' : ''}" data-type="technical_draw">📐 Kết Cấu (${techDrawCount})</button>
              <button class="filter-tab-btn ${filterTaskType === 'cnc_export' ? 'active' : ''}" data-type="cnc_export">🖨️ File CNC (${cncCount})</button>
            </div>
            <div style="position:relative; width:240px;">
              <input type="text" id="kts-search-input" class="form-input" placeholder="Tìm dự án / nội dung..." value="${searchQuery}" style="padding-left:34px; font-size:0.82rem; height:36px;">
              <i class="fas fa-search" style="position:absolute; left:12px; top:11px; color:var(--text-muted); font-size:0.8rem;"></i>
            </div>
          </div>
        </div>

        <!-- List / Cards -->
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${filteredLogs.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon"><i class="fas fa-drafting-compass"></i></div>
              <h3>Chưa Có Báo Cáo KTS Nào</h3>
              <p>Chưa ghi nhận báo cáo công việc thuộc bộ lọc này.</p>
              <button id="btn-empty-create-kts" class="btn-primary" style="margin-top:12px; padding:8px 16px; font-size:0.85rem;"><i class="fas fa-plus"></i> Tạo Báo Cáo Ngay</button>
            </div>
          ` : filteredLogs.map(log => {
            const meta = taskTypeMap[log.taskType] || taskTypeMap.other;
            const canEdit = user.role === 'manager' || user.id === log.userId;
            return `
              <div class="section-card" style="padding:16px; border-left:4px solid ${meta.color}; position:relative; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
                  <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <span style="background:${meta.bg}; color:${meta.color}; border:1px solid ${meta.color}40; padding:4px 10px; border-radius:8px; font-size:0.75rem; font-weight:700;">
                      ${meta.label}
                    </span>
                    <h3 style="font-size:1.02rem; font-weight:700; color:var(--text-primary); margin:0;">
                      🏢 ${log.projectName}
                    </h3>
                  </div>
                  <div style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:8px;">
                    <span><i class="far fa-calendar-alt"></i> ${fmt.date(log.date)}</span>
                    ${canEdit ? `
                      <button class="btn-edit-kts-log" data-id="${log.id}" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:0.85rem;" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                      <button class="btn-delete-kts-log" data-id="${log.id}" style="background:none; border:none; color:#EF4444; cursor:pointer; font-size:0.85rem;" title="Xóa"><i class="fas fa-trash-alt"></i></button>
                    ` : ''}
                  </div>
                </div>

                <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5; margin-bottom:10px; white-space:pre-line;">
                  ${log.note || 'Không có ghi chú.'}
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; border-top:1px dashed var(--border-color); padding-top:10px; font-size:0.78rem;">
                  <div style="display:flex; align-items:center; gap:12px; color:var(--text-muted);">
                    <span>👤 KTS: <strong style="color:var(--text-primary);">${log.userName}</strong></span>
                    ${log.progress ? `<span style="background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:6px; color:var(--primary); font-weight:600;">📊 Tiến độ: ${log.progress}</span>` : ''}
                  </div>

                  <div style="display:flex; align-items:center; gap:10px;">
                    ${log.attachments ? `
                      <button class="btn-view-kts-img" data-img="${log.attachments}" style="background:rgba(59,130,246,0.15); color:#3B82F6; border:1px solid rgba(59,130,246,0.3); padding:4px 10px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:5px;">
                        <i class="fas fa-image"></i> Xem Ảnh Bản Vẽ
                      </button>
                    ` : ''}
                    ${log.fileLink ? `
                      <a href="${log.fileLink}" target="_blank" style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:6px; text-decoration:none; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:5px;">
                        <i class="fas fa-external-link-alt"></i> Mở Link File (Drive/Zalo)
                      </a>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('btn-create-kts-report')?.addEventListener('click', () => {
      this.openKtsReportForm(null, user, () => this.renderKtsReports(user, filterTaskType, searchQuery));
    });
    document.getElementById('btn-empty-create-kts')?.addEventListener('click', () => {
      this.openKtsReportForm(null, user, () => this.renderKtsReports(user, filterTaskType, searchQuery));
    });

    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        this.renderKtsReports(user, type, searchQuery);
      });
    });

    document.getElementById('kts-search-input')?.addEventListener('input', (e) => {
      this.renderKtsReports(user, filterTaskType, e.target.value);
    });

    document.querySelectorAll('.btn-view-kts-img').forEach(btn => {
      btn.addEventListener('click', () => {
        const img = btn.getAttribute('data-img');
        if (img) showPhotoLightbox(img);
      });
    });

    document.querySelectorAll('.btn-edit-kts-log').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const log = DB.getKtsLogs().find(l => l.id === id);
        if (log) {
          this.openKtsReportForm(log, user, () => this.renderKtsReports(user, filterTaskType, searchQuery));
        }
      });
    });

    document.querySelectorAll('.btn-delete-kts-log').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        Modal.confirm('Xóa Báo Cáo KTS', 'Bạn có chắc chắn muốn xóa báo cáo công việc này?', () => {
          DB.deleteKtsLog(id);
          Toast.success('Đã xóa báo cáo công việc KTS.');
          this.renderKtsReports(user, filterTaskType, searchQuery);
        }, 'danger');
      });
    });
  },

  openKtsReportForm(editData = null, user, onSave = null) {
    const leads = DB.getLeads();
    const isEdit = !!editData;

    const html = `
      <form id="kts-report-form" style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group">
          <label class="form-label">Tên Công Trình / Dự Án <span style="color:#EF4444;">*</span></label>
          <input type="text" id="kts-project-name" class="form-input" list="kts-leads-datalist" placeholder="Nhập hoặc chọn công trình (VD: Căn hộ Chị Mai, Tủ Bếp Chú Cường...)" value="${editData?.projectName || ''}" required>
          <datalist id="kts-leads-datalist">
            ${leads.map(l => `<option value="${l.name} - ${l.interestedIn || 'Nội thất'}"></option>`).join('')}
          </datalist>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Loại Công Việc KTS <span style="color:#EF4444;">*</span></label>
            <select id="kts-task-type" class="form-select" required>
              <option value="fast_support" ${editData?.taskType === 'fast_support' ? 'selected' : ''}>⚡ Vẽ phản ứng nhanh hỗ trợ Sale tư vấn</option>
              <option value="technical_draw" ${editData?.taskType === 'technical_draw' || !editData ? 'selected' : ''}>📐 Vẽ kết cấu chi tiết</option>
              <option value="cnc_export" ${editData?.taskType === 'cnc_export' ? 'selected' : ''}>🖨️ Ra file CNC</option>
              <option value="other" ${editData?.taskType === 'other' ? 'selected' : ''}>🛠️ Khác / Phát sinh</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Ngày Báo Cáo <span style="color:#EF4444;">*</span></label>
            <input type="date" id="kts-date" class="form-input" value="${editData?.date || new Date().toISOString().split('T')[0]}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Tiến Độ / Khối Lượng Hoàn Thành</label>
          <input type="text" id="kts-progress" class="form-input" placeholder="Ví dụ: 100%, Đã vẽ xong 3D, 14 tấm 17mm..." value="${editData?.progress || ''}">
        </div>

        <div class="form-group">
          <label class="form-label">Nội Dung Chi Tiết / Ghi Chú</label>
          <textarea id="kts-note" class="form-textarea" rows="3" placeholder="Mô tả công việc đã xử lý, yêu cầu từ Sale hoặc xưởng...">${editData?.note || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Đính Kèm Ảnh Bản Vẽ / 3D (Nếu có)</label>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="file" id="kts-photo-file" accept="image/*" style="display:none;">
            <button type="button" id="btn-upload-kts-photo" style="background:rgba(255,255,255,0.06); border:1px dashed var(--border-color); color:var(--text-primary); border-radius:8px; padding:10px 14px; font-size:0.82rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-camera" style="color:var(--primary);"></i> Chọn Ảnh Bản Vẽ
            </button>
            <div id="kts-photo-preview" style="display:flex; align-items:center; gap:8px;">
              ${editData?.attachments ? `<img src="${editData.attachments}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid var(--primary);">` : ''}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Đường Dẫn File Dự Án (Google Drive / Zalo / Dropbox)</label>
          <input type="url" id="kts-file-link" class="form-input" placeholder="https://drive.google.com/..." value="${editData?.fileLink || ''}">
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
          <button type="button" class="btn-cancel" id="btn-cancel-kts-form" style="background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid var(--border-color); padding:10px 18px; border-radius:8px; font-weight:600; cursor:pointer;">Hủy</button>
          <button type="submit" class="btn-primary" style="padding:10px 22px; border-radius:8px; font-weight:700;"><i class="fas fa-save"></i> ${isEdit ? 'Cập Nhật' : 'Lưu Báo Cáo'}</button>
        </div>
      </form>
    `;

    const drawer = Modal.create(isEdit ? 'Chỉnh Sửa Báo Cáo KTS' : 'Tạo Báo Cáo Công Việc KTS', html);

    let photoData = editData?.attachments || '';

    const photoInput = document.getElementById('kts-photo-file');
    document.getElementById('btn-upload-kts-photo').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          Toast.info('Đang xử lý ảnh...');
          photoData = await compressImage(e.target.files[0], 1000, 0.75);
          document.getElementById('kts-photo-preview').innerHTML = `<img src="${photoData}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid var(--primary);"><span style="font-size:0.75rem; color:#10B981;">Đã chọn ảnh</span>`;
          Toast.success('Đã tải ảnh bản vẽ.');
        } catch (err) {
          Toast.error('Không thể xử lý ảnh này.');
        }
      }
    });

    document.getElementById('btn-cancel-kts-form').addEventListener('click', () => drawer.close());

    document.getElementById('kts-report-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const projectName = document.getElementById('kts-project-name').value.trim();
      const taskType = document.getElementById('kts-task-type').value;
      const date = document.getElementById('kts-date').value;
      const progress = document.getElementById('kts-progress').value.trim();
      const note = document.getElementById('kts-note').value.trim();
      const fileLink = document.getElementById('kts-file-link').value.trim();

      if (!projectName) {
        Toast.error('Vui lòng nhập tên công trình.');
        return;
      }

      const logPayload = {
        projectName,
        taskType,
        date,
        progress,
        note,
        attachments: photoData,
        fileLink,
        userId: isEdit ? editData.userId : user.id,
        userName: isEdit ? editData.userName : user.name
      };

      if (isEdit) {
        DB.updateKtsLog(editData.id, logPayload);
        Toast.success('Đã cập nhật báo cáo KTS.');
      } else {
        DB.addKtsLog(logPayload);
        Toast.success('Đã thêm báo cáo công việc KTS mới.');
      }

      drawer.close();
      if (onSave) onSave();
    });
  },

  // ── KTS Task Assignment & Management ─────────────────
  openAssignKtsTaskForm(lead, user, onSave = null, editTask = null) {
    const isEdit = !!editTask;
    const ktsUsers = DB.getUsers().filter(u => u.role === 'kts' || u.id === 'usr_long_tran');
    if (ktsUsers.length === 0) {
      ktsUsers.push({ id: 'usr_long_tran', name: 'Trần Hữu Nhật Long', role: 'kts' });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    const toLocalDateTimeValue = (dateValue) => {
      if (!dateValue) return '';
      const date = new Date(dateValue);
      const offset = date.getTimezoneOffset();
      return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
    };
    const defaultDeadlineStr = isEdit
      ? toLocalDateTimeValue(editTask.deadline)
      : toLocalDateTimeValue(tomorrow);

    const html = `
      <form id="assign-kts-task-form" style="display:flex; flex-direction:column; gap:14px;">
        <div style="background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.3); padding:10px 14px; border-radius:10px; font-size:0.82rem;">
          <div style="font-weight:700; color:#8B5CF6;"><i class="fas fa-building"></i> Công trình / Lead: ${lead.name}</div>
          <div style="color:var(--text-secondary); font-size:0.75rem; margin-top:2px;">${lead.interestedIn || 'Nội thất'} ${lead.address ? `· ${lead.address}` : ''}</div>
        </div>

        <div class="form-group">
          <label class="form-label">Chọn KTS / Người Nhận <span style="color:#EF4444;">*</span></label>
          <select id="kts-assign-user" class="form-select" required>
            ${ktsUsers.map(u => `<option value="${u.id}" ${(isEdit ? u.id === editTask.ktsId : u.id === 'usr_long_tran') ? 'selected' : ''}>📐 ${u.name} (${roleLabel(u.role)})</option>`).join('')}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Loại Việc KTS <span style="color:#EF4444;">*</span></label>
            <select id="kts-assign-task-type" class="form-select" required>
              <option value="fast_support" ${isEdit && editTask.taskType === 'fast_support' ? 'selected' : ''}>⚡ Vẽ phản ứng nhanh hỗ trợ Sale tư vấn</option>
              <option value="technical_draw" ${isEdit && editTask.taskType === 'technical_draw' ? 'selected' : ''}>📐 Vẽ kết cấu chi tiết</option>
              <option value="cnc_export" ${isEdit && editTask.taskType === 'cnc_export' ? 'selected' : ''}>🖨️ Xuất file CNC</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Hạn Hoàn Thành (Deadline) <span style="color:#EF4444;">*</span></label>
            <input type="datetime-local" id="kts-assign-deadline" class="form-input" value="${defaultDeadlineStr}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Tên Yêu Cầu / Tên Công Việc <span style="color:#EF4444;">*</span></label>
          <input type="text" id="kts-assign-title" class="form-input" placeholder="Ví dụ: Vẽ 3D phương án bếp màu gỗ phối trắng..." value="${isEdit ? editTask.title : `Vẽ 3D phương án ${lead.interestedIn || 'nội thất'} cho ${lead.name}`}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Chi Tiết Yêu Cầu Cho KTS</label>
          <textarea id="kts-assign-req" class="form-textarea" rows="3" placeholder="Mô tả cụ thể kích thước, màu sắc, vật liệu hoặc yêu cầu từ khách...">${isEdit ? (editTask.requirement || '') : (lead.note ? `Ghi chú từ Lead: ${lead.note}` : '')}</textarea>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
          <button type="button" class="btn-cancel" id="btn-cancel-kts-assign" style="background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid var(--border-color); padding:10px 18px; border-radius:8px; font-weight:600; cursor:pointer;">Hủy</button>
          <button type="submit" class="btn-primary" style="padding:10px 22px; border-radius:8px; font-weight:700; background:linear-gradient(135deg, #8B5CF6, #6366F1);"><i class="fas ${isEdit ? 'fa-save' : 'fa-paper-plane'}"></i> ${isEdit ? 'Lưu Thay Đổi' : 'Giao Việc Ngay'}</button>
        </div>
      </form>
    `;

    const modal = Modal.create(`${isEdit ? '✏️ Sửa Công Việc KTS' : '🚀 Giao Việc Cho KTS'} - ${lead.name}`, html);

    document.getElementById('btn-cancel-kts-assign')?.addEventListener('click', () => modal.close());

    document.getElementById('assign-kts-task-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const ktsId = document.getElementById('kts-assign-user').value;
        const ktsUser = DB.getUserById(ktsId) || { name: 'Trần Hữu Nhật Long' };
        const taskType = document.getElementById('kts-assign-task-type').value;
        const deadline = document.getElementById('kts-assign-deadline').value;
        const title = document.getElementById('kts-assign-title').value.trim();
        const requirement = document.getElementById('kts-assign-req').value.trim();

        if (!title || !deadline) {
          Toast.error('Vui lòng điền tiêu đề và hạn chót hoàn thành.');
          return;
        }

        const taskPayload = {
          leadId: lead.id,
          leadName: lead.name + (lead.interestedIn ? ` - ${lead.interestedIn}` : ''),
          assignerId: isEdit ? editTask.assignerId : user.id,
          assignerName: isEdit ? editTask.assignerName : user.name,
          ktsId: ktsId,
          ktsName: ktsUser.name,
          taskType: taskType,
          title: title,
          requirement: requirement,
          deadline: new Date(deadline).toISOString()
        };

        if (isEdit) {
          DB.updateKtsTask(editTask.id, taskPayload);
          DB.addLeadHistory(lead.id, `✏️ Cập nhật việc KTS (${title}) · KTS: ${ktsUser.name} · Hạn: ${fmt.datetime(deadline)}`, user.name);
          modal.close();
          Toast.success('Đã cập nhật công việc KTS.');
          if (onSave) onSave();
          return;
        }

        DB.addKtsTask(taskPayload);

        DB.addLeadHistory(lead.id, `🚀 Giao việc KTS (${title}) cho ${ktsUser.name} · Hạn: ${fmt.datetime(deadline)}`, user.name);

        modal.close();
        Toast.success(`🚀 Đã giao việc thành công cho KTS ${ktsUser.name}!`);

        const successModal = Modal.create(`🚀 Giao Việc Thành Công!`, `
          <div style="text-align:center; padding:16px 8px;">
            <div style="width:64px; height:64px; border-radius:50%; background:rgba(16,185,129,0.15); border:2.5px solid #10B981; color:#10B981; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; font-size:2rem;">
              <i class="fas fa-check"></i>
            </div>
            <h3 style="color:var(--text-primary); margin-bottom:8px; font-size:1.15rem; font-weight:800;">Đã Giao Việc Thành Công!</h3>
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:16px; text-align:left; font-size:0.82rem;">
              <div style="font-weight:700; color:var(--primary); margin-bottom:4px;"><i class="fas fa-tasks"></i> ${title}</div>
              <div style="color:var(--text-secondary); margin-bottom:2px;"><i class="fas fa-building"></i> Lead: <strong>${lead.name}</strong></div>
              <div style="color:var(--text-secondary); margin-bottom:2px;"><i class="fas fa-user-tag"></i> KTS nhận việc: <strong style="color:#8B5CF6;">${ktsUser.name}</strong></div>
              <div style="color:#F59E0B; font-weight:700; margin-top:6px;"><i class="fas fa-clock"></i> Hạn hoàn thành: ${fmt.datetime(deadline)}</div>
            </div>
            <button id="btn-close-assign-success" class="btn-primary" style="padding:10px 28px; font-weight:700; border-radius:10px; background:linear-gradient(135deg, #10B981, #059669); font-size:0.88rem; cursor:pointer;"><i class="fas fa-check-circle"></i> Đã Hiểu</button>
          </div>
        `);

        document.getElementById('btn-close-assign-success')?.addEventListener('click', () => successModal.close());

        if (onSave) onSave();
      } catch (err) {
        console.error('Error assigning KTS task:', err);
        Toast.error('Đã xảy ra lỗi khi giao việc: ' + err.message);
      }
    });
  },

  renderKtsTasks(user, filterType = 'all') {
    this._setActiveNav('kts_tasks');
    const body = this._getBody();
    const tasks = DB.getKtsTasks(user.id, user.role);

    let filtered = tasks;
    if (filterType === 'fast_support') filtered = tasks.filter(t => t.taskType === 'fast_support');
    else if (filterType === 'technical_draw') filtered = tasks.filter(t => t.taskType === 'technical_draw');
    else if (filterType === 'cnc_export') filtered = tasks.filter(t => t.taskType === 'cnc_export');
    else if (filterType === 'completed') filtered = tasks.filter(t => t.status === 'completed');
    else if (filterType === 'pending') filtered = tasks.filter(t => t.status !== 'completed');

    const getTaskCountdown = (deadlineStr) => {
      if (!deadlineStr) return { label: 'Chưa đặt hạn chót', color: '#64748B', isOverdue: false };
      const d = new Date(deadlineStr);
      const now = new Date();
      const diffMs = d.getTime() - now.getTime();

      if (diffMs <= 0) {
        const overdueMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
        const overdueHours = Math.floor(overdueMinutes / 60);
        const overdueDays = Math.floor(overdueHours / 24);
        let text = overdueDays > 0 ? `${overdueDays}d ${overdueHours % 24}h` : (overdueHours > 0 ? `${overdueHours}h ${overdueMinutes % 60}m` : `${overdueMinutes}m`);
        return { label: `⛔ QUÁ HẠN ${text}`, color: '#EF4444', isOverdue: true };
      }

      const mins = Math.floor(diffMs / (1000 * 60));
      const totalHours = Math.floor(mins / 60);
      const remainingMins = mins % 60;

      const targetYear = d.getFullYear();
      const targetMonth = d.getMonth();
      const targetDate = d.getDate();

      const nowYear = now.getFullYear();
      const nowMonth = now.getMonth();
      const nowDate = now.getDate();

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomYear = tomorrow.getFullYear();
      const tomMonth = tomorrow.getMonth();
      const tomDate = tomorrow.getDate();

      const isToday = (targetYear === nowYear && targetMonth === nowMonth && targetDate === nowDate);
      const isTomorrow = (targetYear === tomYear && targetMonth === tomMonth && targetDate === tomDate);

      if (isToday) {
        return { label: `🔥 HÔM NAY · Còn ${totalHours}h ${remainingMins}p`, color: '#F59E0B', isOverdue: false };
      } else if (isTomorrow) {
        return { label: `🟡 NGÀY MAI · Còn ${totalHours}h ${remainingMins}p`, color: '#3B82F6', isOverdue: false };
      } else {
        const days = Math.floor(totalHours / 24);
        return { label: `🟢 Còn ${days} ngày ${totalHours % 24}h`, color: '#10B981', isOverdue: false };
      }
    };

    body.innerHTML = `
      <div class="page-content fade-in">
        <div class="page-title-row">
          <h2 class="page-title"><i class="fas fa-tasks"></i> Quản Lý Công Việc KTS</h2>
          ${(user.role === 'manager' || user.role === 'sales') ? `
            <button class="btn-primary btn-sm" id="btn-kts-task-assign-modal" style="background:linear-gradient(135deg, #8B5CF6, #6366F1); border:none;"><i class="fas fa-plus"></i> Giao Việc Cho KTS</button>
          ` : ''}
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs" style="margin-bottom:16px;">
          <button class="tab-btn ${filterType === 'all' ? 'active' : ''}" data-type="all">Tất Cả (${tasks.length})</button>
          <button class="tab-btn ${filterType === 'pending' ? 'active' : ''}" data-type="pending">⏳ Đang Xử Lý (${tasks.filter(t => t.status !== 'completed').length})</button>
          <button class="tab-btn ${filterType === 'fast_support' ? 'active' : ''}" data-type="fast_support">⚡ Vẽ Phản Ứng Nhanh (${tasks.filter(t => t.taskType === 'fast_support').length})</button>
          <button class="tab-btn ${filterType === 'technical_draw' ? 'active' : ''}" data-type="technical_draw">📐 Kết Cấu Chi Tiết (${tasks.filter(t => t.taskType === 'technical_draw').length})</button>
          <button class="tab-btn ${filterType === 'cnc_export' ? 'active' : ''}" data-type="cnc_export">🖨️ Xuất File CNC (${tasks.filter(t => t.taskType === 'cnc_export').length})</button>
          <button class="tab-btn ${filterType === 'completed' ? 'active' : ''}" data-type="completed">✅ Đã Hoàn Thành (${tasks.filter(t => t.status === 'completed').length})</button>
        </div>

        <!-- Task List -->
        ${filtered.length === 0 ? `
          <div class="empty-state" style="padding:40px 20px; text-align:center;">
            <i class="fas fa-clipboard-check" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:12px;"></i>
            <div style="font-size:0.95rem; font-weight:700; color:var(--text-secondary);">Chưa có công việc nào trong danh mục này</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Các công việc được Admin / Sale giao sẽ tự động xuất hiện tại đây.</div>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px;">
            ${filtered.map(t => {
              const cd = getTaskCountdown(t.deadline);
              const isCompleted = t.status === 'completed';
              const typeMap = {
                fast_support: { label: '⚡ Vẽ Phản Ứng Nhanh', color: '#8B5CF6' },
                technical_draw: { label: '📐 Vẽ Kết Cấu Chi Tiết', color: '#3B82F6' },
                cnc_export: { label: '🖨️ Xuất File CNC', color: '#10B981' }
              };
              const tInfo = typeMap[t.taskType] || { label: '🛠️ Khác', color: 'var(--primary)' };
              const canManage = user.role === 'manager' || t.assignerId === user.id;

              return `
                <div class="section-card kts-task-card" data-id="${t.id}" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between; border-left:4px solid ${isCompleted ? '#10B981' : (cd.isOverdue ? '#EF4444' : tInfo.color)}; relative; overflow:hidden; cursor:pointer; transition:transform 0.15s, box-shadow 0.15s;" title="Bấm để xem chi tiết và thao tác">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
                      <span style="font-size:0.68rem; font-weight:800; padding:3px 8px; border-radius:6px; background:${tInfo.color}18; color:${tInfo.color}; border:1px solid ${tInfo.color}40;">
                        ${tInfo.label}
                      </span>
                      <span style="font-size:0.68rem; font-weight:800; padding:3px 8px; border-radius:6px; background:${isCompleted ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}; color:${isCompleted ? '#10B981' : '#F59E0B'};">
                        ${isCompleted ? '✅ ĐÃ HOÀN THÀNH' : (t.status === 'in_progress' ? '🔵 ĐANG THỰC HIỆN' : '🟡 CHỜ KTS')}
                      </span>
                    </div>

                    <div style="font-size:0.92rem; font-weight:800; color:var(--text-primary); margin-bottom:4px; line-height:1.3;">
                      ${t.title}
                    </div>

                    <div style="font-size:0.75rem; color:var(--primary); font-weight:700; margin-bottom:8px;">
                      <i class="fas fa-building"></i> ${t.leadName || 'Dự án'}
                    </div>

                    <!-- Countdown Box -->
                    <div style="background:${isCompleted ? 'rgba(16,185,129,0.08)' : (cd.isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)')}; border:1px solid ${isCompleted ? 'rgba(16,185,129,0.3)' : (cd.isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border-color)')}; padding:8px 10px; border-radius:8px; margin-bottom:10px; font-size:0.75rem; font-weight:800; color:${isCompleted ? '#10B981' : cd.color}; display:flex; align-items:center; justify-content:space-between;">
                      <span><i class="fas ${isCompleted ? 'fa-check-circle' : 'fa-clock'}"></i> ${isCompleted ? 'Hoàn thành lúc: ' + fmt.datetime(t.completedAt || t.updatedAt) : cd.label}</span>
                      ${!isCompleted ? `<span style="font-size:0.68rem; opacity:0.8;">Hạn: ${fmt.datetime(t.deadline)}</span>` : ''}
                    </div>

                    ${t.requirement ? `
                      <div style="font-size:0.75rem; color:var(--text-secondary); background:rgba(0,0,0,0.08); padding:8px 10px; border-radius:8px; margin-bottom:10px; font-style:italic;">
                        <i class="fas fa-comment-dots" style="color:var(--primary);"></i> "${t.requirement}"
                      </div>
                    ` : ''}
                  </div>

                  <!-- Footer row / Click target -->
                  <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:10px; display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:0.72rem;">
                    <span style="color:var(--text-muted);"><i class="fas fa-user-tie"></i> Người giao: <strong>${t.assignerName || 'Sale'}</strong> · Giao ngày ${fmt.date(t.createdAt)}</span>
                    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                      ${canManage ? `
                        <button type="button" class="btn-edit-kts-task" data-id="${t.id}" title="Sửa công việc" style="width:30px; height:30px; border-radius:7px; border:1px solid rgba(59,130,246,0.3); background:rgba(59,130,246,0.1); color:#3B82F6; cursor:pointer;"><i class="fas fa-pen"></i></button>
                        <button type="button" class="btn-delete-task" data-id="${t.id}" title="Xóa công việc" style="width:30px; height:30px; border-radius:7px; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.1); color:#EF4444; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
                      ` : ''}
                      <span style="color:var(--primary); font-weight:700;"><i class="fas fa-chevron-right"></i> Xem chi tiết & Log →</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    // Filter listeners
    document.querySelectorAll('.filter-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.renderKtsTasks(user, btn.getAttribute('data-type'));
      });
    });

    // Card click listener -> opens detail modal directly
    document.querySelectorAll('.kts-task-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const task = DB.getKtsTasks().find(t => t.id === id);
        if (task) {
          this.openKtsTaskDetailModal(task, user, () => this.renderKtsTasks(user, filterType));
        }
      });
    });

    // Assign button listener for admin/sales
    document.getElementById('btn-kts-task-assign-modal')?.addEventListener('click', () => {
      const leads = DB.getLeads();
      if (leads.length === 0) {
        Toast.error('Chưa có lead nào để giao việc. Vui lòng tạo Lead trước.');
        return;
      }
      this.openAssignKtsTaskForm(leads[0], user, () => this.renderKtsTasks(user, filterType));
    });

    // Start task listener
    document.querySelectorAll('.btn-start-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        DB.updateKtsTask(id, { status: 'in_progress' });
        Toast.info('Đã chuyển trạng thái: Đang thực hiện vẽ.');
        this.renderKtsTasks(user, filterType);
      });
    });

    // Complete task listener
    document.querySelectorAll('.btn-complete-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const task = DB.getKtsTasks().find(t => t.id === id);
        if (task) {
          this.openCompleteKtsTaskModal(task, user, () => this.renderKtsTasks(user, filterType));
        }
      });
    });

    // Delete task listener
    document.querySelectorAll('.btn-edit-kts-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const task = DB.getKtsTasks().find(t => t.id === id);
        if (!task) return;
        const lead = DB.getLead(task.leadId) || {
          id: task.leadId,
          name: (task.leadName || 'Dự án').split(' - ')[0],
          interestedIn: (task.leadName || '').split(' - ').slice(1).join(' - '),
          note: ''
        };
        this.openAssignKtsTaskForm(lead, user, () => this.renderKtsTasks(user, filterType), task);
      });
    });

    document.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.confirmDelete('Xóa Công Việc KTS', 'Bạn có chắc muốn xóa yêu cầu giao việc này?', () => {
          DB.deleteKtsTask(id);
          Toast.success('Đã xóa công việc KTS.');
          this.renderKtsTasks(user, filterType);
        });
      });
    });
  },

  openCompleteKtsTaskModal(task, user, onSave = null) {
    const html = `
      <form id="complete-kts-task-form" style="display:flex; flex-direction:column; gap:14px;">
        <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); padding:10px 14px; border-radius:10px; font-size:0.82rem;">
          <div style="font-weight:700; color:#10B981;"><i class="fas fa-check-circle"></i> Bàn Giao Hoàn Thành: ${task.title}</div>
          <div style="color:var(--text-secondary); font-size:0.75rem; margin-top:2px;">Lead: ${task.leadName} · Người giao: ${task.assignerName}</div>
        </div>

        <div class="form-group">
          <label class="form-label">Ghi Chú Kết Quả / Khối Lượng Hoàn Thành</label>
          <input type="text" id="kts-complete-note" class="form-input" placeholder="Ví dụ: Đã xong 3D phối màu gỗ, 14 tấm ván 17mm..." value="Đã hoàn thành ${task.title}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Link File Dự Án (Drive / Zalo / Dropbox)</label>
          <input type="url" id="kts-complete-link" class="form-input" placeholder="https://drive.google.com/...">
        </div>

        <div class="form-group">
          <label class="form-label">Đính Kèm Ảnh Bản Vẽ / 3D Render</label>
          <div style="display:flex; align-items:center; gap:10px;">
            <button type="button" class="btn-secondary" id="btn-upload-kts-complete-photo" style="font-size:0.8rem;"><i class="fas fa-camera"></i> Tải Ảnh Vẽ</button>
            <input type="file" id="kts-complete-photo-file" accept="image/*" style="display:none;">
            <div id="kts-complete-photo-preview" style="font-size:0.75rem; color:var(--text-muted);">Chưa chọn ảnh</div>
          </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:10px;">
          <button type="button" class="btn-cancel" id="btn-cancel-complete-task" style="background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid var(--border-color); padding:10px 18px; border-radius:8px; font-weight:600; cursor:pointer;">Hủy</button>
          <button type="submit" class="btn-primary" style="padding:10px 22px; border-radius:8px; font-weight:700; background:linear-gradient(135deg, #10B981, #059669);"><i class="fas fa-check-circle"></i> Hoàn Thành</button>
        </div>
      </form>
    `;

    const modal = Modal.create(`Xác Nhận Hoàn Thành - ${task.title}`, html);
    let photoData = '';

    const photoInput = document.getElementById('kts-complete-photo-file');
    document.getElementById('btn-upload-kts-complete-photo')?.addEventListener('click', () => photoInput.click());
    photoInput?.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          Toast.info('Đang xử lý ảnh...');
          photoData = await compressImage(e.target.files[0], 1000, 0.75);
          document.getElementById('kts-complete-photo-preview').innerHTML = `<img src="${photoData}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid #10B981;"><span style="font-size:0.75rem; color:#10B981;">Đã đính kèm ảnh</span>`;
          Toast.success('Đã tải ảnh thành công.');
        } catch (err) {
          Toast.error('Không thể tải ảnh này.');
        }
      }
    });

    document.getElementById('btn-cancel-complete-task')?.addEventListener('click', () => modal.close());

    document.getElementById('complete-kts-task-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const resultNote = document.getElementById('kts-complete-note').value.trim();
      const resultFileLink = document.getElementById('kts-complete-link').value.trim();

      // Update task status
      DB.updateKtsTask(task.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        resultNote,
        resultFileLink,
        resultImage: photoData
      });

      // Automatically add a KTS Report log entry
      DB.addKtsLog({
        projectName: task.leadName || task.title,
        taskType: task.taskType,
        date: new Date().toISOString().slice(0, 10),
        progress: '100%',
        note: resultNote,
        attachments: photoData,
        fileLink: resultFileLink,
        userId: user.id,
        userName: user.name
      });

      Toast.success('Đã hoàn thành công việc và tự động cập nhật Báo Cáo KTS!');
      modal.close();
      if (onSave) onSave();
    });
  },

  openKtsTaskDetailModal(task, user = null, onSave = null) {
    if (!user) user = DB.getCurrentUser();
    const freshTask = DB.getKtsTasks().find(t => t.id === task.id) || task;

    const typeMap = {
      fast_support: { label: '⚡ Vẽ Phản Ứng Nhanh Hỗ Trợ Sale', color: '#8B5CF6' },
      technical_draw: { label: '📐 Vẽ Kết Cấu Chi Tiết', color: '#3B82F6' },
      cnc_export: { label: '🖨️ Xuất File CNC', color: '#10B981' }
    };
    const tInfo = typeMap[freshTask.taskType] || { label: '🛠️ Công Việc KTS', color: 'var(--primary)' };

    const getCountdown = (deadlineStr) => {
      if (!deadlineStr) return { label: 'Chưa đặt hạn chót', color: '#64748B', isOverdue: false };
      const d = new Date(deadlineStr);
      const diffMs = d.getTime() - new Date().getTime();
      if (diffMs <= 0) {
        const overdueMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
        const overdueHours = Math.floor(overdueMinutes / 60);
        const overdueDays = Math.floor(overdueHours / 24);
        let text = overdueDays > 0 ? `${overdueDays}d ${overdueHours % 24}h` : (overdueHours > 0 ? `${overdueHours}h ${overdueMinutes % 60}m` : `${overdueMinutes}m`);
        return { label: `⛔ QUÁ HẠN ${text}`, color: '#EF4444', isOverdue: true };
      }
      const mins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (days === 0) return { label: `🔥 HÔM NAY · Còn ${hours}h ${mins % 60}p`, color: '#F59E0B', isOverdue: false };
      if (days === 1) return { label: `🟡 NGÀY MAI · Còn 1d ${hours % 24}h`, color: '#3B82F6', isOverdue: false };
      return { label: `🟢 Còn ${days} ngày ${hours % 24}h`, color: '#10B981', isOverdue: false };
    };

    const cd = getCountdown(freshTask.deadline);
    const isCompleted = freshTask.status === 'completed';

    const assignedTime = freshTask.createdAt ? fmt.datetime(freshTask.createdAt) : 'Chưa ghi nhận';
    const assignerName = freshTask.assignerName || 'Sale / Admin';
    const ktsName = freshTask.ktsName || 'Trần Hữu Nhật Long';

    // Resolve exact startedTime timestamp
    let startedTimeFormatted = null;
    if (freshTask.startedAt) {
      startedTimeFormatted = fmt.datetime(freshTask.startedAt);
    } else if (freshTask.history && freshTask.history.length > 0) {
      const logItem = freshTask.history.find(h => h.action && (h.action.includes('Tiếp nhận') || h.action.includes('Bắt đầu')));
      if (logItem && logItem.timestamp) {
        startedTimeFormatted = fmt.datetime(logItem.timestamp);
      }
    }
    if (!startedTimeFormatted && freshTask.status !== 'pending') {
      startedTimeFormatted = freshTask.updatedAt ? fmt.datetime(freshTask.updatedAt) : 'Đã tiếp nhận';
    }

    const completedTime = freshTask.completedAt ? fmt.datetime(freshTask.completedAt) : null;

    const html = `
      <div style="display:flex; flex-direction:column; gap:16px; max-height:75vh; overflow-y:auto; padding-right:4px;">
        <!-- Summary Card -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-left:4px solid ${tInfo.color}; border-radius:12px; padding:14px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
            <span style="font-size:0.72rem; font-weight:800; padding:4px 10px; border-radius:6px; background:${tInfo.color}20; color:${tInfo.color}; border:1px solid ${tInfo.color}40;">
              ${tInfo.label}
            </span>
            <span style="font-size:0.72rem; font-weight:800; padding:4px 10px; border-radius:6px; background:${isCompleted ? 'rgba(16,185,129,0.15)' : (freshTask.status === 'in_progress' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)')}; color:${isCompleted ? '#10B981' : (freshTask.status === 'in_progress' ? '#3B82F6' : '#F59E0B')};">
              ${isCompleted ? '✅ ĐÃ HOÀN THÀNH' : (freshTask.status === 'in_progress' ? '🔵 ĐANG THỰC HIỆN' : '🟡 CHỜ KTS')}
            </span>
          </div>

          <div style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin-bottom:6px;">
            ${freshTask.title}
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:14px; font-size:0.8rem; color:var(--text-secondary); margin-bottom:10px;">
            <div><i class="fas fa-building" style="color:var(--primary);"></i> Dự án: <strong style="color:var(--text-primary);">${freshTask.leadName || 'Dự án'}</strong></div>
            <div><i class="fas fa-user-tie" style="color:#8B5CF6;"></i> Người giao: <strong>${assignerName}</strong></div>
            <div><i class="fas fa-user-ninja" style="color:#3B82F6;"></i> KTS nhận: <strong>${ktsName}</strong></div>
          </div>

          ${freshTask.requirement ? `
            <div style="font-size:0.8rem; color:var(--text-primary); background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.06); padding:10px 12px; border-radius:8px; margin-top:8px;">
              <div style="font-weight:700; color:var(--primary); font-size:0.75rem; margin-bottom:2px;"><i class="fas fa-comment-dots"></i> Yêu cầu từ Sale / Admin:</div>
              "${freshTask.requirement}"
            </div>
          ` : ''}

          <div style="margin-top:10px; background:${isCompleted ? 'rgba(16,185,129,0.08)' : (cd.isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)')}; border:1px solid ${isCompleted ? 'rgba(16,185,129,0.3)' : (cd.isOverdue ? 'rgba(239,68,68,0.3)' : 'var(--border-color)')}; padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; font-size:0.78rem;">
            <span style="font-weight:700; color:${isCompleted ? '#10B981' : cd.color};">
              <i class="fas ${isCompleted ? 'fa-check-circle' : 'fa-clock'}"></i> ${isCompleted ? 'Đã hoàn thành bàn giao' : cd.label}
            </span>
            <span style="color:var(--text-muted);"><i class="fas fa-calendar-alt"></i> Hạn chót: <strong>${fmt.datetime(freshTask.deadline)}</strong></span>
          </div>
        </div>

        <!-- Log Timeline Section (GIAO KHI NÀO - NHẬN KHI NÀO - XONG KHI NÀO) -->
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
          <div style="font-size:0.9rem; font-weight:800; color:var(--text-primary); margin-bottom:14px; display:flex; align-items:center; gap:8px;">
            <i class="fas fa-history" style="color:var(--primary);"></i>
            <span>Lịch Sử Tiến Độ Log Task (Giao · Nhận · Xong)</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px; position:relative; padding-left:20px; border-left:2px dashed var(--border-color);">
            
            <!-- 1. Giao khi nào -->
            <div style="position:relative;">
              <div style="position:absolute; left:-27px; top:0; width:14px; height:14px; border-radius:50%; background:#8B5CF6; border:3px solid var(--bg-primary);"></div>
              <div style="font-size:0.82rem; font-weight:800; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center;">
                <span>🚀 1. Thời Điểm Giao Việc</span>
                <span style="font-size:0.72rem; color:#8B5CF6; font-weight:700;">${assignedTime}</span>
              </div>
              <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:2px;">
                Đã được giao bởi <strong>${assignerName}</strong> cho KTS <strong>${ktsName}</strong>.
              </div>
            </div>

            <!-- 2. Nhận khi nào (HIỆN THỜI GIAN BẤM BẮT ĐẦU LÀM) -->
            <div style="position:relative;">
              <div style="position:absolute; left:-27px; top:0; width:14px; height:14px; border-radius:50%; background:${startedTimeFormatted ? '#3B82F6' : '#64748B'}; border:3px solid var(--bg-primary);"></div>
              <div style="font-size:0.82rem; font-weight:800; color:${startedTimeFormatted ? 'var(--text-primary)' : 'var(--text-muted)'}; display:flex; justify-content:space-between; align-items:center;">
                <span>🔵 2. Thời Điểm Bắt Đầu Làm</span>
                <span style="font-size:0.72rem; color:${startedTimeFormatted ? '#3B82F6' : '#64748B'}; font-weight:700;">${startedTimeFormatted || 'Chưa tiếp nhận'}</span>
              </div>
              <div style="font-size:0.78rem; color:${startedTimeFormatted ? 'var(--text-secondary)' : 'var(--text-muted)'}; margin-top:2px;">
                ${startedTimeFormatted ? `KTS <strong>${ktsName}</strong> đã bấm bắt đầu làm lúc <strong>${startedTimeFormatted}</strong>.` : '⏳ KTS chưa bấm nút Bắt đầu nhận công việc.'}
              </div>
            </div>

            <!-- 3. Xong khi nào -->
            <div style="position:relative;">
              <div style="position:absolute; left:-27px; top:0; width:14px; height:14px; border-radius:50%; background:${completedTime ? '#10B981' : '#64748B'}; border:3px solid var(--bg-primary);"></div>
              <div style="font-size:0.82rem; font-weight:800; color:${completedTime ? '#10B981' : 'var(--text-muted)'}; display:flex; justify-content:space-between; align-items:center;">
                <span>✅ 3. Thời Điểm Hoàn Thành</span>
                <span style="font-size:0.72rem; color:${completedTime ? '#10B981' : '#64748B'}; font-weight:700;">${completedTime || 'Chưa hoàn thành'}</span>
              </div>
              <div style="font-size:0.78rem; color:${completedTime ? 'var(--text-secondary)' : 'var(--text-muted)'}; margin-top:2px;">
                ${completedTime ? `KTS <strong>${ktsName}</strong> đã hoàn thành công việc.` : '⏳ Công việc chưa hoàn thành.'}
              </div>
              ${freshTask.resultNote ? `
                <div style="font-size:0.75rem; color:#10B981; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); padding:8px 10px; border-radius:6px; margin-top:6px;">
                  <strong>Ghi chú hoàn thành:</strong> ${freshTask.resultNote}
                  ${freshTask.resultFileLink ? `<div style="margin-top:4px;"><a href="${freshTask.resultFileLink}" target="_blank" style="color:#3B82F6; text-decoration:underline;"><i class="fas fa-external-link-alt"></i> Mở link file đính kèm</a></div>` : ''}
                </div>
              ` : ''}
              ${freshTask.resultImage ? `
                <div style="margin-top:6px;">
                  <img src="${freshTask.resultImage}" style="max-width:100%; max-height:160px; border-radius:8px; border:1px solid var(--border-color); object-fit:cover;">
                </div>
              ` : ''}
            </div>

          </div>

          <!-- Extra audit history log list -->
          ${(freshTask.history && freshTask.history.length > 0) ? `
            <div style="margin-top:16px; padding-top:12px; border-top:1px dashed var(--border-color);">
              <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:8px;"><i class="fas fa-list-ul"></i> Chi tiết nhật ký thao tác:</div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${freshTask.history.map(h => `
                  <div style="font-size:0.72rem; color:var(--text-secondary); background:rgba(255,255,255,0.02); padding:6px 8px; border-radius:6px; display:flex; justify-content:space-between;">
                    <span><strong>${h.action}</strong> ${h.user ? `(${h.user})` : ''} ${h.note ? `: ${h.note}` : ''}</span>
                    <span style="color:var(--text-muted); font-size:0.68rem;">${fmt.datetime(h.timestamp)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Footer Buttons -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding-top:12px; border-top:1px solid var(--border-color);">
          <div style="display:flex; gap:8px;">
            ${!isCompleted && freshTask.status === 'pending' ? `
              <button class="btn-secondary btn-sm" id="btn-detail-start-task" style="background:rgba(59,130,246,0.15); color:#3B82F6; border:1px solid rgba(59,130,246,0.3); font-weight:700; cursor:pointer;"><i class="fas fa-play"></i> Bắt Đầu Làm</button>
            ` : ''}
            ${!isCompleted ? `
              <button class="btn-primary btn-sm" id="btn-detail-complete-task" style="background:linear-gradient(135deg, #10B981, #059669); border:none; font-weight:700; cursor:pointer;"><i class="fas fa-check-circle"></i> Hoàn Thành</button>
            ` : ''}
          </div>
          <button class="btn-secondary" id="btn-close-detail-modal" style="padding:6px 14px; font-size:0.8rem; border-radius:6px; cursor:pointer;">Đóng</button>
        </div>

      </div>
    `;

    const modal = Modal.create(`📋 Lịch Sử Log Task: ${freshTask.title}`, html);
    document.getElementById('btn-close-detail-modal')?.addEventListener('click', () => modal.close());

    document.getElementById('btn-detail-start-task')?.addEventListener('click', () => {
      DB.updateKtsTask(freshTask.id, { status: 'in_progress', startedAt: new Date().toISOString() });
      Toast.info('Đã nhận việc và chuyển trạng thái: Đang thực hiện.');
      modal.close();
      if (onSave) onSave();
    });

    document.getElementById('btn-detail-complete-task')?.addEventListener('click', () => {
      modal.close();
      this.openCompleteKtsTaskModal(freshTask, user, onSave);
    });
  },

  openKtsTaskCategoryModal(taskType, user = null) {
    if (!user) user = DB.getCurrentUser();
    const tasks = DB.getKtsTasks(user.id, user.role).filter(t => t.taskType === taskType && t.status !== 'completed');

    const titleMap = {
      fast_support: '⚡ Chi Tiết Task: Vẽ Phản Ứng Nhanh Hỗ Trợ Sale',
      technical_draw: '📐 Chi Tiết Task: Vẽ Kết Cấu Chi Tiết',
      cnc_export: '🖨️ Chi Tiết Task: Xuất File CNC'
    };
    const modalTitle = titleMap[taskType] || '📋 Chi Tiết Công Việc Được Giao';

    const getCountdown = (deadlineStr) => {
      if (!deadlineStr) return { label: 'Chưa đặt hạn chót', color: '#64748B', isOverdue: false };
      const d = new Date(deadlineStr);
      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      if (diffMs <= 0) {
        const overdueMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
        const overdueHours = Math.floor(overdueMinutes / 60);
        const overdueDays = Math.floor(overdueHours / 24);
        let text = overdueDays > 0 ? `${overdueDays}d ${overdueHours % 24}h` : (overdueHours > 0 ? `${overdueHours}h ${overdueMinutes % 60}m` : `${overdueMinutes}m`);
        return { label: `⛔ QUÁ HẠN ${text}`, color: '#EF4444', isOverdue: true };
      }
      const mins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      if (days === 0) return { label: `🔥 HÔM NAY · Còn ${hours}h ${mins % 60}p`, color: '#F59E0B', isOverdue: false };
      else if (days === 1) return { label: `🟡 NGÀY MAI · Còn 1d ${hours % 24}h`, color: '#3B82F6', isOverdue: false };
      else return { label: `🟢 Còn ${days} ngày ${hours % 24}h`, color: '#10B981', isOverdue: false };
    };

    const html = `
      <div style="display:flex; flex-direction:column; gap:12px; max-height:70vh; overflow-y:auto; padding-right:4px;">
        ${tasks.length === 0 ? `
          <div style="text-align:center; padding:30px 10px;">
            <i class="fas fa-check-circle" style="font-size:2.5rem; color:#10B981; margin-bottom:10px;"></i>
            <div style="font-weight:700; color:var(--text-primary);">Không có task nào đang chờ thuộc nhóm này!</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">Bạn đã hoàn thành tất cả công việc hoặc chưa được giao việc mới.</div>
          </div>
        ` : tasks.map(t => {
          const cd = getCountdown(t.deadline);
          return `
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-left:4px solid ${cd.isOverdue ? '#EF4444' : '#8B5CF6'}; border-radius:10px; padding:12px 14px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <div>
                  <div style="font-size:0.92rem; font-weight:800; color:var(--text-primary);">${t.title}</div>
                  <div style="font-size:0.78rem; color:var(--primary); font-weight:700; margin-top:2px;">
                    <i class="fas fa-building"></i> ${t.leadName}
                  </div>
                </div>
                <span style="font-size:0.72rem; font-weight:800; padding:4px 8px; border-radius:6px; background:${cd.color}15; color:${cd.color}; border:1px solid ${cd.color}35; flex-shrink:0;">
                  ${cd.label}
                </span>
              </div>

              ${t.requirement ? `
                <div style="font-size:0.75rem; color:var(--text-secondary); background:rgba(0,0,0,0.1); padding:8px; border-radius:6px; margin:8px 0; font-style:italic;">
                  <i class="fas fa-comment-dots" style="color:var(--primary);"></i> "${t.requirement}"
                </div>
              ` : ''}

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.05); font-size:0.72rem;">
                <span style="color:var(--text-muted);"><i class="fas fa-user-tie"></i> Giao bởi: <strong>${t.assignerName || 'Sale'}</strong></span>
                <div style="display:flex; gap:6px;">
                  <button class="btn-secondary btn-sm btn-modal-detail-task" data-id="${t.id}" style="background:rgba(255,255,255,0.06); border:1px solid var(--border-color); padding:5px 10px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="fas fa-history"></i> Log Chi Tiết</button>
                  <button class="btn-primary btn-sm btn-modal-complete-task" data-id="${t.id}" style="background:linear-gradient(135deg, #10B981, #059669); border:none; padding:5px 12px; font-weight:700; border-radius:6px; cursor:pointer;"><i class="fas fa-check-circle"></i> Nộp Bài</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:10px; border-top:1px solid var(--border-color);">
        <button class="btn-link" id="btn-modal-go-kts-tasks" style="font-size:0.8rem;">Xem tất cả trong Quản lý task →</button>
        <button class="btn-secondary" id="btn-close-cat-modal" style="padding:6px 14px; font-size:0.8rem; border-radius:6px; cursor:pointer;">Đóng</button>
      </div>
    `;

    const modal = Modal.create(modalTitle, html);
    document.getElementById('btn-close-cat-modal')?.addEventListener('click', () => modal.close());

    document.getElementById('btn-modal-go-kts-tasks')?.addEventListener('click', () => {
      modal.close();
      this.renderKtsTasks(user, taskType);
    });

    document.querySelectorAll('.btn-modal-detail-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const task = DB.getKtsTasks().find(t => t.id === id);
        if (task) {
          modal.close();
          this.openKtsTaskDetailModal(task, user, () => this.openKtsTaskCategoryModal(taskType, user));
        }
      });
    });

    document.querySelectorAll('.btn-modal-complete-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const task = DB.getKtsTasks().find(t => t.id === id);
        if (task) {
          modal.close();
          this.openCompleteKtsTaskModal(task, user, () => this.renderDashboard(user));
        }
      });
    });
  },

  // ── Helpers ───────────────────────────────────────────
  _setActiveNav(navId) {
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-nav') === navId);
    });
  }
};
