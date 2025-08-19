import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class LocalAuthService {
  private readonly USERS_FILE = path.join(process.cwd(), "data", "users.json");
  private readonly JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
  private readonly JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret";
  private readonly ACCESS_TOKEN_EXPIRY = "15m";
  private readonly REFRESH_TOKEN_EXPIRY = "7d";

  private loadUsers(): User[] {
    try {
      if (fs.existsSync(this.USERS_FILE)) {
        const data = fs.readFileSync(this.USERS_FILE, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
    return [];
  }

  private saveUsers(users: User[]): void {
    try {
      const dir = path.dirname(this.USERS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error("Error saving users:", error);
    }
  }

  async login(credentials: { emailOrUsername: string; password: string }) {
    console.log(
      "LocalAuthService: Attempting login for",
      credentials.emailOrUsername,
    );

    const users = this.loadUsers();

    // Find user by email or username
    const user = users.find(
      (u) =>
        (u.email === credentials.emailOrUsername ||
          u.username === credentials.emailOrUsername) &&
        u.isActive,
    );

    if (!user) {
      console.log("LocalAuthService: User not found");
      throw new Error("Invalid credentials");
    }

    console.log("LocalAuthService: User found, verifying password");

    // Verify password
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      console.log("LocalAuthService: Invalid password");
      throw new Error("Invalid credentials");
    }

    console.log("LocalAuthService: Login successful");

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName || user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tokens,
    };
  }

  async register(data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const users = this.loadUsers();

    // Check if user already exists
    const existingUser = users.find(
      (u) => u.email === data.email || u.username === data.username,
    );

    if (existingUser) {
      throw new Error("User with this email or username already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create new user
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email: data.email,
      username: data.username,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.firstName
        ? `${data.firstName} ${data.lastName || ""}`.trim()
        : data.username,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);

    // Generate tokens
    const tokens = await this.generateTokens(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
      },
      tokens,
    };
  }

  private async generateTokens(userId: string): Promise<AuthTokens> {
    const user = this.loadUsers().find((u) => u.id === userId);

    if (!user) {
      throw new Error("User not found");
    }

    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      roles: ["user"], // Default role
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded: any = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET);
      return this.generateTokens(decoded.userId);
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  async getCurrentUser(userId: string) {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    };
  }
}
