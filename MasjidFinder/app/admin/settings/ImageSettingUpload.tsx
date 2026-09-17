"use client";

import { useState } from "react";

export default function ImageSettingUpload({ settingKey }: { settingKey: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setMessage("Choose an image up to 5MB."); return; }
    setBusy(true); setMessage("");
    const body = new FormData(); body.set("key", settingKey); body.set("file", file);
    const response = await fetch("/api/admin/settings-image", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Uploaded. Refresh to see the new setting." : result.error ?? "Upload failed.");
    setBusy(false);
  }
  return <div className="mt-3"><label className="text-xs font-semibold text-ink-600">Upload image<input type="file" accept="image/*" capture="environment" onChange={upload} disabled={busy} className="mt-1 block w-full text-xs" /></label>{message && <p className="mt-1 text-xs text-ink-500">{message}</p>}</div>;
}
