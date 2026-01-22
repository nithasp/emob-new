export interface ClaimTableItem {
  claim: string;
  value: string;
  description: string;
}

export interface JwtClaims {
  [key: string]: string | number | undefined;
}

