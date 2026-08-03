# Hướng dẫn dữ liệu Supabase — Mộc Tiên Phát CRM

## Thứ tự cập nhật production

1. Mở **Supabase Dashboard → SQL Editor** của project `gbwmwoceopbzytfgxoax`.
2. Chạy toàn bộ nội dung `supabase_migration.sql`.
3. Kiểm tra các truy vấn ở phần dưới trả về thành công.
4. Sau đó mới deploy code GitHub Pages bản `v33`.

Migration dùng `IF NOT EXISTS` và `CREATE OR REPLACE VIEW`, không xóa dữ liệu hiện có.

## Các view dùng để trích xuất

| View | Một dòng đại diện cho | Chỉ số chính |
|---|---|---|
| `vw_lead_pipeline` | Một khách hàng tiềm năng | Sale phụ trách, campaign, stage, tuổi lead, số lần chăm sóc/sửa báo giá |
| `vw_contract_finance` | Một hợp đồng | Giá trị, đã thu, còn nợ, trạng thái thanh toán, lần thu gần nhất |
| `vw_campaign_performance` | Một chiến dịch | Ngân sách, thực chi, số lead, số lead chốt, CPL, tỷ lệ chuyển đổi |
| `vw_kts_task_performance` | Một công việc KTS | Thời điểm giao/nhận/xong, số giờ xử lý, trễ hạn, kết quả bàn giao |

Nên dùng các view này cho Excel, Power BI hoặc công cụ báo cáo thay vì tự nối các bảng thô.

## Truy vấn kiểm tra sau migration

```sql
select * from public.vw_lead_pipeline limit 5;
select * from public.vw_contract_finance limit 5;
select * from public.vw_campaign_performance limit 5;
select * from public.vw_kts_task_performance limit 5;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'leads', 'contracts', 'contract_payments', 'lead_history',
    'lead_revisions', 'kts_tasks', 'kts_logs'
  )
order by table_name, ordinal_position;
```

## Logic đồng bộ của ứng dụng

- Mỗi thay đổi được lưu vào cache và hàng đợi local trước khi gửi Supabase.
- Chỉ xóa khỏi hàng đợi khi Supabase xác nhận thành công.
- Các lần sửa nhanh trên cùng một bản ghi được gửi tuần tự để tránh bản cũ ghi đè bản mới.
- Khi còn dữ liệu chưa upload, ứng dụng không tải snapshot Supabase đè lên cache local.
- Hàng đợi được gửi lại khi có mạng, khi mở lại tab hoặc khi Realtime kết nối.
- Supabase là nguồn dữ liệu chuẩn sau khi toàn bộ hàng đợi đã được upload.

## Lưu ý bảo mật

Ứng dụng hiện dùng tài khoản nội bộ tự xây dựng, không dùng Supabase Auth. Vì vậy các policy `anon` vẫn đang mở để GitHub Pages có thể ghi dữ liệu. Cần chuyển sang Supabase Auth trước khi siết RLS theo từng người dùng.
