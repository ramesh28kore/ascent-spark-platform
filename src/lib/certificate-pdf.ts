import jsPDF from "jspdf";
import QRCode from "qrcode";

export type CertificateData = {
  code: string;
  holder_name: string;
  title: string;
  kind: string;
  score: number;
  max_score: number;
  issued_on: string;
};

const NAVY = [15, 42, 74] as const;
const GOLD = [232, 163, 23] as const;

/** Renders an A4 landscape certificate with a QR that points at the public verify page. */
export async function downloadCertificatePdf(certificate: CertificateData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, height, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(8, 8, width - 16, height - 16, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.rect(13, 13, width - 26, height - 26);

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CRT TRAINING CONSOLE", width / 2, 32, { align: "center" });

  doc.setFontSize(30);
  doc.text("Certificate of Achievement", width / 2, 52, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  doc.text("This is to certify that", width / 2, 68, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...NAVY);
  doc.text(certificate.holder_name, width / 2, 84, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  doc.text("has successfully completed", width / 2, 96, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(certificate.title, width / 2, 108, { align: "center" });

  const percent = Math.round((certificate.score / Math.max(1, certificate.max_score)) * 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Score ${certificate.score} / ${certificate.max_score}  (${percent}%)   ·   ${certificate.kind}`,
    width / 2,
    120,
    { align: "center" },
  );

  const verifyUrl =
    typeof window === "undefined"
      ? `/verify?code=${certificate.code}`
      : `${window.location.origin}/verify?code=${certificate.code}`;

  try {
    const qr = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 300 });
    doc.addImage(qr, "PNG", width - 62, height - 62, 32, 32);
  } catch {
    // QR is a convenience; the printed code below is the source of truth.
  }

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`Verify at ${verifyUrl}`, width - 46, height - 25, { align: "center" });
  doc.text(`Certificate code: ${certificate.code}`, 26, height - 30);
  doc.text(`Issued on ${new Date(certificate.issued_on).toLocaleDateString()}`, 26, height - 24);

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(26, height - 42, 92, height - 42);
  doc.text("Training Coordinator", 26, height - 37);

  doc.save(`certificate-${certificate.code}.pdf`);
}
