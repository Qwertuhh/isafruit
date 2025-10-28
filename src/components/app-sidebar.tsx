"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconLicense,
  IconListDetails,
  IconNote,
} from "@tabler/icons-react"
import Logo from "@/components/layout/logo"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

const data = {
  navMain: [
    {
      title: "Photo",
      url: "/classification/photo",
      icon: IconDashboard,
    },
    {
      title: "Video",
      url: "/classification/video",
      icon: IconListDetails,
    },
    {
      title: "Health Analyzer",
      url: "/classification/health-analyzer",
      icon: IconChartBar,
    },
  ],
  navSecondary: [
    {
      title: "License",
      url: "/license",
      icon: IconLicense,
    },
    {
      title: "Note",
      url: "/note",
      icon: IconNote,
    }
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 justify-left"
            >
              <Link href="/">
              <Logo background size={30} className="rounded" />
                <span className="text-base font-semibold">Is A Fruit?</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
