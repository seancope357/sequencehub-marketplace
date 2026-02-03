export interface Role {
  id: string;
  role: RoleName;
}

export type RoleName = 'ADMIN' | 'CREATOR' | 'BUYER';

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  website?: string;
  socialTwitter?: string;
  socialYouTube?: string;
  socialInstagram?: string;
  location?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  emailVerified: boolean;
  roles: Role[];
  profile?: Profile | null;
  createdAt: string;
  updatedAt: string;
}
