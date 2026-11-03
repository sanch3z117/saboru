export type AppRole = "student" | "vendor" | "admin";

export function homeForRole(role: AppRole): "/" | "/panel" | "/admin" {
  switch (role) {
    case "admin":
      return "/admin";
    case "vendor":
      return "/panel";
    default:
      return "/";
  }
}
