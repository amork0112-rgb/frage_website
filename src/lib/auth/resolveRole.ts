export function resolveRole({
  authUser,
  profile,
}: {
  authUser?: any;
  profile?: any;
}) {
  return (
    authUser?.app_metadata?.role ??
    authUser?.user_metadata?.role ??
    profile?.role ??
    "parent"
  );
}
