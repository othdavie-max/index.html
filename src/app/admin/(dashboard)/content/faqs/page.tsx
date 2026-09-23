"use client";

import { CrudPage } from "@/components/admin/crud/crud-page";
import { faqsConfig } from "@/lib/admin/crud-configs";

export default function FaqsAdminPage() {
  return <CrudPage config={faqsConfig} />;
}
