INSERT INTO public.user_roles (user_id, role)
VALUES ('053f94c3-8c61-4bf4-b8c2-891c21ac0f7d', 'logistics_partner'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.delivery_partner_users (user_id, delivery_partner_id, is_active)
SELECT '053f94c3-8c61-4bf4-b8c2-891c21ac0f7d', id, true
FROM public.delivery_partners WHERE type = 'in_house' AND is_active ORDER BY sort_order LIMIT 1
ON CONFLICT DO NOTHING;

DELETE FROM public.delivery_partner_users
 WHERE user_id = '88324be3-9b35-4d0e-8764-d50094eea3b0';

DELETE FROM public.user_roles
 WHERE user_id = '88324be3-9b35-4d0e-8764-d50094eea3b0'
   AND role = 'logistics_partner'::public.app_role;