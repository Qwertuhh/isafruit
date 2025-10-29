"use client";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ClassificationLayoutProps {
  children: React.ReactNode;
}

function ClassificationLayout({ children }: ClassificationLayoutProps) {
  const pathname = usePathname();
  const pageName = pathname.split("/").pop() || "home";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <Alert
          variant="default"
          className="bg-amber-300 border-2 border-amber-500 w-full rounded-none"
        >
          <AlertCircle />
          <AlertTitle>Discontinued Project</AlertTitle>
          <AlertDescription className="flex flex-row">
            This a discontinued project,{" "}
            <Link className="text-blue-600 font-bold" href="/note">
              for more information
            </Link>
          </AlertDescription>
        </Alert>
        <SiteHeader pageName={pageName[0].toUpperCase() + pageName.slice(1)} />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default ClassificationLayout;
