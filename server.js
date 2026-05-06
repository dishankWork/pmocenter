const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { getDb } = require('./backend/db/database');
const { seedDatabase } = require('./backend/db/seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/projects', require('./backend/routes/projects'));
app.use('/api/export', require('./backend/routes/exports'));
app.use('/api/dashboard', require('./backend/routes/dashboard'));

// Page routing
app.get('/', (req, res) => res.redirect('/app'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'public/app.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/app.html')));

async function main() {
  await getDb();
  console.log('  ✓ Database ready');

  const seeded = await seedDatabase();

  app.listen(PORT, () => {
    console.log(`\n  🚀 PM Command Center running at http://localhost:${PORT}\n`);
    if (seeded) {
      console.log('  Login credentials:');
      console.log('  pmuser / admin@123  → Program Director\n');
    }
  });
}

main().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
