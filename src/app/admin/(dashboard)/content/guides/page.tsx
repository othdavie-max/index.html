"use client";

import { CrudPage } from "@/components/admin/crud/crud-page";
import { guidesConfig } from "@/lib/admin/crud-configs";

export default function GuidesAdminPage() {
  return <CrudPage config={guidesConfig} />;
}
