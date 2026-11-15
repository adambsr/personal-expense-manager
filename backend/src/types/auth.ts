export interface AuthenticatedUserContext {
  userId: string;
  role: "USER" | "ADMIN";
}
