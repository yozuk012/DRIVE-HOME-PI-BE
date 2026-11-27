# Drive Home Pi — Backend

Layanan server dan REST API (*backend*) untuk **Drive Home Pi**, sebuah sistem *personal cloud drive* mandiri (*self-hosted*) yang dijalankan pada perangkat **Raspberry Pi** di jaringan lokal rumah. Dibangun menggunakan **Node.js** dan **Express.js** dengan arsitektur modular untuk mengelola operasi sistem berkas (*file system*), penyimpanan lokal, autentikasi akses, serta penyajian data ke antarmuka *frontend*.

---

## Tautan Terkait

- **Repositori Frontend:** [DRIVE-HOME-PI-FE](https://github.com/yozuk012/DRIVE-HOME-PI-FE)

---

## Fitur Utama

- **Local Storage Management:** Pengelolaan langsung direktori dan berkas pada media penyimpanan yang terpasang di Raspberry Pi.
- **File Streaming & Transfer API:** Endpoint REST API untuk menangani proses unggah (*upload*), unduh (*download*), pratinjau media, serta pemindaian struktur folder secara cepat di jaringan lokal.
- **Middleware & Akses Keamanan:** Perlindungan endpoint dan validasi permintaan untuk menjaga keamanan akses penyimpanan pribadi.
- **Self-Hosted Lightweight Server:** Dirancang ringan agar berjalan stabil di atas sumber daya perangkat keras Raspberry Pi.

---

## Struktur Proyek

```text
DRIVE-HOME-PI-BE/
├── config/         # Konfigurasi server, direktori penyimpanan, dan environment
├── controllers/    # Logika bisnis untuk operasi berkas dan direktori
├── middleware/     # Autentikasi, validasi request, dan penanganan upload
├── routes/         # Definisi endpoint REST API
├── utils/          # Fungsi pembantu (helper) pengelolaan file system
└── index.js        # Entry point utama aplikasi server
