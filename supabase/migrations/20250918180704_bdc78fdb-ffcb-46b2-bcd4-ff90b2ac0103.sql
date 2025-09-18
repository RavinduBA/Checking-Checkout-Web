-- Remove all staff user profiles and their permissions
-- Keep only the admin user (www.hotelina@gmail.com)

DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.profiles 
    WHERE email IN (
        'nazaaf@mahajanagroup.com',
        'e19198@eng.pdn.ac.lk',
        'usitkt@gmail.com',
        'dharmarathneeranga@gmail.com',
        'rasnayakewishwa@gmail.com',
        'rustybunkkandy@gmail.com'
    )
);

DELETE FROM public.profiles 
WHERE email IN (
    'nazaaf@mahajanagroup.com',
    'e19198@eng.pdn.ac.lk',
    'usitkt@gmail.com',
    'dharmarathneeranga@gmail.com',
    'rasnayakewishwa@gmail.com',
    'rustybunkkandy@gmail.com'
);