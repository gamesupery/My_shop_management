# Moto Shop — ระบบบันทึกการขายร้านอะไหล่มอเตอร์ไซค์

เว็บแอป React + Vite สำหรับบันทึกออเดอร์ รายการอะไหล่ ราคาแยกตามประเภทลูกค้า ยอดรับชำระ และประวัติการขาย โดยใช้ Supabase เป็นฐานข้อมูลและ Vercel สำหรับ deploy

## ความสามารถปัจจุบัน

- บันทึกออเดอร์ที่มีหลายรายการสินค้าและหมายเหตุ
- ราคาทั่วไป / DIY / ราคาส่ง และราคาพิเศษต่อรายการ
- บันทึกยอดที่ลูกค้าจ่ายแล้วและคำนวณยอดคงเหลือ
- ประวัติรายเดือน สรุปยอด และ export Excel
- จัดการรายการอะไหล่และราคา
- ธีมสว่าง/มืดและ layout มือถือ/จอกว้าง
- เข้าสู่ระบบด้วยอีเมลและรหัสผ่านของ Supabase Auth; ไม่มีหน้าสมัครสมาชิกสาธารณะ

## เริ่มพัฒนาในเครื่อง

ต้องใช้ Node.js และ npm:

```bash
npm ci
cp .env.example .env
```

แก้ค่าใน `.env` ให้เป็น Supabase project URL และ **anon/publishable key เท่านั้น** จากนั้น:

```bash
npm run dev
```

คำสั่งตรวจสอบ:

```bash
npm run lint
npm run build
npm run preview
```

## ตั้งค่าฐานข้อมูลและสิทธิ์ (จำเป็นก่อน deploy เวอร์ชันนี้)

1. สำรองฐานข้อมูลและตรวจ schema ปัจจุบันให้มีตาราง `public.parts`, `public.orders`, `public.order_lines` ตามที่แอปใช้อยู่
2. ตรวจ policies ปัจจุบันก่อนใช้ migration:
   `supabase/migrations/20261010170000_authenticate_shop_users.sql`
3. Migration นี้สร้าง `public.shop_users`, เปิด RLS, ถอน grants จาก `anon`/`PUBLIC` และ **ลบ policies เดิมทั้งหมด** ของ `parts`, `orders`, `order_lines`, `shop_users` ก่อนแทนด้วย policy ชุดใหม่สำหรับร้านเดียวที่พนักงานซึ่งอยู่ใน allowlist ใช้ข้อมูลร่วมกันได้ การเปลี่ยนนี้ตั้งใจปิด policy anon ที่อาจเปิดอยู่ แต่ถ้าฐานข้อมูลมี policies สำหรับงานอื่น ให้ตรวจ/ปรับ migration ให้เหมาะก่อน apply
4. ใช้ Supabase CLI ที่ link กับ project และขั้นตอน migration ของทีม หรือใช้ SQL Editor หลังตรวจ SQL และ backup แล้ว ห้ามใส่ service-role/secret key ลงใน repository, browser หรือ `VITE_*`
5. ใน Supabase Auth ให้ปิด public sign-up และสร้างบัญชีอีเมล/รหัสผ่านผ่าน Dashboard โดยเจ้าของร้านเป็นผู้ควบคุม การมีบัญชี Auth เพียงอย่างเดียวยังไม่พอ ต้องเพิ่ม UUID ของผู้ใช้นั้นลงใน allowlist:

   ```sql
   insert into public.shop_users (user_id)
   values ('UUID-จาก-Supabase-Auth-Users');
   ```

   บัญชีที่ไม่มีแถวใน `shop_users` จะไม่ผ่านหน้าแอปและ RLS ส่วนการเพิ่ม/ลบผู้ใช้ใน allowlist ให้ทำผ่าน Supabase Dashboard/SQL ในฐานะผู้ดูแล ไม่ได้เปิดให้ผู้ใช้จากหน้าเว็บทำเอง
6. ทดสอบใน staging ก่อน production: ผู้ไม่ล็อกอินต้องอ่าน/เขียนทั้ง 3 ตารางไม่ได้; ผู้ใช้ Auth ที่ไม่อยู่ใน allowlist ต้องไม่ได้ข้อมูล; ผู้ใช้ที่ allowlist แล้วจึงเข้าแอปและใช้งานได้

> แนวทางนี้ออกแบบสำหรับ **ร้านเดียวที่พนักงานที่อนุมัติแล้วใช้ข้อมูลชุดเดียวกัน** ไม่ใช่ multi-tenant หากภายหลังรองรับหลายร้านต้องเพิ่ม `store_id` และ RLS แยกตามสมาชิก/ร้าน

## ตั้งค่า Vercel

กำหนด environment variables ใน Project Settings แยก Production และ Preview:

- `VITE_SUPABASE_URL` — Supabase Project URL
- `VITE_SUPABASE_KEY` — anon/publishable key เท่านั้น (ค่าใน `VITE_*` ถูกส่งไปยัง browser)

แนะนำให้ Preview ใช้ Supabase staging แยกจากข้อมูลลูกค้าจริง ใช้ build command `npm run build` และ output directory `dist` ก่อน deploy ตรวจให้ migration/RLS และบัญชี allowlist พร้อมใน environment ที่จะใช้

## ข้อควรทราบ

- แอปนี้ยังไม่มีระบบจัดการสต๊อกสินค้า ไม่ควรถือยอดสินค้าในฐานข้อมูลเป็น stock คงเหลือ
- บัญชี Auth และสิทธิ์ allowlist เป็นคนละส่วนกัน ต้องตั้งทั้งคู่
- ไฟล์ `.env` จริงเป็น local-only และไม่ควรถูก commit; ใช้ `.env.example` เป็นแม่แบบ
- ก่อนใช้เป็นสมุดขายหลัก ควรยืนยัน backup/restore และทดสอบการกู้คืนข้อมูล
