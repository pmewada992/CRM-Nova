"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { csvRowSchema } from "@/lib/validations/lead";

const CRM_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email", required: false },
  { key: "linkedin", label: "LinkedIn", required: false },
  { key: "visa_status", label: "VISA Status", required: false },
  { key: "graduation_date", label: "Graduation Date", required: false },
] as const;

type CrmField = (typeof CRM_FIELDS)[number]["key"];
const IGNORE = "__ignore__";
const BATCH_SIZE = 500;

const FIELD_ALIASES: Record<CrmField, string[]> = {
  name: ["name", "fullname", "candidatename", "leadname"],
  phone: ["phone", "phonenumber", "mobile", "cell", "contactnumber"],
  email: ["email", "emailaddress", "mail"],
  linkedin: ["linkedin", "linkedinprofile", "linkedinurl"],
  visa_status: ["visa", "visastatus"],
  graduation_date: ["graduation", "graduationdate", "graddate", "gradyear"],
};

function guessMapping(headers: string[]): Record<CrmField, string> {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const normalizedHeaders = headers.map((h) => ({ raw: h, normalized: normalize(h) }));
  const mapping = {} as Record<CrmField, string>;
  for (const field of CRM_FIELDS) {
    const aliases = FIELD_ALIASES[field.key];
    const match = normalizedHeaders.find((h) => aliases.some((alias) => h.normalized.includes(alias)));
    mapping[field.key] = match?.raw ?? "";
  }
  return mapping;
}

export function CsvImport({
  bdeUsers,
  canAssign,
  onDone,
}: {
  bdeUsers: { id: string; name: string }[];
  canAssign: boolean;
  onDone: () => void;
}) {
  const [rawRows, setRawRows] = useState<Record<string, string>[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<CrmField, string>>(
    {} as Record<CrmField, string>,
  );
  const [leadBy, setLeadBy] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    total: number;
    processed: number;
    inserted: number;
    duplicates: number;
    invalid: number;
  } | null>(null);

  function handleFile(file: File) {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        if (fields.length === 0 || results.data.length === 0) {
          setError("Couldn't find any rows in that file.");
          return;
        }
        setHeaders(fields);
        setMapping(guessMapping(fields));
        setRawRows(results.data);
      },
      error: (err) => setError(err.message),
    });
  }

  const mappingValid = mapping.name && mapping.phone;

  async function startImport() {
    if (!rawRows || !mappingValid) return;
    setError(null);

    const validRows: ReturnType<typeof csvRowSchema.parse>[] = [];
    let invalid = 0;
    for (const raw of rawRows) {
      const candidate = {
        name: mapping.name ? raw[mapping.name] : "",
        phone: mapping.phone ? raw[mapping.phone] : "",
        email: mapping.email ? raw[mapping.email] : "",
        linkedin: mapping.linkedin ? raw[mapping.linkedin] : "",
        visa_status: mapping.visa_status ? raw[mapping.visa_status] : "",
        graduation_date: mapping.graduation_date ? raw[mapping.graduation_date] : "",
      };
      const parsed = csvRowSchema.safeParse(candidate);
      if (parsed.success) validRows.push(parsed.data);
      else invalid++;
    }

    setProgress({ total: validRows.length, processed: 0, inserted: 0, duplicates: 0, invalid });

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch("/api/csv-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadBy: leadBy || null, rows: batch }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Import failed");
        setProgress((p) =>
          p
            ? {
                ...p,
                processed: p.processed + batch.length,
                inserted: p.inserted + json.data.inserted,
                duplicates: p.duplicates + json.data.duplicateCount,
              }
            : p,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed partway through.");
        return;
      }
    }
  }

  if (progress) {
    const percent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 100;
    const done = progress.processed >= progress.total;
    return (
      <div className="flex flex-col gap-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">
          {progress.processed} / {progress.total} rows processed
        </p>
        {done && (
          <div className="space-y-1 text-sm">
            <p>{progress.inserted} leads imported.</p>
            {progress.duplicates > 0 && (
              <p className="text-orange-700">
                {progress.duplicates} had a phone number already in the system (imported anyway,
                flagged for review).
              </p>
            )}
            {progress.invalid > 0 && (
              <p className="text-red-700">
                {progress.invalid} rows were skipped (missing Name or Phone).
              </p>
            )}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {done && (
          <Button onClick={onDone} className="self-end">
            Done
          </Button>
        )}
      </div>
    );
  }

  if (!rawRows) {
    return (
      <div className="flex flex-col gap-3">
        <Label htmlFor="csv-file">CSV file</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <p className="text-xs text-muted-foreground">
          Only Name and Phone are required — everything else is optional. Handles files with
          tens of thousands of rows.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {rawRows.length} rows found. Match each CRM field to a column from your file.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {CRM_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && " *"}
            </Label>
            <Select
              value={mapping[field.key] || IGNORE}
              onValueChange={(v) =>
                setMapping((m) => ({ ...m, [field.key]: v === IGNORE ? "" : (v ?? "") }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={IGNORE}>
                  {field.required ? "Select a column..." : "Ignore"}
                </SelectItem>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {canAssign && (
        <div className="space-y-1.5">
          <Label>Import as (BDE) — credited as Lead Owner for every row</Label>
          <Select value={leadBy || undefined} onValueChange={(v) => setLeadBy(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No one (leave unowned)" />
            </SelectTrigger>
            <SelectContent>
              {bdeUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setRawRows(null)}>
          Choose a different file
        </Button>
        <Button disabled={!mappingValid} onClick={startImport}>
          Import {rawRows.length} Leads
        </Button>
      </div>
    </div>
  );
}
