// Client-side API URL is always relative ("") so it works seamlessly on LAN, Domain, or Proxy
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const getBaseApiUrl = (): string => {
  return API_URL;
};

// Helper to get full API path
export const getApiPath = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
};


