INSERT INTO public.team_members (name, title, category, bio, profile_card_url, contact_email, website, active)
VALUES
  ('Mulalo Nemataheni', 'Certified Financial Planner (CFP®)', 'Finance & Accounting',
   'Financial professional and community builder passionate about empowering individuals through financial literacy. Founder of Mufhatu Savings Club and President of ImPower''d Woman.',
   '/__l5e/assets-v1/73fa3639-b903-4451-9639-71efd35edb44/mulalo-nemataheni-card.jpeg',
   'mulalonemataheni@yahoo.com', NULL, true),
  ('Caroline Njuguna', 'Founder — Becandsure Financial Services', 'Insurance & Risk',
   'Independently owned insurance and financial services brokerage offering Insurance Broking, Reinsurance Broking, Financial Planning and Risk Advisory across Southern and Eastern Africa.',
   '/__l5e/assets-v1/b24e335e-0aae-4d72-b9de-a8b78cdf7460/caroline-njuguna-card.jpeg',
   'carolinen@becandsure.co.za', 'https://www.becandsure.co.za', true),
  ('Ditebogo Rose Malele', 'Counselling Psychologist & Family Law Mediator', 'Health & Wellness',
   'Founder of Healing Talk — counselling and mediation services. Voice of the Child practitioner supporting individuals, children and families through compassionate, evidence-based practice.',
   '/__l5e/assets-v1/ed733db5-21d8-49e4-9269-ceb9a56dc61f/ditebogo-malele-card.jpeg',
   'healingtalk2020@gmail.com', NULL, true),
  ('Ms Lemogang', 'Founder & Entrepreneur — Humangtumelo / LN Lore Services', 'Leadership',
   'Founder of Humangtumelo Centre of Excellence and LN Lore Services. Facilitator, skills development provider, distributor and author — "Leading I, connecting us to sustainable futures."',
   '/__l5e/assets-v1/07a0cecd-7878-46e1-9165-73e27584e9b7/lemogang-card.jpeg',
   NULL, NULL, true)
ON CONFLICT DO NOTHING;