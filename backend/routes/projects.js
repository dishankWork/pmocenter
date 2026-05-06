const express = require('express');
const router = express.Router();
const { query, run } = require('../db/database');
const { authMiddleware, getSectionPermissions } = require('../middleware/auth');

router.use(authMiddleware);

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getProjectFull(id, role) {
  const projects = query('SELECT * FROM projects WHERE id = ?', [id]);
  if (!projects.length) return null;
  const p = projects[0];

  const permissions = getSectionPermissions(role);

  const result = {
    ...p,
    risks: permissions.risks !== false ? query('SELECT * FROM project_risks WHERE project_id = ? ORDER BY sort_order', [id]) : [],
    actions: permissions.actions !== false ? query('SELECT * FROM project_actions WHERE project_id = ? ORDER BY sort_order', [id]) : [],
    highlights: query('SELECT * FROM project_highlights WHERE project_id = ? ORDER BY sort_order', [id]),
    nextsteps: query('SELECT * FROM project_nextsteps WHERE project_id = ? ORDER BY sort_order', [id]),
    pain: permissions.pain !== false ? query('SELECT * FROM project_pain WHERE project_id = ? ORDER BY sort_order', [id]) : [],
    billing: permissions.billing !== false ? query('SELECT * FROM project_billing WHERE project_id = ? ORDER BY sort_order', [id]) : [],
    issues: (() => { const rows = query('SELECT * FROM project_issues WHERE project_id = ?', [id]); return rows[0] || null; })(),
    _permissions: permissions,
  };

  return result;
}

// GET /api/projects
router.get('/', (req, res) => {
  const { search, status } = req.query;
  let sql = 'SELECT * FROM projects WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR code LIKE ? OR owner LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';
  const projects = query(sql, params);
  res.json({ projects });
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const project = getProjectFull(parseInt(req.params.id), req.user.role);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ project });
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, code, owner, status, start_date, end_date, budget, progress,
          risks, actions, highlights, nextsteps, pain, billing, issues } = req.body;

  if (!name || !code || !owner) {
    return res.status(400).json({ error: 'name, code, and owner are required' });
  }

  const owner_initials = getInitials(owner);
  const avatar_color = '#2926E2';

  const pid = run(
    `INSERT INTO projects (name, code, owner, owner_initials, status, start_date, end_date, budget, progress, avatar_color, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [name, code, owner, owner_initials, status || 'On Track', start_date || null, end_date || null, budget || null, progress || 0, avatar_color]
  );

  insertChildren(pid, { risks, actions, highlights, nextsteps, pain, billing, issues });

  run(`INSERT INTO activity_log (project_id, project_name, project_code, action, detail) VALUES (?, ?, ?, ?, ?)`,
    [pid, name, code, 'created', `Project created with status "${status || 'On Track'}" — owner: ${owner}`]);

  const project = getProjectFull(pid, req.user.role);
  res.status(201).json({ project });
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = query('SELECT id FROM projects WHERE id = ?', [id]);
  if (!existing.length) return res.status(404).json({ error: 'Project not found' });

  const { name, code, owner, status, start_date, end_date, budget, progress,
          risks, actions, highlights, nextsteps, pain, billing, issues } = req.body;

  const owner_initials = getInitials(owner);

  // Capture old status for change detection
  const oldProject = query('SELECT status, progress FROM projects WHERE id = ?', [id])[0];

  run(
    `UPDATE projects SET name=?, code=?, owner=?, owner_initials=?, status=?, start_date=?, end_date=?, budget=?, progress=?, updated_at=datetime('now') WHERE id=?`,
    [name, code, owner, owner_initials, status || 'On Track', start_date || null, end_date || null, budget || null, progress || 0, id]
  );

  // Delete and re-insert children
  ['project_risks','project_actions','project_highlights','project_nextsteps','project_pain','project_billing','project_issues'].forEach(t => {
    run(`DELETE FROM ${t} WHERE project_id = ?`, [id]);
  });

  insertChildren(id, { risks, actions, highlights, nextsteps, pain, billing, issues });

  // Build activity detail
  let detail = `Updated by ${req.user.full_name}`;
  if (oldProject && oldProject.status !== (status || 'On Track')) {
    detail = `Status changed from "${oldProject.status}" to "${status}" — ${detail}`;
  } else if (oldProject && oldProject.progress !== (progress || 0)) {
    detail = `Progress updated to ${progress || 0}% — ${detail}`;
  }
  run(`INSERT INTO activity_log (project_id, project_name, project_code, action, detail) VALUES (?, ?, ?, ?, ?)`,
    [id, name, code, 'updated', detail]);

  const project = getProjectFull(id, req.user.role);
  res.json({ project });
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = query('SELECT id FROM projects WHERE id = ?', [id]);
  if (!existing.length) return res.status(404).json({ error: 'Project not found' });

  const deleted = query('SELECT name, code FROM projects WHERE id = ?', [id])[0];
  ['project_risks','project_actions','project_highlights','project_nextsteps','project_pain','project_billing','project_issues'].forEach(t => {
    run(`DELETE FROM ${t} WHERE project_id = ?`, [id]);
  });
  run('DELETE FROM projects WHERE id = ?', [id]);

  run(`INSERT INTO activity_log (project_id, project_name, project_code, action, detail) VALUES (?, ?, ?, ?, ?)`,
    [id, deleted.name, deleted.code, 'deleted', `Project deleted by ${req.user.full_name}`]);

  res.json({ ok: true });
});

function insertChildren(pid, { risks, actions, highlights, nextsteps, pain, billing, issues }) {
  if (Array.isArray(risks)) {
    risks.forEach((r, i) => {
      run('INSERT INTO project_risks (project_id, level, text, owner, sort_order) VALUES (?, ?, ?, ?, ?)',
        [pid, r.level || 'MEDIUM', r.text || '', r.owner || '', i]);
    });
  }
  if (Array.isArray(actions)) {
    actions.forEach((a, i) => {
      run('INSERT INTO project_actions (project_id, done, text, meta, sort_order) VALUES (?, ?, ?, ?, ?)',
        [pid, a.done ? 1 : 0, a.text || '', a.meta || '', i]);
    });
  }
  if (Array.isArray(highlights)) {
    highlights.forEach((h, i) => {
      const text = typeof h === 'string' ? h : h.text || '';
      run('INSERT INTO project_highlights (project_id, text, sort_order) VALUES (?, ?, ?)', [pid, text, i]);
    });
  }
  if (Array.isArray(nextsteps)) {
    nextsteps.forEach((ns, i) => {
      run('INSERT INTO project_nextsteps (project_id, text, due, sort_order) VALUES (?, ?, ?, ?)',
        [pid, ns.text || '', ns.due || null, i]);
    });
  }
  if (Array.isArray(pain)) {
    pain.forEach((p, i) => {
      const text = typeof p === 'string' ? p : p.text || '';
      run('INSERT INTO project_pain (project_id, text, sort_order) VALUES (?, ?, ?)', [pid, text, i]);
    });
  }
  if (Array.isArray(billing)) {
    billing.forEach((b, i) => {
      run('INSERT INTO project_billing (project_id, name, date, amount, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [pid, b.name || '', b.date || null, b.amount || '', b.status || 'pending', i]);
    });
  }
  if (issues && typeof issues === 'object') {
    run('INSERT INTO project_issues (project_id, open_count, progress_count, resolved_count, blocker_count) VALUES (?, ?, ?, ?, ?)',
      [pid, issues.open_count || 0, issues.progress_count || 0, issues.resolved_count || 0, issues.blocker_count || 0]);
  }
}

module.exports = router;
