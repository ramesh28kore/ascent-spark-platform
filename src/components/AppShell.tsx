import { useEffect, useMemo } from "react";
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
  Target,
  Trophy,
  ListChecks,
  TerminalSquare,
  UserRound,
  Flame,
  ChevronDown,
  Medal,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, notificationsQuery, problemProfileQuery } from "@/lib/crt-queries";
import { streakFromCounts, countByDay } from "@/components/leetcode/SubmissionHeatmap";

type NavItem = { title: string; url: string; icon: ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const studentNav: NavGroup[] = [
  {
    label: "Learn",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Modules", url: "/modules", icon: BookOpen },
      { title: "Schedule", url: "/schedule", icon: CalendarDays },
      { title: "Resources", url: "/resources", icon: Library },
    ],
  },
  {
    label: "Practice",
    items: [
      { title: "Problem set", url: "/problems", icon: Braces },
      { title: "Study plans", url: "/problems/plans", icon: Target },
      { title: "Contests", url: "/problems/contests", icon: Trophy },
      { title: "Practice ladder", url: "/practice", icon: ListChecks },
      { title: "Coding library", url: "/coding", icon: Code2 },
      { title: "Playground", url: "/playground", icon: TerminalSquare },
    ],
  },
  {
    label: "Assess",
    items: [
      { title: "Online tests", url: "/tests", icon: Timer },
      { title: "Assessments", url: "/assessments", icon: ClipboardList },
      { title: "My scores", url: "/my-scores", icon: LineChart },
      { title: "Certificates", url: "/certificates", icon: Award },
    ],
  },
  {
    label: "You",
    items: [
      { title: "My progress", url: "/problems/profile", icon: UserRound },
      { title: "Achievements", url: "/achievements", icon: Medal },
      { title: "Alerts", url: "/alerts", icon: Bell },
    ],
  },
];

const staffNav: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Readiness", url: "/readiness", icon: Gauge },
      { title: "Analytics", url: "/analytics", icon: LineChart },
    ],
  },
  {
    label: "Cohort",
    items: [
      { title: "Batches", url: "/batches", icon: Users },
      { title: "Students", url: "/students", icon: Users },
      { title: "Schedule", url: "/schedule", icon: CalendarDays },
      { title: "Attendance", url: "/attendance", icon: CheckSquare },
      { title: "Modules", url: "/modules", icon: BookOpen },
      { title: "Bulk import", url: "/import", icon: UploadCloud },
    ],
  },
  {
    label: "Assess",
    items: [
      { title: "Assessments", url: "/assessments", icon: ClipboardList },
      { title: "Online tests", url: "/tests", icon: Timer },
      { title: "Evaluation desk", url: "/evaluate", icon: CheckSquare },
      { title: "Question bank", url: "/questions", icon: FileQuestion },
      { title: "Certificates", url: "/certificates", icon: Award },
    ],
  },
  {
    label: "Practice",
    items: [
      { title: "Problem set", url: "/problems", icon: Braces },
      { title: "Study plans", url: "/problems/plans", icon: Target },
      { title: "Contests", url: "/problems/contests", icon: Trophy },
      { title: "Practice ladder", url: "/practice", icon: ListChecks },
      { title: "Coding library", url: "/coding", icon: Code2 },
      { title: "Playground", url: "/playground", icon: TerminalSquare },
    ],
  },
  {
    label: "More",
    items: [
      { title: "Resources", url: "/resources", icon: Library },
      { title: "Alerts", url: "/alerts", icon: Bell },
    ],
  },
];

const placementNav: NavGroup[] = [
  {
    label: "Placement",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Readiness", url: "/readiness", icon: Gauge },
      { title: "Analytics", url: "/analytics", icon: LineChart },
      { title: "Students", url: "/students", icon: Users },
      { title: "Certificates", url: "/certificates", icon: Award },
      { title: "Alerts", url: "/alerts", icon: Bell },
    ],
  },
];

// The super admin is limited to credential and role management.
const adminNav: NavGroup[] = [
  {
    label: "Administration",
    items: [
      { title: "Admin console", url: "/admin", icon: ShieldCheck },
      { title: "Roles & access", url: "/roles", icon: ShieldCheck },
    ],
  },
];

const ADMIN_ALLOWED = ["/admin", "/roles"];

/** `/problems/plans/foo` should keep "Study plans" highlighted, not "Problem set". */
function matchUrl(pathname: string, url: string, siblings: string[]) {
  if (pathname === url) return true;
  if (!pathname.startsWith(`${url}/`)) return false;
  // A deeper sibling wins over a shorter prefix.
  return !siblings.some((s) => s !== url && s.length > url.length && pathname.startsWith(s));
}

function NavGroupSection({
  group,
  pathname,
  allUrls,
  unread,
}: {
  group: NavGroup;
  pathname: string;
  allUrls: string[];
  unread: number;
}) {
  const { state } = useSidebar();
  const collapsedRail = state === "collapsed";
  const hasActive = group.items.some((item) => matchUrl(pathname, item.url, allUrls));

  const menu = (
    <SidebarMenu>
      {group.items.map((item) => {
        const active = matchUrl(pathname, item.url, allUrls);
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
              <Link to={item.url} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            {item.url === "/alerts" && unread > 0 && (
              <SidebarMenuBadge>{unread}</SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  if (collapsedRail) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>{menu}</SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible defaultOpen={hasActive || group.items.length <= 2} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            {group.label}
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>{menu}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

function ProgressStrip() {
  const { state } = useSidebar();
  const { data } = useQuery(problemProfileQuery);
  const stats = useMemo(() => {
    const submissions = data?.submissions ?? [];
    const solved = new Set(
      submissions.filter((s) => s.verdict === "accepted").map((s) => s.problem_id),
    ).size;
    return {
      solved,
      total: data?.problems?.length ?? 0,
      streak: streakFromCounts(countByDay(submissions.map((s) => s.created_at))),
    };
  }, [data]);

  if (state === "collapsed") return null;

  return (
    <Link
      to="/problems/profile"
      className="flex items-center justify-between rounded-md border border-sidebar-border px-3 py-2 text-xs transition-colors hover:bg-sidebar-accent"
    >
      <span className="tabular-nums">
        <span className="font-semibold">{stats.solved}</span>
        <span className="text-sidebar-foreground/60">/{stats.total} solved</span>
      </span>
      <span className="flex items-center gap-1 tabular-nums">
        <Flame className="size-3.5 text-amber-500" />
        {stats.streak}d
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const { data: notifications } = useQuery(notificationsQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = !!me?.isAdmin;
  const isStudent = !isAdmin && !me?.isStaff && !me?.isPlacement;
  const groups = isAdmin
    ? adminNav
    : me?.isStaff
      ? staffNav
      : me?.isPlacement
        ? placementNav
        : studentNav;
  const allUrls = useMemo(() => groups.flatMap((g) => g.items.map((i) => i.url)), [groups]);
  const unread = (notifications ?? []).filter((n) => !n.read).length;
  const name = me?.profile?.full_name ?? "Member";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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
              <GraduationCap className="h-6 w-6 shrink-0 text-sidebar-primary" />
              <span className="truncate font-display text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                CRT Console
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {groups.map((group) => (
              <NavGroupSection
                key={group.label}
                group={group}
                pathname={pathname}
                allUrls={allUrls}
                unread={unread}
              />
            ))}
          </SidebarContent>
          <SidebarFooter className="gap-2 p-3">
            {isStudent && <ProgressStrip />}
            <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
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
              <Link to="/alerts" className="relative inline-flex items-center" aria-label="Alerts">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="space-y-0.5">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">
                      {me?.profile?.email ?? me?.roleLabel}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isStudent && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/problems/profile" className="gap-2">
                          <UserRound className="size-4" /> My progress
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/my-scores" className="gap-2">
                          <LineChart className="size-4" /> My scores
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onSelect={() => void signOut()} className="gap-2">
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
