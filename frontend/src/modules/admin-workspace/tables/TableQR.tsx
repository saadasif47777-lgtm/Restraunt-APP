import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
export default function TableQR({
  id,
  label,
  preview,
}: {
  id: string;
  label: string;
  preview: boolean;
}) {
  const [src, set] = useState("");
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!preview)
      QRCode.toDataURL(location.origin + "/menu/" + id, {
        width: 384,
        margin: 4,
      }).then(set);
  }, [id, preview]);
  function print() {
    card.current?.classList.add("print-table");
    window.print();
    card.current?.classList.remove("print-table");
  }
  return (
    <div className="qr" ref={card}>
      <h3>{label}</h3>
      {src ? (
        <>
          <img src={src} alt={"Menu QR for " + label} />
          <button onClick={print}>Print QR</button>
        </>
      ) : (
        <small>
          {preview ? "Sign in to print a live table QR." : "Generating QR…"}
        </small>
      )}
    </div>
  );
}
