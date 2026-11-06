"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Room } from "@/types/room";
import { Resource } from "@/types/resource";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  CalendarPlus,
  Calendar,
  Repeat,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/config";

type BookingMode = "single" | "weekly" | "multi_date";

interface SlotItem {
  dateStr: string;
  start_time: string;
  end_time: string;
}

interface SlotCheckResult {
  slot: {
    start_time: string;
    end_time: string;
  };
  available: boolean;
  reason?: string;
}

function getThaiDayOfWeek(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = [
    "วันอาทิตย์",
    "วันจันทร์",
    "วันอังคาร",
    "วันพุธ",
    "วันพฤหัสบดี",
    "วันศุกร์",
    "วันเสาร์",
  ];
  return days[date.getDay()];
}

function formatThaiDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CreateBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date"); // Get date from URL

  const { user, token, isAuthenticated, isInitialized } = useAuthStore();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [resourceOptions, setResourceOptions] = useState<Resource[]>([]);
  const [maxRecurringCount, setMaxRecurringCount] = useState<number>(12);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Booking Mode
  const [bookingMode, setBookingMode] = useState<BookingMode>("single");

  // State สำหรับฟอร์มข้อมูลทั่วไป
  const [formData, setFormData] = useState({
    subject: "",
    room_id: "",

    // สำหรับโหมด Single
    start_date: dateParam || "",
    start_time: "",
    end_date: dateParam || "",
    end_time: "",

    department: "",
    phone: "",
    attendees: "",
    note: "",

    resources: [] as string[],
    layout_image: null as File | null,
  });

  // State สำหรับ Weekly Recurring
  const [weeklyStartDate, setWeeklyStartDate] = useState(dateParam || "");
  const [weeklyWeeksCount, setWeeklyWeeksCount] = useState(4);
  const [weeklyStartTime, setWeeklyStartTime] = useState("09:00");
  const [weeklyEndTime, setWeeklyEndTime] = useState("12:00");

  // State สำหรับ Multi-Date
  const [multiDates, setMultiDates] = useState<string[]>(
    dateParam ? [dateParam] : []
  );
  const [newDateInput, setNewDateInput] = useState("");
  const [multiStartTime, setMultiStartTime] = useState("09:00");
  const [multiEndTime, setMultiEndTime] = useState("12:00");

  // State สำหรับการตรวจเวลาชน
  const [checkResults, setCheckResults] = useState<SlotCheckResult[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const fetchData = async () => {
      try {
        // Fetch Rooms (Only active ones, sorted by id ASC)
        const roomsRes = await fetch(`${API_URL}/api/rooms?status=active`);
        if (roomsRes.ok) {
          const roomsData: Room[] = await roomsRes.json();
          const sortedRooms = Array.isArray(roomsData)
            ? [...roomsData].sort((a, b) => a.id - b.id)
            : [];
          setRooms(sortedRooms);
        }

        // Fetch Resources
        const resRes = await fetch(`${API_URL}/api/resources`);
        if (resRes.ok) {
          const resData = await resRes.json();
          setResourceOptions(resData);
        }

        // Fetch Public Settings for max_recurring_count
        const settingsRes = await fetch(`${API_URL}/api/settings/public`);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.max_recurring_count) {
            const count = parseInt(settingsData.max_recurring_count, 10);
            if (!isNaN(count) && count > 0) {
              setMaxRecurringCount(count);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, router, isInitialized]);

  // Generate candidate slots based on mode
  const candidateSlots: SlotItem[] = useMemo(() => {
    if (bookingMode === "weekly") {
      if (!weeklyStartDate || !weeklyStartTime || !weeklyEndTime) return [];
      const count = Math.min(
        Math.max(1, weeklyWeeksCount),
        maxRecurringCount
      );
      const [year, month, day] = weeklyStartDate.split("-").map(Number);
      const slots: SlotItem[] = [];

      for (let i = 0; i < count; i++) {
        const d = new Date(year, month - 1, day + i * 7);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, "0");
        const dStr = String(d.getDate()).padStart(2, "0");
        const dateFormatted = `${yStr}-${mStr}-${dStr}`;

        const startDT = new Date(`${dateFormatted}T${weeklyStartTime}`);
        const endDT = new Date(`${dateFormatted}T${weeklyEndTime}`);

        slots.push({
          dateStr: dateFormatted,
          start_time: startDT.toISOString(),
          end_time: endDT.toISOString(),
        });
      }
      return slots;
    } else if (bookingMode === "multi_date") {
      if (!multiStartTime || !multiEndTime || multiDates.length === 0) return [];
      const sortedDates = [...multiDates].sort();
      return sortedDates.map((dateFormatted) => {
        const startDT = new Date(`${dateFormatted}T${multiStartTime}`);
        const endDT = new Date(`${dateFormatted}T${multiEndTime}`);
        return {
          dateStr: dateFormatted,
          start_time: startDT.toISOString(),
          end_time: endDT.toISOString(),
        };
      });
    }
    return [];
  }, [
    bookingMode,
    weeklyStartDate,
    weeklyWeeksCount,
    weeklyStartTime,
    weeklyEndTime,
    multiDates,
    multiStartTime,
    multiEndTime,
    maxRecurringCount,
  ]);

  // Check conflicts with Backend
  const handleCheckConflicts = async () => {
    if (!formData.room_id) {
      toast.warning("กรุณาเลือกห้องประชุมก่อนตรวจสอบความพร้อม");
      return;
    }
    if (candidateSlots.length === 0) {
      toast.warning("กรุณาระบุวันและเวลาที่ต้องการตรวจสอบ");
      return;
    }

    setIsCheckingSlots(true);
    setCheckResults([]);
    try {
      const payload = {
        room_id: parseInt(formData.room_id, 10),
        slots: candidateSlots.map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
        })),
      };

      const res = await fetch(`${API_URL}/api/bookings/check-conflicts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "ตรวจสอบไม่สำเร็จ");
      }

      const data: SlotCheckResult[] = await res.json();
      setCheckResults(data);

      const conflicts = data.filter((d) => !d.available);
      if (conflicts.length > 0) {
        toast.warning(
          `พบห้องไม่ว่าง ${conflicts.length} จากทั้งหมด ${data.length} วันที่เลือก`,
          {
            description: "คุณสามารถกดยืนยันจองเฉพาะวันที่ว่างได้",
          }
        );
      } else {
        toast.success(`ห้องว่างพร้อมใช้งานครบทุกวันที่เลือก (${data.length} วัน)`);
      }
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบ", {
        description: error.message,
      });
    } finally {
      setIsCheckingSlots(false);
    }
  };

  // Reset check results when inputs change
  useEffect(() => {
    setCheckResults([]);
    setExcludedDates(new Set());
  }, [
    bookingMode,
    formData.room_id,
    weeklyStartDate,
    weeklyWeeksCount,
    weeklyStartTime,
    weeklyEndTime,
    multiDates,
    multiStartTime,
    multiEndTime,
  ]);

  const handleAddMultiDate = () => {
    if (!newDateInput) return;
    if (multiDates.includes(newDateInput)) {
      toast.warning("วันที่นี้ถูกเลือกไปแล้ว");
      return;
    }
    if (multiDates.length >= maxRecurringCount) {
      toast.warning(`สามารถเลือกได้สูงสุด ${maxRecurringCount} วัน`);
      return;
    }
    setMultiDates((prev) => [...prev, newDateInput].sort());
    setNewDateInput("");
  };

  const handleRemoveMultiDate = (dateToRemove: string) => {
    setMultiDates((prev) => prev.filter((d) => d !== dateToRemove));
  };

  const toggleExcludeDate = (dateStr: string) => {
    setExcludedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  const handleSelectOnlyAvailable = () => {
    const conflicted = new Set<string>();
    checkResults.forEach((cr, index) => {
      if (!cr.available && candidateSlots[index]) {
        conflicted.add(candidateSlots[index].dateStr);
      }
    });
    setExcludedDates(conflicted);
    toast.info("เลือกเฉพาะวันที่ห้องว่างเรียบร้อยแล้ว");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoomChange = (value: string) => {
    setFormData((prev) => ({ ...prev, room_id: value }));
  };

  const handleResourceChange = (checked: boolean, value: string) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        resources: [...prev.resources, value],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        resources: prev.resources.filter((r) => r !== value),
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, layout_image: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.room_id) {
        throw new Error("กรุณาเลือกห้องประชุม");
      }
      if (!formData.subject.trim()) {
        throw new Error("กรุณาระบุหัวข้อการประชุม");
      }

      const formDataToSend = new FormData();
      formDataToSend.append("user_id", user?.user_id.toString() || "");
      formDataToSend.append("room_id", formData.room_id);
      formDataToSend.append("subject", formData.subject);
      formDataToSend.append("department", formData.department);
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("attendees", formData.attendees || "0");
      formDataToSend.append("note", formData.note);

      // จัดการรายชื่ออุปกรณ์
      if (formData.resources.length > 0) {
        const selectedResourceLabels = formData.resources
          .map((r) => {
            const found = resourceOptions.find((o) => o.id.toString() === r);
            return found ? found.resource_name : null;
          })
          .filter(Boolean)
          .join(", ");
        formDataToSend.append("resource_text", selectedResourceLabels);
      } else {
        formDataToSend.append("resource_text", "-");
      }

      if (formData.layout_image) {
        formDataToSend.append("layout_image", formData.layout_image);
      }

      // Case 1: จองครั้งเดียว (Single)
      if (bookingMode === "single") {
        if (
          !formData.start_date ||
          !formData.start_time ||
          !formData.end_date ||
          !formData.end_time
        ) {
          throw new Error("กรุณาระบุวันและเวลาเริ่มต้น-สิ้นสุดให้ครบถ้วน");
        }

        const startDateTime = new Date(
          `${formData.start_date}T${formData.start_time}`
        );
        const endDateTime = new Date(
          `${formData.end_date}T${formData.end_time}`
        );

        if (startDateTime >= endDateTime) {
          throw new Error("เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด");
        }

        formDataToSend.append("start_time", startDateTime.toISOString());
        formDataToSend.append("end_time", endDateTime.toISOString());

        const res = await fetch(`${API_URL}/api/bookings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "จองห้องไม่สำเร็จ");

        toast.success("ส่งคำขอจองสำเร็จ!", {
          description: "รายการของคุณถูกบันทึกแล้ว",
        });
      } else {
        // Case 2 & 3: Weekly Recurring or Multi-Date
        // Filter out excluded dates
        const finalSlots = candidateSlots.filter(
          (s) => !excludedDates.has(s.dateStr)
        );

        if (finalSlots.length === 0) {
          throw new Error(
            "ไม่มีช่วงเวลาที่พร้อมสำหรับการจอง (กรุณาเลือกวันและเวลาที่ห้องว่าง)"
          );
        }

        // Check if there are still any conflicted slots in the final selection
        if (checkResults.length > 0) {
          const hasUnresolvedConflict = finalSlots.some((s) => {
            const matchedCheck = checkResults.find(
              (cr) => cr.slot.start_time === s.start_time
            );
            return matchedCheck && !matchedCheck.available;
          });

          if (hasUnresolvedConflict) {
            throw new Error(
              "ยังมีช่วงเวลาที่ติดชนห้องไม่ว่าง กรุณาเลือกเฉพาะวันที่ห้องว่างก่อนส่งคำขอ"
            );
          }
        }

        formDataToSend.append(
          "recurrence_type",
          bookingMode === "weekly" ? "weekly" : "custom_dates"
        );
        formDataToSend.append(
          "slots",
          JSON.stringify(
            finalSlots.map((s) => ({
              start_time: s.start_time,
              end_time: s.end_time,
            }))
          )
        );

        const res = await fetch(`${API_URL}/api/bookings/recurring`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "จองห้องแบบชุดไม่สำเร็จ");

        toast.success(`ส่งคำขอจองแบบชุดสำเร็จ! (${finalSlots.length} ครั้ง)`, {
          description: "บันทึกรายการจองทั้งหมดเรียบร้อยแล้ว",
        });
      }

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading || !isInitialized)
    return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl font-sans space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span className="bg-tu-pink/10 p-2 rounded-xl text-tu-pink">
              <CalendarPlus size={32} />
            </span>
            จองห้องประชุม
          </h1>
          <p className="text-slate-500 mt-1 ml-14">
            กรอกรายละเอียดเพื่อขอใช้ห้องประชุมและอุปกรณ์ (รองรับจองครั้งเดียว, จองซ้ำรายสัปดาห์, และหลายวัน)
          </p>
        </div>
      </div>

      <Card className="rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: โหมดการจอง (Booking Mode Selector) */}
            <div className="space-y-3">
              <Label className="font-bold text-slate-800 text-base">
                รูปแบบการจอง
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setBookingMode("single")}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    bookingMode === "single"
                      ? "border-tu-pink bg-tu-pink/5 text-slate-800 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span
                    className={`p-2.5 rounded-xl ${
                      bookingMode === "single"
                        ? "bg-tu-pink text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Calendar size={20} />
                  </span>
                  <div>
                    <div className="font-bold text-sm">จองครั้งเดียว</div>
                    <div className="text-xs text-slate-500">
                      วันเดียว หรือช่วงเวลาต่อเนื่อง
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingMode("weekly")}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    bookingMode === "weekly"
                      ? "border-tu-pink bg-tu-pink/5 text-slate-800 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span
                    className={`p-2.5 rounded-xl ${
                      bookingMode === "weekly"
                        ? "bg-tu-pink text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Repeat size={20} />
                  </span>
                  <div>
                    <div className="font-bold text-sm">จองซ้ำรายสัปดาห์</div>
                    <div className="text-xs text-slate-500">
                      วันและเวลาเดียวกัน ทุกๆ สัปดาห์
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingMode("multi_date")}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    bookingMode === "multi_date"
                      ? "border-tu-pink bg-tu-pink/5 text-slate-800 shadow-sm"
                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span
                    className={`p-2.5 rounded-xl ${
                      bookingMode === "multi_date"
                        ? "bg-tu-pink text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Layers size={20} />
                  </span>
                  <div>
                    <div className="font-bold text-sm">หลายวันเวลาเดียวกัน</div>
                    <div className="text-xs text-slate-500">
                      เลือกวันที่อิสระ แต่ใช้เวลาเดียวกัน
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 2: ข้อมูลห้องและหัวข้อ */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
                ข้อมูลการจอง
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="room" className="font-medium text-slate-700">
                    ห้องประชุม <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.room_id}
                    onValueChange={handleRoomChange}
                    required
                  >
                    <SelectTrigger
                      id="room"
                      className="w-full h-12 bg-slate-50 border-slate-200 focus:ring-tu-pink rounded-xl"
                    >
                      <SelectValue placeholder="-- กรุณาเลือกห้อง --" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="bg-white rounded-xl shadow-lg border-slate-100 w-[var(--radix-select-trigger-width)]"
                    >
                      {rooms.map((room) => (
                        <SelectItem
                          key={room.id}
                          value={room.id.toString()}
                          className="cursor-pointer focus:bg-tu-pink focus:text-white py-3 pl-4 rounded-lg my-1"
                        >
                          {room.room_name} (รองรับ {room.capacity} คน)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="subject"
                    className="font-medium text-slate-700"
                  >
                    หัวข้อการประชุม <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                    placeholder="เช่น ประชุมวางแผนประจำสัปดาห์ / คลาสบรรยาย"
                  />
                </div>
              </div>

              {/* Mode 1: จองครั้งเดียว (Single) */}
              {bookingMode === "single" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="space-y-2">
                    <Label className="font-medium text-slate-700">
                      วัน-เวลา เริ่มต้น <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        name="start_date"
                        className="flex-1 h-12 bg-white border-slate-200 rounded-xl"
                        required
                        value={formData.start_date}
                        onChange={handleChange}
                      />
                      <Input
                        type="time"
                        name="start_time"
                        className="w-1/3 h-12 bg-white border-slate-200 rounded-xl"
                        required
                        value={formData.start_time}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-slate-700">
                      วัน-เวลา สิ้นสุด <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        name="end_date"
                        className="flex-1 h-12 bg-white border-slate-200 rounded-xl"
                        required
                        value={formData.end_date}
                        onChange={handleChange}
                      />
                      <Input
                        type="time"
                        name="end_time"
                        className="w-1/3 h-12 bg-white border-slate-200 rounded-xl"
                        required
                        value={formData.end_time}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: จองซ้ำรายสัปดาห์ (Weekly Recurring) */}
              {bookingMode === "weekly" && (
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="font-medium text-slate-700">
                        วันเริ่มต้นรอบแรก <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={weeklyStartDate}
                        onChange={(e) => setWeeklyStartDate(e.target.value)}
                        className="h-12 bg-white border-slate-200 rounded-xl"
                        required
                      />
                      {weeklyStartDate && (
                        <p className="text-xs text-tu-pink font-semibold">
                          ตรงกับ {getThaiDayOfWeek(weeklyStartDate)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-slate-700">
                        จำนวนสัปดาห์ (สูงสุด {maxRecurringCount} ครั้ง){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="2"
                        max={maxRecurringCount}
                        value={weeklyWeeksCount}
                        onChange={(e) =>
                          setWeeklyWeeksCount(
                            Math.min(
                              maxRecurringCount,
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          )
                        }
                        className="h-12 bg-white border-slate-200 rounded-xl"
                        required
                      />
                      <p className="text-xs text-slate-500">
                        ระบบจะคำนวณวันเดียวกันในทุกๆ สัปดาห์
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-slate-700">
                        ช่วงเวลาของแต่ละสัปดาห์{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={weeklyStartTime}
                          onChange={(e) => setWeeklyStartTime(e.target.value)}
                          className="h-12 bg-white border-slate-200 rounded-xl flex-1"
                          required
                        />
                        <span className="text-slate-400">-</span>
                        <Input
                          type="time"
                          value={weeklyEndTime}
                          onChange={(e) => setWeeklyEndTime(e.target.value)}
                          className="h-12 bg-white border-slate-200 rounded-xl flex-1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 3: หลายวันเวลาเดียวกัน (Multi-Date) */}
              {bookingMode === "multi_date" && (
                <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-medium text-slate-700">
                        เวลาที่ใช้ในทุกๆ วัน <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={multiStartTime}
                          onChange={(e) => setMultiStartTime(e.target.value)}
                          className="h-12 bg-white border-slate-200 rounded-xl flex-1"
                          required
                        />
                        <span className="text-slate-400">-</span>
                        <Input
                          type="time"
                          value={multiEndTime}
                          onChange={(e) => setMultiEndTime(e.target.value)}
                          className="h-12 bg-white border-slate-200 rounded-xl flex-1"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-slate-700">
                        เพิ่มวันที่ต้องการจอง (สูงสุด {maxRecurringCount} วัน)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={newDateInput}
                          onChange={(e) => setNewDateInput(e.target.value)}
                          className="h-12 bg-white border-slate-200 rounded-xl flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAddMultiDate}
                          className="h-12 px-5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl"
                        >
                          <Plus size={18} className="mr-1" /> เพิ่มวัน
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Badges of selected dates */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">
                      วันที่เลือกไว้ ({multiDates.length} วัน):
                    </Label>
                    {multiDates.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">
                        ยังไม่มีวันที่เลือก กรุณากดเลือกวันที่และคลิก &quot;เพิ่มวัน&quot;
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {multiDates.map((dateStr) => (
                          <span
                            key={dateStr}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm shadow-sm"
                          >
                            <span>{formatThaiDate(dateStr)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMultiDate(dateStr)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Slot Preview & Conflict Check Section for Recurring/Multi-Date */}
              {(bookingMode === "weekly" || bookingMode === "multi_date") &&
                candidateSlots.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          รายการวันที่จะทำการจอง ({candidateSlots.length} ครั้ง)
                        </h4>
                        <p className="text-xs text-slate-500">
                          ตรวจสอบความพร้อมของห้องก่อนกดยืนยัน
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={handleCheckConflicts}
                        disabled={isCheckingSlots || !formData.room_id}
                        variant="outline"
                        className="h-10 border-tu-pink text-tu-pink hover:bg-tu-pink/10 rounded-xl"
                      >
                        {isCheckingSlots ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            กำลังตรวจสอบ...
                          </>
                        ) : (
                          "ตรวจสอบห้องว่าง"
                        )}
                      </Button>
                    </div>

                    {/* Conflict Alert Banner */}
                    {checkResults.length > 0 &&
                      checkResults.some((cr) => !cr.available) && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h5 className="font-bold text-amber-900 text-sm">
                                พบห้องไม่ว่าง{" "}
                                {
                                  checkResults.filter((cr) => !cr.available)
                                    .length
                                }{" "}
                                วัน จากทั้งหมด {checkResults.length} วันที่เลือก
                              </h5>
                              <p className="text-xs text-amber-700 mt-1">
                                คุณสามารถเลือกที่จะยกเว้นวันที่ติดชน
                                และกดยืนยันจองเฉพาะวันที่ห้องว่างได้ทันที
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSelectOnlyAvailable}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg"
                            >
                              <CheckCircle2 size={14} className="mr-1.5" />
                              เลือกเฉพาะวันที่ว่าง (
                              {
                                checkResults.filter((cr) => cr.available).length
                              }{" "}
                              วัน)
                            </Button>
                          </div>
                        </div>
                      )}

                    {/* Slot List Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
                      {candidateSlots.map((slot, index) => {
                        const checkResult = checkResults[index];
                        const isExcluded = excludedDates.has(slot.dateStr);

                        return (
                          <div
                            key={slot.dateStr}
                            className={`p-3 rounded-xl border transition-all text-sm flex items-start justify-between ${
                              isExcluded
                                ? "bg-slate-100/70 border-slate-200 opacity-60 line-through"
                                : checkResult && !checkResult.available
                                ? "bg-red-50/70 border-red-200 text-red-900"
                                : checkResult && checkResult.available
                                ? "bg-green-50/70 border-green-200 text-green-900"
                                : "bg-white border-slate-200 text-slate-800"
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-xs text-slate-500">
                                ครั้งที่ {index + 1}
                              </div>
                              <div className="font-bold">
                                {formatThaiDate(slot.dateStr)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(slot.start_time).toLocaleTimeString(
                                  "th-TH",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}{" "}
                                -{" "}
                                {new Date(slot.end_time).toLocaleTimeString(
                                  "th-TH",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </div>

                              {checkResult && (
                                <div className="mt-1 flex items-center gap-1 text-xs">
                                  {checkResult.available ? (
                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                      <CheckCircle2 size={12} /> ห้องว่าง
                                    </span>
                                  ) : (
                                    <span className="text-red-600 font-medium flex items-center gap-1">
                                      <XCircle size={12} /> {checkResult.reason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExcludeDate(slot.dateStr)}
                              className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                                isExcluded
                                  ? "bg-slate-200 text-slate-700 border-slate-300"
                                  : "bg-white text-slate-600 hover:text-red-600 border-slate-200"
                              }`}
                            >
                              {isExcluded ? "นำกลับมา" : "ไม่จองวันนี้"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* Section 3: ข้อมูลผู้ติดต่อ */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
                ข้อมูลผู้ติดต่อ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="department"
                    className="font-medium text-slate-700"
                  >
                    ฝ่าย/หน่วยงาน
                  </Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-medium text-slate-700">
                    เบอร์โทรติดต่อ
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="attendees"
                    className="font-medium text-slate-700"
                  >
                    จำนวนผู้เข้าร่วม (คน)
                  </Label>
                  <Input
                    id="attendees"
                    name="attendees"
                    type="number"
                    min="1"
                    value={formData.attendees}
                    onChange={handleChange}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: สิ่งอำนวยความสะดวก */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
                สิ่งอำนวยความสะดวก
              </h3>
              <div className="space-y-3">
                <Label className="font-medium text-slate-700">
                  อุปกรณ์ที่ต้องการ
                </Label>
                {resourceOptions.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    - ไม่มีข้อมูลอุปกรณ์ -
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    {resourceOptions.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={item.id.toString()}
                          onCheckedChange={(checked) =>
                            handleResourceChange(
                              checked as boolean,
                              item.id.toString()
                            )
                          }
                          className="rounded-md border-slate-300 data-[state=checked]:bg-tu-pink data-[state=checked]:border-tu-pink"
                        />
                        <label
                          htmlFor={item.id.toString()}
                          className="text-sm font-medium leading-none text-slate-600 cursor-pointer"
                        >
                          {item.resource_name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-medium text-slate-700">
                  รูปแบบการจัดห้อง (ถ้ามี)
                </Label>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <Input
                    id="layout_image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleFileChange(e);
                      const file = e.target.files?.[0];
                      const span =
                        document.getElementById("file-name-display");
                      if (span)
                        span.innerText = file
                          ? file.name
                          : "ไม่ได้เลือกไฟล์ใด";
                    }}
                  />
                  <Label
                    htmlFor="layout_image"
                    className="bg-white text-slate-700 hover:text-tu-pink border border-slate-200 hover:border-tu-pink shadow-sm transition-all px-4 py-2 rounded-lg cursor-pointer text-sm font-medium"
                  >
                    เลือกไฟล์รูปภาพ
                  </Label>
                  <span
                    id="file-name-display"
                    className="text-sm text-slate-400 italic"
                  >
                    ไม่ได้เลือกไฟล์ใด
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className="font-medium text-slate-700">
                  หมายเหตุเพิ่มเติม
                </Label>
                <Textarea
                  id="note"
                  name="note"
                  className="min-h-25 bg-slate-50 border-slate-200 rounded-xl"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>
            </div>

            {/* ปุ่มส่งข้อมูล */}
            <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-red-500 font-medium text-sm text-center md:text-left bg-red-50 px-4 py-2 rounded-lg">
                ** หากเป็นการจองในช่วงวันหยุด กรุณาประสานเจ้าหน้าที่
                ที่สามารถมาปฏิบัติงานได้ ด้วยตนเอง **
              </p>
              <Button
                type="submit"
                className="bg-tu-pink hover:bg-tu-pink-hover text-white text-base px-10 py-4 rounded-full shadow-lg shadow-tu-pink/20 h-auto w-full md:w-auto"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : bookingMode === "single" ? (
                  "ยืนยันการจอง"
                ) : (
                  `ยืนยันการจอง (${
                    candidateSlots.filter((s) => !excludedDates.has(s.dateStr))
                      .length
                  } วัน)`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateBookingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <CreateBookingContent />
    </Suspense>
  );
}
