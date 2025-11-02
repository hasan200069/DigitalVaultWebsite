-- Digital Vault Database Initialization
-- This file is executed when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    branding JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vault_items table
CREATE TABLE IF NOT EXISTS vault_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    is_encrypted BOOLEAN DEFAULT true,
    encryption_key_id VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_extension VARCHAR(20),
    current_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vault_item_versions table
CREATE TABLE IF NOT EXISTS vault_item_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64),
    is_encrypted BOOLEAN DEFAULT true,
    encryption_key_id VARCHAR(255),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    upload_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, version_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_tenant_id ON vault_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category);
CREATE INDEX IF NOT EXISTS idx_vault_items_created_at ON vault_items(created_at);
CREATE INDEX IF NOT EXISTS idx_vault_item_versions_item_id ON vault_item_versions(item_id);
CREATE INDEX IF NOT EXISTS idx_vault_item_versions_version_number ON vault_item_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_vault_item_versions_created_at ON vault_item_versions(created_at);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create webauthn_credentials table
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id VARCHAR(255) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    device_type VARCHAR(100),
    backed_up BOOLEAN DEFAULT false,
    transports TEXT[], -- Array of transport types
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Insert a default tenant
INSERT INTO tenants (name, domain, branding) 
VALUES (
    'Digital Vault Default',
    'default',
    '{}'
) ON CONFLICT (domain) DO NOTHING;

-- Create inheritance_plans table
CREATE TABLE IF NOT EXISTS inheritance_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    k_threshold INTEGER NOT NULL CHECK (k_threshold >= 2),
    n_total INTEGER NOT NULL CHECK (n_total >= k_threshold),
    waiting_period_days INTEGER NOT NULL CHECK (waiting_period_days >= 1),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ready', 'triggered', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create inheritance_trustees table
CREATE TABLE IF NOT EXISTS inheritance_trustees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES inheritance_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    share_index INTEGER NOT NULL CHECK (share_index >= 1),
    encrypted_share TEXT NOT NULL,
    has_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, share_index),
    UNIQUE(plan_id, email)
);

-- Create inheritance_beneficiaries table
CREATE TABLE IF NOT EXISTS inheritance_beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES inheritance_plans(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, email)
);

-- Create inheritance_items table
CREATE TABLE IF NOT EXISTS inheritance_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES inheritance_plans(id) ON DELETE CASCADE,
    vault_item_id UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, vault_item_id)
);

-- Create indexes for inheritance tables
CREATE INDEX IF NOT EXISTS idx_inheritance_plans_owner_id ON inheritance_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_inheritance_plans_status ON inheritance_plans(status);
CREATE INDEX IF NOT EXISTS idx_inheritance_plans_created_at ON inheritance_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_inheritance_trustees_plan_id ON inheritance_trustees(plan_id);
CREATE INDEX IF NOT EXISTS idx_inheritance_trustees_user_id ON inheritance_trustees(user_id);
CREATE INDEX IF NOT EXISTS idx_inheritance_trustees_email ON inheritance_trustees(email);
CREATE INDEX IF NOT EXISTS idx_inheritance_beneficiaries_plan_id ON inheritance_beneficiaries(plan_id);
CREATE INDEX IF NOT EXISTS idx_inheritance_beneficiaries_email ON inheritance_beneficiaries(email);
CREATE INDEX IF NOT EXISTS idx_inheritance_items_plan_id ON inheritance_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_inheritance_items_vault_item_id ON inheritance_items(vault_item_id);

-- Create audit logs table for immutable audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vault_id UUID REFERENCES vault_items(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64) NOT NULL,
    signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_vault_id ON audit_logs(vault_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_current_hash ON audit_logs(current_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_previous_hash ON audit_logs(previous_hash);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Create OCR results table
CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    extracted_text TEXT NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    processing_time INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create auto tags table
CREATE TABLE IF NOT EXISTS auto_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    tag VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('financial', 'legal', 'medical', 'personal', 'other')),
    confidence DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create redaction suggestions table
CREATE TABLE IF NOT EXISTS redaction_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ssn', 'credit_card', 'bank_account', 'phone', 'email', 'address')),
    text VARCHAR(500) NOT NULL,
    start_index INTEGER NOT NULL,
    end_index INTEGER NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for OCR tables
CREATE INDEX IF NOT EXISTS idx_ocr_results_item_id ON ocr_results(item_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_created_at ON ocr_results(created_at);
CREATE INDEX IF NOT EXISTS idx_auto_tags_item_id ON auto_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_auto_tags_category ON auto_tags(category);
CREATE INDEX IF NOT EXISTS idx_redaction_suggestions_item_id ON redaction_suggestions(item_id);
CREATE INDEX IF NOT EXISTS idx_redaction_suggestions_type ON redaction_suggestions(type);

-- Insert a default admin user (password: admin123)
INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, is_admin) 
SELECT 
    t.id,
    'admin@digitalvault.com', 
    '$argon2id$v=19$m=65536,t=3,p=4$isSD0uIYFEoPTG5pUPu2gA$Df/6s9KV12fGZXZuSHYppp4Ph+WATvEOXU6qgKy8fXY',
    'Admin',
    'User',
    true
FROM tenants t WHERE t.domain = 'default'
ON CONFLICT (tenant_id, email) DO NOTHING;
