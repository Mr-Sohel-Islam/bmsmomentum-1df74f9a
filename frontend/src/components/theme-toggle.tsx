import { Moon, Crown, Sparkles, Snowflake, Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, Theme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const themesConfig: {
    id: Theme;
    name: string;
    description: string;
    icon: typeof Moon;
    iconColor: string;
    badgeBg: string;
  }[] = [
    {
      id: "dark",
      name: "Dark Mode",
      description: "Signal Green Operations Aesthetic",
      icon: Moon,
      iconColor: "text-emerald-400",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      id: "dark-premium",
      name: "Dark Premium",
      description: "Golden Black with Silver & Platinum",
      icon: Crown,
      iconColor: "text-amber-400",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
    {
      id: "cherry-blossom",
      name: "Cherry Blossom Light",
      description: "Soft Pink, Pale Mint & Sunny Yellow",
      icon: Sparkles,
      iconColor: "text-pink-500",
      badgeBg: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-300",
    },
    {
      id: "winter-light",
      name: "Winter Light",
      description: "Ice Blue, Slate Frost & Deep Navy",
      icon: Snowflake,
      iconColor: "text-sky-500",
      badgeBg: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300",
    },
  ];

  const currentConfig = themesConfig.find((t) => t.id === theme) || themesConfig[0];
  const IconComponent = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`relative flex items-center gap-2 h-8.5 px-3 text-xs border-border/80 bg-background/80 shadow-xs hover:border-primary/50 transition-all ${className}`}
          aria-label="Select color theme"
        >
          <IconComponent className={`h-3.5 w-3.5 ${currentConfig.iconColor}`} />
          <span className="hidden md:inline font-mono text-[11px] font-medium">
            {currentConfig.name}
          </span>
          <Palette className="h-3 w-3 text-muted-foreground ml-0.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-68 p-1.5 shadow-xl border-border/80">
        <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Palette className="h-3.5 w-3.5 text-primary" /> Active Color Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {themesConfig.map((item) => {
          const ItemIcon = item.icon;
          const isSelected = theme === item.id;
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => setTheme(item.id)}
              className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                isSelected ? "bg-accent/80 font-medium" : "hover:bg-muted/60"
              }`}
            >
              <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs ${item.badgeBg}`}>
                <ItemIcon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{item.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
