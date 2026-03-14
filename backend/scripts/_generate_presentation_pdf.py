"""Generate RUBLI presentation PDF."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from fpdf import FPDF


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return  # No header on intro page
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, 'RUBLI - Mexican Government Procurement Analysis', align='R')
        self.ln(5)
        self.set_draw_color(220, 38, 38)
        self.set_line_width(0.5)
        self.line(10, 15, 200, 15)
        self.ln(5)

    def footer(self):
        if self.page_no() == 1:
            return  # No footer on intro page
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no() - 1}/{{nb}}', align='C')

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(30, 58, 95)
        self.cell(0, 10, title, new_x='LMARGIN', new_y='NEXT')
        self.set_draw_color(220, 38, 38)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 80, self.get_y())
        self.ln(3)

    def stat_row(self, label, value):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(60, 60, 60)
        self.cell(90, 7, label)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(30, 58, 95)
        self.cell(0, 7, str(value), new_x='LMARGIN', new_y='NEXT')

    def bullet(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(60, 60, 60)
        self.cell(5, 6, '-')
        self.multi_cell(175, 6, text, new_x='LMARGIN', new_y='NEXT')

    def finding(self, num, title, desc):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(220, 38, 38)
        self.cell(0, 8, f'{num}. {title}', new_x='LMARGIN', new_y='NEXT')
        self.bullet(desc)
        self.ln(3)


pdf = PDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)

# ── PAGE 1: Intro ──
pdf.add_page()

# Dark navy background block at top
pdf.set_fill_color(30, 58, 95)
pdf.rect(0, 0, 210, 120, 'F')

# Title on dark background
pdf.ln(25)
pdf.set_font('Helvetica', 'B', 48)
pdf.set_text_color(255, 255, 255)
pdf.cell(0, 20, 'RUBLI', align='C', new_x='LMARGIN', new_y='NEXT')

pdf.ln(3)
pdf.set_font('Helvetica', '', 13)
pdf.set_text_color(180, 200, 220)
pdf.cell(0, 8, 'AI-Powered Corruption Detection for', align='C', new_x='LMARGIN', new_y='NEXT')
pdf.cell(0, 8, 'Mexican Government Procurement', align='C', new_x='LMARGIN', new_y='NEXT')

# Thin accent line
pdf.ln(8)
pdf.set_draw_color(220, 38, 38)
pdf.set_line_width(1.5)
pdf.line(75, pdf.get_y(), 135, pdf.get_y())

# Stats on white background — 3 columns
pdf.ln(30)
pdf.set_text_color(30, 58, 95)

# Column 1: Contracts
col_w = 63.3
x_start = 10
pdf.set_xy(x_start, 135)
pdf.set_font('Helvetica', 'B', 22)
pdf.cell(col_w, 12, '3.05M', align='C', new_x='LMARGIN', new_y='NEXT')
pdf.set_xy(x_start, 148)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(100, 100, 100)
pdf.cell(col_w, 6, 'Contracts Analyzed', align='C')

# Column 2: Value
pdf.set_xy(x_start + col_w, 135)
pdf.set_font('Helvetica', 'B', 22)
pdf.set_text_color(30, 58, 95)
pdf.cell(col_w, 12, '9.9T MXN', align='C', new_x='LMARGIN', new_y='NEXT')
pdf.set_xy(x_start + col_w, 148)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(100, 100, 100)
pdf.cell(col_w, 6, 'Total Procurement Value', align='C')

# Column 3: Years
pdf.set_xy(x_start + col_w * 2, 135)
pdf.set_font('Helvetica', 'B', 22)
pdf.set_text_color(30, 58, 95)
pdf.cell(col_w, 12, '24 Years', align='C', new_x='LMARGIN', new_y='NEXT')
pdf.set_xy(x_start + col_w * 2, 148)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(100, 100, 100)
pdf.cell(col_w, 6, '2001 - 2025', align='C')

# Separator
pdf.set_xy(10, 165)
pdf.set_draw_color(220, 220, 220)
pdf.set_line_width(0.3)
pdf.line(30, 165, 180, 165)

# Key highlights row
pdf.set_xy(10, 175)
highlights = [
    ('390', 'Corruption Cases'),
    ('725', 'Flagged Vendors'),
    ('0.957', 'Model AUC'),
    ('9.0%', 'High-Risk Rate'),
]
hw = 47.5
for i, (val, label) in enumerate(highlights):
    x = 10 + i * hw
    pdf.set_xy(x, 175)
    pdf.set_font('Helvetica', 'B', 16)
    pdf.set_text_color(220, 38, 38)
    pdf.cell(hw, 10, val, align='C')
    pdf.set_xy(x, 186)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(hw, 5, label, align='C')

# Bottom section
pdf.set_xy(10, 215)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(150, 150, 150)
pdf.cell(95, 6, 'March 2026')
pdf.cell(95, 6, 'rubli.xyz', align='R')

pdf.set_xy(10, 225)
pdf.set_font('Helvetica', 'I', 8)
pdf.set_text_color(170, 170, 170)
pdf.cell(0, 6, 'Source: COMPRANET Federal Procurement Database  |  Risk Model v5.1  |  ARIA Investigation Engine', align='C')

# ── PAGE 2: Platform Overview ──
pdf.add_page()
pdf.section_title('Platform Overview')
pdf.ln(2)
pdf.stat_row('Total contracts analyzed', '3,051,294')
pdf.stat_row('Total procurement value', '9.9 Trillion MXN (~$500B USD)')
pdf.stat_row('Time span', '2001-2025 (24 years)')
pdf.stat_row('Data source', 'COMPRANET (federal procurement)')
pdf.stat_row('Sectors covered', '12 (Salud, Energia, Defensa, etc.)')
pdf.stat_row('Vendors tracked', '320,429')
pdf.ln(5)

pdf.section_title('Risk Model v5.1 Performance')
pdf.ln(2)
pdf.stat_row('Model type', 'Per-sector calibrated logistic regression')
pdf.stat_row('Features', '16 z-score normalized indicators')
pdf.stat_row('Sub-models', '12 per-sector + 1 global fallback')
pdf.stat_row('Train AUC', '0.964')
pdf.stat_row('Test AUC (temporal split)', '0.957')
pdf.stat_row('PU-learning correction', 'Elkan & Noto (c = 0.882)')
pdf.stat_row('High-risk rate', '9.0% (OECD benchmark: 2-15%)')
pdf.ln(5)

pdf.section_title('Risk Distribution')
pdf.ln(2)
pdf.stat_row('Critical (>= 0.50)', '186,582 contracts (6.1%)')
pdf.stat_row('High (>= 0.30)', '87,129 contracts (2.9%)')
pdf.stat_row('Medium (>= 0.10)', '403,341 contracts (13.2%)')
pdf.stat_row('Low (< 0.10)', '2,374,242 contracts (77.8%)')

# ── PAGE 3: Ground Truth & ARIA ──
pdf.add_page()
pdf.section_title('Ground Truth Database')
pdf.ln(2)
pdf.stat_row('Documented corruption cases', '390')
pdf.stat_row('Matched vendors', '725')
pdf.stat_row('Tagged contracts', '283,759')
pdf.ln(2)
pdf.set_font('Helvetica', 'I', 9)
pdf.set_text_color(100, 100, 100)
pdf.multi_cell(0, 5, (
    'Sources: ASF audits, court records, investigative journalism, '
    'SAT EFOS definitivo list, SFP sanctions. Cases include IMSS ghost '
    'companies, Segalmex fraud, COVID-19 procurement, Estafa Maestra, '
    'Odebrecht-PEMEX, and 380+ others.'
))
pdf.ln(5)

pdf.section_title('ARIA - Automated Investigation Pipeline')
pdf.ln(2)
pdf.stat_row('Vendors scored (IPS)', '320,429')
pdf.stat_row('Tier 1 (critical) remaining', '0 - all investigated')
pdf.stat_row('Tier 2 (high) pending', '1,065')
pdf.stat_row('AI investigation memos', '362')
pdf.stat_row('Confirmed corrupt', '107 vendors')
pdf.stat_row('Under review', '185 vendors')
pdf.stat_row('False positives excluded', '3,952')
pdf.ln(5)

pdf.section_title('External Data Integration (CENTINELA)')
pdf.ln(2)
pdf.stat_row('SAT EFOS definitivo (ghost companies)', '11,208 records')
pdf.stat_row('SFP sanctions (barred vendors)', '2,395 records')
pdf.stat_row('RUPC (registered suppliers)', '23,704 records')
pdf.stat_row('Auto-feeds into', 'ARIA risk scoring pipeline')

# ── PAGE 4: Key Findings ──
pdf.add_page()
pdf.section_title('Key Findings')
pdf.ln(3)

pdf.finding(1, 'CONAGUA Construction Ring',
    '6+ construction companies with >70% single-bid rates, all concentrated '
    'at CONAGUA water infrastructure projects. Pattern suggests coordinated '
    'bid allocation across multiple firms.')

pdf.finding(2, 'DICONSA Food Distribution Monopoly',
    '14+ vendors totaling >40B MXN at 90-100% direct award via thousands '
    'of micro-contracts (fraccionamiento sistematico). Model blind spot: '
    'risk scores near 0.000 for all due to pattern difference.')

pdf.finding(3, 'IMSS Cleaning Company Shell Ring',
    'LAMAP/ARMOT pattern: new shell companies appearing in 2021-2022 with '
    '100% direct award at IMSS for cleaning services. Multiple confirmed corrupt.')

pdf.finding(4, 'Farmaceuticos MAYPO - 88B MXN',
    'ASF-documented sub-contracting through BIRMEX (government pharma entity) '
    'to avoid competitive bidding. 18,772 contracts at 82% direct award.')

pdf.finding(5, 'COVID-19 Emergency Fraud',
    '3.9B MXN in single-day direct awards at IMSS (March 2020). Multiple '
    'vendors confirmed corrupt by SFP sanctions.')

pdf.finding(6, 'Military/Defense Intermediaries',
    'Small companies selling billion-peso military equipment to SEDENA. '
    'Classic intermediary pattern with extreme value-to-size mismatch.')

# ── PAGE 5: Technology ──
pdf.add_page()
pdf.section_title('v5.2 Analytical Engine')
pdf.ln(2)
pdf.stat_row('SHAP explanations', '456,266 vendors with per-feature attribution')
pdf.stat_row('PyOD anomaly detection', '9.3M ensemble scores (IForest + COPOD)')
pdf.stat_row('Cross-model validation', '130K dual-confirmed high-risk contracts')
pdf.stat_row('Drift monitoring', 'KS tests on 16 features vs training baseline')
pdf.ln(5)

pdf.section_title('Top Risk Predictors (v5.1)')
pdf.ln(2)
pdf.stat_row('1. Price volatility', '+1.22 (wildly varying contract sizes)')
pdf.stat_row('2. Institution diversity', '-0.85 (fewer institutions = higher risk)')
pdf.stat_row('3. Win rate', '+0.73 (abnormally high win rate)')
pdf.stat_row('4. Vendor concentration', '+0.43 (market dominance)')
pdf.stat_row('5. Sector spread', '-0.37 (narrow sector = higher risk)')
pdf.ln(5)

pdf.section_title('What Makes RUBLI Unique')
pdf.ln(2)
pdf.bullet('Open-source procurement intelligence platform')
pdf.bullet('PU-learning (Positive-Unlabeled) - only needs documented corruption cases')
pdf.bullet('Per-sector models - corruption differs across Salud, Energia, Infraestructura')
pdf.bullet('Confidence intervals - every score comes with uncertainty bounds')
pdf.bullet('Bilingual (ES/EN) with full i18n support')
pdf.bullet('ARIA automated investigation pipeline with Claude-powered memo generation')
pdf.bullet('CENTINELA multi-registry external data integration (SAT, SFP, RUPC, ASF)')
pdf.ln(8)

pdf.set_draw_color(220, 38, 38)
pdf.set_line_width(0.5)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(5)
pdf.set_font('Helvetica', 'I', 10)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 8, 'Risk scores are statistical risk indicators measuring similarity to documented corruption patterns.', align='C', new_x='LMARGIN', new_y='NEXT')
pdf.cell(0, 8, 'A high score does not constitute proof of wrongdoing.', align='C', new_x='LMARGIN', new_y='NEXT')

# Save
output_path = r'D:\Python\yangwenli\RUBLI_Presentation_Mar2026.pdf'
pdf.output(output_path)
print(f'PDF saved to: {output_path}')
