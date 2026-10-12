UPDATE public.rbac_rules
SET analytics_access = 'Full Access',
    updated_at = NOW()
WHERE role = 'ADMIN_REGION'
  AND analytics_access = 'No Access';
