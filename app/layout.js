import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "ARIT Home — Household Staff Attendance",
  description:
    "Owners track househelp attendance and approve leaves. Staff sign in with a short code and PIN, no email needed.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
