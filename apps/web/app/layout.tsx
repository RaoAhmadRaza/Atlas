import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Atlas — Retrieval, measured.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
