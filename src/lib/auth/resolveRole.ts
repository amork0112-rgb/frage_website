export function resolveRole(arg1: any, arg2?: any) {
  const isObjectForm = !!arg1 && typeof arg1 === "object" && "authUser" in arg1;
  const authUser = isObjectForm ? (arg1 as any).authUser : arg1;
  const profile = isObjectForm ? (arg1 as any).profile : arg2;
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
