import { useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  UploadCloud,
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  FileQuestion,
  Code2,
  LineChart,
  LogOut,
  GraduationCap,
  CalendarDays,
  CheckSquare,
  Gauge,
  Library,
  Bell,
  ShieldCheck,
  Timer,
  Braces,
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
import { meQuery, notificationsQuery } from "@/lib/crt-queries";

const staffNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Batches", url: "/batches", icon: Users },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
  { title: "Attendance", url: "/attendance", icon: CheckSquare },
  { title: "Modules", url: "/modules", icon: BookOpen },
  { title: "Students", url: "/students", icon: Users },
  { title: "Readiness", url: "/readiness", icon: Gauge },
  { title: "Analytics", url: "/analytics", icon: LineChart },
  { title: "Assessments", url: "/assessments", icon: ClipboardList },
  { title: "Online tests", url: "/tests", icon: Timer },
  { title: "Evaluation desk", url: "/evaluate", icon: ClipboardList },
  { title: "Question bank", url: "/questions", icon: FileQuestion },
  { title: "Problem set", url: "/problems", icon: Braces },
  { title: "Coding library", url: "/coding", icon: Code2 },
  { title: "Practice ladder", url: "/practice", icon: Code2 },
  { title: "Playground", url: "/playground", icon: Code2 },
  { title: "Certificates", url: "/certificates", icon: Award },
  { title: "Resources", url: "/resources", icon: Library },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Bulk import", url: "/import", icon: UploadCloud },
];

const placementNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Readiness", url: "/readiness", icon: Gauge },
  { title: "Analytics", url: "/analytics", icon: LineChart },
  { title: "Students", url: "/students", icon: Users },
  { title: "Certificates", url: "/certificates", icon: Award },
  { title: "Alerts", url: "/alerts", icon: Bell },
];

const studentNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Modules", url: "/modules", icon: BookOpen },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
  { title: "Online tests", url: "/tests", icon: Timer },
  { title: "Assessments", url: "/assessments", icon: ClipboardList },
  { title: "Problem set", url: "/problems", icon: Braces },
  { title: "Practice ladder", url: "/practice", icon: Code2 },
  { title: "Playground", url: "/playground", icon: Code2 },
  { title: "Coding library", url: "/coding", icon: Code2 },
  { title: "Certificates", url: "/certificates", icon: Award },
  { title: "Resources", url: "/resources", icon: Library },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "My scores", url: "/my-scores", icon: LineChart },
];

// The super admin is limited to credential and role management.
const adminNav = [
  { title: "Admin console", url: "/admin", icon: ShieldCheck },
  { title: "Roles & access", url: "/roles", icon: ShieldCheck },
];

const ADMIN_ALLOWED = ["/admin", "/roles"];


export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const { data: notifications } = useQuery(notificationsQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = !!me?.isAdmin;
  const items = isAdmin
    ? adminNav
    : me?.isStaff
      ? staffNav
      : me?.isPlacement
        ? placementNav
        : studentNav;
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  useEffect(() => {
    if (!isAdmin) return;
    if (ADMIN_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    navigate({ to: "/admin", replace: true });
  }, [isAdmin, pathname, navigate]);



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
              <SidebarGroupLabel>{me?.roleLabel ?? "Menu"}</SidebarGroupLabel>
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
              <Link to="/alerts" className="relative inline-flex items-center">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unread > 0 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">
                    {unread}
                  </span>
                )}
              </Link>
              <Badge variant={me?.isStaff ? "default" : "secondary"}>
                {me?.roleLabel ?? "Member"}
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
