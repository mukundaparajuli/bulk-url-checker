"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              border: "3px solid #000",
              boxShadow: "6px 6px 0 #000",
              padding: 40,
              background: "#fff",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Something went wrong
            </h1>
            <p style={{ color: "#737373", fontSize: 13, marginBottom: 24 }}>
              {error.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={reset}
              style={{
                border: "3px solid #000",
                boxShadow: "3px 3px 0 #000",
                padding: "12px 24px",
                fontWeight: 700,
                textTransform: "uppercase",
                cursor: "pointer",
                background: "#000",
                color: "#fff",
                fontSize: 14,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
