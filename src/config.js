// Public settings. None of these are secret: the database is protected by
// row-level rules, so only a signed-in owner can read or change their places.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://piucpyzjxjmidevhahtx.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_MOaFcEcds1YvgcMCOWxKHQ_I7DiJbDi'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '841308086819-vnikurnh94qc6oe2h6felm3j3cdk65f5.apps.googleusercontent.com'
