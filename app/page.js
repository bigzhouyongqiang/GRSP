"use client";

import { useMemo, useState } from "react";

function normalizeHost(input) {
  if (!input) return "";
  let s = input.trim();

  // 允许用户输入 https://example.com/path
  try {
    if (s.includes("://")) {
      const u = new URL(s);
      s = u.hostname;
    } else {
      // 去掉 path
      s = s.split("/")[0];
    }
  } catch {
    // ignore
  }

  // 去掉端口
  s = s.split(":")[0].trim();

  // 简单过滤
  s = s.replace(/\s+/g, "");
  return s;
}

export default function HomePage() {
  const [hostInput, setHostInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const host = useMemo(() => normalizeHost(hostInput), [hostInput]);

  async function onCheck() {
    setError("");
    setResult(null);

    if (!host) {
      setError("请输入域名，例如：example.com");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`/api/check?host=${encodeURIComponent(host)}`);
      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error || "检测失败");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError("请求失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h1 style={{ marginBottom: 8 }}>PKI Agents · 证书到期检测（MVP）</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        输入域名，获取 TLS 证书信息与剩余天数。
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={hostInput}
          onChange={(e) => setHostInput(e.target.value)}
          placeholder="例如：example.com / https://example.com"
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
            fontSize: 16
          }}
        />
        <button
          onClick={onCheck}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #111",
            background: loading ? "#eee" : "#111",
            color: loading ? "#333" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 16
          }}
        >
          {loading ? "检测中..." : "检测"}
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#fff3f3", border: "1px solid #ffd0d0", color: "#b00020" }}>
          {error}
        </div>
      ) : null}

      {result ? (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: "1px solid #e5e5e5", background: "#fafafa" }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 18 }}>
            结果：{result.host}
          </h2>

          <Row label="是否可建立 TLS" value={String(result.ok)} />
          <Row label="SNI" value={result.sni} />
          <Row label="颁发给 (Subject CN)" value={result.subjectCN || "-"} />
          <Row label="颁发者 (Issuer CN)" value={result.issuerCN || "-"} />
          <Row label="生效时间 (notBefore)" value={result.notBefore || "-"} />
          <Row label="到期时间 (notAfter)" value={result.notAfter || "-"} />
          <Row label="剩余天数" value={result.daysLeft != null ? String(result.daysLeft) : "-"} />

          <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
            提示：MVP 仅做单域名检测。后续可扩展批量检测、邮件提醒、Webhook 等。
          </div>
        </div>
      ) : null}

      <footer style={{ marginTop: 24, color: "#777", fontSize: 12 }}>
        © PKI Agents
      </footer>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px dashed #e6e6e6" }}>
      <div style={{ width: 180, color: "#555" }}>{label}</div>
      <div style={{ flex: 1, fontWeight: 600, color: "#111", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}