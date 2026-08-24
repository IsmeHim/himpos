import "./globals.css";

export const metadata = {
  title: "HIMPOS · Restaurant OS",
  description: "ระบบจัดการร้านอาหารและสั่งอาหารผ่าน QR Code",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
