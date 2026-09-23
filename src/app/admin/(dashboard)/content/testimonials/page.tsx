"use client";

import { CrudPage } from "@/components/admin/crud/crud-page";
import { testimonialsConfig } from "@/lib/admin/crud-configs";

export default function TestimonialsAdminPage() {
  return <CrudPage config={testimonialsConfig} />;
}
