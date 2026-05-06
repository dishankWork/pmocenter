const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/dashboard
router.get('/', (req, res) => {
  // Recent activity — last 20 entries, newest first
  const activity = query(
    `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20`
  );

  // Upcoming milestones — pending/upcoming billing, ordered by date asc, next 10
  const milestones = query(
    `SELECT pb.*, p.name as project_name, p.code as project_code
     FROM project_billing pb
     JOIN projects p ON p.id = pb.project_id
     WHERE pb.status IN ('pending', 'upcoming')
     ORDER BY pb.date ASC
     LIMIT 10`
  );

  res.json({ activity, milestones });
});

module.exports = router;
