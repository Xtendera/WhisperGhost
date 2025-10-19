import { jwtVerify, SignJWT } from "jose";
import z from "zod";

const JWTBodySchema = z.object({
  sub: z.string(),
  type: z.string(),
  user: z.string(),
  iat: z.number(),
});

type JWTBody = z.infer<typeof JWTBodySchema>;

function getKey(): Uint8Array {
  const keyString = process.env.JWT_SECRET;
  if (!keyString) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(keyString);
}

export async function generateToken(body: JWTBody): Promise<string> {
  const secret = getKey();

  const jwt = await new SignJWT(body)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .sign(secret);

  return jwt;
}

export async function extractTokenBody(token: string): Promise<JWTBody | null> {
  try {
    const secret = getKey();

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    // Validate the payload structure with Zod
    const validatedData = JWTBodySchema.parse(payload);
    return validatedData;
  } catch (error) {
    console.error("JWT Verification/Validation Error:", error);
    return null;
  }
}
