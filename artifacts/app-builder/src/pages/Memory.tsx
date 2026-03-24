import { Layout } from "@/components/Layout";
import { BusinessMemoryPanel } from "@/components/BusinessMemoryPanel";

export default function Memory() {
  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex flex-col max-w-2xl mx-auto w-full p-4 py-6">
        <BusinessMemoryPanel />
      </div>
    </Layout>
  );
}
