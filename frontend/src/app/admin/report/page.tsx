"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Download } from "lucide-react";
import { API_URL } from "@/config";

interface ReportStats {
  total_bookings: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  room_usage: {
    room_name: string;
    color: string;
    count: number;
  }[];
  daily_trends: {
    date: string;
    count: number;
  }[];
}

export default function ReportPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isInitialized } = useAuthStore();

  // Dates: Default to current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(
    startOfMonth.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    endOfMonth.toISOString().split("T")[0]
  );
  const [status, setStatus] = useState("all");
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, isInitialized]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        start: startDate,
        end: endDate,
        status: status === "all" ? "" : status,
      });
      const res = await fetch(`${API_URL}/api/reports/dashboard?${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      fetchStats();
    }
  }, [isAuthenticated, user, token]);

  const handleExportCSV = () => {
    if (!stats) return;

    let csvContent = "Metric,Value\n";
    csvContent += `Total Bookings,${stats.total_bookings}\n`;
    csvContent += `Approved,${stats.approved_count}\n`;
    csvContent += `Pending,${stats.pending_count}\n`;
    csvContent += `Rejected,${stats.rejected_count}\n\n`;

    csvContent += "Room Usage,,\nRoom,Count\n";
    stats.room_usage.forEach((row) => {
      csvContent += `${row.room_name},${row.count}\n`;
    });

    csvContent += "\nDaily Trends,,\nDate,Count\n";
    stats.daily_trends.forEach((row) => {
      csvContent += `${row.date},${row.count}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
  ];

  if (isLoading || !isInitialized) {
    return <div className="p-10 text-center">กำลังโหลดรายงาน...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">รายงานขั้นสูง</h1>
        <div className="flex gap-2"></div>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase">
              วันที่เริ่มต้น
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl focus-visible:ring-2 focus-visible:ring-tu-pink focus-visible:border-tu-pink focus-visible:ring-offset-0 shadow-sm transition-all"
            />
          </div>
          <div className="w-full md:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase">
              วันที่สิ้นสุด
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl focus-visible:ring-2 focus-visible:ring-tu-pink focus-visible:border-tu-pink focus-visible:ring-offset-0 shadow-sm transition-all"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="text-xs font-bold text-slate-500 uppercase">
              สถานะ
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="pending">รออนุมัติ</SelectItem>
                <SelectItem value="rejected">ปฏิเสธ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={fetchStats}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl w-full md:w-auto"
          >
            แสดงรายงาน
          </Button>
          <Button
            onClick={handleExportCSV}
            className="bg-green-500 hover:bg-green-600 text-white rounded-xl w-full md:w-auto"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              การจองทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-tu-pink">
              {stats?.total_bookings || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              อนุมัติแล้ว
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats?.approved_count || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              รออนุมัติ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              {stats?.pending_count || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              ปฏิเสธ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {stats?.rejected_count || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>สัดส่วนการใช้งานห้อง</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats?.room_usage && stats.room_usage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.room_usage}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="room_name"
                    label
                  >
                    {stats.room_usage.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>แนวโน้มการจองรายวัน</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats?.daily_trends && stats.daily_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.daily_trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f472b6"
                    strokeWidth={2}
                    name="จำนวนการจอง"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
