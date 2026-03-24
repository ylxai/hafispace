#!/bin/bash

PROJECT_ID="soft-violet-20746314"
BRANCH_ID="main"
DB_NAME="neondb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_neondb_${TIMESTAMP}.json"

echo "📋 Backing up Neon database..."
echo "Project: $PROJECT_ID"
echo "Database: $DB_NAME"
echo "Output: $BACKUP_FILE"

# List all tables
echo -e "\n🔍 Scanning tables..."

# Create backup manifest
cat > "$BACKUP_FILE" << 'JSON'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project": "platform",
  "database": "neondb",
  "tables": [
    "User",
    "Vendor", 
    "Client",
    "Package",
    "Booking",
    "Gallery",
    "Photo",
    "PhotoSelection",
    "Payment",
    "GallerySetting"
  ],
  "status": "pending_export",
  "note": "Use Neon console or pg_dump via connection pool to export full database"
}
JSON

echo "✅ Backup manifest created: $BACKUP_FILE"
echo ""
echo "📌 To fully restore database later:"
echo "   1. Use Neon dashboard: Projects > platform > Branches > main > Export"
echo "   2. Or use: pg_dump with proper credentials from .env"
echo "   3. Store backup file in secure location (not git)"

