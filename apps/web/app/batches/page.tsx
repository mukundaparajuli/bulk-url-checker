"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConfigProvider, Table, Tag, Button, App } from "antd";
import type { ColumnsType } from "antd/es/table";
import { getBatches, type Batch } from "../../lib/api";

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
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      borderColor: "#000000",
      rowHoverBg: "#f5f5f5",
    },
    Tag: {
      borderRadiusSM: 0,
    },
  },
};

const statusColors: Record<string, string> = {
  PENDING: "#a3a3a3",
  RUNNING: "#3b82f6",
  COMPLETED: "#22c55e",
  FAILED: "#ef4444",
  CANCELLED: "#a3a3a3",
};

function StatusTag({ status }: { status: string }) {
  return (
    <Tag
      style={{
        border: `2px solid ${statusColors[status] || "#000"}`,
        background: statusColors[status] || "#000",
        color: "#fff",
        fontWeight: 700,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {status}
    </Tag>
  );
}

const columns: ColumnsType<Batch> = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 280,
    render: (id: string) => (
      <Link
        href={`/batches/${id}`}
        style={{
          textDecoration: "underline",
          textUnderlineOffset: 4,
          fontWeight: 600,
        }}
      >
        {id.slice(0, 8)}...
      </Link>
    ),
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: 140,
    render: (status: string) => <StatusTag status={status} />,
  },
  {
    title: "Progress",
    key: "progress",
    width: 200,
    render: (_: unknown, record: Batch) => {
      const pct =
        record.totalUrls > 0
          ? Math.round(
              ((record.completedUrls + record.failedUrls + record.cancelledUrls) /
                record.totalUrls) *
                100
            )
          : 0;
      return (
        <div>
          <div
            style={{
              height: 12,
              width: "100%",
              border: "2px solid #000",
              background: "#f5f5f5",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: record.status === "FAILED" ? "#ef4444" : "#000",
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: "#737373", marginTop: 4, display: "block" }}>
            {record.completedUrls + record.failedUrls + record.cancelledUrls} / {record.totalUrls}
          </span>
        </div>
      );
    },
  },
  {
    title: "Created",
    dataIndex: "createdAt",
    key: "createdAt",
    width: 180,
    render: (v: string) => new Date(v).toLocaleString(),
  },
];

function BatchesContent() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();

  useEffect(() => {
    getBatches()
      .then(setBatches)
      .catch(() => message.error("Failed to load batches"))
      .finally(() => setLoading(false));
  }, [message]);

  return (
    <>
      <div style={{ padding: "40px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: -1,
              }}
            >
              Batches
            </h1>
            <p style={{ color: "#737373", fontSize: 13, marginTop: 4 }}>
              {batches.length} total
            </p>
          </div>
          <Link href="/">
            <Button
              style={{
                border: "3px solid #000",
                boxShadow: "3px 3px 0 #000",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              + New
            </Button>
          </Link>
        </div>

        <div style={{ border: "3px solid #000", boxShadow: "6px 6px 0 #000" }}>
          <Table
            columns={columns}
            dataSource={batches}
            rowKey="id"
            loading={loading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
              }}
            style={{ margin: 0 }}
          />
        </div>
      </div>
    </>
  );
}

export default function BatchesPage() {
  return (
    <ConfigProvider theme={theme}>
      <App>
        <BatchesContent />
      </App>
    </ConfigProvider>
  );
}
