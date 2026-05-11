package com.aqua.util;

import com.aqua.model.Delivery;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Exports delivery data to Excel (.xlsx) spreadsheet.
 * Supports both flat list and register (pivot) format.
 */
public class ExcelExporter {

    /**
     * Export in register format: Customers as rows, Dates 1-31 as columns.
     * Each cell shows total quantity delivered that day.
     */
    public static String exportRegister(List<String[]> rows, int daysInMonth, String outputPath, String title) throws Exception {
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Delivery Register");

        // Styles
        CellStyle titleStyle = wb.createCellStyle();
        Font titleFont = wb.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 16);
        titleStyle.setFont(titleFont);
        titleStyle.setAlignment(HorizontalAlignment.CENTER);

        CellStyle headerStyle = wb.createCellStyle();
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setFontHeightInPoints((short) 10);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setBorderBottom(BorderStyle.THIN);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);

        CellStyle nameStyle = wb.createCellStyle();
        Font nameFont = wb.createFont();
        nameFont.setBold(true);
        nameFont.setFontHeightInPoints((short) 10);
        nameStyle.setFont(nameFont);
        nameStyle.setBorderBottom(BorderStyle.THIN);
        nameStyle.setBorderLeft(BorderStyle.THIN);
        nameStyle.setBorderRight(BorderStyle.THIN);

        CellStyle dataStyle = wb.createCellStyle();
        dataStyle.setAlignment(HorizontalAlignment.CENTER);
        dataStyle.setBorderBottom(BorderStyle.THIN);
        dataStyle.setBorderTop(BorderStyle.THIN);
        dataStyle.setBorderLeft(BorderStyle.THIN);
        dataStyle.setBorderRight(BorderStyle.THIN);

        CellStyle emptyStyle = wb.createCellStyle();
        emptyStyle.cloneStyleFrom(dataStyle);
        Font grayFont = wb.createFont();
        grayFont.setColor(IndexedColors.GREY_40_PERCENT.getIndex());
        grayFont.setFontHeightInPoints((short) 9);
        emptyStyle.setFont(grayFont);

        CellStyle altStyle = wb.createCellStyle();
        altStyle.cloneStyleFrom(dataStyle);
        altStyle.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
        altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        CellStyle altEmptyStyle = wb.createCellStyle();
        altEmptyStyle.cloneStyleFrom(altStyle);
        altEmptyStyle.setFont(grayFont);

        CellStyle totalStyle = wb.createCellStyle();
        Font totalFont = wb.createFont();
        totalFont.setBold(true);
        totalFont.setFontHeightInPoints((short) 11);
        totalFont.setColor(IndexedColors.DARK_RED.getIndex());
        totalStyle.setFont(totalFont);
        totalStyle.setAlignment(HorizontalAlignment.CENTER);
        totalStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        totalStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        totalStyle.setBorderBottom(BorderStyle.DOUBLE);
        totalStyle.setBorderTop(BorderStyle.DOUBLE);
        totalStyle.setBorderLeft(BorderStyle.THIN);
        totalStyle.setBorderRight(BorderStyle.THIN);

        int totalCols = daysInMonth + 4; // sr + name + days + totalJars + totalBottles

        // Title row
        Row titleRow = sheet.createRow(0);
        Cell tc = titleRow.createCell(0);
        tc.setCellValue("Bhairavnath Cool Aqua — " + title);
        tc.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, Math.min(totalCols - 1, 10)));

        // Subtitle
        Row subRow = sheet.createRow(1);
        Cell sc = subRow.createCell(0);
        sc.setCellValue("Bathe Wasti, Talawade, Pune - 411062 | Mob: 7030355656");
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, Math.min(totalCols - 1, 10)));

        // Headers (row 3): Sr. | Customer | 1 | 2 | 3 | ... | 31 | Total Jars | Total Bottles
        Row hRow = sheet.createRow(3);
        String[] headers = new String[totalCols];
        headers[0] = "Sr.";
        headers[1] = "Customer Name";
        for (int d = 1; d <= daysInMonth; d++) headers[d + 1] = String.valueOf(d);
        headers[daysInMonth + 2] = "Total Jars";
        headers[daysInMonth + 3] = "Total Bottles";

        for (int i = 0; i < totalCols; i++) {
            Cell c = hRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        // Data rows
        for (int r = 0; r < rows.size(); r++) {
            Row row = sheet.createRow(4 + r);
            String[] data = rows.get(r);
            boolean alt = r % 2 == 1;

            for (int i = 0; i < totalCols && i < data.length; i++) {
                Cell c = row.createCell(i);
                String val = data[i];

                if (i == 0) {
                    // Sr. number
                    try { c.setCellValue(Integer.parseInt(val)); } catch (Exception e) { c.setCellValue(val); }
                    c.setCellStyle(alt ? altStyle : dataStyle);
                } else if (i == 1) {
                    // Customer name
                    c.setCellValue(val);
                    c.setCellStyle(nameStyle);
                } else if (i >= daysInMonth + 2) {
                    // Total columns
                    try { c.setCellValue(Integer.parseInt(val)); } catch (Exception e) { c.setCellValue(val); }
                    c.setCellStyle(totalStyle);
                } else {
                    // Day columns
                    if (val == null || val.isEmpty() || "0".equals(val)) {
                        c.setCellValue("-");
                        c.setCellStyle(alt ? altEmptyStyle : emptyStyle);
                    } else {
                        try { c.setCellValue(Integer.parseInt(val)); } catch (Exception e) { c.setCellValue(val); }
                        c.setCellStyle(alt ? altStyle : dataStyle);
                    }
                }
            }
        }

        // Grand total row
        int grandRow = 4 + rows.size() + 1;
        Row gr = sheet.createRow(grandRow);
        Cell gLabel = gr.createCell(1);
        gLabel.setCellValue("GRAND TOTAL");
        gLabel.setCellStyle(totalStyle);

        // Sum totals
        int grandJars = 0, grandBottles = 0;
        for (String[] row : rows) {
            try { grandJars += Integer.parseInt(row[daysInMonth + 2]); } catch (Exception ignored) {}
            try { grandBottles += Integer.parseInt(row[daysInMonth + 3]); } catch (Exception ignored) {}
        }
        Cell gj = gr.createCell(daysInMonth + 2);
        gj.setCellValue(grandJars);
        gj.setCellStyle(totalStyle);
        Cell gb = gr.createCell(daysInMonth + 3);
        gb.setCellValue(grandBottles);
        gb.setCellStyle(totalStyle);

        // Column widths
        sheet.setColumnWidth(0, 1500);   // Sr
        sheet.setColumnWidth(1, 7000);   // Name
        for (int d = 2; d < daysInMonth + 2; d++) sheet.setColumnWidth(d, 1200); // Day cols
        sheet.setColumnWidth(daysInMonth + 2, 3000); // Total Jars
        sheet.setColumnWidth(daysInMonth + 3, 3500); // Total Bottles

        // Freeze pane: customer name column stays visible when scrolling right
        sheet.createFreezePane(2, 4);

        FileOutputStream fos = new FileOutputStream(outputPath);
        wb.write(fos);
        fos.close();
        wb.close();

        return outputPath;
    }

    /**
     * Original flat list export (kept for compatibility).
     */
    public static String exportDeliveries(List<Delivery> deliveries, String outputPath, String title) throws Exception {
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Delivery Report");

        CellStyle headerStyle = wb.createCellStyle();
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);

        CellStyle titleStyle = wb.createCellStyle();
        Font titleFont = wb.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 16);
        titleStyle.setFont(titleFont);
        titleStyle.setAlignment(HorizontalAlignment.CENTER);

        Row titleRow = sheet.createRow(0);
        Cell tc = titleRow.createCell(0);
        tc.setCellValue("Bhairavnath Cool Aqua — " + title);
        tc.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 4));

        String[] headers = {"Sr.No.", "Date", "Customer Name", "Jars (20L)", "Bottles (20L)"};
        Row hRow = sheet.createRow(2);
        for (int i = 0; i < headers.length; i++) {
            Cell c = hRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        for (int i = 0; i < deliveries.size(); i++) {
            Delivery d = deliveries.get(i);
            Row row = sheet.createRow(3 + i);
            row.createCell(0).setCellValue(i + 1);
            row.createCell(1).setCellValue(d.getDeliveryDate().format(fmt));
            row.createCell(2).setCellValue(d.getCustomerName());
            row.createCell(3).setCellValue(d.getJarQty());
            row.createCell(4).setCellValue(d.getBottleQty());
        }

        for (int i = 0; i < 5; i++) sheet.autoSizeColumn(i);

        FileOutputStream fos = new FileOutputStream(outputPath);
        wb.write(fos);
        fos.close();
        wb.close();
        return outputPath;
    }
}
