import os
from functools import lru_cache
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


@lru_cache
def keys():
    return jwt.PyJWKClient(
        os.environ["SUPABASE_URL"] + "/auth/v1/.well-known/jwks.json"
    )


def identity(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> str:
    issuer = os.environ["SUPABASE_URL"] + "/auth/v1"
    try:
        token = credentials.credentials
        key = keys().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=issuer,
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
        return claims["sub"]
    except jwt.PyJWTError:
        raise HTTPException(401, "Staff session expired or invalid")
