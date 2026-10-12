// Database of standard Indonesian Document Templates, Categories, and Metadata Fields

export const DOCUMENT_CATEGORIES = [
  {
    id: '01_identity',
    code: '01',
    name: 'Identity & Civil Records',
    description: 'Dokumen identitas dan kependudukan'
  },
  {
    id: '02_education',
    code: '02',
    name: 'Education & Career',
    description: 'Pendidikan dan administrasi pekerjaan'
  },
  {
    id: '03_mobility',
    code: '03',
    name: 'Mobility & Legal',
    description: 'Perjalanan dan status hukum'
  },
  {
    id: '04_health_assets',
    code: '04',
    name: 'Health & Asset Ownership',
    description: 'Jaminan sosial dan kepemilikan aset'
  },
  {
    id: '05_other',
    code: '05',
    name: 'Other Documents',
    description: 'Kontrak, sertifikat pelatihan, surat kuasa, dll.'
  }
]

export const DOCUMENT_TEMPLATES = [
  // 01. Identity & Civil Records
  {
    id: 'ktp',
    name: 'KTP-el',
    fullName: 'Kartu Tanda Penduduk Elektronik (KTP-el)',
    category: '01_identity',
    badge: 'KTP-el',
    color: '#0d3b66',
    docNumberLabel: 'NIK (Nomor Induk Kependudukan)',
    docNumberPlaceholder: '16 digit NIK',
    fields: [
      { key: 'nik', label: 'NIK', placeholder: '16 digit NIK', type: 'text' },
      { key: 'pob', label: 'Tempat Lahir', placeholder: 'Kota / Kabupaten', type: 'text' },
      { key: 'dob', label: 'Tanggal Lahir', placeholder: 'YYYY-MM-DD', type: 'date' },
      { key: 'address', label: 'Alamat Lengkap', placeholder: 'Alamat sesuai KTP (RT/RW, Kel, Kec)', type: 'textarea' },
      { key: 'religion', label: 'Agama', placeholder: 'Islam / Kristen / Katolik / Hindu / Buddha / Konghucu', type: 'text' },
      { key: 'marital_status', label: 'Status Perkawinan', placeholder: 'Belum Kawin / Kawin / Cerai', type: 'text' }
    ]
  },
  {
    id: 'kia',
    name: 'Kartu Identitas Anak (KIA)',
    fullName: 'Kartu Identitas Anak (KIA)',
    category: '01_identity',
    badge: 'KIA',
    color: '#9d174d',
    docNumberLabel: 'Nomor KIA / NIK Anak',
    docNumberPlaceholder: '16 digit NIK anak',
    fields: [
      { key: 'nik', label: 'NIK Anak', placeholder: '16 digit NIK', type: 'text' },
      { key: 'pob', label: 'Tempat Lahir', placeholder: 'Kota / Kabupaten', type: 'text' },
      { key: 'dob', label: 'Tanggal Lahir', placeholder: 'YYYY-MM-DD', type: 'date' },
      { key: 'parent_name', label: 'Nama Orang Tua / Wali', placeholder: 'Nama ayah / ibu', type: 'text' },
      { key: 'address', label: 'Alamat', placeholder: 'Alamat domisili anak', type: 'textarea' }
    ]
  },
  {
    id: 'kk',
    name: 'Kartu Keluarga (KK)',
    fullName: 'Kartu Keluarga (KK)',
    category: '01_identity',
    badge: 'KK',
    color: '#1e293b',
    docNumberLabel: 'Nomor Kartu Keluarga (No. KK)',
    docNumberPlaceholder: '16 digit No. KK',
    fields: [
      { key: 'kk_number', label: 'Nomor KK', placeholder: '16 digit nomor KK', type: 'text' },
      { key: 'family_head', label: 'Nama Kepala Keluarga', placeholder: 'Nama kepala keluarga', type: 'text' },
      { key: 'address', label: 'Alamat Lengkap', placeholder: 'Jalan, RT/RW, Dusun', type: 'textarea' },
      { key: 'district', label: 'Kelurahan / Desa & Kecamatan', placeholder: 'Kelurahan, Kecamatan, Kota', type: 'text' }
    ]
  },
  {
    id: 'akta_lahir',
    name: 'Akta Kelahiran',
    fullName: 'Kutipan Akta Kelahiran',
    category: '01_identity',
    badge: 'Akta Lahir',
    color: '#065f46',
    docNumberLabel: 'Nomor Akta Kelahiran',
    docNumberPlaceholder: 'No. Register / Akta',
    fields: [
      { key: 'reg_number', label: 'Nomor Akta', placeholder: 'Nomor akta resmi', type: 'text' },
      { key: 'pob', label: 'Tempat Lahir', placeholder: 'Tempat kelahiran', type: 'text' },
      { key: 'dob', label: 'Tanggal Lahir', placeholder: 'YYYY-MM-DD', type: 'date' },
      { key: 'father_name', label: 'Nama Ayah', placeholder: 'Nama lengkap ayah', type: 'text' },
      { key: 'mother_name', label: 'Nama Ibu', placeholder: 'Nama lengkap ibu', type: 'text' }
    ]
  },

  // 02. Education & Career
  {
    id: 'ijazah',
    name: 'Ijazah',
    fullName: 'Ijazah Pendidikan',
    category: '02_education',
    badge: 'Ijazah',
    color: '#713f12',
    docNumberLabel: 'Nomor Seri Ijazah',
    docNumberPlaceholder: 'No. Ijazah nasional',
    fields: [
      { key: 'institution', label: 'Institusi / Sekolah / Universitas', placeholder: 'Nama kampus atau sekolah', type: 'text' },
      { key: 'degree', label: 'Jenjang Pendidikan', placeholder: 'SD / SMP / SMA / D3 / S1 / S2 / S3', type: 'text' },
      { key: 'major', label: 'Program Studi / Jurusan', placeholder: 'Teknik Informatika, Manajemen, dll.', type: 'text' },
      { key: 'grad_year', label: 'Tahun Kelulusan', placeholder: 'Tahun lulus (cth. 2022)', type: 'text' }
    ]
  },
  {
    id: 'transkrip',
    name: 'Transkrip Nilai',
    fullName: 'Transkrip Akademik',
    category: '02_education',
    badge: 'Transkrip',
    color: '#3730a3',
    docNumberLabel: 'Nomor Transkrip',
    docNumberPlaceholder: 'No. Transkrip',
    fields: [
      { key: 'institution', label: 'Institusi Pendidikan', placeholder: 'Nama institusi', type: 'text' },
      { key: 'gpa', label: 'IPK / Rata-rata Nilai', placeholder: 'cth. 3.85 / 90.5', type: 'text' },
      { key: 'total_credits', label: 'Total SKS / Kredit', placeholder: 'cth. 144 SKS', type: 'text' },
      { key: 'grad_year', label: 'Tahun Kelulusan', placeholder: 'Tahun', type: 'text' }
    ]
  },
  {
    id: 'npwp',
    name: 'NPWP',
    fullName: 'Nomor Pokok Wajib Pajak (NPWP)',
    category: '02_education',
    badge: 'NPWP',
    color: '#854d0e',
    docNumberLabel: 'Nomor NPWP (16 Digit / 15 Digit)',
    docNumberPlaceholder: 'XX.XXX.XXX.X-XXX.XXX',
    fields: [
      { key: 'npwp_number', label: 'Nomor NPWP', placeholder: '16 digit NPWP baru / 15 digit lama', type: 'text' },
      { key: 'taxpayer_name', label: 'Nama Wajib Pajak', placeholder: 'Sesuai kartu NPWP', type: 'text' },
      { key: 'kpp', label: 'KPP Terdaftar', placeholder: 'Kantor Pelayanan Pajak', type: 'text' },
      { key: 'registered_date', label: 'Tanggal Terdaftar', placeholder: 'YYYY-MM-DD', type: 'date' }
    ]
  },

  // 03. Mobility & Legal
  {
    id: 'sim',
    name: 'SIM',
    fullName: 'Surat Izin Mengemudi (SIM)',
    category: '03_mobility',
    badge: 'SIM',
    color: '#15803d',
    docNumberLabel: 'Nomor SIM',
    docNumberPlaceholder: 'Nomor SIM resmi',
    fields: [
      { key: 'sim_type', label: 'Golongan SIM', placeholder: 'SIM A / SIM B / SIM C / SIM D', type: 'text' },
      { key: 'sim_number', label: 'Nomor SIM', placeholder: 'Nomor SIM', type: 'text' },
      { key: 'pob', label: 'Tempat Lahir', placeholder: 'Kota kelahiran', type: 'text' },
      { key: 'dob', label: 'Tanggal Lahir', placeholder: 'YYYY-MM-DD', type: 'date' },
      { key: 'address', label: 'Alamat', placeholder: 'Alamat domisili', type: 'textarea' }
    ]
  },
  {
    id: 'paspor',
    name: 'Paspor',
    fullName: 'Paspor Republik Indonesia',
    category: '03_mobility',
    badge: 'Paspor RI',
    color: '#0f3b4c',
    docNumberLabel: 'Nomor Paspor',
    docNumberPlaceholder: 'cth. X1234567 / B1234567',
    fields: [
      { key: 'passport_number', label: 'Nomor Paspor', placeholder: 'Nomor paspor', type: 'text' },
      { key: 'nationality', label: 'Kewarganegaraan', placeholder: 'INDONESIA', type: 'text' },
      { key: 'issuing_office', label: 'Kantor Imigrasi Penerbit', placeholder: 'cth. Kanim Kelas I Jakarta Pusat', type: 'text' },
      { key: 'reg_code', label: 'Kode Registrasi', placeholder: 'Kode registrasi paspor', type: 'text' }
    ]
  },
  {
    id: 'buku_nikah',
    name: 'Buku Nikah',
    fullName: 'Kutipan Akta Nikah / Buku Nikah',
    category: '03_mobility',
    badge: 'Buku Nikah',
    color: '#92400e',
    docNumberLabel: 'Nomor Akta Nikah',
    docNumberPlaceholder: 'Nomor akta nikah',
    fields: [
      { key: 'marriage_number', label: 'Nomor Akta Nikah', placeholder: 'No. seri akta nikah', type: 'text' },
      { key: 'husband_name', label: 'Nama Suami', placeholder: 'Nama lengkap suami', type: 'text' },
      { key: 'wife_name', label: 'Nama Istri', placeholder: 'Nama lengkap istri', type: 'text' },
      { key: 'kua_office', label: 'KUA / Kantor Pencatatan', placeholder: 'KUA Kecamatan...', type: 'text' },
      { key: 'marriage_date', label: 'Tanggal Pernikahan', placeholder: 'YYYY-MM-DD', type: 'date' }
    ]
  },
  {
    id: 'akta_kawin',
    name: 'Akta Perkawinan',
    fullName: 'Akta Perkawinan Sipil (Disdukcapil)',
    category: '03_mobility',
    badge: 'Akta Perkawinan',
    color: '#831843',
    docNumberLabel: 'Nomor Akta Perkawinan',
    docNumberPlaceholder: 'Nomor akta perkawinan sipil',
    fields: [
      { key: 'doc_number', label: 'Nomor Akta', placeholder: 'Nomor akta', type: 'text' },
      { key: 'husband_name', label: 'Nama Suami', placeholder: 'Nama suami', type: 'text' },
      { key: 'wife_name', label: 'Nama Istri', placeholder: 'Nama istri', type: 'text' },
      { key: 'registry_office', label: 'Dinas Pencatatan Sipil', placeholder: 'Disdukcapil Kota/Kab', type: 'text' }
    ]
  },
  {
    id: 'akta_cerai',
    name: 'Akta Perceraian',
    fullName: 'Akta Perceraian Resmi',
    category: '03_mobility',
    badge: 'Akta Cerai',
    color: '#475569',
    docNumberLabel: 'Nomor Akta Cerai',
    docNumberPlaceholder: 'Nomor akta cerai',
    fields: [
      { key: 'doc_number', label: 'Nomor Akta', placeholder: 'Nomor akta cerai', type: 'text' },
      { key: 'court_name', label: 'Pengadilan Agama / Negeri', placeholder: 'Pengadilan Agama...', type: 'text' },
      { key: 'ruling_date', label: 'Tanggal Putusan', placeholder: 'YYYY-MM-DD', type: 'date' }
    ]
  },

  // 04. Health & Asset Ownership
  {
    id: 'bpjs_kesehatan',
    name: 'BPJS Kesehatan',
    fullName: 'Kartu Indonesia Sehat (BPJS Kesehatan)',
    category: '04_health_assets',
    badge: 'BPJS Kesehatan',
    color: '#008345',
    docNumberLabel: 'Nomor Kartu BPJS Kesehatan',
    docNumberPlaceholder: '13 digit nomor BPJS',
    fields: [
      { key: 'bpjs_number', label: 'Nomor BPJS', placeholder: '13 digit nomor kartu', type: 'text' },
      { key: 'faskes_level_1', label: 'Fasilitas Kesehatan Tk. 1 (Faskes)', placeholder: 'Puskesmas / Klinik...', type: 'text' },
      { key: 'membership_class', label: 'Kelas / Jenis Kepesertaan', placeholder: 'Kelas 1 / Kelas 2 / Kelas 3 / PBI', type: 'text' }
    ]
  },
  {
    id: 'bpjs_ketenagakerjaan',
    name: 'BPJS Ketenagakerjaan',
    fullName: 'BPJS Ketenagakerjaan (BPJSTK)',
    category: '04_health_assets',
    badge: 'BPJSTK',
    color: '#0f766e',
    docNumberLabel: 'Nomor KPJ (Kartu Peserta Jamsostek)',
    docNumberPlaceholder: '11 digit KPJ',
    fields: [
      { key: 'kpj_number', label: 'Nomor KPJ', placeholder: 'Nomor KPJ', type: 'text' },
      { key: 'company_name', label: 'Perusahaan / Pemberi Kerja', placeholder: 'Nama PT / Pemberi kerja', type: 'text' },
      { key: 'programs', label: 'Program Perlindungan', placeholder: 'JHT, JKK, JKM, JP', type: 'text' }
    ]
  },
  {
    id: 'sertifikat_tanah',
    name: 'Sertifikat Tanah/Bangunan',
    fullName: 'Sertifikat Hak Atas Tanah (BPN)',
    category: '04_health_assets',
    badge: 'Sertifikat Tanah',
    color: '#7c2d12',
    docNumberLabel: 'Nomor Sertifikat',
    docNumberPlaceholder: 'No. Sertifikat Hak',
    fields: [
      { key: 'cert_number', label: 'Nomor Sertifikat', placeholder: 'No. sertifikat', type: 'text' },
      { key: 'right_type', label: 'Jenis Hak', placeholder: 'SHM (Milik) / HGB (Guna Bangunan) / HP (Pakai)', type: 'text' },
      { key: 'surface_area', label: 'Luas Tanah / Bangunan', placeholder: 'cth. 150 m2', type: 'text' },
      { key: 'nib', label: 'Nomor Identifikasi Bidang (NIB)', placeholder: 'NIB BPN', type: 'text' },
      { key: 'location', label: 'Lokasi Bidang Tanah', placeholder: 'Desa/Kelurahan, Kecamatan, Kota', type: 'textarea' }
    ]
  },
  {
    id: 'bpkb',
    name: 'BPKB Kendaraan',
    fullName: 'Buku Pemilik Kendaraan Bermotor (BPKB)',
    category: '04_health_assets',
    badge: 'BPKB Kendaraan',
    color: '#0f172a',
    docNumberLabel: 'Nomor BPKB',
    docNumberPlaceholder: 'Nomor registrasi BPKB',
    fields: [
      { key: 'bpkb_number', label: 'Nomor BPKB', placeholder: 'Nomor BPKB', type: 'text' },
      { key: 'plate_number', label: 'Nomor Polisi (Plat)', placeholder: 'cth. B 1234 ABC', type: 'text' },
      { key: 'vehicle_brand', label: 'Merk & Tipe Kendaraan', placeholder: 'cth. Honda HR-V 1.5 SE', type: 'text' },
      { key: 'frame_number', label: 'Nomor Rangka (VIN)', placeholder: 'Nomor rangka', type: 'text' },
      { key: 'engine_number', label: 'Nomor Mesin', placeholder: 'Nomor mesin', type: 'text' }
    ]
  },
  {
    id: 'stnk',
    name: 'STNK Kendaraan',
    fullName: 'Surat Tanda Nomor Kendaraan (STNK)',
    category: '04_health_assets',
    badge: 'STNK Kendaraan',
    color: '#1d4ed8',
    docNumberLabel: 'Nomor Registrasi STNK / Plat',
    docNumberPlaceholder: 'cth. B 1234 ABC',
    fields: [
      { key: 'plate_number', label: 'Nomor Polisi (Plat)', placeholder: 'cth. B 1234 ABC', type: 'text' },
      { key: 'vehicle_brand', label: 'Merk & Tipe Kendaraan', placeholder: 'cth. Toyota Avanza 1.3', type: 'text' },
      { key: 'frame_number', label: 'Nomor Rangka', placeholder: 'Nomor rangka', type: 'text' },
      { key: 'engine_number', label: 'Nomor Mesin', placeholder: 'Nomor mesin', type: 'text' },
      { key: 'color', label: 'Warna Kendaraan', placeholder: 'Warna TNKB', type: 'text' }
    ]
  },

  // 05. Other Documents
  {
    id: 'kontrak',
    name: 'Kontrak / Perjanjian',
    fullName: 'Perjanjian Kontrak Kerja / Bisnis',
    category: '05_other',
    badge: 'Kontrak',
    color: '#334155',
    docNumberLabel: 'Nomor Perjanjian / Kontrak',
    docNumberPlaceholder: 'Nomor surat kontrak',
    fields: [
      { key: 'contract_number', label: 'Nomor Kontrak', placeholder: 'No. SPK / Kontrak', type: 'text' },
      { key: 'parties', label: 'Pihak Terkait', placeholder: 'Nama pihak pertama & kedua', type: 'text' },
      { key: 'scope', label: 'Perihal Kontrak', placeholder: 'Perjanjian kerja / sewa / kerjasama', type: 'textarea' }
    ]
  },
  {
    id: 'sertifikat_pelatihan',
    name: 'Sertifikat Pelatihan',
    fullName: 'Sertifikat Keahlian / Pelatihan',
    category: '05_other',
    badge: 'Sertifikat',
    color: '#6b21a8',
    docNumberLabel: 'Nomor Sertifikat / Kredensial',
    docNumberPlaceholder: 'ID Kredensial sertifikat',
    fields: [
      { key: 'cert_title', label: 'Judul Pelatihan / Sertifikasi', placeholder: 'Nama kursus / sertifikasi', type: 'text' },
      { key: 'issuer', label: 'Lembaga Penerbit', placeholder: 'Nama penyelenggara / instansi', type: 'text' },
      { key: 'credential_id', label: 'ID Sertifikat', placeholder: 'Nomor sertifikat', type: 'text' }
    ]
  },
  {
    id: 'asuransi',
    name: 'Polis Asuransi',
    fullName: 'Polis Asuransi Jiwa / Kesehatan / Kendaraan',
    category: '05_other',
    badge: 'Asuransi',
    color: '#0e7490',
    docNumberLabel: 'Nomor Polis Asuransi',
    docNumberPlaceholder: 'No. Polis',
    fields: [
      { key: 'policy_number', label: 'Nomor Polis', placeholder: 'Nomor polis', type: 'text' },
      { key: 'insurer', label: 'Nama Perusahaan Asuransi', placeholder: 'Prudential, Allianz, Manulife, dll', type: 'text' },
      { key: 'plan_name', label: 'Nama Produk / Plan', placeholder: 'Nama program proteksi', type: 'text' },
      { key: 'coverage_amount', label: 'Uang Pertanggungan / Limit', placeholder: 'cth. Rp 500.000.000', type: 'text' }
    ]
  },
  {
    id: 'surat_kuasa',
    name: 'Surat Kuasa',
    fullName: 'Surat Kuasa Khusus / Umum',
    category: '05_other',
    badge: 'Surat Kuasa',
    color: '#52525b',
    docNumberLabel: 'Nomor Surat Kuasa',
    docNumberPlaceholder: 'Nomor surat (jika ada)',
    fields: [
      { key: 'authorizer', label: 'Pemberi Kuasa', placeholder: 'Nama pemberi kuasa', type: 'text' },
      { key: 'authorized_person', label: 'Penerima Kuasa', placeholder: 'Nama penerima kuasa', type: 'text' },
      { key: 'purpose', label: 'Tujuan Pemberian Kuasa', placeholder: 'Pengurusan dokumen, perbankan, dll', type: 'textarea' }
    ]
  },
  {
    id: 'other',
    name: 'Dokumen Lainnya',
    fullName: 'Dokumen Kustom Lainnya',
    category: '05_other',
    badge: 'Dokumen',
    color: '#3f3f46',
    docNumberLabel: 'Nomor Dokumen',
    docNumberPlaceholder: 'Nomor registrasi dokumen',
    fields: [
      { key: 'doc_title', label: 'Judul / Jenis Dokumen', placeholder: 'cth. SKCK, Surat Keterangan...', type: 'text' },
      { key: 'issuer', label: 'Instansi Penerbit', placeholder: 'Instansi / Lembaga terkait', type: 'text' },
      { key: 'description', label: 'Keterangan Tambahan', placeholder: 'Catatan penting mengenai dokumen ini', type: 'textarea' }
    ]
  }
]

export function getTemplateById(id) {
  if (!id) return DOCUMENT_TEMPLATES[0]
  return DOCUMENT_TEMPLATES.find((t) => t.id === id) || DOCUMENT_TEMPLATES[0]
}

export function getTemplatesByCategory(catId) {
  if (!catId || catId === 'all') return DOCUMENT_TEMPLATES
  return DOCUMENT_TEMPLATES.filter((t) => t.category === catId)
}

/**
 * Audit expiry for documents (Paspor, SIM, dll)
 * Alerts at 90, 30, and 7 days, or expired
 */
export function checkDocumentExpiry(expiryDateStr) {
  if (!expiryDateStr) return null
  const clean = String(expiryDateStr).trim().toLowerCase()
  if (clean === 'seumur hidup' || clean === 'lifetime' || clean === 'permanent') {
    return { status: 'lifetime', label: 'Seumur Hidup' }
  }

  const expDate = new Date(expiryDateStr)
  if (isNaN(expDate.getTime())) return null

  const now = new Date()
  // End of day
  expDate.setHours(23, 59, 59, 999)

  const diffTime = expDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { status: 'expired', label: 'Kedaluwarsa', daysRemaining: diffDays }
  }
  if (diffDays <= 7) {
    return { status: 'urgent', label: `Habis dalam ${diffDays} hari`, daysRemaining: diffDays }
  }
  if (diffDays <= 30) {
    return { status: 'warning_30', label: `Habis dalam ${diffDays} hari`, daysRemaining: diffDays }
  }
  if (diffDays <= 90) {
    return { status: 'warning_90', label: `Habis dalam ${diffDays} hari`, daysRemaining: diffDays }
  }

  return { status: 'active', label: 'Berlaku', daysRemaining: diffDays }
}
