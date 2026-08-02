import { useQuery } from "@tanstack/react-query";
import { Cake, Heart, Sparkles, Calendar, Clock, Phone, Gift, MapPin, ExternalLink, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { SpecialDayReminder } from "@/lib/pharma.functions";

export function SpecialDayReminders({ className = "" }: { className?: string }) {
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["special-day-reminders"],
    queryFn: () => apiClient.get<SpecialDayReminder[]>("/pharma/special-days"),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className={`rounded-xl border border-border/80 bg-card/60 p-6 backdrop-blur-md ${className}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-spin text-primary" /> Loading 7-day special day countdowns...
        </div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className={`rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur-md text-center ${className}`}>
        <div className="flex justify-center mb-2">
          <Calendar className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No Upcoming Special Days (Next 7 Days)</h3>
        <p className="text-xs text-muted-foreground mt-1">
          All doctor birthdays, anniversaries, and special events are clear for the upcoming week.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 rounded-xl border border-border/80 bg-card/60 p-6 backdrop-blur-md shadow-sm ${className}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> 7-Day Countdown Engine
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-5 w-5 text-primary" /> Upcoming Special Day Reminders
          </h2>
        </div>
        <Badge variant="outline" className="w-fit border-primary/40 bg-primary/10 text-primary font-mono text-xs">
          {reminders.length} Active {reminders.length === 1 ? "Event" : "Events"} in 7 Days
        </Badge>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {reminders.map((item) => {
          const isToday = item.days_remaining === 0;
          const isTomorrow = item.days_remaining === 1;

          // Icon Selection
          let EventIcon = Sparkles;
          let iconColor = "text-purple-400 bg-purple-500/10 border-purple-500/30";
          if (item.type === "doctor_dob" || item.type === "doctor_spouse_dob") {
            EventIcon = Cake;
            iconColor = "text-pink-400 bg-pink-500/10 border-pink-500/30";
          } else if (item.type === "doctor_anniversary") {
            EventIcon = Heart;
            iconColor = "text-rose-400 bg-rose-500/10 border-rose-500/30";
          }

          // WhatsApp Message Generator
          const whatsappMsg = encodeURIComponent(
            `Respected ${item.target_name}, Warm Greetings from MOMENTUM Pharmaceuticals! Wishing you a very Happy ${item.title.split("'s ")[1] || "Special Day"}! May your day be filled with joy and success.`
          );
          const whatsappUrl = item.contact_number
            ? `https://wa.me/${item.contact_number.replace(/[^0-9]/g, "")}?text=${whatsappMsg}`
            : "#";

          return (
            <div
              key={item.id}
              className={`group relative rounded-xl border p-4 backdrop-blur-md transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                isToday
                  ? "border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                  : isTomorrow
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-border/80 bg-card/80 hover:border-primary/50"
              }`}
            >
              {/* Countdown Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${iconColor}`}>
                  <EventIcon className="h-4.5 w-4.5" />
                </div>

                <Badge
                  className={`font-mono text-[11px] font-bold uppercase tracking-wider ${
                    isToday
                      ? "bg-emerald-500 text-slate-950 animate-pulse shadow-sm shadow-emerald-500/50"
                      : isTomorrow
                        ? "bg-amber-500 text-slate-950"
                        : "bg-primary/20 text-primary border border-primary/30"
                  }`}
                >
                  {isToday ? "TODAY! 🎉" : isTomorrow ? "TOMORROW ⏰" : `IN ${item.days_remaining} DAYS`}
                </Badge>
              </div>

              {/* Event Content */}
              <div className="mt-3 space-y-1">
                <h3 className="font-bold text-base tracking-tight text-foreground line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
              </div>

              {/* Event Metadata Badges */}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                {item.area && (
                  <span className="flex items-center gap-1 text-muted-foreground/90">
                    <MapPin className="h-3 w-3 text-primary" /> {item.area}
                  </span>
                )}
                {item.gift_details && (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <Gift className="h-3 w-3 text-amber-400" /> Gift: {item.gift_details.split("&")[0]}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                <span className="font-mono text-[11px] text-muted-foreground">
                  Date: {item.event_date}
                </span>

                {item.contact_number && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500"
                  >
                    <Phone className="h-3 w-3" /> Wish on WhatsApp
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
