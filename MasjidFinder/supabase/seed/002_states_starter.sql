-- ============================================================================
-- STARTER states/provinces for priority launch markets.
-- This is NOT an exhaustive global states dataset (a fully accurate
-- state/province list for all 197 countries is out of scope to hand-author
-- reliably). The country/state/city architecture supports ANY country
-- working exactly like these do -- admins add remaining states/cities
-- through the Admin Panel > Locations screen (backed by supabase/functions
-- or direct table writes with the service role), with zero app code changes.
-- ============================================================================

do $$
declare v_country uuid;
begin
  -- INDIA
  select id into v_country from countries where iso2 = 'IN';
  insert into states (country_id, name, code, sort_order) values
  (v_country,'Andhra Pradesh','AP',1),(v_country,'Arunachal Pradesh','AR',2),(v_country,'Assam','AS',3),
  (v_country,'Bihar','BR',4),(v_country,'Chhattisgarh','CG',5),(v_country,'Goa','GA',6),
  (v_country,'Gujarat','GJ',7),(v_country,'Haryana','HR',8),(v_country,'Himachal Pradesh','HP',9),
  (v_country,'Jharkhand','JH',10),(v_country,'Karnataka','KA',11),(v_country,'Kerala','KL',12),
  (v_country,'Madhya Pradesh','MP',13),(v_country,'Maharashtra','MH',14),(v_country,'Manipur','MN',15),
  (v_country,'Meghalaya','ML',16),(v_country,'Mizoram','MZ',17),(v_country,'Nagaland','NL',18),
  (v_country,'Odisha','OD',19),(v_country,'Punjab','PB',20),(v_country,'Rajasthan','RJ',21),
  (v_country,'Sikkim','SK',22),(v_country,'Tamil Nadu','TN',23),(v_country,'Telangana','TG',24),
  (v_country,'Tripura','TR',25),(v_country,'Uttar Pradesh','UP',26),(v_country,'Uttarakhand','UK',27),
  (v_country,'West Bengal','WB',28),(v_country,'Delhi (NCT)','DL',29),(v_country,'Jammu and Kashmir','JK',30)
  on conflict (country_id, name) do nothing;

  -- PAKISTAN
  select id into v_country from countries where iso2 = 'PK';
  insert into states (country_id, name, code, sort_order) values
  (v_country,'Punjab','PB',1),(v_country,'Sindh','SD',2),(v_country,'Khyber Pakhtunkhwa','KP',3),
  (v_country,'Balochistan','BA',4),(v_country,'Gilgit-Baltistan','GB',5),
  (v_country,'Azad Jammu and Kashmir','AJK',6),(v_country,'Islamabad Capital Territory','ICT',7)
  on conflict (country_id, name) do nothing;

  -- BANGLADESH
  select id into v_country from countries where iso2 = 'BD';
  insert into states (country_id, name, sort_order) values
  (v_country,'Dhaka Division',1),(v_country,'Chattogram Division',2),(v_country,'Rajshahi Division',3),
  (v_country,'Khulna Division',4),(v_country,'Barishal Division',5),(v_country,'Sylhet Division',6),
  (v_country,'Rangpur Division',7),(v_country,'Mymensingh Division',8)
  on conflict (country_id, name) do nothing;

  -- SAUDI ARABIA
  select id into v_country from countries where iso2 = 'SA';
  insert into states (country_id, name, sort_order) values
  (v_country,'Riyadh Region',1),(v_country,'Makkah Region',2),(v_country,'Madinah Region',3),
  (v_country,'Eastern Province',4),(v_country,'Asir Region',5),(v_country,'Qassim Region',6),
  (v_country,'Tabuk Region',7),(v_country,'Hail Region',8),(v_country,'Jazan Region',9),
  (v_country,'Najran Region',10),(v_country,'Al Bahah Region',11),(v_country,'Al Jouf Region',12),
  (v_country,'Northern Borders Region',13)
  on conflict (country_id, name) do nothing;

  -- UAE
  select id into v_country from countries where iso2 = 'AE';
  insert into states (country_id, name, sort_order) values
  (v_country,'Abu Dhabi',1),(v_country,'Dubai',2),(v_country,'Sharjah',3),(v_country,'Ajman',4),
  (v_country,'Umm Al Quwain',5),(v_country,'Ras Al Khaimah',6),(v_country,'Fujairah',7)
  on conflict (country_id, name) do nothing;

  -- QATAR (municipalities)
  select id into v_country from countries where iso2 = 'QA';
  insert into states (country_id, name, sort_order) values
  (v_country,'Doha',1),(v_country,'Al Rayyan',2),(v_country,'Al Wakrah',3),(v_country,'Al Khor',4),
  (v_country,'Umm Salal',5),(v_country,'Al Daayen',6),(v_country,'Al Shamal',7),(v_country,'Al Shahaniya',8)
  on conflict (country_id, name) do nothing;

  -- UNITED KINGDOM
  select id into v_country from countries where iso2 = 'GB';
  insert into states (country_id, name, sort_order) values
  (v_country,'England',1),(v_country,'Scotland',2),(v_country,'Wales',3),(v_country,'Northern Ireland',4)
  on conflict (country_id, name) do nothing;

  -- UNITED STATES
  select id into v_country from countries where iso2 = 'US';
  insert into states (country_id, name, code, sort_order)
  select v_country, s.name, s.code, row_number() over ()
  from (values
    ('Alabama','AL'),('Alaska','AK'),('Arizona','AZ'),('Arkansas','AR'),('California','CA'),
    ('Colorado','CO'),('Connecticut','CT'),('Delaware','DE'),('Florida','FL'),('Georgia','GA'),
    ('Hawaii','HI'),('Idaho','ID'),('Illinois','IL'),('Indiana','IN'),('Iowa','IA'),('Kansas','KS'),
    ('Kentucky','KY'),('Louisiana','LA'),('Maine','ME'),('Maryland','MD'),('Massachusetts','MA'),
    ('Michigan','MI'),('Minnesota','MN'),('Mississippi','MS'),('Missouri','MO'),('Montana','MT'),
    ('Nebraska','NE'),('Nevada','NV'),('New Hampshire','NH'),('New Jersey','NJ'),('New Mexico','NM'),
    ('New York','NY'),('North Carolina','NC'),('North Dakota','ND'),('Ohio','OH'),('Oklahoma','OK'),
    ('Oregon','OR'),('Pennsylvania','PA'),('Rhode Island','RI'),('South Carolina','SC'),
    ('South Dakota','SD'),('Tennessee','TN'),('Texas','TX'),('Utah','UT'),('Vermont','VT'),
    ('Virginia','VA'),('Washington','WA'),('West Virginia','WV'),('Wisconsin','WI'),('Wyoming','WY')
  ) as s(name, code)
  on conflict (country_id, name) do nothing;

  -- CANADA
  select id into v_country from countries where iso2 = 'CA';
  insert into states (country_id, name, code, sort_order) values
  (v_country,'Ontario','ON',1),(v_country,'Quebec','QC',2),(v_country,'British Columbia','BC',3),
  (v_country,'Alberta','AB',4),(v_country,'Manitoba','MB',5),(v_country,'Saskatchewan','SK',6),
  (v_country,'Nova Scotia','NS',7),(v_country,'New Brunswick','NB',8),
  (v_country,'Newfoundland and Labrador','NL',9),(v_country,'Prince Edward Island','PE',10)
  on conflict (country_id, name) do nothing;

  -- AUSTRALIA
  select id into v_country from countries where iso2 = 'AU';
  insert into states (country_id, name, code, sort_order) values
  (v_country,'New South Wales','NSW',1),(v_country,'Victoria','VIC',2),(v_country,'Queensland','QLD',3),
  (v_country,'Western Australia','WA',4),(v_country,'South Australia','SA',5),
  (v_country,'Tasmania','TAS',6),(v_country,'Australian Capital Territory','ACT',7),
  (v_country,'Northern Territory','NT',8)
  on conflict (country_id, name) do nothing;

  -- EGYPT (top governorates only, starter set)
  select id into v_country from countries where iso2 = 'EG';
  insert into states (country_id, name, sort_order) values
  (v_country,'Cairo Governorate',1),(v_country,'Alexandria Governorate',2),(v_country,'Giza Governorate',3)
  on conflict (country_id, name) do nothing;

  -- TURKEY (top provinces only, starter set)
  select id into v_country from countries where iso2 = 'TR';
  insert into states (country_id, name, sort_order) values
  (v_country,'Istanbul',1),(v_country,'Ankara',2),(v_country,'Izmir',3)
  on conflict (country_id, name) do nothing;

  -- MALAYSIA
  select id into v_country from countries where iso2 = 'MY';
  insert into states (country_id, name, sort_order) values
  (v_country,'Selangor',1),(v_country,'Kuala Lumpur',2),(v_country,'Penang',3),(v_country,'Johor',4),
  (v_country,'Sabah',5),(v_country,'Sarawak',6)
  on conflict (country_id, name) do nothing;

  -- INDONESIA (top provinces only, starter set)
  select id into v_country from countries where iso2 = 'ID';
  insert into states (country_id, name, sort_order) values
  (v_country,'Jakarta',1),(v_country,'West Java',2),(v_country,'East Java',3),(v_country,'Central Java',4)
  on conflict (country_id, name) do nothing;

  -- NIGERIA (top states only, starter set)
  select id into v_country from countries where iso2 = 'NG';
  insert into states (country_id, name, sort_order) values
  (v_country,'Lagos',1),(v_country,'Kano',2),(v_country,'Kaduna',3),(v_country,'Abuja (FCT)',4)
  on conflict (country_id, name) do nothing;

end $$;

-- Countries with a flat (no-state) address model, e.g. small city-states,
-- do not require rows in `states` at all -- `cities.state_id` is nullable
-- specifically so a city can attach directly to a country (Singapore, Bahrain,
-- Qatar's municipalities are already covered above, Monaco, Vatican, etc.)
