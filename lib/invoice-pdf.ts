export type InvoiceData = {
  tripId: string;
  origin: string;
  destination: string;
  loadDate: string | null;
  deliveryDate: string | null;
  freightAmount: number | null;
  freightCurrency: string | null;
  orgName: string;
  orgTaxNo: string | null;
  customerName: string | null;
};

/**
 * Client-side fatura PDF üretimi (jsPDF + jspdf-autotable).
 * Dynamic import ile yalnızca ihtiyaç anında yüklenir.
 */
export async function generateInvoicePdf(data: InvoiceData): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const invoiceNo = `INV-${data.tripId.slice(0, 8).toUpperCase()}`;
  const today = new Date().toLocaleDateString("tr-TR");
  const amount = data.freightAmount ?? 0;
  const currency = data.freightCurrency ?? "EUR";
  const amountStr = `${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${currency}`;

  // Header — firma adı sol, "FATURA" sağ
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.orgName, 14, 20);

  if (data.orgTaxNo) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Vergi No: ${data.orgTaxNo}`, 14, 26);
  }

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FATURA", 196, 20, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceNo, 196, 27, { align: "right" });
  doc.text(`Tarih: ${today}`, 196, 32, { align: "right" });

  // Divider
  doc.setDrawColor(200);
  doc.line(14, 36, 196, 36);

  // Alıcı / Müşteri
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("ALICI", 14, 44);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerName ?? "—", 14, 50);

  // Sefer detayları tablosu
  autoTable(doc, {
    startY: 60,
    head: [["Güzergah", "Yükleme Tarihi", "Teslimat Tarihi"]],
    body: [
      [
        `${data.origin} → ${data.destination}`,
        data.loadDate ?? "—",
        data.deliveryDate ?? "—",
      ],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const afterTrip = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable;

  // Navlun satırları tablosu
  autoTable(doc, {
    startY: (afterTrip?.finalY ?? 80) + 10,
    head: [["Açıklama", "Tutar"]],
    body: [
      [`Navlun Ücreti — ${data.origin} → ${data.destination}`, amountStr],
      ["KDV (%0)", `0,00 ${currency}`],
    ],
    foot: [["TOPLAM", amountStr]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: { fontStyle: "bold", fillColor: [240, 244, 255] },
    columnStyles: { 1: { halign: "right" } },
  });

  doc.save(`${invoiceNo}.pdf`);
}
