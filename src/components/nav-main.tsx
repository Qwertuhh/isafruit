import { type Icon } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Waypoints, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
  }[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const handleNavigation = (url: string) => {
    startTransition(() => {
      router.push(url);
    });
  };
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2 font-bold text-md bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-200 rounded px-2  flex-row justify-center  py-1">
            <Waypoints /> Actions
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => handleNavigation(item.url)}
                disabled={isPending}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.title}
              </Button>
            </SidebarMenuItem>
          ))}
          {isPending && (
            <Loader2 className="ml-auto h-4 w-4 animate-spin" />
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
