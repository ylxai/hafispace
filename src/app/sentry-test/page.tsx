"use client";

export default function SentryTestPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Sentry Test</h1>
      <button
        onClick={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).myUndefinedFunction();
        }}
      >
        Test Client Error (myUndefinedFunction)
      </button>
      <br /><br />
      <button
        onClick={async () => {
          await fetch("/api/sentry-test");
          alert("Server error sent!");
        }}
      >
        Test Server Error
      </button>
    </div>
  );
}
