"use client";

import { useEffect, useState, useCallback } from "react";
import { ConfigProvider, Table, Tag, Button, Popconfirm, App } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  getBatchById,
  cancelBatch,
  retryFailed,
  batchEventsUrl,
  type BatchDetail,
  type BatchUrl,
} from "../../../lib/api";

const theme = {
  token: {
    fontFamily: '"JetBrains Mono", monospace',
    colorPrimary: "#000000",
    borderRadius: 0,
    fontSize: 13,
  },
  components: {
    Table: {
      borderRadius: 0,
      headerBg: "#f5f5f5",
      headerColor: "#000000",
      headerFontWeight: 700,
      cellPaddingBlock: 10,
      cellPaddingInline: 16,
      borderColor: "#000000",
      rowHoverBg: "#f5f5f5",
    },
    Tag: {
      borderRadiusSM: 0,
    },
  },
};

const urlStatusColors: Record<string, string> = {
  PENDING: "#a3a3a3",
  QUEUED: "#a3a3a3",
  PROCESSING: "#3b82f6",
  SUCCESS: "#22c55e",
  FAILED: "#ef4444",
  CANCELLED: "#a3a3a3",
};

function downloadCsv(data: BatchDetail) {
  const headers = ["url", "status", "httpStatus", "responseTimeMs", "pageTitle", "error"];
  const rows = data.urls.map((u) =>
    headers
      .map((h) => {
        const val = u[h as keyof BatchUrl];
        const str = val == null ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `batch-${data.id.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ProgressBar({
  completed,
  total,
  status,
}: {
  completed: number;
  total: number;
  status: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isActive = status === "RUNNING" || status === "PENDING";
  return (
    <div>
      <div
        style={{
          height: 20,
          width: "100%",
          border: "3px solid #000",
          background: "#f5f5f5",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: status === "FAILED" ? "#ef4444" : "#000",
            transition: "width 0.3s ease",
            position: "relative",
          }}
        >
          {isActive && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                animation: "shimmer 1.5s infinite",
              }}
            />
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 12,
          color: "#737373",
        }}
      >
        <span>
          {completed} / {total} ({pct}%)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isActive && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#3b82f6",
                display: "inline-block",
                animation: "pulse 1.5s infinite",
              }}
            />
          )}
          <span style={{ fontWeight: 700, textTransform: "uppercase" }}>
            {status}
          </span>
        </span>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

const urlColumns: ColumnsType<BatchUrl> = [
  {
    title: "URL",
    dataIndex: "url",
    key: "url",
    ellipsis: true,
    render: (url: string) => (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "underline", textUnderlineOffset: 3 }}
      >
        {url}
      </a>
    ),
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: 120,
    render: (status: string) => (
      <Tag
        style={{
          border: `2px solid ${urlStatusColors[status] || "#000"}`,
          background: urlStatusColors[status] || "#000",
          color: "#fff",
          fontWeight: 700,
          fontSize: 10,
          textTransform: "uppercase",
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {status}
      </Tag>
    ),
  },
  {
    title: "HTTP",
    dataIndex: "httpStatus",
    key: "httpStatus",
    width: 80,
    render: (v: number | null) =>
      v ? (
        <span
          style={{
            fontWeight: 700,
            color: v >= 200 && v < 300 ? "#22c55e" : v >= 400 ? "#ef4444" : "#000",
          }}
        >
          {v}
        </span>
      ) : (
        <span style={{ color: "#d4d4d4" }}>—</span>
      ),
  },
  {
    title: "Time",
    dataIndex: "responseTimeMs",
    key: "responseTimeMs",
    width: 90,
    render: (v: number | null) =>
      v ? <span>{v}ms</span> : <span style={{ color: "#d4d4d4" }}>—</span>,
  },
  {
    title: "Title",
    dataIndex: "pageTitle",
    key: "pageTitle",
    ellipsis: true,
    render: (v: string | null) => v || <span style={{ color: "#d4d4d4" }}>—</span>,
  },
  {
    title: "Error",
    dataIndex: "error",
    key: "error",
    ellipsis: true,
    width: 200,
    render: (v: string | null) =>
      v ? (
        <span style={{ color: "#ef4444", fontSize: 12 }}>{v}</span>
      ) : (
        <span style={{ color: "#d4d4d4" }}>—</span>
      ),
  },
];

export default function BatchClient({
  batchId,
  initialData,
}: {
  batchId: string;
  initialData: BatchDetail;
}) {
  const [data, setData] = useState<BatchDetail>(initialData);
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  const fetchLatest = useCallback(async () => {
    try {
      const latest = await getBatchById(batchId);
      setData(latest);
    } catch {
      // ignore
    }
  }, [batchId]);

  useEffect(() => {
    const source = new EventSource(batchEventsUrl(batchId));

    source.onopen = () => {
      setSseConnected(true);
      fetchLatest();
    };

    source.onmessage = () => {
      fetchLatest();
    };

    source.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      source.close();
    };
  }, [batchId, fetchLatest]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelBatch(batchId);
      await fetchLatest();
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryFailed(batchId);
      await fetchLatest();
    } finally {
      setRetrying(false);
    }
  };

  const isRunning = data.status === "RUNNING" || data.status === "PENDING";
  const hasFailed = data.failedUrls > 0;

  return (
    <ConfigProvider theme={theme}>
      <App>
        <div style={{ padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 8 }}>
            <a
              href="/batches"
              style={{
                fontSize: 13,
                color: "#737373",
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              ← Batches
            </a>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 32,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: -0.5,
                }}
              >
                Batch
              </h1>
              <code
                style={{
                  fontSize: 12,
                  display: "inline-block",
                  marginTop: 8,
                }}
              >
                {batchId}
              </code>
              <div style={{ marginTop: 8, fontSize: 11, color: "#737373" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: sseConnected ? "#22c55e" : "#ef4444",
                    marginRight: 4,
                    verticalAlign: "middle",
                  }}
                />
                {sseConnected ? "Live" : "Reconnecting..."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {data.urls.length > 0 && (
                <Button
                  onClick={() => downloadCsv(data)}
                  style={{
                    border: "3px solid #000",
                    boxShadow: "3px 3px 0 #000",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  CSV
                </Button>
              )}
              {isRunning && (
                <Popconfirm
                  title="Cancel this batch?"
                  onConfirm={handleCancel}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    danger
                    loading={cancelling}
                    style={{
                      border: "3px solid #000",
                      boxShadow: "3px 3px 0 #000",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    Cancel
                  </Button>
                </Popconfirm>
              )}
              {!isRunning && hasFailed && (
                <Button
                  onClick={handleRetry}
                  loading={retrying}
                  style={{
                    border: "3px solid #000",
                    boxShadow: "3px 3px 0 #000",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Retry Failed ({data.failedUrls})
                </Button>
              )}
            </div>
          </div>

          <div
            style={{
              border: "3px solid #000",
              boxShadow: "6px 6px 0 #000",
              padding: 24,
              marginBottom: 32,
              background: "#fff",
            }}
          >
            <ProgressBar
              completed={data.completedUrls + data.failedUrls + data.cancelledUrls}
              total={data.totalUrls}
              status={data.status}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginTop: 24,
                paddingTop: 20,
                borderTop: "2px solid #e5e5e5",
              }}
            >
              <StatBox label="Total" value={data.totalUrls} />
              <StatBox label="Success" value={data.completedUrls} color="#22c55e" />
              <StatBox label="Failed" value={data.failedUrls} color="#ef4444" />
              <StatBox label="Cancelled" value={data.cancelledUrls} color="#a3a3a3" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: -0.5,
              }}
            >
              URLs
            </h2>
          </div>

          <div style={{ border: "3px solid #000", boxShadow: "6px 6px 0 #000" }}>
            <Table
              columns={urlColumns}
              dataSource={data.urls}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
              }}
              size="small"
            />
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#737373", textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: color || "#000",
          lineHeight: 1.2,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
