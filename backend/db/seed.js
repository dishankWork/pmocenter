const bcrypt = require('bcryptjs');
const { query, run } = require('./database');

async function seedDatabase() {
  const existingUsers = query('SELECT id FROM users LIMIT 1');
  if (existingUsers.length > 0) return false;

  console.log('  Seeding database with initial data...');

  // Seed users
  const users = [
    { username: 'pmuser', password: 'admin@123', full_name: 'PM User', role: 'program-director' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    run('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [u.username, hash, u.full_name, u.role]);
  }

  // Seed projects
  const projects = [
    {
      name: 'Apollo CRM Migration', code: 'PRJ-2026-001', owner: 'Ritesh Verma',
      owner_initials: 'RV', status: 'At Risk', start_date: '2026-01-15',
      end_date: '2026-06-30', budget: '$45,00,000', progress: 52, avatar_color: '#e74c3c',
      risks: [
        { level: 'HIGH', text: 'Data migration scripts failing on legacy CRM tables with special characters', owner: 'Ritesh Verma' },
        { level: 'MEDIUM', text: 'Third-party API vendor response time exceeding SLA thresholds', owner: 'Arun Shah' },
        { level: 'LOW', text: 'Training schedule for end users needs to be finalized', owner: 'Priya Nair' },
      ],
      actions: [
        { done: 1, text: 'Complete UAT sign-off for Phase 1 modules', meta: 'Ritesh Verma · Apr 10' },
        { done: 0, text: 'Resolve data encoding issues in legacy CRM export', meta: 'Dev Team · Apr 20' },
        { done: 0, text: 'Schedule stakeholder review for Phase 2 scope', meta: 'Sarah Agarwal · Apr 25' },
      ],
      highlights: [
        'Phase 1 customer module successfully migrated with 99.2% data integrity',
        'New API gateway reduces integration latency by 40% vs legacy system',
        'Executive dashboard live for pilot group of 12 users',
      ],
      nextsteps: [
        { text: 'Fix critical data encoding bugs in migration scripts', due: '2026-04-20' },
        { text: 'Complete Phase 2 UAT with client team', due: '2026-05-15' },
        { text: 'Go-live readiness assessment and sign-off', due: '2026-06-20' },
      ],
      pain: [
        'Legacy CRM has undocumented fields causing mapping failures',
        'Client IT team availability for UAT is limited to 2 days/week',
        'Scope creep from sales team requesting additional custom reports',
      ],
      billing: [
        { name: 'Project Kickoff & Mobilization', date: '2026-01-31', amount: '$9,00,000', status: 'paid' },
        { name: 'Phase 1 Delivery Milestone', date: '2026-03-15', amount: '$13,50,000', status: 'paid' },
        { name: 'Phase 2 UAT Sign-off', date: '2026-05-31', amount: '$13,50,000', status: 'pending' },
        { name: 'Final Delivery & Go-live', date: '2026-06-30', amount: '$9,00,000', status: 'upcoming' },
      ],
      issues: { open_count: 8, progress_count: 3, resolved_count: 14, blocker_count: 2 },
    },
    {
      name: 'Nexus ERP Implementation', code: 'PRJ-2026-002', owner: 'Arun Shah',
      owner_initials: 'AS', status: 'On Track', start_date: '2026-02-01',
      end_date: '2026-08-31', budget: '$78,00,000', progress: 68, avatar_color: '#27ae60',
      risks: [
        { level: 'MEDIUM', text: 'Custom payroll module configuration requires additional 3 weeks', owner: 'Arun Shah' },
        { level: 'LOW', text: 'User adoption risk — finance team unfamiliar with new workflows', owner: 'Priya Nair' },
      ],
      actions: [
        { done: 1, text: 'Complete financial module configuration and testing', meta: 'Arun Shah · Apr 5' },
        { done: 1, text: 'Migrate historical transaction data (FY2023-25)', meta: 'Data Team · Apr 12' },
        { done: 0, text: 'Conduct end-user training for finance department (50 users)', meta: 'Training Team · May 10' },
      ],
      highlights: [
        'Finance module fully configured and parallel run completed successfully',
        'Inventory and procurement modules live across 3 warehouses',
        'Integration with existing banking portals tested and validated',
      ],
      nextsteps: [
        { text: 'Complete payroll module custom configuration', due: '2026-05-01' },
        { text: 'End-user training for finance department', due: '2026-05-10' },
        { text: 'Parallel run completion and sign-off', due: '2026-06-30' },
      ],
      pain: [
        'ERP vendor support tickets taking 5+ days for critical issues',
        'HR data quality issues delaying payroll module readiness',
      ],
      billing: [
        { name: 'Contract Signing & Advance', date: '2026-01-20', amount: '$19,50,000', status: 'paid' },
        { name: 'Phase 1 Milestone — Core Modules', date: '2026-03-31', amount: '$23,40,000', status: 'paid' },
        { name: 'Phase 2 Milestone — Full Rollout', date: '2026-06-30', amount: '$23,40,000', status: 'pending' },
        { name: 'Project Closure & Warranty Start', date: '2026-08-31', amount: '$11,70,000', status: 'upcoming' },
      ],
      issues: { open_count: 4, progress_count: 6, resolved_count: 28, blocker_count: 0 },
    },
    {
      name: 'Titan HRMS Rollout', code: 'PRJ-2026-003', owner: 'Priya Nair',
      owner_initials: 'PN', status: 'Completed', start_date: '2025-09-01',
      end_date: '2026-03-31', budget: '$32,00,000', progress: 100, avatar_color: '#6d4fcc',
      risks: [
        { level: 'LOW', text: 'Post-go-live hypercare period ending — handover to internal IT', owner: 'Priya Nair' },
      ],
      actions: [
        { done: 1, text: 'Complete all UAT sign-offs across 8 departments', meta: 'Priya Nair · Mar 20' },
        { done: 1, text: 'Deliver admin and end-user training (200+ users)', meta: 'Training Team · Mar 25' },
        { done: 1, text: 'Go-live and hypercare monitoring for 2 weeks', meta: 'Support Team · Mar 31' },
      ],
      highlights: [
        'Successfully deployed HRMS across all 6 office locations',
        '200+ employees onboarded with 94% satisfaction score in post-training survey',
        'Leave, attendance, and payroll modules fully operational',
        'Project delivered on time and within budget',
      ],
      nextsteps: [
        { text: 'Knowledge transfer to internal IT team', due: '2026-04-30' },
        { text: 'Closure report and lessons learned documentation', due: '2026-04-15' },
      ],
      pain: [
        'Initial resistance from legacy system users required additional change management effort',
      ],
      billing: [
        { name: 'Project Initiation', date: '2025-09-15', amount: '$8,00,000', status: 'paid' },
        { name: 'Phase 1 — Core HR Modules', date: '2025-12-15', amount: '$9,60,000', status: 'paid' },
        { name: 'Phase 2 — Payroll & Attendance', date: '2026-02-28', amount: '$9,60,000', status: 'paid' },
        { name: 'Go-live & Project Closure', date: '2026-03-31', amount: '$4,80,000', status: 'paid' },
      ],
      issues: { open_count: 0, progress_count: 0, resolved_count: 42, blocker_count: 0 },
    },
    {
      name: 'Quantum Analytics Platform', code: 'PRJ-2026-004', owner: 'Deepak Rao',
      owner_initials: 'DR', status: 'At Risk', start_date: '2026-01-10',
      end_date: '2026-07-31', budget: '$56,00,000', progress: 34, avatar_color: '#e67e22',
      risks: [
        { level: 'HIGH', text: 'Data warehouse migration behind schedule by 3 weeks due to source system issues', owner: 'Deepak Rao' },
        { level: 'HIGH', text: 'Key data engineer resigned — replacement onboarding in progress', owner: 'Sarah Agarwal' },
        { level: 'MEDIUM', text: 'BI tool licensing costs 20% over initial estimate', owner: 'Deepak Rao' },
      ],
      actions: [
        { done: 1, text: 'Finalize data model design and get client sign-off', meta: 'Deepak Rao · Apr 1' },
        { done: 0, text: 'Onboard replacement data engineer and complete knowledge transfer', meta: 'HR · Apr 22' },
        { done: 0, text: 'Resolve source system data quality issues with client DBA team', meta: 'Deepak Rao · Apr 30' },
      ],
      highlights: [
        'Data model design approved by client architecture team',
        'Real-time dashboard prototype demonstrated to CXO — positive feedback received',
      ],
      nextsteps: [
        { text: 'Complete data warehouse schema implementation', due: '2026-05-15' },
        { text: 'Ingest historical data (3 years) and validate completeness', due: '2026-06-01' },
        { text: 'Deliver 5 executive dashboards for pilot users', due: '2026-06-30' },
      ],
      pain: [
        'Source systems have inconsistent data formats requiring extensive ETL effort',
        'Client DBA team bandwidth is severely constrained',
        'Frequent scope additions from business stakeholders not going through change control',
      ],
      billing: [
        { name: 'Discovery & Architecture Phase', date: '2026-01-31', amount: '$11,20,000', status: 'paid' },
        { name: 'Data Warehouse Build Milestone', date: '2026-04-30', amount: '$16,80,000', status: 'pending' },
        { name: 'Dashboard Delivery Milestone', date: '2026-06-30', amount: '$16,80,000', status: 'upcoming' },
        { name: 'Project Closure', date: '2026-07-31', amount: '$11,20,000', status: 'upcoming' },
      ],
      issues: { open_count: 12, progress_count: 4, resolved_count: 9, blocker_count: 3 },
    },
    {
      name: 'CloudSync Infrastructure', code: 'PRJ-2026-005', owner: 'Sanjay Mehta',
      owner_initials: 'SM', status: 'Delayed', start_date: '2025-11-01',
      end_date: '2026-05-31', budget: '$62,00,000', progress: 28, avatar_color: '#0891b2',
      risks: [
        { level: 'HIGH', text: 'Cloud provider provisioning delays for dedicated instances — 4 week backlog', owner: 'Sanjay Mehta' },
        { level: 'MEDIUM', text: 'Security audit findings require architecture changes to networking layer', owner: 'Sanjay Mehta' },
        { level: 'MEDIUM', text: 'Client internal procurement process delaying hardware approvals', owner: 'Ritesh Verma' },
      ],
      actions: [
        { done: 1, text: 'Complete cloud architecture design and security review', meta: 'Sanjay Mehta · Mar 15' },
        { done: 0, text: 'Resolve security audit findings — implement network segmentation changes', meta: 'Infra Team · Apr 28' },
        { done: 0, text: 'Escalate provisioning delays to cloud provider account manager', meta: 'Sanjay Mehta · Apr 18' },
      ],
      highlights: [
        'Cloud architecture design approved by client security team after revisions',
        'Dev and staging environments successfully provisioned and handed over',
      ],
      nextsteps: [
        { text: 'Production environment provisioning', due: '2026-05-01' },
        { text: 'Data migration from on-premise to cloud', due: '2026-05-20' },
        { text: 'Cutover and go-live', due: '2026-05-31' },
      ],
      pain: [
        'Cloud provider SLAs not being met for dedicated resource provisioning',
        'Client security team review cycles taking 2-3 weeks per iteration',
        'Original timeline was optimistic given dependency on third-party vendors',
      ],
      billing: [
        { name: 'Project Initiation & Architecture', date: '2025-11-30', amount: '$12,40,000', status: 'paid' },
        { name: 'Infrastructure Setup Milestone', date: '2026-02-28', amount: '$18,60,000', status: 'paid' },
        { name: 'Migration Completion Milestone', date: '2026-05-15', amount: '$18,60,000', status: 'pending' },
        { name: 'Go-live & Stabilization', date: '2026-05-31', amount: '$12,40,000', status: 'upcoming' },
      ],
      issues: { open_count: 7, progress_count: 5, resolved_count: 11, blocker_count: 4 },
    },
  ];

  for (const p of projects) {
    const pid = run(
      `INSERT INTO projects (name, code, owner, owner_initials, status, start_date, end_date, budget, progress, avatar_color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.name, p.code, p.owner, p.owner_initials, p.status, p.start_date, p.end_date, p.budget, p.progress, p.avatar_color]
    );

    for (let i = 0; i < p.risks.length; i++) {
      const r = p.risks[i];
      run('INSERT INTO project_risks (project_id, level, text, owner, sort_order) VALUES (?, ?, ?, ?, ?)',
        [pid, r.level, r.text, r.owner, i]);
    }
    for (let i = 0; i < p.actions.length; i++) {
      const a = p.actions[i];
      run('INSERT INTO project_actions (project_id, done, text, meta, sort_order) VALUES (?, ?, ?, ?, ?)',
        [pid, a.done, a.text, a.meta, i]);
    }
    for (let i = 0; i < p.highlights.length; i++) {
      run('INSERT INTO project_highlights (project_id, text, sort_order) VALUES (?, ?, ?)',
        [pid, p.highlights[i], i]);
    }
    for (let i = 0; i < p.nextsteps.length; i++) {
      const ns = p.nextsteps[i];
      run('INSERT INTO project_nextsteps (project_id, text, due, sort_order) VALUES (?, ?, ?, ?)',
        [pid, ns.text, ns.due, i]);
    }
    for (let i = 0; i < p.pain.length; i++) {
      run('INSERT INTO project_pain (project_id, text, sort_order) VALUES (?, ?, ?)',
        [pid, p.pain[i], i]);
    }
    for (let i = 0; i < p.billing.length; i++) {
      const b = p.billing[i];
      run('INSERT INTO project_billing (project_id, name, date, amount, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [pid, b.name, b.date, b.amount, b.status, i]);
    }
    run('INSERT INTO project_issues (project_id, open_count, progress_count, resolved_count, blocker_count) VALUES (?, ?, ?, ?, ?)',
      [pid, p.issues.open_count, p.issues.progress_count, p.issues.resolved_count, p.issues.blocker_count]);
  }

  return true;
}

module.exports = { seedDatabase };
