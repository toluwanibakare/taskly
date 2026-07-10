"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Automatically report the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8fafc",
            fontFamily: "system-ui, sans-serif",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "800",
                color: "#0f172a",
                margin: "0 0 8px",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                margin: "0 0 24px",
                lineHeight: "1.6",
              }}
            >
              An unexpected error occurred. Our team has been notified and will
              look into it. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: "#0f172a",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "10px 24px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
