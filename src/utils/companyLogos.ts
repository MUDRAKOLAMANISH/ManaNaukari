import React from 'react';

/**
 * Company Brand Logo Registry & SVG Generator for ManaCarrier.
 * Provides crisp SVG logos for top IT MNCs, product companies, and Indian tech employers,
 * with a high-fidelity SVG monogram fallback for unlisted companies.
 */

interface CompanyBrandInfo {
  name: string;
  shortName: string;
  primaryColor: string;
  bgColor: string;
  logoUrl?: string;
  svgIcon?: string;
}

const KNOWN_COMPANIES: Record<string, CompanyBrandInfo> = {
  tcs: {
    name: 'Tata Consultancy Services',
    shortName: 'TCS',
    primaryColor: '#004B87',
    bgColor: '#E6F0FA',
    svgIcon: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/tcs.svg',
  },
  infosys: {
    name: 'Infosys',
    shortName: 'INFY',
    primaryColor: '#007CC3',
    bgColor: '#E5F3FA',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg',
  },
  wipro: {
    name: 'Wipro',
    shortName: 'WIPRO',
    primaryColor: '#782386',
    bgColor: '#F5E6F7',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Wipro_Primary_Logo_Color_RGB.svg',
  },
  accenture: {
    name: 'Accenture',
    shortName: 'ACN',
    primaryColor: '#A100FF',
    bgColor: '#F5E6FF',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Accenture.svg',
  },
  cognizant: {
    name: 'Cognizant',
    shortName: 'CTS',
    primaryColor: '#0033A0',
    bgColor: '#E6ECF7',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Cognizant_logo_2022.svg',
  },
  capgemini: {
    name: 'Capgemini',
    shortName: 'CAP',
    primaryColor: '#0070AD',
    bgColor: '#E5F2FA',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Capgemini_201x_logo.svg',
  },
  amazon: {
    name: 'Amazon',
    shortName: 'AMZN',
    primaryColor: '#FF9900',
    bgColor: '#FFF5E6',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
  },
  google: {
    name: 'Google',
    shortName: 'GOOG',
    primaryColor: '#4285F4',
    bgColor: '#EEF4FE',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
  },
  microsoft: {
    name: 'Microsoft',
    shortName: 'MSFT',
    primaryColor: '#F25022',
    bgColor: '#FEF0EE',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg',
  },
  ibm: {
    name: 'IBM',
    shortName: 'IBM',
    primaryColor: '#052FAD',
    bgColor: '#E6EBFA',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
  },
  deloitte: {
    name: 'Deloitte',
    shortName: 'DEL',
    primaryColor: '#86BC25',
    bgColor: '#F3F9E9',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/2/2B/Deloitte.svg',
  },
  flipkart: {
    name: 'Flipkart',
    shortName: 'FK',
    primaryColor: '#2874F0',
    bgColor: '#E9F1FE',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Flipkart_logo.svg',
  },
  swiggy: {
    name: 'Swiggy',
    shortName: 'SWG',
    primaryColor: '#FC8019',
    bgColor: '#FFF2E8',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/en/1/12/Swiggy_logo.svg',
  },
  zomato: {
    name: 'Zomato',
    shortName: 'ZOM',
    primaryColor: '#CB202D',
    bgColor: '#FAE8E9',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Zomato_Logo.svg',
  },
  paytm: {
    name: 'Paytm',
    shortName: 'PAYTM',
    primaryColor: '#002E6E',
    bgColor: '#E6EBF1',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo.svg',
  },
  phonepe: {
    name: 'PhonePe',
    shortName: 'PPE',
    primaryColor: '#5F259F',
    bgColor: '#F1E9FA',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg',
  },
  jio: {
    name: 'Jio',
    shortName: 'JIO',
    primaryColor: '#0A2540',
    bgColor: '#E6E9EE',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Reliance_Jio_Logo.svg',
  },
  hcl: {
    name: 'HCLTech',
    shortName: 'HCL',
    primaryColor: '#0054A6',
    bgColor: '#E6EEF6',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/HCLTech_logo.svg',
  },
  'tech mahindra': {
    name: 'Tech Mahindra',
    shortName: 'TECHM',
    primaryColor: '#E31837',
    bgColor: '#FCE8EA',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Tech_Mahindra_New_Logo.svg',
  },
  oracle: {
    name: 'Oracle',
    shortName: 'ORCL',
    primaryColor: '#C74634',
    bgColor: '#FAF0EE',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg',
  },
  cisco: {
    name: 'Cisco',
    shortName: 'CSCO',
    primaryColor: '#1BA0D7',
    bgColor: '#E8F5FB',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg',
  },
  zoho: {
    name: 'Zoho',
    shortName: 'ZOHO',
    primaryColor: '#C02026',
    bgColor: '#FAEAEC',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Zoho_logo.svg',
  },
  salesforce: {
    name: 'Salesforce',
    shortName: 'CRM',
    primaryColor: '#00A1E0',
    bgColor: '#E5F5FC',
    svgIcon: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg',
  },
};

/**
 * Normalizes company name key for lookup
 */
function getCompanyKey(name: string): string {
  const clean = name.toLowerCase().trim();
  if (clean.includes('tata consultancy') || clean.includes('tcs')) return 'tcs';
  if (clean.includes('infosys')) return 'infosys';
  if (clean.includes('wipro')) return 'wipro';
  if (clean.includes('accenture')) return 'accenture';
  if (clean.includes('cognizant')) return 'cognizant';
  if (clean.includes('capgemini')) return 'capgemini';
  if (clean.includes('amazon')) return 'amazon';
  if (clean.includes('google')) return 'google';
  if (clean.includes('microsoft')) return 'microsoft';
  if (clean.includes('ibm')) return 'ibm';
  if (clean.includes('deloitte')) return 'deloitte';
  if (clean.includes('flipkart')) return 'flipkart';
  if (clean.includes('swiggy')) return 'swiggy';
  if (clean.includes('zomato')) return 'zomato';
  if (clean.includes('paytm')) return 'paytm';
  if (clean.includes('phonepe')) return 'phonepe';
  if (clean.includes('jio') || clean.includes('reliance')) return 'jio';
  if (clean.includes('hcl')) return 'hcl';
  if (clean.includes('tech mahindra') || clean.includes('techm')) return 'tech mahindra';
  if (clean.includes('oracle')) return 'oracle';
  if (clean.includes('cisco')) return 'cisco';
  if (clean.includes('zoho')) return 'zoho';
  if (clean.includes('salesforce')) return 'salesforce';
  return clean;
}

/**
 * Returns brand metadata or clean defaults for any company name
 */
export function getCompanyBrandInfo(companyName: string, customLogoUrl?: string): CompanyBrandInfo {
  if (customLogoUrl && customLogoUrl.startsWith('http')) {
    return {
      name: companyName,
      shortName: companyName.substring(0, 2).toUpperCase(),
      primaryColor: '#2563EB',
      bgColor: '#EFF6FF',
      logoUrl: customLogoUrl,
    };
  }

  const key = getCompanyKey(companyName);
  if (KNOWN_COMPANIES[key]) {
    return KNOWN_COMPANIES[key];
  }

  // Generate consistent initial monogram and brand color palette
  const words = companyName.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : companyName.substring(0, 2).toUpperCase() || 'CO';

  // Deterministic color palette selection from company name string hash
  const colors = [
    { primary: '#2563EB', bg: '#EFF6FF' }, // Blue
    { primary: '#4F46E5', bg: '#EEF2FF' }, // Indigo
    { primary: '#0D9488', bg: '#F0FDFA' }, // Teal
    { primary: '#0284C7', bg: '#F0F9FF' }, // Sky
    { primary: '#7C3AED', bg: '#F5F3FF' }, // Purple
    { primary: '#059669', bg: '#ECFDF5' }, // Emerald
  ];

  let charSum = 0;
  for (let i = 0; i < companyName.length; i++) {
    charSum += companyName.charCodeAt(i);
  }
  const colorChoice = colors[charSum % colors.length];

  return {
    name: companyName,
    shortName: initials,
    primaryColor: colorChoice.primary,
    bgColor: colorChoice.bg,
  };
}

export function getCompanyInitials(name: string): string {
  if (!name) return 'CO';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
