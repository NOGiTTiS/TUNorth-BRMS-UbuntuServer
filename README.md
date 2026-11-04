# TUNorth-BRMS: Booking & Resource Management System
### ระบบจองห้องประชุมและทรัพยากรออนไลน์ — โรงเรียนเตรียมอุดมศึกษาภาคเหนือ

[![Go Version](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker)](https://www.docker.com)

**TUNorth-BRMS** คือระบบเว็บแอปพลิเคชันสำหรับบริหารจัดการการจองห้องประชุมและอุปกรณ์สนับสนุนการประชุมแบบครบวงจร ออกแบบมาเพื่อเพิ่มความสะดวก รวดเร็ว โปร่งใส และป้องกันปัญหาการจองเวลาชนกันได้อย่างแม่นยำ

---

## ✨ ฟีเจอร์เด่น (Key Features)

### 1. 📅 ปฏิทินแสดงผลแบบเรียลไทม์ (Interactive Calendar)
* แสดงรายการจองห้องประชุมทั้งหมดผ่าน **FullCalendar** ในรูปแบบรายเดือน รายสัปดาห์ และรายวัน
* แยกสีตามห้องประชุม ช่วยให้เห็นภาพรวมของห้องที่ว่างและห้องที่ถูกใช้งานได้อย่างรวดเร็ว
* คลิกที่ช่องวันในปฏิทินเพื่อเริ่มทำการจองได้ทันที

### 2. 🔁 รูปแบบการจอง 3 รูปแบบ (Flexible Booking Modes)
* **จองครั้งเดียว (Single Date):** สำหรับการประชุมทั่วไปในวันเดียว หรือช่วงเวลาต่อเนื่อง
* **จองซ้ำรายสัปดาห์ (Weekly Recurring):** ระบุวันในสัปดาห์ เวลาเริ่ม-สิ้นสุด และจำนวนสัปดาห์ที่ต้องการ (เช่น ทุกวันพุธ 09:00 - 12:00 น. ตลอด 4 สัปดาห์)
* **หลายวันเวลาเดียวกัน (Custom Multi-Dates):** กำหนดช่วงเวลาครั้งเดียว และเลือกเพิ่มวันที่ต้องการได้หลายวันอย่างอิสระ

### 3. ⚡ ระบบตรวจจับเวลาชนและยืนยันเฉพาะวันที่ว่าง (Smart Conflict & Partial Confirmation)
* มีระบบ Pre-check ตรวจสอบความพร้อมของห้องก่อนกดยืนยัน
* **Partial Conflict Handling:** หากจอง 6 สัปดาห์ แล้วมี 1 สัปดาห์ติดชน ระบบจะแจ้งเตือนระบุวันที่ติดชน พร้อมปุ่ม **"เลือกเฉพาะวันที่ว่าง"** ให้ผู้ใช้ยืนยันจองเฉพาะวันที่ห้องว่างได้ทันที

### 4. ⚙️ ระบบอนุมัติที่ปรับแต่งได้ (Approval Workflows)
* รองรับการตั้งค่า **อนุมัติอัตโนมัติ (Auto-Approve)** ทันทีที่ผู้ใช้จองสำเร็จ
* รองรับโหมด **รอแอดมินอนุมัติ (Pending)** โดยแอดมินสามารถ:
  * อนุมัติ / ปฏิเสธ เป็นรายวัน
  * อนุมัติ / ปฏิเสธ **"ทั้งชุด"** ในคลิกเดียว
  * เลือกลบเฉพาะรายการวันนี้ หรือ ลบทุกรายการในชุด

### 5. 🔔 แจ้งเตือนผ่าน Telegram แบบไม่สแปม (Telegram Bot Alerts)
* ส่งแจ้งเตือนแอดมินทันทีเมื่อมีรายการจองใหม่
* สำหรับการจองแบบชุด ระบบจะรวบรวมข้อมูลและส่งเป็น **1 ข้อความสรุป** (Anti-Spam)
* แจ้งเตือนผู้ใช้เมื่อสถานะการจองได้รับการอนุมัติหรือไม่อนุมัติ

### 6. 🎨 ปรับแต่งระบบได้แบบไดนามิก (Dynamic System Settings)
* ผู้ดูแลระบบสามารถเปลี่ยนชื่อระบบ โลโก้ ข้อความลิขสิทธิ์ และสีธีมหลัก/รอง ได้จากหน้า Admin Settings โดยไม่ต้องแก้โค้ดหรือ Deploy ใหม่
* กำหนดข้อบังคับ: วันที่ต้องจองล่วงหน้า (`advance_booking_days`), อนุญาตให้จองวันหยุดเสาร์-อาทิตย์ (`allow_weekend`), และจำนวนครั้งจองซ้ำสูงสุด (`max_recurring_count`)

### 7. 📊 แดชบอร์ด รายงาน และ Audit Logs
* แสดงสถิติภาพรวม ยอดการจอง สัดส่วนการใช้งานห้องประชุม และแนวโน้มรายวัน
* บันทึกประวัติการดำเนินงานสำคัญ (Audit Logs) เพิ่มความโปร่งใสและความปลอดภัย

---

## 🏗️ สถาปัตยกรรมระบบ (System Architecture)

ระบบฝั่ง Backend ถูกออกแบบตามหลัก **Hexagonal Architecture (Ports & Adapters)** เพื่อแยก Business Logic ออกจาก Framework และฐานข้อมูล:

```
apps/brms/
├── backend/
│   ├── api/                     # Entrypoints
│   ├── internal/
│   │   ├── core/
│   │   │   ├── domain/          # Entities: User, Room, Booking, Setting, Log
│   │   │   ├── ports/           # Interfaces: Repositories & Services
│   │   │   └── services/        # Business Logic (Booking, Auth, Setting, ...)
│   │   └── adapters/
│   │       ├── handlers/http/   # Fiber Controllers, RBAC, Middleware
│   │       └── storage/         # GORM PostgreSQL, Cloudinary
│   ├── pkg/bootstrap/           # Application Dependency Injection
│   └── main.go
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router (Pages & Layouts)
│   │   ├── components/          # Reusable UI & Modals
│   │   ├── hooks/               # Custom React Hooks
│   │   ├── store/               # Zustand Auth Store
│   │   └── types/               # TypeScript Definitions
├── docs/
│   └── spec.md                  # เอกสาร System Specification เชิงลึก
├── gemini.md                    # เอกสารบริบทสำหรับ AI Assistant
└── docker-compose.yml           # Docker Deployment Config
```

---

## 🚀 การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
* [Docker](https://docs.docker.com/get-docker/) และ [Docker Compose](https://docs.docker.com/compose/)
* *(สำหรับการพัฒนาแบบ Manual)*: Go 1.25+, Node.js 20+ หรือ Bun 1.3+, PostgreSQL 15+

---

### วิธีที่ 1: รันด้วย Docker Compose (แนะนำสำหรับ Production / Testing)

1. **คัดลอกไฟล์ Environment Variables:**
   ```bash
   cp .env.example .env
   ```

2. **ปรับแต่งการตั้งค่าใน `.env` ตามต้องการ:**
   ```env
   DB_HOST=brms-db
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=tunorth-brms_db
   DB_PORT=5432
   ALLOW_ORIGINS=*
   NEXT_PUBLIC_API_URL=http://localhost:8080
   JWT_SECRET=your-super-secret-jwt-key
   ```

3. **สั่ง Start Service ทั้งหมด:**
   ```bash
   docker-compose up -d --build
   ```

4. **เข้าใช้งานระบบ:**
   * Frontend: [http://localhost:3000](http://localhost:3000)
   * Backend API: [http://localhost:8080](http://localhost:8080)

---

### วิธีที่ 2: รันเพื่อการพัฒนาเฉพาะส่วน (Manual Development)

#### 1. Backend (Go)
```bash
cd backend

# ดาวน์โหลด Go modules
go mod download

# รัน Server
go run main.go

# ทดสอบรัน Automated Tests
go test -v ./internal/core/services/...
```

#### 2. Frontend (Next.js)
```bash
cd frontend

# ติดตั้ง Dependencies
bun install
# หรือ npm install

# รัน Development Server
bun dev
# หรือ npm run dev
```

---

## 🔑 บัญชีเริ่มต้นสำหรับผู้ดูแลระบบ (Default Credentials)

เมื่อระบบเริ่มต้นทำงานเป็นครั้งแรก Backend จะสร้างบัญชีผู้ดูแลระบบให้อัตโนมัติ:

* **Username:** `admin`
* **Password:** `admin1234`
* **Role:** `admin`

> ⚠️ **ข้อควรระวัง:** โปรดเปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบครั้งแรกผ่านหน้า **ข้อมูลส่วนตัว** เพื่อความปลอดภัย

---

## 🧪 การทดสอบ (Testing)

โปรเจกต์มี Unit Tests ครอบคลุมการทำงานของ Booking Engine:
```bash
cd backend
go test -v ./internal/core/services/...
```

กรณีทดสอบที่ครอบคลุม:
* ✅ `TestCheckSlotsAvailability`: ตรวจสอบวันว่าง วันชน และความถูกต้องของเวลา
* ✅ `TestCreateRecurringBooking_Success`: ตรวจสอบการสร้าง Group UUID, ลำดับ Index และการบันทึกแบบชุด
* ✅ `TestCreateRecurringBooking_ExceedsLimit`: ตรวจสอบการป้องกันการจองเกินขีดจำกัดสูงสุด
* ✅ `TestUpdateAndCancelRecurringGroup`: ตรวจสอบการอนุมัติและการยกเลิกการจองทั้งชุด

---

## 📚 เอกสารประกอบเพิ่มเติม (Documentation)

* 📄 [System Specification (docs/spec.md)](docs/spec.md): รายละเอียดสถาปัตยกรรม แบบจำลองข้อมูล และข้อกำหนด API ทั้งหมด
* 📄 [Gemini & AI Context (gemini.md)](gemini.md): แนวทางและกฎเกณฑ์สำหรับ AI Assistant ในการพัฒนาต่อยอด

---

## 📄 ใบอนุญาตและลิขสิทธิ์ (License & Credits)

ลิขสิทธิ์ © 2026 **โรงเรียนเตรียมอุดมศึกษาภาคเหนือ (Triam Udom Suksa School of the North)**  
พัฒนาเพื่อส่งเสริมการบริหารจัดการสถานศึกษาด้วยเทคโนโลยีดิจิทัลอย่างมีประสิทธิภาพ
