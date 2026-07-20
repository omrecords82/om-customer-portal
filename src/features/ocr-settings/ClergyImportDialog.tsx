import { Checkbox, Stack, Tabs, Text, Textarea } from "@mantine/core";
import { Button } from "@om/ui/button";
import { Dialog } from "@om/ui/dialog";
import { Table } from "@om/ui/table";
import { TextField } from "@om/ui/text-field";
import { useCallback, useRef, useState } from "react";

import {
  bulkImportClergyEntities,
  ocrExtractClergyFromImage,
  parseClergyImportText,
} from "./ocrSettingsApi";
import {
  CLERGY_CSV_TEMPLATE,
  CLERGY_JSON_TEMPLATE,
  downloadTextFile,
  parseClergyFile,
  type ClergyImportRow,
} from "./clergyImport";
import { formatClergyDate } from "./ocrSettingsHelpers";

type ImportMode = "file" | "ocr" | "paste";

type ClergyImportDialogProps = {
  readonly churchId: number;
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onImported: () => void;
  readonly onError: (message: string) => void;
};

export function ClergyImportDialog({
  churchId,
  isOpen,
  onOpenChange,
  onImported,
  onError,
}: ClergyImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ImportMode>("file");
  const [rows, setRows] = useState<ClergyImportRow[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [defaultRole, setDefaultRole] = useState("Rector");
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const resetPreview = () => {
    setRows([]);
    setStatus(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setRows([]);
      setPasteText("");
      setOcrText("");
      setStatus(null);
    }
    onOpenChange(open);
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        const parsed = await parseClergyFile(file, firstRowIsHeader, defaultRole);
        setRows(parsed.map((r) => ({ ...r, selected: true })));
        setStatus(
          parsed.length
            ? `Parsed ${String(parsed.length)} record(s) from ${file.name}.`
            : "No clergy records detected in file.",
        );
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to parse file");
        resetPreview();
      } finally {
        setLoading(false);
      }
    },
    [defaultRole, firstRowIsHeader, onError],
  );

  const handleOcrImage = useCallback(
    async (file: File) => {
      setLoading(true);
      const result = await ocrExtractClergyFromImage(churchId, file, defaultRole);
      setLoading(false);
      if (!result.ok) {
        onError(result.message);
        resetPreview();
        return;
      }
      setOcrText(result.data.text);
      const parsed = result.data.rows.map((r) => ({
        canonical_value: r.canonical_value,
        role: r.role ?? defaultRole,
        active_from: r.active_from ?? null,
        active_to: r.active_to ?? null,
        variants_json: r.variants_json ?? [],
        source_notes: r.source_notes ?? null,
        selected: true,
      }));
      setRows(parsed);
      setStatus(
        parsed.length
          ? `Parsed ${String(parsed.length)} record(s) from OCR image.`
          : "OCR text extracted but no clergy rows detected — try Paste text to edit.",
      );
    },
    [churchId, defaultRole, onError],
  );

  const handleParsePaste = useCallback(async () => {
    if (!pasteText.trim()) {
      onError("Paste roster text first.");
      return;
    }
    setLoading(true);
    const result = await parseClergyImportText(churchId, pasteText, defaultRole);
    setLoading(false);
    if (!result.ok) {
      onError(result.message);
      resetPreview();
      return;
    }
    const parsed = result.data.map((r) => ({
      canonical_value: r.canonical_value,
      role: r.role ?? defaultRole,
      active_from: r.active_from ?? null,
      active_to: r.active_to ?? null,
      variants_json: r.variants_json ?? [],
      source_notes: r.source_notes ?? null,
      selected: true,
    }));
    setRows(parsed);
    setStatus(`Parsed ${String(parsed.length)} record(s) from pasted text.`);
  }, [churchId, defaultRole, onError, pasteText]);

  const selectedRows = rows.filter((r) => r.selected !== false);

  async function handleImport() {
    if (!selectedRows.length) {
      onError("Select at least one row to import.");
      return;
    }
    setImporting(true);
    const result = await bulkImportClergyEntities(
      churchId,
      selectedRows.map(({ selected, warnings, ...rest }) => rest),
      { skipDuplicates, defaultRole },
    );
    setImporting(false);
    if (!result.ok) {
      onError(result.message);
      return;
    }
    setStatus(result.data.message);
    onImported();
    if (result.data.created > 0) {
      setTimeout(() => handleClose(false), 1200);
    }
  }

  return (
    <Dialog title="Import parish clergy" isOpen={isOpen} onOpenChange={handleClose}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Import clergy tenures from CSV/JSON, OCR scan of a parish roster, or pasted text.
        </Text>
        <Stack gap="sm">
          <TextField label="Default role" value={defaultRole} onValueChange={setDefaultRole} />
          <Checkbox
            label="Skip duplicates"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.currentTarget.checked)}
          />
        </Stack>

        <Tabs
          value={mode}
          onChange={(v) => {
            setMode((v ?? "file") as ImportMode);
            resetPreview();
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="file">File</Tabs.Tab>
            <Tabs.Tab value="ocr">OCR image</Tabs.Tab>
            <Tabs.Tab value="paste">Paste text</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="file" pt="md">
            <Stack gap="sm">
              <Stack gap="xs">
                <Button
                  className="om-btn-ghost"
                  size="sm"
                  onAction={() => downloadTextFile("clergy-template.csv", CLERGY_CSV_TEMPLATE, "text/csv")}
                >
                  Download CSV template
                </Button>
                <Button
                  className="om-btn-ghost"
                  size="sm"
                  onAction={() =>
                    downloadTextFile("clergy-template.json", CLERGY_JSON_TEMPLATE, "application/json")
                  }
                >
                  Download JSON template
                </Button>
              </Stack>
              <Checkbox
                label="First row is column headers (CSV)"
                checked={firstRowIsHeader}
                onChange={(e) => setFirstRowIsHeader(e.currentTarget.checked)}
              />
              <Button className="om-btn-ghost" size="sm" onAction={() => fileInputRef.current?.click()}>
                Choose CSV or JSON file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".csv,.tsv,.txt,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileSelect(file);
                  e.target.value = "";
                }}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="ocr" pt="md">
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                Upload a photo or scan of a parish clergy list.
              </Text>
              <Button className="om-btn-ghost" size="sm" onAction={() => ocrInputRef.current?.click()} isDisabled={loading}>
                {loading ? "Processing…" : "Choose image"}
              </Button>
              <input
                ref={ocrInputRef}
                type="file"
                hidden
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleOcrImage(file);
                  e.target.value = "";
                }}
              />
              {ocrText ? (
                <Textarea label="Extracted OCR text" value={ocrText} readOnly minRows={4} />
              ) : null}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="paste" pt="md">
            <Stack gap="sm">
              <Textarea
                label="Roster text"
                minRows={6}
                placeholder={'1. Fr. Andrew Slepecky Aug. 1916 — Feb. 1917\n2. Fr. Constantine Suchostovsky Feb. 1917 — Nov. 1917'}
                value={pasteText}
                onChange={(e) => setPasteText(e.currentTarget.value)}
              />
              <Button
                className="om-btn-ghost"
                size="sm"
                onAction={() => void handleParsePaste()}
                isDisabled={loading || !pasteText.trim()}
              >
                {loading ? "Parsing…" : "Parse text"}
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {status ? (
          <Text size="sm" role="status">
            {status}
          </Text>
        ) : null}

        {rows.length > 0 ? (
          <Table
            accessibleLabel="Clergy import preview"
            emptyMessage="No rows."
            columns={[
              {
                id: "select",
                header: "Import",
                renderCell: (row) => (
                  <Checkbox
                    checked={row.row.selected !== false}
                    onChange={(e) => {
                      const idx = row.index;
                      setRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, selected: e.currentTarget.checked } : r)),
                      );
                    }}
                  />
                ),
              },
              {
                id: "name",
                header: "Name",
                isRowHeader: true,
                renderCell: (row) => row.row.canonical_value,
              },
              { id: "role", header: "Role", renderCell: (row) => row.row.role ?? "—" },
              {
                id: "from",
                header: "From",
                renderCell: (row) => formatClergyDate(row.row.active_from) || "—",
              },
              {
                id: "to",
                header: "To",
                renderCell: (row) => formatClergyDate(row.row.active_to) || "—",
              },
            ]}
            rows={rows.map((row, index) => ({ id: String(index), row, index }))}
          />
        ) : null}

        <Stack gap="xs" align="flex-end">
          <Button className="om-btn-ghost" size="sm" variant="secondary" onAction={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            className="om-btn-primary"
            size="sm"
            isPending={importing}
            isDisabled={!selectedRows.length}
            onAction={() => void handleImport()}
          >
            {importing ? "Importing…" : `Import ${String(selectedRows.length)} selected`}
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
}
