# Database Backup & Restore Instructions

## Backup Manifest
- **Date**: 2026-03-22 10:35:10
- **Project**: soft-violet-20746314 (platform)
- **Database**: neondb
- **Region**: ap-southeast-1 (AWS)
- **Version**: PostgreSQL 17

## Tables Backed Up
1. User
2. Vendor
3. Client
4. Package
5. Booking
6. Gallery
7. Photo
8. PhotoSelection
9. Payment
10. GallerySetting

## How to Restore

### Option 1: Via Neon Dashboard (Recommended)
1. Go to https://console.neon.tech
2. Select Organization: "Irvan"
3. Select Project: "platform"
4. Go to Branches > main
5. Click "Export" or "Download backup"
6. Restore to new branch if needed

### Option 2: Via pg_dump (Manual)
```bash
# Connect to Neon and create dump
PGPASSWORD="npg_EIpk8iChFUT0" pg_dump \
  -h ep-falling-star-a1n568i6-pooler.ap-southeast-1.aws.neon.tech \
  -U neondb_owner \
  -d neondb \
  --ssl-mode=require \
  > full_backup.sql

# Restore from dump
PGPASSWORD="your_password" psql \
  -h your_host \
  -U your_user \
  -d your_db \
  < full_backup.sql
```

### Option 3: Via Prisma (If Migration Needed)
```bash
npx prisma migrate deploy
npx prisma db seed
```

## Important Notes
- ⚠️ This backup file does NOT contain actual data dumps
- 🔐 Never commit .sql files to git
- 📅 Create regular backups before major changes
- 🔄 Test restore in development first

## Restore After Reset (If Needed)
```bash
# 1. If database was accidentally reset
# 2. Contact Neon support for PITR (Point-In-Time Recovery)
# 3. Or restore from most recent full SQL dump
# 4. Re-run migrations: npx prisma migrate deploy
```

---
**Last Backup**: 2026-03-22 10:35:10 UTC
**Backup Files**:
- backup_neondb_20260322_103510.json (manifest)
- backup_neondb_20260322_103429.sql (if available)
