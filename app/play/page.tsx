"use client";

import { useRouter } from "next/navigation";

import { Page } from "@/components/brand/Page";
import { BackBar } from "@/components/brand/BackBar";
import { PlayerJoinForm } from "./PlayerJoinForm";

export default function PlayJoinPage() {
  const router = useRouter();
  return (
    <Page>
      <BackBar onBack={() => router.push("/")} />
      <h2 className="font-[var(--font-head)] font-bold text-[36px] leading-tight tracking-[-0.02em] mt-2 mb-8 text-ivory">
        Join the game
      </h2>
      <PlayerJoinForm />
    </Page>
  );
}
