import { useState } from "react";
import { Plus, Trash2, MoveUp, MoveDown, Settings2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormSchema, saveFormSchema } from "@/lib/products.functions";
import { toast } from "sonner";

interface FormBuilderProps {
  initialSchema: FormSchema;
  onSaved?: (schema: FormSchema) => void;
}

export function FormBuilder({ initialSchema, onSaved }: FormBuilderProps) {
  const [name, setName] = useState(initialSchema.name);
  const [fields, setFields] = useState<FormField[]>(initialSchema.fields || []);
  const [isSaving, setIsSaving] = useState(false);

  const addField = () => {
    const newField: FormField = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: "New Field Label",
      type: "text",
      required: false,
      placeholder: "",
    };
    setFields((prev) => [...prev, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const copy = [...fields];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIndex, 0, moved);
    setFields(copy);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Form title is required");
      return;
    }
    if (fields.length === 0) {
      toast.error("Form must have at least one field");
      return;
    }

    try {
      setIsSaving(true);
      const saved = await saveFormSchema({
        id: initialSchema.id,
        name: name.trim(),
        schema_type: initialSchema.schema_type,
        fields,
      });
      toast.success(`${initialSchema.schema_type === "onboarding" ? "Onboarding" : "Dependency"} form template saved successfully!`);
      if (onSaved) onSaved(saved);
    } catch (err: any) {
      toast.error(err.message || "Failed to save form template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Customize {initialSchema.schema_type === "onboarding" ? "Product Onboarding" : "Product Dependency"} Form
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Add, reorder, or customize the input fields for your team's workflow.
            </CardDescription>
          </div>

          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Form Template"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Template Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Product Onboarding Form"
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground">Form Fields ({fields.length})</Label>
            <Button size="sm" variant="outline" onClick={addField} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Field
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
              No custom fields configured yet. Click "Add Field" above to start customizing.
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-4 rounded-lg border border-border/70 bg-card/60 shadow-xs space-y-3 transition-all hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold">{field.label || "Untitled Field"}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        disabled={idx === 0}
                        onClick={() => moveField(idx, "up")}
                      >
                        <MoveUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        disabled={idx === fields.length - 1}
                        onClick={() => moveField(idx, "down")}
                      >
                        <MoveDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Field Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Input Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(val: FormField["type"]) => updateField(field.id, { type: val })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Input</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="select">Dropdown Select</SelectItem>
                          <SelectItem value="textarea">Textarea Block</SelectItem>
                          <SelectItem value="checkbox">Checkbox / Switch</SelectItem>
                          <SelectItem value="date">Date Picker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between pt-5 px-2">
                      <Label className="text-[11px] font-medium">Required Field</Label>
                      <Switch
                        checked={Boolean(field.required)}
                        onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                      />
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">
                        Dropdown Options (comma separated)
                      </Label>
                      <Input
                        value={(field.options || []).join(", ")}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Option 1, Option 2, Option 3"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {(field.type === "text" || field.type === "textarea" || field.type === "number") && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Placeholder Text</Label>
                      <Input
                        value={field.placeholder || ""}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        placeholder="e.g. Enter details..."
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
