import { jsPDF } from 'jspdf';

function loadLogoImage(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/logo.svg';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

function svgToPngDataUrl(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 312;
    canvas.height = 156;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Removed grayscale filter to render the logo in its original colored brand design
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Failed to convert SVG to PNG:', e);
    return null;
  }
}

export function formatInvoiceNumber(receiptId: string): string {
  if (/^[A-Z0-9]{8}-[0-9]{4}$/.test(receiptId)) {
    return receiptId;
  }
  let hash = 0;
  for (let i = 0; i < receiptId.length; i++) {
    hash = (hash << 5) - hash + receiptId.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const part1 = (absHash & 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
  const part2 = (100 + (absHash % 900)).toString().padStart(4, '0');
  return `${part1}-${part2}`;
}

function parseAmount(amountStr: string) {
  const match = amountStr.match(/^([^\d\s.-]*)\s*([\d.,]+)$/);
  if (match) {
    return {
      symbol: match[1] || '€',
      value: parseFloat(match[2].replace(',', '.'))
    };
  }
  return { symbol: '€', value: 0 };
}

function generateInvoicePDF(logoPngDataUrl: string | null, receiptId: string, date: string, amount: string): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const margin = 48;
  const rightMargin = 595.28 - margin;
  let currentY = 80;

  const primaryColor = [17, 24, 39];
  const secondaryColor = [75, 85, 99];
  const mutedColor = [107, 114, 128];
  const borderColor = [229, 231, 235];

  // Top Left: Title "Invoice"
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Invoice', margin, currentY);

  // Top Right: Small company logo
  if (logoPngDataUrl) {
    doc.addImage(logoPngDataUrl, 'PNG', rightMargin - 60, currentY - 30, 60, 30);
  } else {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229);
    doc.text('METACALL', rightMargin - 80, currentY - 10);
  }

  // Top Left details under title (Two columns tabbed alignment)
  currentY += 30;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  const labelX = margin;
  const valueX = 180;
  
  // Invoice details
  const formattedId = formatInvoiceNumber(receiptId);
  doc.text('Invoice number', labelX, currentY);
  doc.setFont('Helvetica', 'bold');
  doc.text(formattedId, valueX, currentY);

  currentY += 16;
  doc.setFont('Helvetica', 'bold');
  doc.text('Date of issue', labelX, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(date, valueX, currentY);

  currentY += 16;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Date due', labelX, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(date, valueX, currentY);

  currentY += 16;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('MetaCall OÜ VAT Number', labelX, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('EE102272396', valueX, currentY);
  
  const vatId = localStorage.getItem('faas_vat_id') || 'testvat';
  currentY += 16;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Customer VAT Number', labelX, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(vatId, valueX, currentY);

  // Address Section
  currentY += 45;
  
  // Left Column: Company Info (MetaCall OÜ Estonia)
  const col1X = margin;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('MetaCall OÜ', col1X, currentY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  let col1Y = currentY + 18;
  doc.text('Harju maakond, Tallinn, Lasnamäe linnaosa,', col1X, col1Y);
  col1Y += 15;
  doc.text('Lõõtsa tn 5-11', col1X, col1Y);
  col1Y += 15;
  doc.text('11415 Tallinn', col1X, col1Y);
  col1Y += 15;
  doc.text('Estonia', col1X, col1Y);
  col1Y += 15;
  doc.text('+372 5634 8681', col1X, col1Y);
  col1Y += 15;
  doc.text('contact@metacall.io', col1X, col1Y);

  // Right Column: Bill to
  const col2X = 320;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Bill to', col2X, currentY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  let col2Y = currentY + 18;
  const userEmail = localStorage.getItem('faas_email') || 'jose@metacall.io';
  const customerName = userEmail.includes('jose') ? 'José Antonio Dominguez' : 'MetaCall Customer';
  doc.text(customerName, col2X, col2Y);
  col2Y += 15;
  doc.text('Alberdi 41', col2X, col2Y);
  col2Y += 15;
  doc.text('07000 Tandil', col2X, col2Y);
  col2Y += 15;
  doc.text('Buenos Aires', col2X, col2Y);
  col2Y += 15;
  doc.text('Argentina', col2X, col2Y);
  col2Y += 15;
  doc.text(userEmail, col2X, col2Y);

  currentY = Math.max(col1Y, col2Y) + 40;

  // Payment Summary (Split amount and due text)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const summaryAmountText = '€0.00';
  doc.text(summaryAmountText, margin, currentY);
  
  const summaryAmountWidth = doc.getTextWidth(summaryAmountText);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(` due ${date}`, margin + summaryAmountWidth + 2, currentY);

  // Table Headers
  currentY += 40;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(1);
  doc.line(margin, currentY, rightMargin, currentY);

  currentY += 16;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Description', margin, currentY);
  doc.text('Qty', 360, currentY, { align: 'right' });
  doc.text('Unit price', 450, currentY, { align: 'right' });
  doc.text('Amount', rightMargin, currentY, { align: 'right' });

  currentY += 8;
  doc.line(margin, currentY, rightMargin, currentY);

  // Parse amount and determine plan price
  const parsed = parseAmount(amount);
  let planPrice = 80.00;
  let symbol = '€';
  
  if (parsed.value > 0) {
    symbol = parsed.symbol;
    planPrice = parsed.value;
  } else {
    symbol = parsed.symbol;
    planPrice = userEmail.includes('jose') ? 80.00 : 29.99;
  }
  
  const planName = planPrice === 80.00 
    ? 'MetaCall Cloud Services - Premium Plan' 
    : 'MetaCall Cloud Services - Standard Plan';

  // Row 1
  currentY += 20;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(planName, margin, currentY);
  
  // Qty, Unit Price, Amount on exact same baseline as description name
  doc.text('1', 360, currentY, { align: 'right' });
  doc.text(`${symbol}${planPrice.toFixed(2)}`, 450, currentY, { align: 'right' });
  doc.text(`${symbol}${planPrice.toFixed(2)}`, rightMargin, currentY, { align: 'right' });

  currentY += 15;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  
  let billingRange = 'Jun 20-Jul 20, 2026';
  try {
    const d = new Date(Date.parse(date));
    if (!isNaN(d.getTime())) {
      const startMonth = d.toLocaleString('en-US', { month: 'short' });
      const startDay = d.getDate();
      const startYear = d.getFullYear();
      
      const nextDate = new Date(d);
      nextDate.setMonth(d.getMonth() + 1);
      const endMonth = nextDate.toLocaleString('en-US', { month: 'short' });
      const endDay = nextDate.getDate();
      const endYear = nextDate.getFullYear();
      
      const yearStr = startYear === endYear ? `, ${startYear}` : ` ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
      billingRange = `${startMonth} ${startDay}-${endMonth} ${endDay}${yearStr}`;
    }
  } catch {
    // Fallback
  }
  doc.text(billingRange, margin, currentY);

  // Table Totals Section
  const totalsLabelX = 300;
  const totalsValueX = rightMargin;
  
  // Subtotal
  currentY += 24;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(totalsLabelX, currentY, rightMargin, currentY);

  currentY += 16;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Subtotal', totalsLabelX, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${symbol}${planPrice.toFixed(2)}`, totalsValueX, currentY, { align: 'right' });

  // Total excluding tax
  currentY += 10;
  doc.line(totalsLabelX, currentY, rightMargin, currentY);

  currentY += 16;
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Total excluding tax', totalsLabelX, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${symbol}${planPrice.toFixed(2)}`, totalsValueX, currentY, { align: 'right' });

  // VAT (0%)
  currentY += 10;
  doc.line(totalsLabelX, currentY, rightMargin, currentY);

  currentY += 16;
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`VAT (0% on ${symbol}${planPrice.toFixed(2)})`, totalsLabelX, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${symbol}0.00`, totalsValueX, currentY, { align: 'right' });

  // Total
  currentY += 10;
  doc.line(totalsLabelX, currentY, rightMargin, currentY);

  currentY += 16;
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Total', totalsLabelX, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${symbol}${planPrice.toFixed(2)}`, totalsValueX, currentY, { align: 'right' });

  // Applied balance
  currentY += 10;
  doc.line(totalsLabelX, currentY, rightMargin, currentY);

  currentY += 16;
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Applied balance', totalsLabelX, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`-${symbol}${planPrice.toFixed(2)}`, totalsValueX, currentY, { align: 'right' });

  // Amount Due
  currentY += 10;
  doc.line(totalsLabelX, currentY, rightMargin, currentY);

  currentY += 18;
  doc.setFont('Helvetica', 'bold');
  doc.text('Amount due', totalsLabelX, currentY);
  doc.text(`${symbol}0.00`, totalsValueX, currentY, { align: 'right' });

  // Footer Section
  const footerY = 770;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, footerY, rightMargin, footerY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Page 1 of 1', rightMargin, footerY + 20, { align: 'right' });

  return doc;
}

export async function downloadInvoicePDF(receiptId: string, date: string, amount: string): Promise<void> {
  const logoImg = await loadLogoImage();
  const logoPngDataUrl = logoImg ? svgToPngDataUrl(logoImg) : null;
  const doc = generateInvoicePDF(logoPngDataUrl, receiptId, date, amount);
  doc.save(`invoice_${receiptId}.pdf`);
}
