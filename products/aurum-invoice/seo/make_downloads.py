#!/usr/bin/env python3
"""Creates the free downloadable templates (Excel and Word) in ./downloads/. Run once; the build copies them to the site."""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.worksheet.page import PageMargins
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(OUT, exist_ok=True)
GOLD, INK, SAND = "8C6830", "1C1813", "EFE7D8"
NAIRA = '"₦"#,##0.00'
thin = Side(style="thin", color="CDBF9F"); box = Border(left=thin, right=thin, top=thin, bottom=thin)
FOOT = "Made with Aurum Invoice Studio · auruminvoicestudio.netlify.app"

def sheet(title, doc_name, number_prefix, lines=12, has_deposit=True, valid_until=False, receipt=False):
    wb = Workbook(); ws = wb.active; ws.title = doc_name
    ws.sheet_view.showGridLines = False
    for col, w in zip("ABCDE", (6, 44, 10, 16, 18)): ws.column_dimensions[col].width = w
    ws["A1"] = doc_name.upper(); ws["A1"].font = Font(name="Georgia", size=26, bold=True, color=GOLD)
    ws["A2"] = "Your business name"; ws["A2"].font = Font(bold=True, size=13, color=INK)
    ws["A3"] = "Address · Phone · Email"; ws["A4"] = "RC number (if registered) · TIN (if you have one)"
    for r in (3, 4): ws[f"A{r}"].font = Font(color="675E4E", size=10)
    ws["D2"] = f"{doc_name} no:"; ws["E2"] = f"{number_prefix}-0001"
    ws["D3"] = "Date:"; ws["E3"] = "DD/MM/YYYY"
    if valid_until: ws["D4"] = "Valid until:"; ws["E4"] = "DD/MM/YYYY"
    elif not receipt: ws["D4"] = "Due date:"; ws["E4"] = "DD/MM/YYYY"
    for r in (2, 3, 4): ws[f"D{r}"].font = Font(bold=True, size=10); ws[f"E{r}"].alignment = Alignment(horizontal="right")
    ws["A6"] = "Received from:" if receipt else ("Prepared for:" if valid_until else "Bill to:"); ws["A6"].font = Font(bold=True)
    ws["B6"] = "Customer name"; ws["B7"] = "Phone / email / address"; ws["B7"].font = Font(color="675E4E", size=10)
    if receipt:
        ws["A9"] = "Payment for:"; ws["B9"] = "Invoice number or description"
        ws["A10"] = "Method:"; ws["B10"] = "Bank transfer / Cash / POS / Card"
        ws["A11"] = "Reference:"; ws["B11"] = "Transfer reference (optional)"
        for r in (9, 10, 11): ws[f"A{r}"].font = Font(bold=True)
        ws["D13"] = "Amount received"; ws["E13"] = 0; ws["E13"].number_format = NAIRA; ws["D13"].font = Font(bold=True)
        ws["D14"] = "Total owed on invoice"; ws["E14"] = 0; ws["E14"].number_format = NAIRA
        ws["D15"] = "Balance remaining"; ws["E15"] = "=MAX(E14-E13,0)"; ws["E15"].number_format = NAIRA; ws["D15"].font = Font(bold=True); ws["E15"].font = Font(bold=True)
        ws["A17"] = "Signed: ____________________   Thank you for your payment."
        ws["A19"] = FOOT; ws["A19"].font = Font(size=9, color="9A907D", italic=True)
    else:
        hdr = 9
        for c, t in zip("ABCDE", ("No.", "Description", "Qty", "Unit price", "Amount")):
            cell = ws[f"{c}{hdr}"]; cell.value = t; cell.font = Font(bold=True, color="FFFFFF"); cell.fill = PatternFill("solid", fgColor=GOLD); cell.alignment = Alignment(horizontal="center" if c in "ACD E".replace(" ", "") else "left", vertical="center"); cell.border = box
        first, last = hdr + 1, hdr + lines
        for i in range(lines):
            r = first + i; ws[f"A{r}"] = i + 1
            ws[f"E{r}"] = f'=IF(OR(C{r}="",D{r}=""),"",C{r}*D{r})'
            ws[f"D{r}"].number_format = NAIRA; ws[f"E{r}"].number_format = NAIRA
            for c in "ABCDE": ws[f"{c}{r}"].border = box
            ws[f"A{r}"].alignment = Alignment(horizontal="center"); ws[f"C{r}"].alignment = Alignment(horizontal="center")
        ws[f"B{first}"] = "Example: Item or service"; ws[f"C{first}"] = 1; ws[f"D{first}"] = 0
        r = last + 2
        rows = [("Subtotal", f"=SUM(E{first}:E{last})"), ("Discount (₦)", 0), ("Delivery (₦)", 0), ("VAT rate (0 if none)", 0)]
        for i, (lab, val) in enumerate(rows):
            ws[f"D{r + i}"] = lab; ws[f"D{r + i}"].alignment = Alignment(horizontal="right", wrap_text=True); ws[f"E{r + i}"] = val; ws[f"E{r + i}"].number_format = NAIRA if i < 3 else "0.0%"
        sub, disc, dlv, vat = (f"E{r}", f"E{r+1}", f"E{r+2}", f"E{r+3}")
        ws[f"D{r + 4}"] = "VAT amount"; ws[f"E{r + 4}"] = f"=ROUND(({sub}-{disc})*{vat},2)"; ws[f"E{r + 4}"].number_format = NAIRA
        ws[f"D{r + 5}"] = "TOTAL"; ws[f"E{r + 5}"] = f"={sub}-{disc}+{dlv}+E{r + 4}"; ws[f"E{r + 5}"].number_format = NAIRA
        ws[f"D{r + 5}"].font = ws[f"E{r + 5}"].font = Font(bold=True, size=13, color=GOLD)
        for i in range(6): ws[f"D{r + i}"].alignment = Alignment(horizontal="right", wrap_text=True, vertical="center")
        nxt = r + 6
        if has_deposit:
            ws[f"D{nxt}"] = "Deposit paid (₦)"; ws[f"E{nxt}"] = 0; ws[f"E{nxt}"].number_format = NAIRA
            ws[f"D{nxt + 1}"] = "BALANCE DUE"; ws[f"E{nxt + 1}"] = f"=E{r + 5}-E{nxt}"; ws[f"E{nxt + 1}"].number_format = NAIRA
            ws[f"D{nxt + 1}"].font = ws[f"E{nxt + 1}"].font = Font(bold=True, size=13)
            ws[f"D{nxt}"].alignment = ws[f"D{nxt + 1}"].alignment = Alignment(horizontal="right")
            nxt += 3
        else: nxt += 1
        ws[f"A{nxt}"] = "Pay to:"; ws[f"A{nxt}"].font = Font(bold=True); ws[f"B{nxt}"] = "Bank · Account name · Account number"
        ws[f"A{nxt + 1}"] = "Terms:"; ws[f"A{nxt + 1}"].font = Font(bold=True)
        ws[f"B{nxt + 1}"] = ("Prices valid until the date above. A deposit is needed to start. To accept, reply \"Accepted\"." if valid_until else "Payment due by the date above. Thank you for your business.")
        ws[f"A{nxt + 3}"] = FOOT; ws[f"A{nxt + 3}"].font = Font(size=9, color="9A907D", italic=True)
    ws.page_setup.orientation = "portrait"; ws.page_setup.paperSize = ws.PAPERSIZE_A4; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True; ws.page_margins = PageMargins(left=0.5, right=0.5, top=0.6, bottom=0.6)
    wb.save(os.path.join(OUT, title))

sheet("Aurum-Invoice-Template.xlsx", "Invoice", "INV")
sheet("Aurum-Quotation-Template.xlsx", "Quotation", "QUO", has_deposit=False, valid_until=True)
sheet("Aurum-Receipt-Template.xlsx", "Receipt", "RCT", receipt=True)

# ---- Word version of the invoice
d = Document()
for s in d.sections: s.top_margin = s.bottom_margin = Cm(1.8); s.left_margin = s.right_margin = Cm(2)
st = d.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(11)
h = d.add_paragraph(); r = h.add_run("INVOICE"); r.bold = True; r.font.size = Pt(28); r.font.color.rgb = RGBColor(0x8C, 0x68, 0x30)
p = d.add_paragraph(); r = p.add_run("[Your business name]"); r.bold = True; r.font.size = Pt(13)
d.add_paragraph("[Address] · [Phone] · [Email]\nRC: [CAC number, if registered] · TIN: [if you have one]")
d.add_paragraph("Invoice no: INV-0001      Date: [DD/MM/YYYY]      Due: [DD/MM/YYYY]")
p = d.add_paragraph(); p.add_run("Bill to: ").bold = True; p.add_run("[Customer name]\n[Phone / email / address]")
t = d.add_table(rows=1, cols=4); t.style = "Light Grid Accent 3"
for c, x in zip(t.rows[0].cells, ("Description", "Qty", "Unit price (₦)", "Amount (₦)")): c.text = x
for _ in range(8):
    cells = t.add_row().cells
    for c in cells: c.text = ""
for lab in ("Subtotal", "Discount / Delivery", "VAT (if you charge it)", "TOTAL DUE", "Deposit paid", "BALANCE DUE"):
    cells = t.add_row().cells; cells[2].text = lab; cells[3].text = ""
    for par in cells[2].paragraphs:
        for rr in par.runs: rr.bold = lab.isupper() or lab.startswith("BALANCE")
d.add_paragraph()
p = d.add_paragraph(); p.add_run("Pay to: ").bold = True; p.add_run("[Bank] · [Account name] · [Account number]")
p = d.add_paragraph(); p.add_run("Terms: ").bold = True; p.add_run("Payment due by [date]. [Deposit / refund note.] Thank you for your business.")
f = d.add_paragraph(FOOT); f.alignment = WD_ALIGN_PARAGRAPH.LEFT
for rr in f.runs: rr.font.size = Pt(8.5); rr.italic = True; rr.font.color.rgb = RGBColor(0x9A, 0x90, 0x7D)
d.save(os.path.join(OUT, "Aurum-Invoice-Template.docx"))
print("downloads:", sorted(os.listdir(OUT)))
