/**
 * Redirect user to the proper area based on their email.
 *
 * Priority:
 * 1) Admin + Master Admin → /admin/home
 * 2) Master Teacher → /teacher/home
 * 3) Everyone else → /portal/home
 */
export function getRedirectPathForEmail(email: string | null | undefined) {
  const normalizedEmail = (email || "").toLowerCase();

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@frage.kr").toLowerCase();
  const masterAdminEmail = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || "master_admin@frage.kr").toLowerCase();
  const masterTeacherEmail = (process.env.NEXT_PUBLIC_MASTER_TEACHER_EMAIL || "master_teacher@frage.kr").toLowerCase();

  if (normalizedEmail && (normalizedEmail === adminEmail || normalizedEmail === masterAdminEmail)) {
    return "/admin/home";
  }

  if (normalizedEmail && normalizedEmail === masterTeacherEmail) {
    return "/teacher/home";
  }

  return "/portal/home";
}

export function redirectAfterAuth(
  router: { replace: (href: string) => void },
  email: string | null | undefined
) {
  router.replace(getRedirectPathForEmail(email));
}
