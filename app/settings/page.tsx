import { PlaceholderPage } from "@/components/ui/page-shell";
import { SupabaseSqlExport } from "@/components/settings/supabase-sql-export";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Kelola perpindahan data BandarLab dari penyimpanan browser ke database Supabase."
    >
      <SupabaseSqlExport />
    </PlaceholderPage>
  );
}
