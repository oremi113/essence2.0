export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
