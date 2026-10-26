"""Build the blank season workbook (one row per playoff game; chapter counts are formulas).

  python3 scripts/season_template.py season/2026/2026_season.xlsx 2026
"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.comments import Comment

OUT = sys.argv[1]
YEAR = int(sys.argv[2]) if len(sys.argv) > 2 else 2026
N = 800  # game rows
F = "Arial"
INK, CREAM = "1F1B16", "FFF8E7"
hdr_font = Font(name=F, bold=True, color="FFFFFF")
hdr_fill = PatternFill("solid", fgColor=INK)
inp_fill = PatternFill("solid", fgColor="FFF2B3")   # cells to fill in
calc_fill = PatternFill("solid", fgColor="EDEDED")  # automatic
bad_fill = PatternFill("solid", fgColor="F8C9C4")
ok_fill = PatternFill("solid", fgColor="D5EBD3")
base = Font(name=F, size=10)
bold = Font(name=F, size=10, bold=True)
thin = Side(style="thin", color="BFBFBF")
box = Border(left=thin, right=thin, top=thin, bottom=thin)

CHAPTERS = [("ABI","Abilene"),("AMA","Amarillo"),("AUS","Austin"),("BEA","Beaumont"),
 ("COM","Commerce"),("CSC","College Station"),("CTX","Central Texas"),("DAL","Dallas"),
 ("ELP","El Paso"),("ETX","East Texas"),("FTW","Fort Worth"),("HOU","Houston"),
 ("NTX","North Texas"),("PBC","Permian Basin"),("PVC","Pecan Valley"),
 ("RGV","Rio Grande Valley"),("SAN","San Angelo"),("SAT","San Antonio"),
 ("SFA","Stephen F. Austin"),("SPC","South Plains"),("STX","South Texas"),
 ("TYL","Tyler"),("WAC","Waco")]
CLASSES = ['1A D1','1A D2','2A D1','2A D2','3A D1','3A D2','4A D1','4A D2',
           '5A D1','5A D2','6A D1','6A D2']
ROUNDS = ["Bi-District","Area","Regionals","Quarterfinals","Semifinals","Championship"]
EXPECTED = [352,176,88,44,22,10]
CH_ROWS = 40  # room for added chapters

def header(ws, row, labels, widths=None):
    for i, t in enumerate(labels, 1):
        c = ws.cell(row=row, column=i, value=t)
        c.font, c.fill, c.border = hdr_font, hdr_fill, box
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[ws.cell(row=row, column=i).column_letter].width = w

wb = Workbook()

# ---------------- Instructions ----------------
ins = wb.active; ins.title = "Instructions"
ins.sheet_view.showGridLines = False
ins.column_dimensions["A"].width = 3
for col, w in zip("BCDEFGHIJKL", [8,14,13,9,22,8,22,8,9,22,30]):
    ins.column_dimensions[col].width = w
ins["B2"] = "Texas Playoffs — Season Data Entry Template"; ins["B2"].font = Font(name=F, size=16, bold=True)
ins["B3"] = "One workbook per season. Enter one row per playoff game on the Games tab; chapter counts are calculated for you."
ins["B3"].font = base
ins["B5"] = "Season year"; ins["B5"].font = bold
ins["D5"] = YEAR; ins["D5"].fill = inp_fill; ins["D5"].font = base; ins["D5"].border = box
ins["D5"].comment = Comment("Type the season year (e.g. 2026). Used for the app's year tab.", "Template")

ins["B7"] = "Legend"; ins["B7"].font = bold
ins["B8"].fill = inp_fill; ins["B8"].border = box
ins["C8"] = "Yellow = you fill this in"; ins["C8"].font = base
ins["B9"].fill = calc_fill; ins["B9"].border = box
ins["C9"] = "Grey = automatic, don't type here"; ins["C9"].font = base
ins["B10"].fill = bad_fill; ins["B10"].border = box
ins["C10"] = "Red = something to check"; ins["C10"].font = base

rules = [
 "How to fill in the Games tab",
 "Teams and scores are filled in automatically from the UIL brackets during the playoffs — usually all you add is the Chapter.",
 "1. Week: 1–6. The round name fills in automatically (1 Bi-District, 2 Area, 3 Regionals, 4 Quarterfinals, 5 Semifinals, 6 Championship).",
 "2. Classification and Chapter: pick from the dropdown. Don't type free text — that's what keeps the counts consistent.",
 "3. Teams: use the school's full name, the same spelling every year (e.g. \"Fort Bend Ridge Point\", not \"FB Ridge Point\").",
 "4. Scores: whole numbers. Winner fills in automatically.",
 "5. Forfeit: pick Y and leave Chapter blank (no crew worked it). Enter the winner's score as 2 and the loser's as 0, as in past seasons.",
 "6. Check column: should be empty. Fix any row it flags.",
 "7. When done, look at Chapter Stats: the Difference row should be all zeros (green).",
 "New chapter? Add its code and name at the bottom of the Lists tab and it appears in the dropdown.",
 "Expected games per week live on the Lists tab — change them if the bracket size changes (e.g. 2023 was 320/192/96/48/24/12).",
]
r = 12
for t in rules:
    ins.cell(row=r, column=2, value=t).font = bold if r == 12 else base
    r += 1

r += 1
ins.cell(row=r, column=2, value="Example row (format only — not counted)").font = bold
r += 1
ex_hdr = ["Week","Round","Classification","Chapter","Team 1","Score 1","Team 2","Score 2","Forfeit","Winner","Notes"]
for i, t in enumerate(ex_hdr, 2):
    c = ins.cell(row=r, column=i, value=t); c.font = hdr_font; c.fill = hdr_fill; c.border = box
ex = [2,"Area","6A D1","HOU","Cy-Fair",20,"Fort Bend Ridge Point",41,"","Fort Bend Ridge Point","Played at Tully Stadium"]
for i, v in enumerate(ex, 2):
    c = ins.cell(row=r+1, column=i, value=v); c.font = base; c.border = box
    c.fill = calc_fill if ex_hdr[i-2] in ("Round","Winner") else inp_fill

# ---------------- Lists ----------------
ls = wb.create_sheet("Lists")
header(ls, 1, ["Chapter code","Chapter name"], [14,24])
for i in range(CH_ROWS):
    for j in (1,2):
        c = ls.cell(row=2+i, column=j); c.fill = inp_fill; c.border = box; c.font = base
    if i < len(CHAPTERS):
        ls.cell(row=2+i, column=1, value=CHAPTERS[i][0]); ls.cell(row=2+i, column=2, value=CHAPTERS[i][1])
ls["A1"].comment = Comment("Add new chapters in the empty yellow rows. Codes are what the app stores; keep them 2–4 capital letters.", "Template")
CH_RANGE = f"Lists!$A$2:$A${CH_ROWS+1}"

ls.column_dimensions["D"].width = 16
ls["D1"] = "Classification"
for i, v in enumerate(CLASSES): ls.cell(row=2+i, column=4, value=v)
CL_RANGE = f"Lists!$D$2:$D${len(CLASSES)+1}"
for col, w in zip("FGH", [8,16,16]): ls.column_dimensions[col].width = w
for j, t in enumerate(["Week","Round","Expected games"], 6): ls.cell(row=1, column=j, value=t)
for i in range(6):
    ls.cell(row=2+i, column=6, value=i+1)
    ls.cell(row=2+i, column=7, value=ROUNDS[i])
    e = ls.cell(row=2+i, column=8, value=EXPECTED[i]); e.fill = inp_fill
ls["H1"].comment = Comment("Total games in the whole UIL bracket that week. Defaults match 2021, 2024 and 2025; 2023 was 320/192/96/48/24/12.", "Template")
for row in ls.iter_rows(min_row=1, max_row=13, min_col=4, max_col=8):
    for c in row:
        if c.column == 5: continue
        c.border = box
        if c.row == 1: c.font, c.fill = hdr_font, hdr_fill
        else: c.font = base
        if c.row > 1 and c.column in (4,6,7): c.fill = calc_fill
ls.freeze_panes = "A2"

# ---------------- Games ----------------
gs = wb.create_sheet("Games", 1)
cols = ["Week","Round","Classification","Chapter","Team 1","Score 1","Team 2","Score 2","Forfeit","Winner","Notes","Check"]
header(gs, 1, cols, [7,15,14,10,28,8,28,8,8,28,30,24])
gs.freeze_panes = "A2"
gs.auto_filter.ref = f"A1:L{N+1}"
last = N + 1
for r in range(2, last + 1):
    gs[f"B{r}"] = f'=IF(A{r}="","",IFERROR(INDEX(Lists!$G$2:$G$7,MATCH(A{r},Lists!$F$2:$F$7,0)),"?"))'
    gs[f"J{r}"] = f'=IF(OR(F{r}="",H{r}=""),"",IF(F{r}>H{r},E{r},IF(H{r}>F{r},G{r},"")))'
    gs[f"L{r}"] = (f'=IF(COUNTA(A{r},C{r},D{r},E{r},F{r},G{r},H{r},I{r})=0,"",'
                   f'IF(OR(A{r}="",C{r}="",E{r}="",G{r}=""),"Missing week/class/team",'
                   f'IF(AND(D{r}="",I{r}<>"Y"),"No chapter (forfeit?)",'
                   f'IF(AND(D{r}<>"",I{r}="Y"),"Forfeit has a chapter",'
                   f'IF(OR(F{r}="",H{r}=""),"Missing score",'
                   f'IF(F{r}=H{r},"Tie score",'
                   f'IF(COUNTIFS($A$2:$A${last},A{r},$E$2:$E${last},E{r})+COUNTIFS($A$2:$A${last},A{r},$G$2:$G${last},E{r})>1,"Team 1 listed twice this week",'
                   f'IF(COUNTIFS($A$2:$A${last},A{r},$E$2:$E${last},G{r})+COUNTIFS($A$2:$A${last},A{r},$G$2:$G${last},G{r})>1,"Team 2 listed twice this week",""))))))))')
    for col in "ABCDEFGHIJKL":
        c = gs[f"{col}{r}"]; c.font = base; c.border = box
        c.fill = calc_fill if col in "BJL" else inp_fill
        if col in "AFHI": c.alignment = Alignment(horizontal="center")

def dv(formula, rng, title, msg):
    v = DataValidation(type="list", formula1=formula, allow_blank=True, showErrorMessage=True,
                       errorTitle=title, error=msg)
    gs.add_data_validation(v); v.add(rng)
dv('"1,2,3,4,5,6"', f"A2:A{last}", "Week", "Week must be 1–6.")
dv(CL_RANGE, f"C2:C{last}", "Classification", "Pick a classification from the list.")
dv(CH_RANGE, f"D2:D{last}", "Chapter", "Pick a chapter code from the list (add new ones on the Lists tab).")
dv('"Y"', f"I2:I{last}", "Forfeit", "Use Y for a forfeit, otherwise leave blank.")
sc = DataValidation(type="whole", operator="between", formula1="0", formula2="200", allow_blank=True,
                    showErrorMessage=True, errorTitle="Score", error="Score must be a whole number 0–200.")
gs.add_data_validation(sc); sc.add(f"F2:F{last}"); sc.add(f"H2:H{last}")
gs.conditional_formatting.add(f"L2:L{last}", FormulaRule(formula=[f'LEN(L2)>0'], fill=bad_fill))

# ---------------- Chapter Stats ----------------
st = wb.create_sheet("Chapter Stats", 2)
header(st, 1, ["Code","Chapter"] + [f"Wk {i}\n{ROUNDS[i-1]}" for i in range(1,7)] + ["Total"],
       [9,22,12,12,12,14,12,14,10])
st.row_dimensions[1].height = 32
st.freeze_panes = "C2"
G = f"Games!$A$2:$A${last}"; GD = f"Games!$D$2:$D${last}"; GI = f"Games!$I$2:$I${last}"
for i in range(CH_ROWS):
    r = 2 + i
    st[f"A{r}"] = f'=IF(Lists!A{r}="","",Lists!A{r})'
    st[f"B{r}"] = f'=IF(Lists!B{r}="","",Lists!B{r})'
    for w in range(1, 7):
        col = st.cell(row=r, column=2+w).column_letter
        st[f"{col}{r}"] = f'=IF($A{r}="","",COUNTIFS({GD},$A{r},{G},{w}))'
    st[f"I{r}"] = f'=IF($A{r}="","",SUM(C{r}:H{r}))'
    for c in st[r]: c.font = base; c.border = box; c.fill = calc_fill
end = CH_ROWS + 1
labels = [("Forfeits (no chapter)", lambda w: f'=COUNTIFS({G},{w},{GI},"Y")'),
          ("Total entered", lambda w: f'=COUNTIFS({G},{w})'),
          ("Expected", lambda w: f'=Lists!H{1+w}'),
          ("Difference", None)]
for k, (lab, fn) in enumerate(labels):
    r = end + 2 + k
    st[f"B{r}"] = lab
    for w in range(1, 7):
        col = st.cell(row=r, column=2+w).column_letter
        st[f"{col}{r}"] = fn(w) if fn else f"={col}{r-2}-{col}{r-1}"
    st[f"I{r}"] = f"=SUM(C{r}:H{r})"
    for c in st[r][1:9]: c.font = bold; c.border = box; c.fill = calc_fill
diff_row = end + 5
st.conditional_formatting.add(f"C{diff_row}:I{diff_row}", FormulaRule(formula=[f"C{diff_row}<>0"], fill=bad_fill))
st.conditional_formatting.add(f"C{diff_row}:I{diff_row}", FormulaRule(formula=[f"C{diff_row}=0"], fill=ok_fill))
st[f"B{diff_row+1}"] = "Difference should be 0 every week. Positive = extra/duplicate rows; negative = games still missing."
st[f"B{diff_row+1}"].font = Font(name=F, size=9, italic=True)

# ---------------- By Classification ----------------
bc = wb.create_sheet("By Classification", 3)
header(bc, 1, ["Classification"] + [f"Wk {i}" for i in range(1,7)] + ["Total","Unassigned"], [16,9,9,9,9,9,9,10,12])
GC = f"Games!$C$2:$C${last}"
for i, cl in enumerate(CLASSES):
    r = 2 + i
    bc[f"A{r}"] = f"=Lists!D{r}"
    for w in range(1, 7):
        col = bc.cell(row=r, column=1+w).column_letter
        bc[f"{col}{r}"] = f'=COUNTIFS({GC},$A{r},{G},{w})'
    bc[f"H{r}"] = f"=SUM(B{r}:G{r})"
    bc[f"I{r}"] = f'=COUNTIFS({GC},$A{r},{GD},"")-COUNTIFS({GC},$A{r},{GD},"",{G},"")'
    for c in bc[r]: c.font = base; c.border = box; c.fill = calc_fill
r = 2 + len(CLASSES)
bc[f"A{r}"] = "Total"
for col in "BCDEFGHI":
    bc[f"{col}{r}"] = f"=SUM({col}2:{col}{r-1})"
for c in bc[r]: c.font = bold; c.border = box; c.fill = calc_fill
bc[f"A{r+1}"] = "Unassigned = games with no chapter (should equal forfeits)."
bc[f"A{r+1}"].font = Font(name=F, size=9, italic=True)
bc.freeze_panes = "B2"

import os
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
wb.save(OUT)
