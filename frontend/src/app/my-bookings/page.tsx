"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Booking } from "@/types/booking";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, Trash2, Repeat, AlertTriangle } from "lucide-react";
import { API_URL } from "@/config";

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isInitialized } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for cancelling recurring series
  const [cancelTargetBooking, setCancelTargetBooking] =
    useState<Booking | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const fetchMyBookings = async () => {
    if (!user) return;
    try {
      const res = await fetch(
        `${API_URL}/api/bookings?user_id=${user.user_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const safeData = Array.isArray(data) ? data : [];
        const sorted = safeData.sort((a: Booking, b: Booking) => b.id - a.id);
        setBookings(sorted);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    fetchMyBookings();
  }, [isAuthenticated, router, user, token, isInitialized]);

  const handleCancelClick = (booking: Booking) => {
    if (booking.recurring_group_id) {
      setCancelTargetBooking(booking);
      setIsCancelModalOpen(true);
      return;
    }

    if (!confirm("คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?")) return;
    executeCancelSingle(booking.id);
  };

  const executeCancelSingle = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("ยกเลิกการจองสำเร็จ");
        fetchMyBookings();
      } else {
        const errData = await res.json();
        toast.error(
          `ไม่สามารถยกเลิกได้: ${errData.error || res.statusText}`
        );
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsCancelModalOpen(false);
      setCancelTargetBooking(null);
    }
  };

  const executeCancelGroup = async (groupId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/group/${groupId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("ยกเลิกการจองทั้งชุดเรียบร้อยแล้ว");
        fetchMyBookings();
      } else {
        const errData = await res.json();
        toast.error(
          `ไม่สามารถยกเลิกการจองทั้งชุดได้: ${
            errData.error || res.statusText
          }`
        );
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsCancelModalOpen(false);
      setCancelTargetBooking(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading || !isInitialized)
    return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span className="bg-tu-pink/10 p-2 rounded-xl text-tu-pink">
              <CalendarClock size={32} />
            </span>
            ประวัติการจองของฉัน
          </h1>
          <p className="text-slate-500 mt-1 ml-14">
            ติดตามสถานะและจัดการการจองห้องประชุมของคุณ
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-100">
                <TableHead className="text-slate-500 font-medium">
                  หัวข้อการประชุม
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  ห้อง
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  เวลาที่จอง
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  สถานะ
                </TableHead>
                <TableHead className="text-slate-500 font-medium w-12.5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="hover:bg-slate-50/50 border-b border-slate-50 last:border-none"
                >
                  <TableCell className="font-medium text-slate-800">
                    <div>{booking.subject}</div>
                    {booking.recurring_group_id && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Repeat size={11} />
                          ชุดการจอง ({booking.recurrence_index}/
                          {booking.recurrence_total})
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {booking.room?.room_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="text-slate-600">
                      {formatDate(booking.start_time)}
                    </div>
                    <div className="text-slate-400 text-xs">
                      ถึง {formatDate(booking.end_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.status === "pending" && (
                      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-0 shadow-none">
                        รออนุมัติ
                      </Badge>
                    )}
                    {booking.status === "approved" && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0 shadow-none">
                        อนุมัติแล้ว
                      </Badge>
                    )}
                    {booking.status === "rejected" && (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 shadow-none">
                        ไม่อนุมัติ
                      </Badge>
                    )}
                    {booking.status === "cancelled" && (
                      <Badge variant="outline" className="text-slate-500">
                        ยกเลิก
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {(booking.status === "pending" ||
                      booking.status === "approved") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full h-8 w-8"
                        onClick={() => handleCancelClick(booking)}
                        title="ยกเลิกการจอง"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {bookings.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-32 text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p>คุณยังไม่มีรายการจองห้องประชุม</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cancel Recurring Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="text-amber-500" size={20} />
              ยกเลิกการจองแบบชุด
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              รายการนี้เป็นส่วนหนึ่งของชุดการจอง &quot;
              {cancelTargetBooking?.subject}&quot; (ครั้งที่{" "}
              {cancelTargetBooking?.recurrence_index} จากทั้งหมด{" "}
              {cancelTargetBooking?.recurrence_total} ครั้ง)
              <br />
              คุณต้องการยกเลิกเฉพาะรายการวันนี้ หรือยกเลิกทั้งหมดในชุดนี้?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
              className="w-full sm:w-auto"
            >
              ปิด
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                cancelTargetBooking &&
                executeCancelSingle(cancelTargetBooking.id)
              }
              className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              ยกเลิกเฉพาะรายการวันนี้
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                cancelTargetBooking?.recurring_group_id &&
                executeCancelGroup(cancelTargetBooking.recurring_group_id)
              }
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              ยกเลิกทุกรายการในชุด (
              {cancelTargetBooking?.recurrence_total} ครั้ง)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
