"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Loading } from "@/components/brand/Loading";
import { localToken } from "@/lib/hooks/useLocalToken";

export default function HostCodeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const [authorised, setAuthorised] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localToken.get("host", code);
    if (!token) {
      toast.error("You're not the host of this session.");
      router.replace("/host/new");
      return;
    }
    setAuthorised(true);
  }, [code, router]);

  if (authorised !== true) return <Loading label="Checking host…" />;
  return <>{children}</>;
}
