"use client";

import { CrudPage } from "@/components/admin/crud/crud-page";
import { teamConfig } from "@/lib/admin/crud-configs";

export default function TeamAdminPage() {
  return <CrudPage config={teamConfig} />;
}
