const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pm-command-center-secret-2026';

function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function getSectionPermissions(role) {
  if (role === 'client') {
    return {
      risks: false,
      actions: false,
      highlights: true,
      nextsteps: true,
      pain: false,
      billing: false,
      issues: true,
    };
  }
  // cxo, program-director, pm all get toggle on billing, true on everything else
  return {
    risks: true,
    actions: true,
    highlights: true,
    nextsteps: true,
    pain: true,
    billing: 'toggle',
    issues: true,
  };
}

module.exports = { authMiddleware, requireRole, getSectionPermissions, JWT_SECRET };
