export const getPasswordError = (password) => {
  const p = String(password ?? "");
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (p.length > 64) return "Password must be 64 characters or fewer.";
  if (/\s/.test(p)) return "Password must not contain spaces.";
  if (!/[a-z]/.test(p)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(p)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(p)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(p))
    return "Password must include a special character (for example @ # $ !).";
  return null;
};