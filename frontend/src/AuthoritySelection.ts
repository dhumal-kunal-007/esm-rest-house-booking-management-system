export interface ExplicitAuthoritySelection {
  roomId: string;
  roomNumber: string;
  categoryName: string;
  authorityRole: string;
  bedId?: string;
  bedNumber?: number;
  isMatrixRoom: boolean;
}