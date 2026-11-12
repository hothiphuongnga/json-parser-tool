"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, never>[];
  }
}

const publisherId =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-1061165377901019";
const adSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

export default function GoogleAd() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!adSlot || initialized.current) return;

    initialized.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("AdSense could not initialize the ad unit.", error);
      }
    }
  }, []);

  if (!adSlot) return null;

  return (
    <aside aria-label="Quảng cáo" className="google-ad">
      <ins
        className="adsbygoogle"
        data-ad-client={publisherId}
        data-ad-format="auto"
        data-ad-slot={adSlot}
        data-full-width-responsive="true"
        style={{ display: "block" }}
      />
    </aside>
  );
}
