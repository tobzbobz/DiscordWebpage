// Type augmentation for next-auth session
// No imports required here to avoid conflicts with different next-auth versions
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
