"use client";

import { CrudPage } from "@/components/admin/crud/crud-page";
import { destinationContentConfig } from "@/lib/admin/crud-configs";

export default function DestinationsAdminPage() {
  return <CrudPage config={destinationContentConfig} />;
}
