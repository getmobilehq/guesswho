"use client";

import { useEffect, useState, use } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

import { Loading } from "@/components/brand/Loading";
import { localToken } from "@/lib/hooks/useLocalToken";

// The bare /play/[code] page is the join form — it MUST render without a
// player token. Deeper paths (/submit, /wait, /game, /final) require one and
// bounce back to the join form if it's missing.
export default function PlayCodeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState<boolean | null>(null);

  const isJoinPage =
    pathname === `/play/${code}` ||
    pathname === `/play/${code}/` ||
    pathname === `/play/${rawCode}` ||
    pathname === `/play/${rawCode}/`;

  useEffect(() => {
    if (isJoinPage) {
      setOk(true);
      return;
    }
    const token = localToken.get("player", code);
    if (!token) {
      toast.error("Join this session first.");
      router.replace(`/play/${code}`);
      return;
    }
    setOk(true);
  }, [code, isJoinPage, router]);

  if (ok !== true) return <Loading label="Checking session…" />;
  return <>{children}</>;
}
