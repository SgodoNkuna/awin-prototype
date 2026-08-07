/**
 * Client-side PDF generator for a signed LOA + RPA submission — reproduces
 * the content of ThuthukaSA's real source forms (Astute Letter of
 * Authorisation, ThuthukaSA Risk Profile Analysis, FSP No. 47992) as text.
 * Not a pixel-for-pixel reproduction of their letterhead artwork.
 */
import type { LoaData, RpaData } from "./loa-rpa-types";
import { THUTHUKA_LOGO_PNG_BASE64 } from "./thuthuka-logo-base64";

// name/FSP number no longer drawn as separate text — the logo image itself
// now includes the full wordmark, tagline, and FSP number.
const THUTHUKA_HEADER = {
  phone: "+27 11 568 2635 / +27 69 245 0228",
  email: "info@thuthuka-sa.co.za",
  address: "Office 62, Block 2, Ext 15, 8 Incubation Dr, Riversands Office Park, Riverside View, Fourways, Midrand, 2021",
};

// Full logo (icon + "ThuthukaSA" wordmark + "Financial Services Provider" +
// FSP number), source aspect ratio ~1.487:1 — sized to fit the header band.
const LOGO_H = 44;
const LOGO_W = LOGO_H * 1.487;

function drawHeader(pdf: import("jspdf").jsPDF, title: string) {
  const pageW = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(232, 150, 10);
  pdf.rect(0, 0, pageW, 60, "F");
  // White card backing so the logo's dark wordmark stays legible on orange.
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(40, 8, LOGO_W + 16, LOGO_H + 8, 4, 4, "F");
  pdf.addImage(THUTHUKA_LOGO_PNG_BASE64, "PNG", 48, 12, LOGO_W, LOGO_H);
  pdf.setTextColor(20, 20, 20);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title, 40, 90);
  pdf.setDrawColor(232, 150, 10);
  pdf.setLineWidth(1.5);
  pdf.line(40, 100, pageW - 40, 100);
}

function drawFooter(pdf: import("jspdf").jsPDF) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(7.5);
  pdf.setTextColor(120, 120, 120);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `${THUTHUKA_HEADER.phone} · ${THUTHUKA_HEADER.email} · ${THUTHUKA_HEADER.address}`,
    40,
    pageH - 24,
    { maxWidth: pageW - 80 },
  );
}

function field(
  pdf: import("jspdf").jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  pdf.text(label.toUpperCase(), x, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(20, 20, 20);
  const lines = pdf.splitTextToSize(value || "—", maxWidth);
  pdf.text(lines, x, y + 14);
  return y + 14 + lines.length * 13 + 8;
}

function addSignatureBlock(
  pdf: import("jspdf").jsPDF,
  x: number,
  y: number,
  signatureType: "typed" | "drawn",
  typedName: string,
  drawnDataUrl: string,
  dateStr: string,
) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  pdf.text("SIGNATURE", x, y);
  if (signatureType === "drawn" && drawnDataUrl) {
    pdf.addImage(drawnDataUrl, "PNG", x, y + 6, 160, 50);
  } else {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(16);
    pdf.setTextColor(20, 20, 20);
    pdf.text(typedName, x, y + 40);
  }
  pdf.setDrawColor(150, 150, 150);
  pdf.line(x, y + 62, x + 200, y + 62);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  pdf.text(`Date: ${dateStr}`, x, y + 78);
}

export async function buildLoaRpaPdf(input: {
  fullName: string;
  loa: LoaData;
  rpa: RpaData;
  signatureType: "typed" | "drawn";
  signatureTypedName: string;
  signatureDrawnData: string;
  dateStr: string;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 40;
  const colW = pageW - margin * 2;

  // ---- Page 1: Letter of Authorisation ----
  drawHeader(pdf, "Letter of Authorisation");
  let y = 130;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(40, 40, 40);
  const loaIntro = pdf.splitTextToSize(
    "To whom it may concern. 1. Authorisation to request information. I, the undersigned, hereby authorise Phumelele Ndumo to obtain any information on my behalf regarding my assurance and/or investment portfolio, and any of my employee benefits, from any life office, retirement fund or other financial institution directly, or by using the services of The Financial Services Exchange (Pty.) Ltd., trading as Astute.",
    colW,
  );
  pdf.text(loaIntro, margin, y);
  y += loaIntro.length * 13 + 10;

  const loaConsent = pdf.splitTextToSize(
    "I hereby give consent to any financial institution or employer in possession of information regarding my insurance, investment and employee benefits portfolio to release that information upon request directly to the person who is in terms of this document authorised to request it, or to the authorised person via Astute. For this purpose I confirm that the authorised person is acting on my behalf and/or in my interest. It was explained to me, and I understand, that this consent may possibly have a restricting influence on my constitutional right to privacy. This authorisation shall remain valid for 6 months (180 days) from date of my signature.",
    colW,
  );
  pdf.text(loaConsent, margin, y);
  y += loaConsent.length * 13 + 10;

  const loaAppointment = pdf.splitTextToSize(
    "2. Appointment of new official care intermediary. I further request the financial institutions with whom Phumelele Ndumo has a sales agreement, to indicate him/her on their records as my official care intermediary. I have been properly counselled on the consequences of this letter of appointment. This appointment may be revoked by me in writing at any time.",
    colW,
  );
  pdf.text(loaAppointment, margin, y);
  y += loaAppointment.length * 13 + 20;

  y = field(pdf, "Full name", input.fullName, margin, y, colW);
  y = field(pdf, "ID number", input.loa.idNumber, margin, y, colW);
  y = field(pdf, "Telephone number", input.loa.telephone, margin, y, colW);
  y += 10;
  addSignatureBlock(pdf, margin, y, input.signatureType, input.signatureTypedName, input.signatureDrawnData, input.dateStr);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  pdf.text("Intermediary: Phumelele Ndumo · Code 627 518 · 011 568 2635 · phumelele@thuthuka-sa.co.za", margin, y + 110, { maxWidth: colW });
  drawFooter(pdf);

  // ---- Page 2: Risk Profile Analysis ----
  pdf.addPage();
  drawHeader(pdf, "Risk Profile Analysis");
  y = 130;
  const colHalf = (colW - 20) / 2;

  y = field(pdf, "Name and surname per ID book", input.fullName, margin, y, colW);
  const rowStartY1 = y;
  field(pdf, "Gender", input.rpa.gender, margin, rowStartY1, colHalf);
  y = field(pdf, "ID number", input.loa.idNumber, margin + colHalf + 20, rowStartY1, colHalf);
  const rowStartY2 = y;
  field(pdf, "Cell phone number", input.rpa.cellPhone, margin, rowStartY2, colHalf);
  y = field(pdf, "Email address", input.rpa.email, margin + colHalf + 20, rowStartY2, colHalf);
  const rowStartY3 = y;
  field(pdf, "Work number", input.rpa.workNumber, margin, rowStartY3, colHalf);
  y = field(pdf, "Qualification", input.rpa.qualification, margin + colHalf + 20, rowStartY3, colHalf);
  const rowStartY4 = y;
  field(pdf, "Occupation", input.rpa.occupation, margin, rowStartY4, colHalf);
  y = field(pdf, "Gross monthly income", input.rpa.grossMonthlyIncome, margin + colHalf + 20, rowStartY4, colHalf);
  const rowStartY5 = y;
  field(pdf, "Marital status", input.rpa.maritalStatus, margin, rowStartY5, colHalf);
  y = field(pdf, "Stokvel name", input.rpa.stokvelName, margin + colHalf + 20, rowStartY5, colHalf);

  if (y > 650) {
    pdf.addPage();
    y = 60;
  }
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, pageW - margin, y);
  y += 20;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(20, 20, 20);
  pdf.text("Risk analysis assessment", margin, y);
  y += 20;

  const QUESTIONS: [string, string][] = [
    ["1. What is the objective for the investment?", input.rpa.objective],
    ["2. What is the term of your investment?", input.rpa.term],
    ["3. How much would you like to invest per month? (min. R500)", input.rpa.monthlyAmount],
    ["4. What is your risk appetite? (Aggressive, moderate or conservative)", input.rpa.riskAppetite],
    ["5. Are you scared of losing money?", input.rpa.scaredOfLosingMoney],
    ["6. Are you likely to withdraw your money in the next 12 or 24 months?", input.rpa.withdrawSoon],
    ["7. Do you have investments? If yes, where and how much?", input.rpa.existingInvestments],
    ["8. How much do you know about investing?", input.rpa.investingKnowledge],
    ["9. Do you have an emergency fund?", input.rpa.emergencyFund],
    ["10. Do you have children? If yes, how many and their ages?", input.rpa.children],
    ["11. Have you saved for their university education?", input.rpa.savedForEducation],
    ["12. Have you saved for your own retirement?", input.rpa.savedForRetirement],
    ["Would you like to subscribe to our newsletter?", input.rpa.newsletterSubscribe],
  ];

  for (const [q, a] of QUESTIONS) {
    if (y > 720) {
      pdf.addPage();
      y = 60;
    }
    y = field(pdf, q, a, margin, y, colW);
  }

  if (y > 620) {
    pdf.addPage();
    y = 60;
  }
  y += 10;
  addSignatureBlock(pdf, margin, y, input.signatureType, input.signatureTypedName, input.signatureDrawnData, input.dateStr);
  drawFooter(pdf);

  return pdf.output("blob");
}
