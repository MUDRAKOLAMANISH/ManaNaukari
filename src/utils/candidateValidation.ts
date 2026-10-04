/**
 * Candidate Validation Utilities for Mana Naukari
 * Enforces strict verification of Indian Mobile Numbers and Genuine Email Addresses.
 */

export interface MobileValidationResult {
  isValid: boolean;
  error?: string;
  cleanNumber: string;
}

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  cleanEmail: string;
}

/**
 * Common fake, disposable, or test email domains to reject.
 */
const REJECTED_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'testing.com',
  'sample.com',
  'dummy.com',
  'fake.com',
  'asdf.com',
  'qwerty.com',
  'none.com',
  'noemail.com',
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwaway.com',
  'yopmail.com',
  'sharklasers.com',
  'dispostable.com',
  'trashmail.com',
  'getnada.com',
  'burnermail.io',
  'fakeinbox.com',
  'temp-mail.org',
  'minutemail.com',
  'crazymailing.com',
  'tempail.com',
  'mytemp.email',
]);

/**
 * Obvious fake usernames to reject
 */
const REJECTED_USERNAMES = new Set([
  'test',
  'testing',
  'fake',
  'asdf',
  'qwerty',
  'dummy',
  'sample',
  'temp',
  'noemail',
  'abc',
  'aaa',
  '123',
  '12345',
  'admin',
  'user',
  'candidate',
]);

/**
 * Obvious repetitive or sequential Indian mobile number patterns
 */
const OBVIOUS_SEQUENCES = new Set([
  '0123456789',
  '1234567890',
  '2345678901',
  '3456789012',
  '4567890123',
  '5678901234',
  '6789012345',
  '7890123456',
  '8901234567',
  '9876543210',
  '8765432109',
  '7654321098',
  '6543210987',
  '5432109876',
  '4321098765',
  '1212121212',
  '9898989898',
  '6767676767',
  '8989898989',
  '9090909090',
  '1234512345',
  '1234554321',
  '9876556789',
]);

/**
 * 3. MOBILE VALIDATION
 * For Indian mobile numbers:
 * - Exactly 10 digits
 * - Must start with 6, 7, 8, or 9
 * - Reject repeated fake numbers such as 0000000000 or 1111111111
 * - Reject obvious invalid sequences
 */
export function validateIndianMobile(rawPhone: string): MobileValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      error: 'Mobile number is required.',
      cleanNumber: '',
    };
  }

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // Handle +91 or 91 country code prefix (e.g. 919876543210 -> 9876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  // Handle leading 0 prefix (e.g. 09876543210 -> 9876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Must be exactly 10 digits
  if (digits.length !== 10) {
    return {
      isValid: false,
      error: 'Please enter a valid 10-digit Indian mobile number.',
      cleanNumber: digits,
    };
  }

  // Must start with 6, 7, 8, or 9
  const firstDigit = digits.charAt(0);
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return {
      isValid: false,
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9.',
      cleanNumber: digits,
    };
  }

  // Reject repeated numbers (e.g. 0000000000, 1111111111, 9999999999)
  if (/^(\d)\1{9}$/.test(digits)) {
    return {
      isValid: false,
      error: 'Please provide a genuine mobile number. Repeated digits are not accepted.',
      cleanNumber: digits,
    };
  }

  // Reject obvious invalid sequences
  if (OBVIOUS_SEQUENCES.has(digits)) {
    return {
      isValid: false,
      error: 'Please provide a genuine mobile number. Sequential test numbers are not accepted.',
      cleanNumber: digits,
    };
  }

  // Reject numbers with fewer than 3 unique digits (e.g. 9999988888, 9898989898)
  const uniqueDigits = new Set(digits.split(''));
  if (uniqueDigits.size < 3) {
    return {
      isValid: false,
      error: 'Please enter a valid, active mobile number.',
      cleanNumber: digits,
    };
  }

  return {
    isValid: true,
    cleanNumber: digits,
  };
}

/**
 * 4. EMAIL VALIDATION
 * Validate proper email format.
 * Reject obviously invalid addresses.
 */
export function validateCandidateEmail(rawEmail: string): EmailValidationResult {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return {
      isValid: false,
      error: 'Email address is required.',
      cleanEmail: '',
    };
  }

  const cleanEmail = rawEmail.trim().toLowerCase();

  // Basic RFC email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleanEmail)) {
    return {
      isValid: false,
      error: 'Please enter a properly formatted email address (e.g. name@domain.com).',
      cleanEmail,
    };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: 'Invalid email address format.',
      cleanEmail,
    };
  }

  const [username, domain] = parts;

  // Disallow consecutive dots
  if (username.includes('..') || domain.includes('..')) {
    return {
      isValid: false,
      error: 'Email address cannot contain consecutive dots.',
      cleanEmail,
    };
  }

  // Check username minimum length
  if (username.length < 2) {
    return {
      isValid: false,
      error: 'Email username must be at least 2 characters.',
      cleanEmail,
    };
  }

  // Check username obvious fake patterns
  if (REJECTED_USERNAMES.has(username) || /^(\w)\1{2,}$/.test(username)) {
    return {
      isValid: false,
      error: 'Please enter your genuine personal or professional email address.',
      cleanEmail,
    };
  }

  // Domain checks
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return {
      isValid: false,
      error: 'Email domain must have a valid extension (e.g. .com, .in).',
      cleanEmail,
    };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return {
      isValid: false,
      error: 'Email domain has an invalid top-level domain extension.',
      cleanEmail,
    };
  }

  // Check rejected/disposable domains
  if (REJECTED_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Disposable, temporary, or test email addresses are not accepted. Please use your active email.',
      cleanEmail,
    };
  }

  return {
    isValid: true,
    cleanEmail,
  };
}

/**
 * 8. UI Email Masking Helper
 * Formats email as "m***@gmail.com" as specified in Requirement 8.
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (!local) return email;
  const firstChar = local.charAt(0);
  return `${firstChar}***@${domain}`;
}
