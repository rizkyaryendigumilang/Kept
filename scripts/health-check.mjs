import { readFileSync, existsSync } from 'node:fs'

for (const file of ['package.json', 'supabase/001_schema.sql', 'src/App.jsx', '.env.example']) {
  if (!existsSync(file)) throw new Error(`Missing ${file}`)
}
const pkg = JSON.parse(readFileSync('package.json','utf8'))
console.log(`OK: ${pkg.name} ${pkg.version}`)
