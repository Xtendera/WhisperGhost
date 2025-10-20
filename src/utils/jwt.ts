import { jwtVerify, SignJWT } from "jose";
import z from "zod";

// Define the base payload and three extensions for the three JWT types in WG
const BaseJWTPayloadSchema = z.object({
  sub: z.string(),
  user: z.string(),
  iat: z.number(),
});

const RegistrationJWTPayloadSchema = BaseJWTPayloadSchema.extend({
  type: z.literal("registration"),
});

const LoginJWTPayloadSchema = BaseJWTPayloadSchema.extend({
  type: z.literal("login"),
  state: z.string(),
});

const AccessJWTPayloadSchema = BaseJWTPayloadSchema.extend({
  type: z.literal("access"),
  ref: z.string(),
});

const JWTPayloadSchema = z.discriminatedUnion("type", [
  RegistrationJWTPayloadSchema,
  LoginJWTPayloadSchema,
  AccessJWTPayloadSchema,
]);

type JWTPayload = z.infer<typeof JWTPayloadSchema>;

export type RegistrationJWTPayload = z.infer<
  typeof RegistrationJWTPayloadSchema
>;
export type LoginJWTPayload = z.infer<typeof LoginJWTPayloadSchema>;
export type AccessJWTPayload = z.infer<typeof AccessJWTPayloadSchema>;
export type AnyJWTPayload = JWTPayload;

function getKey(): Uint8Array {
  const keyString = process.env.JWT_SECRET;
  if (!keyString) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(keyString);
}

export async function generateToken(body: JWTPayload): Promise<string> {
  const secret = getKey();

  const jwt = await new SignJWT(body)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .sign(secret);

  return jwt;
}

export async function extractTokenBody(
  token: string,
): Promise<JWTPayload | null> {
  try {
    const secret = getKey();

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    // Validate the payload structure with Zod
    const validatedData = JWTPayloadSchema.parse(payload);
    return validatedData;
  } catch (error) {
    console.error("JWT Verification/Validation Error:", error);
    return null;
  }
}
