// Humane error copy — Spanish first, English whisper. Raw errors never
// reach the UI; every known failure gets a warm, specific message.
export function humaneError(raw: unknown): string {
  const s = String(
    typeof raw === "object" && raw !== null && "message" in raw
      ? (raw as { message: string }).message
      : raw,
  ).toLowerCase();

  if (s.includes("chain_address") || (s.includes("duplicate") && s.includes("address")))
    return "Esta wallet ya está vinculada a otro FBID — cada dirección pertenece a un solo jaguar. · This address is bound to another FBID.";
  if (s.includes("user_id_chain") || s.includes("user_id, chain"))
    return "Ya tienes una wallet vinculada en esta cadena. · You already linked a wallet on this chain.";
  if (s.includes("duplicate key"))
    return "Esta wallet ya está vinculada a otro FBID — cada dirección pertenece a un solo jaguar. · This address is bound to another FBID.";
  if (s.includes("auth required") || s.includes("session required") || s.includes("jwt"))
    return "Primero entra con tu FBID (tu correo, sin contraseña) aquí arriba. · Sign in with your FBID first.";
  if (s.includes("rejected") || s.includes("cancelled") || s.includes("canceled") || s.includes("denied") || s.includes("user refused"))
    return "Firma cancelada — sin prisa, aquí seguimos. · Signature cancelled, no rush.";
  if (s.includes("signature invalid"))
    return "La firma no coincide con esa dirección. Revisa que firmaste con la wallet correcta. · Signature didn't match the address.";
  if (s.includes("challenge mismatch"))
    return "El reto expiró o cambió de sesión — vuelve a intentarlo. · The challenge expired, try again.";
  if (s.includes("fetch") || s.includes("network") || s.includes("timeout"))
    return "No pudimos hablar con la selva (problema de red). Intenta de nuevo en un momento. · Network hiccup, try again.";
  return "Algo no salió como esperábamos. Intenta de nuevo — si sigue, cuéntanos. · Something went sideways, try again.";
}
