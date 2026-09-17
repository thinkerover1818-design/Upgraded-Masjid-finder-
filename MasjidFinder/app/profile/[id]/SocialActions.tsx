"use client";

import { useState } from "react";

export default function SocialActions({ profileId, isFollowing, connection }: { profileId: string; isFollowing: boolean; connection: React.ReactNode }) {
  const [following, setFollowing] = useState(isFollowing);
  const [busy, setBusy] = useState(false);
  async function toggleFollow() { setBusy(true); const response = await fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ followingId: profileId, action: following ? "unfollow" : "follow" }) }); if (response.ok) setFollowing((value) => !value); setBusy(false); }
  return <div className="mt-6 flex w-full flex-wrap gap-2 border-t border-black/10 pt-5"><button type="button" disabled={busy} onClick={toggleFollow} className="inline-flex h-11 min-w-[7rem] items-center justify-center rounded-lg border border-emerald-900 px-4 text-sm font-semibold text-emerald-900 disabled:opacity-50">{following ? "Following" : "Follow"}</button>{connection}</div>;
}