// Returns if the password is valid (true) or invalid (false)
export function checkPassword(pass: string) {
  if (
    pass.length < 14 ||
    !/[A-Z]/.test(pass) || // At least one uppercase letter
    !/[a-z]/.test(pass) || // At least one lowercase letter
    !/[0-9]/.test(pass) // At least one number
  ) {
    return false;
  }
  return true;
}
