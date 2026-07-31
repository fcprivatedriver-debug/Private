export function resolveAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "fc-private-driver-demo-auth-secret-32chars"
  );
}
