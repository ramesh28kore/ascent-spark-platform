import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  FileQuestion,
  Code2,
  LineChart,
  LogOut,
  GraduationCap,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/crt-queries";

const trainerNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Modules", url: "/modules", icon: BookOpen },
  { title: "Students", url: "/students", icon: Users },
  { title: "Assessments", url: "/assessments", icon: ClipboardList },
  { title: "Question bank", url: "/questions", icon: FileQuestion },
  { title: "Coding library", url: "/coding", icon: Code2 },
];

const studentNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Modules", url: "/modules", icon: BookOpen },
  { title: "Coding library", url: "/coding", icon: Code2 },
  { title: "My scores", url: "/my-scores", icon: LineChart },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const items = me?.isTrainer ? trainerNav : studentNav;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-sidebar-primary" />
              <span className="font-display text-base font-semibold tracking-tight">
                CRT Console
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{me?.isTrainer ? "Trainer" : "Student"}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-3">
            <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="font-display text-sm font-semibold tracking-tight">
                Campus Recruitment Training
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={me?.isTrainer ? "default" : "secondary"}>
                {me?.isTrainer ? "Trainer" : "Student"}
              </Badge>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {me?.profile?.full_name}
              </span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
