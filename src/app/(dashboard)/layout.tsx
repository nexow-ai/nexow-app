import { DashboardContent } from "@/components/layout/dashboard-content";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <DashboardContent className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-8 mesh-gradient">{children}</main>
        </DashboardContent>
      </div>
    </SidebarProvider>
  );
}
