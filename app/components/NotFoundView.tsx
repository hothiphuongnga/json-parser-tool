"use client";

import Link from "next/link";
import { useI18n } from "@/app/components/I18nProvider";
import SiteHeader from "@/app/components/SiteHeader";

export default function NotFoundView() {
  const { t, href } = useI18n();

  return (
    <main className="page-shell">
      <SiteHeader tool="jsonParser" />
      <div className="page-content">
        <section className="page-heading not-found">
          <span className="page-kicker">404</span>
          <h1>{t.notFound.title}</h1>
          <p>{t.notFound.body}</p>
          <Link className="soft-btn soft-btn-primary" href={href("/")}>
            {t.notFound.home}
          </Link>
        </section>
      </div>
    </main>
  );
}
