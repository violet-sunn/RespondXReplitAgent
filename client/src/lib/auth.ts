import { apiRequest } from "./queryClient";

interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
}

export async function loginWithCredentials(email: string, password: string): Promise<User> {
  const response = await apiRequest("POST", "/api/auth/login", { email, password });
  return response.json();
}

export async function loginWithGoogle(): Promise<User> {
  // In a real implementation, this would redirect to Auth0's Google login
  window.location.href = "/api/auth/google";
  return {} as User; // This line won't execute due to redirect
}

export async function loginWithApple(): Promise<User> {
  // In a real implementation, this would redirect to Auth0's Apple login
  window.location.href = "/api/auth/apple";
  return {} as User; // This line won't execute due to redirect
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout", {});
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest("GET", "/api/auth/me", undefined);
    return await response.json();
  } catch (error) {
    return null;
  }
}
