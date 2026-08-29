import { getBatchById } from "../../../lib/api";
import BatchClient from "./BatchClient";

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getBatchById(id);
  } catch {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800, textTransform: "uppercase" }}>
          Batch not found
        </h1>
        <a
          href="/batches"
          style={{
            display: "inline-block",
            marginTop: 20,
            textDecoration: "underline",
            textUnderlineOffset: 4,
          }}
        >
          ← Back to batches
        </a>
      </div>
    );
  }

  return <BatchClient batchId={id} initialData={data} />;
}
