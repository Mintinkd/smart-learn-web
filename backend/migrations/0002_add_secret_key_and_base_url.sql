ALTER TABLE api_config ADD COLUMN secret_key_encrypted TEXT NOT NULL DEFAULT '';
ALTER TABLE api_config ADD COLUMN secret_key_iv TEXT NOT NULL DEFAULT '';
ALTER TABLE api_config ADD COLUMN base_url TEXT NOT NULL DEFAULT '';