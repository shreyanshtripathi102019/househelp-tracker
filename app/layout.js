import "./globals.css";

export const metadata = {
  title: "Arit Househelp Portal",
  description:
    "A Vercel and Supabase ready attendance portal for household staff.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
