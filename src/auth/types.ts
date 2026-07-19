export type PortalUser = {
  readonly id: number;
  readonly email: string;
  readonly displayName: string;
  readonly role: string;
  readonly initials: string;
  readonly churchId: number | null;
};

export type LoginCredentials = {
  readonly username: string;
  readonly password: string;
  readonly otp?: string;
  readonly rememberMe?: boolean;
};

export type LoginResult =
  | { readonly kind: "authenticated"; readonly user: PortalUser }
  | { readonly kind: "redirect"; readonly url: string }
  | { readonly kind: "mfa_setup"; readonly setupUrl: string }
  | { readonly kind: "error"; readonly message: string };

export type AuthStatus =
  | { readonly status: "loading" }
  | { readonly status: "authenticated"; readonly user: PortalUser }
  | { readonly status: "anonymous" };
