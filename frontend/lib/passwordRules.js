export const passwordChecks = (password = "") => [
  { label: "8 to 64 characters", ok: password.length >= 8 && password.length <= 64 },
  { label: "One uppercase letter (A-Z)", ok: /[A-Z]/.test(password) },
  { label: "One lowercase letter (a-z)", ok: /[a-z]/.test(password) },
  { label: "One number (0-9)", ok: /[0-9]/.test(password) },
  { label: "One special character (@ # $ !)", ok: /[^A-Za-z0-9]/.test(password) },
  { label: "No spaces", ok: password.length > 0 && !/\s/.test(password) },
];

export const getPasswordError = (password = "") => {
  const failed = passwordChecks(password).find((c) => !c.ok);
  return failed ? `Password needs: ${failed.label.toLowerCase()}.` : "";
};