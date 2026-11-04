"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import thLocale from "@fullcalendar/core/locales/th";
import { Button } from "@/components/ui/button";
import { Room } from "@/types/room";
import { Booking } from "@/types/booking";
import BookingDetailModal from "@/components/BookingDetailModal";
import PopupModal from "@/components/PopupModal";
import { useAuthStore } from "@/store/authStore";
import { useSettings } from "@/hooks/useSettings";
import { UserCircle, CalendarDays, Plus } from "lucide-react";
import { API_URL } from "@/config";

export default function Home() {
  const router = useRouter();

  // 1. เรียกใช้ Store เพื่อดูสถานะ Login
  const { isAuthenticated, user } = useAuthStore();
  const { fetchSettings, get } = useSettings(); // Use Hook

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // 2. State ต่างๆ
  const[rooms, setRooms] = useState<Room[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State ป้องกัน Hydration Error
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // ดึงข้อมูลห้องมาแสดงเป็น Legend
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rooms`);
        if (res.ok) {
          const data = await res.json();
          setRooms(data);
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };
    fetchRooms();
  },[]);

  // 3. ฟังก์ชันดึงข้อมูลการจอง (ล็อคด้วย useCallback เพื่อกันปฏิทินกระพริบ)
  const fetchEvents = useCallback(
    async (info: any, successCallback: any, failureCallback: any) => {
      try {
        // Encode URL เพื่อป้องกันปัญหาเครื่องหมาย + ในวันที่
        const start = encodeURIComponent(info.startStr);
        const end = encodeURIComponent(info.endStr);

        const res = await fetch(
          `${API_URL}/api/bookings?start=${start}&end=${end}&status=approved`
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch bookings");
        }

        const bookings = await res.json();

        // แปลงข้อมูลให้ FullCalendar เข้าใจ
        const events = bookings.map((booking: any) => ({
          id: booking.id.toString(),
          title: booking.subject,
          start: booking.start_time,
          end: booking.end_time,
          backgroundColor: booking.room?.color || "#94a3b8",
          borderColor: booking.room?.color || "#94a3b8",
          // เก็บข้อมูลเต็มๆ ไว้ส่งให้ Modal
          extendedProps: {
            fullBookingData: booking,
          },
        }));

        successCallback(events);
      } catch (error) {
        console.error("Error loading events:", error);
        failureCallback(error);
      }
    },
    [] // dependency ว่าง หมายถึงไม่ต้องสร้างฟังก์ชันใหม่เลย[1, 3]
  );

  // 4. เมื่อคลิกที่ Event (ล็อคด้วย useCallback)
  const handleEventClick = useCallback((info: any) => {
    const bookingData = info.event.extendedProps.fullBookingData;
    setSelectedBooking(bookingData);
    setIsModalOpen(true);
  },[]);

  // 5. ปรับหน้าตาภายในแถบ Event (ล็อคด้วย useCallback)
  const renderEventContent = useCallback((eventInfo: any) => {
    return (
      <div className="flex items-center w-full overflow-hidden px-1.5 py-0.5 cursor-pointer hover:opacity-90 transition-opacity">
        <span className="font-bold bg-white/20 rounded-[4px] px-1 mr-1.5 text-[10px] whitespace-nowrap leading-tight">
          {eventInfo.timeText}
        </span>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[11px] font-medium truncate leading-tight">
            {eventInfo.event.title}
          </span>
        </div>
      </div>
    );
  },[]);

  // 6. เมื่อคลิกที่วันที่ (สำหรับจอง) (ล็อคด้วย useCallback)
  const handleDateClick = useCallback(
    (info: any) => {
      if (isAuthenticated) {
        // Redirect ไปหน้าจอง พร้อมส่งวันที่ไปด้วย
        router.push(`/booking/create?date=${info.dateStr}`);
      }
    },[isAuthenticated, router] // นำ dependency ที่ถูกเรียกใช้ด้านในมาใส่
  );

  // ถ้ายังโหลด Client ไม่เสร็จ ห้าม render เพื่อกัน Hydration Error
  if (!isMounted) return null;

  return (
    <div className=" bg-white rounded-3xl shadow-sm border border-slate-100 p-3 md:p-6 h-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="bg-tu-pink/10 p-2.5 rounded-2xl text-tu-pink hidden md:block">
            <CalendarDays size={28} />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              ปฏิทินการจองห้องประชุม
            </h2>
            <p className="text-slate-500 text-sm hidden md:block">
              ตรวจสอบตารางว่างและจองห้องประชุมออนไลน์
            </p>
          </div>
        </div>

        {/* Logic ปุ่มขวาบน */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isAuthenticated ? (
            <>
              {user && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-100 px-4 py-2 rounded-full">
                  <UserCircle size={18} className="text-tu-pink" />
                  <span className="font-bold truncate">{user.username}</span>
                  <span className="text-xs text-slate-400 border-l border-slate-300 pl-2 ml-1 uppercase font-semibold">
                    {user.role}
                  </span>
                </div>
              )}

              <Button
                onClick={() => router.push("/booking/create")}
                className="w-full md:w-auto bg-tu-pink hover:bg-tu-pink-hover text-white rounded-full shadow-lg shadow-tu-pink/20 px-6"
              >
                <Plus className="mr-2 h-4 w-4" /> จองห้องประชุม
              </Button>
            </>
          ) : (
            <Button
              onClick={() => router.push("/login")}
              className="w-full md:w-auto bg-tu-pink hover:bg-tu-pink-hover text-white rounded-full px-8"
            >
              เข้าสู่ระบบ
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Area */}
      <div className="flex-1 calendar-container text-sm md:text-base mb-6">
        <style jsx global>{`
          .fc-header-toolbar {
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1.5rem !important;
          }
          .fc-toolbar-title {
            font-size: 1.25rem !important;
            font-weight: 700 !important;
            color: #1e293b;
          }
          .fc-button {
            border-radius: 9999px !important; /* Rounded full buttons */
            font-weight: 500 !important;
            text-transform: capitalize;
            padding: 0.4rem 1rem !important;
          }
          .fc-button-primary {
            background-color: white !important;
            border-color: #e2e8f0 !important;
            color: #64748b !important;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          }
          .fc-button-primary:hover {
            background-color: #f8fafc !important;
            border-color: #cbd5e1 !important;
            color: #334155 !important;
          }
          .fc-button-active {
            background-color: ${get(
              "theme_color",
              "#f472b6"
            )} !important; /* Dynamic Color */
            border-color: ${get("theme_color", "#f472b6")} !important;
            color: white !important;
          }
          .fc-col-header-cell-cushion {
            font-weight: 600;
            color: #475569;
            padding: 12px 0 !important;
            text-decoration: none !important;
          }
          .fc-day-today {
            background-color: #fdf2f8 !important; /* pink-50 */
          }
          .fc-daygrid-event {
            border: none !important;
            margin-top: 2px !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .fc-event-main {
            padding: 2px;
          }
          .fc-popover {
            border-radius: 16px !important;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
            border: 1px solid #f1f5f9 !important;
          }
          .fc-popover-header {
            background: #f8fafc !important;
            padding: 10px !important;
            border-bottom: 1px solid #e2e8f0 !important;
            border-radius: 16px 16px 0 0 !important;
          }
          .fc-daygrid-day-frame:hover .opacity-0 {
            opacity: 1 !important;
          }
          .fc-daygrid-day-frame {
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .fc-daygrid-day-frame:hover {
            background-color: #f8fafc;
          }
        `}</style>
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            listPlugin,
          ]}
          initialView="dayGridMonth"
          locale={thLocale}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            meridiem: false,
          }}
          eventDisplay="block"
          eventContent={renderEventContent}
          dayCellContent={(args) => (
            <div className="w-full flex justify-between items-start">
              <span className="text-slate-700 font-medium z-10">
                {args.dayNumberText}
              </span>
              {isAuthenticated && (
                <div className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all duration-200">
                  <div className="bg-tu-pink/10 text-tu-pink rounded-full p-1 cursor-pointer hover:bg-tu-pink hover:text-white shadow-sm">
                    <Plus size={14} strokeWidth={2.5} />
                  </div>
                </div>
              )}
            </div>
          )}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,listMonth",
          }}
          events={fetchEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          height="auto"
          contentHeight="auto"
          aspectRatio={1.5}
        />
      </div>

      {/* Legend Area */}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
          ห้องประชุมและสีที่ใช้แสดง:
        </h3>
        {rooms.length === 0 ? (
          <p className="text-sm text-slate-400">กำลังโหลดข้อมูลห้อง...</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: room.color || "#ccc" }}
                ></span>
                <span className="text-sm font-medium text-slate-700">
                  {room.room_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Details */}
      <BookingDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        booking={selectedBooking}
      />
      <PopupModal />
    </div>
  );
}