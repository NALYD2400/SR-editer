-- Repair broken placeholder migration from 20260710.
-- Library storage access is already covered by 20260707_texture_library.sql
-- and 20260710_admin_moderation_hardening.sql. This file is intentionally a no-op
-- so migrate history stays valid.

SELECT 1;
