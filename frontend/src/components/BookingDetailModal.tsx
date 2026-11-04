"use client";

// 1. เพิ่ม DialogDescription เข้าไปใน import
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Booking } from "@/types/booking";
import {
  MapPin,
  Phone,
  Users,
  Clock,
  User,
  Image as ImageIcon,
} from "lucide-react";
import { API_URL } from "@/config";

interface BookingDetailModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingDetailModal({
  booking,
  isOpen,
  onClose,
}: BookingDetailModalProps) {
  if (!booking) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
            อนุมัติแล้ว
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200">
            รออนุมัติ
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
            ไม่อนุมัติ
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 1. แก้บรรทัดนี้: เพิ่ม max-h-[90vh] และ flex flex-col */}
      <DialogContent className="sm:max-w-125 font-sans bg-white max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center border-b pb-4 text-slate-900">
            {booking.subject}
          </DialogTitle>
          <DialogDescription className="text-center text-slate-500 text-sm">
            รายละเอียดข้อมูลการขอใช้ห้องประชุม
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto px-1">
          {booking.recurring_group_id && (
            <div className="grid grid-cols-3 gap-2 text-sm bg-purple-50/70 p-3 rounded-xl border border-purple-100">
              <div className="font-bold text-purple-900">รูปแบบการจอง:</div>
              <div className="col-span-2 text-purple-800 font-medium">
                {booking.recurrence_type === "weekly"
                  ? "จองซ้ำรายสัปดาห์"
                  : "จองหลายวันเวลาเดียวกัน"}{" "}
                (ครั้งที่ {booking.recurrence_index} จากทั้งหมด{" "}
                {booking.recurrence_total} ครั้ง)
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">ห้องประชุม:</div>
            <div className="col-span-2 text-slate-900 flex items-center gap-2">
              <MapPin size={16} className="text-tu-pink" />
              {booking.room?.room_name || "-"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">ผู้จอง:</div>
            <div className="col-span-2 text-slate-900 flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              {booking.user?.full_name || "-"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">ฝ่าย/งาน:</div>
            <div className="col-span-2 text-slate-900">
              {booking.department || "-"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">เบอร์โทร:</div>
            <div className="col-span-2 text-slate-900 flex items-center gap-2">
              <Phone size={16} className="text-slate-400" />
              {booking.phone || "-"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">จำนวนผู้เข้าใช้:</div>
            <div className="col-span-2 text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              {booking.attendees ? `${booking.attendees} คน` : "-"}
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">เวลาเริ่ม:</div>
            <div className="col-span-2 text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-green-600" />
              {formatDate(booking.start_time)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">เวลาสิ้นสุด:</div>
            <div className="col-span-2 text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-red-500" />
              {formatDate(booking.end_time)}
            </div>
          </div>

          <hr className="border-gray-100 my-2" />

          {/* เพิ่มส่วนแสดงอุปกรณ์ แยกออกมา */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">อุปกรณ์ที่ต้องการ:</div>
            <div className="col-span-2 text-slate-900 flex flex-col">
              {/* แสดงอุปกรณ์ที่เลือกจาก Checkbox */}
              {booking.booking_resources && booking.booking_resources.length > 0 ? (
                <span>
                  {booking.booking_resources.map((br: any) => br.resource?.resource_name).filter(Boolean).join(', ')}
                </span>
              ) : null}
              
              {/* แสดงข้อความที่พิมพ์เพิ่มเติม (ถ้ามี) */}
              {booking.resource_text && (
                <span className={booking.booking_resources && booking.booking_resources.length > 0 ? "mt-1" : ""}>
                  {booking.resource_text}
                </span>
              )}

              {/* ถ้าไม่มีทั้งคู่ให้แสดง - */}
              {(!booking.booking_resources || booking.booking_resources.length === 0) && !booking.resource_text && (
                <span>-</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-bold text-slate-700">หมายเหตุ:</div>
            <div className="col-span-2 text-slate-900">
              {booking.note || "-"}
            </div>
          </div>

          {/* เพิ่มส่วนแสดงรูปภาพ */}
          {booking.layout_image && (
            <div className="grid grid-cols-3 gap-2 text-sm mt-2">
              <div className="font-bold text-slate-700 flex items-start gap-1">
                รูปแบบห้อง:
              </div>
              <div className="col-span-2">
                <a
                  href={
                    booking.layout_image.startsWith("http")
                      ? booking.layout_image
                      : `${API_URL}${booking.layout_image}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={
                      booking.layout_image.startsWith("http")
                        ? booking.layout_image
                        : `${API_URL}${booking.layout_image}`
                    }
                    alt="Layout"
                    className="w-full h-auto rounded-md border hover:opacity-90 transition-opacity"
                    style={{ maxHeight: "150px", objectFit: "cover" }}
                  />
                  <span className="text-xs text-tu-pink mt-1 inline-flex items-center gap-1">
                    <ImageIcon size={12} /> คลิกเพื่อดูรูปใหญ่
                  </span>
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-sm items-center">
            <div className="font-bold text-slate-700">สถานะ:</div>
            <div className="col-span-2">{getStatusBadge(booking.status)}</div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center mt-4 pt-2 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="bg-tu-pink text-white hover:bg-tu-pink-hover w-full sm:w-auto px-8"
          >
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
