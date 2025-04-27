"use client";
import { useSearchParams } from "next/navigation";
import { TabView } from "@/components/TabView";

export default function Home() {
  const params = useSearchParams();
  const initialTab = params.get("tab") ?? "upload";

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Basketball Shot Analysis</h1>
      <TabView initialTab={initialTab} />
    </div>
  );
}