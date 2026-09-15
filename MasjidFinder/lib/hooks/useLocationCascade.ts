"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CountryOption {
  id: string;
  name: string;
  iso2: string;
  calling_code: string;
  currency_code: string;
  currency_symbol: string;
  flag_emoji: string | null;
}
export interface StateOption {
  id: string;
  name: string;
}
export interface CityOption {
  id: string;
  name: string;
}

/**
 * Drives the Country -> State/Province -> City cascade used across every
 * signup/profile/masjid/madrasa/event form. All options come from the real
 * `countries`/`states`/`cities` tables (0002 migration) — nothing here is a
 * hard-coded list, and adding/renaming/disabling a country/state/city on the
 * backend is reflected immediately with zero frontend changes.
 */
export function useLocationCascade() {
  const supabase = createClient();
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingCountries(true);
    supabase
      .from("countries")
      .select("id, name, iso2, calling_code, currency_code, currency_symbol, flag_emoji")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(`Could not load countries: ${error.message}`);
        } else {
          setCountries(data ?? []);
        }
        setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStates = useCallback(async (countryId: string | null) => {
    setStates([]);
    setCities([]);
    if (!countryId) return;
    setLoadingStates(true);
    const { data, error } = await supabase
      .from("states")
      .select("id, name")
      .eq("country_id", countryId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) setError(`Could not load states: ${error.message}`);
    setStates(data ?? []);
    setLoadingStates(false);
  }, [supabase]);

  const loadCities = useCallback(
    async (countryId: string | null, stateId: string | null) => {
      setCities([]);
      if (!countryId) return;
      setLoadingCities(true);
      let query = supabase
        .from("cities")
        .select("id, name")
        .eq("country_id", countryId)
        .eq("is_active", true);
      query = stateId ? query.eq("state_id", stateId) : query.is("state_id", null);
      const { data, error } = await query
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) setError(`Could not load cities: ${error.message}`);
      setCities(data ?? []);
      setLoadingCities(false);
    },
    [supabase]
  );

  return {
    countries,
    states,
    cities,
    loadingCountries,
    loadingStates,
    loadingCities,
    loadStates,
    loadCities,
    error,
  };
}
