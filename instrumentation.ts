// Instrumentation Next.js — rien à faire au démarrage.
// La synchronisation des matchs est déclenchée à chaque connexion utilisateur
// (voir lib/auth.ts → events.signIn) avec un debounce de 2 minutes.
export async function register() {}
