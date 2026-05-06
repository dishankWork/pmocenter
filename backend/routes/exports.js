const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

function getProjectData(id) {
  const projects = query('SELECT * FROM projects WHERE id = ?', [id]);
  if (!projects.length) return null;
  const p = projects[0];
  p.risks = query('SELECT * FROM project_risks WHERE project_id = ? ORDER BY sort_order', [id]);
  p.actions = query('SELECT * FROM project_actions WHERE project_id = ? ORDER BY sort_order', [id]);
  p.highlights = query('SELECT * FROM project_highlights WHERE project_id = ? ORDER BY sort_order', [id]);
  p.nextsteps = query('SELECT * FROM project_nextsteps WHERE project_id = ? ORDER BY sort_order', [id]);
  p.pain = query('SELECT * FROM project_pain WHERE project_id = ? ORDER BY sort_order', [id]);
  p.billing = query('SELECT * FROM project_billing WHERE project_id = ? ORDER BY sort_order', [id]);
  const issues = query('SELECT * FROM project_issues WHERE project_id = ?', [id]);
  p.issues = issues[0] || { open_count: 0, progress_count: 0, resolved_count: 0, blocker_count: 0 };
  return p;
}

// PDF Export
router.get('/pdf/:id', async (req, res) => {
  const p = getProjectData(parseInt(req.params.id));
  if (!p) return res.status(404).json({ error: 'Project not found' });

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${p.code}-report.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  const blue = '#2926E2';
  const darkBg = '#0d0f1f';

  function checkPage(neededHeight = 60) {
    if (doc.y > doc.page.height - neededHeight - 60) {
      doc.addPage();
    }
  }

  // Header bar
  doc.rect(0, 0, pageWidth, 90).fill(darkBg);
  doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
    .text('AIRLINQ', margin, 20);
  doc.fontSize(10).fillColor('#9297b8').font('Helvetica')
    .text('PM Command Center', margin, 46);
  doc.fontSize(18).fillColor('#ffffff').font('Helvetica-Bold')
    .text(p.name, margin + 120, 25, { width: contentWidth - 80 });
  doc.fontSize(9).fillColor('#9297b8').font('Helvetica')
    .text(p.code, margin + 120, 50);

  doc.y = 110;

  // Meta grid
  const metaItems = [
    ['Start Date', p.start_date || 'TBD'],
    ['Target Go-Live', p.end_date || 'TBD'],
    ['Budget', p.budget || 'TBD'],
    ['Progress', `${p.progress}%`],
  ];
  const colW = contentWidth / 4;
  metaItems.forEach((item, i) => {
    const x = margin + i * colW;
    doc.rect(x, doc.y, colW - 4, 50).fillAndStroke('#f5f6fb', '#e0e3f0');
    doc.fontSize(8).fillColor('#4a4f72').font('Helvetica').text(item[0], x + 8, doc.y + 8);
    doc.fontSize(12).fillColor('#0f1124').font('Helvetica-Bold').text(item[1], x + 8, doc.y + 22, { width: colW - 16 });
  });
  doc.y += 60;

  // Progress bar
  doc.rect(margin, doc.y, contentWidth, 12).fillAndStroke('#e0e3f0', '#e0e3f0');
  doc.rect(margin, doc.y, (contentWidth * p.progress) / 100, 12).fill(blue);
  doc.y += 24;

  // Section renderer
  function renderSection(title, items, renderer) {
    checkPage(80);
    doc.fontSize(13).fillColor('#0f1124').font('Helvetica-Bold').text(title, margin, doc.y + 10);
    doc.moveTo(margin, doc.y + 4).lineTo(margin + contentWidth, doc.y + 4).stroke('#e0e3f0');
    doc.y += 8;
    if (!items || items.length === 0) {
      doc.fontSize(9).fillColor('#9297b8').font('Helvetica').text('No items', margin, doc.y);
      doc.y += 16;
      return;
    }
    items.forEach(item => {
      checkPage(30);
      renderer(item);
    });
    doc.y += 8;
  }

  // Risks
  renderSection('Risks', p.risks, (r) => {
    const levelColors = { HIGH: '#d63a3a', MEDIUM: '#c47d0a', LOW: '#0f9d6e' };
    const color = levelColors[r.level] || blue;
    doc.rect(margin, doc.y, 48, 14).fill(color);
    doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold').text(r.level, margin + 4, doc.y + 3, { width: 40 });
    doc.fontSize(9).fillColor('#0f1124').font('Helvetica').text(r.text, margin + 56, doc.y - 11, { width: contentWidth - 80 });
    if (r.owner) doc.fontSize(8).fillColor('#4a4f72').text(`Owner: ${r.owner}`, margin + 56, doc.y);
    doc.y += 6;
  });

  // Highlights
  renderSection('Highlights', p.highlights, (h) => {
    doc.fontSize(9).fillColor('#0f9d6e').font('Helvetica').text('●', margin, doc.y);
    doc.fillColor('#0f1124').text(h.text, margin + 14, doc.y - 10, { width: contentWidth - 20 });
    doc.y += 4;
  });

  // Actions
  renderSection('Actions from Management', p.actions, (a) => {
    const mark = a.done ? '✓' : '○';
    const color = a.done ? '#0f9d6e' : '#4a4f72';
    doc.fontSize(9).fillColor(color).font('Helvetica').text(mark, margin, doc.y);
    doc.fillColor(a.done ? '#9297b8' : '#0f1124').text(a.text, margin + 16, doc.y - 10, { width: contentWidth - 80 });
    if (a.meta) doc.fontSize(8).fillColor('#9297b8').text(a.meta, margin + 16, doc.y);
    doc.y += 4;
  });

  // Next Steps
  renderSection('Next Steps', p.nextsteps, (ns, idx) => {
    doc.circle(margin + 8, doc.y + 5, 8).fill(blue);
    doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold').text(String((p.nextsteps.indexOf(ns) + 1)), margin + 5, doc.y + 2);
    doc.fontSize(9).fillColor('#0f1124').font('Helvetica').text(ns.text, margin + 22, doc.y - 6, { width: contentWidth - 120 });
    if (ns.due) doc.fontSize(8).fillColor('#4a4f72').text(`Due: ${ns.due}`, margin + 22, doc.y);
    doc.y += 4;
  });

  // Pain Points
  renderSection('Pain Points', p.pain, (pt) => {
    doc.fontSize(9).fillColor('#d63a3a').font('Helvetica').text('⚡', margin, doc.y);
    doc.fillColor('#0f1124').text(pt.text, margin + 16, doc.y - 10, { width: contentWidth - 20 });
    doc.y += 4;
  });

  // Issues
  checkPage(80);
  doc.fontSize(13).fillColor('#0f1124').font('Helvetica-Bold').text('Issue Summary', margin, doc.y + 10);
  doc.moveTo(margin, doc.y + 4).lineTo(margin + contentWidth, doc.y + 4).stroke('#e0e3f0');
  doc.y += 12;
  const iss = p.issues;
  const issItems = [
    ['Open', iss.open_count, '#d63a3a'],
    ['In Progress', iss.progress_count, '#c47d0a'],
    ['Resolved', iss.resolved_count, '#0f9d6e'],
    ['Blockers', iss.blocker_count, '#6d4fcc'],
  ];
  const issColW = contentWidth / 4;
  const issY = doc.y;
  issItems.forEach((item, i) => {
    const x = margin + i * issColW;
    doc.rect(x, issY, issColW - 4, 50).fillAndStroke('#f5f6fb', item[2]);
    doc.fontSize(24).fillColor(item[2]).font('Helvetica-Bold').text(String(item[1]), x + 8, issY + 6, { width: issColW - 16 });
    doc.fontSize(8).fillColor('#4a4f72').font('Helvetica').text(item[0], x + 8, issY + 34);
  });
  doc.y = issY + 60;

  // Billing
  checkPage(100);
  doc.fontSize(13).fillColor('#0f1124').font('Helvetica-Bold').text('Billing Milestones', margin, doc.y + 10);
  doc.moveTo(margin, doc.y + 4).lineTo(margin + contentWidth, doc.y + 4).stroke('#e0e3f0');
  doc.y += 12;
  // Table header
  const bColWidths = [contentWidth * 0.38, contentWidth * 0.2, contentWidth * 0.22, contentWidth * 0.2];
  const bHeaders = ['Milestone', 'Date', 'Amount', 'Status'];
  let bX = margin;
  const bHeaderY = doc.y;
  doc.rect(margin, bHeaderY, contentWidth, 18).fill(blue);
  bHeaders.forEach((h, i) => {
    doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold').text(h, bX + 4, bHeaderY + 4, { width: bColWidths[i] - 4 });
    bX += bColWidths[i];
  });
  doc.y = bHeaderY + 20;
  p.billing.forEach((b, ri) => {
    checkPage(22);
    doc.rect(margin, doc.y, contentWidth, 18).fill(ri % 2 === 0 ? '#ffffff' : '#f5f6fb');
    const vals = [b.name, b.date || '', b.amount || '', b.status];
    let bxd = margin;
    vals.forEach((v, i) => {
      const color = i === 3
        ? (b.status === 'paid' ? '#0f9d6e' : b.status === 'pending' ? '#c47d0a' : '#9297b8')
        : '#0f1124';
      doc.fontSize(9).fillColor(color).font(i === 3 ? 'Helvetica-Bold' : 'Helvetica')
        .text(v, bxd + 4, doc.y + 4, { width: bColWidths[i] - 8 });
      bxd += bColWidths[i];
    });
    doc.y += 20;
  });

  // Footer
  const totalPages = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
  const footerY = doc.page.height - 40;
  doc.rect(0, footerY, pageWidth, 40).fill(darkBg);
  doc.fontSize(8).fillColor('#9297b8').font('Helvetica')
    .text(
      `Airlinq PM Command Center · Exported ${new Date().toLocaleDateString()} · ${req.user.username}`,
      margin, footerY + 14
    );

  doc.end();
});

// Excel Export per project
router.get('/excel/:id', async (req, res) => {
  const p = getProjectData(parseInt(req.params.id));
  if (!p) return res.status(404).json({ error: 'Project not found' });

  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const blue = '2926E2';
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + blue } },
    alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
  };
  const altRow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFF' } };

  function addHeaderRow(sheet, columns) {
    const row = sheet.addRow(columns.map(c => c.header));
    row.height = 22;
    row.eachCell(cell => Object.assign(cell, headerStyle));
    sheet.columns = columns;
  }

  // Sheet 1: Overview
  const overview = workbook.addWorksheet('Overview');
  overview.addRow(['Project Overview']).getCell(1).font = { bold: true, size: 14 };
  overview.addRow([]);
  [
    ['Project Name', p.name],
    ['Project Code', p.code],
    ['Owner', p.owner],
    ['Status', p.status],
    ['Start Date', p.start_date || ''],
    ['Target Go-Live', p.end_date || ''],
    ['Budget', p.budget || ''],
    ['Progress', `${p.progress}%`],
    [],
    ['Issue Summary'],
    ['Open Issues', p.issues.open_count],
    ['In Progress', p.issues.progress_count],
    ['Resolved', p.issues.resolved_count],
    ['Blockers', p.issues.blocker_count],
  ].forEach(r => overview.addRow(r));
  overview.getColumn(1).width = 22;
  overview.getColumn(2).width = 35;

  // Sheet 2: Risks
  const risksSheet = workbook.addWorksheet('Risks');
  addHeaderRow(risksSheet, [
    { header: 'Level', key: 'level', width: 12 },
    { header: 'Description', key: 'text', width: 55 },
    { header: 'Owner', key: 'owner', width: 22 },
  ]);
  p.risks.forEach((r, i) => {
    const row = risksSheet.addRow([r.level, r.text, r.owner]);
    row.height = 18;
    if (i % 2 === 1) row.getCell(1).fill = altRow;
    const color = r.level === 'HIGH' ? 'FFd63a3a' : r.level === 'MEDIUM' ? 'FFc47d0a' : 'FF0f9d6e';
    row.getCell(1).font = { bold: true, color: { argb: color } };
    if (i % 2 === 1) { row.getCell(2).fill = altRow; row.getCell(3).fill = altRow; }
  });

  // Sheet 3: Actions
  const actionsSheet = workbook.addWorksheet('Actions');
  addHeaderRow(actionsSheet, [
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Action', key: 'text', width: 55 },
    { header: 'Owner / Due', key: 'meta', width: 25 },
  ]);
  p.actions.forEach((a, i) => {
    const row = actionsSheet.addRow([a.done ? 'Done' : 'Pending', a.text, a.meta || '']);
    row.height = 18;
    const color = a.done ? 'FF0f9d6e' : 'FFc47d0a';
    row.getCell(1).font = { bold: true, color: { argb: color } };
    if (i % 2 === 1) { row.getCell(1).fill = altRow; row.getCell(2).fill = altRow; row.getCell(3).fill = altRow; }
  });

  // Sheet 4: Highlights & Steps
  const hlSheet = workbook.addWorksheet('Highlights & Steps');
  hlSheet.addRow(['Highlights']).getCell(1).font = { bold: true, size: 12, color: { argb: 'FF2926E2' } };
  p.highlights.forEach(h => hlSheet.addRow(['', h.text]));
  hlSheet.addRow([]);
  hlSheet.addRow(['Next Steps']).getCell(1).font = { bold: true, size: 12, color: { argb: 'FF2926E2' } };
  p.nextsteps.forEach(ns => hlSheet.addRow(['', ns.text, ns.due || '']));
  hlSheet.getColumn(1).width = 18;
  hlSheet.getColumn(2).width = 55;
  hlSheet.getColumn(3).width = 18;

  // Sheet 5: Billing
  const billingSheet = workbook.addWorksheet('Billing Milestones');
  addHeaderRow(billingSheet, [
    { header: 'Milestone', key: 'name', width: 40 },
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Amount', key: 'amount', width: 20 },
    { header: 'Status', key: 'status', width: 14 },
  ]);
  p.billing.forEach((b, i) => {
    const row = billingSheet.addRow([b.name, b.date || '', b.amount || '', b.status]);
    row.height = 18;
    const color = b.status === 'paid' ? 'FF0f9d6e' : b.status === 'pending' ? 'FFc47d0a' : 'FF9297b8';
    row.getCell(4).font = { bold: true, color: { argb: color } };
    if (i % 2 === 1) {
      ['name','date','amount','status'].forEach((_, ci) => {
        row.getCell(ci + 1).fill = altRow;
      });
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${p.code}-report.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

// Portfolio Excel
router.get('/excel-portfolio', async (req, res) => {
  const projects = query('SELECT * FROM projects ORDER BY created_at DESC');

  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Portfolio');
  const blue = '2926E2';

  sheet.columns = [
    { header: 'Project Name', key: 'name', width: 32 },
    { header: 'Code', key: 'code', width: 16 },
    { header: 'Owner', key: 'owner', width: 20 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Progress', key: 'progress', width: 12 },
    { header: 'Budget', key: 'budget', width: 18 },
    { header: 'Start Date', key: 'start_date', width: 14 },
    { header: 'Go-Live', key: 'end_date', width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + blue } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  const statusColors = {
    'On Track': 'FF0f9d6e',
    'At Risk': 'FFd63a3a',
    'Delayed': 'FFc47d0a',
    'Completed': 'FF6d4fcc',
  };

  projects.forEach((p, i) => {
    const row = sheet.addRow([
      p.name, p.code, p.owner, p.status,
      `${p.progress}%`, p.budget || '', p.start_date || '', p.end_date || '',
    ]);
    row.height = 18;
    const color = statusColors[p.status] || 'FF4a4f72';
    row.getCell(4).font = { bold: true, color: { argb: color } };
    if (i % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFF' } };
      });
      row.getCell(4).font = { bold: true, color: { argb: color } };
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="portfolio-report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;
