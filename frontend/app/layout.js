import { Public_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Toast from "@/components/Toast";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata = {
  title: "Ticket Management System (TMS)",
  description: "Raise, approve and resolve employee tickets in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full antialiased" suppressHydrationWarning>
        <AppProvider>
          {children}
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
