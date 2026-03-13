#!/bin/bash

# ============================================
# AUDIT FILES CLEANUP SCRIPT
# ============================================
#
# Run this AFTER you've reviewed the audit and applied fixes
# This will remove the archive and keep only essential files
#
# Usage: bash cleanup-audit-files.sh
#
# What it does:
# - Removes audit-archive/ folder (207 old files)
# - Keeps diagnostic-scripts/ (useful for future)
# - Keeps essential docs (summaries, fix scripts)
# - Creates a backup just in case
#
# ============================================

echo "🧹 AUDIT FILES CLEANUP SCRIPT"
echo ""
echo "This will:"
echo "  - Delete audit-archive/ folder (207 files)"
echo "  - Keep diagnostic-scripts/ folder (124 scripts)"
echo "  - Keep essential documentation"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Create backup timestamp
BACKUP_NAME="audit-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

echo ""
echo "📦 Creating backup: $BACKUP_NAME"
tar -czf "$BACKUP_NAME" audit-archive/ 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully"

    echo ""
    echo "🗑️  Removing audit-archive folder..."
    rm -rf audit-archive/

    if [ ! -d "audit-archive" ]; then
        echo "✅ audit-archive removed"
    else
        echo "❌ Failed to remove audit-archive"
        exit 1
    fi
else
    echo "❌ Failed to create backup"
    echo "Not removing files for safety"
    exit 1
fi

echo ""
echo "📊 CLEANUP COMPLETE"
echo ""
echo "Kept files:"
echo "  - AUDIT_INDEX.md"
echo "  - AUDIT_COMPLETE_SUMMARY.md"
echo "  - DATABASE_AUDIT_COMPLETE.md"
echo "  - STICKERS_FIX_SUMMARY.md"
echo "  - NEXT_STEPS.md"
echo "  - QUICK_REFERENCE_CARD.md"
echo "  - CREATE_BUMPER_STICKERS_TABLE.sql"
echo "  - diagnostic-scripts/ (124 scripts)"
echo ""
echo "Removed:"
echo "  - audit-archive/ (207 files)"
echo ""
echo "Backup saved as: $BACKUP_NAME"
echo ""
echo "✅ Your project is now clean!"
echo ""
echo "If you need the old files, extract: tar -xzf $BACKUP_NAME"
echo ""
