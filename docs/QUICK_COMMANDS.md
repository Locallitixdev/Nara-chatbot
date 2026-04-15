# 🎮 Quick Command Reference

> Cheat sheet perintah untuk berkomunikasi dengan AI assistant.  
> Simpan file ini, buka kapan saja butuh.

---

## 🚀 Perintah Utama

| Perintah | Kapan Pakai | Apa yang Terjadi |
|----------|-------------|------------------|
| `/start-session` | **Awal sesi baru** | AI baca semua docs/ → kasih summary posisi terakhir |
| `/end-session` | **Akhir sesi** | AI save semua progress ke docs/ → tidak ada yang hilang |
| `lanjut` | Mau melanjutkan kerja | AI baca ACTIVE_TASK → lanjut dari terakhir |
| `status` | Mau tahu posisi project | AI rangkum PROJECT_STATUS + ACTIVE_TASK |

---

## 🛠️ Perintah Kerja

| Perintah | Contoh | Apa yang Terjadi |
|----------|--------|------------------|
| `mulai phase [X]` | "mulai phase 2" | AI baca plan → buat ACTIVE_TASK → mulai kerja |
| `selesai phase` | "selesai phase" | AI update PROJECT_STATUS → mark complete |
| `cek [modul]` | "cek auth" | AI review kode modul tersebut |
| `test [fitur]` | "test login flow" | AI jalankan test + cek log |

---

## 🐛 Report Bug

| Perintah | Contoh |
|----------|--------|
| `bug: [deskripsi]` | "bug: halaman login error saat submit" |
| `bug: [deskripsi] di [file]` | "bug: login gagal di auth.service.ts" |
| `fix bug [ID]` | "fix bug BUG-001" |
| `list bugs` | AI tampilkan semua open bugs |

> AI akan otomatis: catat di BUG_TRACKER → cari root cause → fix → update tracker

---

## 💡 Tambah Ide / Request

| Perintah | Contoh |
|----------|--------|
| `ide: [deskripsi]` | "ide: tambahkan dark mode" |
| `request: [deskripsi]` | "request: export PDF untuk laporan" |
| `prioritas [tinggi/sedang/rendah]` | "ide: notification push, prioritas rendah" |

> AI akan: catat di BACKLOG → konfirmasi prioritas → TIDAK langsung eksekusi

---

## 📋 Cek Dokumentasi

| Perintah | Apa yang Ditampilkan |
|----------|----------------------|
| `baca active task` | Task yang sedang dikerjakan |
| `baca backlog` | Semua ide/request yang pending |
| `baca bugs` | Bug tracker |
| `baca changelog` | History perubahan |
| `baca decisions` | Keputusan arsitektur |

---

## 🔄 Skenario Umum

### Mulai Hari Baru
```
/start-session
```
→ AI kasih ringkasan → Anda bilang "lanjut" atau kasih instruksi baru

### Ada Bug di Tengah Kerja
```
bug: tombol submit tidak muncul setelah login
```
→ AI catat bug → tanya: "fix sekarang atau nanti?" → fix

### Ada Ide Baru di Tengah Kerja
```
ide: tambahkan export Excel
```
→ AI catat di backlog → lanjut kerja phase aktif (tidak terdistraksi)

### Selesai Kerja Hari Ini
```
/end-session
```
→ AI save semua ke docs/ → besok tinggal `/start-session`

### Ganti AI / Buka Conversation Baru
```
Baca docs/ACTIVE_TASK.md, docs/BACKLOG.md, docs/BUG_TRACKER.md lalu kasih saya ringkasan
```
→ AI baru langsung punya konteks lengkap

---

## 📁 Lokasi File Penting

```
project/
├── docs/
│   ├── ACTIVE_TASK.md       ← ⭐ Baca pertama setiap sesi
│   ├── BACKLOG.md           ← Semua ide & request
│   ├── BUG_TRACKER.md       ← Semua bugs
│   ├── CHANGELOG.md         ← History perubahan
│   ├── DECISION_LOG.md      ← Keputusan desain
│   ├── PROJECT_STATUS.md    ← Status keseluruhan project
│   └── plans/               ← Detail plan per phase
│
└── .agents/workflows/
    ├── start-session.md     ← Workflow awal sesi
    └── end-session.md       ← Workflow akhir sesi
```

---

## ⚡ Pro Tips

1. **Selalu mulai dengan `/start-session`** → mencegah AI lupa konteks
2. **Selalu akhiri dengan `/end-session`** → semua progress tersimpan
3. **Bilang "ide:" bukan langsung "buatin"** → agar tidak terdistraksi dari task aktif
4. **Bilang "bug:" bukan "kenapa error"** → agar tercatat di tracker
5. **File docs/ bisa dibaca manual** → buka langsung di VS Code kalau mau review
