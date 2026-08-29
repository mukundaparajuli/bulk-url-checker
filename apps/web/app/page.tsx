"use client";

import { useState } from "react";
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

export default function Home() {
  const router = useRouter();
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const parsed = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (parsed.length === 0) return;

    setLoading(true);
    try {
      const { id } = await createBatch(parsed);
      router.push(`/batches/${id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const urlCount = urls
    .split("\n")
    .filter((u) => u.trim().length > 0).length;

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
              Enter URLs, one per line. Max 1000.
            </p>

            <Input.TextArea
              rows={10}
              placeholder={"https://example.com\nhttps://google.com\nhttps://github.com"}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              style={{
                border: "3px solid #000",
                boxShadow: "3px 3px 0 #000",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 13,
                resize: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 20,
              }}
            >
              <span style={{ fontSize: 13, color: "#737373" }}>
                {urlCount} URL{urlCount !== 1 ? "s" : ""}
              </span>
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
