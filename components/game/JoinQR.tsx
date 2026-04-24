"use client";

import { QRCodeSVG } from "qrcode.react";

export function JoinQR({ code, appUrl }: { code: string; appUrl: string }) {
  const url = `${appUrl.replace(/\/$/, "")}/play/${code}`;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-ivory p-4 rounded-[var(--radius)] inline-flex">
        <QRCodeSVG
          value={url}
          size={200}
          level="M"
          bgColor="#FDFAF0"
          fgColor="#0D0D2B"
        />
      </div>
      <a
        href={url}
        className="text-[12px] text-muted hover:text-ivory underline-offset-4 hover:underline transition-colors break-all max-w-[260px] text-center"
      >
        {url.replace(/^https?:\/\//, "")}
      </a>
    </div>
  );
}

export default JoinQR;
