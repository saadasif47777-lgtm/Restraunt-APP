"use client";
import { ArrowLeft, FlaskConical } from "lucide-react";
export default function PreviewWorkspace({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="preview">
      <header>
        <a href="/">
          <ArrowLeft size={16} />
          Menu manager
        </a>
        <span>
          <FlaskConical size={14} /> Development preview
        </span>
      </header>
      <h1>{title}</h1>
      <p>Sample visit · Table 5 · Gulberg Branch</p>
      {children}
    </main>
  );
}
