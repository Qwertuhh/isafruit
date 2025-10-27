"use client";
import { Header } from "@/components/layout/header";

interface ClassificationLayoutProps {
  children: React.ReactNode;
}
function ClassificationLayout({ children }: ClassificationLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        {/* Add padding-top to account for fixed header */}
        <div className="container mx-auto px-4 py-6 max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

export default ClassificationLayout;
