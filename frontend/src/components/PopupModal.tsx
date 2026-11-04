"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";

export default function PopupModal() {
  const { get, isLoading } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const enabled = get("popup_enabled") === "true";
      const alreadyShown = sessionStorage.getItem("popup_shown");

      if (enabled && !alreadyShown) {
        setIsOpen(true);
        sessionStorage.setItem("popup_shown", "true");
      }
    }
  }, [isLoading, get]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const image = get("popup_image");
  const link = get("popup_link");

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-0 rounded-2xl">
        {/* Hidden Title for accessibility if needed, or VisuallyHidden */}
        <DialogHeader className="sr-only">
          <DialogTitle>Announcement</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center">
          {image && (
            <div className="w-full relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="Popup"
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          <div className="p-6 w-full flex flex-col gap-4">
            {link && (
              <Button
                onClick={() => window.open(link, "_blank")}
                className="w-full bg-tu-pink hover:bg-tu-pink-hover text-white rounded-full font-bold shadow-lg shadow-tu-pink/20"
              >
                ประเมินความพึงพอใจ
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full"
            >
              ปิดหน้าต่าง
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
