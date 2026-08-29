"use client";

import { Button, Result } from "antd";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Result
        status="error"
        title="Something went wrong"
        subTitle={error.message || "An unexpected error occurred"}
        extra={
          <Button
            type="primary"
            onClick={reset}
            style={{
              border: "3px solid #000",
              boxShadow: "3px 3px 0 #000",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Try again
          </Button>
        }
      />
    </div>
  );
}
