import type { ID, Result } from "./types.js";
import { fetchApi, createRequest } from "./api.js";

export interface User {
  id: ID;
  email: string;
  name?: string;
}

export interface UserServiceConfig {
  baseUrl: string;
  timeout?: number;
}

export class UserService {
  constructor(private config: UserServiceConfig) {}

  async getUser(id: ID): Promise<Result<User>> {
    const request = createRequest("GET", `${this.config.baseUrl}/users/${id}`);
    return fetchApi<User>(request);
  }

  async createUser(user: Omit<User, "id">): Promise<Result<User>> {
    const request = createRequest("POST", `${this.config.baseUrl}/users`, user);
    return fetchApi<User>(request);
  }

  async updateUser(id: ID, updates: Partial<User>): Promise<Result<User>> {
    const request = createRequest("PUT", `${this.config.baseUrl}/users/${id}`, updates);
    return fetchApi<User>(request);
  }

  async deleteUser(id: ID): Promise<Result<void>> {
    const request = createRequest("DELETE", `${this.config.baseUrl}/users/${id}`);
    return fetchApi<void>(request);
  }
}
