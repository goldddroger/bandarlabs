import { PlaceholderPage } from "@/components/ui/page-shell";
import { SupabaseSqlExport } from "@/components/settings/supabase-sql-export";
import { UserManagement } from "@/components/settings/user-management";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Kelola perpindahan data BandarLab dari penyimpanan browser ke database Supabase."
    >
      <SupabaseSqlExport />
      <UserManagement />
    </PlaceholderPage>
  );
}
