export function resolveRole({
  authUser,
  profile,
}: {
  authUser?: any;
  profile?: any;
}) {
  console.log("AUTH USER IN FRONT", authUser);
  console.log("APP META", authUser?.app_metadata);
  console.log("USER META", authUser?.user_metadata);
  console.log("PROFILE ROLE", profile?.role);
  return (
    authUser?.app_metadata?.role ??
    authUser?.user_metadata?.role ??
    profile?.role ??
    "parent"
  );
}
