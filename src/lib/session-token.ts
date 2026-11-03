import { SignJWT, jwtVerify } from "jose";
import { sessionConfig } from "./config";

export type SessionRole = "PEMOHON" | "ADMIN";

export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
  role: SessionRole;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET tidak valid (minimal 32 karakter).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ name: payload.name, email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${sessionConfig.ttlHours}h`)
    .setIssuer("idb-room-booking")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "idb-room-booking",
    });
    if (!payload.sub || typeof payload.role !== "string") return null;
    if (payload.role !== "PEMOHON" && payload.role !== "ADMIN") return null;
    return {
      sub: payload.sub,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role,
    };
  } catch {
    return null;
  }
}
