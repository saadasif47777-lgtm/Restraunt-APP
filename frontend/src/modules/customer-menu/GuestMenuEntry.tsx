import { ScanQrCode } from "lucide-react";

export default function GuestMenuEntry() {
  return (
    <main className="guest">
      <ScanQrCode
        aria-hidden="true"
        className="mb-4 text-[var(--forest)]"
        size={32}
      />
      <h1>Open your table menu</h1>
      <p>
        Point your phone’s camera at the QR code on your table, then tap the
        link to see the menu.
      </p>
    </main>
  );
}
