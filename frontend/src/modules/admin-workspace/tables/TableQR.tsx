import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
export default function TableQR({
  id,
  label,
  publicBase,
}: {
  id: string;
  label: string;
  publicBase: string;
}) {
  const [src, set] = useState("");
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let current = true;
    set("");
    if (publicBase)
      QRCode.toDataURL(publicBase + "/menu/" + encodeURIComponent(id), {
        width: 384,
        margin: 4,
      }).then((value) => {
        if (current) set(value);
      });
    return () => {
      current = false;
    };
  }, [id, publicBase]);
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
          {publicBase
            ? "Generating QR…"
            : "Set PUBLIC_MENU_BASE_URL to the guest site’s phone-reachable address before printing."}
        </small>
      )}
    </div>
  );
}
