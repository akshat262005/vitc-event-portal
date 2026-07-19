import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'VIT Chennai Event Portal',
  description: 'Club & Chapter Event Management Portal — VIT Chennai',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
