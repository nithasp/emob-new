export interface StoredRefreshToken {
  id: number;
  userId: string;
  familyId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
