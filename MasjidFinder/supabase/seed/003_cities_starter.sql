-- ============================================================================
-- STARTER major cities for priority launch markets, wired to the states
-- seeded in 002. Same disclaimer as 002: not exhaustive for 197 countries;
-- demonstrates the working country -> state -> city cascade end-to-end.
-- Admin adds more through Admin Panel > Locations, no deploy required.
-- ============================================================================

do $$
declare v_state uuid; v_country uuid;
begin
  -- INDIA
  select id into v_country from countries where iso2='IN';
  select id into v_state from states where country_id=v_country and name='Maharashtra';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Mumbai', 19.0760, 72.8777, 1),
    (v_country, v_state, 'Pune', 18.5204, 73.8567, 2),
    (v_country, v_state, 'Nagpur', 21.1458, 79.0882, 3)
  on conflict (country_id, state_id, name) do nothing;

  select id into v_state from states where country_id=v_country and name='Delhi (NCT)';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'New Delhi', 28.6139, 77.2090, 1)
  on conflict (country_id, state_id, name) do nothing;

  select id into v_state from states where country_id=v_country and name='Bihar';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Patna', 25.5941, 85.1376, 1),
    (v_country, v_state, 'Gaya', 24.7955, 84.9994, 2)
  on conflict (country_id, state_id, name) do nothing;

  select id into v_state from states where country_id=v_country and name='Uttar Pradesh';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Lucknow', 26.8467, 80.9462, 1),
    (v_country, v_state, 'Deoband', 29.6906, 77.6822, 2)
  on conflict (country_id, state_id, name) do nothing;

  select id into v_state from states where country_id=v_country and name='Telangana';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Hyderabad', 17.3850, 78.4867, 1)
  on conflict (country_id, state_id, name) do nothing;

  select id into v_state from states where country_id=v_country and name='Karnataka';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Bengaluru', 12.9716, 77.5946, 1)
  on conflict (country_id, state_id, name) do nothing;

  select id into v_state from states where country_id=v_country and name='Kerala';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Kozhikode', 11.2588, 75.7804, 1),
    (v_country, v_state, 'Malappuram', 11.0410, 76.0787, 2)
  on conflict (country_id, state_id, name) do nothing;

  select id into v_state from states where country_id=v_country and name='West Bengal';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Kolkata', 22.5726, 88.3639, 1)
  on conflict (country_id, state_id, name) do nothing;

  -- PAKISTAN
  select id into v_country from countries where iso2='PK';
  select id into v_state from states where country_id=v_country and name='Sindh';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Karachi', 24.8607, 67.0011, 1)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Punjab';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Lahore', 31.5497, 74.3436, 1),
    (v_country, v_state, 'Multan', 30.1575, 71.5249, 2)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Islamabad Capital Territory';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Islamabad', 33.6844, 73.0479, 1)
  on conflict (country_id, state_id, name) do nothing;

  -- BANGLADESH
  select id into v_country from countries where iso2='BD';
  select id into v_state from states where country_id=v_country and name='Dhaka Division';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Dhaka', 23.8103, 90.4125, 1)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Chattogram Division';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Chattogram', 22.3569, 91.7832, 1)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Sylhet Division';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Sylhet', 24.8949, 91.8687, 1)
  on conflict (country_id, state_id, name) do nothing;

  -- SAUDI ARABIA
  select id into v_country from countries where iso2='SA';
  select id into v_state from states where country_id=v_country and name='Makkah Region';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Makkah', 21.3891, 39.8579, 1),
    (v_country, v_state, 'Jeddah', 21.4858, 39.1925, 2)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Madinah Region';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Madinah', 24.5247, 39.5692, 1)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Riyadh Region';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Riyadh', 24.7136, 46.6753, 1)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Eastern Province';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Dammam', 26.4207, 50.0888, 1)
  on conflict (country_id, state_id, name) do nothing;

  -- UAE
  select id into v_country from countries where iso2='AE';
  select id into v_state from states where country_id=v_country and name='Dubai';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Dubai', 25.2048, 55.2708, 1)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Abu Dhabi';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Abu Dhabi', 24.4539, 54.3773, 1)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Sharjah';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Sharjah', 25.3463, 55.4209, 1)
  on conflict (country_id, state_id, name) do nothing;

  -- QATAR
  select id into v_country from countries where iso2='QA';
  select id into v_state from states where country_id=v_country and name='Doha';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Doha', 25.2854, 51.5310, 1)
  on conflict (country_id, state_id, name) do nothing;

  -- UK
  select id into v_country from countries where iso2='GB';
  select id into v_state from states where country_id=v_country and name='England';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'London', 51.5074, -0.1278, 1),
    (v_country, v_state, 'Birmingham', 52.4862, -1.8904, 2),
    (v_country, v_state, 'Manchester', 53.4808, -2.2426, 3),
    (v_country, v_state, 'Bradford', 53.7960, -1.7594, 4)
  on conflict (country_id, state_id, name) do nothing;

  -- USA
  select id into v_country from countries where iso2='US';
  select id into v_state from states where country_id=v_country and name='New York';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'New York City', 40.7128, -74.0060, 1)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='Texas';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Houston', 29.7604, -95.3698, 1),
    (v_country, v_state, 'Dallas', 32.7767, -96.7970, 2)
  on conflict (country_id, state_id, name) do nothing;
  select id into v_state from states where country_id=v_country and name='California';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, v_state, 'Los Angeles', 34.0522, -118.2437, 1)
  on conflict (country_id, state_id, name) do nothing;

  -- SINGAPORE (no state layer — city attaches directly to country)
  select id into v_country from countries where iso2='SG';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, null, 'Singapore', 1.3521, 103.8198, 1)
  on conflict (country_id, state_id, name) do nothing;

  -- BAHRAIN (no state layer)
  select id into v_country from countries where iso2='BH';
  insert into cities (country_id, state_id, name, latitude, longitude, sort_order) values
    (v_country, null, 'Manama', 26.2285, 50.5860, 1)
  on conflict (country_id, state_id, name) do nothing;

end $$;
