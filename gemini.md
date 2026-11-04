# Gemini & AI Assistant Context Guide
## Project: TUNorth-BRMS (Booking & Resource Management System)

ไฟล์นี้เป็นเอกสารแนะนำบริบท โครงสร้างสถาปัตยกรรม กฎเกณฑ์ทางธุรกิจ และแนวทางปฏิบัติในการเขียนโค้ด สำหรับ **Gemini** และ AI Assistants ในการพัฒนา ปรับปรุง หรือแก้ไขโปรเจกต์ **TUNorth-BRMS**

---

## 1. ข้อมูลพื้นฐานของโปรเจกต์ (Project Overview)

* **ชื่อโปรเจกต์:** TUNorth-BRMS (Booking & Resource Management System)
* **องค์กรผู้ใช้งาน:** โรงเรียนเตรียมอุดมศึกษาภาคเหนือ (Triam Udom Suksa School of the North)
* **จุดประสงค์:** ระบบบริหารจัดการการจองห้องประชุมและทรัพยากรออนไลน์ ป้องกันการจองเวลาชนกัน รองรับการจองครั้งเดียว จองซ้ำรายสัปดาห์ และจองหลายวันเวลาเดียวกัน พร้อมระบบอนุมัติอัตโนมัติหรือผ่านแอดมิน และแจ้งเตือนผ่าน Telegram

---

## 2. โครงสร้างและสถาปัตยกรรม (Architecture & Code Organization)

### 2.1 Backend (Go Hexagonal Architecture)
Backend พัฒนาด้วยภาษา **Go 1.25** บนเฟรมเวิร์ก **Go Fiber v2** และ **GORM** โดยจัดโครงสร้างตามหลัก **Hexagonal Architecture (Ports and Adapters)** ดังนี้:

```
backend/
├── api/                             # API Entrypoint
├── internal/
│   ├── core/                        # Core Business Logic (Framework-independent)
│   │   ├── domain/                  # Data Models & Entities (User, Room, Booking, Setting, Log)
│   │   ├── ports/                   # Interfaces (Repositories, Services, Notifier)
│   │   └── services/                # Business Rules Implementation (BookingService, SettingService, ...)
│   └── adapters/                    # External World Adapters
│       ├── handlers/http/           # HTTP Controllers (Fiber Handlers, Middleware, RBAC)
│       └── storage/                 # Database Repositories (PostgreSQL via GORM, Cloudinary)
├── pkg/
│   └── bootstrap/                   # Application wiring, DI, and Fiber router setup
└── main.go                          # Server entrypoint
```

#### กฎสำคัญในการเขียนโค้ด Backend:
1. **รักษาหลักการ Dependency Inversion:** Service ต้องเรียกใช้ Repository ผ่าน Interface ใน `ports/` เท่านั้น ห้ามเรียก `*gorm.DB` โดยตรงใน Service
2. **Database Transactions:** การบันทึกหรือแก้ไขข้อมูลหลายแถวพร้อมกัน (เช่น Recurring Bookings) **ต้อง** ครอบด้วย `db.Transaction(func(tx *gorm.DB) error { ... })` เพื่อป้องกัน Partial Failure
3. **การตรวจสอบสิทธิ์ (RBAC & IDOR Prevention):**
   * ตรวจสอบ Role เสมอในระดับ Handler/Middleware
   * การแก้ไขหรือลบการจอง ต้องตรวจว่า Actor เป็น Admin หรือเป็นเจ้าของ Record (`UserID == actorID`)
4. **ความปลอดภัยของการตั้งค่า (Settings Sanitization):**
   * Endpoint `/api/settings/public` ต้องส่งกลับเฉพาะ Key ที่ผ่าน Whitelist เท่านั้น ห้ามส่ง Secret Tokens ออกไปเด็ดขาด

---

### 2.2 Frontend (Next.js 16 App Router)
Frontend พัฒนาด้วย **Next.js 16**, **React 19**, **TypeScript** และ **Tailwind CSS 4**:

```
frontend/
├── src/
│   ├── app/                         # App Router Pages
│   │   ├── page.tsx                 # Public Calendar View (FullCalendar)
│   │   ├── booking/create/page.tsx  # Multi-mode Booking Form
│   │   ├── my-bookings/page.tsx     # User's Booking History
│   │   ├── my-profile/page.tsx      # User Profile Management
│   │   ├── login/ & register/       # Auth Pages
│   │   └── admin/                   # Admin Protected Modules
│   │       ├── dashboard/           # Metrics & Charts
│   │       ├── manage-bookings/     # Approve, Reject, Edit, Delete (Single/Group)
│   │       ├── rooms/               # Room Management
│   │       ├── resources/           # Equipment Management
│   │       ├── users/               # User Management & CSV Import
│   │       ├── settings/            # System Settings Editor
│   │       ├── report/              # Detailed Reports & Export
│   │       └── logs/                # Audit Log Viewer
│   ├── components/                  # Shared Components & Modals
│   │   ├── ui/                      # Radix UI Primitives (Button, Dialog, Select, etc.)
│   │   ├── BookingDetailModal.tsx   # Detailed View Modal
│   │   └── BookingEditModal.tsx     # Edit Modal
│   ├── store/                       # Client State (Zustand authStore)
│   ├── hooks/                       # Custom Hooks (useSettings)
│   └── types/                       # TypeScript Interface Definitions
```

#### กฎสำคัญในการเขียนโค้ด Frontend:
1. **Client Components:** หน้าใดที่ใช้ State, Hooks หรือ Browser API ให้ระบุ `"use client";` ที่บรรทัดแรกเสมอ
2. **Suspense Boundary:** หน้าที่ใช้งาน `useSearchParams()` เช่น `settings/page.tsx` หรือ `booking/create/page.tsx` ต้องครอบด้วย `<Suspense>` เพื่อป้องกัน Build Error ใน Next.js App Router
3. **User Feedback:** ใช้ `sonner` (`toast.success`, `toast.error`, `toast.warning`) สำหรับข้อความแจ้งเตือนผลลัพธ์ แทน `alert()`

---

## 3. กฎเกณฑ์ทางธุรกิจที่สำคัญ (Business Rules)

### 3.1 การตรวจสอบเวลาชน (Conflict Detection)
การนับจำนวนการจองที่ทับซ้อนในห้องเดียวกัน ใช้เงื่อนไข:
```sql
WHERE room_id = ?
  AND LOWER(status) NOT IN ('cancelled', 'rejected')
  AND start_time < :new_end_time
  AND end_time > :new_start_time
```
* **ข้อยกเว้น:** รายการที่สถานะเป็น `cancelled` หรือ `rejected` จะไม่นำมาคำนวณการชน เพื่อไม่ให้บล็อกห้อง

### 3.2 รูปแบบการจองแบบชุด (Recurring Bookings)
1. **แนวทางจัดเก็บ (Discrete Records with Grouping):**
   * แต่ละวันจะถูกบันทึกเป็น 1 แถวในตาราง `bookings` เพื่อให้ FullCalendar แสดงผลได้ทันที และ SQL Conflict Check ทำงานได้ตรงตามปกติ
   * ทุกแถวในชุดเดียวกันจะแชร์ `recurring_group_id` เดียวกัน (UUID) พร้อมฟิลด์ `recurrence_type`, `recurrence_index`, `recurrence_total`
2. **Partial Conflict Handling:**
   * ให้ผู้ใช้สามารถตรวจสอบความพร้อมล่วงหน้าผ่าน `POST /api/bookings/check-conflicts`
   * หากมีบางวันติดชน ระบบจะให้สิทธิ์ผู้ใช้เลือกว่าจะยืนยันเฉพาะวันที่ห้องว่าง หรือไม่จองบางวัน
3. **การจัดการทั้งชุด (Group Actions):**
   * แอดมินสามารถอนุมัติทั้งชุดได้ผ่าน `PATCH /api/bookings/group/:groupId/status`
   * การลบ/ยกเลิก มีตัวเลือกระหว่าง "เฉพาะวันนี้" หรือ "ทุกรายการในชุด" ผ่าน `DELETE /api/bookings/group/:groupId`
4. **Anti-Spam Notification:**
   * การจองแบบชุดจะส่งข้อความแจ้งเตือนเข้า Telegram สรุปเป็น 1 ข้อความต่อ 1 ชุดเท่านั้น ผ่าน `NotifyAdminNewRecurringBooking`

### 3.3 ขีดจำกัดและการตั้งค่า (Configurable Limits)
* `max_recurring_count`: จำกัดจำนวนครั้งสูงสุดต่อการจองแบบชุด (Default = 12 ครั้ง)
* `advance_booking_days`: จำนวนวันที่ต้องจองล่วงหน้า (Admin ได้รับการยกเว้น)
* `allow_weekend`: อนุญาตให้จองวันเสาร์-อาทิตย์หรือไม่ (`true`/`false`)
* `default_booking_status`: สถานะเริ่มต้น (`pending` หรือ `approved`)

---

## 4. คำสั่งที่ใช้บ่อย (Development Commands)

### 4.1 การรันด้วย Docker Compose (แนะนำ)
```bash
# สั่ง Build และรันทั้ง Backend, Frontend, และ Database
docker-compose up -d --build

# ดู Log ของบริการทั้งหมด
docker-compose logs -f

# หยุดการทำงาน
docker-compose down
```

### 4.2 การรัน Backend (Go) แบบ Manual
```bash
cd backend
go run main.go

# รัน Automated Unit Tests
go test -v ./internal/core/services/...

# Build Binary
go build -v ./...
```

### 4.3 การรัน Frontend (Next.js) แบบ Manual
```bash
cd frontend
bun install   # หรือ npm install
bun dev       # หรือ npm run dev

# Build สำหรับ Production
bun run build # หรือ npm run build
```

---

## 5. คำแนะนำสำหรับ AI ในการต่อยอดระบบ (Next Steps & AI Guidelines)

เมื่อได้รับคำสั่งให้เพิ่มฟีเจอร์หรือแก้ไขบั๊ก:
1. **ตรวจสอบความเข้ากันได้ของสถาปัตยกรรม:** เพิ่มฟิลด์ที่ Domain -> เพิ่ม Ports -> ปรับ Repository -> แก้ไข Service -> เพิ่ม Handler -> อัปเดต Frontend Types -> ปรับ UI
2. **ไม่ทำลาย Data Integrity:** ห้ามลบคอลัมน์หรือเปลี่ยน Type ของคอลัมน์เดิมใน Database ที่มีข้อมูลอยู่แล้วโดยไม่ทำ Migration Strategy
3. **รักษาความปลอดภัย:** ตรวจสอบ JWT Context, ป้องกัน IDOR และระวังการเปิดเผย API Keys ใน Public Endpoints
4. **เขียน Automated Test เสมอ:** ทุกครั้งที่เพิ่ม Logic ใหม่ใน `booking_service.go` ให้เพิ่ม Test Case ใน `booking_service_test.go`
