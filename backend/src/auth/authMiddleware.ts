import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import { pool } from "../config/db.js";

interface TokenClaims {
  sub: string;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

const configuredSecret =
  process.env.AUTH_TOKEN_SECRET;

if (
  !configuredSecret ||
  configuredSecret.startsWith("REPLACE_") ||
  Buffer.byteLength(configuredSecret, "utf8") < 32
) {
  throw new Error(
    "AUTH_TOKEN_SECRET must be configured as a non-placeholder value of at least 32 bytes."
  );
}

const tokenSecret = configuredSecret;

const TOKEN_LIFETIME_SECONDS =
  8 * 60 * 60;

export const createAuthToken = (
  userId: string
): string => {
  const claims: TokenClaims = {
    sub: userId,
    exp:
      Math.floor(Date.now() / 1000) +
      TOKEN_LIFETIME_SECONDS,
  };

  const encodedClaims =
    Buffer.from(
      JSON.stringify(claims)
    ).toString("base64url");

  const signature =
    createHmac("sha256", tokenSecret)
      .update(encodedClaims)
      .digest("base64url");

  return `${encodedClaims}.${signature}`;
};

const verifyAuthToken = (
  token: string
): TokenClaims | null => {
  const [encodedClaims, receivedSignature, ...extra] =
    token.split(".");

  if (
    !encodedClaims ||
    !receivedSignature ||
    extra.length > 0
  ) {
    return null;
  }

  const expectedSignature =
    createHmac("sha256", tokenSecret)
      .update(encodedClaims)
      .digest();

  let actualSignature: Buffer;

  try {
    actualSignature =
      Buffer.from(
        receivedSignature,
        "base64url"
      );
  } catch {
    return null;
  }

  if (
    actualSignature.length !==
      expectedSignature.length ||
    !timingSafeEqual(
      actualSignature,
      expectedSignature
    )
  ) {
    return null;
  }

  let claims: unknown;

  try {
    claims = JSON.parse(
      Buffer.from(
        encodedClaims,
        "base64url"
      ).toString("utf8")
    );
  } catch {
    return null;
  }

  if (
    typeof claims !== "object" ||
    claims === null ||
    !("sub" in claims) ||
    !("exp" in claims) ||
    typeof claims.sub !== "string" ||
    typeof claims.exp !== "number" ||
    claims.sub.length === 0 ||
    claims.exp <=
      Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return {
    sub: claims.sub,
    exp: claims.exp,
  };
};

const actorIdFields = [
  "created_by",
  "approver_id",
  "received_by",
  "checked_in_by",
  "checked_out_by",
  "generated_by",
  "calculated_by",
  "allotted_by",
  "accepted_by",
  "adminUserId",
] as const;

export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization =
    req.header("authorization");

  const match =
    authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.status(401).json({
      success: false,
      message: "Authentication is required.",
    });
    return;
  }

  const claims =
    verifyAuthToken(match[1]);

  if (!claims) {
    res.status(401).json({
      success: false,
      message:
        "Your session is invalid or expired. Please log in again.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        r.role_name
      FROM users u
      INNER JOIN roles r
        ON r.id = u.role_id
      WHERE u.id = $1
        AND u.is_active = TRUE
      LIMIT 1
      `,
      [claims.sub]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message:
          "Your account is inactive or no longer exists.",
      });
      return;
    }

    const user: AuthenticatedUser = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: result.rows[0].role_name,
    };

    req.authUser = user;

    if (
      req.body &&
      typeof req.body === "object" &&
      !Array.isArray(req.body)
    ) {
      // Actor IDs in API payloads are attribution only, never caller identity.
      for (const field of actorIdFields) {
        req.body[field] = user.id;
      }
    }

    next();
  } catch (error) {
    console.error(
      "Authentication lookup failed:",
      error
    );

    res.status(503).json({
      success: false,
      message:
        "Unable to verify your account right now.",
    });
  }
};
