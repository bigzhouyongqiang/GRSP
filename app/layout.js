// app/layout.js
export const metadata = {
  title: "PKI Agents",
  description: "PKI tools & certificate checks",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        {children}
      </body>
    </html>
  );
}