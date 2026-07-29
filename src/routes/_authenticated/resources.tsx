import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { createResource, deleteResource } from "@/lib/crt-ops.functions";
import { meQuery, modulesQuery, resourcesQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "Resources — CRT Training Console" },
      {
        name: "description",
        content: "Share CRT slide decks, recordings, notes and reference links with every batch.",
      },
      { property: "og:title", content: "Resources — CRT Training Console" },
      { property: "og:description", content: "Central CRT material repository per module." },
    ],
  }),
  component: ResourcesPage,
});

const KINDS = ["slides", "recording", "notes", "link", "assignment"];

function ResourcesPage() {
  const me = useQuery(meQuery);
  const resources = useQuery(resourcesQuery);
  const modules = useQuery(modulesQuery);
  const queryClient = useQueryClient();
  const add = useServerFn(createResource);
  const remove = useServerFn(deleteResource);

  const isStaff = !!me.data?.isStaff;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("slides");
  const [url, setUrl] = useState("");
  const [moduleId, setModuleId] = useState("none");

  const create = useMutation({
    mutationFn: () =>
      add({
        data: {
          module_id: moduleId === "none" ? null : moduleId,
          session_id: null,
          title: title.trim(),
          kind,
          url: url.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Resource added");
      setOpen(false);
      setTitle("");
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const moduleCode = (id: string | null) =>
    (modules.data?.modules ?? []).find((m) => m.id === id)?.code ?? "General";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            Slides, recordings and reference material mapped to modules.
          </p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add resource</DialogTitle>
                <DialogDescription>Link to any hosted material.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>URL</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                </div>
                <div className="space-y-1.5">
                  <Label>Module</Label>
                  <Select value={moduleId} onValueChange={setModuleId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General</SelectItem>
                      {(modules.data?.modules ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.code} — {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate()}
                  disabled={create.isPending || title.trim().length < 2 || url.trim().length < 4}
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(resources.data ?? []).map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start justify-between gap-2 text-sm">
                <span className="truncate">{r.title}</span>
                <Badge variant="secondary">{r.kind}</Badge>
              </CardTitle>
              <CardDescription>{moduleCode(r.module_id)}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
              {isStaff && (
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => del.mutate(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {resources.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No resources shared yet.</p>
        )}
      </div>
    </div>
  );
}
