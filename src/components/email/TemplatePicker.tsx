import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { BookTemplate } from "lucide-react";

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string | null;
  content_html: string;
  category: string | null;
  entity: string | null;
};

interface TemplatePickerProps {
  onSelect: (template: EmailTemplate) => void;
}

export default function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("email_templates")
      .select("id, name, subject, content_html, category, entity")
      .order("category", { ascending: true });
    if (data) setTemplates(data as EmailTemplate[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);

  // Group templates by category
  const grouped = templates.reduce<Record<string, EmailTemplate[]>>((acc, t) => {
    const cat = t.category || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <BookTemplate className="w-3.5 h-3.5" />
        Plantillas
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar plantilla..." />
        <CommandList>
          <CommandEmpty>
            {loading ? "Cargando..." : "No se encontraron plantillas."}
          </CommandEmpty>
          {Object.entries(grouped).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((t) => (
                <CommandItem
                  key={t.id}
                  onSelect={() => {
                    onSelect(t);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="font-medium text-sm">{t.name}</span>
                    {t.subject && (
                      <span className="text-xs text-muted-foreground truncate">
                        {t.subject}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground/70 truncate">
                      {t.content_html.replace(/<[^>]+>/g, "").slice(0, 80)}
                    </span>
                  </div>
                  {t.entity && (
                    <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {t.entity}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
