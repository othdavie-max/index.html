"use client";

import { CrudPage } from "@/components/admin/crud/crud-page";
import { partnersConfig } from "@/lib/admin/crud-configs";

export default function PartnersAdminPage() {
  return <CrudPage config={partnersConfig} />;
}
