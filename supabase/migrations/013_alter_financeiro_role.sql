-- Migration 013: Comandante Financeiro
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';
