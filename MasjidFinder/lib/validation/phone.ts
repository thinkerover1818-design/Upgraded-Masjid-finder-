import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export interface PhoneValidationResult {
  valid: boolean;
  e164: string | null;
  error?: string;
}

/**
 * Validates a phone number against the SELECTED country (never hard-codes
 * +91 or any other default). `countryIso2` comes from the user's chosen
 * country in the signup form's country dropdown, not from browser locale.
 */
export function validateInternationalPhone(
  rawInput: string,
  countryIso2: string
): PhoneValidationResult {
  if (!rawInput || rawInput.trim().length === 0) {
    return { valid: false, e164: null, error: "Phone number is required." };
  }
  if (!countryIso2 || countryIso2.length !== 2) {
    return { valid: false, e164: null, error: "Select a country first." };
  }

  const phoneNumber = parsePhoneNumberFromString(rawInput, countryIso2.toUpperCase() as CountryCode);

  if (!phoneNumber || !phoneNumber.isValid()) {
    return {
      valid: false,
      e164: null,
      error: "That doesn't look like a valid phone number for the selected country.",
    };
  }

  return { valid: true, e164: phoneNumber.number }; // E.164, e.g. +919876543210
}
