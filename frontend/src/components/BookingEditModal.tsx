"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_URL } from "@/config";
import { Booking } from "@/types/booking";
import { Room } from "@/types/room";
import { Resource } from "@/types/resource";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface BookingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: () => void;
}

export default function BookingEditModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: BookingEditModalProps) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    subject: "",
    room_id: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    note: "",
    department: "",
    phone: "",
    attendees: "",
    resources: [] as string[],
  });

  const [layoutImage, setLayoutImage] = useState<File | null>(null);
  const [resourceOptions, setResourceOptions] = useState<Resource[]>([]);

  // Fetch Rooms and Resources for Dropdown
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [roomsRes, resourcesRes] = await Promise.all([
            fetch(`${API_URL}/api/rooms`),
            fetch(`${API_URL}/api/resources`)
          ]);
          if (roomsRes.ok) {
            setRooms(await roomsRes.json());
          }
          if (resourcesRes.ok) {
            setResourceOptions(await resourcesRes.json());
          }
        } catch (e) {
          console.error("Failed to load data", e);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  // Initialize Form with Booking Data
  useEffect(() => {
    if (booking) {
      const start = new Date(booking.start_time);
      const end = new Date(booking.end_time);

      setFormData({
        subject: booking.subject,
        room_id: booking.room_id.toString(),
        start_date: start.toISOString().split("T")[0],
        start_time: start.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        end_date: end.toISOString().split("T")[0],
        end_time: end.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        note: booking.note || "",
        department: booking.department || "",
        phone: booking.phone || "",
        attendees: booking.attendees ? booking.attendees.toString() : "",
        resources: booking.resource_text && booking.resource_text !== "-"
          ? booking.resource_text.split(",").map((s) => s.trim())
          : [],
      });
      setLayoutImage(null);
    }
  }, [booking]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLayoutImage(e.target.files[0]);
    }
  };

  const handleResourceChange = (checked: boolean, resourceName: string) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        resources: [...prev.resources, resourceName],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        resources: prev.resources.filter((r) => r !== resourceName),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setLoading(true);

    try {
      const startDateTime = new Date(
        `${formData.start_date}T${formData.start_time}`
      );
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

      const formDataToSend = new FormData();
      formDataToSend.append("subject", formData.subject);
      formDataToSend.append("room_id", formData.room_id);
      formDataToSend.append("start_time", startDateTime.toISOString());
      formDataToSend.append("end_time", endDateTime.toISOString());
      formDataToSend.append("note", formData.note);
      formDataToSend.append("department", formData.department);
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("attendees", formData.attendees || "0");
      formDataToSend.append(
        "resource_text",
        formData.resources.length > 0 ? formData.resources.join(", ") : "-"
      );
      
      if (layoutImage) {
        formDataToSend.append("layout_image", layoutImage);
      }

      const res = await fetch(`${API_URL}/api/bookings/${booking.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!res.ok) throw new Error("Correction failed");

      toast.success("แก้ไขข้อมูลสำเร็จ");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการแก้ไข");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl bg-white p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 bg-slate-50 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800">
            แก้ไขข้อมูลการจอง
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            แก้ไขรายละเอียดการจองห้องประชุม
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden max-h-full">
          <div className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>หัวข้อการประชุม</Label>
            <Input
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>ห้องประชุม</Label>
            <Select
              value={formData.room_id}
              onValueChange={(val) =>
                setFormData((prev) => ({ ...prev, room_id: val }))
              }
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="เลือกห้อง" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="w-[var(--radix-select-trigger-width)] bg-white"
              >
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.room_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>เริ่ม</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="rounded-xl flex-1"
                  required
                />
                <Input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="rounded-xl w-24"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>สิ้นสุด</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="rounded-xl flex-1"
                  required
                />
                <Input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="rounded-xl w-24"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>ฝ่าย/หน่วยงาน</Label>
              <Input
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>เบอร์โทรติดต่อ</Label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>จำนวนผู้เข้าร่วม (คน)</Label>
              <Input
                type="number"
                name="attendees"
                value={formData.attendees}
                onChange={handleChange}
                className="rounded-xl"
                min="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>อุปกรณ์ที่ต้องการ</Label>
            {resourceOptions.length === 0 ? (
              <p className="text-sm text-slate-400">ไม่มีข้อมูลอุปกรณ์</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {resourceOptions.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-res-${item.id}`}
                      checked={formData.resources.includes(item.resource_name)}
                      onCheckedChange={(checked) =>
                        handleResourceChange(checked as boolean, item.resource_name)
                      }
                    />
                    <label
                      htmlFor={`edit-res-${item.id}`}
                      className="text-sm font-medium leading-none cursor-pointer text-slate-700"
                    >
                      {item.resource_name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>รูปแบบการจัดห้อง (เปลี่ยนรูปใหม่ - ถ้ามี)</Label>
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <Input
                id="edit_layout_image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleFileChange(e);
                  const file = e.target.files?.[0];
                  const span = document.getElementById("edit-file-name-display");
                  if (span)
                    span.innerText = file ? file.name : "ไม่ได้เลือกไฟล์ใด";
                }}
              />
              <Label
                htmlFor="edit_layout_image"
                className="bg-white text-slate-700 hover:text-tu-pink border border-slate-200 hover:border-tu-pink shadow-sm transition-all px-4 py-2 rounded-lg cursor-pointer text-sm font-medium"
              >
                เลือกไฟล์รูปภาพ
              </Label>
              <span
                id="edit-file-name-display"
                className="text-sm text-slate-400 italic"
              >
                ไม่ได้เลือกไฟล์ใด
              </span>
            </div>
            {booking?.layout_image && !layoutImage && (
              <p className="text-sm text-slate-500 mt-2">
                * มีรูปภาพเดิมอยู่แล้ว หากไม่เลือกไฟล์ใหม่จะใช้รูปเดิม
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>หมายเหตุ</Label>
            <Textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="rounded-xl min-h-[80px]"
            />
          </div>

          </div>

          <DialogFooter className="px-6 py-4 gap-2 bg-slate-50 border-t border-slate-100 mt-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-lg border-slate-200"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="bg-tu-pink hover:bg-tu-pink-hover text-white rounded-lg"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "บันทึกการแก้ไข"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
