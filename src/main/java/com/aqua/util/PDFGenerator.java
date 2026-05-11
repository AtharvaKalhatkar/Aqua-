package com.aqua.util;

import com.aqua.model.Bill;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.itextpdf.text.pdf.draw.LineSeparator;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import javax.imageio.ImageIO;

/**
 * Professional black & white PDF invoice generator for Bhairavnath Cool Aqua.
 * Includes real UPI QR code with bill amount for instant payment.
 */
public class PDFGenerator {

    private static final String UPI_ID = "kalhatkaratharva01@okhdfcbank";
    private static final String UPI_NAME = "Bhairavnath Cool Aqua";

    private static final BaseColor BLACK = BaseColor.BLACK;
    private static final BaseColor DARK_GRAY = new BaseColor(60, 60, 60);
    private static final BaseColor MID_GRAY = new BaseColor(120, 120, 120);
    private static final BaseColor LIGHT_GRAY = new BaseColor(220, 220, 220);
    private static final BaseColor VERY_LIGHT = new BaseColor(245, 245, 245);

    public static String generateInvoice(Bill bill, String outputPath, LocalDate[] dateRange) throws Exception {
        Document doc = new Document(PageSize.A4, 40, 40, 35, 30);
        PdfWriter writer = PdfWriter.getInstance(doc, new FileOutputStream(outputPath));
        doc.open();

        // ── FONTS (Times Roman for professional look) ──
        Font brandFont   = new Font(Font.FontFamily.TIMES_ROMAN, 26, Font.BOLD, BLACK);
        Font religiousF  = new Font(Font.FontFamily.TIMES_ROMAN, 9, Font.ITALIC, MID_GRAY);
        Font addressF    = new Font(Font.FontFamily.TIMES_ROMAN, 9, Font.NORMAL, DARK_GRAY);
        Font phoneF      = new Font(Font.FontFamily.TIMES_ROMAN, 10, Font.BOLD, BLACK);
        Font invTagF     = new Font(Font.FontFamily.TIMES_ROMAN, 18, Font.BOLD, BLACK);
        Font invNoF      = new Font(Font.FontFamily.COURIER, 11, Font.BOLD, BLACK);
        Font sectionF    = new Font(Font.FontFamily.TIMES_ROMAN, 10, Font.BOLD, BLACK);
        Font labelF      = new Font(Font.FontFamily.TIMES_ROMAN, 10, Font.NORMAL, MID_GRAY);
        Font valueF      = new Font(Font.FontFamily.TIMES_ROMAN, 10, Font.BOLD, BLACK);
        Font thF         = new Font(Font.FontFamily.TIMES_ROMAN, 10, Font.BOLD, BaseColor.WHITE);
        Font tdF         = new Font(Font.FontFamily.TIMES_ROMAN, 10, Font.NORMAL, BLACK);
        Font tdBoldF     = new Font(Font.FontFamily.TIMES_ROMAN, 10, Font.BOLD, BLACK);
        Font totalLabelF = new Font(Font.FontFamily.TIMES_ROMAN, 11, Font.BOLD, BLACK);
        Font totalValF   = new Font(Font.FontFamily.TIMES_ROMAN, 18, Font.BOLD, BLACK);
        Font wordsF      = new Font(Font.FontFamily.TIMES_ROMAN, 9, Font.ITALIC, DARK_GRAY);
        Font bankF       = new Font(Font.FontFamily.TIMES_ROMAN, 8, Font.NORMAL, DARK_GRAY);
        Font bankBoldF   = new Font(Font.FontFamily.TIMES_ROMAN, 8, Font.BOLD, BLACK);
        Font footerF     = new Font(Font.FontFamily.TIMES_ROMAN, 7, Font.ITALIC, MID_GRAY);
        Font qrLabelF    = new Font(Font.FontFamily.TIMES_ROMAN, 8, Font.NORMAL, DARK_GRAY);
        Font qrBoldF     = new Font(Font.FontFamily.TIMES_ROMAN, 8, Font.BOLD, BLACK);

        // ════════════════════════════════════════════════════════════════
        //  HEADER: Religious text + Business Name + Address + Phone
        // ════════════════════════════════════════════════════════════════

        Paragraph rel = new Paragraph("|| Shri Bhairavnath Prasanna ||", religiousF);
        rel.setAlignment(Element.ALIGN_CENTER);
        rel.setSpacingAfter(1);
        doc.add(rel);

        try {
            Image logo = Image.getInstance(PDFGenerator.class.getResource("/com/aqua/images/logo.png"));
            logo.setAlignment(Element.ALIGN_CENTER);
            logo.scaleAbsolute(60, 60);
            doc.add(logo);
            doc.add(sp(2));
        } catch (Exception e) {
            System.err.println("Could not load logo for PDF: " + e.getMessage());
        }

        Paragraph brand = new Paragraph("BHAIRAVNATH COOL AQUA", brandFont);
        brand.setAlignment(Element.ALIGN_CENTER);
        brand.setSpacingAfter(2);
        doc.add(brand);

        Paragraph addr = new Paragraph("Bathe Wasti, Talawade, Tal. Haveli, Dist. Pune - 411 062", addressF);
        addr.setAlignment(Element.ALIGN_CENTER);
        doc.add(addr);

        Paragraph phone = new Paragraph("Mob: 7030355656 / 8888355656", phoneF);
        phone.setAlignment(Element.ALIGN_CENTER);
        phone.setSpacingAfter(6);
        doc.add(phone);

        // Double line separator
        LineSeparator thickLine = new LineSeparator();
        thickLine.setLineColor(BLACK);
        thickLine.setLineWidth(1.5f);
        doc.add(new Chunk(thickLine));
        doc.add(sp(1));
        LineSeparator thinLine = new LineSeparator();
        thinLine.setLineColor(BLACK);
        thinLine.setLineWidth(0.5f);
        doc.add(new Chunk(thinLine));
        doc.add(sp(8));

        // ════════════════════════════════════════════════════════════════
        //  INVOICE TAG + NUMBER + DATE
        // ════════════════════════════════════════════════════════════════

        String invoiceNo = String.format("BCA-%02d%02d-%04d",
                bill.getBillYear() % 100, bill.getBillMonth(), bill.getId());

        PdfPTable invRow = new PdfPTable(3);
        invRow.setWidthPercentage(100);
        invRow.setWidths(new float[]{1.5f, 1, 1.5f});

        // Left: INVOICE title
        PdfPCell invTagCell = cellNoBorder(new Phrase("INVOICE", invTagF), Element.ALIGN_LEFT);
        invTagCell.setPaddingBottom(8);
        invRow.addCell(invTagCell);

        // Center: Invoice No
        Paragraph noP = new Paragraph();
        noP.add(new Chunk("No: ", labelF));
        noP.add(new Chunk(invoiceNo, invNoF));
        noP.setAlignment(Element.ALIGN_CENTER);
        PdfPCell noCell = cellNoBorder(noP, Element.ALIGN_CENTER);
        invRow.addCell(noCell);

        // Right: Date
        Paragraph dateP = new Paragraph();
        dateP.add(new Chunk("Date: ", labelF));
        dateP.add(new Chunk(LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), valueF));
        dateP.setAlignment(Element.ALIGN_RIGHT);
        PdfPCell dateCell = cellNoBorder(dateP, Element.ALIGN_RIGHT);
        invRow.addCell(dateCell);

        doc.add(invRow);
        doc.add(sp(6));

        // ════════════════════════════════════════════════════════════════
        //  BILL TO + BILLING PERIOD
        // ════════════════════════════════════════════════════════════════

        PdfPTable detailsTable = new PdfPTable(2);
        detailsTable.setWidthPercentage(100);
        detailsTable.setWidths(new float[]{1, 1});

        // Left: Bill To
        PdfPCell billToCell = new PdfPCell();
        billToCell.setBorder(Rectangle.BOX);
        billToCell.setBorderColor(LIGHT_GRAY);
        billToCell.setPadding(10);
        billToCell.addElement(new Paragraph("BILL TO", sectionF));
        billToCell.addElement(sp(3));
        billToCell.addElement(new Paragraph(bill.getCustomerName(),
                new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.BOLD, BLACK)));
        detailsTable.addCell(billToCell);

        // Right: Period
        PdfPCell periodCell = new PdfPCell();
        periodCell.setBorder(Rectangle.BOX);
        periodCell.setBorderColor(LIGHT_GRAY);
        periodCell.setPadding(10);
        periodCell.addElement(new Paragraph("BILLING PERIOD", sectionF));
        periodCell.addElement(sp(3));

        periodCell.addElement(labelValue("Month:  ", bill.getMonthName() + " " + bill.getBillYear(), labelF, valueF));

        String period = dateRange != null ?
                dateRange[0].format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) + "  to  " +
                dateRange[1].format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) :
                bill.getMonthName() + " " + bill.getBillYear();
        periodCell.addElement(labelValue("Period:  ", period, labelF, valueF));
        detailsTable.addCell(periodCell);

        doc.add(detailsTable);
        doc.add(sp(10));

        // ════════════════════════════════════════════════════════════════
        //  ITEMS TABLE
        // ════════════════════════════════════════════════════════════════

        PdfPTable items = new PdfPTable(5);
        items.setWidthPercentage(100);
        items.setWidths(new float[]{0.5f, 3f, 1f, 1f, 1.5f});

        // Header
        String[] headers = {"#", "Description", "Qty", "Rate", "Amount"};
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, thF));
            c.setBackgroundColor(BLACK);
            c.setPadding(8);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setBorderColor(BLACK);
            items.addCell(c);
        }

        // Row 1: Jars
        addRow(items, "1", "20 Ltr Water Jar",
                String.valueOf(bill.getTotalJars()),
                fmt(bill.getJarRate()),
                fmt(bill.getJarAmount()), tdF, tdBoldF, VERY_LIGHT);

        // Row 2: Bottles
        addRow(items, "2", "20 Ltr Water Bottle",
                String.valueOf(bill.getTotalBottles()),
                fmt(bill.getBottleRate()),
                fmt(bill.getBottleAmount()), tdF, tdBoldF, BaseColor.WHITE);

        // Empty spacer rows
        for (int i = 0; i < 2; i++) {
            addRow(items, "", "", "", "", "", tdF, tdF, i % 2 == 0 ? VERY_LIGHT : BaseColor.WHITE);
        }

        // TOTAL row
        PdfPCell emptyMerge = new PdfPCell(new Phrase("", tdF));
        emptyMerge.setColspan(3);
        emptyMerge.setBorderColor(LIGHT_GRAY);
        emptyMerge.setMinimumHeight(35);
        emptyMerge.setBackgroundColor(VERY_LIGHT);
        items.addCell(emptyMerge);

        PdfPCell totLabel = new PdfPCell(new Phrase("TOTAL", totalLabelF));
        totLabel.setPadding(10);
        totLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totLabel.setVerticalAlignment(Element.ALIGN_MIDDLE);
        totLabel.setBorderColor(LIGHT_GRAY);
        totLabel.setBackgroundColor(VERY_LIGHT);
        items.addCell(totLabel);

        PdfPCell totValue = new PdfPCell(new Phrase(fmt(bill.getGrandTotal()),
                new Font(Font.FontFamily.TIMES_ROMAN, 14, Font.BOLD, BLACK)));
        totValue.setPadding(10);
        totValue.setHorizontalAlignment(Element.ALIGN_CENTER);
        totValue.setVerticalAlignment(Element.ALIGN_MIDDLE);
        totValue.setBorderColor(LIGHT_GRAY);
        totValue.setBackgroundColor(VERY_LIGHT);
        items.addCell(totValue);

        doc.add(items);
        doc.add(sp(4));

        // ════════════════════════════════════════════════════════════════
        //  GRAND TOTAL BOX + AMOUNT IN WORDS
        // ════════════════════════════════════════════════════════════════

        PdfPTable totalBox = new PdfPTable(2);
        totalBox.setWidthPercentage(100);
        totalBox.setWidths(new float[]{2, 1});

        // Left: Amount in words
        PdfPCell wordsCell = new PdfPCell();
        wordsCell.setBorder(Rectangle.BOX);
        wordsCell.setBorderColor(LIGHT_GRAY);
        wordsCell.setPadding(10);
        wordsCell.addElement(new Paragraph("Amount in Words:", labelF));
        wordsCell.addElement(new Paragraph(convertToWords((int) bill.getGrandTotal()) + " Rupees Only", wordsF));
        totalBox.addCell(wordsCell);

        // Right: Grand Total
        PdfPCell gtCell = new PdfPCell();
        gtCell.setBorder(Rectangle.BOX);
        gtCell.setBorderColor(BLACK);
        gtCell.setBorderWidth(1.5f);
        gtCell.setPadding(12);
        gtCell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph gtLabel = new Paragraph("GRAND TOTAL", totalLabelF);
        gtLabel.setAlignment(Element.ALIGN_CENTER);
        gtCell.addElement(gtLabel);
        Paragraph gtVal = new Paragraph("\u20B9 " + fmt(bill.getGrandTotal()), totalValF);
        gtVal.setAlignment(Element.ALIGN_CENTER);
        gtCell.addElement(gtVal);
        totalBox.addCell(gtCell);

        doc.add(totalBox);
        doc.add(sp(14));

        // ════════════════════════════════════════════════════════════════
        //  BANK DETAILS + UPI QR CODE + SIGNATURE
        // ════════════════════════════════════════════════════════════════

        PdfPTable footer = new PdfPTable(3);
        footer.setWidthPercentage(100);
        footer.setWidths(new float[]{1.3f, 1f, 1f});

        // Left: Bank Details
        PdfPCell bankCell = new PdfPCell();
        bankCell.setBorder(Rectangle.BOX);
        bankCell.setBorderColor(LIGHT_GRAY);
        bankCell.setPadding(8);
        bankCell.addElement(new Paragraph("BANK DETAILS", bankBoldF));
        bankCell.addElement(sp(2));
        bankCell.addElement(new Paragraph("A/c Name: Bhairavnath Cool Aqua", bankF));
        bankCell.addElement(new Paragraph("Bank: LONAVALA SAHAKARI BANK LTD.", bankF));
        bankCell.addElement(new Paragraph("Branch: Talawade", bankF));
        bankCell.addElement(new Paragraph("A/c No: 004002100000888", bankF));
        bankCell.addElement(new Paragraph("IFSC: HDFC0CLSABL", bankF));
        footer.addCell(bankCell);

        // Center: UPI QR Code
        PdfPCell qrCell = new PdfPCell();
        qrCell.setBorder(Rectangle.BOX);
        qrCell.setBorderColor(LIGHT_GRAY);
        qrCell.setPadding(6);
        qrCell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph qrTitle = new Paragraph("SCAN TO PAY", bankBoldF);
        qrTitle.setAlignment(Element.ALIGN_CENTER);
        qrCell.addElement(qrTitle);
        qrCell.addElement(sp(2));

        // Generate real UPI QR code with amount
        try {
            Image qrImage = generateUPIQR(bill.getGrandTotal());
            qrImage.setAlignment(Element.ALIGN_CENTER);
            qrImage.scaleAbsolute(95, 95);
            qrCell.addElement(qrImage);
        } catch (Exception e) {
            qrCell.addElement(new Paragraph("QR unavailable", bankF));
        }

        qrCell.addElement(sp(2));
        Paragraph upiLabel = new Paragraph("UPI ID:", qrLabelF);
        upiLabel.setAlignment(Element.ALIGN_CENTER);
        qrCell.addElement(upiLabel);
        Paragraph upiId = new Paragraph(UPI_ID, qrBoldF);
        upiId.setAlignment(Element.ALIGN_CENTER);
        qrCell.addElement(upiId);
        Paragraph amtLabel = new Paragraph("Amount: \u20B9" + fmt(bill.getGrandTotal()), qrBoldF);
        amtLabel.setAlignment(Element.ALIGN_CENTER);
        qrCell.addElement(amtLabel);

        footer.addCell(qrCell);

        // Right: Signature
        PdfPCell sigCell = new PdfPCell();
        sigCell.setBorder(Rectangle.BOX);
        sigCell.setBorderColor(LIGHT_GRAY);
        sigCell.setPadding(8);
        sigCell.setMinimumHeight(120);

        sigCell.addElement(sp(55));

        LineSeparator sigLine = new LineSeparator();
        sigLine.setLineColor(MID_GRAY);
        sigLine.setLineWidth(0.5f);
        sigLine.setPercentage(80);
        sigCell.addElement(new Chunk(sigLine));

        Paragraph forP = new Paragraph("For Bhairavnath Cool Aqua", bankBoldF);
        forP.setAlignment(Element.ALIGN_CENTER);
        sigCell.addElement(forP);
        Paragraph authP = new Paragraph("Authorized Signatory", bankF);
        authP.setAlignment(Element.ALIGN_CENTER);
        sigCell.addElement(authP);

        footer.addCell(sigCell);
        doc.add(footer);
        doc.add(sp(10));

        // Footer note
        LineSeparator footLine = new LineSeparator();
        footLine.setLineColor(LIGHT_GRAY);
        footLine.setLineWidth(0.3f);
        doc.add(new Chunk(footLine));
        doc.add(sp(3));
        Paragraph footNote = new Paragraph("This is a computer generated invoice. | Bhairavnath Cool Aqua Management System", footerF);
        footNote.setAlignment(Element.ALIGN_CENTER);
        doc.add(footNote);

        doc.close();
        return outputPath;
    }

    // ════════════════════════════════════════════════════════════════
    //  UPI QR CODE GENERATOR
    // ════════════════════════════════════════════════════════════════

    /**
     * Generates a real UPI payment QR code with the specified amount.
     * Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR
     */
    private static Image generateUPIQR(double amount) throws Exception {
        String upiUrl = String.format("upi://pay?pa=%s&pn=%s&am=%.2f&cu=INR",
                URLEncoder.encode(UPI_ID, StandardCharsets.UTF_8),
                URLEncoder.encode(UPI_NAME, StandardCharsets.UTF_8),
                amount);

        QRCodeWriter qrWriter = new QRCodeWriter();
        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.MARGIN, 1);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");

        BitMatrix matrix = qrWriter.encode(upiUrl, BarcodeFormat.QR_CODE, 300, 300, hints);

        // Convert to image bytes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
        byte[] imageBytes = baos.toByteArray();

        return Image.getInstance(imageBytes);
    }

    // ── Helper Methods ──

    private static void addRow(PdfPTable table, String sr, String desc, String qty, String rate, String amt,
                                Font font, Font boldFont, BaseColor bg) {
        table.addCell(cell(sr, font, bg, Element.ALIGN_CENTER));
        table.addCell(cell(desc, font, bg, Element.ALIGN_LEFT));
        table.addCell(cell(qty, boldFont, bg, Element.ALIGN_CENTER));
        table.addCell(cell(rate, font, bg, Element.ALIGN_CENTER));
        table.addCell(cell(amt, boldFont, bg, Element.ALIGN_RIGHT));
    }

    private static PdfPCell cell(String text, Font font, BaseColor bg, int align) {
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setPadding(8);
        c.setBackgroundColor(bg);
        c.setHorizontalAlignment(align);
        c.setBorderColor(LIGHT_GRAY);
        c.setMinimumHeight(25);
        return c;
    }

    private static PdfPCell cellNoBorder(Phrase phrase, int align) {
        PdfPCell c = new PdfPCell(phrase);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPadding(4);
        c.setHorizontalAlignment(align);
        return c;
    }

    private static PdfPCell cellNoBorder(Paragraph para, int align) {
        PdfPCell c = new PdfPCell();
        c.setBorder(Rectangle.NO_BORDER);
        c.setPadding(4);
        c.setHorizontalAlignment(align);
        c.addElement(para);
        return c;
    }

    private static Paragraph labelValue(String label, String value, Font lf, Font vf) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label, lf));
        p.add(new Chunk(value, vf));
        return p;
    }

    private static Paragraph sp(float h) {
        Paragraph p = new Paragraph(" ", new Font(Font.FontFamily.TIMES_ROMAN, h / 3f));
        p.setSpacingBefore(h / 2f);
        return p;
    }

    private static String fmt(double amount) {
        return String.format("\u20B9 %.0f", amount);
    }

    /**
     * Converts number to Indian English words for amount in words line.
     */
    private static String convertToWords(int number) {
        if (number == 0) return "Zero";
        String[] ones = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
                "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
                "Seventeen", "Eighteen", "Nineteen"};
        String[] tens = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

        if (number < 20) return ones[number];
        if (number < 100) return tens[number / 10] + (number % 10 != 0 ? " " + ones[number % 10] : "");
        if (number < 1000) return ones[number / 100] + " Hundred" + (number % 100 != 0 ? " and " + convertToWords(number % 100) : "");
        if (number < 100000) return convertToWords(number / 1000) + " Thousand" + (number % 1000 != 0 ? " " + convertToWords(number % 1000) : "");
        if (number < 10000000) return convertToWords(number / 100000) + " Lakh" + (number % 100000 != 0 ? " " + convertToWords(number % 100000) : "");
        return convertToWords(number / 10000000) + " Crore" + (number % 10000000 != 0 ? " " + convertToWords(number % 10000000) : "");
    }
}
