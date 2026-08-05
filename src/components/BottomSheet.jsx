/* ------------------------------------------------------------------ *
 *  BOTTOM SHEET — pannello a scomparsa dal basso, trascinabile
 * ------------------------------------------------------------------ */

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { C, fontBody } from "../config.js";

export default function BottomSheet({ open, title, subtitle, onClose, children }) {
  const [drag, setDrag] = useState(0);
  const startY = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setDrag(0);
  }, [open]);

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDrag(dy);
  };
  const onTouchEnd = () => {
    if (drag > 110) onClose();
    else setDrag(0);
    startY.current = null;
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(6,10,9,0.62)", backdropFilter: "blur(3px)" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 620,
          maxHeight: "86vh",
          display: "flex",
          flexDirection: "column",
          background: C.surface,
          borderTop: `1px solid ${C.hairline}`,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          transform: `translateY(${drag}px)`,
          transition: startY.current === null ? "transform 260ms cubic-bezier(0.32,0.72,0,1)" : "none",
          animation: "sheetUp 300ms cubic-bezier(0.32,0.72,0,1)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ padding: "10px 20px 4px", cursor: "grab", touchAction: "none" }}
        >
          <div style={{ width: 38, height: 4, borderRadius: 2, background: C.hairline, margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.ink, fontFamily: fontBody, fontWeight: 700, fontSize: "1.05rem" }}>{title}</div>
              {subtitle && (
                <div style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.78rem", marginTop: 2 }}>
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Chiudi"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: C.surfaceAlt,
                color: C.inkMuted,
                border: "none",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}
