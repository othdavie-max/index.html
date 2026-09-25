"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { CrudPage } from "@/components/admin/crud/crud-page";
import { exchangeRatesConfig, costItemsConfig, timelineMilestonesConfig } from "@/lib/admin/crud-configs";

const tabs = [
  { id: "rates" as const, label: "Exchange Rates" },
  { id: "costs" as const, label: "Cost Calculator Data" },
  { id: "timeline" as const, label: "Timeline Milestones" },
];

export default function ToolsDataAdminPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("rates");

  return (
    <div>
      <h1 className="font-display text-xl text-ink-900">Tools Data</h1>
      <p className="mt-1 text-sm text-muted">
        Reference tables for the planning tools. The live tools currently read their figures from code:{" "}
        <code>src/data/study-countries.ts</code> (costs, visas, intakes for 39 countries), <code>src/data/exchange-rates.ts</code> and{" "}
        <code>src/lib/course-matcher.ts</code> (matching rules).
      </p>

      <div className="mt-6">
        <Tabs tabs={tabs} defaultTab="rates" onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === "rates" && <CrudPage config={exchangeRatesConfig} />}
        {tab === "costs" && <CrudPage config={costItemsConfig} />}
        {tab === "timeline" && <CrudPage config={timelineMilestonesConfig} />}
      </div>
    </div>
  );
}
