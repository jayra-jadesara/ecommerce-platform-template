export type StoreBrochure = {
  id: string;
  storeId: string;
  title: string;
  pdfPath: string;
  fileSizeBytes: number;
  sortOrder: number;
  isActive: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StorefrontBrochure = {
  id: string;
  title: string;
  pdfUrl: string;
  fileSizeBytes: number;
};
