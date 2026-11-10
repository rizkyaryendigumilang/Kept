// Demo showcase dataset for live captures, Remotion video compositions, and interactive preview (?demo=1).
// Contains synthetic, non-sensitive credentials, cards, and documents across all 5 tabs.

function createDocPreviewDataUrl({ badge, title, subtitle, docNumber, owner, accent = '#0f172a' }) {
  if (typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 560
    canvas.height = 350
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Background card
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, 560, 350)

    // Top accent bar
    ctx.fillStyle = accent
    ctx.fillRect(0, 0, 560, 74)

    // Header text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(badge || 'DOKUMEN RESMI', 28, 36)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(subtitle || 'ARSIP TERENKRIPSI AES-256-GCM', 28, 58)

    // Photo / chip placeholder box on right
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(416, 102, 114, 146)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2
    ctx.strokeRect(416, 102, 114, 146)

    // Silhouette in photo box
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(473, 152, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(473, 224, 42, Math.PI, 0)
    ctx.fill()

    // Document fields on left
    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 11px monospace'
    ctx.fillText('NOMOR DOKUMEN / IDENTITAS', 28, 118)

    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 22px monospace'
    ctx.fillText(docNumber || '3174-0912-8841-0001', 28, 146)

    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 11px monospace'
    ctx.fillText('NAMA PEMEGANG', 28, 186)

    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(owner || 'RIZKY ARYENDI GUMILANG', 28, 212)

    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 11px monospace'
    ctx.fillText('JENIS BERKAS', 28, 250)

    ctx.fillStyle = '#334155'
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(title || 'Dokumen Identitas', 28, 274)

    // Bottom security strip
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, 304, 560, 46)
    ctx.fillStyle = '#475569'
    ctx.font = '12px monospace'
    ctx.fillText('KEPT ZERO-KNOWLEDGE VAULT  |  VERIFIED ATTACHMENT', 28, 331)

    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

export function buildDemoShowcaseData() {
  const now = new Date()
  const in18Days = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 15)
  const cardExpirySoon = `${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}/${String(nextMonthDate.getFullYear()).slice(-2)}`

  const ktpImg = createDocPreviewDataUrl({
    badge: 'KTP-el REPUBLIK INDONESIA',
    title: 'Kartu Tanda Penduduk Elektronik',
    subtitle: 'PROVINSI DKI JAKARTA - JAKARTA SELATAN',
    docNumber: '3174 •••• •••• 0002',
    owner: 'R•••• ARYENDI',
    accent: '#0d3b66'
  })

  const pasporImg = createDocPreviewDataUrl({
    badge: 'PASPOR REPUBLIK INDONESIA',
    title: 'E-Paspor Biometrik 48 Halaman',
    subtitle: 'DIREKTORAT JENDERAL IMIGRASI',
    docNumber: 'X849 •••• 4',
    owner: 'R•••• ARYENDI',
    accent: '#0f3b4c'
  })

  const npwpImg = createDocPreviewDataUrl({
    badge: 'NPWP DIREKTORAT JENDERAL PAJAK',
    title: 'Nomor Pokok Wajib Pajak',
    subtitle: 'KPP PRATAMA JAKARTA SETIABUDI SATU',
    docNumber: '89.•••.•••.•-018.000',
    owner: 'R•••• ARYENDI',
    accent: '#854d0e'
  })

  const simImg = createDocPreviewDataUrl({
    badge: 'SURAT IZIN MENGEMUDI (SIM A)',
    title: 'Korlantas Polri - Smart SIM',
    subtitle: 'METRO JAYA - GOLONGAN A (MOBIL PENUMPANG)',
    docNumber: '9604-••••-••4812',
    owner: 'R•••• ARYENDI',
    accent: '#15803d'
  })

  const bpjsImg = createDocPreviewDataUrl({
    badge: 'BPJS KESEHATAN - KIS',
    title: 'Kartu Indonesia Sehat Eksekutif',
    subtitle: 'FASKES TK. I KLINIK MEDIKA SUDIRMAN',
    docNumber: '0001 •••• •••• 9',
    owner: 'R•••• ARYENDI',
    accent: '#008345'
  })

  const shmImg = createDocPreviewDataUrl({
    badge: 'BADAN PERTANAHAN NASIONAL',
    title: 'Sertifikat Hak Milik (SHM)',
    subtitle: 'KANTOR PERTANAHAN JAKARTA SELATAN',
    docNumber: 'SHM No. •••19 / Cipete',
    owner: 'R•••• ARYENDI',
    accent: '#7c2d12'
  })

  const items = [
    // 1. Passwords & Project Credentials
    {
      id: 'pass-github',
      item_type: 'password',
      category: 'project',
      name: 'GitHub Enterprise Cloud',
      username: 'r••••@kept.id',
      password: 'Gh#99!KeptZeroKnowledge2026_Vault',
      url: 'https://github.com',
      environment: 'Production',
      service: 'Source Control & CI/CD Actions',
      notes: 'Akun utama organisasi engineering. Hardware security key YubiKey 5C terdaftar sebagai 2FA.',
      favorite: true,
      access_count: 14,
      last_used_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      custom_fields: [
        { id: 'cf-gh-1', label: 'Recovery Token', value: 'GH-REC-••••-••••-XKLP', secret: true },
        { id: 'cf-gh-2', label: 'SSH Signing Key', value: 'SHA256:nThbg6k•••••••Kw6E5SY8', secret: false },
        { id: 'cf-gh-3', label: 'Org Role', value: 'Principal Security Architect', secret: false }
      ],
      password_history: [
        { password: 'Gh#88!OldRotationKey_2025', changed_at: '2026-06-12T09:30:00.000Z' },
        { password: 'Gh#77!InitialSetupKey_2025', changed_at: '2026-01-04T14:15:00.000Z' }
      ]
    },
    {
      id: 'pass-aws',
      item_type: 'password',
      category: 'project',
      name: 'AWS Root & IAM Production',
      username: 's••••-root@kept.id',
      password: 'Aws$Prod_98412!Argon2id_Vault#91',
      url: 'https://aws.amazon.com',
      environment: 'ap-southeast-3 (Jakarta)',
      service: 'Cloud Infrastructure & KMS',
      notes: 'Root account dilengkapi MFA hardware. Digunakan khusus untuk manajemen billing dan IAM role delegation.',
      favorite: true,
      access_count: 11,
      last_used_at: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      custom_fields: [
        { id: 'cf-aws-1', label: 'Account ID', value: '7492-••••-••21', secret: false },
        { id: 'cf-aws-2', label: 'IAM Access Key Secret', value: 'wJalrXUtn•••••••EXAMPLEKEY', secret: true }
      ]
    },
    {
      id: 'pass-supabase',
      item_type: 'password',
      category: 'project',
      name: 'Supabase Database Cluster',
      username: 'r••••@kept.id',
      password: 'Sb#Postgres16_ZeroKnowledge!8842',
      url: 'https://supabase.com',
      environment: 'Production (Singapore)',
      service: 'PostgreSQL & RLS Auth',
      notes: 'Penyimpanan ciphertext AES-256-GCM dengan Row Level Security ketat.',
      favorite: true,
      access_count: 9,
      last_used_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: 'pass-stripe',
      item_type: 'password',
      category: 'web',
      name: 'Stripe Merchant Dashboard',
      username: 'f••••@kept.id',
      password: 'Str!peLive_90218$PayoutVault_Key',
      url: 'https://stripe.com',
      environment: 'Live Mode',
      service: 'Payment Gateway & Settlement',
      notes: 'Akses settlement langganan lisensi Kept Pro dan webhook signing secret.',
      favorite: true,
      access_count: 6,
      last_used_at: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 4 * 3600 * 1000).toISOString()
    },
    {
      id: 'pass-cloudflare',
      item_type: 'password',
      category: 'project',
      name: 'Cloudflare Zero Trust DNS',
      username: 'n••••@kept.id',
      password: 'Cf#EdgeWAF_2026!StrictTLS13_994',
      url: 'https://cloudflare.com',
      environment: 'Global Edge',
      service: 'DNSSEC & WAF Rules',
      notes: 'Pengaturan DNSSEC, HSTS preload, dan sertifikat mTLS domain kept.id.',
      favorite: false,
      access_count: 5,
      last_used_at: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 6 * 3600 * 1000).toISOString()
    },
    {
      id: 'pass-figma',
      item_type: 'password',
      category: 'web',
      name: 'Figma Design System (Omarchy)',
      username: 'd••••@kept.id',
      password: 'Fg!OmarchyTokens_4pxGrid#2026',
      url: 'https://figma.com',
      notes: 'Workspace utama pustaka komponen Omarchy Design System & token warna.',
      favorite: false,
      access_count: 4,
      last_used_at: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 12 * 3600 * 1000).toISOString()
    },
    {
      id: 'pass-apple',
      item_type: 'password',
      category: 'web',
      name: 'Apple Developer Program',
      username: 'i••••@kept.id',
      password: 'Ap#AppStoreConnect_SignCert!2026',
      url: 'https://developer.apple.com',
      notes: 'Sertifikat distribusi iOS Capacitor dan provisioning profile WebAuthn.',
      favorite: false,
      access_count: 2,
      last_used_at: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'pass-instagram',
      item_type: 'password',
      category: 'social',
      name: 'Instagram Official (@kept.vault)',
      username: '@kept.vault',
      password: 'Ig#OfficialBrand_Kept2026!Secure',
      url: 'https://instagram.com',
      notes: 'Akun publikasi rilis produk dan katalog fitur Kept.',
      favorite: false,
      access_count: 3,
      last_used_at: new Date(now.getTime() - 30 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 30 * 3600 * 1000).toISOString()
    },
    {
      id: 'pass-linkedin',
      item_type: 'password',
      category: 'social',
      name: 'LinkedIn Company Page',
      username: 'r••••@kept.id',
      password: 'Li#EnterprisePage_KeptVault!88',
      url: 'https://linkedin.com',
      notes: 'Halaman korporat dan komunikasi kemitraan B2B.',
      favorite: false,
      access_count: 1,
      last_used_at: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 48 * 3600 * 1000).toISOString()
    },
    {
      id: 'pass-x',
      item_type: 'password',
      category: 'social',
      name: 'X / Twitter Security Feed',
      username: '@kept_sec',
      password: 'Tw#SecAdvisory_2026!ZeroKnowledge',
      url: 'https://x.com',
      notes: 'Pengumuman changelog keamanan dan audit kriptografi.',
      favorite: false,
      access_count: 2,
      last_used_at: new Date(now.getTime() - 60 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 60 * 3600 * 1000).toISOString()
    },
    {
      id: 'note-ssh',
      item_type: 'secure_note',
      category: 'secure_note',
      name: 'SSH Ed25519 Master Key & Bastion Config',
      notes: 'Host bastion.kept.id\n  HostName •••.•••.•••.••• (IP Disensor)\n  User secadmin\n  IdentityFile ~/.ssh/id_ed25519_kept_prod\n  Port 22022',
      note: 'Host bastion.kept.id\n  HostName •••.•••.•••.••• (IP Disensor)\n  User secadmin\n  IdentityFile ~/.ssh/id_ed25519_kept_prod\n  Port 22022',
      favorite: false,
      access_count: 2,
      last_used_at: new Date(now.getTime() - 72 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 72 * 3600 * 1000).toISOString()
    },
    {
      id: 'note-seed',
      item_type: 'secure_note',
      category: 'secure_note',
      name: 'Hardware Wallet Cold Storage Passphrase',
      notes: 'Ledger Nano X Derivasi BIP-84: m/84h/•••/•••. Disimpan di brankas fisik terproteksi.',
      note: 'Ledger Nano X Derivasi BIP-84: m/84h/•••/•••. Disimpan di brankas fisik terproteksi.',
      favorite: false,
      access_count: 1,
      last_used_at: new Date(now.getTime() - 96 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 96 * 3600 * 1000).toISOString()
    },

    // 2. Cards & Accounts (My Cards / Banking)
    {
      id: 'card-bca-prioritas',
      item_type: 'bank_card',
      category: 'bank',
      name: 'BCA Prioritas World',
      bank_name: 'Bank Central Asia',
      issuer: 'Bank Central Asia',
      account_owner: 'R•••• ARYENDI',
      card_number: '5412•••••••2098',
      account_number: '014••••104',
      registered_phone: '+62 811-••••-•81',
      card_brand: 'MASTERCARD',
      expiry: '08/29',
      color: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      barcode_value: 'KEPT-DEMO-0104',
      barcode_type: 'code128',
      notes: 'Rekening operasional utama dan kartu debit/kredit perjalanan internasional.',
      favorite: true,
      access_count: 8,
      last_used_at: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 3 * 3600 * 1000).toISOString()
    },
    {
      id: 'card-mandiri-sig',
      item_type: 'bank_card',
      category: 'bank',
      name: 'Mandiri Visa Signature',
      bank_name: 'Bank Mandiri',
      issuer: 'Bank Mandiri',
      account_owner: 'R•••• ARYENDI',
      card_number: '4539•••••••7712',
      account_number: '124••••••1209',
      registered_phone: '+62 811-••••-•81',
      card_brand: 'VISA',
      expiry: cardExpirySoon,
      color: 'linear-gradient(135deg, #003d79 0%, #091e3a 100%)',
      barcode_value: 'KEPT-DEMO-1209',
      barcode_type: 'code128',
      notes: 'Kartu pembayaran cloud server AWS, Cloudflare, dan lisensi software tahunan.',
      favorite: false,
      access_count: 4,
      last_used_at: new Date(now.getTime() - 18 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 18 * 3600 * 1000).toISOString()
    },
    {
      id: 'card-jago',
      item_type: 'bank_card',
      category: 'bank',
      name: 'Bank Jago Kantong Bisnis',
      bank_name: 'Bank Jago',
      issuer: 'Bank Jago Tbk',
      account_owner: 'R•••• ARYENDI',
      card_number: '4365•••••••0034',
      account_number: '104•••••4021',
      registered_phone: '+62 811-••••-•81',
      card_brand: 'VISA',
      expiry: '11/28',
      color: 'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)',
      notes: 'Kantong alokasi pajak dan pembayaran vendor otomatis.',
      favorite: false,
      access_count: 2,
      last_used_at: new Date(now.getTime() - 36 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 36 * 3600 * 1000).toISOString()
    },
    {
      id: 'card-nfc-apt',
      item_type: 'bank_card',
      category: 'access',
      name: 'Sudirman Suites Tower A',
      bank_name: 'Sudirman Residence',
      issuer: 'Building Management',
      account_owner: 'UNIT ••-B / R•••• A.',
      card_number: '04:A2:••:••:••:40:80',
      nfc_uid: '04:A2:••:••:••:40:80',
      card_brand: 'NFC UID',
      expiry: '12/28',
      color: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)',
      notes: 'Akses lift privat, gerbang basement B1, dan fasilitas sky gym.',
      favorite: false,
      access_count: 5,
      last_used_at: new Date(now.getTime() - 8 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 8 * 3600 * 1000).toISOString()
    },
    {
      id: 'card-gym',
      item_type: 'bank_card',
      category: 'membership',
      name: 'Fitness First Platinum Club',
      bank_name: 'Fitness First Indonesia',
      issuer: 'Evolution Wellness',
      account_owner: 'R•••• ARYENDI',
      card_number: 'FF-ID-••••2014',
      barcode_value: 'FF-ID-DEMO-2014',
      barcode_type: 'code128',
      card_brand: 'MEMBER',
      expiry: '06/27',
      color: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      notes: 'Pindai barcode Code-128 di turnstile resepsionis seluruh klub Jakarta.',
      favorite: false,
      access_count: 6,
      last_used_at: new Date(now.getTime() - 10 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 10 * 3600 * 1000).toISOString()
    },
    {
      id: 'card-allianz',
      item_type: 'bank_card',
      category: 'health',
      name: 'Allianz SmartHealth Cashless',
      bank_name: 'Allianz Life Indonesia',
      issuer: 'Allianz Indonesia',
      account_owner: 'R•••• ARYENDI',
      card_number: '8004•••••••1002',
      barcode_value: 'ALZ-DEMO-1002',
      barcode_type: 'code128',
      card_brand: 'HEALTH',
      expiry: '09/27',
      color: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
      notes: 'Kartu rawat inap cashless rumah sakit rekanan seluruh Asia Pasifik.',
      favorite: false,
      access_count: 1,
      last_used_at: new Date(now.getTime() - 120 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 120 * 3600 * 1000).toISOString()
    },

    // 3. Encrypted Documents (3x2 Grid on DocumentsPage)
    {
      id: 'doc-ktp',
      item_type: 'document',
      doc_type: 'ktp',
      template_id: 'ktp',
      category: '01_identity',
      name: 'KTP-el Nasional.pdf',
      owner_name: 'R•••• Aryendi',
      doc_number: '3174 •••• •••• 0002',
      issue_date: '2021-04-19',
      expiry_date: 'Seumur Hidup',
      file_size: '1.4 MB',
      favorite: true,
      notes: 'Kartu Tanda Penduduk Elektronik Provinsi DKI Jakarta.',
      fields: {
        nik: '3174 •••• •••• 0002',
        pob: 'Jakarta',
        dob: '1996-••-••',
        address: 'Jl. Jend. Sudirman Kav. ••, Jakarta Selatan',
        religion: 'Islam',
        marital_status: 'Kawin'
      },
      attachments: ktpImg
        ? {
            front: {
              name: 'KTP-el-Nasional-Depan.png',
              size: '1.4 MB',
              type: 'image/png',
              data: ktpImg
            }
          }
        : {},
      last_used_at: new Date(now.getTime() - 5 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 5 * 3600 * 1000).toISOString()
    },
    {
      id: 'doc-paspor',
      item_type: 'document',
      doc_type: 'paspor',
      template_id: 'paspor',
      category: '03_mobility',
      name: 'Paspor Republik Indonesia.pdf',
      owner_name: 'R•••• Aryendi',
      doc_number: 'X849 •••• 4',
      issue_date: '2021-11-22',
      expiry_date: in18Days,
      file_size: '2.4 MB',
      favorite: true,
      notes: 'E-Paspor 48 halaman diterbitkan oleh Kanim Kelas I Khusus Jakarta Selatan.',
      fields: {
        passport_number: 'X849 •••• 4',
        nationality: 'INDONESIA',
        issuing_office: 'Kanim Kelas I Khusus Jakarta Selatan',
        reg_code: 'REG-••••-••4812'
      },
      attachments: pasporImg
        ? {
            front: {
              name: 'Paspor-RI-Halaman-Bio.png',
              size: '2.4 MB',
              type: 'image/png',
              data: pasporImg
            }
          }
        : {},
      last_used_at: new Date(now.getTime() - 7 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 7 * 3600 * 1000).toISOString()
    },
    {
      id: 'doc-npwp',
      item_type: 'document',
      doc_type: 'npwp',
      template_id: 'npwp',
      category: '02_education',
      name: 'NPWP Wajib Pajak Pribadi.pdf',
      owner_name: 'R•••• Aryendi',
      doc_number: '89.•••.•••.•-018.000',
      issue_date: '2020-02-14',
      expiry_date: 'Seumur Hidup',
      file_size: '960 KB',
      favorite: false,
      notes: 'Telah dipadankan dengan NIK 16 digit sesuai regulasi CoreTax DJP.',
      fields: {
        npwp_number: '89.•••.•••.•-018.000',
        taxpayer_name: 'R•••• Aryendi',
        kpp: 'KPP Pratama Jakarta Setiabudi Satu',
        registered_date: '2020-02-14'
      },
      attachments: npwpImg
        ? {
            front: {
              name: 'Kartu-NPWP-DJP.png',
              size: '960 KB',
              type: 'image/png',
              data: npwpImg
            }
          }
        : {},
      last_used_at: new Date(now.getTime() - 14 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 14 * 3600 * 1000).toISOString()
    },
    {
      id: 'doc-sim',
      item_type: 'document',
      doc_type: 'sim',
      template_id: 'sim',
      category: '03_mobility',
      name: 'Smart SIM A Metro Jaya.pdf',
      owner_name: 'R•••• Aryendi',
      doc_number: '9604-••••-••4812',
      issue_date: '2022-01-10',
      expiry_date: in45Days,
      file_size: '1.8 MB',
      favorite: false,
      notes: 'Surat Izin Mengemudi Golongan A (Mobil Penumpang Pribadi).',
      fields: {
        sim_type: 'SIM A',
        sim_number: '9604-••••-••4812',
        pob: 'Jakarta',
        dob: '1996-••-••'
      },
      attachments: simImg
        ? {
            front: {
              name: 'Smart-SIM-A.png',
              size: '1.8 MB',
              type: 'image/png',
              data: simImg
            }
          }
        : {},
      last_used_at: new Date(now.getTime() - 20 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 20 * 3600 * 1000).toISOString()
    },
    {
      id: 'doc-bpjs',
      item_type: 'document',
      doc_type: 'bpjs_kesehatan',
      template_id: 'bpjs_kesehatan',
      category: '04_health_assets',
      name: 'BPJS Kesehatan Kelas 1.pdf',
      owner_name: 'R•••• Aryendi',
      doc_number: '0001 •••• •••• 9',
      issue_date: '2019-08-01',
      expiry_date: 'Seumur Hidup',
      file_size: '1.1 MB',
      favorite: false,
      notes: 'Kepesertaan JKN Mandiri Kelas 1 Aktif.',
      fields: {
        bpjs_number: '0001 •••• •••• 9',
        faskes_level_1: 'Klinik Medika Sudirman',
        membership_class: 'Kelas 1'
      },
      attachments: bpjsImg
        ? {
            front: {
              name: 'Kartu-KIS-BPJS.png',
              size: '1.1 MB',
              type: 'image/png',
              data: bpjsImg
            }
          }
        : {},
      last_used_at: new Date(now.getTime() - 40 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 40 * 3600 * 1000).toISOString()
    },
    {
      id: 'doc-shm',
      item_type: 'document',
      doc_type: 'sertifikat_tanah',
      template_id: 'sertifikat_tanah',
      category: '04_health_assets',
      name: 'Sertifikat Hak Milik (SHM).pdf',
      owner_name: 'R•••• Aryendi',
      doc_number: '•••19/Cipete/2023',
      issue_date: '2023-05-18',
      expiry_date: 'Seumur Hidup',
      file_size: '4.2 MB',
      favorite: false,
      notes: 'Sertifikat Elektronik BPN bidang tanah dan bangunan 240 m2.',
      fields: {
        cert_number: '•••19/Cipete/2023',
        right_type: 'SHM (Hak Milik)',
        surface_area: '240 m2',
        nib: '09.04.••.••.04819',
        location: 'Cipete Selatan, Jakarta Selatan'
      },
      attachments: shmImg
        ? {
            front: {
              name: 'SHM-Elektronik-BPN.png',
              size: '4.2 MB',
              type: 'image/png',
              data: shmImg
            }
          }
        : {},
      last_used_at: new Date(now.getTime() - 80 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 80 * 3600 * 1000).toISOString()
    },

    // 4. Trashed item (for Recycle Bin preview)
    {
      id: 'trash-old-staging',
      item_type: 'password',
      category: 'project',
      name: 'Legacy Staging VPN (Decommissioned)',
      username: 'v••••@kept.id',
      password: 'OldVpn#2024_Deprecated!99',
      url: 'https://vpn.old-staging.kept.id',
      deleted_at: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString()
    }
  ]

  const session = {
    user: {
      id: 'demo-user-kept-001',
      email: 'r••••@kept.id',
      user_metadata: {
        display_name: 'Rizky A.'
      }
    }
  }

  const profile = {
    id: 'demo-user-kept-001',
    display_name: 'Rizky A.',
    theme: 'dark',
    card_style: 'realistic',
    vault_salt: 'ZGVtb19zYWx0X2tlcHRfMjAyNg==',
    vault_verifier: {
      checkEnvelope: { v: 1, iv: 'ZGVtb19pdg==', ct: 'ZGVtb19jdA==' },
      recovery: { v: 1, salt: 'ZGVtb19zYWx0', iv: 'ZGVtb19pdg==', ct: 'ZGVtb19jdA==' }
    }
  }

  const rawKey = new Uint8Array(32)
  for (let i = 0; i < 32; i++) rawKey[i] = (i * 7 + 0x4a) & 0xff

  return {
    session,
    profile,
    items,
    rawKey,
    recoveryKey: 'KEPT-••••-••••-••••-••••-4R9Z'
  }
}

export function seedDemoSecurityAuditStorage() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  try {
    const now = Date.now()
    const logs = [
      {
        id: 'log-1',
        type: 'security_audit',
        title: 'Pemindaian Kebocoran Selesai (k-Anonymity)',
        desc: '12 kredensial diperiksa terhadap database HIBP. 0 kebocoran ditemukan.',
        level: 'info',
        device: 'MacBook Pro M3 · IP •••.•••.•••.•••',
        timestamp: new Date(now - 8 * 60 * 1000).toISOString()
      },
      {
        id: 'log-2',
        type: 'login_success',
        title: 'Buka Vault Berhasil (WebAuthn Biometrik)',
        desc: 'Kunci master didekripsi di Web Worker menggunakan Argon2id (64 MB, t=3).',
        level: 'success',
        device: 'iPhone 16 Pro · IP •••.•••.•••.•••',
        timestamp: new Date(now - 42 * 60 * 1000).toISOString()
      },
      {
        id: 'log-3',
        type: 'vault_item_added',
        title: 'Enkripsi Dokumen Baru (AES-256-GCM)',
        desc: 'Berkas "Sertifikat Hak Milik (SHM).pdf" dienkripsi di klien dengan IV 96-bit unik.',
        level: 'info',
        device: 'MacBook Pro M3 · IP •••.•••.•••.•••',
        timestamp: new Date(now - 3 * 3600 * 1000).toISOString()
      },
      {
        id: 'log-4',
        type: 'account_added',
        title: 'Kartu Ditambahkan ke 3D Deck',
        desc: 'BCA Prioritas World ditambahkan ke kategori Bank & Rekening.',
        level: 'info',
        device: 'iPhone 16 Pro · IP •••.•••.•••.•••',
        timestamp: new Date(now - 14 * 3600 * 1000).toISOString()
      }
    ]
    localStorage.setItem('kept_security_activity_logs', JSON.stringify(logs))

    const devices = [
      {
        id: 'dev-macbook',
        name: 'MacBook Pro 16" · IP •••.•••.•••.•••',
        os: 'macOS Sequoia 15.2',
        browser: 'Chrome 131 (WebAuthn Aktif)',
        lastActive: new Date(now - 2 * 60 * 1000).toISOString(),
        isCurrent: true,
        status: 'active'
      },
      {
        id: 'dev-iphone',
        name: 'iPhone 16 Pro · IP •••.•••.•••.•••',
        os: 'iOS 18.2',
        browser: 'Mobile Safari (Face ID Aktif)',
        lastActive: new Date(now - 19 * 60 * 1000).toISOString(),
        isCurrent: false,
        status: 'active'
      },
      {
        id: 'dev-ipad',
        name: 'iPad Pro M4 · IP •••.•••.•••.•••',
        os: 'iPadOS 18.2',
        browser: 'Safari (Touch ID Aktif)',
        lastActive: new Date(now - 26 * 3600 * 1000).toISOString(),
        isCurrent: false,
        status: 'active'
      }
    ]
    localStorage.setItem('kept_trusted_devices', JSON.stringify(devices))

    const breachScan = {
      scannedAt: new Date(now - 8 * 60 * 1000).toISOString(),
      totalScanned: 10,
      breachedCount: 0,
      breachedResults: []
    }
    localStorage.setItem('kept_last_breach_scan', JSON.stringify(breachScan))
  } catch {
    // ignore storage quota errors
  }
}
