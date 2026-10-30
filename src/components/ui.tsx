"use client";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { X, ArrowUpRight, ArrowDownRight, LoaderCircle } from "lucide-react";
import { initials, riskLevel } from "@/lib/types";

const dialogStack: HTMLElement[] = [];
let originalOverflow = "";
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialogStack.length) { originalOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
    dialogStack.push(element);
    const first = element.querySelector<HTMLElement>("input, select, textarea, button");
    first?.focus({ preventScroll: true });
    const handler = (e: KeyboardEvent) => {
      if (dialogStack.at(-1) !== element) return;
      if (e.key === "Escape") { e.preventDefault(); close.current(); }
      if (e.key === "Tab") {
        const items = element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea, a[href], [tabindex="0"]');
        if (!items.length) return;
        const start = items[0], end = items[items.length - 1];
        if (e.shiftKey && document.activeElement === start) { e.preventDefault(); end.focus(); }
        else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); start.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      const index = dialogStack.indexOf(element); if (index >= 0) dialogStack.splice(index, 1);
      if (!dialogStack.length) document.body.style.overflow = originalOverflow;
      previous?.focus({ preventScroll: true });
    };
  }, [ref]);
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "compact" : ""}`}><span className="brand-mark"><svg viewBox="0 0 32 32" fill="none"><path d="M8 9v9a8 8 0 0 0 16 0V9M17 13l7-6 6 7" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>uplift<span className="brand-period">.</span></span></div>;
}
export function Avatar({ name, color = "sage", small = false }: { name: string; color?: string; small?: boolean }) { return <span className={`avatar ${color} ${small ? "small" : ""}`}>{initials(name)}</span>; }
export function RiskBadge({ score }: { score: number }) { return <span className={`risk-badge ${score >= 65 ? "high" : score >= 40 ? "moderate" : "low"}`}><i />{score}% <span>{riskLevel(score)}</span></span>; }
export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}><div className="modal-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</div></div>;
}
export function Trend({ positive = true, children }: { positive?: boolean; children: ReactNode }) { return <span className={`trend ${positive ? "positive" : "negative"}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{children}</span>; }
export function Busy({ label = "Saving…" }: { label?: string }) { return <><LoaderCircle size={15} className="spin" />{label}</>; }
export function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) { return <div className="empty-state"><span className="empty-symbol">✧</span><h3>{title}</h3><p>{text}</p>{children}</div>; }
export async function api<T = { ok: boolean }>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}
