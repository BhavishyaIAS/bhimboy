import type { Metadata } from "next";
import {
  PyqVault,
  buildPyqFilters,
  type PyqSearchParams,
} from "@/components/app/pyq-vault";

export const metadata: Metadata = { title: "Prelims PYQs" };
export const dynamic = "force-dynamic";

export default async function PrelimsTab({
  searchParams,
}: {
  searchParams: Promise<PyqSearchParams>;
}) {
  const sp = await searchParams;
  return <PyqVault filters={buildPyqFilters(sp, "prelims")} lockStage />;
}
