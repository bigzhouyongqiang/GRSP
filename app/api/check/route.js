import tls from "tls";

export const runtime = "nodejs"; // 必须：使用 Node runtime，才能用 tls

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, x));
}

function safeToISOString(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  } catch {
    return null;
  }
}

function getCertInfo(host, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port: 443,
        servername: host, // SNI
        timeout: timeoutMs
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          socket.end();
          resolve(cert);
        } catch (e) {
          socket.end();
          reject(e);
        }
      }
    );

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("TLS connect timeout"));
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const hostRaw = (searchParams.get("host") || "").trim();

  // 简单校验：只允许域名/子域名/IDN(Punycode)/点/中划线
  // 先去掉端口、路径
  const host = hostRaw.split("/")[0].split(":")[0].trim().toLowerCase();

  if (!host || host.length > 253) {
    return Response.json({ error: "host 参数无效" }, { status: 400 });
  }
  if (!/^[a-z0-9.-]+$/.test(host)) {
    return Response.json({ error: "仅支持域名（建议输入如 example.com）" }, { status: 400 });
  }

  const timeoutMs = clampInt(Number(searchParams.get("timeoutMs") || 7000), 1000, 15000);

  try {
    const cert = await getCertInfo(host, timeoutMs);

    const subjectCN = cert?.subject?.CN || null;
    const issuerCN = cert?.issuer?.CN || null;

    // Node 返回的 notBefore/notAfter 通常是可 parse 的字符串
    const notBeforeISO = safeToISOString(cert?.valid_from) || cert?.valid_from || null;
    const notAfterISO = safeToISOString(cert?.valid_to) || cert?.valid_to || null;

    let daysLeft = null;
    if (cert?.valid_to) {
      const end = new Date(cert.valid_to).getTime();
      const now = Date.now();
      if (Number.isFinite(end)) {
        const diffMs = end - now;
        daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
    }

    return Response.json({
      ok: true,
      host,
      sni: host,
      subjectCN,
      issuerCN,
      notBefore: notBeforeISO,
      notAfter: notAfterISO,
      daysLeft
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        host,
        error: e?.message || "TLS 获取证书失败（可能不支持 443/HTTPS，或被防火墙拦截）"
      },
      { status: 500 }
    );
  }
}