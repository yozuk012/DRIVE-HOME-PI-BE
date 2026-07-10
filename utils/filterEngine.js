const path = require('path');

const getCategoryFolder = (filename) => {
    // Ambil ekstensi file, ubah ke huruf kecil (contoh: '.mp4')
    const ext = path.extname(filename).toLowerCase();

    // Kamus Ekstensi
    const audioExt = ['.mp3', '.wav', '.flac', '.aac', '.ogg'];
    const imageExt = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
    const videoExt = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
    const docExt = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
    const zipExt = ['.zip', '.rar', '.7z', '.tar', '.gz'];

    // Proses Pemilahan
    if (audioExt.includes(ext)) return '/Audio';
    if (imageExt.includes(ext)) return '/Images';
    if (videoExt.includes(ext)) return '/Videos';
    if (docExt.includes(ext)) return '/Documents';
    if (zipExt.includes(ext)) return '/Zips';
    
    // Jika tidak ada di daftar atas
    return '/Random';
};

module.exports = { getCategoryFolder };