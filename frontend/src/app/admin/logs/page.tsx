"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { API_URL } from "@/config";

interface Log {
  ID: number;
  user_id: number;
  user?: {
    username: string;
    role: string;
  };
  action: string;
  description: string;
  ip_address: string;
  created_at: string;
}

export default function LogsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isInitialized } = useAuthStore();
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, isInitialized]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", pageSize.toString());
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const res = await fetch(`${API_URL}/api/logs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setLogs(data.data);
          setTotal(data.total);
          setTotalPages(data.total_pages);
        } else if (Array.isArray(data)) {
          setLogs(data);
          setTotal(data.length);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchTerm, token]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      fetchLogs();
    }
  }, [isAuthenticated, user, fetchLogs]);

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case "LOGIN":
      case "APPROVE":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "LOGOUT":
        return "bg-slate-100 text-slate-800 hover:bg-slate-100";
      case "UPLOAD":
      case "UPDATE":
      case "UPDATE_USER":
      case "UPDATE_ROOM":
      case "UPDATE_BOOKING":
      case "UPDATE_RESOURCE":
      case "UPDATE_SETTINGS":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "CREATE":
      case "CREATE_USER":
      case "CREATE_ROOM":
      case "CREATE_BOOKING":
      case "CREATE_RESOURCE":
        return "bg-teal-100 text-teal-800 hover:bg-teal-100";
      case "DELETE_USER":
      case "DELETE_ROOM":
      case "DELETE_BOOKING":
      case "DELETE_RESOURCE":
      case "REJECT":
      case "CANCEL":
      case "DELETE":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  if (!isInitialized || (isLoading && logs.length === 0 && !searchTerm)) {
    return (
      <div className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">
          รายการบันทึก (Logs List)
        </h1>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2 w-full md:w-1/2 ">
            <Input
              placeholder="ค้นหาชื่อ, กิจกรรม, หรือรายละเอียด..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full border border-gray-200 rounded-xl focus-visible:ring-2 focus-visible:ring-tu-pink focus-visible:border-tu-pink focus-visible:ring-offset-0 shadow-sm transition-all"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[180px]">เวลา (TIME)</TableHead>
                  <TableHead>ผู้ใช้งาน (USER)</TableHead>
                  <TableHead>กิจกรรม (ACTION)</TableHead>
                  <TableHead>รายละเอียด (DETAIL)</TableHead>
                  <TableHead className="text-right">IP ADDRESS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-slate-500"
                    >
                      กำลังโหลดข้อมูล...
                    </TableCell>
                  </TableRow>
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.ID}>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {format(
                          new Date(log.created_at),
                          "dd/MM/yyyy HH:mm:ss"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {log.user?.username ? log.user.username.substring(0, 1).toUpperCase() : "S"}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700">
                              {log.user?.username || "System"}
                            </span>
                            <span className="text-xs text-slate-400 capitalize">
                              {log.user?.role || "System"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-md pointer-events-none ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-right text-slate-400 font-mono text-xs">
                        {log.ip_address}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-slate-500"
                    >
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 pt-2">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
