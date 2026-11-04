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
import {
  Check,
  CheckCheck,
  X,
  Eye,
  CalendarCheck,
  Pencil,
  Trash2,
  Repeat,
  AlertTriangle,
} from "lucide-react";
import BookingDetailModal from "@/components/BookingDetailModal";
import BookingEditModal from "@/components/BookingEditModal";
import { API_URL } from "@/config";

export default function ManageBookingsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isInitialized } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State สำหรับ Delete Recurring Modal
  const [deleteTargetBooking, setDeleteTargetBooking] =
    useState<Booking | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: Booking, b: Booking) => b.id - a.id);
        setBookings(sorted);
      }
    } catch (error) {
      console.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchBookings();
  }, [isAuthenticated, isInitialized, router, token]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success(
        `อัปเดตสถานะเป็น ${
          newStatus === "approved" ? "อนุมัติ" : "ไม่อนุมัติ"
        } แล้ว`
      );
      fetchBookings();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  const handleUpdateGroupStatus = async (
    groupId: string,
    newStatus: string
  ) => {
    try {
      const res = await fetch(
        `${API_URL}/api/bookings/group/${groupId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) throw new Error("Update group failed");

      toast.success(
        `อัปเดตสถานะทั้งชุดเป็น ${
          newStatus === "approved" ? "อนุมัติทั้งชุด" : "ไม่อนุมัติทั้งชุด"
        } เรียบร้อยแล้ว`
      );
      fetchBookings();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปเดตทั้งชุด");
    }
  };

  const handleViewDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (booking: Booking) => {
    if (booking.recurring_group_id) {
      setDeleteTargetBooking(booking);
      setIsDeleteModalOpen(true);
      return;
    }

    if (!confirm("คุณต้องการลบการจองนี้อย่างถาวรหรือไม่?")) return;
    executeDeleteSingle(booking.id);
  };

  const executeDeleteSingle = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("ลบการจองเรียบร้อยแล้ว");
        fetchBookings();
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetBooking(null);
    }
  };

  const executeDeleteGroup = async (groupId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/bookings/group/${groupId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("ลบการจองทั้งชุดเรียบร้อยแล้ว");
        fetchBookings();
      } else {
        throw new Error("Delete group failed");
      }
    } catch (error) {
      toast.error("ลบการจองทั้งชุดไม่สำเร็จ");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetBooking(null);
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

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="container mx-auto py-10 px-4 space-y-8 font-sans">
      {/* Header & Toolbar Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span className="bg-tu-pink/10 p-2 rounded-xl text-tu-pink">
              <CalendarCheck size={32} />
            </span>
            จัดการการจอง
          </h1>
          <p className="text-slate-500 mt-1 ml-14">
            ตรวจสอบและอนุมัติรายการจองห้องประชุม (รองรับการจัดการแบบเดี่ยวและทั้งชุด)
          </p>
        </div>
      </div>

      {/* Table Section (Card) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-100">
                <TableHead className="w-12.5 text-slate-500 font-medium">
                  ID
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  หัวข้อ / ผู้จอง
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  ห้องประชุม
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  เวลาที่จอง
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  สถานะ
                </TableHead>
                <TableHead className="text-right text-slate-500 font-medium">
                  จัดการ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="hover:bg-slate-50/50 border-b border-slate-50 last:border-none"
                >
                  <TableCell className="font-medium text-slate-600">
                    {booking.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-800">
                      {booking.subject}
                    </div>
                    <div className="text-sm text-slate-500">
                      {booking.user?.full_name || "Unknown"}
                    </div>
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
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {booking.room?.room_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <div>เริ่ม: {formatDate(booking.start_time)}</div>
                    <div>ถึง: {formatDate(booking.end_time)}</div>
                  </TableCell>
                  <TableCell>
                    {booking.status === "pending" && (
                      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 shadow-none border-0">
                        รออนุมัติ
                      </Badge>
                    )}
                    {booking.status === "approved" && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 shadow-none border-0">
                        อนุมัติแล้ว
                      </Badge>
                    )}
                    {booking.status === "rejected" && (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-200 shadow-none border-0">
                        ไม่อนุมัติ
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 rounded-full border-slate-200 hover:bg-slate-50"
                        onClick={() => handleViewDetail(booking)}
                        title="ดูรายละเอียด"
                      >
                        <Eye size={16} className="text-slate-500" />
                      </Button>

                      {booking.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0 rounded-full text-white"
                            onClick={() =>
                              handleUpdateStatus(booking.id, "approved")
                            }
                            title="อนุมัติเฉพาะรายการนี้"
                          >
                            <Check size={16} />
                          </Button>

                          {booking.recurring_group_id && (
                            <Button
                              size="sm"
                              className="bg-emerald-700 hover:bg-emerald-800 h-8 px-2 rounded-full text-white text-xs gap-1"
                              onClick={() =>
                                handleUpdateGroupStatus(
                                  booking.recurring_group_id!,
                                  "approved"
                                )
                              }
                              title="อนุมัติทุกรายการในชุดนี้"
                            >
                              <CheckCheck size={14} />
                              <span className="hidden sm:inline">ทั้งชุด</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 w-8 p-0 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border-transparent shadow-none"
                            onClick={() =>
                              handleUpdateStatus(booking.id, "rejected")
                            }
                            title="ไม่อนุมัติเฉพาะรายการนี้"
                          >
                            <X size={16} />
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 rounded-full border-slate-200 hover:bg-slate-50"
                        onClick={() => handleEdit(booking)}
                        title="แก้ไข"
                      >
                        <Pencil size={16} className="text-slate-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 rounded-full border-slate-200 hover:bg-slate-50 hover:text-red-600"
                        onClick={() => handleDeleteClick(booking)}
                        title="ลบ"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center h-24 text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <p>ไม่มีรายการจอง</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Group Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="text-amber-500" size={20} />
              ยืนยันการลบการจองแบบชุด
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              รายการนี้เป็นส่วนหนึ่งของชุดการจอง &quot;
              {deleteTargetBooking?.subject}&quot; (ครั้งที่{" "}
              {deleteTargetBooking?.recurrence_index} จากทั้งหมด{" "}
              {deleteTargetBooking?.recurrence_total} ครั้ง)
              <br />
              คุณต้องการดำเนินการลบอย่างไร?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                deleteTargetBooking &&
                executeDeleteSingle(deleteTargetBooking.id)
              }
              className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              ลบเฉพาะรายการวันนี้
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteTargetBooking?.recurring_group_id &&
                executeDeleteGroup(deleteTargetBooking.recurring_group_id)
              }
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              ลบทุกรายการในชุด ({deleteTargetBooking?.recurrence_total} ครั้ง)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BookingDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        booking={selectedBooking}
      />

      {/* Edit Modal */}
      <BookingEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        booking={editingBooking}
        onSuccess={fetchBookings}
      />
    </div>
  );
}
