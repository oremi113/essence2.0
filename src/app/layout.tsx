import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div style={{ minHeight: "100vh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
