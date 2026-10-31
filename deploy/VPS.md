# Deploy Personal Vault ke VPS (GitHub Actions auto-sync)

Aplikasi ini adalah Vite SPA statis. Di VPS kamu cuma butuh:
1. Node.js (untuk `npm run build` di GitHub Actions, bukan di VPS)
2. nginx (untuk layani folder `dist/`)
3. SSH key + rsync (untuk workflow auto-deploy)

Karena Vite inlines env variabel **waktu build**, nilai production diambil dari GitHub Actions Secrets, bukan dari file `.env` di VPS.

---

## 1. Siapkan VPS (sesi sekali)

```bash
# Masuk ke VPS
ssh user@vps-ip

# Install nginx
sudo apt update
sudo apt install -y nginx

# Buat folder tujuan deploy
sudo mkdir -p /var/www/personal-vault/dist
sudo chown -R $USER:$USER /var/www/personal-vault

# Simpan konfigurasi nginx (dari repo: deploy/nginx/vault.conf)
# Ganti server_name dengan domain kamu
sudo nano /etc/nginx/sites-available/vault.conf
sudo ln -s /etc/nginx/sites-available/vault.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 2. Siapkan SSH agar GitHub Actions bisa deploy

Di VPS, buat SSH key (kalau belum ada) dan tambahkan publiknya ke `~/.ssh/authorized_keys`:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_github_actions -N ""
cat ~/.ssh/id_github_actions.pub >> ~/.ssh/authorized_keys
```

Di GitHub repo → **Settings → Secrets and variables → Actions**, tambahkan:

| Secret | Contoh nilai |
|---|---|
| `VPS_HOST` | `203.0.113.10` atau `vault.example.com` |
| `VPS_USER` | `rizky` |
| `VPS_SSH_KEY` | isi file `~/.ssh/id_github_actions` (private key) |
| `VPS_REMOTE_PATH` | `/var/www/personal-vault/dist` |
| `VITE_SUPABASE_URL` | `https://bhldonheosindyolgeom.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |

---

## 3. Push ke GitHub → deploy otomatis

Setiap `git push origin main` akan menjalankan workflow `.github/workflows/deploy.yml`:
1. `npm ci` + `npm run build` (dengan env dari secrets)
2. `rsync` folder `dist/` ke VPS
3. `reload nginx`

---

## 4. Penting

- **Jangan commit `.env.local` / `.env.production`.** Sudah ada di `.gitignore`. Di VPS tidak perlu file `.env` karena env di-inject via GitHub Secrets saat build.
- `vercel.json` di repo adalah untuk Vercel; **tidak perlu** untuk VPS (biarkan saja, tidak mengganggu).
- Untuk HTTPS, pasang Certbot/Let's Encrypt di VPS setelah domain sudah arah ke IP VPS.
- Pertama kali deploy, isi folder `dist/` bisa kosong; workflow akan membuatnya.
