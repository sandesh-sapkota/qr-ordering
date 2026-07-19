"use client";

import { useActionState, useRef, useState } from "react";
import QRCode from "react-qr-code";
import {
  createTable,
  deleteTable,
  regenerateToken,
  type TableActionState,
} from "@/app/actions/tables";

// ─── Types ────────────────────────────────────────────────────────────────────

type Table = {
  id: string;
  table_number: string;
  qr_token: string;
  created_at: string;
};

type ModalMode =
  | { type: "add" }
  | { type: "qr"; table: Table }
  | { type: "delete"; table: Table }
  | { type: "regen"; table: Table };

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputCls =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20";

const btnPrimary =
  "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary =
  "rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors";

const btnDanger =
  "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50";

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Add Table Modal ──────────────────────────────────────────────────────────

function AddTableModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<TableActionState, FormData>(
    createTable,
    undefined,
  );

  return (
    <Modal title="Add Table" onClose={onClose}>
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="table_number" className="mb-1.5 block text-sm font-medium text-zinc-700">
            Table Number / Name
          </label>
          <input
            id="table_number"
            name="table_number"
            type="text"
            className={inputCls}
            placeholder="e.g. 1, A3, Window Seat"
            required
            autoFocus
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={pending}>
            {pending ? "Creating…" : "Create Table"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Table Modal ───────────────────────────────────────────────────────

function DeleteTableModal({ table, onClose }: { table: Table; onClose: () => void }) {
  const [state, action, pending] = useActionState<TableActionState, FormData>(
    deleteTable,
    undefined,
  );

  return (
    <Modal title="Delete Table" onClose={onClose}>
      <p className="mb-4 text-sm text-zinc-600">
        Delete <strong>Table {table.table_number}</strong>? This action cannot be undone. Orders
        linked to this table will remain but lose the table reference.
      </p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={table.id} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnDanger} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Regen Token Modal ────────────────────────────────────────────────────────

function RegenTokenModal({ table, onClose }: { table: Table; onClose: () => void }) {
  const [state, action, pending] = useActionState<TableActionState, FormData>(
    regenerateToken,
    undefined,
  );

  return (
    <Modal title="Regenerate QR Token" onClose={onClose}>
      <p className="mb-4 text-sm text-zinc-600">
        Generating a new token for <strong>Table {table.table_number}</strong> will invalidate the
        current QR code. Any printed copies must be reprinted.
      </p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={table.id} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={pending}>
            {pending ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── QR View Modal ────────────────────────────────────────────────────────────

function QRModal({
  table,
  restaurantSlug,
  onClose,
}: {
  table: Table;
  restaurantSlug: string;
  onClose: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const qrUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/r/${restaurantSlug}/t/${table.qr_token}`;

  function getSVG(): SVGSVGElement | null {
    return wrapperRef.current?.querySelector("svg") ?? null;
  }

  function downloadSVG() {
    const svg = getSVG();
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-${table.table_number}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPNG() {
    const svg = getSVG();
    if (!svg) return;
    const size = 512;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `table-${table.table_number}-qr.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
  }

  return (
    <Modal title={`QR Code — Table ${table.table_number}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-5">
        <div ref={wrapperRef} className="rounded-xl border border-zinc-200 bg-white p-4">
          <QRCode
            value={qrUrl}
            size={220}
            level="M"
          />
        </div>

        <p className="max-w-xs break-all text-center text-xs text-zinc-500">{qrUrl}</p>

        <div className="flex w-full gap-2">
          <button
            onClick={downloadSVG}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <DownloadIcon />
            SVG
          </button>
          <button
            onClick={downloadPNG}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            <DownloadIcon />
            PNG
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v8M5 7l3 3 3-3M2 12h12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QRIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="3" width="2" height="2" />
      <rect x="9" y="1" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="2" height="2" />
      <rect x="1" y="9" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11" width="2" height="2" />
      <path d="M9 9h2v2H9zM11 11h2v2h-2zM13 9h2v2h-2zM9 13h4v2H9zM13 13h2v2h-2z" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TablesClient({
  tables,
  restaurantSlug,
}: {
  tables: Table[];
  restaurantSlug: string;
}) {
  const [modal, setModal] = useState<ModalMode | null>(null);

  const close = () => setModal(null);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Tables & QR Codes</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {tables.length} {tables.length === 1 ? "table" : "tables"}
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "add" })}
            className={btnPrimary}
          >
            + Add Table
          </button>
        </div>
      </div>

      {/* Table List */}
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        {tables.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
              <QRIcon />
            </div>
            <p className="text-sm font-medium text-zinc-600">No tables yet</p>
            <p className="mt-1 text-sm text-zinc-400">
              Add your first table to generate a QR code.
            </p>
            <button
              onClick={() => setModal({ type: "add" })}
              className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Add Table
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Table</th>
                  <th className="hidden px-4 py-3 sm:table-cell">QR Token</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tables.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">Table {t.table_number}</span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600">
                        {t.qr_token.slice(0, 8)}…
                      </code>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ type: "qr", table: t })}
                          title="View / Download QR"
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                        >
                          <QRIcon />
                          <span className="hidden sm:inline">QR Code</span>
                        </button>
                        <button
                          onClick={() => setModal({ type: "regen", table: t })}
                          title="Regenerate token"
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 transition-colors"
                        >
                          <RefreshIcon />
                        </button>
                        <button
                          onClick={() => setModal({ type: "delete", table: t })}
                          title="Delete table"
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "add" && <AddTableModal onClose={close} />}
      {modal?.type === "qr" && (
        <QRModal table={modal.table} restaurantSlug={restaurantSlug} onClose={close} />
      )}
      {modal?.type === "delete" && <DeleteTableModal table={modal.table} onClose={close} />}
      {modal?.type === "regen" && <RegenTokenModal table={modal.table} onClose={close} />}
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M14 8a6 6 0 1 1-1.5-3.9L14 2v4h-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
