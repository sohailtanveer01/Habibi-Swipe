-- Seed script to create fake profiles for testing
-- Includes multiple photos, locations, and prompts

-- STEP 1: Temporarily disable the foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- STEP 2: Insert fake female profiles with multiple photos and locations
INSERT INTO public.users (
  id, email, first_name, last_name, gender, dob, height, ethnicity, nationality,
  marital_status, has_children, religious_practice, sect, born_muslim, education, profession,
  bio, photos, hobbies, location, alcohol_habit, smoking_habit,
  created_at, updated_at, last_active_at, onboarding_completed
) VALUES
-- Female Profile 1 - Fatima (Saudi Arabia - Riyadh)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
  'fatima.test1@testuser.com',
  'Fatima',
  'Al-Hassan',
  'female',
  '1995-03-15',
  '165 cm',
  'Arab',
  'Saudi Arabia',
  'Never Married',
  false,
  'very_practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Software Engineer',
  'Assalamu alaikum! Looking for someone who shares my values and faith. I love reading, hiking, and spending time with family. I believe in the power of good communication and building a strong foundation for marriage.',
  ARRAY[
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'
  ],
  ARRAY['Reading', 'Hiking', 'Cooking', 'Photography', 'Traveling'],
  ST_SetSRID(ST_MakePoint(46.6753, 24.7136), 4326)::geography, -- Riyadh
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Female Profile 2 - Aisha (Pakistan - Karachi)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  'aisha.test2@testuser.com',
  'Aisha',
  'Khan',
  'female',
  '1990-07-22',
  '160 cm',
  'South Asian',
  'Pakistan',
  'Divorced',
  true,
  'practicing',
  'Sunni',
  true,
  'Master''s Degree',
  'Doctor',
  'Alhamdulillah for everything. Single mom looking for a kind and understanding partner who values family. I work as a pediatrician and love helping children. Looking for someone mature who understands life.',
  ARRAY[
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800'
  ],
  ARRAY['Medicine', 'Travel', 'Photography', 'Reading', 'Yoga'],
  ST_SetSRID(ST_MakePoint(67.0011, 24.8607), 4326)::geography, -- Karachi
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Female Profile 3 - Khadija (Nigeria - Lagos)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003',
  'khadija.test3@testuser.com',
  'Khadija',
  'Ibrahim',
  'female',
  '1998-11-08',
  '170 cm',
  'African',
  'Nigeria',
  'Never Married',
  false,
  'moderately_practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Marketing Manager',
  'Creative soul with a love for art and culture. Looking for my best friend and partner in life. I believe in balance between deen and dunya. Let''s build something beautiful together!',
  ARRAY[
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800',
    'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=800',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'
  ],
  ARRAY['Art', 'Music', 'Fashion', 'Dancing', 'Cooking'],
  ST_SetSRID(ST_MakePoint(3.3792, 6.5244), 4326)::geography, -- Lagos
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Female Profile 4 - Maryam (UK - London)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004',
  'maryam.test4@testuser.com',
  'Maryam',
  'Abdullah',
  'female',
  '1988-05-30',
  '158 cm',
  'Mixed',
  'United Kingdom',
  'Widowed',
  true,
  'very_practicing',
  'Sunni',
  false,
  'PhD',
  'University Professor',
  'Seeking a compassionate soul for this journey of life. Faith, family, and knowledge are my priorities. Revert of 10 years, alhamdulillah. Looking for someone who values intellectual conversations.',
  ARRAY[
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800'
  ],
  ARRAY['Teaching', 'Writing', 'Gardening', 'Islamic Studies', 'Calligraphy'],
  ST_SetSRID(ST_MakePoint(-0.1276, 51.5074), 4326)::geography, -- London
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Female Profile 5 - Sarah (Germany - Berlin)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005',
  'sarah.test5@testuser.com',
  'Sarah',
  'Ahmed',
  'female',
  '1996-09-12',
  '175 cm',
  'European',
  'Germany',
  'Never Married',
  false,
  'not_practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Graphic Designer',
  'Cultural Muslim, open-minded and adventurous. Love traveling and trying new cuisines! I''m a free spirit who values creativity and self-expression. Looking for someone equally passionate about life.',
  ARRAY[
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'
  ],
  ARRAY['Design', 'Travel', 'Food', 'Art', 'Photography'],
  ST_SetSRID(ST_MakePoint(13.4050, 52.5200), 4326)::geography, -- Berlin
  'occasionally',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Female Profile 6 - Layla (Morocco - Casablanca)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006',
  'layla.test6@testuser.com',
  'Layla',
  'Benali',
  'female',
  '1993-02-28',
  '162 cm',
  'North African',
  'Morocco',
  'Never Married',
  false,
  'practicing',
  'Sunni',
  true,
  'Master''s Degree',
  'Architect',
  'Passionate about design and creating beautiful spaces. Looking for someone who appreciates both deen and dunya. I love Moroccan tea ceremonies and traditional crafts.',
  ARRAY[
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800'
  ],
  ARRAY['Architecture', 'Interior Design', 'Calligraphy', 'Cooking', 'Reading'],
  ST_SetSRID(ST_MakePoint(-7.5898, 33.5731), 4326)::geography, -- Casablanca
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Female Profile 7 - Amina (Malaysia - Kuala Lumpur)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007',
  'amina.test7@testuser.com',
  'Amina',
  'Wong',
  'female',
  '1991-12-05',
  '155 cm',
  'East Asian',
  'Malaysia',
  'Annulled',
  false,
  'moderately_practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Business Analyst',
  'Starting fresh and optimistic about the future. Love good conversations and cozy coffee shops. I believe everything happens for a reason and I''m ready for my next chapter.',
  ARRAY[
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'
  ],
  ARRAY['Business', 'Coffee', 'Reading', 'Hiking', 'Movies'],
  ST_SetSRID(ST_MakePoint(101.6869, 3.1390), 4326)::geography, -- Kuala Lumpur
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Female Profile 8 - Noor (Jordan - Amman)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008',
  'noor.test8@testuser.com',
  'Noor',
  'Khalil',
  'female',
  '2000-06-18',
  '168 cm',
  'Arab',
  'Jordan',
  'Never Married',
  false,
  'practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Content Creator',
  'Young, ambitious, and seeking someone equally driven. Love creating content and inspiring others. I''m passionate about fitness and healthy living. Looking for a partner who supports my dreams.',
  ARRAY[
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'
  ],
  ARRAY['Social Media', 'Fitness', 'Fashion', 'Travel', 'Photography'],
  ST_SetSRID(ST_MakePoint(35.9106, 31.9454), 4326)::geography, -- Amman
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
);

-- Insert fake male profiles with multiple photos and locations
INSERT INTO public.users (
  id, email, first_name, last_name, gender, dob, height, ethnicity, nationality,
  marital_status, has_children, religious_practice, sect, born_muslim, education, profession,
  bio, photos, hobbies, location, alcohol_habit, smoking_habit,
  created_at, updated_at, last_active_at, onboarding_completed
) VALUES
-- Male Profile 1 - Omar (UAE - Dubai)
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
  'omar.test1@testuser.com',
  'Omar',
  'Al-Farsi',
  'male',
  '1992-04-20',
  '180 cm',
  'Arab',
  'UAE',
  'Never Married',
  false,
  'very_practicing',
  'Sunni',
  true,
  'Master''s Degree',
  'Civil Engineer',
  'Seeking a righteous partner to build a family based on Islamic values. I pray 5 times daily and fast regularly. Looking for someone who shares my commitment to deen while enjoying life''s blessings.',
  ARRAY[
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800'
  ],
  ARRAY['Engineering', 'Sports', 'Reading Quran', 'Swimming', 'Travel'],
  ST_SetSRID(ST_MakePoint(55.2708, 25.2048), 4326)::geography, -- Dubai
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Male Profile 2 - Ahmed (Bangladesh - Dhaka)
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002',
  'ahmed.test2@testuser.com',
  'Ahmed',
  'Rahman',
  'male',
  '1988-08-15',
  '175 cm',
  'South Asian',
  'Bangladesh',
  'Divorced',
  true,
  'practicing',
  'Sunni',
  true,
  'PhD',
  'Research Scientist',
  'Father of one, looking for someone understanding and kind. I believe in second chances and the mercy of Allah. My daughter is my priority, and I''m looking for someone who can be part of our family.',
  ARRAY[
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800'
  ],
  ARRAY['Science', 'Parenting', 'Nature', 'Reading', 'Cooking'],
  ST_SetSRID(ST_MakePoint(90.4125, 23.8103), 4326)::geography, -- Dhaka
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Male Profile 3 - Ibrahim (Kenya - Nairobi)
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003',
  'ibrahim.test3@testuser.com',
  'Ibrahim',
  'Okonkwo',
  'male',
  '1995-01-25',
  '185 cm',
  'African',
  'Kenya',
  'Never Married',
  false,
  'moderately_practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Financial Analyst',
  'Ambitious professional with a balanced approach to life and deen. Looking for my partner in faith and life. I enjoy football, volunteering at the mosque, and exploring new places.',
  ARRAY[
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
  ],
  ARRAY['Finance', 'Football', 'Volunteering', 'Travel', 'Gaming'],
  ST_SetSRID(ST_MakePoint(36.8219, -1.2921), 4326)::geography, -- Nairobi
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Male Profile 4 - Yusuf (Spain - Madrid)
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004',
  'yusuf.test4@testuser.com',
  'Yusuf',
  'Martinez',
  'male',
  '1985-10-03',
  '178 cm',
  'Mixed',
  'Spain',
  'Widowed',
  true,
  'very_practicing',
  'Sunni',
  false,
  'Master''s Degree',
  'School Principal',
  'Revert Muslim of 12 years, strong in faith. Looking for a pious partner who can be a mother figure to my children. I lead the local Islamic school and am passionate about education.',
  ARRAY[
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
  ],
  ARRAY['Education', 'Islamic Studies', 'Community Work', 'Reading', 'Hiking'],
  ST_SetSRID(ST_MakePoint(-3.7038, 40.4168), 4326)::geography, -- Madrid
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Male Profile 5 - Ali (Austria - Vienna)
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb005',
  'ali.test5@testuser.com',
  'Ali',
  'Mueller',
  'male',
  '1997-07-08',
  '182 cm',
  'European',
  'Austria',
  'Never Married',
  false,
  'not_practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Software Developer',
  'Tech enthusiast, cultural Muslim. Looking for someone open-minded who enjoys the good things in life. I love coding, gaming, and exploring new technologies. Work-life balance is important to me.',
  ARRAY[
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800'
  ],
  ARRAY['Coding', 'Gaming', 'Traveling', 'Music', 'Gym'],
  ST_SetSRID(ST_MakePoint(16.3738, 48.2082), 4326)::geography, -- Vienna
  'occasionally',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Male Profile 6 - Karim (Tunisia - Tunis)
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb006',
  'karim.test6@testuser.com',
  'Karim',
  'Bouazizi',
  'male',
  '1994-03-12',
  '177 cm',
  'North African',
  'Tunisia',
  'Never Married',
  false,
  'practicing',
  'Sunni',
  true,
  'Master''s Degree',
  'Pharmacist',
  'Healthcare professional with strong family values. Looking for a partner to share life''s journey with. I own my own pharmacy and love cooking traditional Tunisian dishes.',
  ARRAY[
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
  ],
  ARRAY['Healthcare', 'Football', 'Cooking', 'Swimming', 'Reading'],
  ST_SetSRID(ST_MakePoint(10.1815, 36.8065), 4326)::geography, -- Tunis
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Male Profile 7 - Timur (Uzbekistan - Tashkent)
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb007',
  'timur.test7@testuser.com',
  'Timur',
  'Karimov',
  'male',
  '1990-09-28',
  '183 cm',
  'Central Asian',
  'Uzbekistan',
  'Annulled',
  false,
  'moderately_practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Restaurant Owner',
  'Entrepreneur with a passion for halal food and culture. Looking for a supportive partner who appreciates good food and family values. I run two restaurants and love hospitality.',
  ARRAY[
    'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=800',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
  ],
  ARRAY['Business', 'Cooking', 'Hospitality', 'Travel', 'Cars'],
  ST_SetSRID(ST_MakePoint(69.2401, 41.2995), 4326)::geography, -- Tashkent
  'never',
  'occasionally',
  NOW(),
  NOW(),
  NOW(),
  true
),
-- Male Profile 8 - Hassan (Egypt - Cairo)
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb008',
  'hassan.test8@testuser.com',
  'Hassan',
  'El-Masri',
  'male',
  '1999-11-15',
  '176 cm',
  'Arab',
  'Egypt',
  'Never Married',
  false,
  'practicing',
  'Sunni',
  true,
  'Bachelor''s Degree',
  'Medical Student',
  'Future doctor with big dreams. Looking for someone patient and supportive as I complete my studies. I love basketball, video games, and spending time with family. InshaAllah I''ll be a surgeon one day!',
  ARRAY[
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800'
  ],
  ARRAY['Medicine', 'Basketball', 'Video Games', 'Movies', 'Gym'],
  ST_SetSRID(ST_MakePoint(31.2357, 30.0444), 4326)::geography, -- Cairo
  'never',
  'never',
  NOW(),
  NOW(),
  NOW(),
  true
);

-- STEP 3: Insert prompts for all profiles
-- First, ensure the user_prompts table exists
CREATE TABLE IF NOT EXISTS public.user_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delete existing prompts for test users
DELETE FROM public.user_prompts WHERE user_id IN (
  SELECT id FROM public.users WHERE email LIKE '%@testuser.com'
);

-- Insert prompts for Female profiles
INSERT INTO public.user_prompts (user_id, question, answer, display_order) VALUES
-- Fatima's prompts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'What''s your ideal weekend?', 'Starting with Fajr prayer, followed by a nice breakfast with family. Then maybe some hiking or reading in a cozy cafe. Evening barbecue with loved ones!', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'What are you looking for in a partner?', 'Someone who is strong in his deen, kind-hearted, and has a good sense of humor. Family-oriented and ambitious.', 2),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'What''s something you''re passionate about?', 'Technology and how it can be used to benefit the Muslim community. I''m working on an app for Quran memorization!', 3),

-- Aisha's prompts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'What''s the most important lesson life has taught you?', 'That Allah''s plans are always better than our own. My divorce taught me patience and trust in His timing.', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'What makes you laugh?', 'My patients! Kids say the funniest things. Also, good memes and spending time with my sisters.', 2),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'What are your dealbreakers?', 'Dishonesty and someone who doesn''t accept my daughter. She comes first, always.', 3),

-- Khadija's prompts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'What''s your love language?', 'Quality time and words of affirmation. I love deep conversations over good food.', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'Describe your perfect date', 'Art gallery in the afternoon, followed by dinner at a nice restaurant, and a walk under the stars.', 2),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'What''s a goal you''re working towards?', 'Starting my own creative agency that focuses on ethical branding for Muslim businesses.', 3),

-- Maryam's prompts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'What drew you to Islam?', 'The logic, the peace, and the community. I found answers I had been searching for my whole life.', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'What''s your favorite book?', 'Reclaim Your Heart by Yasmin Mogahed. It helped me through my most difficult times.', 2),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'What does family mean to you?', 'Everything. My children are my world, and I hope to find someone who values family as much as I do.', 3),

-- Sarah's prompts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', 'What''s your idea of adventure?', 'Backpacking through Southeast Asia, trying street food, and getting lost in new cities!', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', 'What are you most proud of?', 'Building my design portfolio from scratch and landing clients from around the world.', 2),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', 'What type of person are you looking for?', 'Someone open-minded, cultured, and who appreciates both spontaneity and cozy nights in.', 3),

-- Layla's prompts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006', 'What''s your favorite thing about your culture?', 'Moroccan hospitality! There''s nothing like mint tea with family and the sound of the adhan in the medina.', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006', 'What''s a hidden talent you have?', 'I''m actually a pretty good calligrapher. I do Arabic calligraphy as a form of meditation.', 2),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006', 'What''s your dream project?', 'Designing a mosque that combines traditional Islamic architecture with modern sustainability.', 3),

-- Amina's prompts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', 'What''s the best advice you''ve received?', '"This too shall pass." Simple but powerful during difficult times.', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', 'What''s your comfort food?', 'Nasi lemak with extra sambal! Nothing beats Malaysian breakfast.', 2),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007', 'How do you spend your free time?', 'Exploring new coffee shops, reading business books, and hiking with friends.', 3),

-- Noor's prompts
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008', 'What''s your biggest dream?', 'To inspire young Muslim women through my content and show that you can be practicing and successful.', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008', 'What''s your fitness routine?', 'Morning runs, HIIT workouts 3x a week, and women-only yoga classes. Fitness is my therapy!', 2),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa008', 'What makes you unique?', 'I''m building my own brand while staying true to my values. Not everyone gets it, but I do me!', 3);

-- Insert prompts for Male profiles
INSERT INTO public.user_prompts (user_id, question, answer, display_order) VALUES
-- Omar's prompts
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', 'What does your ideal future look like?', 'A beautiful home filled with the sound of children reciting Quran, a loving wife, and being able to give back to my community.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', 'What''s your morning routine?', 'Fajr, Quran recitation, gym, healthy breakfast, then work. Discipline is key!', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', 'What are you grateful for?', 'My faith, my family, and the opportunities Allah has blessed me with. Alhamdulillah for everything.', 3),

-- Ahmed's prompts
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'What''s your approach to parenting?', 'Leading by example. My daughter learns more from watching me than from anything I say.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'What are you passionate about?', 'Scientific research that can benefit humanity. Currently working on sustainable energy solutions.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', 'What type of partner are you seeking?', 'Someone patient, nurturing, and who sees my daughter as a blessing, not a burden.', 3),

-- Ibrahim's prompts
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', 'What''s your idea of fun?', 'Football with the boys, good food, and spontaneous road trips. Life is meant to be enjoyed!', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', 'What motivates you?', 'Providing for my future family and making my parents proud. They sacrificed so much for me.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', 'What''s a skill you''re learning?', 'Arabic! I can read Quran but want to understand it fully. Taking online classes.', 3),

-- Yusuf's prompts
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004', 'What attracted you to Islam?', 'The peace of prayer, the logic of monotheism, and the beautiful community that embraced me as a brother.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004', 'What''s your biggest achievement?', 'Raising two kind, practicing Muslim children after losing their mother. She would be proud.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004', 'What do you value most in a relationship?', 'Honesty, patience, and a shared commitment to raising children with strong Islamic values.', 3),

-- Ali's prompts
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb005', 'What''s your favorite project?', 'An app I built that connects Muslim students for study groups. Technology bringing people together!', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb005', 'What''s your idea of a perfect evening?', 'Gaming session with friends, pizza, and good vibes. Simple pleasures!', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb005', 'What are you looking for?', 'Someone chill, open-minded, who doesn''t take life too seriously. Let''s have fun together!', 3),

-- Karim's prompts
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb006', 'What''s your specialty dish?', 'Couscous with lamb - my grandmother''s recipe. I cook it every Friday for my parents.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb006', 'What''s important to you in marriage?', 'Trust, communication, and supporting each other''s dreams. We should be a team.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb006', 'What do you do to stay healthy?', 'Football twice a week, swimming, and my mom''s home cooking (better than any diet!)', 3),

-- Timur's prompts
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb007', 'What inspired you to start your business?', 'My father''s restaurant. Watching him serve people with love taught me the value of hospitality.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb007', 'What''s your 5-year plan?', 'Expand to 5 restaurants, get married, start a family, and maybe do Hajj together.', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb007', 'What''s your love language?', 'Acts of service. I show love through cooking, helping, and being there when needed.', 3),

-- Hassan's prompts
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb008', 'What drives you to become a doctor?', 'Helping people in my community. Growing up, I saw how little access we had to healthcare.', 1),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb008', 'What do you do for fun?', 'Basketball with friends, gaming, and exploring Cairo''s street food scene!', 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb008', 'What are you looking for in a partner?', 'Someone patient (medical school is tough!), supportive, and who shares my ambition to make a difference.', 3);

-- STEP 4: Verify the inserted profiles
SELECT 
  first_name, 
  last_name, 
  gender, 
  ethnicity, 
  marital_status, 
  has_children, 
  religious_practice,
  array_length(photos, 1) as photo_count,
  EXTRACT(YEAR FROM AGE(dob::date)) as age,
  ST_X(location::geometry) as longitude,
  ST_Y(location::geometry) as latitude
FROM public.users 
WHERE email LIKE '%@testuser.com'
ORDER BY gender, first_name;

-- Verify prompts
SELECT 
  u.first_name,
  COUNT(p.id) as prompt_count
FROM public.users u
LEFT JOIN public.user_prompts p ON u.id = p.user_id
WHERE u.email LIKE '%@testuser.com'
GROUP BY u.first_name
ORDER BY u.first_name;

-- =============================================================================
-- TO CLEAN UP TEST DATA LATER:
-- =============================================================================
-- DELETE FROM public.user_prompts WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE '%@testuser.com');
-- DELETE FROM public.users WHERE email LIKE '%@testuser.com';
-- 
-- To restore the foreign key constraint after cleanup:
-- ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
