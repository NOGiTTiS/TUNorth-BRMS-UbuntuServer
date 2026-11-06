"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/types/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trash2,
  Edit,
  Users,
  FileUp,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { API_URL } from "@/config";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, token, isAuthenticated } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});

  // State for Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 1. Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", pageSize.toString());
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const res = await fetch(`${API_URL}/api/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setUsers(data.data);
          setTotal(data.total);
          setTotalPages(data.total_pages);
        } else if (Array.isArray(data)) {
          setUsers(data);
          setTotal(data.length);
          setTotalPages(1);
        }
      } else {
        toast.error("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
      }
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, token]);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== "admin") {
      router.push("/");
      return;
    }
    fetchUsers();
  }, [isAuthenticated, currentUser, router, fetchUsers]);

  // 2. Edit Logic
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      department: user.department,
      tel: user.tel,
      email: user.email,
      role: user.role,
      password: "",
    });
    setIsEditModalOpen(true);
  };

  // 2. Create / Update Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update Mode
        const res = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("แก้ไขข้อมูลผู้ใช้สำเร็จ");
      } else {
        // Create Mode
        const res = await fetch(`${API_URL}/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("เพิ่มผู้ใช้งานสำเร็จ");
      }

      setIsEditModalOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(
        editingUser ? "เกิดข้อผิดพลาดในการแก้ไข" : "เกิดข้อผิดพลาดในการเพิ่ม"
      );
    }
  };

  // 3. Delete Logic
  const handleDelete = async (id: number) => {
    if (id === currentUser?.user_id) {
      toast.error("คุณไม่สามารถลบบัญชีตัวเองได้");
      return;
    }
    if (!confirm("ยืนยันการลบผู้ใช้งานนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"))
      return;

    try {
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");
      toast.success("ลบผู้ใช้งานเรียบร้อย");
      fetchUsers();
    } catch (error) {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  // 4. Import CSV Logic
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    const formDataUpload = new FormData();
    formDataUpload.append("file", importFile);

    try {
      const res = await fetch(`${API_URL}/api/users/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataUpload,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`นำเข้าสำเร็จ: ${data.success} คน`, {
          description:
            data.failed > 0
              ? `ล้มเหลว ${data.failed} รายการ (อาจซ้ำ)`
              : undefined,
        });

        if (data.failed > 0) {
          console.warn("Import Errors:", data.errors);
        }

        setIsImportModalOpen(false);
        setImportFile(null);
        fetchUsers();
      } else {
        toast.error("นำเข้าล้มเหลว", { description: data.error });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปโหลด");
    }
  };

  // Function to create template link
  const getTemplateLink = () => {
    const csvContent =
      "\uFEFFusername,password,full_name,department,tel,email,role\nteacher99,pass1234,ครูตัวอย่าง ทดสอบ,หมวดวิทย์,0811112222,example@tu.ac.th,user";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    return URL.createObjectURL(blob);
  };

  if (loading && users.length === 0 && !searchTerm) {
    return <div className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      {/* 1. Header & Toolbar Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">จัดการผู้ใช้งาน</h1>
          <p className="text-slate-500 mt-1">
            ดูแลสิทธิการเข้าถึงของครูและนักเรียน
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-64">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่อ, อีเมล, แผนก..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-white border-slate-200 rounded-full"
            />
          </div>

          {/* Action Buttons */}
          <Button
            variant="outline"
            className="hidden md:flex bg-white border-slate-200 rounded-full"
            onClick={() => window.open(getTemplateLink())}
          >
            <Download className="mr-2 h-4 w-4" /> ตัวอย่าง CSV
          </Button>

          <Button
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-full"
            onClick={() => setIsImportModalOpen(true)}
          >
            <FileUp className="mr-2 h-4 w-4" /> Import
          </Button>

          <Button
            className="bg-tu-pink hover:bg-tu-pink-hover text-white rounded-full shadow-lg shadow-tu-pink/30"
            onClick={() => {
              setEditingUser(null);
              setFormData({ role: "user" }); // Default
              setIsEditModalOpen(true);
            }}
          >
            <Users className="mr-2 h-4 w-4" /> เพิ่มผู้ใช้
          </Button>
        </div>
      </div>

      {/* 2. Table Section (Card) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-slate-100">
                <TableHead className="w-[300px] text-slate-500 font-medium">
                  ข้อมูลผู้ใช้
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  บทบาท
                </TableHead>
                <TableHead className="text-slate-500 font-medium">
                  อีเมล
                </TableHead>
                <TableHead className="text-right text-slate-500 font-medium">
                  จัดการ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow
                  key={u.id}
                  className="hover:bg-slate-50/50 border-b border-slate-50 last:border-none"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar Initials with Defensive Check */}
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                        {(u.username || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        {/* Name with Fallback */}
                        <div className="font-bold text-slate-800">
                          {u.full_name || u.username || "Unknown"}
                        </div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide">
                          {u.username || "-"}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {u.role === "admin" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-600">
                        ADMIN
                      </span>
                    )}
                    {u.role === "teacher" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-600">
                        TEACHER
                      </span>
                    )}
                    {(u.role === "user" || u.role === "student") && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-600">
                        STUDENT
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-slate-500 text-sm">
                    {u.email || "-"}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-tu-pink"
                        onClick={() => openEditModal(u)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-500"
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === currentUser?.user_id}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users className="h-10 w-10 mb-2 opacity-20" />
                      <p>ไม่พบข้อมูลผู้ใช้งาน</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 pt-4 border-t border-slate-100">
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
        </div>
      </div>

      {/* --- Edit/Create Modal --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-center text-slate-800">
              {editingUser ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              แบบฟอร์มจัดการผู้ใช้งาน
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-slate-600 font-medium">ชื่อ-นามสกุล</Label>
              <Input
                value={formData.full_name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="ชื่อ-นามสกุล"
                className="rounded-xl border-slate-200 h-11"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-slate-600 font-medium">อีเมล</Label>
              <Input
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="example@cpms.com"
                className="rounded-xl border-slate-200 h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-slate-600 font-medium">
                {editingUser
                  ? "รหัสผ่าน (เว้นว่างไว้ถ้าไม่เปลี่ยน)"
                  : "รหัสผ่าน"}
              </Label>
              <Input
                type="password"
                placeholder={
                  editingUser ? "ตั้งรหัสผ่านใหม่..." : "ระบุรหัสผ่าน"
                }
                value={formData.password || ""}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required={!editingUser}
                className="rounded-xl border-slate-200 h-11"
              />
            </div>

            {/* Role & Dep/Class (2 Columns) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-600 font-medium">
                  บทบาท (ROLE)
                </Label>
                <Select
                  value={formData.role || "user"}
                  onValueChange={(val) =>
                    setFormData({ ...formData, role: val })
                  }
                >
                  <SelectTrigger className="bg-white rounded-xl border-slate-200 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="user">USER (General)</SelectItem>
                    <SelectItem value="student">STUDENT</SelectItem>
                    <SelectItem value="teacher">TEACHER</SelectItem>
                    <SelectItem value="admin">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-600 font-medium">
                  ชั้น/ห้อง (เฉพาะนักเรียน)
                </Label>
                <Input
                  value={formData.department || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="-- ไม่ระบุ --"
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>
            </div>

            {/* Username / Student ID */}
            <div className="space-y-1.5">
              <Label className="text-slate-600 font-medium">
                รหัสนักเรียน (ถ้ามี) / Username
              </Label>
              <Input
                value={formData.username || ""}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={!!editingUser}
                placeholder="เช่น 12345"
                required
                className="rounded-xl border-slate-200 h-11"
              />
            </div>

            {/* Tel (Hidden/Optional in visual ref, keeping it but maybe at bottom or removed? keeping as hidden for now to match visual or just put at bottom) */}
            <div className="space-y-1.5 hidden">
              <Label>เบอร์โทร</Label>
              <Input
                value={formData.tel || ""}
                onChange={(e) =>
                  setFormData({ ...formData, tel: e.target.value })
                }
              />
            </div>

            <DialogFooter className="flex justify-center gap-3 pt-4 sm:justify-center">
              <Button
                type="submit"
                className="bg-tu-pink hover:bg-tu-pink-hover text-white rounded-md px-8 py-2 h-auto"
              >
                {editingUser ? "บันทึกการแก้ไข" : "สร้างผู้ใช้ใหม่"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="bg-slate-500 hover:bg-slate-600 text-white rounded-md px-8 py-2 h-auto"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Import CSV Modal --- */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-112.5 bg-white">
          <DialogHeader>
            <DialogTitle>นำเข้าข้อมูลผู้ใช้งาน (CSV)</DialogTitle>
            <DialogDescription>
              อัปโหลดไฟล์ CSV เพื่อเพิ่มผู้ใช้งานทีละหลายคน
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleImport} className="grid gap-6 py-4">
            {/* Template Download */}
            <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300">
              <div className="flex items-center gap-3 mb-2">
                <FileSpreadsheet className="text-green-600" size={24} />
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    เตรียมไฟล์ข้อมูล
                  </p>
                  <p className="text-xs text-slate-500">
                    ดาวน์โหลดไฟล์ตัวอย่างแล้วกรอกข้อมูลตามคอลัมน์
                  </p>
                </div>
              </div>
              <a
                href={getTemplateLink()}
                download="template_users.csv"
                className="text-xs flex items-center justify-center gap-2 w-full py-2 bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
              >
                <Download size={14} /> ดาวน์โหลดไฟล์ตัวอย่าง (.csv)
              </a>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="csvFile">เลือกไฟล์ .csv ที่เตรียมไว้</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                className="cursor-pointer"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={!importFile}
                className="bg-tu-pink hover:bg-tu-pink-hover text-white w-full"
              >
                อัปโหลดและนำเข้าข้อมูล
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
