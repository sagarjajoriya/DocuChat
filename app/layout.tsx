import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "DocuChat | AI Customer Support Agent",
  description: "Upload PDFs, search with RAG, and answer with grounded citations using free-tier AI services."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
