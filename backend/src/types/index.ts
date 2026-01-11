import 'express-session';

declare module 'express-session' {
  interface SessionData {
    githubToken?: string;
    user?: {
      id: number;
      login: string;
      name: string;
      avatar_url: string;
    };
  }
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  updated_at: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email: string | null;
}
