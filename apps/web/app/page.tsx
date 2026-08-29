"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider, Button, Input, App } from "antd";
import { createBatch } from "../lib/api";

const theme = {
  token: {
    fontFamily: '"JetBrains Mono", monospace',
    colorPrimary: "#000000",
    colorSuccess: "#22c55e",
    colorError: "#ef4444",
    colorWarning: "#f59e0b",
    borderRadius: 0,
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 0,
      controlHeight: 44,
      paddingInline: 24,
      fontWeight: 600,
    },
    Input: {
      borderRadius: 0,
      controlHeight: 44,
      borderWidth: 3,
    },
    Table: {
      borderRadius: 0,
      headerBg: "#f5f5f5",
      headerColor: "#000000",
      headerFontWeight: 700,
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      borderColor: "#000000",
      rowHoverBg: "#f5f5f5",
    },
    Tag: {
      borderRadiusSM: 0,
      defaultBg: "transparent",
    },
    Progress: {
      borderRadius: 0,
    },
  },
};

function parseUrls(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const candidates = text
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  for (const u of candidates) {
    try {
      const parsed = new URL(u);
      const key = parsed.href.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(parsed.href);
      }
    } catch {
      // skip invalid URLs
    }
  }

  return result;
}

function parseCsv(text: string): string[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = lines[0]!.toLowerCase();
  const urlColIdx = header.split(",").findIndex((h) => h.trim() === "url");
  const startRow = urlColIdx >= 0 ? 1 : 0;
  const colIdx = urlColIdx >= 0 ? urlColIdx : 0;

  const urls: string[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    if (cols.length > colIdx) {
      let val = cols[colIdx]!.trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      if (val.length > 0) urls.push(val);
    }
  }
  return urls;
}

export default function Home() {
  const router = useRouter();
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedUrls = parseUrls(urls);
  const urlCount = parsedUrls.length;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const ext = file.name.split(".").pop()?.toLowerCase();
      let extracted: string[];

      if (ext === "csv") {
        extracted = parseCsv(text);
      } else {
        extracted = parseUrls(text);
      }

      if (extracted.length > 0) {
        const current = urls.trim();
        const newUrls = current ? current + "\n" + extracted.join("\n") : extracted.join("\n");
        setUrls(newUrls);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleSubmit = async () => {
    if (parsedUrls.length === 0) return;

    setLoading(true);
    try {
      const { id } = await createBatch(parsedUrls);
      router.push(`/batches/${id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={theme}>
      <App>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 640,
              border: "3px solid #000",
              boxShadow: "6px 6px 0 #000",
              padding: 40,
              background: "#fff",
            }}
          >
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: -1,
                marginBottom: 8,
              }}
            >
              URL Checker
            </h1>
            <p
              style={{
                color: "#737373",
                marginBottom: 32,
                fontSize: 13,
              }}
            >
              Paste URLs or upload a CSV. Max 1000.
            </p>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                position: "relative",
                border: `3px dashed ${dragOver ? "#3b82f6" : "#d4d4d4"}`,
                background: dragOver ? "#eff6ff" : "transparent",
                transition: "all 0.15s ease",
                padding: dragOver ? 12 : 0,
                marginBottom: 12,
              }}
            >
              {dragOver && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#3b82f6",
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "uppercase",
                    padding: "8px 0",
                  }}
                >
                  Drop CSV or text file here
                </div>
              )}
              <Input.TextArea
                rows={10}
                placeholder={"https://example.com\nhttps://google.com\nhttps://github.com\n\nOr drag a CSV file here"}
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                style={{
                  border: dragOver ? "3px solid #3b82f6" : "3px solid #000",
                  boxShadow: dragOver ? "3px 3px 0 #3b82f6" : "3px 3px 0 #000",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 13,
                  resize: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#737373" }}>
                  {urlCount} URL{urlCount !== 1 ? "s" : ""}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.text"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: 12,
                    height: 32,
                    paddingInline: 12,
                  }}
                >
                  Upload CSV
                </Button>
              </div>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={urlCount === 0}
                style={{
                  border: "3px solid #000",
                  boxShadow: "3px 3px 0 #000",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  fontSize: 14,
                }}
              >
                Check URLs
              </Button>
            </div>

            <div
              style={{
                marginTop: 32,
                paddingTop: 20,
                borderTop: "2px solid #e5e5e5",
              }}
            >
              <a
                href="/batches"
                style={{
                  fontSize: 13,
                  color: "#737373",
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                View all batches →
              </a>
            </div>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
}
