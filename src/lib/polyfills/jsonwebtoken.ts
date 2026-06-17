export const decode = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      return JSON.parse(atob(parts[1]));
    }
  } catch {}
  return null;
};
export default { decode };
