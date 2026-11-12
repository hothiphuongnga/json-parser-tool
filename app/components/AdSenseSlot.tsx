"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, never>[];
  }
}

type AdSenseSlotProps = {
  placement: string;
};

const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-1061165377901019";
const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

export default function AdSenseSlot({ placement }: AdSenseSlotProps) {
  useEffect(() => {
    if (!slot) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Development refreshes can try to initialize the same ad twice.
    }
  }, []);

  return (
    <aside aria-label="Quảng cáo" className="adsense-slot" data-ad-placement={placement}>
      {slot ? (
        <ins
          className="adsbygoogle"
          data-ad-client={client}
          data-ad-format="auto"
          data-ad-slot={slot}
          data-full-width-responsive="true"
          style={{ display: "block" }}
        />
      ) : (
        <span className="adsense-placeholder">Vị trí quảng cáo</span>
      )}
    </aside>
  );
}
