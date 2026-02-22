"use client";

import { Card } from "@/components/ui/card";
import type { LabTemplate } from "@/lib/types/labs";

interface TemplateStarterProps {
  templates: LabTemplate[];
  onSelect: (template: LabTemplate) => void;
}

const difficultyColors = {
  beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  advanced: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export function TemplateStarter({ templates, onSelect }: TemplateStarterProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Quick Start Templates
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="group text-left"
          >
            <Card
              hover
              className="!p-4 transition-all duration-200 group-hover:border-purple-500/30"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-purple-300 transition-colors">
                    {template.name}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {template.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        difficultyColors[template.difficulty]
                      }`}
                    >
                      {template.difficulty}
                    </span>
                    {template.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-zinc-700/40 bg-zinc-800/40 px-2 py-0.5 text-[10px] text-zinc-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
