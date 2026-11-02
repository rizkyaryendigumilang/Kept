# Deploy Kept ke VPS (local → GitHub → VPS)

Alur yang dipakai repo ini:

```
laptop  --git push-->  GitHub Actions (ci-cd-web-vps.yml)  --scp/ssh-->  VPS (/srv/www/kept)
```

Build **tidak** terjadi di VPS. VPS hanya menerima hasil build yang sudah diverifikasi dan menyimpannya sebagai file statis untuk nginx.

---

## 1. Siapkan VPS (sekali saja)

```bash
ssh user@vps-ip

sudo apt update
sudo apt install -y nginx rsync

# Folder tujuan deploy — HARUS sama dengan yang dipakai workflow
sudo mkdir -p /srv/www/kept
sudo chown -R $USER:$USER /srv/www/kept

# Konfigurasi nginx (salin dari repo: deploy/nginx/vault.conf)
sudo nano /etc/nginx/sites-available/kept.conf
sudo ln -s /etc/nginx/sites-available/kept.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

`vault.conf` di repo adalah **template**: ganti `vault.example.com` dengan domain kamu. Blok 443 memerlukan sertifikat, jadi jalankan Certbot lebih dulu, atau ubah sementara `listen 443 ssl` menjadi `listen 80` dan hapus baris `ssl_*`.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vault.example.com
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

---

## 3. Secrets di GitHub

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Wajib | Contoh nilai |
|---|---|---|
| `VPS_HOST` | ya | `203.0.113.10` atau `vault.example.com` |
| `VPS_USERNAME` | ya | `rizky` |
| `VPS_SSH_KEY` | ya | isi `~/.ssh/id_github_actions` (private key) |
| `VPS_SSH_KNOWN_HOSTS` | ya | output `ssh-keyscan` |
| `VITE_SUPABASE_URL` | ya | `https://bhldonheosindyolgeom.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ya | `sb_publishable_...` |
| `VPS_SSH_PORT` | tidak | `22` |
| `KEPT_PUBLIC_URL` | tidak | `https://vault.example.com/kept/` |

Catatan: workflow **tidak lagi** punya fallback untuk dua secret Supabase. Kalau salah satunya kosong, build berhenti dengan pesan `Missing repository secret`, bukan menghasilkan bundle yang rusak.

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

## 5. Yang perlu diingat

- **Jangan commit `.env.local`**; sudah ada di `.gitignore`. VPS tidak butuh file `.env` karena env di-inject saat build.
- Hanya **satu** workflow deploy web. Kalau suatu saat menambah workflow deploy lain, pastikan tidak menulis ke `/srv/www/kept` dengan base path berbeda — dua deploy yang berlomba akan membuat app blank.
- Base path build (`/kept/`) dan `root /srv/www/kept` di nginx harus selalu cocok. Kalau mau pindah ke root domain (`/`), ubah `--base` di workflow **dan** blok `location` di nginx sekaligus.
- Pin action ke commit SHA (bukan `@v4`) supaya supply chain tidak berubah diam-diam. Kalau memperbarui action, ambil SHA dari `https://api.github.com/repos/<owner>/<repo>/commits/<tag>`.
- `vercel.json` di repo hanya relevan kalau deploy ke Vercel; tidak mengganggu VPS.
