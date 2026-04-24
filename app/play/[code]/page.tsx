"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

import { Page } from "@/components/brand/Page";
import { BackBar } from "@/components/brand/BackBar";
import { PlayerJoinForm } from "../PlayerJoinForm";

export default function PlayCodeJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const upper = code.toUpperCase();
  const router = useRouter();

  return (
    <Page>
      <BackBar onBack={() => router.push("/")} />
      <div className="text-center mb-2">
        <div className="text-[11px] text-gold tracking-[0.3em] uppercase">
          Session {upper}
        </div>
      </div>
      <h2 className="font-[var(--font-head)] font-bold text-[36px] leading-tight tracking-[-0.02em] text-center mt-2 mb-8 text-ivory">
        Enter your name
      </h2>
      <PlayerJoinForm initialCode={upper} codeLocked />
    </Page>
  );
}
