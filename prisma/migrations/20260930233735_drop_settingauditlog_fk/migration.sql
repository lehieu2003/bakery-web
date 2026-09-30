-- The admin action audit trail writes SettingAuditLog rows with synthetic
-- keys (admin_action:<entity>:<id>) that never exist in the Setting table,
-- so the settingKey foreign key rejected every write (P2003) and the audit
-- page stayed empty forever. Audit logs are historical records: drop the FK
-- so entries survive regardless of whether the referenced setting exists.
ALTER TABLE "SettingAuditLog" DROP CONSTRAINT "SettingAuditLog_settingKey_fkey";
