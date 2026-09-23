"use client";

import { CrudPage } from "@/components/admin/crud/crud-page";
import { blogConfig } from "@/lib/admin/crud-configs";

export default function BlogAdminPage() {
  return <CrudPage config={blogConfig} />;
}
