import { Check, ChevronDown, RotateCcw, Search, Star, Tags, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LEVEL_TONE } from "@/lib/problems-shared";
import {
  EMPTY_FILTERS,
  LEVELS,
  PRESETS,
  isDirty,
  matchPreset,
  type ProblemFilters,
} from "@/lib/problem-presets";

type Props = {
  filters: ProblemFilters;
  onChange: (next: ProblemFilters) => void;
  /** Tag name -> number of problems carrying it. */
  tagCounts: { tag: string; count: number }[];
  companies: string[];
  favouriteCount: number;
  shown: number;
  total: number;
};

export function ProblemFilters({
  filters,
  onChange,
  tagCounts,
  companies,
  favouriteCount,
  shown,
  total,
}: Props) {
  const set = (patch: Partial<ProblemFilters>) => onChange({ ...filters, ...patch });
  const activePreset = matchPreset(filters);
  const dirty = isDirty(filters);

  const toggleTag = (tag: string) =>
    set({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag].slice(0, 12),
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.id}
            size="sm"
            variant={activePreset === preset.id ? "secondary" : "outline"}
            title={preset.hint}
            className="rounded-full"
            onClick={() => onChange({ ...EMPTY_FILTERS, ...preset.patch })}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, tag or company"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            maxLength={60}
            className="w-56 pl-8"
          />
        </div>

        <ToggleGroup
          type="multiple"
          value={filters.levels}
          onValueChange={(levels) => set({ levels })}
          variant="outline"
          size="sm"
        >
          {LEVELS.map((level) => (
            <ToggleGroupItem
              key={level}
              value={level}
              aria-label={level}
              className={`capitalize ${LEVEL_TONE[level]}`}
            >
              {level}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Tags className="size-4" />
              {filters.tags.length ? `${filters.tags.length} topics` : "Topics"}
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Find a topic" />
              <CommandList>
                <CommandEmpty>No topic found.</CommandEmpty>
                <CommandGroup>
                  {tagCounts.map(({ tag, count }) => (
                    <CommandItem key={tag} value={tag} onSelect={() => toggleTag(tag)}>
                      <Check
                        className={`mr-2 size-4 ${
                          filters.tags.includes(tag) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span className="mr-auto">{tag}</span>
                      <span className="tabular-nums text-xs text-muted-foreground">{count}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Select value={filters.status} onValueChange={(status) => set({ status })}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="attempted">Attempted</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.company} onValueChange={(company) => set({ company })}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any company</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={filters.fav ? "secondary" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => set({ fav: !filters.fav })}
        >
          <Star className={`size-4 ${filters.fav ? "fill-amber-400 text-amber-400" : ""}`} />
          Favourites ({favouriteCount})
        </Button>

        {dirty ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
          >
            <RotateCcw className="size-3.5" /> Clear all
          </Button>
        ) : null}

        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {shown} of {total} problems
        </span>
      </div>

      {filters.tags.length ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer gap-1 font-normal"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              <X className="size-3" />
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
