# Deploy Kept ke VPS (local → GitHub → VPS)

Alur yang dipakai repo ini:

```
laptop  --git push-->  GitHub Actions (ci-cd-web-vps.yml)  --scp/ssh-->  VPS (/srv/www/kept)  --Caddy-->  browser
```

Build **tidak** terjadi di VPS. VPS hanya menerima hasil build yang sudah diverifikasi, menyimpannya sebagai file statis, dan Caddy yang melayaninya lewat HTTPS otomatis.

---

## 1. Siapkan VPS (sekali saja)

```bash
ssh user@vps-ip

# Caddy dari repo resmi (versi apt default biasanya ketinggalan)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy rsync

# Folder tujuan deploy — HARUS sama dengan yang dipakai workflow
sudo mkdir -p /srv/www/kept
sudo chown -R $USER:$USER /srv/www/kept
sudo chmod -R o+rX /srv/www/kept

# Caddyfile (salin dari repo: deploy/caddy/Caddyfile)
sudo nano /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Template `deploy/caddy/Caddyfile` memakai `vault.example.com`. Ganti dengan domain kamu dan pastikan **A/AAAA record sudah mengarah ke VPS** sebelum reload — Caddy menerbitkan sertifikat Let's Encrypt otomatis saat request pertama untuk domain itu.

Cek cepat setelah reload:

```bash
curl -I https://vault.example.com/kept/
systemctl status caddy --no-pager
```

---

## 2. SSH key untuk GitHub Actions

Di VPS:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_github_actions -N ""
cat ~/.ssh/id_github_actions.pub >> ~/.ssh/authorized_keys
```

Ambil fingerprint host untuk `VPS_SSH_KNOWN_HOSTS` (mencegah MITM):

```bash
ssh-keyscan -p 22 vault.example.com
```

*(Catatan: Workflow sudah dilengkapi pendeteksi port cerdas (auto-detect port 22 & 2222) serta fallback `ssh-keyscan` jika host key belum tersimpan di secrets).*

---

## 3. Secrets di GitHub

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Wajib | Contoh nilai |
|---|---|---|
| `VPS_HOST` | ya | `vault.example.com` (pakai domain, bukan IP — lihat catatan health check) |
| `VPS_USERNAME` | ya | `rizky` |
| `VPS_SSH_KEY` | ya | isi `~/.ssh/id_github_actions` (private key) |
| `VPS_SSH_KNOWN_HOSTS` | opsional | output `ssh-keyscan` (otomatis disintesis/discan bila belum diisi) |
| `VITE_SUPABASE_URL` | ya | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ya | `sb_publishable_...` |
| `VPS_SSH_PORT` | tidak | `22` (otomatis mendeteksi port aktif 22 atau 2222) |
| `KEPT_PUBLIC_URL` | tidak | `https://vault.example.com/kept/` |

Workflow **tidak** punya fallback untuk dua secret Supabase. Kalau salah satunya kosong, build berhenti dengan `Missing repository secret`, bukan menghasilkan bundle rusak.

Nilai `VITE_SUPABASE_PUBLISHABLE_KEY` aman disimpan sebagai secret meski bersifat publik (memang ikut terkirim ke browser), karena yang dilindungi tetap RLS + enkripsi client-side.

---

## 4. Apa yang dilakukan workflow

`ci-cd-web-vps.yml` jalan pada push ke `main` yang menyentuh `src/`, `public/`, `index.html`, `package*.json`, `vite.config.*`, `scripts/`, atau file workflow itu sendiri. Bisa juga manual via **Run workflow**.

1. `npm ci` + `npm test` (health & crypto check).
2. `npm run build -- --base=/kept/` dengan env dari secrets.
3. Validasi output: `index.html`, `manifest.webmanifest`, folder `assets/`.
4. Artefak di-`tar` + `sha256sum`, di-upload, lalu di-`scp` ke `~/` di VPS.
5. Di VPS: checksum diverifikasi, isi di-extract ke staging, snapshot versi live dibuat, lalu `rsync` ke `/srv/www/kept`. Aset lama di `assets/` **dipertahankan** supaya sesi yang masih terbuka tidak kena chunk 404.
6. Health check HTTPS ketat (TLS valid, HTTP 200, body mengandung `id="root"` dan `<title>Kept`).
7. Kalau health check gagal → rollback otomatis dari snapshot.

---

## 5. Catatan Caddy & health check

- **Caddy menangani TLS sendiri.** Tidak perlu Certbot. Karena itu `deploy/nginx/vault.conf` sudah dihapus dari repo; satu-satunya konfigurasi web server adalah `deploy/caddy/Caddyfile`.
- **Health check mewajibkan TLS yang valid.** Kalau `VPS_HOST` diisi IP, `https://<ip>/kept/` akan gagal verifikasi sertifikat dan deploy dianggap gagal (lalu rollback). Isi `VPS_HOST` dengan domain, atau set `KEPT_PUBLIC_URL=https://domain/kept/`.
- **Deploy pertama bisa kena timeout 15 detik** karena Caddy baru menerbitkan sertifikat. Buka `https://domain/kept/` sekali secara manual dulu, baru jalankan workflow.
- **Jangan pakai `--delete` di luar workflow ini.** Satu-satunya penulis `/srv/www/kept` adalah workflow; kalau ada workflow/script lain ikut menulis dengan base path berbeda, app akan blank.
- **Base path harus sinkron.** `/kept/` di workflow (argumen `--base`) = `/kept/` di blok `handle_path` Caddy. Kalau mau pindah ke root domain, ubah keduanya sekaligus.
- **Kalau di depan Caddy ada Cloudflare proxy,** sertifikat origin tetap diterbitkan Caddy (mode Full/Full Strict). Jangan pakai mode Flexible — HSTS + redirect akan membuat loop.
- **Pin action ke commit SHA** (bukan `@v4`) supaya supply chain tidak berubah diam-diam. SHA baru: `https://api.github.com/repos/<owner>/<repo>/commits/<tag>`.
- `vercel.json` di repo hanya relevan kalau deploy ke Vercel; tidak mengganggu VPS.
