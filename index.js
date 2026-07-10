const express = require('express');
const cors = require('cors');
const folderRoutes = require('./routes/folderRoutes');
const errorHandler = require('./middleware/errorHandler');
const fileRoutes = require('./routes/fileRoutes'); 
const trashRoutes = require('./routes/trashRoutes'); 
const storageRoutes = require('./routes/storageRoutes');
const searchRoutes = require('./routes/searchRoutes');
const viewRoutes = require('./routes/viewRoutes'); 
const lockRoutes = require('./routes/lockRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { startCronJobs } = require('./utils/cronJobs');

const app = express();
const PORT = 5000;

// Middleware Bawaan
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Batasi ukuran JSON request

// Pendaftaran Routes Utama
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/view', viewRoutes);
app.use('/api/locks', lockRoutes);
app.use('/api/health', healthRoutes); 

// Error Handler
app.use(errorHandler);
startCronJobs();

app.listen(PORT, () => {
    console.log(`Server Backend API berjalan di port ${PORT}`);
    console.log(`🧠 Memory limit: 384MB (configured in package.json)`);
});

// ============================================
// MEMORY MONITOR (Khusus untuk Raspberry Pi 3)
// ============================================
// Monitor penggunaan memori setiap 60 detik
setInterval(() => {
    const memUsage = process.memoryUsage();
    const rss = (memUsage.rss / 1024 / 1024).toFixed(2);
    const heapUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
    const external = (memUsage.external / 1024 / 1024).toFixed(2);
    
    // Log hanya jika penggunaan heap melebihi 70% dari batas (268MB dari 384MB)
    if (parseFloat(heapUsed) > 268) {
        console.warn(`⚠️ [Memory Warning] Heap tinggi: ${heapUsed}MB / ${heapTotal}MB | RSS: ${rss}MB`);
    } else {
        console.log(`🧠 [Memory Monitor] Heap: ${heapUsed}MB / ${heapTotal}MB | RSS: ${rss}MB | External: ${external}MB`);
    }
}, 60000); // Cek setiap 60 detik

// Graceful shutdown handler
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});