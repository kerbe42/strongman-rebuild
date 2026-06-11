import { useEffect } from "react";
import { useRoute } from "../lib/router";
import { Today } from "../screens/Today";
import { Plan } from "../screens/Plan";
import { Meals } from "../screens/Meals";
import { Exercises } from "../screens/Exercises";
import { Progress } from "../screens/Progress";
import { Settings } from "../screens/Settings";

const TABS = [
  { id: "today", label: "Today", icon: "🏋️" },
  { id: "plan", label: "Plan", icon: "🗓️" },
  { id: "meals", label: "Meals", icon: "🍽️" },
  { id: "exercises", label: "Lifts", icon: "📚" },
  { id: "progress", label: "Progress", icon: "📈" },
  { id: "settings", label: "Settings", icon: "⚙️" },
] as const;

export function Shell() {
  const [route, navigate] = useRoute();

  // Scroll to top on tab change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.tab, route.param]);

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <main className="flex-1 px-4 pb-28 pt-5">
        {route.tab === "today" && <Today />}
        {route.tab === "plan" && <Plan param={route.param} />}
        {route.tab === "meals" && <Meals />}
        {route.tab === "exercises" && <Exercises />}
        {route.tab === "progress" && <Progress />}
        {route.tab === "settings" && <Settings />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {TABS.map((tab) => {
            const active = route.tab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[11px] font-medium ${
                  active ? "text-blue-400" : "text-slate-500"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
