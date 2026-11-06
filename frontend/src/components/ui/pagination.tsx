"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = "",
}: PaginationProps) {
  // If there are no items or only 1 page with 0 items
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-sm text-slate-600 ${className}`}
    >
      {/* Items range info & Page size selector */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-slate-500 font-medium">
          แสดง <span className="font-semibold text-slate-700">{startItem}</span> -{" "}
          <span className="font-semibold text-slate-700">{endItem}</span> จาก{" "}
          <span className="font-semibold text-slate-700">{totalItems}</span>{" "}
          รายการ
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>แสดง</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-[72px] rounded-lg text-xs border-slate-200 bg-white">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt.toString()} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>/ หน้า</span>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200 hidden sm:flex text-slate-500 hover:text-slate-800"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="หน้าแรก"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200 text-slate-500 hover:text-slate-800"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="หน้าก่อนหน้า"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Number Buttons (Hidden on mobile, showing current/total instead) */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-slate-400 select-none text-xs"
              >
                ...
              </span>
            ) : (
              <Button
                key={`page-${p}`}
                variant={currentPage === p ? "default" : "outline"}
                size="sm"
                className={`h-8 min-w-[32px] px-2.5 rounded-lg text-xs font-medium transition-all ${
                  currentPage === p
                    ? "bg-tu-pink text-white hover:bg-tu-pink-hover shadow-sm border-transparent"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                onClick={() => onPageChange(Number(p))}
              >
                {p}
              </Button>
            )
          )}
        </div>

        {/* Mobile Page indicator */}
        <div className="sm:hidden text-xs font-medium text-slate-600 px-2">
          หน้า {currentPage} / {totalPages || 1}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200 text-slate-500 hover:text-slate-800"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          title="หน้าถัดไป"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200 hidden sm:flex text-slate-500 hover:text-slate-800"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || totalPages === 0}
          title="หน้าสุดท้าย"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
