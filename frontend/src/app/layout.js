import "./globals.css";

export const metadata = {
  title: "Matrix — Rank every company. With precision.",
  description:
    "A proprietary engine that maps fundamentals to your sectors and scores them against your KPI templates.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-root">{children}</div>
      </body>
    </html>
  );
}
