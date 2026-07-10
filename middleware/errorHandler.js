const errorHandler = (err, req, res, next) => {
    // Log error di terminal (berguna saat Anda mengecek pm2 logs)
    console.error(`[Error] ${err.message}`);
    console.error(err.stack);

    // Jika status code masih 200 (OK) padahal masuk ke error handler, ubah ke 500 (Server Error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Terjadi kesalahan internal pada server',
        // Tampilkan stack trace hanya saat tahap development agar mudah di-debug
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};

module.exports = errorHandler;