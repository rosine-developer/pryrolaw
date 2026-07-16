import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import app from './app';

const PORT = Number(process.env.PORT) || 4000;

// Ensure uploads directory exists on startup
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('[server] Created uploads directory');
}

app.listen(PORT, () => {
  console.log(`[server] Legal Workspace API running on http://localhost:${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});
