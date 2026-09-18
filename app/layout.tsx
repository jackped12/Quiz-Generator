import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://azure-study-room.jacksonpedvis.chatgpt.site'), title: 'Azure Study Room', description: 'An Azure study guide with interactive multiple-choice and matching practice', openGraph: {title:'Azure Study Room',description:'Learn the essentials. Test your understanding.',images:['https://azure-study-room.jacksonpedvis.chatgpt.site/og.png']},twitter:{card:'summary_large_image',title:'Azure Study Room',description:'Learn the essentials. Test your understanding.',images:['https://azure-study-room.jacksonpedvis.chatgpt.site/og.png']},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}


